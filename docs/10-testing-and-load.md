# Step 9 - Testing va load smoke

## Test hien co

- Unit test Maven: `SeatHoldServiceTest`, 2 tests passed.
- Docker smoke da bao phu catalog, search, seat hold, booking, payment,
  ticket va check-in.
- Flyway migration chay tu V1 den V6 tren PostgreSQL 16.

## Load smoke

Script `scripts/load-smoke.ps1` gui dong thoi nhieu request giu cung mot ghe
voi idempotency key khac nhau. Ket qua dat la:

- Dung 1 request `201 Created`.
- Tat ca request con lai `409 Conflict`.
- Khong co response `200` hoac `500` trong bai test tranh chap ghe.

Lan chay Docker da xac nhan voi 20 request dong thoi: `1 x 201`, `19 x 409`.

Vi du:

```powershell
.\scripts\load-smoke.ps1 `
  -ShowId "<show-uuid>" `
  -SeatId "<seat-uuid>" `
  -UserId "<user-uuid>" `
  -Requests 20
```

Script de lai mot hold thanh cong de co the kiem tra tiep booking/payment;
hold se tu het han sau 5 phut hoac co the huy trong luong cleanup sau nay.

## Gioi han MVP

Day la load smoke local, khong phai benchmark hang trieu nguoi dung. Huong
mo rong la dung k6/Gatling, PostgreSQL replica, cache doc, queue notification
va test soak tren moi truong rieng.
