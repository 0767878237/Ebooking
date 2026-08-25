package com.ebooking.modules.inventory;

import java.time.Instant;
import java.util.UUID;

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
@Table(name = "seat_holds")
public class SeatHold extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserAccount user;

    @Enumerated(EnumType.STRING)
    private SeatHoldStatus status;

    private Instant expiresAt;

    protected SeatHold() {
    }

    public SeatHold(UUID id, UserAccount user, Instant expiresAt) {
        super(id);
        this.user = user;
        this.status = SeatHoldStatus.ACTIVE;
        this.expiresAt = expiresAt;
    }

    public boolean isExpiredAt(Instant now) {
        return status == SeatHoldStatus.ACTIVE && !expiresAt.isAfter(now);
    }

    public void expire() {
        this.status = SeatHoldStatus.EXPIRED;
    }

    public UUID getId() {
        return super.getId();
    }

    public SeatHoldStatus getStatus() {
        return status;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }
}

