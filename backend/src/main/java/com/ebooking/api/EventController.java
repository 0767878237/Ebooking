package com.ebooking.api;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.ebooking.modules.event.EventRepository;
import com.ebooking.modules.event.Show;
import com.ebooking.modules.event.ShowRepository;
import com.ebooking.shared.web.PageResponse;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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

    @GetMapping("/search")
    public PageResponse<EventSummary> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) UUID cityId,
            @RequestParam(required = false) UUID venueId,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), parseSort(sort));
        return PageResponse.from(eventRepository.findAll(eventSpecification(
                        normalize(keyword), normalize(genre), cityId, venueId, from, to),
                        pageable)
                .map(event -> new EventSummary(
                        event.getId(),
                        event.getTitle(),
                        event.getDescription(),
                        event.getCategory(),
                        event.getGenre().getSlug())));
    }

    @GetMapping("/shows")
    public PageResponse<ShowResponse> searchShows(
            @RequestParam(required = false) UUID cityId,
            @RequestParam(required = false) UUID venueId,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("startsAt").ascending());
        return PageResponse.from(showRepository.findAll(showSpecification(from, to, cityId, venueId), pageable)
                .map(show -> new ShowResponse(
                        show.getId(),
                        show.getVenue().getId(),
                        show.getVenue().getName(),
                        show.getStartsAt(),
                        show.getEndsAt())));
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

    public record EventSummary(
            UUID id,
            String title,
            String description,
            String category,
            String genre) {
    }

    public record ShowResponse(UUID id, UUID venueId, String venueName, Instant startsAt, Instant endsAt) {
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? "" : value.trim();
    }

    private static Specification<com.ebooking.modules.event.Event> eventSpecification(
            String keyword,
            String genre,
            UUID cityId,
            UUID venueId,
            Instant from,
            Instant to) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.isTrue(root.get("published")));
            predicates.add(criteriaBuilder.isNull(root.get("deletedAt")));

            if (!keyword.isBlank()) {
                String pattern = "%" + keyword.toLowerCase() + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("title")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("category")), pattern)));
            }

            if (!genre.isBlank()) {
                predicates.add(criteriaBuilder.equal(
                        criteriaBuilder.lower(root.join("genre").get("slug")),
                        genre.toLowerCase()));
            }

            if (cityId != null || venueId != null || from != null || to != null) {
                Subquery<UUID> showSubquery = query.subquery(UUID.class);
                Root<Show> showRoot = showSubquery.from(Show.class);
                List<Predicate> showPredicates = new ArrayList<>();
                showPredicates.add(criteriaBuilder.equal(showRoot.get("event"), root));
                showPredicates.add(criteriaBuilder.isNull(showRoot.get("deletedAt")));

                if (cityId != null) {
                    showPredicates.add(criteriaBuilder.equal(
                            showRoot.get("venue").get("city").get("id"), cityId));
                }
                if (venueId != null) {
                    showPredicates.add(criteriaBuilder.equal(showRoot.get("venue").get("id"), venueId));
                }
                if (from != null) {
                    showPredicates.add(criteriaBuilder.greaterThanOrEqualTo(
                            showRoot.get("startsAt"), from));
                }
                if (to != null) {
                    showPredicates.add(criteriaBuilder.lessThanOrEqualTo(
                            showRoot.get("startsAt"), to));
                }

                showSubquery.select(showRoot.get("id"))
                        .where(criteriaBuilder.and(showPredicates.toArray(new Predicate[0])));
                predicates.add(criteriaBuilder.exists(showSubquery));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static Specification<Show> showSpecification(
            Instant from,
            Instant to,
            UUID cityId,
            UUID venueId) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.isNull(root.get("deletedAt")));
            predicates.add(criteriaBuilder.isTrue(root.get("event").get("published")));
            predicates.add(criteriaBuilder.isNull(root.get("event").get("deletedAt")));

            if (cityId != null) {
                predicates.add(criteriaBuilder.equal(root.get("venue").get("city").get("id"), cityId));
            }
            if (venueId != null) {
                predicates.add(criteriaBuilder.equal(root.get("venue").get("id"), venueId));
            }
            if (from != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("startsAt"), from));
            }
            if (to != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("startsAt"), to));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static Sort parseSort(String value) {
        String[] parts = value.split(",", 2);
        String property = switch (parts[0]) {
            case "title", "createdAt" -> parts[0];
            default -> "createdAt";
        };
        Sort.Direction direction = parts.length == 2 && "asc".equalsIgnoreCase(parts[1])
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        return Sort.by(direction, property);
    }
}
