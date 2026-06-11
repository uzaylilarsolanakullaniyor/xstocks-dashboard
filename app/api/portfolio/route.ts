import { NextRequest, NextResponse } from "next/server";
import {
  getPrice,
  getSolanaAssetMap,
  isValidSolanaAddress,
} from "@/lib/server/xstocks";
import type { PortfolioPosition, PortfolioResult } from "@/lib/types";

export const dynamic = "force-dynamic";

// xStocks token'ları Token-2022 programında (Scaled UI Amount eklentisiyle) basılı.
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

// ÖNEMLİ — gerçek veriyle doğrulandı: RPC'nin jsonParsed yanıtındaki uiAmount,
// Scaled UI çarpanını ZATEN içeriyor (raw amount / 10^decimals × currentMultiplier
// = uiAmount birebir tutuyor). Bu yüzden değer hesabında multiplier endpoint'i
// tekrar UYGULANMAZ; değer = uiAmount × fiyat.

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
    const [assetMap, rpcRes] = await Promise.all([
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

    // Cüzdandaki Token-2022 hesaplarından xStock mint'lerini ayıkla
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

    // Yalnızca cüzdanda bulunan sembollerin fiyatını çek (60 sn önbellekli;
    // public API limiti 10 istek/dk olduğundan tüm listeyi asla taramayız).
    const positions: PortfolioPosition[] = [];
    const missingPrices: string[] = [];

    const entries = [...held.entries()];
    const prices = await Promise.all(
      entries.map(([mint]) => getPrice(assetMap.get(mint)!.symbol))
    );

    entries.forEach(([mint, balance], i) => {
      const asset = assetMap.get(mint)!;
      const price = prices[i];
      if (price === null) missingPrices.push(asset.symbol);
      positions.push({
        mint,
        symbol: asset.symbol,
        name: asset.name,
        logo: asset.logo,
        balance,
        price,
        value: price !== null ? balance * price : 0,
      });
    });

    positions.sort((a, b) => b.value - a.value);

    const result: PortfolioResult = {
      wallet,
      totalValue: positions.reduce((s, p) => s + p.value, 0),
      positions,
      missingPrices,
      rpcFallback,
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Portföy verisi alınamadı (RPC veya xStocks API'ye ulaşılamadı)." },
      { status: 502 }
    );
  }
}
