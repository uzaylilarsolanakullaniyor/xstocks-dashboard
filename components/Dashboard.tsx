"use client";

import { useCallback, useEffect, useState } from "react";
import WalletManager from "./WalletManager";
import PointsPanel from "./PointsPanel";
import PortfolioPanel from "./PortfolioPanel";
import StrategyCalculator from "./StrategyCalculator";
import AirdropCalculator from "./AirdropCalculator";
import LeaderboardPanel from "./LeaderboardPanel";

const STORAGE_KEY = "xstocks:wallets";

export default function Dashboard() {
  const [wallets, setWallets] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);

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

  // Bento grid: geniş ekranda boşluk bırakmadan kutucuk yerleşimi
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
      <div className="xl:col-span-4">
        <WalletManager
          wallets={wallets}
          onAdd={addWallet}
          onRemove={removeWallet}
        />
      </div>
      <div className="xl:col-span-8">
        <StrategyCalculator />
      </div>
      <div className="xl:col-span-12">
        <PointsPanel wallets={wallets} onTotalPoints={setTotalPoints} />
      </div>
      <div className="xl:col-span-7">
        <PortfolioPanel wallets={wallets} />
      </div>
      <div className="xl:col-span-5">
        <AirdropCalculator autoPoints={totalPoints} />
      </div>
      <div className="xl:col-span-12">
        <LeaderboardPanel wallets={wallets} />
      </div>
    </div>
  );
}
