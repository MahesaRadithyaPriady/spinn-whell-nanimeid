# Authentication API Documentation

## Overview

The authentication system uses JWT tokens with automatic refresh functionality. Access tokens expire in 15 minutes, while refresh tokens last for 7 days. The system automatically refreshes expired access tokens using stored refresh tokens.
## Base URL
```
/{VERSION}/auth
```

Notes:
- Default `VERSION` is `v1`, so the full prefix is `/v1/auth`.
- Examples below omit the version for brevity; prepend `/{VERSION}` in your client.

## Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)",
  "id_token": "string (required)", // Google ID token
  "fingerprint_hash": "string (optional)",
  "device_info": "object (optional)"
}
```

Notes:
- Email akan diambil dari `id_token` (client tidak perlu mengirim `email`).
- Jika `fingerprint_hash` dikirim (atau dapat dibentuk dari `device_info`), server akan menyimpan ke tabel `UserDevice` **hanya sekali** berdasarkan unique key `(user_id, fingerprint_hash)`.
- Jika kombinasi `(user_id, fingerprint_hash)` sudah ada, server akan **skip** (tidak membuat/mengubah record `UserDevice`).
- Jika `fingerprint_hash` kosong/tidak dikirim tapi `device_info` ada, server akan mencoba membentuk `fingerprint_hash` dari `device_info`.

**Response (201):**
```json
{
  "message": "Register success",
  "status": 201,
  "user": {
    "id": 1,
    "userID": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "createdAt": "2025-09-08T10:00:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "error": "Username sudah digunakan",
  "status": 400
}
```

---

### 2. Login User
**POST** `/auth/login`

Authenticate user and receive access and refresh tokens.

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)",
  "fingerprint_hash": "string (optional)",
  "device_info": "object (optional)"
}
```

Notes:
- Jika `fingerprint_hash` dikirim (atau dapat dibentuk dari `device_info`), server akan menyimpan ke tabel `UserDevice` **hanya sekali** berdasarkan unique key `(user_id, fingerprint_hash)`.
- Jika kombinasi `(user_id, fingerprint_hash)` sudah ada, server akan **skip** (tidak membuat/mengubah record `UserDevice`).
- Jika `fingerprint_hash` kosong/tidak dikirim tapi `device_info` ada, server akan mencoba membentuk `fingerprint_hash` dari `device_info`.

**Response (200):**
```json
{
  "message": "Login success",
  "status": 200,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Access token (15 min)
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Refresh token (7 days)
  "user": {
    "id": 1,
    "userID": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

**Error Response (401):**
```json
{
  "error": "Username atau password salah",
  "status": 401
}
```

---

### 3. Refresh Access Token
**POST** `/auth/refresh-token`

Get a new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "string (required)"
}
```

**Response (200):**
```json
{
  "message": "Token refreshed successfully",
  "status": 200,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // New access token
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

**Error Response (401):**
```json
{
  "error": "Invalid refresh token",
  "status": 401
}
```

---

### 4. Logout User
**POST** `/auth/logout`

Invalidate user tokens and logout.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Logout berhasil",
  "status": 200
}
```

**Error Response (401):**
```json
{
  "message": "Unauthorized",
  "status": 401
}
```

---

### 5. Get Current User
**GET** `/auth/me`

Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Authenticated",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "type": "access"
  }
}
```

---

### 6. Change Password
**POST** `/auth/change-password`

Change user password (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "old_password": "string (required)",
  "new_password": "string (required, min 6 characters)"
}
```

**Response (200):**
```json
{
  "message": "Password berhasil diubah",
  "status": 200
}
```

**Error Response (400):**
```json
{
  "message": "Password lama salah",
  "status": 400
}
```

---

### 7. Verify Signature
**POST** `/auth/verify/signature`

Verify client signature against stored SHA1 signatures.

**Request Body:**
```json
{
  "signature": "string (required)" // SHA1 signature from client
}
```

**Response (200) - Valid Signature:**
```json
{
  "message": "Signature valid",
  "status": 200,
  "verified": true
}
```

**Response (403) - Invalid Signature:**
```json
{
  "message": "AKSES DIBLOKIR: Signature tidak valid atau tidak diizinkan",
  "status": 403,
  "code": "SIGNATURE_BLOCKED"
}
```

**Response (400) - Missing Signature:**
```json
{
  "message": "Signature wajib diisi",
  "status": 400
}
```

**Response (500) - Configuration Error:**
```json
{
  "message": "Konfigurasi signature tidak ditemukan",
  "status": 500
}
```

---

## Google Authentication Endpoints

### 8. Google Sign-In Verify
**POST** `/auth/google/verify`

Verify Google ID token and issue JWT.

**Request Body:**
```json
{
  "id_token": "string (required)", // Google ID token
  "fingerprint_hash": "string (optional)",
  "device_info": "object (optional)"
}
```

Notes:
- Jika `fingerprint_hash` dikirim (atau dapat dibentuk dari `device_info`), server akan menyimpan ke tabel `UserDevice` **hanya sekali** berdasarkan unique key `(user_id, fingerprint_hash)`.
- Jika kombinasi `(user_id, fingerprint_hash)` sudah ada, server akan **skip** (tidak membuat/mengubah record `UserDevice`).
- Jika `fingerprint_hash` kosong/tidak dikirim tapi `device_info` ada, server akan mencoba membentuk `fingerprint_hash` dari `device_info`.

### 9. Bind Google Account
**POST** `/auth/google/bind`

Bind Google account to existing user (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

### 10. Unbind Google Account
**POST** `/auth/google/unbind`

Unbind Google account from user (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

### 11. Reset Password via Google Sign-In
**POST** `/auth/password/reset/google`

Reset password using a valid Google `id_token`. The email from the token must already exist in the database.

**Request Body:**
```json
{
  "id_token": "string (required)",
  "new_password": "string (required, min 6 characters)"
}
```

**Response (200):**
```json
{
  "message": "Password berhasil direset. Silakan login ulang.",
  "status": 200
}
```

**Error Response (404):**
```json
{
  "message": "Email tidak terdaftar",
  "status": 404
}
```

**Error Response (400):**
```json
{
  "message": "id_token wajib diisi | new_password wajib diisi | Password baru minimal 6 karakter",
  "status": 400
}
```

**Notes:**
- Email in the Google `id_token` must be verified by Google.
- If the email from `id_token` does not exist in `User`, reset is rejected (404).
- On success, all existing tokens are invalidated; the user must log in again.

### Response Headers
When an access token is automatically refreshed, the server returns:
```
X-New-Access-Token: <new_access_token>
```

Clients should check for this header and update their stored access token.

---

## Error Codes

| Code | Description |
|------|-------------|
| `TOKEN_REFRESH_FAILED` | Token expired and refresh failed |
| `INVALID_TOKEN` | Token is invalid or malformed |
| `TOKEN_REVOKED` | Token was revoked or doesn't exist in database |
| `AUTH_ERROR` | Internal authentication error |
| `SIGNATURE_BLOCKED` | Client signature is invalid or blocked |

---

## Token Management

### Access Token
- **Expiration:** 15 minutes
- **Usage:** Include in Authorization header for API requests
- **Auto-refresh:** Automatically refreshed by middleware when expired

### Refresh Token
- **Expiration:** 7 days  
- **Usage:** Used to get new access tokens
- **Storage:** Stored securely in database

### Token Invalidation
Tokens are invalidated when:
- User logs out
- User changes password
- Refresh token expires
- Manual revocation by admin

---

## Security Notes

1. **Store tokens securely** - Never store in localStorage for production
2. **Check X-New-Access-Token header** - Update access token when received
3. **Handle token expiration** - Implement proper error handling for expired tokens
4. **Use HTTPS** - Always use HTTPS in production
5. **Validate on server** - All tokens are validated against database records
