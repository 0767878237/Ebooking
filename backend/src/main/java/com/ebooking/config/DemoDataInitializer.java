package com.ebooking.config;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import com.ebooking.modules.catalog.City;
import com.ebooking.modules.catalog.CityRepository;
import com.ebooking.modules.catalog.Venue;
import com.ebooking.modules.catalog.VenueRepository;
import com.ebooking.modules.catalog.VenueSection;
import com.ebooking.modules.catalog.VenueSectionRepository;
import com.ebooking.modules.catalog.VenueSeat;
import com.ebooking.modules.catalog.VenueSeatRepository;
import com.ebooking.modules.event.Event;
import com.ebooking.modules.event.EventRepository;
import com.ebooking.modules.event.Genre;
import com.ebooking.modules.event.GenreRepository;
import com.ebooking.modules.event.Show;
import com.ebooking.modules.event.ShowRepository;
import com.ebooking.modules.identity.UserAccount;
import com.ebooking.modules.identity.UserAccountRepository;
import com.ebooking.modules.identity.UserRole;
import com.ebooking.modules.inventory.ShowSeat;
import com.ebooking.modules.inventory.ShowSeatRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DemoDataInitializer implements ApplicationRunner {

    private final DemoDataService demoDataService;

    public DemoDataInitializer(DemoDataService demoDataService) {
        this.demoDataService = demoDataService;
    }

    @Override
    public void run(ApplicationArguments args) {
        demoDataService.seedIfEmpty();
    }

    @Component
    static class DemoDataService {

        private final UserAccountRepository userAccountRepository;
        private final CityRepository cityRepository;
        private final VenueRepository venueRepository;
        private final VenueSectionRepository venueSectionRepository;
        private final VenueSeatRepository venueSeatRepository;
        private final EventRepository eventRepository;
        private final GenreRepository genreRepository;
        private final ShowRepository showRepository;
        private final ShowSeatRepository showSeatRepository;

        DemoDataService(
                UserAccountRepository userAccountRepository,
                CityRepository cityRepository,
                VenueRepository venueRepository,
                VenueSectionRepository venueSectionRepository,
                VenueSeatRepository venueSeatRepository,
                EventRepository eventRepository,
                GenreRepository genreRepository,
                ShowRepository showRepository,
                ShowSeatRepository showSeatRepository) {
            this.userAccountRepository = userAccountRepository;
            this.cityRepository = cityRepository;
            this.venueRepository = venueRepository;
            this.venueSectionRepository = venueSectionRepository;
            this.venueSeatRepository = venueSeatRepository;
            this.eventRepository = eventRepository;
            this.genreRepository = genreRepository;
            this.showRepository = showRepository;
            this.showSeatRepository = showSeatRepository;
        }

        @Transactional
        public void seedIfEmpty() {
            if (eventRepository.count() > 0) {
                return;
            }

            UserAccount organizer = userAccountRepository.save(new UserAccount(
                    UUID.randomUUID(),
                    "organizer@ebooking.local",
                    "E Booking Organizer",
                    UserRole.ORGANIZER));
            City city = cityRepository.save(new City(UUID.randomUUID(), "Ho Chi Minh City"));
            Venue venue = venueRepository.save(new Venue(
                    UUID.randomUUID(),
                    city,
                    "Saigon Convention Hall",
                    "799 Nguyen Van Linh, District 7"));
            VenueSection section = venueSectionRepository.save(new VenueSection(
                    UUID.randomUUID(),
                    venue,
                    "A"));

            List<VenueSeat> seats = venueSeatRepository.saveAll(List.of(
                    new VenueSeat(UUID.randomUUID(), venue, section, "A", 1),
                    new VenueSeat(UUID.randomUUID(), venue, section, "A", 2),
                    new VenueSeat(UUID.randomUUID(), venue, section, "A", 3),
                    new VenueSeat(UUID.randomUUID(), venue, section, "A", 4),
                    new VenueSeat(UUID.randomUUID(), venue, section, "B", 1),
                    new VenueSeat(UUID.randomUUID(), venue, section, "B", 2),
                    new VenueSeat(UUID.randomUUID(), venue, section, "B", 3),
                    new VenueSeat(UUID.randomUUID(), venue, section, "B", 4)));

            Event event = eventRepository.save(new Event(
                    UUID.randomUUID(),
                    organizer,
                    genreRepository.findByNameIgnoreCase("Music")
                            .orElseGet(() -> genreRepository.save(new Genre(
                                    UUID.randomUUID(), "Music", "music"))),
                    "E Booking Launch Concert",
                    "A demo event used to exercise the reservation flow.",
                    "Music",
                    true));
            Instant startsAt = Instant.now().plus(7, ChronoUnit.DAYS).truncatedTo(ChronoUnit.MINUTES);
            Show show = showRepository.save(new Show(
                    UUID.randomUUID(),
                    event,
                    venue,
                    startsAt,
                    startsAt.plus(2, ChronoUnit.HOURS)));
            showSeatRepository.saveAll(seats.stream().map(seat -> new ShowSeat(show, seat)).toList());
        }
    }
}
