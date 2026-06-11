"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import GlassCard from "./GlassCard";
import {
  formatNumber,
  formatTime,
  formatUsd,
  shortAddress,
} from "@/lib/format";
import type { PortfolioPosition, PortfolioResult } from "@/lib/types";

type WalletState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; data: PortfolioResult };

const PIE_COLORS = [
  "#818cf8",
  "#34d399",
  "#f472b6",
  "#fbbf24",
  "#60a5fa",
  "#a78bfa",
  "#2dd4bf",
  "#fb7185",
  "#94a3b8",
];

export default function PortfolioPanel({ wallets }: { wallets: string[] }) {
  const [states, setStates] = useState<Record<string, WalletState>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (wallets.length === 0) {
      setStates({});
      return;
    }
    setRefreshing(true);
    setStates((prev) => {
      const next: Record<string, WalletState> = {};
      for (const w of wallets) next[w] = prev[w] ?? { status: "loading" };
      return next;
    });

    await Promise.all(
      wallets.map(async (w) => {
        try {
          const res = await fetch(
            `/api/portfolio?wallet=${encodeURIComponent(w)}`
          );
          const json = (await res.json()) as PortfolioResult & {
            error?: string;
          };
          if (!res.ok || json.error) {
            setStates((p) => ({
              ...p,
              [w]: {
                status: "error",
                message: json.error ?? `HTTP ${res.status}`,
              },
            }));
          } else {
            setStates((p) => ({ ...p, [w]: { status: "ok", data: json } }));
          }
        } catch {
          setStates((p) => ({
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

  const okStates = useMemo(
    () =>
      Object.values(states).filter(
        (s): s is { status: "ok"; data: PortfolioResult } => s.status === "ok"
      ),
    [states]
  );

  // Tüm cüzdanlardaki pozisyonları mint bazında birleştir
  const merged = useMemo(() => {
    const map = new Map<string, PortfolioPosition>();
    for (const s of okStates) {
      for (const p of s.data.positions) {
        const cur = map.get(p.mint);
        if (cur) {
          cur.balance += p.balance;
          cur.value += p.value;
        } else {
          map.set(p.mint, { ...p });
        }
      }
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [okStates]);

  const totalValue = merged.reduce((s, p) => s + p.value, 0);
  const missingPrices = [
    ...new Set(okStates.flatMap((s) => s.data.missingPrices)),
  ];
  const usingFallbackRpc = okStates.some((s) => s.data.rpcFallback);

  const pieData = useMemo(() => {
    const top = merged.filter((p) => p.value > 0).slice(0, 8);
    const rest = merged.slice(8).reduce((s, p) => s + p.value, 0);
    const data = top.map((p) => ({ name: p.symbol, value: p.value }));
    if (rest > 0) data.push({ name: "Diğer", value: rest });
    return data;
  }, [merged]);

  return (
    <GlassCard
      title="Canlı Pozisyon Değeri"
      subtitle="Token-2022 bakiyeleri × xStocks fiyatları · fiyatlar sunucuda 60 sn önbelleklenir"
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
          Portföy değerini görmek için yukarıdan bir cüzdan ekle.
        </p>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
            <div>
              <div className="glass-inner mb-4 inline-block px-5 py-3">
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Toplam Portföy Değeri
                </p>
                <p className="mt-1 text-3xl font-bold bg-gradient-to-r from-emerald-300 to-indigo-300 bg-clip-text text-transparent">
                  {formatUsd(totalValue)}
                </p>
              </div>

              {/* Cüzdan durumları */}
              <ul className="mb-4 space-y-1.5 text-xs">
                {wallets.map((w) => {
                  const s = states[w];
                  return (
                    <li key={w} className="flex items-center gap-2">
                      <span className="font-mono text-slate-400">
                        {shortAddress(w)}
                      </span>
                      {!s || s.status === "loading" ? (
                        <span className="skeleton inline-block h-3 w-24" />
                      ) : s.status === "error" ? (
                        <span className="text-rose-400">{s.message}</span>
                      ) : (
                        <span className="text-slate-300">
                          {formatUsd(s.data.totalValue)} ·{" "}
                          {s.data.positions.length} pozisyon
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Pozisyon tablosu */}
              {merged.length > 0 ? (
                <div className="scroll-thin overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-400">
                        <th className="py-2 pr-3">Token</th>
                        <th className="py-2 pr-3 text-right">Adet</th>
                        <th className="py-2 pr-3 text-right">Fiyat</th>
                        <th className="py-2 text-right">Değer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {merged.map((p) => (
                        <tr
                          key={p.mint}
                          className="border-b border-white/5 transition-colors hover:bg-white/5"
                        >
                          <td className="py-2.5 pr-3">
                            <span className="flex items-center gap-2">
                              {p.logo && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={p.logo}
                                  alt=""
                                  width={22}
                                  height={22}
                                  className="rounded-full"
                                />
                              )}
                              <span>
                                <span className="font-semibold text-white">
                                  {p.symbol}
                                </span>
                                <span className="ml-2 hidden text-xs text-slate-500 sm:inline">
                                  {p.name}
                                </span>
                              </span>
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono text-slate-300">
                            {formatNumber(p.balance, 4)}
                          </td>
                          <td className="py-2.5 pr-3 text-right text-slate-300">
                            {p.price !== null ? formatUsd(p.price) : "—"}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-white">
                            {p.price !== null ? formatUsd(p.value) : "fiyat yok"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                okStates.length > 0 && (
                  <p className="text-sm text-slate-500">
                    Bu cüzdanlarda xStock token&apos;ı bulunamadı.
                  </p>
                )
              )}
            </div>

            {/* Dağılım grafiği */}
            {pieData.length > 0 && (
              <div className="flex flex-col items-center justify-center">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="85%"
                        paddingAngle={3}
                        stroke="rgba(255,255,255,0.15)"
                      >
                        {pieData.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "rgba(10,16,32,0.9)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 12,
                          color: "#e6edf7",
                        }}
                        formatter={(value) => formatUsd(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-center text-xs text-slate-500">
                  Portföy dağılımı
                </p>
              </div>
            )}
          </div>

          {(usingFallbackRpc || missingPrices.length > 0) && (
            <div className="mt-4 space-y-1 text-xs text-amber-300/80">
              {usingFallbackRpc && (
                <p>
                  ⚠️ SOLANA_RPC_URL tanımlı değil — yavaş/limitli public RPC
                  kullanılıyor. Vercel&apos;de Helius adresinizi ekleyin.
                </p>
              )}
              {missingPrices.length > 0 && (
                <p>
                  ⚠️ Fiyatı alınamayan semboller: {missingPrices.join(", ")}{" "}
                  (hız limiti olabilir; birazdan yenileyin).
                </p>
              )}
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">
            Not: xStock token&apos;ları Token-2022 &quot;Scaled UI Amount&quot;
            eklentisi kullanır; RPC&apos;nin döndürdüğü bakiye bu çarpanı{" "}
            <strong>zaten içerir</strong> (gerçek veriyle doğrulandı). Değer =
            bakiye × fiyat — çarpan ikinci kez uygulanmaz.
          </p>
        </>
      )}
    </GlassCard>
  );
}
