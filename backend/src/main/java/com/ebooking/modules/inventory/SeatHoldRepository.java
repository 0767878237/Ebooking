package com.ebooking.modules.inventory;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SeatHoldRepository extends JpaRepository<SeatHold, UUID> {

    java.util.List<SeatHold> findByStatusAndExpiresAtLessThanEqual(
            SeatHoldStatus status,
            java.time.Instant expiresAt);

    java.util.Optional<SeatHold> findByIdempotencyKey(String idempotencyKey);
}
