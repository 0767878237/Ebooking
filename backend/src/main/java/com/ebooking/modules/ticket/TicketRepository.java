package com.ebooking.modules.ticket;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select ticket from Ticket ticket join fetch ticket.booking join fetch ticket.seat where ticket.ticketCode = :ticketCode")
    Optional<Ticket> lockByTicketCode(@Param("ticketCode") String ticketCode);

    List<Ticket> findByBookingIdOrderByTicketCode(UUID bookingId);
}
