# Step 1 - Pham vi va tieu chi nghiem thu

## Muc tieu

Xay dung nen tang dat ve su kien theo kien truc modular monolith. He thong uu tien:

- day du luong nghiep vu co ban
- chong ban trung ghe
- de demo
- mo rong duoc ve sau

## Thuat ngu chuan hoa

- `event`: su kien
- `venue`: dia diem to chuc
- `show`: suat dien ra cua mot event tai mot venue
- `seat`: ghe
- `booking`: don dat ve
- `ticket`: ve so / ve QR
- `seat hold`: giu ghe co thoi han

## Vai tro

- `USER`: khach dat ve
- `ORGANIZER`: nguoi to chuc su kien
- `CHECK_IN_STAFF`: nhan vien kiem ve tai cong
- `ADMIN`: quan tri he thong

## Luong chinh

1. Dang ky / dang nhap.
2. Duyet thanh pho va venue.
3. Tim kiem event.
4. Chon show va ghe.
5. Giu ghe co thoi han.
6. Thanh toan sandbox.
7. Nhan ticket QR.
8. Xem / huy booking.
9. Quet ve tai cong.

## Quy uoc ve "modify booking"

- MVP khong lam doi ghe truc tiep.
- "Modify booking" duoc hieu la:
  1. huy booking hop le
  2. tao booking moi
- Cach nay tranh logic doi ghe va bu tien phuc tap.

## Tieu chi nghiem thu

- Khong co hai booking cung chiem mot ghe trong cung mot show.
- Ghe het han giu thi phai duoc tra lai inventory.
- Thanh toan sandbox xong moi tao ticket.
- QR ticket quet duoc o cong.
- Role co the tach view ro rang theo `USER`, `ORGANIZER`, `CHECK_IN_STAFF`, `ADMIN`.
- Kich ban huy booking phai co trang thai ro rang va khong lam mat tinh nhat quan du lieu.

