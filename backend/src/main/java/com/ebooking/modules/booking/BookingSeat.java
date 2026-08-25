package com.ebooking.modules.booking;

import java.math.BigDecimal;

import com.ebooking.modules.catalog.VenueSeat;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;

@Entity
@Table(name = "booking_items")
public class BookingSeat {

    @EmbeddedId
    private BookingSeatId id;

    @MapsId("bookingId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @MapsId("seatId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seat_id")
    private VenueSeat seat;

    private BigDecimal price;

    protected BookingSeat() {
    }

    public BookingSeat(Booking booking, VenueSeat seat, BigDecimal price) {
        this.id = new BookingSeatId(booking.getId(), seat.getId());
        this.booking = booking;
        this.seat = seat;
        this.price = price;
    }
}
