"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import GlassCard from "./GlassCard";
import { formatNumber } from "@/lib/format";

// Bilinen çarpan oranları (resmi duyurulara göre):
const MULT = { hold: 1, lend: 5, lp: 7 } as const;
const BOOST = 1.2; // +%20 boost

export default function StrategyCalculator() {
  const [capital, setCapital] = useState(1000);
  const [hold, setHold] = useState(20);
  const [lend, setLend] = useState(40);
  const [lp, setLp] = useState(40);
  const [boost, setBoost] = useState(false);

  const sum = hold + lend + lp;
  // Paylar toplamı 0 ise tamamı "Tut" kabul edilir
  const shares = useMemo(
    () =>
      sum === 0
        ? { hold: 1, lend: 0, lp: 0 }
        : { hold: hold / sum, lend: lend / sum, lp: lp / sum },
    [hold, lend, lp, sum]
  );

  const boostFactor = boost ? BOOST : 1;
  const score = (s: { hold: number; lend: number; lp: number }) =>
    capital *
    (s.hold * MULT.hold + s.lend * MULT.lend + s.lp * MULT.lp) *
    boostFactor;

  const current = score(shares);
  const scenarios = [
    { name: "Mevcut Dağılım", value: current, color: "#818cf8" },
    { name: "%100 Tut", value: score({ hold: 1, lend: 0, lp: 0 }), color: "#64748b" },
    { name: "%100 Lend", value: score({ hold: 0, lend: 1, lp: 0 }), color: "#34d399" },
    { name: "%100 LP", value: score({ hold: 0, lend: 0, lp: 1 }), color: "#f472b6" },
  ];

  const best = scenarios.reduce((a, b) => (b.value > a.value ? b : a));
  const weightedMult =
    shares.hold * MULT.hold + shares.lend * MULT.lend + shares.lp * MULT.lp;

  return (
    <GlassCard
      title="Strateji Hesaplayıcı"
      subtitle="Tamamen tarayıcıda çalışır — API çağrısı yapmaz"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Girdiler */}
        <div className="min-w-0 space-y-5">
          <label className="block">
            <span className="text-sm text-slate-300">Toplam Sermaye ($)</span>
            <input
              type="number"
              min={0}
              value={capital}
              onChange={(e) => setCapital(Math.max(0, Number(e.target.value)))}
              className="input-glass mt-1.5 w-full px-4 py-2.5 text-slate-100"
            />
          </label>

          <AllocationSlider
            label="Tut (1x)"
            value={hold}
            share={shares.hold}
            color="#94a3b8"
            onChange={setHold}
          />
          <AllocationSlider
            label="Lend — Kamino (5x)"
            value={lend}
            share={shares.lend}
            color="#34d399"
            onChange={setLend}
          />
          <AllocationSlider
            label="Likidite / LP — Raydium · Orca · Byreal (7x)"
            value={lp}
            share={shares.lp}
            color="#f472b6"
            onChange={setLp}
          />

          <label className="glass-inner flex cursor-pointer items-center justify-between px-4 py-3">
            <span className="text-sm text-slate-200">
              +%20 Boost aktif (xBoost / kampanya)
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={boost}
              onClick={() => setBoost((b) => !b)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                boost ? "bg-indigo-500" : "bg-white/15"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  boost ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        </div>

        {/* Çıktılar */}
        <div className="min-w-0 space-y-4">
          <div className="glass-inner px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Göreceli Puan Gücü (birim/zaman)
            </p>
            <p className="mt-1 text-3xl font-bold bg-gradient-to-r from-indigo-300 to-pink-300 bg-clip-text text-transparent">
              {formatNumber(current, 0)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Ağırlıklı çarpan: {formatNumber(weightedMult)}x
              {boost && " · +%20 boost dahil"}
            </p>
          </div>

          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scenarios} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{
                    background: "rgba(10,16,32,0.9)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    color: "#e6edf7",
                  }}
                  formatter={(value) => [formatNumber(Number(value), 0), "Puan gücü"]}
                />
                <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={18}>
                  {scenarios.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-inner px-4 py-3 text-sm">
            <p className="text-slate-200">
              🏆 En yüksek puan: <strong>{best.name}</strong> (
              {formatNumber(best.value, 0)})
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Çarpanlar gereği en çok puanı her zaman %100 LP verir; Lend (5x)
              ise daha düşük riskle güçlü bir orta yoldur.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-200/90">
        ⚠️ <strong>Bu bir TAHMİNDİR.</strong> Gerçek puan formülü (hacim ×
        süre) resmi olarak açıklanmadı; bu hesap yalnızca bilinen çarpan
        oranlarına (Tut 1x · Lend 5x · LP 7x) dayanır. <strong>Risk notu:</strong>{" "}
        LP pozisyonlarında kalıcı olmayan kayıp (impermanent loss) riski vardır;
        lend etmek görece daha güvenlidir. Hiçbiri yatırım tavsiyesi değildir.
      </div>
    </GlassCard>
  );
}

function AllocationSlider({
  label,
  value,
  share,
  color,
  onChange,
}: {
  label: string;
  value: number;
  share: number;
  color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-slate-200" style={{ color }}>
          %{formatNumber(share * 100, 0)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: color }}
      />
    </div>
  );
}
