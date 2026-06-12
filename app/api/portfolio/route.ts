import { NextRequest, NextResponse } from "next/server";
import {
  getPrice,
  getScaledUiMultiplier,
  getSolanaAssetMap,
  isValidSolanaAddress,
} from "@/lib/server/xstocks";
import {
  getFluidPositions,
  getFluidVaults,
  type FluidPosition,
  type FluidVault,
} from "@/lib/server/jupiterLend";
import type {
  LendPosition,
  PortfolioPosition,
  PortfolioResult,
} from "@/lib/types";

export const dynamic = "force-dynamic";

// xStocks token'ları Token-2022 programında (Scaled UI Amount eklentisiyle) basılı.
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

// ÖNEMLİ — gerçek veriyle doğrulandı: RPC'nin jsonParsed yanıtındaki uiAmount,
// Scaled UI çarpanını ZATEN içeriyor; cüzdan bakiyesinde çarpan tekrar
// uygulanmaz. Jupiter Lend ise HAM (raw) miktar döndürür; orada
// raw / 10^decimals × çarpan uygulanır.

interface ParsedTokenAccount {
  account: {
    data: {
      parsed: {
        info: {
          mint: string;
          tokenAmount: { uiAmount: number | null; uiAmountString?: string };
        };
      };
    };
  };
}

// Borç yoksa API healthFactor alanına astronomik bir sayı koyuyor
function parseHealthFactor(raw: string, borrow: number): number | null {
  if (borrow <= 0) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n < 1e6 ? n : null;
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.trim() ?? "";
  if (!isValidSolanaAddress(wallet)) {
    return NextResponse.json(
      { error: "Geçersiz Solana cüzdan adresi." },
      { status: 400 }
    );
  }

  const rpcUrl = process.env.SOLANA_RPC_URL || PUBLIC_RPC;
  const rpcFallback = !process.env.SOLANA_RPC_URL;

  try {
    const [assetMap, rpcRes, lend] = await Promise.all([
      getSolanaAssetMap(),
      fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenAccountsByOwner",
          params: [
            wallet,
            { programId: TOKEN_2022_PROGRAM },
            { encoding: "jsonParsed", commitment: "confirmed" },
          ],
        }),
      }),
      // Jupiter Lend hatası tüm portföyü düşürmesin
      Promise.all([getFluidVaults(), getFluidPositions(wallet)]).catch(
        () => null
      ),
    ]);

    if (!rpcRes.ok) {
      return NextResponse.json(
        { error: `Solana RPC hatası (HTTP ${rpcRes.status}).` },
        { status: 502 }
      );
    }

    const rpcJson = (await rpcRes.json()) as {
      result?: { value?: ParsedTokenAccount[] };
      error?: { message?: string };
    };

    if (rpcJson.error) {
      return NextResponse.json(
        { error: `Solana RPC hatası: ${rpcJson.error.message ?? "bilinmeyen"}` },
        { status: 502 }
      );
    }

    // --- 1) Cüzdanda duran xStock'lar ---
    const held = new Map<string, number>(); // mint -> uiAmount
    for (const acc of rpcJson.result?.value ?? []) {
      const info = acc.account?.data?.parsed?.info;
      if (!info?.mint || !assetMap.has(info.mint)) continue;
      const ui =
        info.tokenAmount?.uiAmount ??
        parseFloat(info.tokenAmount?.uiAmountString ?? "0");
      if (ui && ui > 0) {
        held.set(info.mint, (held.get(info.mint) ?? 0) + ui);
      }
    }

    // --- 2) Jupiter Lend'deki xStock teminatları ---
    let lendError: string | null = null;
    const xstockLendPositions: Array<{
      pos: FluidPosition;
      vault: FluidVault;
    }> = [];
    if (lend === null) {
      lendError = "Jupiter Lend API'sine ulaşılamadı; lend pozisyonları gösterilemiyor.";
    } else {
      const [vaults, positions] = lend;
      for (const pos of positions) {
        const vault = vaults.get(pos.vaultId);
        if (!vault || !assetMap.has(vault.supplyToken.address)) continue;
        if (parseFloat(pos.supply) <= 0 && parseFloat(pos.borrow) <= 0) continue;
        xstockLendPositions.push({ pos, vault });
      }
    }

    // --- 3) Fiyatlar + çarpanlar: yalnızca gereken semboller (önbellekli) ---
    const neededSymbols = new Set<string>();
    for (const mint of held.keys()) neededSymbols.add(assetMap.get(mint)!.symbol);
    for (const { vault } of xstockLendPositions)
      neededSymbols.add(assetMap.get(vault.supplyToken.address)!.symbol);

    const symbolList = [...neededSymbols];
    const lendSymbols = new Set(
      xstockLendPositions.map(
        ({ vault }) => assetMap.get(vault.supplyToken.address)!.symbol
      )
    );
    const [priceList, multiplierList] = await Promise.all([
      Promise.all(symbolList.map((s) => getPrice(s))),
      // Çarpan yalnızca raw veri dönen lend pozisyonları için gerekli
      Promise.all(
        symbolList.map((s) =>
          lendSymbols.has(s) ? getScaledUiMultiplier(s) : Promise.resolve(1)
        )
      ),
    ]);
    const prices = new Map(symbolList.map((s, i) => [s, priceList[i]]));
    const multipliers = new Map(symbolList.map((s, i) => [s, multiplierList[i]]));

    const missingPrices = symbolList.filter((s) => prices.get(s) === null);

    // --- 4) Cüzdan pozisyonları ---
    const positions: PortfolioPosition[] = [];
    for (const [mint, balance] of held) {
      const asset = assetMap.get(mint)!;
      const price = prices.get(asset.symbol) ?? null;
      positions.push({
        mint,
        symbol: asset.symbol,
        name: asset.name,
        logo: asset.logo,
        balance,
        price,
        value: price !== null ? balance * price : 0,
      });
    }
    positions.sort((a, b) => b.value - a.value);
    const walletValue = positions.reduce((s, p) => s + p.value, 0);

    // --- 5) Lend pozisyonları (teminat − borç = net) ---
    const lendPositions: LendPosition[] = xstockLendPositions.map(
      ({ pos, vault }) => {
        const asset = assetMap.get(vault.supplyToken.address)!;
        const mult = multipliers.get(asset.symbol) ?? 1;
        const collateralAmount =
          (parseFloat(pos.supply) / 10 ** vault.supplyToken.decimals) * mult;
        const price = prices.get(asset.symbol) ?? null;
        const collateralValue = price !== null ? collateralAmount * price : 0;

        const debtAmount =
          parseFloat(pos.borrow) / 10 ** vault.borrowToken.decimals;
        // Borç tarafı stablecoin (USDC/JupUSD); Fluid'in kendi fiyatı kullanılır
        const debtPrice = parseFloat(vault.borrowToken.price ?? "1") || 1;
        const debtValue = debtAmount * debtPrice;

        return {
          vaultId: pos.vaultId,
          nftId: pos.nftId,
          collateralSymbol: asset.symbol,
          collateralName: asset.name,
          collateralLogo: asset.logo,
          collateralAmount,
          collateralPrice: price,
          collateralValue,
          debtSymbol: vault.borrowToken.symbol,
          debtAmount,
          debtValue,
          netValue: collateralValue - debtValue,
          healthFactor: parseHealthFactor(pos.healthFactor, debtAmount),
        };
      }
    );
    lendPositions.sort((a, b) => b.netValue - a.netValue);
    const lendNetValue = lendPositions.reduce((s, p) => s + p.netValue, 0);

    const result: PortfolioResult = {
      wallet,
      totalValue: walletValue + lendNetValue,
      walletValue,
      positions,
      lendPositions,
      lendNetValue,
      missingPrices,
      rpcFallback,
      lendError,
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Portföy verisi alınamadı (RPC veya xStocks API'ye ulaşılamadı)." },
      { status: 502 }
    );
  }
}
