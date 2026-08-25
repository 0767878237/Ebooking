package com.ebooking.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.ebooking.modules.event.EventRepository;
import com.ebooking.modules.event.ShowRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventRepository eventRepository;
    private final ShowRepository showRepository;

    public EventController(EventRepository eventRepository, ShowRepository showRepository) {
        this.eventRepository = eventRepository;
        this.showRepository = showRepository;
    }

    @GetMapping
    public List<EventResponse> findPublishedEvents() {
        return eventRepository.findByPublishedTrueOrderByCreatedAtDesc().stream()
                .map(event -> new EventResponse(
                        event.getId(),
                        event.getTitle(),
                        event.getDescription(),
                        event.getCategory(),
                        showRepository.findByEventIdOrderByStartsAtAsc(event.getId()).stream()
                                .map(show -> new ShowResponse(
                                        show.getId(),
                                        show.getVenue().getId(),
                                        show.getVenue().getName(),
                                        show.getStartsAt(),
                                        show.getEndsAt()))
                                .toList()))
                .toList();
    }

    @GetMapping("/{eventId}/shows")
    public List<ShowResponse> findShows(@PathVariable UUID eventId) {
        return showRepository.findByEventIdOrderByStartsAtAsc(eventId).stream()
                .map(show -> new ShowResponse(
                        show.getId(),
                        show.getVenue().getId(),
                        show.getVenue().getName(),
                        show.getStartsAt(),
                        show.getEndsAt()))
                .toList();
    }

    public record EventResponse(
            UUID id,
            String title,
            String description,
            String category,
            List<ShowResponse> shows) {
    }

    public record ShowResponse(UUID id, UUID venueId, String venueName, Instant startsAt, Instant endsAt) {
    }
}

