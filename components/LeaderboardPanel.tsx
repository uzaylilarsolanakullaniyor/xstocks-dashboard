"use client";

import { useEffect, useState } from "react";
import GlassCard from "./GlassCard";
import { formatNumber, shortAddress } from "@/lib/format";
import type { LeaderboardResult } from "@/lib/types";

// LEADERBOARD_URL tanımlıysa görünür; şeması bilinmediği için yaygın alan
// adlarını sezgisel olarak eşler, eşleşmezse ham JSON gösterir.

interface LbRow {
  rank: number | null;
  wallet: string;
  points: number | null;
}

function extractRows(data: unknown): LbRow[] | null {
  const candidates: unknown[] = [data];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["data", "leaderboard", "users", "results", "items"]) {
      if (obj[key]) candidates.push(obj[key]);
    }
  }
  const arr = candidates.find(Array.isArray) as
    | Record<string, unknown>[]
    | undefined;
  if (!arr || arr.length === 0 || typeof arr[0] !== "object") return null;

  return arr.slice(0, 100).map((row, i) => {
    const wallet =
      ["walletAddress", "wallet", "address", "owner", "user"]
        .map((k) => row[k])
        .find((v): v is string => typeof v === "string") ?? "?";
    const pointsRaw = ["totalPoints", "points", "score", "xp"]
      .map((k) => row[k])
      .find((v) => typeof v === "number" || typeof v === "string");
    const rankRaw = ["rank", "position", "place"]
      .map((k) => row[k])
      .find((v) => typeof v === "number");
    const points =
      typeof pointsRaw === "string" ? parseFloat(pointsRaw) : pointsRaw ?? null;
    return {
      rank: typeof rankRaw === "number" ? rankRaw : i + 1,
      wallet,
      points: Number.isFinite(points) ? (points as number) : null,
    };
  });
}

export default function LeaderboardPanel({ wallets }: { wallets: string[] }) {
  const [result, setResult] = useState<LeaderboardResult | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((j: LeaderboardResult) => setResult(j))
      .catch(() => setResult({ enabled: false }));
  }, []);

  // Env boşsa modül tamamen gizli — karşılaştırma görevini puan tablosu görür.
  if (!result || !result.enabled) return null;

  const rows = result.data ? extractRows(result.data) : null;
  const mine = new Set(wallets);

  return (
    <GlassCard
      title="Leaderboard"
      subtitle="LEADERBOARD_URL kaynağından · sunucuda 5 dk önbelleklenir"
    >
      {result.error ? (
        <p className="text-sm text-rose-400">{result.error}</p>
      ) : rows ? (
        <div className="scroll-thin max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Cüzdan</th>
                <th className="py-2 text-right">Puan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.rank}-${r.wallet}`}
                  className={`border-b border-white/5 ${
                    mine.has(r.wallet)
                      ? "bg-indigo-500/15 font-semibold text-indigo-200"
                      : ""
                  }`}
                >
                  <td className="py-2 pr-3 text-slate-400">{r.rank ?? "—"}</td>
                  <td className="py-2 pr-3 font-mono" title={r.wallet}>
                    {shortAddress(r.wallet)}
                    {mine.has(r.wallet) && " ★"}
                  </td>
                  <td className="py-2 text-right">
                    {r.points !== null ? formatNumber(r.points) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <pre className="scroll-thin glass-inner max-h-80 overflow-auto p-4 text-xs text-slate-300">
          {JSON.stringify(result.data, null, 2)}
        </pre>
      )}
    </GlassCard>
  );
}
