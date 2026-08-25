package com.ebooking.modules.booking;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

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

    @Enumerated(EnumType.STRING)
    private BookingStatus status;

    private BigDecimal totalAmount;
    private Instant cancelledAt;

    protected Booking() {
    }

    public Booking(UUID id, UserAccount user, Show show, BigDecimal totalAmount) {
        super(id);
        this.user = user;
        this.show = show;
        this.totalAmount = totalAmount;
        this.status = BookingStatus.PENDING_PAYMENT;
    }
}

