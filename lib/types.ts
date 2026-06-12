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

// Jupiter Lend (Fluid) borrow kasasındaki xStock teminat pozisyonu
export interface LendPosition {
  vaultId: number;
  nftId: number;
  collateralSymbol: string;
  collateralName: string;
  collateralLogo: string | null;
  /** Gerçek adet (raw / 10^decimals × Scaled UI çarpanı) */
  collateralAmount: number;
  collateralPrice: number | null;
  collateralValue: number;
  debtSymbol: string;
  debtAmount: number;
  debtValue: number;
  netValue: number;
  /** null => borç yok (sağlık faktörü anlamsız) */
  healthFactor: number | null;
}

export interface PortfolioResult {
  wallet: string;
  totalValue: number;
  /** Cüzdanda duran token'ların toplamı */
  walletValue: number;
  positions: PortfolioPosition[];
  /** Jupiter Lend'e teminat olarak yatırılmış xStock pozisyonları */
  lendPositions: LendPosition[];
  /** Lend teminat − borç toplamı */
  lendNetValue: number;
  /** Fiyatı alınamayan semboller (rate limit vb.) */
  missingPrices: string[];
  rpcFallback: boolean;
  /** Jupiter Lend API'sine ulaşılamadıysa uyarı metni */
  lendError: string | null;
  error?: string;
}

export interface LeaderboardResult {
  enabled: boolean;
  data?: unknown;
  error?: string;
}
