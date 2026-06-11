// xStocks public API yardımcıları — yalnızca server tarafında kullanılır.
// Hız limiti 10 istek/dk olduğundan tüm çağrılar Next.js Data Cache ile
// önbelleğe alınır (assets: 10 dk, fiyat: 60 sn).

const XSTOCKS_API = "https://api.xstocks.fi/api/v2/public";

export interface AssetInfo {
  symbol: string;
  name: string;
  logo: string | null;
  mint: string;
}

interface AssetsPage {
  nodes: Array<{
    symbol: string;
    name: string;
    logo?: string | null;
    deployments?: Array<{ network: string; address: string }>;
  }>;
  page: { currentPage: number; hasNextPage: boolean };
}

/** Tüm varlık sayfalarını gezer, mint -> AssetInfo haritası döndürür. */
export async function getSolanaAssetMap(): Promise<Map<string, AssetInfo>> {
  const map = new Map<string, AssetInfo>();
  let page = 0;
  // Güvenlik için en fazla 6 sayfa (şu an 2 sayfa / 164 varlık var)
  while (page < 6) {
    const res = await fetch(`${XSTOCKS_API}/assets?page=${page}`, {
      next: { revalidate: 600 },
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Varlık listesi alınamadı (HTTP ${res.status})`);
    }
    const data = (await res.json()) as AssetsPage;
    for (const node of data.nodes ?? []) {
      const sol = node.deployments?.find((d) => d.network === "Solana");
      if (sol?.address) {
        map.set(sol.address, {
          symbol: node.symbol,
          name: node.name,
          logo: node.logo ?? null,
          mint: sol.address,
        });
      }
    }
    if (!data.page?.hasNextPage) break;
    page += 1;
  }
  return map;
}

/** Tek sembol için USD fiyatı. Hata durumunda null (UI "fiyat yok" gösterir). */
export async function getPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${XSTOCKS_API}/assets/${encodeURIComponent(symbol)}/price-data`,
      { next: { revalidate: 60 }, headers: { accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { quote?: number };
    return typeof data.quote === "number" ? data.quote : null;
  } catch {
    return null;
  }
}

export function isValidSolanaAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}
