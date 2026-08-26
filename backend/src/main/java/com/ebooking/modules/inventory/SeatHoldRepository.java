package com.ebooking.modules.inventory;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SeatHoldRepository extends JpaRepository<SeatHold, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select hold from SeatHold hold where hold.id = :id")
    java.util.Optional<SeatHold> lockById(@Param("id") UUID id);

    Page<SeatHold> findByStatusAndExpiresAtLessThanEqual(
            SeatHoldStatus status, java.time.Instant expiresAt, Pageable pageable);

    java.util.Optional<SeatHold> findByIdempotencyKey(String idempotencyKey);
}
