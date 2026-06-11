"use client";

import { useState } from "react";
import GlassCard from "./GlassCard";
import { shortAddress } from "@/lib/format";

const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export default function WalletManager({
  wallets,
  onAdd,
  onRemove,
}: {
  wallets: string[];
  onAdd: (w: string) => void;
  onRemove: (w: string) => void;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    const addr = input.trim();
    if (!SOLANA_ADDR_RE.test(addr)) {
      setError("Geçersiz Solana adresi (base58, 32–44 karakter olmalı).");
      return;
    }
    if (wallets.includes(addr)) {
      setError("Bu cüzdan zaten listede.");
      return;
    }
    onAdd(addr);
    setInput("");
    setError(null);
  }

  return (
    <GlassCard
      title="Cüzdanlar"
      subtitle="Takip etmek istediğin Solana adreslerini ekle — tarayıcında (localStorage) saklanır, sunucuya kaydedilmez."
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Solana cüzdan adresi…"
          spellCheck={false}
          className="input-glass w-full px-4 py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-500"
        />
        <button
          onClick={handleAdd}
          className="btn-primary px-6 py-2.5 text-sm font-semibold text-white"
        >
          + Ekle
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}

      {wallets.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {wallets.map((w) => (
            <li
              key={w}
              className="glass-inner flex items-center gap-2 px-3 py-1.5 text-sm"
            >
              <span className="font-mono text-slate-200" title={w}>
                {shortAddress(w)}
              </span>
              <button
                onClick={() => onRemove(w)}
                aria-label={`${shortAddress(w)} adresini sil`}
                className="rounded-full px-1.5 text-slate-400 transition-colors hover:bg-rose-500/20 hover:text-rose-300"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Henüz cüzdan eklenmedi. Puan ve portföy modülleri cüzdan ekleyince
          çalışır.
        </p>
      )}
    </GlassCard>
  );
}
