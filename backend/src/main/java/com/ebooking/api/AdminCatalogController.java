package com.ebooking.api;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import com.ebooking.config.CurrentUserService;
import com.ebooking.modules.catalog.City;
import com.ebooking.modules.catalog.CityRepository;
import com.ebooking.modules.catalog.Venue;
import com.ebooking.modules.catalog.VenueRepository;
import com.ebooking.modules.catalog.VenueSeat;
import com.ebooking.modules.catalog.VenueSeatRepository;
import com.ebooking.modules.catalog.VenueSection;
import com.ebooking.modules.catalog.VenueSectionRepository;
import com.ebooking.modules.identity.UserAccount;
import com.ebooking.modules.event.Event;
import com.ebooking.modules.event.EventRepository;
import com.ebooking.modules.event.Genre;
import com.ebooking.modules.event.GenreRepository;
import com.ebooking.modules.event.Show;
import com.ebooking.modules.event.ShowRepository;
import com.ebooking.modules.identity.UserRole;
import com.ebooking.modules.identity.UserAccountRepository;
import com.ebooking.modules.inventory.ShowSeat;
import com.ebooking.modules.inventory.ShowSeatRepository;
import com.ebooking.shared.web.NotFoundException;
import com.ebooking.shared.web.PageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/admin")
public class AdminCatalogController {

    private final CityRepository cityRepository;
    private final VenueRepository venueRepository;
    private final GenreRepository genreRepository;
    private final EventRepository eventRepository;
    private final ShowRepository showRepository;
    private final UserAccountRepository userAccountRepository;
    private final VenueSeatRepository venueSeatRepository;
    private final VenueSectionRepository venueSectionRepository;
    private final ShowSeatRepository showSeatRepository;
    private final CurrentUserService currentUserService;

    public AdminCatalogController(
            CityRepository cityRepository,
            VenueRepository venueRepository,
            GenreRepository genreRepository,
            EventRepository eventRepository,
            ShowRepository showRepository,
            UserAccountRepository userAccountRepository,
            VenueSeatRepository venueSeatRepository,
            VenueSectionRepository venueSectionRepository,
            ShowSeatRepository showSeatRepository,
            CurrentUserService currentUserService) {
        this.cityRepository = cityRepository;
        this.venueRepository = venueRepository;
        this.genreRepository = genreRepository;
        this.eventRepository = eventRepository;
        this.showRepository = showRepository;
        this.userAccountRepository = userAccountRepository;
        this.venueSeatRepository = venueSeatRepository;
        this.venueSectionRepository = venueSectionRepository;
        this.showSeatRepository = showSeatRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/events")
    public PageResponse<AdminEventResponse> events(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("createdAt").descending());
        var eventPage = eventRepository.findByDeletedAtIsNull(pageable);
        List<UUID> eventIds = eventPage.getContent().stream().map(Event::getId).toList();
        Map<UUID, List<AdminShowSummary>> showsByEvent = eventIds.isEmpty()
                ? Map.of()
                : showRepository.findByEventIdInAndDeletedAtIsNullOrderByEventIdAscStartsAtAsc(eventIds).stream()
                        .map(show -> Map.entry(show.getEvent().getId(), new AdminShowSummary(
                                show.getId(),
                                show.getVenue().getId(),
                                show.getVenue().getName(),
                                show.getStartsAt(),
                                show.getEndsAt())))
                        .collect(java.util.stream.Collectors.groupingBy(
                                Map.Entry::getKey,
                                java.util.LinkedHashMap::new,
                                java.util.stream.Collectors.mapping(
                                        Map.Entry::getValue,
                                        java.util.stream.Collectors.toList())));

        return PageResponse.from(eventPage.map(event -> new AdminEventResponse(
                event.getId(),
                event.getTitle(),
                event.getDescription(),
                event.getCategory(),
                event.isPublished(),
                showsByEvent.getOrDefault(event.getId(), List.of()))));
    }

    @PostMapping("/cities")
    @ResponseStatus(HttpStatus.CREATED)
    public CityResponse createCity(@Valid @RequestBody CityRequest request) {
        City city = cityRepository.save(new City(UUID.randomUUID(), request.name().trim()));
        return new CityResponse(city.getId(), city.getName());
    }

    @PostMapping("/venues")
    @ResponseStatus(HttpStatus.CREATED)
    public VenueResponse createVenue(@Valid @RequestBody VenueRequest request) {
        City city = cityRepository.findById(request.cityId())
                .orElseThrow(() -> new NotFoundException("City was not found."));
        if (city.getDeletedAt() != null) {
            throw new NotFoundException("City was not found.");
        }
        Venue venue = venueRepository.save(new Venue(
                UUID.randomUUID(),
                city,
                request.name().trim(),
                request.address().trim()));
        return new VenueResponse(venue.getId(), city.getId(), venue.getName(), venue.getAddress());
    }

    @PostMapping("/genres")
    @ResponseStatus(HttpStatus.CREATED)
    public GenreResponse createGenre(@Valid @RequestBody GenreRequest request) {
        Genre genre = genreRepository.save(new Genre(
                UUID.randomUUID(),
                request.name().trim(),
                request.slug().trim().toLowerCase()));
        return new GenreResponse(genre.getId(), genre.getName(), genre.getSlug());
    }

    @PostMapping("/events")
    @ResponseStatus(HttpStatus.CREATED)
    public EventResponse createEvent(@Valid @RequestBody EventRequest request) {
        var organizer = userAccountRepository.findById(currentUserService.requireUserId())
                .orElseThrow(() -> new NotFoundException("Organizer was not found."));
        Genre genre = genreRepository.findById(request.genreId())
                .orElseThrow(() -> new NotFoundException("Genre was not found."));
        Event event = eventRepository.save(new Event(
                UUID.randomUUID(),
                organizer,
                genre,
                request.title().trim(),
                request.description().trim(),
                genre.getName(),
                false));
        return new EventResponse(event.getId(), event.getTitle(), event.isPublished());
    }

    @PostMapping("/shows")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ShowResponse createShow(@Valid @RequestBody ShowRequest request) {
        Event event = eventRepository.findById(request.eventId())
                .orElseThrow(() -> new NotFoundException("Event was not found."));
        Venue venue = venueRepository.findById(request.venueId())
                .orElseThrow(() -> new NotFoundException("Venue was not found."));
        if (event.getDeletedAt() != null || venue.getDeletedAt() != null) {
            throw new NotFoundException("Event or venue was not found.");
        }
        if (!request.endsAt().isAfter(request.startsAt())) {
            throw new IllegalArgumentException("Show end time must be after start time.");
        }
        Show show = showRepository.save(new Show(
                UUID.randomUUID(),
                event,
                venue,
                request.startsAt(),
                request.endsAt()));
        showSeatRepository.saveAll(venueSeatRepository
                .findByVenueIdOrderBySectionNameAscRowNameAscSeatNumberAsc(venue.getId())
                .stream()
                .map(seat -> new ShowSeat(show, seat))
                .toList());
        return new ShowResponse(show.getId(), event.getId(), venue.getId(), show.getStartsAt(), show.getEndsAt());
    }

    @PatchMapping("/events/{eventId}/publication")
    @Transactional
    public EventResponse changePublication(
            @PathVariable UUID eventId,
            @Valid @RequestBody PublicationRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Event was not found."));
        event.setPublished(request.published());
        return new EventResponse(event.getId(), event.getTitle(), event.isPublished());
    }

    @DeleteMapping("/cities/{cityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteCity(@PathVariable UUID cityId) {
        cityRepository.findById(cityId)
                .orElseThrow(() -> new NotFoundException("City was not found."))
                .softDelete();
    }

    @DeleteMapping("/venues/{venueId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteVenue(@PathVariable UUID venueId) {
        venueRepository.findById(venueId)
                .orElseThrow(() -> new NotFoundException("Venue was not found."))
                .softDelete();
    }

    @DeleteMapping("/events/{eventId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteEvent(@PathVariable UUID eventId) {
        eventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Event was not found."))
                .softDelete();
    }

    @PostMapping("/events/quick-create")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public AdminEventResponse quickCreateEvent(@Valid @RequestBody QuickCreateEventRequest request) {
        UserAccount admin = userAccountRepository.findById(currentUserService.requireUserId())
                .orElseThrow(() -> new NotFoundException("Admin user not found."));

        // 1. Resolve Genre
        Genre genre = null;
        if (request.genreId() != null) {
            genre = genreRepository.findById(request.genreId()).orElse(null);
        }
        if (genre == null && request.genreName() != null && !request.genreName().isBlank()) {
            String gName = request.genreName().trim();
            genre = genreRepository.findByNameIgnoreCase(gName).orElseGet(() -> {
                String slug = gName.toLowerCase(Locale.ROOT).replaceAll("\\s+", "-");
                return genreRepository.save(new Genre(UUID.randomUUID(), gName, slug));
            });
        }
        if (genre == null) {
            genre = genreRepository.findAll().stream().findFirst()
                    .orElseGet(() -> genreRepository.save(new Genre(UUID.randomUUID(), "Sự kiện", "su-kien")));
        }

        // 2. Resolve City
        City city = null;
        if (request.cityId() != null) {
            city = cityRepository.findById(request.cityId()).orElse(null);
        }
        if (city == null && request.cityName() != null && !request.cityName().isBlank()) {
            String cName = request.cityName().trim();
            city = cityRepository.findByNameIgnoreCase(cName).orElseGet(() ->
                cityRepository.save(new City(UUID.randomUUID(), cName))
            );
        }
        if (city == null) {
            city = cityRepository.findAll().stream().findFirst()
                    .orElseGet(() -> cityRepository.save(new City(UUID.randomUUID(), "Hồ Chí Minh")));
        }

        // 3. Resolve Venue
        final City venueCity = city;
        Venue venue = null;
        if (request.venueId() != null) {
            venue = venueRepository.findById(request.venueId()).orElse(null);
        }
        if (venue == null && request.venueName() != null && !request.venueName().isBlank()) {
            String vName = request.venueName().trim();
            String address = request.venueAddress() != null && !request.venueAddress().isBlank()
                    ? request.venueAddress().trim()
                    : "Trung tâm";
            venue = venueRepository.save(new Venue(UUID.randomUUID(), venueCity, vName, address));
        }
        if (venue == null) {
            venue = venueRepository.findAll().stream().findFirst()
                    .orElseGet(() -> venueRepository.save(new Venue(UUID.randomUUID(), venueCity, "Trung tâm biểu diễn", "Trung tâm")));
        }

        // 4. Ensure Venue has sections & seats for SUPER VIP, VIP, NORMAL
        List<VenueSeat> venueSeats = venueSeatRepository
                .findByVenueIdOrderBySectionNameAscRowNameAscSeatNumberAsc(venue.getId());
        if (venueSeats.isEmpty()) {
            VenueSection superVipSection = venueSectionRepository.save(new VenueSection(UUID.randomUUID(), venue, "SUPER VIP"));
            VenueSection vipSection = venueSectionRepository.save(new VenueSection(UUID.randomUUID(), venue, "VIP"));
            VenueSection normalSection = venueSectionRepository.save(new VenueSection(UUID.randomUUID(), venue, "NORMAL"));

            List<VenueSeat> generatedSeats = new ArrayList<>();
            // Row A: SUPER VIP (seats 1..6)
            for (int i = 1; i <= 6; i++) {
                generatedSeats.add(new VenueSeat(UUID.randomUUID(), venue, superVipSection, "A", i));
            }
            // Row B: VIP (seats 1..6)
            for (int i = 1; i <= 6; i++) {
                generatedSeats.add(new VenueSeat(UUID.randomUUID(), venue, vipSection, "B", i));
            }
            // Rows C & D: NORMAL (seats 1..6 each)
            for (int i = 1; i <= 6; i++) {
                generatedSeats.add(new VenueSeat(UUID.randomUUID(), venue, normalSection, "C", i));
            }
            for (int i = 1; i <= 6; i++) {
                generatedSeats.add(new VenueSeat(UUID.randomUUID(), venue, normalSection, "D", i));
            }
            venueSeats = venueSeatRepository.saveAll(generatedSeats);
        }

        // 5. Create Event
        Event event = eventRepository.save(new Event(
                UUID.randomUUID(),
                admin,
                genre,
                request.title().trim(),
                request.description().trim(),
                genre.getName(),
                request.published()));

        // 6. Validate dates
        Instant startsAt = request.startsAt();
        Instant endsAt = request.endsAt();
        if (!endsAt.isAfter(startsAt)) {
            endsAt = startsAt.plusSeconds(3 * 3600);
        }

        // 7. Create Show
        Show show = showRepository.save(new Show(UUID.randomUUID(), event, venue, startsAt, endsAt));

        // 8. Generate ShowSeats with Tiered Pricing
        BigDecimal superVipPrice = request.superVipPrice() != null ? request.superVipPrice() : new BigDecimal("500000.00");
        BigDecimal vipPrice = request.vipPrice() != null ? request.vipPrice() : new BigDecimal("300000.00");
        BigDecimal normalPrice = request.normalPrice() != null ? request.normalPrice() : new BigDecimal("150000.00");

        List<ShowSeat> showSeats = new ArrayList<>();
        for (VenueSeat seat : venueSeats) {
            BigDecimal seatPrice;
            String sectionName = seat.getSectionName() != null ? seat.getSectionName().toUpperCase(Locale.ROOT) : "";
            String rowName = seat.getRowName() != null ? seat.getRowName().toUpperCase(Locale.ROOT) : "";

            if (sectionName.contains("SUPER") || rowName.equals("A")) {
                seatPrice = superVipPrice;
            } else if (sectionName.contains("VIP") || rowName.equals("B")) {
                seatPrice = vipPrice;
            } else {
                seatPrice = normalPrice;
            }
            showSeats.add(new ShowSeat(show, seat, seatPrice));
        }
        showSeatRepository.saveAll(showSeats);

        var showSummary = new AdminShowSummary(show.getId(), venue.getId(), venue.getName(), show.getStartsAt(), show.getEndsAt());
        return new AdminEventResponse(
                event.getId(),
                event.getTitle(),
                event.getDescription(),
                event.getCategory(),
                event.isPublished(),
                List.of(showSummary));
    }

    public record QuickCreateEventRequest(
            @NotBlank @Size(max = 200) String title,
            @NotBlank @Size(max = 2000) String description,
            String genreName,
            UUID genreId,
            String cityName,
            UUID cityId,
            String venueName,
            UUID venueId,
            String venueAddress,
            @NotNull Instant startsAt,
            @NotNull Instant endsAt,
            boolean published,
            BigDecimal superVipPrice,
            BigDecimal vipPrice,
            BigDecimal normalPrice) {
    }

    public record CityRequest(@NotBlank @Size(max = 120) String name) {
    }

    public record VenueRequest(
            @NotNull UUID cityId,
            @NotBlank @Size(max = 180) String name,
            @NotBlank @Size(max = 255) String address) {
    }

    public record GenreRequest(
            @NotBlank @Size(max = 80) String name,
            @NotBlank @Size(max = 96) String slug) {
    }

    public record EventRequest(
            @NotNull UUID genreId,
            @NotBlank @Size(max = 200) String title,
            @NotBlank String description) {
    }

    public record ShowRequest(
            @NotNull UUID eventId,
            @NotNull UUID venueId,
            @NotNull Instant startsAt,
            @NotNull Instant endsAt) {
    }

    public record PublicationRequest(@NotNull Boolean published) {
    }

    public record CityResponse(UUID id, String name) {
    }

    public record VenueResponse(UUID id, UUID cityId, String name, String address) {
    }

    public record GenreResponse(UUID id, String name, String slug) {
    }

    public record EventResponse(UUID id, String title, boolean published) {
    }

    public record ShowResponse(UUID id, UUID eventId, UUID venueId, Instant startsAt, Instant endsAt) {
    }

    public record AdminEventResponse(
            UUID id,
            String title,
            String description,
            String category,
            boolean published,
            List<AdminShowSummary> shows) {
    }

    public record AdminShowSummary(UUID id, UUID venueId, String venueName, Instant startsAt, Instant endsAt) {
    }
}
