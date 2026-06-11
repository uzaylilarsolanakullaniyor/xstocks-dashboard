# xStocks xPoints Paneli

xStocks **xPoints** puanlarını, canlı **portföy değerini** ve **strateji
senaryolarını** takip eden kişisel panel. Sadece veri okur — hiçbir
işlem/transaction yapmaz, cüzdan bağlamaz, imza istemez.

- **Next.js 15 (App Router) + TypeScript + React 19**
- **Tailwind CSS v4** — liquid glass (glassmorphism) koyu tema, mobil uyumlu
- **Recharts** — strateji ve portföy grafikleri
- Tüm dış API çağrıları **server-side** route handler'lar üzerinden yapılır
  (CORS sorunu yok, RPC anahtarı tarayıcıya sızmaz)

## Modüller

| Modül | Açıklama |
|---|---|
| **Canlı Puan Paneli** | Birden çok cüzdan (localStorage'da saklanır) için toplam puan, bugünkü puan, boost çarpanı, holding/lend/LP/referans kırılımı; cüzdan başına satır + toplam satırı |
| **Strateji Hesaplayıcı** | Sermayeyi Tut (1x) / Lend (5x) / LP (7x) arasında bölüştür, +%20 boost anahtarı; göreceli puan gücü ve senaryo karşılaştırma grafiği. Tamamen tarayıcıda çalışır |
| **Canlı Pozisyon Değeri** | Cüzdanlardaki xStock (Token-2022) bakiyeleri × güncel fiyatlar; toplam $ değer, token dökümü, dağılım grafiği |
| **Leaderboard (opsiyonel)** | `LEADERBOARD_URL` doluysa görünür; boşsa gizlenir (karşılaştırma için çoklu cüzdan tablosu yeterlidir) |

## Kurulum: GitHub → Vercel

Lokal çalıştırma gerekmez; her şey Vercel'de çalışır.

### 1. GitHub'a push

```bash
cd xstocks-dashboard
git init            # repo zaten init edildiyse atla
git add -A
git commit -m "xStocks xPoints paneli"
# GitHub'da boş bir repo oluşturun (örn. xstocks-dashboard), sonra:
git remote add origin https://github.com/KULLANICI_ADINIZ/xstocks-dashboard.git
git branch -M main
git push -u origin main
```

### 2. Vercel'e bağlama

1. [vercel.com](https://vercel.com) → **Add New… → Project**
2. GitHub hesabınızı bağlayın ve `xstocks-dashboard` reposunu **Import** edin
3. Framework otomatik olarak **Next.js** algılanır — ayar değiştirmeye gerek yok

### 3. Environment Variables

Vercel'de **Project → Settings → Environment Variables** bölümüne girin
(Production + Preview için):

| İsim | Değer | Zorunlu mu? |
|---|---|---|
| `SOLANA_RPC_URL` | `https://mainnet.helius-rpc.com/?api-key=HELIUS_ANAHTARINIZ` | Önerilir — boşsa yavaş/limitli public RPC kullanılır |
| `POINTS_API_BASE` | `https://points-api.xstocks.fi/api/v1` | Hayır — boşsa bu varsayılan kullanılır |
| `LEADERBOARD_URL` | Network sekmesinden bulduğunuz leaderboard JSON adresi | Hayır — boşsa modül gizlenir |

> Anahtarlar yalnızca server route'larında okunur; istemciye asla gönderilmez.

### 4. Deploy

**Deploy** butonuna basın. Sonraki her `git push` otomatik deploy tetikler.
Env değişkenini sonradan eklerseniz **Deployments → ⋯ → Redeploy** yapın.

## API Notları (gerçek veriyle doğrulanmış)

Alan isimleri varsayılmadı; resmi `defi.xstocks.fi` istemcisinin yaptığı
çağrılar ve canlı yanıtlar incelenerek bağlandı:

- `GET {POINTS_API_BASE}/xdrop-user/{wallet}` → yalnızca profil
  (`referralCode`, `referredBy`, `createdAt`). **Asıl puan verisi:**
  - `…/{wallet}/dashboard` → `totalPoints`, `todayPoints`,
    `xboostMultiplier`, `socialQuestMultiplier`, `referralPoints`,
    `referralCount`, `questPoints` (sayılar **string** gelir, parse edilir)
  - `…/{wallet}/points-breakdown` → `holdersPoints`, `lendingPoints`,
    `lpsPoints`, `referralPoints`
  - Tüm yanıtlar `{success, data}` zarfındadır; kayıtsız cüzdan
    `404 {"error":"User not found"}` döndürür (panelde "kayıtlı değil"
    rozeti gösterilir)
  - Resmi API'de **rank/leaderboard ucu yok** — sıralama yalnızca
    `LEADERBOARD_URL` verilirse gösterilebilir
- `GET api.xstocks.fi/api/v2/public/assets?page=N` → sayfalıdır
  (`page.hasNextPage`); tüm sayfalar gezilir, Solana mint'leri eşlenir
- `…/assets/{symbol}/price-data` → `{quote}` (USD)
- **Scaled UI Amount:** xStock token'ları Token-2022'nin Scaled UI eklentisini
  kullanır. RPC'nin `uiAmount` değeri çarpanı **zaten içerir** (canlı veriyle
  doğrulandı: `amount/10^decimals × currentMultiplier = uiAmount`). Bu yüzden
  değer = `uiAmount × fiyat`; multiplier ucu ikinci kez **uygulanmaz**
- **Hız limiti:** public API 10 istek/dk → varlık listesi 10 dk, fiyatlar
  60 sn, puanlar 120 sn sunucu önbelleğindedir; fiyat yalnızca cüzdanda
  bulunan semboller için istenir

## Güvenlik

- Tarayıcıdan dış API'ye doğrudan istek yapılmaz; her şey `/api/*` route
  handler'larından geçer
- `SOLANA_RPC_URL` (Helius anahtarı) yalnızca sunucuda okunur
- Cüzdan listesi yalnızca tarayıcınızın localStorage'ında durur

## Uyarı

Strateji hesaplayıcı bir **tahmindir**: gerçek puan formülü (hacim × süre)
resmi olarak açıklanmamıştır; hesap yalnızca bilinen çarpan oranlarına dayanır.
LP pozisyonlarında impermanent loss riski vardır. Yatırım tavsiyesi değildir.
