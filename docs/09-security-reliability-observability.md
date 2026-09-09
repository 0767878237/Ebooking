# Step 8 - Security, reliability va observability

## Security MVP

- Stateless security voi header `X-User-Id` de demo local map vao user trong PostgreSQL.
- Role duoc map thanh Spring authorities: `USER`, `ORGANIZER`,
  `CHECK_IN_STAFF`, `ADMIN`.
- Catalog, event search, show search va seat map la public read API.
- Admin API yeu cau `ADMIN` hoac `ORGANIZER`.
- Hold/booking yeu cau user da authenticate.
- Check-in yeu cau `CHECK_IN_STAFF` hoac `ADMIN`.
- CORS chi mo cho frontend local `localhost:3000` va `127.0.0.1:3000`.
- `GET /api/identity/demo-users` public trong MVP de frontend resolve UUID
  demo tu database local hien co; endpoint nay chi tra cac tai khoan
  `@ebooking.local`.

Header demo:

```text
X-User-Id: <user-uuid>
```

Day la co che demo cho MVP, khong phai co che dang nhap production. Huong mo rong la thay bang access token JWT/OIDC va refresh token da co schema.
Frontend Docker proxy `/api` qua backend trong Nginx, va Vite dev proxy `/api`
qua `localhost:8080`, nen browser co the goi API same-origin o `localhost:3000`.

## Reliability

- Transaction boundary bao quanh hold, booking, payment va check-in.
- `PESSIMISTIC_WRITE` khoa row inventory/ticket tai cac diem can tranh tranh
  chap.
- Idempotency key cho hold/payment.
- Scheduled release hold va expire booking moi 30 giay; request cung tu xu ly
  expiry de tranh phu thuoc hoan toan vao scheduler.
- Flyway migration fail-fast khi schema khong dong bo entity.

## Observability

- Actuator health: `/actuator/health`.
- Actuator metrics: `/actuator/metrics`.
- Prometheus exposition: `/actuator/prometheus`.
- Moi response co `X-Correlation-Id`; neu client khong gui thi backend tu tao.
- Correlation ID duoc dat vao MDC va hien trong log pattern.
- Spring Boot/Micrometer tu dong thu thap HTTP, JDBC pool, JVM, scheduler,
  repository va security metrics.

## Kiem tra

- Maven unit test: 5 tests passed.
- Public catalog API: HTTP 200 khong header.
- Admin mutation khong header: HTTP 401.
- Organizer co `X-User-Id`: admin publication va admin event list thanh cong.
- Customer goi admin endpoint: HTTP 403.
- Prometheus endpoint: HTTP 200.
- Response co correlation ID.
