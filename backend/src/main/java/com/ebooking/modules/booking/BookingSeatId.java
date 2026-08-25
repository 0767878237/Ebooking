package com.ebooking.modules.booking;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Embeddable;

@Embeddable
public class BookingSeatId implements Serializable {

    private UUID bookingId;
    private UUID seatId;

    protected BookingSeatId() {
    }

    public BookingSeatId(UUID bookingId, UUID seatId) {
        this.bookingId = bookingId;
        this.seatId = seatId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof BookingSeatId that)) {
            return false;
        }
        return Objects.equals(bookingId, that.bookingId) && Objects.equals(seatId, that.seatId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(bookingId, seatId);
    }
}

