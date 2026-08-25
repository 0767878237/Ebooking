package com.ebooking.api;

import java.time.Instant;
import java.util.UUID;

import com.ebooking.modules.catalog.City;
import com.ebooking.modules.catalog.CityRepository;
import com.ebooking.modules.catalog.Venue;
import com.ebooking.modules.catalog.VenueRepository;
import com.ebooking.modules.catalog.VenueSeatRepository;
import com.ebooking.modules.event.Event;
import com.ebooking.modules.event.EventRepository;
import com.ebooking.modules.event.Genre;
import com.ebooking.modules.event.GenreRepository;
import com.ebooking.modules.event.Show;
import com.ebooking.modules.event.ShowRepository;
import com.ebooking.modules.identity.UserAccountRepository;
import com.ebooking.modules.inventory.ShowSeat;
import com.ebooking.modules.inventory.ShowSeatRepository;
import com.ebooking.shared.web.NotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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
    private final ShowSeatRepository showSeatRepository;

    public AdminCatalogController(
            CityRepository cityRepository,
            VenueRepository venueRepository,
            GenreRepository genreRepository,
            EventRepository eventRepository,
            ShowRepository showRepository,
            UserAccountRepository userAccountRepository,
            VenueSeatRepository venueSeatRepository,
            ShowSeatRepository showSeatRepository) {
        this.cityRepository = cityRepository;
        this.venueRepository = venueRepository;
        this.genreRepository = genreRepository;
        this.eventRepository = eventRepository;
        this.showRepository = showRepository;
        this.userAccountRepository = userAccountRepository;
        this.venueSeatRepository = venueSeatRepository;
        this.showSeatRepository = showSeatRepository;
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
        var organizer = userAccountRepository.findById(request.organizerId())
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
            @NotNull UUID organizerId,
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
}
