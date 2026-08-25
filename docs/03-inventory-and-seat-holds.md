# Inventory va seat hold

## Invariant chong ban trung ghe

Moi cap `(show_id, seat_id)` co dung mot dong trong bang `show_seats`, duoc dam bao boi khoa chinh kep cua PostgreSQL.

Trang thai cua dong nay:

- `AVAILABLE`: co the giu
- `HELD`: dang duoc giu tam thoi
- `BOOKED`: da duoc thanh toan va xuat ve

Khi tao hold, backend:

1. khoa cac dong `show_seats` duoc chon bang `PESSIMISTIC_WRITE`
2. giai phong hold het han neu co
3. kiem tra toan bo ghe deu `AVAILABLE`
4. tao `seat_holds` voi thoi han 5 phut
5. chuyen cac ghe sang `HELD` trong cung transaction

Vi vay hai request dong thoi khong the cung giu mot ghe. Request den sau nhan `409 Conflict`.

## API demo

- `GET /api/catalog/cities`
- `GET /api/catalog/venues?cityId={cityId}`
- `GET /api/events`
- `GET /api/events/{eventId}/shows`
- `GET /api/shows/{showId}/seats`
- `POST /api/shows/{showId}/holds`

Body tao hold:

```json
{
  "seatIds": ["seat-uuid"]
}
```

`userId` la optional o giai doan nay; buoc identity/authentication se lay user tu access token thay vi request body.

## Du lieu demo

Khi database rong, backend tao mot organizer, mot event, mot show va 8 ghe tai `Saigon Convention Hall`. Du lieu nay giup trinh dien API ngay sau khi chay Docker Compose.

