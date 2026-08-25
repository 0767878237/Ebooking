package com.ebooking.modules.booking;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingSeatRepository extends JpaRepository<BookingSeat, BookingSeatId> {

    List<BookingSeat> findByBookingIdOrderBySeatLabelSnapshot(UUID bookingId);
}
