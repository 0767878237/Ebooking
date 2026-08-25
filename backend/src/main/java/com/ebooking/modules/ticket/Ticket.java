package com.ebooking.modules.ticket;

import java.time.Instant;
import java.util.UUID;

import com.ebooking.modules.booking.Booking;
import com.ebooking.modules.catalog.VenueSeat;
import com.ebooking.shared.domain.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "tickets")
public class Ticket extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_item_seat_id")
    private VenueSeat seat;

    private String ticketCode;
    private String qrTokenHash;

    @Enumerated(EnumType.STRING)
    private TicketStatus status;

    private Instant issuedAt;
    private Instant usedAt;

    protected Ticket() {
    }

    public Ticket(
            UUID id,
            Booking booking,
            VenueSeat seat,
            String ticketCode,
            String qrTokenHash) {
        super(id);
        this.booking = booking;
        this.seat = seat;
        this.ticketCode = ticketCode;
        this.qrTokenHash = qrTokenHash;
        this.status = TicketStatus.ISSUED;
        this.issuedAt = Instant.now();
    }

    public void markUsed() {
        if (status != TicketStatus.ISSUED) {
            throw new IllegalStateException("Only an issued ticket can be used.");
        }
        status = TicketStatus.USED;
        usedAt = Instant.now();
    }

    public UUID getId() {
        return super.getId();
    }

    public Booking getBooking() {
        return booking;
    }

    public VenueSeat getSeat() {
        return seat;
    }

    public String getTicketCode() {
        return ticketCode;
    }

    public TicketStatus getStatus() {
        return status;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }

    public Instant getUsedAt() {
        return usedAt;
    }
}
