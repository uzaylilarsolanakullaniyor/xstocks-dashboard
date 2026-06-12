// Jupiter Lend (Fluid) borrow pozisyonları — yalnızca server tarafında.
// Uç noktalar jup.ag arayüzünün kendi istemci kodundan ve canlı yanıtlardan
// doğrulandı (resmi lite-api'de borrow pozisyon ucu henüz veri vermiyor):
//   GET https://api.solana.fluid.io/v1/main/borrowing/vaults
//   GET https://api.solana.fluid.io/v1/main/borrowing/positions?owner={wallet}
// Pozisyon: {vaultId, nftId, owner, supply, borrow, healthFactor, ...}
// supply/borrow ham (raw) birimdedir -> 10^decimals ile bölünür; xStock'larda
// ayrıca Token-2022 Scaled UI çarpanı uygulanmalıdır (raw -> gerçek adet).

const FLUID_API = "https://api.solana.fluid.io/v1/main";

export interface FluidToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string | null;
  price?: string | null;
}

export interface FluidVault {
  id: number;
  address: string;
  supplyToken: FluidToken;
  borrowToken: FluidToken;
}

export interface FluidPosition {
  id: number;
  vaultId: number;
  nftId: number;
  owner: string;
  supply: string;
  borrow: string;
  healthFactor: string;
  isLiquidated: number;
}

interface PositionsPage {
  meta: { total: number; lastPage: number; currentPage: number };
  data: FluidPosition[];
}

/** Tüm borrow kasaları, vaultId -> vault haritası (10 dk önbellek). */
export async function getFluidVaults(): Promise<Map<number, FluidVault>> {
  const res = await fetch(`${FLUID_API}/borrowing/vaults`, {
    next: { revalidate: 600 },
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Jupiter Lend kasa listesi alınamadı (HTTP ${res.status})`);
  }
  const vaults = (await res.json()) as FluidVault[];
  const map = new Map<number, FluidVault>();
  for (const v of vaults) map.set(v.id, v);
  return map;
}

/** Cüzdanın tüm Jupiter Lend borrow pozisyonları (kısa önbellek). */
export async function getFluidPositions(
  wallet: string
): Promise<FluidPosition[]> {
  const out: FluidPosition[] = [];
  let page = 1;
  // Bir cüzdanda makul sayıda pozisyon olur; yine de en fazla 3 sayfa gez
  while (page <= 3) {
    const res = await fetch(
      `${FLUID_API}/borrowing/positions?owner=${encodeURIComponent(
        wallet
      )}&page=${page}`,
      { next: { revalidate: 30 }, headers: { accept: "application/json" } }
    );
    if (!res.ok) {
      throw new Error(
        `Jupiter Lend pozisyonları alınamadı (HTTP ${res.status})`
      );
    }
    const data = (await res.json()) as PositionsPage;
    out.push(...(data.data ?? []));
    if (!data.meta || page >= data.meta.lastPage) break;
    page += 1;
  }
  return out;
}
