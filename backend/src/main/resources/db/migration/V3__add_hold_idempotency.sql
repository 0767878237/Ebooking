ALTER TABLE seat_holds
    ADD COLUMN idempotency_key VARCHAR(100);

CREATE UNIQUE INDEX uq_seat_holds_idempotency_key
    ON seat_holds(idempotency_key)
    WHERE idempotency_key IS NOT NULL;
