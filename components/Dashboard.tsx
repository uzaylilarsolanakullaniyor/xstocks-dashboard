"use client";

import { useCallback, useEffect, useState } from "react";
import WalletManager from "./WalletManager";
import PointsPanel from "./PointsPanel";
import PortfolioPanel from "./PortfolioPanel";
import StrategyCalculator from "./StrategyCalculator";
import LeaderboardPanel from "./LeaderboardPanel";

const STORAGE_KEY = "xstocks:wallets";

export default function Dashboard() {
  const [wallets, setWallets] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (
          Array.isArray(parsed) &&
          parsed.every((x) => typeof x === "string")
        ) {
          setWallets(parsed);
        }
      }
    } catch {
      // bozuk localStorage verisini yok say
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
      } catch {
        // depolama dolu/kapalıysa sessizce geç
      }
    }
  }, [wallets, loaded]);

  const addWallet = useCallback(
    (w: string) => setWallets((prev) => [...prev, w]),
    []
  );
  const removeWallet = useCallback(
    (w: string) => setWallets((prev) => prev.filter((x) => x !== w)),
    []
  );

  return (
    <div className="space-y-6">
      <WalletManager
        wallets={wallets}
        onAdd={addWallet}
        onRemove={removeWallet}
      />
      <PointsPanel wallets={wallets} />
      <PortfolioPanel wallets={wallets} />
      <StrategyCalculator />
      <LeaderboardPanel wallets={wallets} />
    </div>
  );
}
