"use client";

import { useCallback, useEffect, useState } from "react";
import GlassCard from "./GlassCard";
import { formatNumber, formatTime, shortAddress } from "@/lib/format";
import type { PointsResult } from "@/lib/types";

type RowState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; data: PointsResult };

export default function PointsPanel({ wallets }: { wallets: string[] }) {
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (wallets.length === 0) {
      setRows({});
      return;
    }
    setRefreshing(true);
    setRows((prev) => {
      const next: Record<string, RowState> = {};
      for (const w of wallets) next[w] = prev[w] ?? { status: "loading" };
      return next;
    });

    await Promise.all(
      wallets.map(async (w) => {
        try {
          const res = await fetch(`/api/points?wallet=${encodeURIComponent(w)}`);
          const json = (await res.json()) as PointsResult & { error?: string };
          if (!res.ok || json.error) {
            setRows((p) => ({
              ...p,
              [w]: {
                status: "error",
                message: json.error ?? `HTTP ${res.status}`,
              },
            }));
          } else {
            setRows((p) => ({ ...p, [w]: { status: "ok", data: json } }));
          }
        } catch {
          setRows((p) => ({
            ...p,
            [w]: { status: "error", message: "Sunucuya ulaşılamadı." },
          }));
        }
      })
    );

    setLastUpdated(new Date());
    setRefreshing(false);
  }, [wallets]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const okRows = Object.values(rows).filter(
    (r): r is { status: "ok"; data: PointsResult } => r.status === "ok"
  );
  const registered = okRows.filter((r) => r.data.registered);
  const totals = {
    total: registered.reduce((s, r) => s + r.data.totalPoints, 0),
    today: registered.reduce((s, r) => s + r.data.todayPoints, 0),
    referral: registered.reduce((s, r) => s + r.data.referralPoints, 0),
    maxBoost: registered.reduce(
      (m, r) => Math.max(m, r.data.boostMultiplier),
      0
    ),
  };

  return (
    <GlassCard
      title="Canlı Puan Paneli"
      subtitle="points-api.xstocks.fi · veriler sunucu üzerinden çekilir, ~2 dk önbelleklenir"
      action={
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              Son güncelleme: {formatTime(lastUpdated)}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={refreshing || wallets.length === 0}
            className="btn-glass px-4 py-2 text-sm font-medium text-slate-100 disabled:opacity-50"
          >
            {refreshing ? "Yenileniyor…" : "⟳ Yenile"}
          </button>
        </div>
      }
    >
      {wallets.length === 0 ? (
        <p className="text-sm text-slate-500">
          Puanları görmek için yukarıdan bir cüzdan ekle.
        </p>
      ) : (
        <>
          {/* Özet kartları */}
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryStat label="Toplam Puan" value={formatNumber(totals.total)} accent />
            <SummaryStat label="Bugünkü Puan" value={`+${formatNumber(totals.today)}`} />
            <SummaryStat
              label="En Yüksek Boost"
              value={totals.maxBoost > 0 ? `${formatNumber(totals.maxBoost)}x` : "—"}
            />
            <SummaryStat label="Referans Puanı" value={formatNumber(totals.referral)} />
          </div>

          {/* Cüzdan tablosu */}
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-3">Cüzdan</th>
                  <th className="py-2 pr-3 text-right">Toplam Puan</th>
                  <th className="py-2 pr-3 text-right">Bugün</th>
                  <th className="py-2 pr-3 text-right">Boost</th>
                  <th className="py-2 pr-3 text-right">Holding</th>
                  <th className="py-2 pr-3 text-right">Lend</th>
                  <th className="py-2 pr-3 text-right">LP</th>
                  <th className="py-2 pr-3 text-right">Referans</th>
                  <th className="py-2 text-right">Ref. Sayısı</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((w) => {
                  const row = rows[w];
                  if (!row || row.status === "loading") {
                    return (
                      <tr key={w} className="border-b border-white/5">
                        <td className="py-3 pr-3 font-mono text-slate-300">
                          {shortAddress(w)}
                        </td>
                        <td colSpan={8} className="py-3">
                          <div className="skeleton h-4 w-full" />
                        </td>
                      </tr>
                    );
                  }
                  if (row.status === "error") {
                    return (
                      <tr key={w} className="border-b border-white/5">
                        <td className="py-3 pr-3 font-mono text-slate-300">
                          {shortAddress(w)}
                        </td>
                        <td colSpan={8} className="py-3 text-rose-400">
                          {row.message}
                        </td>
                      </tr>
                    );
                  }
                  const d = row.data;
                  if (!d.registered) {
                    return (
                      <tr key={w} className="border-b border-white/5">
                        <td className="py-3 pr-3 font-mono text-slate-300">
                          {shortAddress(w)}
                        </td>
                        <td colSpan={8} className="py-3">
                          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs text-amber-300">
                            xDrop&apos;a kayıtlı değil (404)
                          </span>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr
                      key={w}
                      className="border-b border-white/5 transition-colors hover:bg-white/5"
                    >
                      <td className="py-3 pr-3 font-mono text-slate-200" title={w}>
                        {shortAddress(w)}
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold text-white">
                        {formatNumber(d.totalPoints)}
                      </td>
                      <td className="py-3 pr-3 text-right text-emerald-300">
                        +{formatNumber(d.todayPoints)}
                      </td>
                      <td className="py-3 pr-3 text-right text-indigo-300">
                        {d.boostMultiplier > 0
                          ? `${formatNumber(d.boostMultiplier)}x`
                          : "—"}
                      </td>
                      <td className="py-3 pr-3 text-right text-slate-300">
                        {d.breakdown ? formatNumber(d.breakdown.holding) : "—"}
                      </td>
                      <td className="py-3 pr-3 text-right text-slate-300">
                        {d.breakdown ? formatNumber(d.breakdown.lending) : "—"}
                      </td>
                      <td className="py-3 pr-3 text-right text-slate-300">
                        {d.breakdown ? formatNumber(d.breakdown.lp) : "—"}
                      </td>
                      <td className="py-3 pr-3 text-right text-slate-300">
                        {formatNumber(d.referralPoints)}
                      </td>
                      <td className="py-3 text-right text-slate-300">
                        {formatNumber(d.referralCount, 0)}
                      </td>
                    </tr>
                  );
                })}
                {registered.length > 1 && (
                  <tr className="font-semibold text-white">
                    <td className="py-3 pr-3">TOPLAM</td>
                    <td className="py-3 pr-3 text-right">
                      {formatNumber(totals.total)}
                    </td>
                    <td className="py-3 pr-3 text-right text-emerald-300">
                      +{formatNumber(totals.today)}
                    </td>
                    <td className="py-3 pr-3 text-right">—</td>
                    <td className="py-3 pr-3 text-right">
                      {formatNumber(
                        registered.reduce(
                          (s, r) => s + (r.data.breakdown?.holding ?? 0),
                          0
                        )
                      )}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {formatNumber(
                        registered.reduce(
                          (s, r) => s + (r.data.breakdown?.lending ?? 0),
                          0
                        )
                      )}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {formatNumber(
                        registered.reduce(
                          (s, r) => s + (r.data.breakdown?.lp ?? 0),
                          0
                        )
                      )}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {formatNumber(totals.referral)}
                    </td>
                    <td className="py-3 text-right">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Not: Resmi xPoints API&apos;sinde sıralama (rank) alanı bulunmuyor;
            sıralama yalnızca LEADERBOARD_URL tanımlanırsa gösterilebilir.
          </p>
        </>
      )}
    </GlassCard>
  );
}

function SummaryStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="glass-inner px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p
        className={`mt-1 text-xl font-bold sm:text-2xl ${
          accent
            ? "bg-gradient-to-r from-indigo-300 to-emerald-300 bg-clip-text text-transparent"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
