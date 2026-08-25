package com.ebooking.api;

import java.util.List;
import java.util.UUID;

import com.ebooking.modules.catalog.CityRepository;
import com.ebooking.modules.catalog.VenueRepository;
import com.ebooking.modules.event.GenreRepository;
import com.ebooking.shared.web.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

    private final CityRepository cityRepository;
    private final VenueRepository venueRepository;
    private final GenreRepository genreRepository;

    public CatalogController(
            CityRepository cityRepository,
            VenueRepository venueRepository,
            GenreRepository genreRepository) {
        this.cityRepository = cityRepository;
        this.venueRepository = venueRepository;
        this.genreRepository = genreRepository;
    }

    @GetMapping("/cities")
    public PageResponse<CityResponse> cities(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("name").ascending());
        return PageResponse.from(cityRepository.findByDeletedAtIsNull(pageable).map(city ->
                new CityResponse(city.getId(), city.getName())));
    }

    @GetMapping("/venues")
    public PageResponse<VenueResponse> venues(
            @RequestParam(required = false) UUID cityId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("name").ascending());
        var venues = cityId == null
                ? venueRepository.findByDeletedAtIsNull(pageable)
                : venueRepository.findByCityIdAndDeletedAtIsNull(cityId, pageable);
        return PageResponse.from(venues.map(venue ->
                new VenueResponse(
                        venue.getId(),
                        venue.getCity().getId(),
                        venue.getName(),
                        venue.getAddress())));
    }

    @GetMapping("/genres")
    public List<String> genres() {
        return genreRepository.findByDeletedAtIsNull(PageRequest.of(0, 100, Sort.by("name").ascending())).stream()
                .map(genre -> genre.getName())
                .toList();
    }

    /*
     * Compatibility endpoint for the first demo frontend.
     */
    @GetMapping("/venues/all")
    public List<VenueResponse> allVenues(@RequestParam UUID cityId) {
        return venueRepository.findByCityIdOrderByNameAsc(cityId).stream()
                .map(venue -> new VenueResponse(
                        venue.getId(),
                        venue.getCity().getId(),
                        venue.getName(),
                        venue.getAddress()))
                .toList();
    }

    public record CityResponse(UUID id, String name) {
    }

    public record VenueResponse(UUID id, UUID cityId, String name, String address) {
    }
}
