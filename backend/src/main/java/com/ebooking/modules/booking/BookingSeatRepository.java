package com.ebooking.modules.booking;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

public interface BookingSeatRepository extends JpaRepository<BookingSeat, BookingSeatId> {

    @EntityGraph(attributePaths = "seat")
    List<BookingSeat> findByBookingIdOrderBySeatLabelSnapshot(UUID bookingId);
}
