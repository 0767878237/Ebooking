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
import jakarta.persistence.Column;

@Entity
@Table(name = "seat_holds")
public class SeatHold extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserAccount user;

    @Enumerated(EnumType.STRING)
    private SeatHoldStatus status;

    private Instant expiresAt;

    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    protected SeatHold() {
    }

    public SeatHold(UUID id, UserAccount user, Instant expiresAt) {
        this(id, user, expiresAt, null);
    }

    public SeatHold(UUID id, UserAccount user, Instant expiresAt, String idempotencyKey) {
        super(id);
        this.user = user;
        this.status = SeatHoldStatus.ACTIVE;
        this.expiresAt = expiresAt;
        this.idempotencyKey = idempotencyKey;
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

    public String getIdempotencyKey() {
        return idempotencyKey;
    }
}
