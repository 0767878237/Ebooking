package com.ebooking.modules.payment;

import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select payment from Payment payment join fetch payment.booking where payment.id = :id")
    Optional<Payment> lockById(@Param("id") UUID id);

    Optional<Payment> findByIdempotencyKey(String idempotencyKey);

    Optional<Payment> findByBookingId(UUID bookingId);
}
