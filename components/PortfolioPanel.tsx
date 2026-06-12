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
import type {
  LendPosition,
  PortfolioPosition,
  PortfolioResult,
} from "@/lib/types";

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

  // Cüzdanlardaki token pozisyonlarını mint bazında birleştir
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

  // Jupiter Lend pozisyonları (cüzdan etiketiyle birlikte düz liste)
  const lendRows = useMemo(
    () =>
      okStates.flatMap((s) =>
        s.data.lendPositions.map((p) => ({ wallet: s.data.wallet, ...p }))
      ),
    [okStates]
  ) as Array<LendPosition & { wallet: string }>;

  const walletValue = okStates.reduce((s, x) => s + x.data.walletValue, 0);
  const lendNetValue = okStates.reduce((s, x) => s + x.data.lendNetValue, 0);
  const totalValue = walletValue + lendNetValue;

  const missingPrices = [
    ...new Set(okStates.flatMap((s) => s.data.missingPrices)),
  ];
  const usingFallbackRpc = okStates.some((s) => s.data.rpcFallback);
  const lendErrors = [
    ...new Set(
      okStates.map((s) => s.data.lendError).filter((e): e is string => !!e)
    ),
  ];

  // Pastada toplam maruziyet: cüzdan + lend teminatı, sembol bazında
  const pieData = useMemo(() => {
    const bySymbol = new Map<string, number>();
    for (const p of merged) {
      if (p.value > 0)
        bySymbol.set(p.symbol, (bySymbol.get(p.symbol) ?? 0) + p.value);
    }
    for (const p of lendRows) {
      if (p.collateralValue > 0)
        bySymbol.set(
          p.collateralSymbol,
          (bySymbol.get(p.collateralSymbol) ?? 0) + p.collateralValue
        );
    }
    const sorted = [...bySymbol.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 8).map(([name, value]) => ({ name, value }));
    const rest = sorted.slice(8).reduce((s, [, v]) => s + v, 0);
    if (rest > 0) top.push({ name: "Diğer", value: rest });
    return top;
  }, [merged, lendRows]);

  return (
    <GlassCard
      title="Canlı Pozisyon Değeri"
      subtitle="Cüzdan (Token-2022) + Jupiter Lend teminatları · fiyatlar sunucuda 60 sn önbelleklenir"
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
              {/* Özet */}
              <div className="mb-4 flex flex-wrap gap-3">
                <div className="glass-inner px-5 py-3">
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Toplam Portföy Değeri
                  </p>
                  <p className="mt-1 text-3xl font-bold bg-gradient-to-r from-emerald-300 to-indigo-300 bg-clip-text text-transparent">
                    {formatUsd(totalValue)}
                  </p>
                </div>
                <div className="glass-inner px-5 py-3">
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Cüzdanda
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {formatUsd(walletValue)}
                  </p>
                </div>
                <div className="glass-inner px-5 py-3">
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Jupiter Lend (net)
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {formatUsd(lendNetValue)}
                  </p>
                </div>
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
                          {s.data.positions.length} cüzdan +{" "}
                          {s.data.lendPositions.length} lend pozisyonu
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Cüzdan token tablosu */}
              {merged.length > 0 && (
                <div className="scroll-thin overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-400">
                        <th className="py-2 pr-3">Cüzdandaki Token</th>
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
              )}

              {/* Jupiter Lend pozisyonları */}
              {lendRows.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-2 text-sm font-semibold text-indigo-200">
                    🪐 Jupiter Lend Pozisyonları
                  </h3>
                  <div className="scroll-thin overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-400">
                          <th className="py-2 pr-3">Kasa</th>
                          <th className="py-2 pr-3">Cüzdan</th>
                          <th className="py-2 pr-3 text-right">Teminat</th>
                          <th className="py-2 pr-3 text-right">Teminat $</th>
                          <th className="py-2 pr-3 text-right">Borç</th>
                          <th className="py-2 pr-3 text-right">Net</th>
                          <th className="py-2 text-right">Sağlık</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lendRows.map((p) => (
                          <tr
                            key={`${p.wallet}-${p.vaultId}-${p.nftId}`}
                            className="border-b border-white/5 transition-colors hover:bg-white/5"
                          >
                            <td className="py-2.5 pr-3">
                              <span className="flex items-center gap-2">
                                {p.collateralLogo && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={p.collateralLogo}
                                    alt=""
                                    width={22}
                                    height={22}
                                    className="rounded-full"
                                  />
                                )}
                                <span className="font-semibold text-white">
                                  {p.collateralSymbol}
                                  <span className="text-slate-500">
                                    {" "}
                                    → {p.debtSymbol}
                                  </span>
                                </span>
                              </span>
                            </td>
                            <td
                              className="py-2.5 pr-3 font-mono text-xs text-slate-400"
                              title={p.wallet}
                            >
                              {shortAddress(p.wallet)}
                            </td>
                            <td className="py-2.5 pr-3 text-right font-mono text-slate-300">
                              {formatNumber(p.collateralAmount, 4)}
                            </td>
                            <td className="py-2.5 pr-3 text-right text-slate-200">
                              {p.collateralPrice !== null
                                ? formatUsd(p.collateralValue)
                                : "fiyat yok"}
                            </td>
                            <td className="py-2.5 pr-3 text-right text-rose-300">
                              {p.debtValue > 0 ? `−${formatUsd(p.debtValue)}` : "—"}
                            </td>
                            <td className="py-2.5 pr-3 text-right font-semibold text-white">
                              {formatUsd(p.netValue)}
                            </td>
                            <td className="py-2.5 text-right">
                              {p.healthFactor === null ? (
                                <span className="text-emerald-300">∞</span>
                              ) : (
                                <span
                                  className={
                                    p.healthFactor < 1.1
                                      ? "text-rose-300"
                                      : p.healthFactor < 1.5
                                        ? "text-amber-300"
                                        : "text-emerald-300"
                                  }
                                >
                                  {formatNumber(p.healthFactor)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {merged.length === 0 &&
                lendRows.length === 0 &&
                okStates.length > 0 && (
                  <p className="text-sm text-slate-500">
                    Bu cüzdanlarda (cüzdan içi veya Jupiter Lend&apos;de) xStock
                    bulunamadı.
                  </p>
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
                  Toplam maruziyet (cüzdan + lend teminatı)
                </p>
              </div>
            )}
          </div>

          {(usingFallbackRpc ||
            missingPrices.length > 0 ||
            lendErrors.length > 0) && (
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
              {lendErrors.map((e) => (
                <p key={e}>⚠️ {e}</p>
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">
            Cüzdan bakiyelerinde Token-2022 &quot;Scaled UI&quot; çarpanı
            RPC&apos;de zaten dahildir; Jupiter Lend ham miktarlarına ise çarpan
            ayrıca uygulanır (çifte sayım yok). Lend net değeri = teminat −
            borç. Kamino ve LP (Raydium/Orca/Byreal) pozisyonları henüz dahil
            değildir.
          </p>
        </>
      )}
    </GlassCard>
  );
}
