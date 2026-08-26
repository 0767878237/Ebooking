package com.ebooking.modules.catalog;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VenueSeatRepository extends JpaRepository<VenueSeat, UUID> {

    @Query("""
            select seat
            from VenueSeat seat
            join fetch seat.section section
            where seat.venue.id = :venueId
              and seat.deletedAt is null
            order by section.name, seat.rowName, seat.seatNumber
            """)
    List<VenueSeat> findByVenueIdOrderBySectionNameAscRowNameAscSeatNumberAsc(@Param("venueId") UUID venueId);
}
