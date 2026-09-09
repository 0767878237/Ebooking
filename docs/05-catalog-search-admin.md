# Step 4 - Catalog, search va admin API

## API da co

- `GET /api/catalog/cities?page=0&size=20`
- `GET /api/catalog/venues?cityId={id}&page=0&size=20`
- `GET /api/catalog/genres`
- `GET /api/catalog/genres/details`
- `GET /api/events/search`
- `GET /api/events/shows`
- `GET /api/events/{eventId}/shows`
- `GET /api/shows/{showId}/seats`

## Bo loc tim kiem su kien

`GET /api/events/search` ho tro:

- `keyword`: tim trong title, description va category.
- `genre`: loc theo slug the loai.
- `cityId`, `venueId`: loc theo dia diem cua show.
- `from`, `to`: khoang thoi gian bat dau show, dang ISO-8601 UTC.
- `page`, `size`: phan trang; size toi da 100.
- `sort`: `title,asc|desc` hoac `createdAt,asc|desc`.

Bo loc duoc tao bang JPA Specification de khong tao tham so nullable trong
JPQL, tranh loi suy luan kieu tham so cua PostgreSQL.

`GET /api/catalog/genres` tra ve danh sach ten the loai cho filter public.
`GET /api/catalog/genres/details` tra ve `id`, `name`, `slug` cho form admin
tao event, vi API ghi event can UUID `genreId` thay vi nhan display label.

## Admin API MVP

- `GET /api/admin/events`
- `POST /api/admin/cities`
- `POST /api/admin/venues`
- `POST /api/admin/genres`
- `POST /api/admin/events`
- `POST /api/admin/shows`
- `PATCH /api/admin/events/{eventId}/publication`
- `DELETE /api/admin/cities/{cityId}`
- `DELETE /api/admin/venues/{venueId}`
- `DELETE /api/admin/events/{eventId}`

Request body duoc validate bang Spring Validation. Xoa danh muc va event la
soft delete. Viec xoa show khong duoc mo trong MVP; cac rang buoc nghiep vu
khong cho sua layout hoac xoa show da phat sinh booking se duoc tiep tuc bao
ve trong module booking/admin.

`GET /api/admin/events` tra ve ca draft va published event de organizer co the
tao event -> tao show -> publish trong cung workspace. `ORGANIZER` chi thay
event cua minh; `ADMIN` thay tat ca event chua bi soft delete.

## Kiem tra da thuc hien

- Maven unit test: 5 tests passed.
- Frontend production build: Vite build thanh cong.
- Flyway: database dang o version 8.
- Docker Compose: backend health `UP`, frontend Nginx phuc vu HTTP 200.
- API demo qua `localhost:3000/api`: identity demo users, genre details,
  public events va admin events deu tra response hop le; customer vao admin
  endpoint bi 403.
