package com.ebooking.modules.event;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.domain.Specification;

public interface EventRepository extends JpaRepository<Event, UUID>, JpaSpecificationExecutor<Event> {

    @EntityGraph(attributePaths = "genre")
    Page<Event> findByPublishedTrueAndDeletedAtIsNull(Pageable pageable);

    @EntityGraph(attributePaths = "genre")
    Page<Event> findAll(Specification<Event> specification, Pageable pageable);
}
