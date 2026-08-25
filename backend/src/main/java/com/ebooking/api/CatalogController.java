package com.ebooking.api;

import java.util.List;
import java.util.UUID;

import com.ebooking.modules.catalog.CityRepository;
import com.ebooking.modules.catalog.VenueRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

    private final CityRepository cityRepository;
    private final VenueRepository venueRepository;

    public CatalogController(CityRepository cityRepository, VenueRepository venueRepository) {
        this.cityRepository = cityRepository;
        this.venueRepository = venueRepository;
    }

    @GetMapping("/cities")
    public List<CityResponse> cities() {
        return cityRepository.findAll().stream()
                .map(city -> new CityResponse(city.getId(), city.getName()))
                .toList();
    }

    @GetMapping("/venues")
    public List<VenueResponse> venues(@RequestParam UUID cityId) {
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

