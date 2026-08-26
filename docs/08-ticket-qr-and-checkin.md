# Step 7 - Ve QR va check-in

## Phat hanh ve

- Sau khi payment thanh cong, moi `booking_item` tao mot ticket `ISSUED`.
- `ticketCode` la public reference; QR payload duoc ky HMAC voi secret cua server
  va database chi luu SHA-256 hash cua payload.
- `GET /api/bookings/{bookingId}/tickets` tra ve ticket code, QR payload va
  trang thai ve. Khong dung rieng `ticketCode` de check-in.
- Ticket phat hanh truoc khi doi format QR can duoc phat hanh lai.
- Phat hanh ticket idempotent: booking da co ticket thi khong tao trung.

## Check-in

`POST /api/checkin/scans`

```json
{
  "qrPayload": "TKT-...<signed-payload>",
  "deviceId": "gate-01",
  "note": "main gate"
}
```

Nhan vien `CHECK_IN_STAFF` hoac `ADMIN` moi duoc quet. Ticket duoc khoa
`PESSIMISTIC_WRITE` trong transaction:

- Lan dau: `ACCEPTED`, ticket chuyen `USED`.
- Quet lai: `ALREADY_USED`.
- Ma khong ton tai: `INVALID`.
- Ve da huy: `CANCELLED`.

Moi lan quet duoc ghi vao `ticket_scans` de audit.

## Kiem tra

- Maven unit test: 2 tests passed.
- Docker/PostgreSQL: booking paid tao ticket thanh cong.
- Ticket API tra 8 ticket cho booking 8 ghe.
- Check-in lan dau tra `ACCEPTED`.
- Check-in lap lai tra `ALREADY_USED`.
