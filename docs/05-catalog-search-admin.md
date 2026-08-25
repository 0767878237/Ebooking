# Step 4 - Catalog, search va admin API

## API da co

- `GET /api/catalog/cities?page=0&size=20`
- `GET /api/catalog/venues?cityId={id}&page=0&size=20`
- `GET /api/catalog/genres`
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

## Admin API MVP

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

## Kiem tra da thuc hien

- Maven unit test: 2 tests passed.
- Flyway: database dang o version 2.
- Docker Compose: backend health `UP`.
- API demo: city, venue, genre, event search, show search va seat map deu tra
  response phan trang/danh sach hop le.
