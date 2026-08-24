# Step 2 - Kien truc va cong nghe

## Nguyen tac

- Modular monolith, moi nghiep vu nam trong mot backend Spring Boot.
- PostgreSQL la nguon du lieu nhat quan.
- Khong dung Redis, Kafka, Elasticsearch trong MVP.
- Mo rong sau bang phan tach module va cache / queue / search rieng.

## Stack

- Java 21
- Spring Boot 3.5.16
- Maven
- Spring Web
- Validation
- Security
- Spring Data JPA
- Flyway
- PostgreSQL
- Actuator
- OpenAPI
- React 19
- TypeScript
- Vite

## Module backend

- `identity`
- `catalog`
- `event`
- `inventory`
- `booking`
- `payment`
- `ticket`
- `checkin`
- `notification`
- `admin`

## Local dev

- `backend`: Spring Boot app
- `database`: PostgreSQL
- `frontend`: React app
- `docker-compose.yml`: run ca 3 thanh phan tren

## Van hanh toi thieu

- Actuator cung cap health va metrics.
- OpenAPI cung cap API docs cho demo.
- Cac mo-đun duoc tach ro de sau nay co the scale theo chuc nang neu can.

