import { NextResponse } from "next/server";
import type { LeaderboardResult } from "@/lib/types";

export const dynamic = "force-dynamic";

// LEADERBOARD_URL env değişkeni doluysa server-side çağrılır (CORS'a takılmaz).
// Boşsa modül devre dışı kalır; arayüz bunun yerine kendi cüzdan karşılaştırma
// tablosunu gösterir. Not: resmi points-api'de leaderboard/rank ucu YOK
// (defi.xstocks.fi istemci kodu incelendi) — bu yüzden bu alan opsiyonel.

export async function GET() {
  const url = process.env.LEADERBOARD_URL;
  if (!url) {
    const result: LeaderboardResult = { enabled: false };
    return NextResponse.json(result);
  }

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json({
        enabled: true,
        error: `Leaderboard kaynağı HTTP ${res.status} döndürdü.`,
      } satisfies LeaderboardResult);
    }
    const data = (await res.json()) as unknown;
    return NextResponse.json({ enabled: true, data } satisfies LeaderboardResult);
  } catch {
    return NextResponse.json({
      enabled: true,
      error: "Leaderboard kaynağına ulaşılamadı.",
    } satisfies LeaderboardResult);
  }
}
