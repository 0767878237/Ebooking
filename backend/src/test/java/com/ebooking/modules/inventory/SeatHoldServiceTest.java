package com.ebooking.modules.inventory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ebooking.modules.catalog.VenueSeat;
import com.ebooking.modules.catalog.VenueSection;
import com.ebooking.modules.event.Show;
import com.ebooking.modules.event.ShowRepository;
import com.ebooking.modules.identity.UserAccountRepository;
import com.ebooking.shared.web.ConflictException;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

class SeatHoldServiceTest {

    private final ShowRepository showRepository = Mockito.mock(ShowRepository.class);
    private final ShowSeatRepository showSeatRepository = Mockito.mock(ShowSeatRepository.class);
    private final SeatHoldRepository seatHoldRepository = Mockito.mock(SeatHoldRepository.class);
    private final UserAccountRepository userAccountRepository = Mockito.mock(UserAccountRepository.class);
    private final Instant now = Instant.parse("2026-08-25T10:00:00Z");
    private final SeatHoldService service = new SeatHoldService(
            showRepository,
            showSeatRepository,
            seatHoldRepository,
            userAccountRepository,
            Clock.fixed(now, ZoneOffset.UTC));

    @Test
    void createsTimeLimitedHoldForAvailableSeats() {
        UUID showId = UUID.randomUUID();
        UUID seatId = UUID.randomUUID();
        Show show = new Show(showId, null, null, now.plusSeconds(3600), now.plusSeconds(7200));
        VenueSection section = new VenueSection(UUID.randomUUID(), null, "A");
        VenueSeat seat = new VenueSeat(seatId, null, section, "A", 1);
        ShowSeat showSeat = new ShowSeat(show, seat);

        when(showRepository.findById(showId)).thenReturn(Optional.of(show));
        when(showSeatRepository.lockByShowIdAndSeatIds(eq(showId), any())).thenReturn(List.of(showSeat));
        when(seatHoldRepository.save(any(SeatHold.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SeatHoldService.SeatHoldResult result = service.createHold(showId, null, List.of(seatId));

        assertThat(result.showId()).isEqualTo(showId);
        assertThat(result.expiresAt()).isEqualTo(now.plusSeconds(300));
        assertThat(result.seats()).singleElement().extracting(SeatHoldService.SeatHoldSeat::label).isEqualTo("A-A1");
        assertThat(showSeat.getStatus()).isEqualTo(ShowSeatStatus.HELD);
        verify(seatHoldRepository).save(any(SeatHold.class));
    }

    @Test
    void rejectsSeatThatIsAlreadyHeld() {
        UUID showId = UUID.randomUUID();
        UUID seatId = UUID.randomUUID();
        Show show = new Show(showId, null, null, now.plusSeconds(3600), now.plusSeconds(7200));
        VenueSection section = new VenueSection(UUID.randomUUID(), null, "A");
        VenueSeat seat = new VenueSeat(seatId, null, section, "A", 1);
        ShowSeat showSeat = new ShowSeat(show, seat);
        showSeat.hold(new SeatHold(UUID.randomUUID(), null, now.plusSeconds(60)));

        when(showRepository.findById(showId)).thenReturn(Optional.of(show));
        when(showSeatRepository.lockByShowIdAndSeatIds(eq(showId), any())).thenReturn(List.of(showSeat));

        assertThatThrownBy(() -> service.createHold(showId, null, List.of(seatId)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("A-A1");
    }

    @Test
    void releasesEverySeatWhenMultiSeatHoldExpires() {
        UUID showId = UUID.randomUUID();
        Show show = new Show(showId, null, null, now.plusSeconds(3600), now.plusSeconds(7200));
        VenueSection section = new VenueSection(UUID.randomUUID(), null, "A");
        VenueSeat firstSeat = new VenueSeat(UUID.randomUUID(), null, section, "A", 1);
        VenueSeat secondSeat = new VenueSeat(UUID.randomUUID(), null, section, "A", 2);
        SeatHold hold = new SeatHold(UUID.randomUUID(), null, now.minusSeconds(1));
        ShowSeat firstShowSeat = new ShowSeat(show, firstSeat);
        ShowSeat secondShowSeat = new ShowSeat(show, secondSeat);
        firstShowSeat.hold(hold);
        secondShowSeat.hold(hold);

        when(seatHoldRepository.findByStatusAndExpiresAtLessThanEqual(
                eq(SeatHoldStatus.ACTIVE), eq(now), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(hold)), new PageImpl<>(List.of()));
        when(showSeatRepository.lockByHoldId(hold.getId()))
                .thenReturn(List.of(firstShowSeat, secondShowSeat));

        assertThat(service.releaseExpiredHolds()).isEqualTo(1);
        assertThat(hold.getStatus()).isEqualTo(SeatHoldStatus.EXPIRED);
        assertThat(firstShowSeat.getStatus()).isEqualTo(ShowSeatStatus.AVAILABLE);
        assertThat(secondShowSeat.getStatus()).isEqualTo(ShowSeatStatus.AVAILABLE);
    }
}
