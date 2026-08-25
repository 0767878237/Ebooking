package com.ebooking.modules.payment;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.ebooking.modules.booking.Booking;
import com.ebooking.shared.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "payments")
public class Payment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    private String provider;
    private String providerReference;
    private BigDecimal amount;
    private String currency;

    @Enumerated(EnumType.STRING)
    private PaymentStatus status;

    private Instant paidAt;

    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    protected Payment() {
    }

    public Payment(
            UUID id,
            Booking booking,
            String provider,
            String providerReference,
            BigDecimal amount,
            String currency,
            String idempotencyKey) {
        super(id);
        this.booking = booking;
        this.provider = provider;
        this.providerReference = providerReference;
        this.amount = amount;
        this.currency = currency;
        this.status = PaymentStatus.PENDING;
        this.idempotencyKey = idempotencyKey;
    }

    public void succeed() {
        if (status != PaymentStatus.PENDING) {
            throw new IllegalStateException("Only a pending payment can succeed.");
        }
        status = PaymentStatus.SUCCEEDED;
        paidAt = Instant.now();
    }

    public void fail() {
        if (status == PaymentStatus.PENDING) {
            status = PaymentStatus.FAILED;
        }
    }

    public void cancel() {
        if (status == PaymentStatus.PENDING) {
            status = PaymentStatus.CANCELLED;
        }
    }

    public UUID getId() {
        return super.getId();
    }

    public Booking getBooking() {
        return booking;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public String getProviderReference() {
        return providerReference;
    }

    public String getProvider() {
        return provider;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public Instant getPaidAt() {
        return paidAt;
    }
}
