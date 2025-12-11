# ADMS Server API

ADMS Server adalah middleware komunikasi antara mesin fingerprint
**ZKTeco (Solution)** dan server aplikasi menggunakan mekanisme **push &
pull**. Server ini mengelola registrasi perangkat, penarikan log,
pengiriman command, autentikasi, serta integrasi webhook otomatis.

---

# 1. Webhook & Signature Security

Setiap data attendance yang masuk akan dikirim ke webhook tujuan.

Format body:

```json
{
  "sn": "NJF72417xxxx",
  "timestamp": "2025-12-04 17:06:47",
  "user_id": "1234567890",
  "verify": 1,
  "status": 4,
  "workcode": 0
}
```

Setiap request webhook di sertakan di header :

```
x-adms-signature: sha256(timestamp + secret)
x-adms-timestamp: 1733300000
```

---

# 2. Instalasi

```sh
git clone https://github.com/sejator/adms-server.git
cd adms-server
npm install
```

Environment:\
Rename file `.env.example` menjadi `.env` dan sesuaikan

```env
DATABASE_URL="postgresql://postgres:@localhost:5432/adms_api?schema=public"
JWT_SECRET="xxx"
JWT_EXPIRES=3600
JWT_REFRESH_SECRET="xxx"
JWT_REFRESH_EXPIRES=31536000
```

Jalankan:

```
npm run start:dev
```

---

# 3. Referensi API Lengkap

# 3.1 Auth Endpoints

## POST /auth/register

Membuat akun admin.

Body:

```json
{
  "name": "Sejator Dev",
  "email": "admin@gmail.com",
  "password": "123456"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "admin@gmail.com"
  }
}
```

---

## POST /auth/login

```json
{
  "email": "admin@gmail.com",
  "password": "123456"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 3600
  }
}
```

---

## POST /auth/refresh

```json
{
  "refresh_token": "xxx"
}
```

---

## GET /auth/profile (Bearer Token)

# 3.2 Users Endpoints

## GET /users

## GET /users/:id

## POST /users

## PUT /users/:id

## DELETE /users/:id

Contoh create:

```json
{
  "name": "Administrator",
  "email": "admin@example.com",
  "password": "123456"
}
```

---

# 3.3 Devices Endpoints

### Device attributes:

- serial_number
- location
- webhook_url (bisa lebih dari satu pisahkan dengan tanda koma)
- delay (detik)
- error_delay

## GET /devices

## GET /devices/:id

## POST /devices

## PUT /devices/:id

## DELETE /devices/:id

Contoh body create:

```json
{
  "serial_number": "NJF72417xxxx",
  "location": "Kantor Pusat",
  "webhook_url": "https://webhook.com/attendance"
}
```

---

# 3.4 Commands (Device Control)

Semua command dikirim oleh device menggunakan header:

    x-public-key: <public_key>

## Format umum body command:

```json
{
  "type": "<command_name>"
}
```

---

### Daftar Semua Command:

Command Type Deskripsi

---

- `check` Cek status server
- `reset` Reset dan kirim ulang semua log
- `info` Info device
- `log` Minta log terbaru
- `reboot` Reboot device
- `reload` Reload configuration
- `set.timezone` Atur timezone
- `set.volume` Atur volume
- `set.language` Atur bahasa
- `user.info` Ambil info user
- `user.edit` Edit user
- `user.delete` Hapus user
- `user.clone` Clone user ke banyak device
- `user.move` Pindahkan user ke device lain
- `attendance.download` Download log range tanggal
- `attendance.verify` Verifikasi log oleh device
- `attendance.clear` Clear log device
- `command.system` Eksekusi perintah OS (hat-hati menggunakan ini)

---

## Contoh Command

### Set Timezone

```json
{
  "type": "set.timezone",
  "timezone": "7"
}
```

### User Edit

```json
{
  "type": "user.edit",
  "user_id": "125010xxx",
  "name": "Sejator Dev",
  "privilege": 14,
  "password": 1234
}
```

### Attendance Download

```json
{
  "type": "attendance.download",
  "start_date": "2025-12-04",
  "end_date": "2025-12-10"
}
```

---

# 4. Dokumentasi

- Postman Collection: [https://documenter.getpostman.com/view/20500330/2sB3dPQp8E](https://documenter.getpostman.com/view/20500330/2sB3dPQp8E)
- Verifikasi webhook NodeJS : [https://gist.github.com/sejator/e6892e8cdfbf726652f2ba7fa66201ab](https://gist.github.com/sejator/e6892e8cdfbf726652f2ba7fa66201ab)
- Verifikasi webhook PHP : [https://gist.github.com/sejator/849e410b4534db6d807d699d4d3ad866](https://gist.github.com/sejator/849e410b4534db6d807d699d4d3ad866)

# 5. Kontak & Dukungan

Maintainer: [@sejator](https://github.com/sejator)\
Email: [sejatordev@gmail.com](sejatordev@gmail.com)\
Website: [https://alkhatech.com](https://alkhatech.com)\
Donasi: [https://saweria.co/sejator](https://saweria.co/sejator)
