package com.ebooking.modules.inventory;

import java.time.Instant;
import java.math.BigDecimal;

import com.ebooking.modules.catalog.VenueSeat;
import com.ebooking.modules.event.Show;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "show_seats")
public class ShowSeat {

    @EmbeddedId
    private ShowSeatId id;

    @MapsId("showId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "show_id")
    private Show show;

    @MapsId("seatId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seat_id")
    private VenueSeat seat;

    @Enumerated(EnumType.STRING)
    private ShowSeatStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hold_id")
    private SeatHold hold;

    private BigDecimal price;

    @Version
    private long version;

    protected ShowSeat() {
    }

    public ShowSeat(Show show, VenueSeat seat) {
        this(show, seat, new BigDecimal("100000.00"));
    }

    public ShowSeat(Show show, VenueSeat seat, BigDecimal price) {
        this.id = new ShowSeatId(show.getId(), seat.getId());
        this.show = show;
        this.seat = seat;
        this.status = ShowSeatStatus.AVAILABLE;
        this.price = price != null ? price : new BigDecimal("100000.00");
    }

    public void releaseIfExpired(Instant now) {
        if (status == ShowSeatStatus.HELD && hold != null && hold.isExpiredAt(now)) {
            hold = null;
            status = ShowSeatStatus.AVAILABLE;
        }
    }

    public boolean isHeldByExpiredHold(Instant now) {
        return status == ShowSeatStatus.HELD && hold != null && hold.isExpiredAt(now);
    }

    public boolean isAvailable() {
        return status == ShowSeatStatus.AVAILABLE;
    }

    public void hold(SeatHold newHold) {
        this.hold = newHold;
        this.status = ShowSeatStatus.HELD;
    }

    public void markSold() {
        this.hold = null;
        this.status = ShowSeatStatus.SOLD;
    }

    public void releaseToAvailable() {
        this.hold = null;
        this.status = ShowSeatStatus.AVAILABLE;
    }

    public VenueSeat getSeat() {
        return seat;
    }

    public Show getShow() {
        return show;
    }

    public ShowSeatStatus getStatus() {
        return status;
    }

    public SeatHold getHold() {
        return hold;
    }

    public BigDecimal getPrice() {
        return price == null ? BigDecimal.ZERO : price;
    }
}
