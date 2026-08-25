package com.ebooking.modules.booking;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.ebooking.modules.inventory.SeatHold;
import com.ebooking.modules.event.Show;
import com.ebooking.modules.identity.UserAccount;
import com.ebooking.shared.domain.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "bookings")
public class Booking extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private UserAccount user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "show_id")
    private Show show;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hold_id")
    private SeatHold hold;

    @Enumerated(EnumType.STRING)
    private BookingStatus status;

    private BigDecimal totalAmount;
    private Instant cancelledAt;

    private Instant expiresAt;

    protected Booking() {
    }

    public Booking(UUID id, UserAccount user, Show show, SeatHold hold, BigDecimal totalAmount) {
        super(id);
        this.user = user;
        this.show = show;
        this.hold = hold;
        this.totalAmount = totalAmount;
        this.status = BookingStatus.PENDING_PAYMENT;
        this.expiresAt = Instant.now().plusSeconds(15 * 60);
    }

    public void markPaid() {
        requireStatus(BookingStatus.PENDING_PAYMENT);
        status = BookingStatus.PAID;
        expiresAt = null;
    }

    public void cancel() {
        if (status == BookingStatus.CANCELLED) {
            return;
        }
        if (status != BookingStatus.PENDING_PAYMENT && status != BookingStatus.PAID) {
            throw new IllegalStateException("Booking cannot be cancelled in its current state.");
        }
        status = BookingStatus.CANCELLED;
        cancelledAt = Instant.now();
    }

    public void expire() {
        if (status == BookingStatus.PENDING_PAYMENT) {
            status = BookingStatus.EXPIRED;
        }
    }

    private void requireStatus(BookingStatus expected) {
        if (status != expected) {
            throw new IllegalStateException("Booking is not in state " + expected + ".");
        }
    }

    public UserAccount getUser() {
        return user;
    }

    public Show getShow() {
        return show;
    }

    public SeatHold getHold() {
        return hold;
    }

    public BookingStatus getStatus() {
        return status;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
    }
}
