// /api/points yanıtı (alan adları gerçek API yanıtı incelenerek doğrulandı —
// kaynak: defi.xstocks.fi istemcisinin points-api.xstocks.fi çağrıları)
export interface PointsResult {
  wallet: string;
  registered: boolean;
  totalPoints: number;
  todayPoints: number;
  /** xboostMultiplier: anlık xBoost çarpanı (ör. 1.4) */
  boostMultiplier: number;
  /** socialQuestMultiplier: kalıcı sosyal görev çarpanı (ör. 1.1) */
  permanentMultiplier: number;
  referralPoints: number;
  referralCount: number;
  referralCode: string | null;
  questPoints: number;
  breakdown: {
    holding: number;
    lending: number;
    lp: number;
    referral: number;
  } | null;
  createdAt: string | null;
  error?: string;
}

// /api/portfolio yanıtı
export interface PortfolioPosition {
  mint: string;
  symbol: string;
  name: string;
  logo: string | null;
  /** uiAmount — Token-2022 Scaled UI çarpanı RPC tarafından zaten uygulanmış halde */
  balance: number;
  price: number | null;
  value: number;
}

export interface PortfolioResult {
  wallet: string;
  totalValue: number;
  positions: PortfolioPosition[];
  /** Fiyatı alınamayan semboller (rate limit vb.) */
  missingPrices: string[];
  rpcFallback: boolean;
  error?: string;
}

export interface LeaderboardResult {
  enabled: boolean;
  data?: unknown;
  error?: string;
}
