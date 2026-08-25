package com.ebooking.modules.booking;

import java.util.UUID;

import java.time.Instant;
import java.util.List;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select booking
            from Booking booking
            join fetch booking.user
            join fetch booking.show
            join fetch booking.hold
            where booking.id = :id
            """)
    java.util.Optional<Booking> lockById(@Param("id") UUID id);

    java.util.List<Booking> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<Booking> findByStatusAndExpiresAtLessThanEqual(BookingStatus status, Instant expiresAt);

    java.util.Optional<Booking> findByHoldId(UUID holdId);
}
