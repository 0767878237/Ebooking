package com.ebooking.modules.event;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ShowRepository extends JpaRepository<Show, UUID> {

    @Query("""
            select show
            from Show show
            join fetch show.venue
            where show.event.id = :eventId
            order by show.startsAt
            """)
    List<Show> findByEventIdOrderByStartsAtAsc(UUID eventId);
}
