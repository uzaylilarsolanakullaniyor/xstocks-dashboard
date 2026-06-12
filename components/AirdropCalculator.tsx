"use client";

import { useEffect, useState } from "react";
import GlassCard from "./GlassCard";
import { formatNumber } from "@/lib/format";

// Tahmini airdrop değeri:
//   havuz $ = FDV × airdrop oranı
//   puan başına $ = havuz ÷ toplam xPuan
//   benim payım $ = puanlarım × puan başına $
// Örnek: $1 Mr FDV, %8 airdrop, 10 Mr puan -> 80M$ ÷ 10Mr = 0,008 $/puan

const BILLION = 1_000_000_000;

const FDV_PRESETS = [
  { label: "500M $", value: 0.5 * BILLION },
  { label: "1 Mr $", value: 1 * BILLION },
  { label: "2 Mr $", value: 2 * BILLION },
  { label: "3,5 Mr $ (Ondo)", value: 3.5 * BILLION },
];

function fmtCompactUsd(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtUsd(n: number, maxFrac = 2): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: maxFrac,
  }).format(n);
}

export default function AirdropCalculator({
  autoPoints,
}: {
  /** Puan panelinden gelen toplam puan (cüzdanlar yüklüyse otomatik dolar) */
  autoPoints: number;
}) {
  const [fdv, setFdv] = useState(1 * BILLION);
  const [pct, setPct] = useState(8);
  const [totalPointsBn, setTotalPointsBn] = useState(10); // milyar cinsinden
  const [myPoints, setMyPoints] = useState(0);
  const [manualPoints, setManualPoints] = useState(false);

  // Kullanıcı elle değiştirmediği sürece puan panelindeki toplamı izle
  useEffect(() => {
    if (!manualPoints && autoPoints > 0) setMyPoints(Math.round(autoPoints));
  }, [autoPoints, manualPoints]);

  const pool = fdv * (pct / 100);
  const totalPoints = totalPointsBn * BILLION;
  const perPoint = totalPoints > 0 ? pool / totalPoints : 0;
  const myShare = myPoints * perPoint;

  return (
    <GlassCard
      title="Airdrop Hesaplayıcı"
      subtitle="Token FDV senaryosuna göre tahmini puan değeri"
      className="h-full"
    >
      <div className="space-y-4">
        {/* FDV */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-slate-300">Token FDV senaryosu</span>
            <span className="font-mono font-semibold text-indigo-300">
              {fmtCompactUsd(fdv)}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={Math.round(fdv / (0.1 * BILLION))}
            onChange={(e) => setFdv(Number(e.target.value) * 0.1 * BILLION)}
            className="w-full"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {FDV_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setFdv(p.value)}
                className={`btn-glass px-2.5 py-1 text-xs ${
                  fdv === p.value
                    ? "border-indigo-400/60 text-indigo-200"
                    : "text-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Airdrop oranı */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-slate-300">Airdrop&apos;a giden arz</span>
            <span className="font-mono font-semibold text-emerald-300">
              %{pct}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={25}
            step={1}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Toplam puan arzı */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-slate-300">Toplam xPuan (tüm kullanıcılar)</span>
            <span className="font-mono font-semibold text-amber-300">
              {formatNumber(totalPointsBn)} milyar
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={totalPointsBn}
            onChange={(e) => setTotalPointsBn(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Benim puanım */}
        <label className="block">
          <span className="flex items-center justify-between text-sm text-slate-300">
            <span>Benim puanım</span>
            {!manualPoints && autoPoints > 0 && (
              <span className="text-xs text-slate-500">
                puan panelinden otomatik
              </span>
            )}
          </span>
          <input
            type="number"
            min={0}
            value={myPoints}
            onChange={(e) => {
              setManualPoints(true);
              setMyPoints(Math.max(0, Number(e.target.value)));
            }}
            className="input-glass mt-1.5 w-full px-4 py-2.5 font-mono text-slate-100"
          />
        </label>

        {/* Sonuçlar */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-inner px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Airdrop Havuzu
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {fmtCompactUsd(pool)}
            </p>
          </div>
          <div className="glass-inner px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Puan Başına Değer
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {fmtUsd(perPoint, 6)}
            </p>
          </div>
          <div className="glass-inner col-span-2 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Tahmini Airdrop Payım
            </p>
            <p className="mt-1 text-2xl font-bold bg-gradient-to-r from-emerald-300 to-indigo-300 bg-clip-text text-transparent">
              {fmtUsd(myShare)}
            </p>
            {myPoints > 0 && (
              <p className="mt-0.5 text-xs text-slate-500">
                {formatNumber(myPoints, 0)} puan × {fmtUsd(perPoint, 6)}
              </p>
            )}
          </div>
        </div>

        <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200/90">
          ⚠️ Tamamen <strong>spekülatif senaryo</strong>: token, FDV, airdrop
          oranı ve toplam puan arzı resmi olarak açıklanmadı. Yatırım tavsiyesi
          değildir.
        </p>
      </div>
    </GlassCard>
  );
}
