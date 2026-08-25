# Step 3 - Mo hinh du lieu va migration

## Nguyen tac du lieu

- PostgreSQL la nguon du lieu nhat quan.
- Tien dung `NUMERIC(12, 2)`.
- Thoi gian dung `TIMESTAMPTZ`, luu va trao doi theo UTC.
- Entity nghiep vu co `created_at`, `updated_at`, `version`.
- Danh muc co lich su dung `deleted_at` de soft delete.
- Moi cap `(show_id, seat_id)` duy nhat trong `show_seats`.

## Bang chinh

- Identity: `users`, `roles`, `user_roles`, `refresh_tokens`
- Catalog: `cities`, `venues`, `venue_sections`, `seats`, `genres`
- Event: `events`, `shows`
- Inventory: `show_seats`, `seat_holds`
- Booking: `bookings`, `booking_items`
- Payment: `payments`
- Ticket: `tickets`, `ticket_scans`
- Operations: `audit_logs`

## Migration history

- `V1__create_core_schema.sql`: schema demo ban dau cho catalog, event, inventory va booking.
- `V2__complete_booking_domain_schema.sql`: chuan hoa schema theo requirement tuan 2, doi `venue_seats` thanh `seats`, doi `booking_seats` thanh `booking_items`, bo sung role, genre, payment, ticket, refresh token, audit log, snapshot va index.

Khong sua migration da chay. Migration moi duoc them theo thu tu Flyway de database local va moi truong sau nay co lich su ro rang.

## Tim kiem

MVP dung PostgreSQL, khong dung Elasticsearch. Da bat `pg_trgm` va tao GIN index cho ten event, mo ta event, ten venue va dia chi venue. Dong thoi co full-text index cho title/description event.

## Bao ve inventory

`show_seats` dung trang thai `AVAILABLE`, `HELD`, `SOLD`, co `hold_id`, token hash, user giu, thoi diem het han va gia tai thoi diem show. Unique key `(show_id, seat_id)` la lop bao ve cuoi cung cho invariant khong ban trung ghe.

