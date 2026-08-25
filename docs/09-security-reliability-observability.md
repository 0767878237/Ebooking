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

Header demo:

```text
X-User-Id: <user-uuid>
```

Day la co che demo cho MVP, khong phai co che dang nhap production. Huong mo rong la thay bang access token JWT/OIDC va refresh token da co schema.

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

- Maven unit test: 2 tests passed.
- Public catalog API: HTTP 200 khong header.
- Admin mutation khong header: HTTP 401.
- Organizer co `X-User-Id`: admin show creation thanh cong.
- Prometheus endpoint: HTTP 200.
- Response co correlation ID.
