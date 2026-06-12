import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <main className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 sm:py-12">
      <header className="fade-up mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
            xStocks xPoints Paneli
          </span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
          Cüzdanlarındaki xPoints puanlarını, canlı portföy değerini ve strateji
          senaryolarını tek ekrandan izle. Sadece okur — hiçbir işlem yapmaz.
        </p>
      </header>
      <Dashboard />
      <footer className="mt-10 text-center text-xs text-slate-600">
        Veriler points-api.xstocks.fi, api.xstocks.fi ve Solana RPC&apos;den
        sunucu üzerinden alınır · Yatırım tavsiyesi değildir
      </footer>
    </main>
  );
}
