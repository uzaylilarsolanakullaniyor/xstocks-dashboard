import { NextRequest, NextResponse } from "next/server";
import { isValidSolanaAddress } from "@/lib/server/xstocks";
import type { PointsResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEFAULT_BASE = "https://points-api.xstocks.fi/api/v1";

// Yanıt şekilleri gerçek API ile doğrulandı:
//   GET /xdrop-user/{w}            -> {success, data:{walletAddress, referralCode, referredBy, createdAt, ...}}
//   GET /xdrop-user/{w}/dashboard  -> {success, data:{totalPoints, todayPoints, xboostMultiplier,
//                                      socialQuestMultiplier, referralPoints, referralCount, questPoints, ...}}
//   GET /xdrop-user/{w}/points-breakdown -> {success, data:{holdersPoints, lendingPoints, lpsPoints, referralPoints}}
// Sayısal alanlar string olarak gelir ("123.45") -> parseFloat ile çevrilir.
// Kayıtsız cüzdan: HTTP 404 {"error":"User not found"}

interface ApiEnvelope {
  success?: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
}

async function getJson(
  url: string
): Promise<{ status: number; body: ApiEnvelope | null }> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    // Resmi arayüz bu veriyi 15 dk taze sayıyor; biz 120 sn önbelleğe alıyoruz.
    next: { revalidate: 120 },
  });
  const body = (await res.json().catch(() => null)) as ApiEnvelope | null;
  return { status: res.status, body };
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.trim() ?? "";
  if (!isValidSolanaAddress(wallet)) {
    return NextResponse.json(
      { error: "Geçersiz Solana cüzdan adresi." },
      { status: 400 }
    );
  }

  const base = (process.env.POINTS_API_BASE || DEFAULT_BASE).replace(/\/$/, "");

  try {
    const [user, dashboard, breakdown] = await Promise.all([
      getJson(`${base}/xdrop-user/${wallet}`),
      getJson(`${base}/xdrop-user/${wallet}/dashboard`),
      getJson(`${base}/xdrop-user/${wallet}/points-breakdown`),
    ]);

    if (dashboard.status === 404) {
      const result: PointsResult = {
        wallet,
        registered: false,
        totalPoints: 0,
        todayPoints: 0,
        boostMultiplier: 0,
        permanentMultiplier: 0,
        referralPoints: 0,
        referralCount: 0,
        referralCode: null,
        questPoints: 0,
        breakdown: null,
        createdAt: null,
      };
      return NextResponse.json(result);
    }

    if (dashboard.status === 429) {
      return NextResponse.json(
        { error: "xPoints API hız limiti aşıldı. Lütfen ~1 dk sonra yenileyin." },
        { status: 429 }
      );
    }

    if (dashboard.status === 403) {
      return NextResponse.json(
        { error: "xPoints API şu an doğrulama (captcha) istiyor; sonra tekrar deneyin." },
        { status: 502 }
      );
    }

    const d = dashboard.body?.data;
    if (dashboard.status !== 200 || !dashboard.body?.success || !d) {
      return NextResponse.json(
        { error: `xPoints API beklenmeyen yanıt verdi (HTTP ${dashboard.status}).` },
        { status: 502 }
      );
    }

    const b = breakdown.status === 200 ? breakdown.body?.data : undefined;
    const u = user.status === 200 ? user.body?.data : undefined;
    const season = d.currentSeason as { startDate?: string } | undefined;

    const result: PointsResult = {
      wallet,
      registered: true,
      totalPoints: num(d.totalPoints),
      todayPoints: num(d.todayPoints),
      boostMultiplier: num(d.xboostMultiplier),
      permanentMultiplier: num(d.socialQuestMultiplier),
      referralPoints: num(b?.referralPoints ?? d.referralPoints),
      referralCount: num(d.referralCount),
      referralCode: typeof u?.referralCode === "string" ? u.referralCode : null,
      questPoints: num(d.questPoints),
      breakdown: b
        ? {
            holding: num(b.holdersPoints),
            lending: num(b.lendingPoints),
            lp: num(b.lpsPoints),
            referral: num(b.referralPoints),
          }
        : null,
      createdAt:
        (typeof d.createdAt === "string" && d.createdAt) ||
        (typeof d.dateSincePointsStarted === "string" && d.dateSincePointsStarted) ||
        season?.startDate ||
        null,
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "xPoints API'ye ulaşılamadı." },
      { status: 502 }
    );
  }
}
