package com.ebooking.modules.inventory;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShowSeatRepository extends JpaRepository<ShowSeat, ShowSeatId> {

    @Query("""
            select showSeat
            from ShowSeat showSeat
            join fetch showSeat.seat seat
            join fetch seat.section
            left join fetch showSeat.hold
            where showSeat.show.id = :showId
              and showSeat.show.deletedAt is null
            order by seat.section.name, seat.rowName, seat.seatNumber
            """)
    List<ShowSeat> findSeatMapByShowId(@Param("showId") UUID showId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select showSeat
            from ShowSeat showSeat
            join fetch showSeat.seat seat
            join fetch seat.section
            left join fetch showSeat.hold
            where showSeat.show.id = :showId
              and seat.id in :seatIds
            order by seat.id
            """)
    List<ShowSeat> lockByShowIdAndSeatIds(
            @Param("showId") UUID showId,
            @Param("seatIds") Collection<UUID> seatIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select showSeat
            from ShowSeat showSeat
            join fetch showSeat.show show
            join fetch show.event
            join fetch show.venue
            join fetch showSeat.seat seat
            join fetch seat.section
            join fetch showSeat.hold
            where showSeat.hold.id = :holdId
            order by seat.id
            """)
    List<ShowSeat> lockByHoldId(@Param("holdId") UUID holdId);
}
