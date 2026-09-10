package com.ebooking.modules.booking;

import java.util.UUID;

import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

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

    @Query("""
            select booking
            from Booking booking
            join fetch booking.show show
            join fetch show.event event
            join fetch show.venue venue
            left join fetch booking.hold hold
            where booking.user.id = :userId
            order by booking.createdAt desc
            """)
    java.util.List<Booking> findByUserIdDetailed(@Param("userId") UUID userId);

    Page<Booking> findByStatusAndExpiresAtLessThanEqual(
            BookingStatus status, Instant expiresAt, Pageable pageable);

    java.util.Optional<Booking> findByHoldId(UUID holdId);

    @Query("select booking from Booking booking join fetch booking.user join fetch booking.show join fetch booking.hold "
            + "where booking.id = :id and booking.user.id = :userId")
    java.util.Optional<Booking> findOwnedById(
            @Param("id") UUID id, @Param("userId") UUID userId);

    @Query("select booking from Booking booking where booking.id = :id and booking.user.id = :userId")
    java.util.Optional<Booking> findByIdAndUserId(
            @Param("id") UUID id, @Param("userId") UUID userId);
}
