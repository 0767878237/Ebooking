# Step 5 - Hold ghe va chong overselling

## Invariant

- Mot ghe cua mot show chi co mot dong trong `show_seats`.
- Trang thai ghe la `AVAILABLE`, `HELD` hoac `SOLD`.
- Ghe `HELD` phai co hold dang `ACTIVE` va chua het han.
- Moi request giu ghe khoa cac dong `show_seats` bang
  `SELECT ... FOR UPDATE` trong cung transaction.
- Ghe het han duoc giai phong ngay trong request tiep theo va boi scheduled
  job moi 30 giay.

## API

`POST /api/shows/{showId}/holds`

```json
{
  "userId": null,
  "seatIds": ["seat-uuid"]
}
```

Header `Idempotency-Key` la tuy chon. Neu gui lai cung key trong thoi gian
hold con hieu luc, API tra lai cung `holdId` va danh sach ghe thay vi tao
hold moi. Mot key da dung cho show khac se bi tu choi.

Thoi gian hold MVP la 5 phut. Token dai han va payment idempotency se duoc
ket noi tiep trong module booking/payment.

## Kiem tra

- Unit test: hold ghe available thanh cong.
- Unit test: ghe dang held bi tu choi.
- Docker/PostgreSQL: hold cung `Idempotency-Key` tra lai cung `holdId`.
- Docker/PostgreSQL: request khac giu cung ghe tra `409 Conflict`.
- Migration moi: `V3__add_hold_idempotency.sql`.
