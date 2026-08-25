package com.ebooking.modules.event;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRepository extends JpaRepository<Event, UUID> {

    List<Event> findByPublishedTrueOrderByCreatedAtDesc();
}

