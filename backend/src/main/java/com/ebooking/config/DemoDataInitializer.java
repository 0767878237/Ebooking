package com.ebooking.config;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import com.ebooking.modules.catalog.City;
import com.ebooking.modules.catalog.CityRepository;
import com.ebooking.modules.catalog.Venue;
import com.ebooking.modules.catalog.VenueRepository;
import com.ebooking.modules.catalog.VenueSeat;
import com.ebooking.modules.catalog.VenueSeatRepository;
import com.ebooking.modules.event.Event;
import com.ebooking.modules.event.EventRepository;
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
        private final VenueSeatRepository venueSeatRepository;
        private final EventRepository eventRepository;
        private final ShowRepository showRepository;
        private final ShowSeatRepository showSeatRepository;

        DemoDataService(
                UserAccountRepository userAccountRepository,
                CityRepository cityRepository,
                VenueRepository venueRepository,
                VenueSeatRepository venueSeatRepository,
                EventRepository eventRepository,
                ShowRepository showRepository,
                ShowSeatRepository showSeatRepository) {
            this.userAccountRepository = userAccountRepository;
            this.cityRepository = cityRepository;
            this.venueRepository = venueRepository;
            this.venueSeatRepository = venueSeatRepository;
            this.eventRepository = eventRepository;
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

            List<VenueSeat> seats = venueSeatRepository.saveAll(List.of(
                    new VenueSeat(UUID.randomUUID(), venue, "A", "A", 1),
                    new VenueSeat(UUID.randomUUID(), venue, "A", "A", 2),
                    new VenueSeat(UUID.randomUUID(), venue, "A", "A", 3),
                    new VenueSeat(UUID.randomUUID(), venue, "A", "A", 4),
                    new VenueSeat(UUID.randomUUID(), venue, "A", "B", 1),
                    new VenueSeat(UUID.randomUUID(), venue, "A", "B", 2),
                    new VenueSeat(UUID.randomUUID(), venue, "A", "B", 3),
                    new VenueSeat(UUID.randomUUID(), venue, "A", "B", 4)));

            Event event = eventRepository.save(new Event(
                    UUID.randomUUID(),
                    organizer,
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
