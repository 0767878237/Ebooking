package com.ebooking.modules.event;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.Query;

public interface ShowRepository extends JpaRepository<Show, UUID>, JpaSpecificationExecutor<Show> {

    @Query("""
            select show
            from Show show
            join fetch show.venue
            where show.event.id = :eventId
            order by show.startsAt
            """)
    List<Show> findByEventIdOrderByStartsAtAsc(UUID eventId);

    @EntityGraph(attributePaths = {"event", "venue"})
    Page<Show> findAll(Specification<Show> specification, Pageable pageable);
}
