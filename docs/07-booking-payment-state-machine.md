# Step 6 - Booking va payment sandbox

## State machine MVP

### Booking

- `PENDING_PAYMENT`: booking duoc tao tu hold, cho thanh toan trong 15 phut.
- `PAID`: payment sandbox thanh cong; cac ghe chuyen `SOLD`.
- `CANCELLED`: payment bi tu choi hoac nguoi dung huy booking dang cho thanh toan.
- `EXPIRED`: booking qua han thanh toan; hold va ghe duoc giai phong.

### Payment

- `PENDING`: tao cung request thanh toan.
- `SUCCEEDED`: Fake provider chap nhan.
- `FAILED`: Fake provider tu choi.
- `CANCELLED`: danh cho cac luong huy payment sau nay.

## API

- `POST /api/bookings` tao booking tu `holdId`; user hien tai duoc lay tu authentication context.
- `GET /api/bookings/{bookingId}` xem booking va snapshot ghe.
- `POST /api/bookings/{bookingId}/payment` thanh toan sandbox.
- `POST /api/bookings/{bookingId}/cancel` huy booking dang `PENDING_PAYMENT`.

Payment request:

```json
{
  "paymentMethod": "SUCCESS"
}
```

Dung `FAIL` hoac `DECLINED` de mo phong tu choi. Header
`Idempotency-Key` giup retry payment tra lai cung payment reference.

## Invariant giao dich

- Booking chi duoc tao tu hold `ACTIVE` va khoa cac `show_seats` lien quan.
- Khi tao booking, hold chuyen `CONVERTED` de job release hold khong giai phong
  ghe dang cho thanh toan.
- Chi payment thanh cong moi goi `markSold()` tren ghe.
- Payment that bai, cancel hoac booking het han deu giai phong ghe trong cung
  transaction.
- Moi show tao qua admin tu dong clone layout ghe cua venue vao `show_seats`.

## Kiem tra

- Maven unit test: 2 tests passed.
- Docker/PostgreSQL: migration V4 va V5 thanh cong.
- Payment success: booking `PAID`, payment `SUCCEEDED`, provider
  `FAKE_SANDBOX`, amount `800000 VND`.
- Retry cung idempotency key tra cung provider reference.
- Payment fail: booking `CANCELLED`, payment `FAILED`, seat map ve
  `AVAILABLE`.
