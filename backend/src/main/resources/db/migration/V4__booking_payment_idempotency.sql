ALTER TABLE payments
    ADD COLUMN idempotency_key VARCHAR(100);

ALTER TABLE bookings
    ADD COLUMN expires_at TIMESTAMPTZ;

ALTER TABLE bookings
    ADD COLUMN hold_id UUID REFERENCES seat_holds(id);

CREATE UNIQUE INDEX uq_bookings_hold_id
    ON bookings(hold_id)
    WHERE hold_id IS NOT NULL;

CREATE UNIQUE INDEX uq_payments_idempotency_key
    ON payments(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX uq_payments_booking_id
    ON payments(booking_id);

UPDATE show_seats
SET price = 100000
WHERE price = 0;
