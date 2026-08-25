# Step 7 - Ve QR va check-in

## Phat hanh ve

- Sau khi payment thanh cong, moi `booking_item` tao mot ticket `ISSUED`.
- `ticketCode` dong vai tro QR payload MVP; database chi luu hash SHA-256.
- `GET /api/bookings/{bookingId}/tickets` tra ve ticket code, QR payload va
  trang thai ve.
- Phat hanh ticket idempotent: booking da co ticket thi khong tao trung.

## Check-in

`POST /api/checkin/scans`

```json
{
  "staffUserId": "staff-uuid",
  "qrPayload": "TKT-...",
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
