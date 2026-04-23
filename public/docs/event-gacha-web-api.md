# Event Gacha (Web) API

Dokumentasi endpoint yang dipakai UI **Event Gacha / Spin Wheel** (akan dipakai juga saat UI dipindah ke Next.js).

- Base path: mengikuti prefix API kamu, contoh: `/<VERSION>`.
- Semua endpoint di bawah ini berada pada router `src/routes/eventGachaWeb.routes.js`.
- `event_code`:
  - Default: `GACHA_BORDER_SSS_PLUS`.
  - Bisa dioverride via query `?event_code=...`.
  - Jika FE memakai multi-event (lihat `src/docs/gacha-admin.md`), FE sebaiknya selalu mengirim `event_code` yang sama ke endpoint spin/state.

- Status event (waktu mulai/akhir):
  - Event dianggap **aktif** jika `GachaConfig.is_active=true`.
  - Jika ada data `SpecialEvent` untuk `gacha_event_code=<event_code>`, maka event juga harus:
    - `SpecialEvent.is_active=true`
    - waktu sekarang berada dalam window `starts_at` s/d `ends_at`.
  - Jika event tidak aktif / di luar window, endpoint akan mengembalikan error dan tidak memproses spin.

---

## 0) Prize Pool (hadiah yang tersedia)
GET `/<VERSION>/events/gacha/prizes?event_code=GACHA_BORDER_SSS_PLUS`

- Auth: tidak wajib
- Query:
  - `event_code` (opsional)

Respon sukses (200):
```json
{
  "success": true,
  "event_code": "GACHA_BORDER_SSS_PLUS",
  "cost_per_spin": 100,
  "cost_per_10": null,
  "prizes": [
    {
      "id": "prize_1",
      "type": "coin",
      "label": "Coins",
      "amount": 50,
      "tier": "COMMON",
      "image_url": "https://...",
      "weight": 10
    }
  ]
}
```

Catatan drop rate (per item):
- Server menggunakan `weight` di tabel `GachaPrize` sebagai **peluang relatif**.
- Perkiraan persentase untuk satu hadiah = `weight / totalWeight * 100%`.
  - Contoh: jika total weight semua hadiah = 100 dan coin punya weight 25, maka drop rate coin ≈ 25%.
- Jika `weight` tidak ada / tidak valid / `<= 0`, hadiah dianggap **0%** dan **tidak bisa dimenangkan**.

Aturan tambahan:
- Hadiah tipe `border`, `sticker`, `badge`, `super_badge` **tidak bisa didapat lagi** jika user sudah memilikinya (dianggap `weight=0`).
- Hadiah tipe `token` (Sharp Token) mengikuti `weight` di database.
  - Nilai token yang didapat mengikuti field `amount` pada hadiah (default 1).

Aturan free spin:
- Setiap user mendapat **1x spin gratis per hari** untuk tiap `event_code`.
- Free spin hanya berlaku untuk request `count=1`.
- Jika free spin tersedia, server akan menjalankan spin dengan biaya `0` (tidak memotong coin).
- Status free spin dan cooldown bisa dicek dari endpoint **Get State**.

Respon error:
- 400: `{ "success": false, "message": "Event tidak aktif" }`
- 500: `{ "success": false, "message": "..." }`

## 1) Get Me (untuk halaman gacha)
GET `/<VERSION>/events/gacha/me`

- Auth: **wajib** (Bearer token)

Respon sukses (200):
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "u",
    "email": "user@mail.com"
  }
}
```

Respon jika tidak login (401):
```json
{ "authenticated": false }
```

---

## 2) Get State (saldo coins + sharp tokens + pity)
GET `/<VERSION>/events/gacha/state?event_code=GACHA_BORDER_SSS_PLUS`

- Auth: **wajib** (Bearer token)
- Query:
  - `event_code` (opsional)

Respon sukses (200):
```json
{
  "success": true,
  "balance": 1200,
  "sharpTokens": 3,
  "starts_at": "2026-01-01T00:00:00.000Z",
  "ends_at": "2026-01-31T23:59:59.000Z",
  "freeSpinAvailable": true,
  "nextFreeSpinAt": null,
  "freeSpinCooldownSeconds": 0,
  "pitySpins": 12,
  "pityRemaining": 78
}
```

Kontrak field free spin:
- `freeSpinAvailable` (boolean, wajib):
  - `true` jika user masih punya 1x free spin hari ini untuk event tersebut.
  - `false` jika sudah dipakai dan belum reset.
- `nextFreeSpinAt` (string | null, ISO date):
  - `null` jika `freeSpinAvailable=true`.
  - jika `freeSpinAvailable=false`, berisi waktu kapan free spin tersedia lagi (reset harian / next UTC midnight).
- `freeSpinCooldownSeconds` (number, wajib):
  - `0` jika `freeSpinAvailable=true`.
  - jika `false`, berisi sisa detik menuju `nextFreeSpinAt`.

Respon error:
- 401: `{ "success": false, "message": "Unauthorized" }`
- 400: `{ "success": false, "message": "Event tidak aktif" }`
- 500: `{ "success": false, "message": "..." }`

---

## 3) Spin Gacha
POST `/<VERSION>/events/gacha/spin?count=1&event_code=GACHA_BORDER_SSS_PLUS`

- Auth: **wajib** (Bearer token)
- Query/body:
  - `count` (opsional): jumlah spin.
    - Bisa dikirim via query `count` atau JSON body `{ "count": 10 }`.
    - Server membatasi `count` pada range `1..10`.
  - `event_code` (opsional)

Contoh request:
```bash
curl -X POST "http://localhost:3000/<VERSION>/events/gacha/spin?count=10&event_code=GACHA_BORDER_SSS_PLUS" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"count":10}'
```

Respon sukses (200):
```json
{
  "success": true,
  "prize": {
    "id": "prize_123",
    "type": "coin",
    "label": "Coins",
    "amount": 50,
    "tier": "COMMON",
    "slotIndex": 3
  },
  "prizes": [
    {
      "id": "prize_123",
      "type": "coin",
      "label": "Coins",
      "amount": 50,
      "tier": "COMMON",
      "slotIndex": 3
    }
  ],
  "count": 1,
  "sharpTokensWon": 0,
  "balance": 1200,
  "sharpTokens": 3,
  "freeSpinUsed": true,
  "freeSpinAvailable": false,
  "nextFreeSpinAt": "2026-01-03T00:00:00.000Z",
  "freeSpinCooldownSeconds": 86399,
  "coinsSpent": 0,
  "pitySpins": 12,
  "pityRemaining": 78
}
```

Kontrak field free spin pada Spin:
- `freeSpinUsed` (boolean, wajib untuk `count=1`):
  - `true` jika request itu memakai free spin.
  - `false` jika tidak.
- `coinsSpent` (number, wajib):
  - `0` jika free spin terpakai.
  - `cost_per_spin` (atau total cost) jika bukan free.
- `freeSpinAvailable`, `nextFreeSpinAt`, `freeSpinCooldownSeconds`:
  - Selalu dikirim sebagai status **setelah** spin dilakukan (agar FE bisa update tanpa refetch state).

Rules konsistensi (BE):
- Free spin hanya berlaku untuk `count=1`.
- Jika `count=10`, maka `freeSpinUsed=false` dan `coinsSpent > 0`.
- Scope per `event_code`.
- Free spin dihitung per event (per `user_id + event_code + tanggal`).

Catatan field:
- `prize`: hadiah terakhir (untuk UI animasi sekali putar / hasil akhir).
- `prizes`: array hadiah untuk seluruh spin pada request (panjang = `count`).
- `slotIndex`: index slot UI (0..7) jika hadiah ada di 8 slot pertama pool; bisa `null`.
- `balance`: saldo coins terbaru setelah spend + hadiah coin.
- `sharpTokens`:
  - saldo Sharp Token setelah spin.
- `sharpTokensWon`: jumlah token yang didapat pada request ini.
- `pitySpins`/`pityRemaining`: progres pity (threshold 90).

Catatan pity (spin ke-90):
- Jika pada pity spin semua hadiah `is_pity_main` sudah dimiliki / tidak bisa dimenangkan (`weight=0`), server akan memberi hadiah fallback **COIN 15000**.

Contoh hadiah BORDER (enriched):
```json
{
  "id": "border_6",
  "type": "border",
  "label": "Aurora Glow",
  "tier": "SSS_PLUS",
  "slotIndex": 0,
  "image_url": "https://cdn.../borders/aurora.gif",
  "border_id": 6,
  "code": "AVATAR_BORDER_SSS_PLUS"
}
```

Respon error:
- 401: `{ "success": false, "message": "Unauthorized" }`
- 400:
  - `{ "success": false, "message": "Event belum dikonfigurasi" }`
  - `{ "success": false, "message": "Saldo koin tidak cukup" }`
  - `{ "success": false, "message": "..." }`

---

## 4) Shop Items (DB-managed)
GET `/<VERSION>/events/gacha/shop/items?event_code=GACHA_BORDER_SSS_PLUS`

- Auth: **wajib** (Bearer token)
- Query:
  - `event_code` (opsional)

Respon sukses (200):
```json
{
  "success": true,
  "items": [
    {
      "code": "AVATAR_BORDER_SSS_PLUS",
      "type": "border",
      "title": "Avatar Border SSS+",
      "image_url": "https://cdn.../borders/sss_plus.gif",
      "sharp_cost": 10
    }
  ]
}
```

---

## 5) Exchange Shop Item (DB-managed)
POST `/<VERSION>/events/gacha/shop/exchange`

- Auth: **wajib** (Bearer token)
- Body JSON:
```json
{ "code": "AVATAR_BORDER_SSS_PLUS" }
```

Respon sukses (200):
```json
{
  "success": true,
  "prize": {
    "id": "border_6",
    "type": "border",
    "label": "Aurora Glow",
    "image_url": "https://cdn.../borders/aurora.gif",
    "tier": "SSS_PLUS",
    "border_id": 6,
    "code": "AVATAR_BORDER_SSS_PLUS"
  },
  "sharpTokens": 0
}
```

Respon error (400):
- `{ "success": false, "message": "Kode item wajib diisi" }`
- `{ "success": false, "message": "Item tidak tersedia" }`
- `{ "success": false, "message": "Token kurang. Butuh 10 Sharp Token." }`
- `{ "success": false, "message": "Kamu sudah memiliki avatar border ini." }`

---

## 6) Exchange SSS+ (legacy endpoint)
POST `/<VERSION>/events/gacha/shop/exchange-sss-plus`

- Auth: **wajib** (Bearer token)
- Catatan: endpoint ini menukar **10 Sharp Token** untuk border `AVATAR_BORDER_SSS_PLUS`.

Respon sukses (200):
```json
{
  "success": true,
  "prize": {
    "id": "border_6",
    "type": "border",
    "label": "Avatar Border SSS+",
    "image_url": "https://cdn.../borders/sss_plus.gif",
    "tier": "SSS_PLUS",
    "border_id": 6,
    "code": "AVATAR_BORDER_SSS_PLUS"
  },
  "sharpTokens": 0
}
```

Respon error (400):
- `{ "success": false, "message": "Token kurang. Butuh 10 Sharp Token." }`

