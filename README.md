# E Booking

Modular monolith cho nền tảng đặt vé sự kiện.

## Da lam

- Chot pham vi va tieu chi nghiem thu
- Dung khung cong nghe ban dau: Spring Boot, PostgreSQL, React + TypeScript + Vite

## Cau truc

- `backend/`: Spring Boot 3.5.16 + Java 25
- `frontend/`: React 19 + Vite + TypeScript
- `docs/`: mo ta pham vi, luong nghiep vu, kien truc
- `docker-compose.yml`: chay local voi backend, PostgreSQL va frontend

## Chay nhanh

```bash
docker compose up --build
```

Hoac chay rieng:

```bash
cd backend && mvn spring-boot:run
cd frontend && npm install && npm run dev
```

## API demo

- Web: `http://localhost:3000`
- API health: `http://localhost:8080/actuator/health`
- OpenAPI: `http://localhost:8080/swagger-ui.html`
- Seat hold flow: `docs/03-inventory-and-seat-holds.md`
- Data model and migrations: `docs/04-data-model-and-migrations.md`
- Catalog, search and admin APIs: `docs/05-catalog-search-admin.md`
- Seat hold and overselling protection: `docs/06-seat-hold-and-overselling.md`
- Booking and payment state machine: `docs/07-booking-payment-state-machine.md`
- Ticket QR and check-in: `docs/08-ticket-qr-and-checkin.md`
- Security, reliability and observability: `docs/09-security-reliability-observability.md`
- Testing and load smoke: `docs/10-testing-and-load.md`
