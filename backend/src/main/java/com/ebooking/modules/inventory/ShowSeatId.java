package com.ebooking.modules.inventory;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Embeddable;

@Embeddable
public class ShowSeatId implements Serializable {

    private UUID showId;
    private UUID seatId;

    protected ShowSeatId() {
    }

    public ShowSeatId(UUID showId, UUID seatId) {
        this.showId = showId;
        this.seatId = seatId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof ShowSeatId that)) {
            return false;
        }
        return Objects.equals(showId, that.showId) && Objects.equals(seatId, that.seatId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(showId, seatId);
    }
}

