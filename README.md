# E Booking

Modular monolith cho nền tảng đặt vé sự kiện.

## Da lam

- Chot pham vi va tieu chi nghiem thu
- Dung khung cong nghe ban dau: Spring Boot, PostgreSQL, React + TypeScript + Vite

## Cau truc

- `backend/`: Spring Boot 3.5.16 + Java 21
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
