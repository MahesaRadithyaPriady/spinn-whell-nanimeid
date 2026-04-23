# Store API Documentation

## Overview
API untuk mengelola sistem toko, wallet, koin, VIP, badge, dan cashout dalam aplikasi nanimeid.

## Base URL
```
/${VERSION}/store
```

## Endpoints

### 1. Wallet Management

#### Get User Wallet
**GET** `/${VERSION}/store/wallet`

Mendapatkan informasi wallet user (memerlukan autentikasi).

**Headers:**
```
Authorization: Bearer <token>
```

**Respon sukses (200):**
```json
{
  "user_id": 10,
  "balance_coins": 1200
}
```

**Respon error:**
- 400: `{ "message": "userId wajib" }`
- 500: `{ "message": "..." }`

---

## VIP Eligibility Check

**GET** `/${VERSION}/store/vip/eligibility`

Digunakan untuk mengecek apakah user memenuhi VIP minimum untuk fitur store tertentu (contoh: stiker).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (contoh):**
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "eligible": true,
    "reason": null,
    "feature": "STORE",
    "required": { "min_tier": "Bronze" },
    "user": { "vip_active": true, "vip_level": "Bronze" }
  }
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 123,
  "balance_coins": 1500,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### UserSticker
```json
{
  "id": "integer",
  "user_id": "integer",
  "sticker_id": "integer",
  "acquired_at": "datetime"
}
```

#### Earn Coins
**POST** `/${VERSION}/store/wallet/earn`

Menambahkan 10 koin ke wallet user (selalu menambah 10 koin).

**Body:**
```json
{
  "userId": 123,
  "ref": "daily_login"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 123,
  "balance_coins": 1510,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

#### Get Coin Transactions
**GET** `/${VERSION}/store/coins/transactions`

Mendapatkan riwayat transaksi koin user dengan pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional) - Halaman (default: 1)
- `limit` (optional) - Jumlah per halaman (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "type": "EARN",
      "amount": 10,
      "ref": "daily_login",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### 2. Store Items

#### List Store Items
**GET** `/${VERSION}/store/items`

Mendapatkan daftar item yang tersedia di toko.

**Query Parameters:**
**Response:**
```json
{
  "status": 200,
  "message": "Daftar item store berhasil diambil",
  "data": [
    {
      "id": 1,
      "sku": "VIP_GOLD_30",
      "title": "VIP Gold 30 Hari",
      "description": "Akses VIP Gold selama 30 hari",
      "item_type": "VIP",
      "coin_price": 1000,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "sku": "BADGE_PREMIUM_GOLD",
      "title": "Premium Gold Member",
      "description": "Badge eksklusif untuk member premium",
      "badge_name": "Premium Member",
      "badge_icon": "https://example.com/badge.png",
      "title_color": "#FFD700",
      "item_type": "BADGE",
      "coin_price": 500,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 2
}
```

**Response (Tidak Ada Item):**
```json
{
  "status": 200,
  "message": "Belum ada item di store",
  "data": [],
  "total": 0
}
```

#### List Coin Packs (Play Store)
**GET** `/${VERSION}/store/coins/packs`

Mengambil daftar paket koin yang dapat dibeli via Play Store. Pembelian dilakukan di aplikasi (Play Store), backend hanya menampilkan katalog.

Catatan:
- Endpoint ini tidak membutuhkan autentikasi.
- Manual top-up API sudah tidak digunakan (deprecated) dan telah dinonaktifkan dari backend.

**Response (Contoh):**
```json
{
  "status": 200,
  "message": "Berhasil mengambil daftar paket koin",
  "data": [
    {
      "id": 10,
      "sku": "COIN_PACK_100",
      "title": "100 Coins",
      "description": "Paket 100 koin",
      "item_type": "COIN",
      "coin_amount": 100,
      "coin_price": 0,
      "is_active": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 11,
      "sku": "COIN_PACK_500",
      "title": "500 Coins",
      "description": "Paket 500 koin",
      "item_type": "COIN",
      "coin_amount": 500,
      "coin_price": 0,
      "is_active": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 2
}
```

### 3. VIP Purchase

#### Purchase VIP
**POST** `/${VERSION}/store/purchase/vip`

Membeli paket VIP menggunakan koin (memerlukan autentikasi).

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "itemId": 1
}
```

**Response:**
```json
{
  "message": "VIP aktif/extend",
  "wallet": {
    "id": 1,
    "user_id": 123,
    "balance_coins": 1000
  },
  "item": {
    "id": 1,
    "sku": "VIP_GOLD_30",
    "title": "VIP Gold 30 Hari",
    "coin_price": 500,
    "vip_days": 30
  },
  "purchase": {
    "id": 1,
    "user_id": 123,
    "item_id": 1,
    "coins_spent": 500,
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### 4. Badge Management

#### Purchase Badge
**POST** `/${VERSION}/store/purchase/badge`

Membeli badge menggunakan koin (memerlukan autentikasi).

Endpoint ini sekarang mendukung **dua jenis item**:
- Badge biasa (`item_type = BADGE`) → disimpan di `UserBadge`.
- Superbadge (`item_type = SUPERBADGE`) → disimpan di `UserSuperBadge` dan terhubung ke master `Badge`.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters (opsional):**
- `type` (string) – Jenis badge yang dibeli:
  - `BADGE` (default jika tidak diisi) → beli badge biasa.
  - `SUPERBADGE` → beli superbadge berdasarkan katalog `SUPERBADGE` di store.

**Body:**
```json
{
  "itemId": 2
}
```

**Response (contoh – BADGE biasa):**
```json
{
  "message": "Badge berhasil dibeli",
  "wallet": {
    "id": 1,
    "user_id": 123,
    "balance_coins": 800
  },
  "item": {
    "id": 2,
    "sku": "BADGE_PREMIUM",
    "title": "Premium Badge",
    "badge_name": "Premium Member",
    "badge_icon": "https://example.com/badge-premium.png"
  },
  "userBadge": {
    "id": 1,
    "user_id": 123,
    "badge_name": "Premium Member",
    "badge_icon": "https://example.com/badge-premium.png",
    "is_active": false,
    "obtained_at": "2024-01-01T12:00:00.000Z"
  },
  "purchase": {
    "id": 1,
    "user_id": 123,
    "item_id": 2,
    "coins_spent": 200,
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**Response (contoh – SUPERBADGE):**
```json
{
  "message": "Badge berhasil dibeli",
  "wallet": {
    "id": 1,
    "user_id": 123,
    "balance_coins": 800
  },
  "item": {
    "id": 10,
    "sku": "SUPERBADGE_NEWYEAR_2025",
    "title": "New Year 2025 Superbadge",
    "item_type": "SUPERBADGE",
    "badge_id": 5
  },
  "userSuperBadge": {
    "id": 1,
    "user_id": 123,
    "badge_id": 5,
    "badge_name": "New Year 2025",
    "badge_icon": "https://example.com/superbadge-newyear.png",
    "title_color": null,
    "is_active": false,
    "obtained_at": "2024-01-01T12:00:00.000Z",
    "expires_at": null
  },
  "purchase": {
    "id": 99,
    "user_id": 123,
    "item_id": 10,
    "coins_spent": 2000,
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Get User Badges
**GET** `/${VERSION}/store/badges`

Mendapatkan daftar badge yang dimiliki user (memerlukan autentikasi).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 123,
    "badge_name": "Premium Member",
    "badge_icon": "https://example.com/badge-premium.png",
    "title_color": "#FFD700",
    "is_active": true,
    "obtained_at": "2024-01-01T12:00:00.000Z"
  },
  {
    "id": 2,
    "user_id": 123,
    "badge_name": "Early Adopter",
    "badge_icon": "https://example.com/badge-early.png",
    "title_color": "#00FF00",
    "is_active": false,
    "obtained_at": "2024-01-02T12:00:00.000Z"
  }
]
```

#### Get Active Badge
**GET** `/${VERSION}/store/badges/active`

Mendapatkan badge yang sedang aktif/digunakan user (memerlukan autentikasi).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `userId` (optional) - ID user (jika tidak ada, ambil dari token)

**Response (Badge Aktif):**
```json
{
  "status": 200,
  "message": "Badge aktif ditemukan",
  "data": {
    "id": 1,
    "user_id": 123,
    "badge_name": "Premium Member",
    "badge_icon": "https://example.com/badge-premium.png",
    "title_color": "#FFD700",
    "is_active": true,
    "obtained_at": "2024-01-01T12:00:00.000Z"
  }
}
```

**Response (Tidak Ada Badge Aktif):**
```json
{
  "status": 200,
  "message": "Tidak ada badge yang sedang aktif",
  "data": null
}
```

#### Activate Badge
**POST** `/${VERSION}/store/badges/activate`

Mengaktifkan badge tertentu (memerlukan autentikasi).

Kebijakan terbaru:
- Maksimum 3 badge dapat aktif secara bersamaan per user.
- Mengaktifkan satu badge TIDAK menonaktifkan badge lainnya.
- Jika badge sudah aktif, response akan mengembalikan badge apa adanya.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "badgeName": "Premium Member"
}
```

**Response:**
```json
{
  "message": "Badge berhasil diaktifkan",
  "activatedBadge": {
    "id": 1,
    "user_id": 123,
    "badge_name": "Premium Member",
    "badge_icon": "https://example.com/badge-premium.png",
    "is_active": true,
    "obtained_at": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Deactivate Badge
**POST** `/${VERSION}/store/badges/deactivate`

Menonaktifkan SEMUA badge user (memerlukan autentikasi).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Badge berhasil dinonaktifkan",
  "deactivatedCount": 1
}
```

### 4.1 Superbadge Management

Superbadge adalah badge spesial yang disimpan di tabel `UserSuperBadge` dan terhubung langsung ke master `Badge` (via `badge_id`).

Aturan:
- User bisa memiliki banyak superbadge.
- **Hanya boleh 1 superbadge yang aktif** pada satu waktu.

#### List Superbadges (Catalog + Ownership)
**GET** `/${VERSION}/store/superbadges`

Mengambil daftar semua superbadge dari katalog `Badge` beserta status kepemilikan user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters (opsional):**
- `userId` – Jika tidak diisi, memakai user dari token.

**Response:**
```json
{
  "status": 200,
  "message": "Daftar superbadge",
  "data": [
    {
      "id": 5,
      "code": "NY2025",
      "name": "New Year 2025",
      "description": "Superbadge event tahun baru 2025",
      "badge_url": "https://example.com/superbadge-newyear.png",
      "width": 512,
      "height": 512,
      "is_active_catalog": true,
      "is_owned": true,
      "is_active": true,
      "obtained_at": "2024-01-01T12:00:00.000Z",
      "expires_at": null
    },
    {
      "id": 6,
      "code": "XMAS2025",
      "name": "Christmas 2025",
      "description": "Superbadge event Natal 2025",
      "badge_url": "https://example.com/superbadge-xmas.png",
      "width": 512,
      "height": 512,
      "is_active_catalog": true,
      "is_owned": false,
      "is_active": false,
      "obtained_at": null,
      "expires_at": null
    }
  ]
}
```

#### Get Active Superbadge
**GET** `/${VERSION}/store/superbadges/active`

Mengambil superbadge yang sedang aktif untuk user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters (opsional):**
- `userId` – Jika tidak diisi, memakai user dari token.

**Response (ada superbadge aktif):**
```json
{
  "status": 200,
  "message": "Superbadge aktif ditemukan",
  "data": {
    "id": 1,
    "user_id": 123,
    "badge_id": 5,
    "badge_name": "New Year 2025",
    "badge_icon": "https://example.com/superbadge-newyear.png",
    "title_color": null,
    "is_active": true,
    "obtained_at": "2024-01-01T12:00:00.000Z",
    "expires_at": null,
    "badge": {
      "id": 5,
      "code": "NY2025",
      "name": "New Year 2025",
      "badge_url": "https://example.com/superbadge-newyear.png",
      "width": 512,
      "height": 512
    }
  }
}
```

**Response (tidak ada superbadge aktif):**
```json
{
  "status": 200,
  "message": "Tidak ada superbadge yang sedang aktif",
  "data": null
}
```

#### Activate Superbadge
**POST** `/${VERSION}/store/superbadges/activate`

Mengaktifkan satu superbadge milik user.

Kebijakan:
- User **harus sudah memiliki** superbadge tersebut (hasil pembelian sebelumnya).
- Saat mengaktifkan, **semua superbadge lain akan dinonaktifkan** sehingga hanya satu yang aktif.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "badgeId": 5
}
```

**Response 200:**
```json
{
  "message": "Superbadge berhasil diaktifkan",
  "superBadge": {
    "id": 1,
    "user_id": 123,
    "badge_id": 5,
    "badge_name": "New Year 2025",
    "badge_icon": "https://example.com/superbadge-newyear.png",
    "title_color": null,
    "is_active": true,
    "obtained_at": "2024-01-01T12:00:00.000Z",
    "expires_at": null,
    "badge": {
      "id": 5,
      "code": "NY2025",
      "name": "New Year 2025",
      "badge_url": "https://example.com/superbadge-newyear.png",
      "width": 512,
      "height": 512
    }
  }
}
```

**Response 400 (belum punya superbadge tersebut):**
```json
{
  "message": "Superbadge tidak ditemukan untuk user ini"
}
```

#### Deactivate Superbadge
**POST** `/${VERSION}/store/superbadges/deactivate`

Menonaktifkan superbadge yang sedang aktif (jika ada) untuk user.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Response 200:**
```json
{
  "message": "Superbadge berhasil dinonaktifkan",
  "deactivatedCount": 1
}
```

### 4.2 Sticker Management

Stiker digunakan untuk komentar/balasan. Katalog master disimpan di tabel `Sticker`, sedangkan kepemilikan user disimpan di `UserSticker`.

#### List Stickers (Catalog + Ownership)
**GET** `/${VERSION}/store/stickers`

Mengambil daftar semua stiker yang tersedia beserta status kepemilikan user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters (opsional):**
- `userId` – Jika tidak diisi, memakai user dari token.

**Response:**
```json
{
  "status": 200,
  "message": "Daftar stiker",
  "data": [
    {
      "id": 1,
      "code": "STK_HAPPY_1",
      "name": "Happy Emote",
      "description": "Stiker wajah senang",
      "image_url": "https://cdn.nanimeid.com/static/uploads/stikers/happy.png",
      "is_active_catalog": true,
      "is_owned": true,
      "acquired_at": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "code": "STK_SAD_1",
      "name": "Sad Emote",
      "description": "Stiker wajah sedih",
      "image_url": "https://cdn.nanimeid.com/static/uploads/stikers/sad.png",
      "is_active_catalog": true,
      "is_owned": false,
      "acquired_at": null
    }
  ]
}
```

#### Purchase Sticker
**POST** `/${VERSION}/store/purchase/sticker`

Membeli stiker menggunakan koin (memerlukan autentikasi). Item yang digunakan adalah `StoreItem` dengan `item_type = STICKER` yang terhubung ke master `Sticker` melalui `sticker_id`.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "itemId": 10
}
```

**Response (berhasil):**
```json
{
  "message": "Sticker berhasil dibeli",
  "wallet": {
    "id": 1,
    "user_id": 123,
    "balance_coins": 800
  },
  "item": {
    "id": 10,
    "sku": "STICKER_HAPPY_PACK",
    "title": "Happy Sticker Pack",
    "item_type": "STICKER",
    "sticker_id": 1,
    "coin_price": 200
  },
  "userSticker": {
    "id": 5,
    "user_id": 123,
    "sticker_id": 1,
    "acquired_at": "2024-01-01T12:00:00.000Z",
    "sticker": {
      "id": 1,
      "code": "STK_HAPPY_1",
      "name": "Happy Emote",
      "description": "Stiker wajah senang",
      "image_url": "https://cdn.nanimeid.com/static/uploads/stikers/happy.png"
    }
  }
}
```

**Response 400 (sudah dimiliki):**
```json
{
  "message": "Sticker sudah dimiliki",
  "alreadyOwned": true
}
```

### 5. Cashout System

#### Request Cashout
**POST** `/store/cashout`

Mengajukan penarikan koin menjadi uang (memerlukan autentikasi).

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "coins": 1000,
  "payoutMethod": "Bank Transfer",
  "payoutAddress": "1234567890 - Bank BCA"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 123,
  "coins": 1000,
  "amount_money": 1000,
  "status": "PENDING",
  "payout_method": "Bank Transfer",
  "payout_address": "1234567890 - Bank BCA",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

#### List Cashout Requests
**GET** `/store/cashout/requests`

Mendapatkan daftar permintaan cashout (memerlukan autentikasi).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `userId` (optional) - Filter berdasarkan user ID (untuk admin)
- `page` (optional) - Halaman (default: 1)
- `limit` (optional) - Jumlah per halaman (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "coins": 1000,
      "amount_money": 1000,
      "status": "PENDING",
      "payout_method": "Bank Transfer",
      "payout_address": "1234567890 - Bank BCA",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### Update Cashout Status
**PATCH** `/store/cashout/:id`

Mengupdate status permintaan cashout (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Parameters:**
- `id` (path) - ID permintaan cashout

**Body:**
```json
{
  "status": "APPROVED"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 123,
  "coins": 1000,
  "amount_money": 1000,
  "status": "APPROVED",
  "payout_method": "Bank Transfer",
  "payout_address": "1234567890 - Bank BCA",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T13:00:00.000Z"
}
```

## Data Structures

### StoreItem
```json
{
  "id": "integer",
  "sku": "string (unique)",
  "title": "string",
  "description": "string (optional)",
  "coin_price": "integer",
  "coin_amount": "integer (optional, untuk COIN)",
  "vip_days": "integer (optional, untuk VIP)",
  "badge_name": "string (optional, untuk Badge)",
  "badge_icon": "string (optional, URL icon badge)",
  "badge_id": "integer (optional, untuk SUPERBADGE, relasi ke master Badge)",
  "sticker_id": "integer (optional, untuk STICKER, relasi ke master Sticker)",
  "item_type": "enum (VIP, BADGE, SUPERBADGE, STICKER, COIN)",
  "is_active": "boolean",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### UserWallet
```json
{
  "id": "integer",
  "user_id": "integer",
  "balance_coins": "integer",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### UserBadge
```json
{
  "id": "integer",
  "user_id": "integer",
  "badge_name": "string",
  "badge_icon": "string (optional)",
  "is_active": "boolean",
  "obtained_at": "datetime"
}
```

### UserSuperBadge
```json
{
  "id": "integer",
  "user_id": "integer",
  "badge_id": "integer", // relasi ke master Badge
  "badge_name": "string", // cache nama badge
  "badge_icon": "string (optional)",
  "title_color": "string (optional)",
  "is_active": "boolean",
  "obtained_at": "datetime",
  "expires_at": "datetime (optional)"
}
```

### CoinTransaction
```json
{
  "id": "integer",
  "user_id": "integer",
  "type": "enum (EARN, SPEND, ADJUST)",
  "amount": "integer",
  "ref": "string (optional)",
  "createdAt": "datetime"
}
```

### CashoutRequest
```json
{
  "id": "integer",
  "user_id": "integer",
  "coins": "integer",
  "amount_money": "integer",
  "status": "enum (PENDING, APPROVED, REJECTED)",
  "payout_method": "string (optional)",
  "payout_address": "string (optional)",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "message": "userId dan itemId wajib"
}
```

### 401 Unauthorized
```json
{
  "message": "User tidak terautentikasi"
}
```

### 404 Not Found
```json
{
  "message": "Item tidak ditemukan atau non-aktif"
}
```

**Catatan khusus untuk Purchase Badge:**

Jika user mencoba membeli badge/superbadge yang sudah dimiliki, server akan mengembalikan:

```json
{
  "message": "Badge sudah dimiliki",
  "alreadyOwned": true
}
```

atau untuk superbadge:

```json
{
  "message": "Superbadge sudah dimiliki",
  "alreadyOwned": true
}
```

Sehingga frontend dapat dengan mudah membedakan error "sudah dimiliki" dari error lain.

### 500 Internal Server Error
```json
{
  "status": 500,
  "message": "Terjadi kesalahan saat mengambil daftar item",
  "data": [],
  "total": 0
}
```

## Business Logic

### Coin System
- **Earn**: Selalu menambah 10 koin per request
- **Spend**: Validasi saldo sebelum pembelian
- **Conversion**: 1 koin = 1 rupiah untuk cashout

### VIP System
- **Purchase**: Extend VIP jika masih aktif, atau mulai baru
- **Levels**: Berdasarkan item title (Gold, Diamond, etc.)
- **Duration**: Berdasarkan vip_days di item

### Badge System
- **Ownership**: User bisa memiliki multiple badge.
- **Activation**: Maksimum 3 badge aktif sekaligus. Aktifkan satu badge tidak mematikan yang lain.
- **Uniqueness**: Tidak bisa beli badge yang sudah dimiliki.

## Endpoints Tambahan (Badge one-by-one)

### Activate One Badge
**POST** `/${VERSION}/store/badges/activate-one`

Mengaktifkan satu badge tanpa mempengaruhi badge aktif lainnya (memerlukan autentikasi). Jika sudah ada 3 badge aktif, request ditolak.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{ "badgeName": "Ninja Gold" }
```

**Response 200 (berhasil):**
```json
{
  "message": "Badge berhasil diaktifkan",
  "activatedBadge": {
    "user_id": 123,
    "badge_name": "Ninja Gold",
    "is_active": true
  }
}
```

**Response 400 (maks 3 aktif):**
```json
{ "message": "Maksimum 3 badge aktif sekaligus" }
```

### Deactivate One Badge
**POST** `/${VERSION}/store/badges/deactivate-one`

Menonaktifkan satu badge tertentu tanpa mempengaruhi badge lain (memerlukan autentikasi).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{ "badgeName": "Ninja Gold" }
```

**Response 200:**
```json
{
  "message": "Badge dinonaktifkan",
  "deactivatedBadge": {
    "user_id": 123,
    "badge_name": "Ninja Gold",
    "is_active": false
  },
  "alreadyInactive": false
}
```

### Cashout System
- **Status**: PENDING → APPROVED/REJECTED
- **Validation**: Cek saldo koin sebelum request
- **Admin**: Hanya admin yang bisa update status

## Security Notes

1. **Authentication**: Semua endpoint kecuali `/items` memerlukan token
2. **Validation**: Server-side validation untuk semua transaksi
3. **Transactions**: Database transaction untuk operasi kritis
4. **Admin**: Endpoint admin memerlukan role validation
5. **Rate Limiting**: Pertimbangkan rate limiting untuk earn coins

## Deprecations

- Manual top-up API (pembuatan dan pengelolaan Topup Request) telah dinonaktifkan. Pembelian koin kini ditangani melalui Play Store, sedangkan backend hanya menyediakan katalog paket koin melalui endpoint `/${VERSION}/store/coins/packs`.
