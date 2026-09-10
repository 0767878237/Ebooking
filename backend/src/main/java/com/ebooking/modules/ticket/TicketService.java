package com.ebooking.modules.ticket;

import java.util.List;
import java.util.UUID;

import com.ebooking.modules.booking.Booking;
import com.ebooking.modules.booking.BookingRepository;
import com.ebooking.modules.booking.BookingSeat;
import com.ebooking.modules.booking.BookingSeatRepository;
import com.ebooking.modules.booking.BookingStatus;
import com.ebooking.modules.identity.UserAccount;
import com.ebooking.modules.identity.UserAccountRepository;
import com.ebooking.modules.identity.UserRole;
import com.ebooking.shared.web.ConflictException;
import com.ebooking.shared.web.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class TicketService {

    private static final Logger log = LoggerFactory.getLogger(TicketService.class);

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final TicketRepository ticketRepository;
    private final TicketScanRepository ticketScanRepository;
    private final UserAccountRepository userAccountRepository;
    private final QrTokenService qrTokenService;

    public TicketService(
            BookingRepository bookingRepository,
            BookingSeatRepository bookingSeatRepository,
            TicketRepository ticketRepository,
            TicketScanRepository ticketScanRepository,
            UserAccountRepository userAccountRepository,
            QrTokenService qrTokenService) {
        this.bookingRepository = bookingRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.ticketRepository = ticketRepository;
        this.ticketScanRepository = ticketScanRepository;
        this.userAccountRepository = userAccountRepository;
        this.qrTokenService = qrTokenService;
    }

    @Transactional
    public List<TicketResult> issueForBooking(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking was not found."));
        if (booking.getStatus() != BookingStatus.PAID) {
            throw new ConflictException("Tickets can only be issued for a paid booking.");
        }

        List<Ticket> existing = ticketRepository.findByBookingIdOrderByTicketCode(bookingId);
        if (!existing.isEmpty()) {
            return existing.stream().map(this::toResult).toList();
        }

        List<Ticket> tickets = bookingSeatRepository.findByBookingIdOrderBySeatLabelSnapshot(bookingId)
                .stream()
                .map(item -> createTicket(booking, item))
                .toList();
        return ticketRepository.saveAll(tickets).stream().map(this::toResult).toList();
    }

    @Transactional(readOnly = true)
    public List<TicketResult> findByBooking(UUID bookingId, UUID userId) {
        if (bookingRepository.findByIdAndUserId(bookingId, userId).isEmpty()) {
            throw new NotFoundException("Booking was not found.");
        }
        return ticketRepository.findByBookingIdOrderByTicketCode(bookingId).stream()
                .map(this::toResult)
                .toList();
    }

    @Transactional
    public ScanResult scan(UUID staffUserId, String qrPayload, String deviceId, String note) {
        UserAccount staff = userAccountRepository.findById(staffUserId)
                .orElseThrow(() -> new NotFoundException("Staff user was not found."));
        if (staff.getRole() != UserRole.CHECK_IN_STAFF && staff.getRole() != UserRole.ADMIN) {
            throw new ConflictException("Only check-in staff or admin can scan tickets.");
        }

        String ticketCode = qrPayload == null ? "" : qrPayload.trim();
        Ticket ticket = ticketRepository.lockByQrTokenHash(qrTokenService.hashPayload(ticketCode)).orElse(null);
        if (ticket == null) {
            return new ScanResult(null, TicketScanResult.INVALID, null);
        }

        TicketScanResult result;
        if (ticket.getStatus() == TicketStatus.USED) {
            result = TicketScanResult.ALREADY_USED;
        } else if (ticket.getStatus() == TicketStatus.CANCELLED) {
            result = TicketScanResult.CANCELLED;
        } else {
            ticket.markUsed();
            result = TicketScanResult.ACCEPTED;
        }

        ticketScanRepository.save(new TicketScan(
                UUID.randomUUID(), ticket, staff, result, deviceId, note));
        log.info("Ticket scanned: ticketId={}, staffUserId={}, result={}",
                ticket.getId(), staffUserId, result);
        return new ScanResult(ticket.getTicketCode(), result, ticket.getUsedAt());
    }

    private Ticket createTicket(Booking booking, BookingSeat item) {
        String ticketCode = "TKT-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        String qrPayload = qrTokenService.payloadFor(ticketCode);
        return new Ticket(
                UUID.randomUUID(),
                booking,
                item.getSeat(),
                ticketCode,
                qrTokenService.hashPayload(qrPayload));
    }

    private TicketResult toResult(Ticket ticket) {
        return new TicketResult(
                ticket.getId(),
                ticket.getBooking().getId(),
                ticket.getSeat().getId(),
                ticket.getTicketCode(),
                qrTokenService.payloadFor(ticket.getTicketCode()),
                ticket.getStatus(),
                ticket.getIssuedAt(),
                ticket.getUsedAt());
    }

    public record TicketResult(
            UUID id,
            UUID bookingId,
            UUID seatId,
            String ticketCode,
            String qrPayload,
            TicketStatus status,
            java.time.Instant issuedAt,
            java.time.Instant usedAt) {

    }

    @Transactional
    public void cancelTicketsForBooking(UUID bookingId) {
        List<Ticket> tickets = ticketRepository.findByBookingIdOrderByTicketCode(bookingId);
        boolean hasUsed = tickets.stream().anyMatch(t -> t.getStatus() == TicketStatus.USED);
        if (hasUsed) {
            throw new ConflictException("Cannot cancel booking because tickets have already been used at check-in.");
        }
        tickets.forEach(Ticket::markCancelled);
        ticketRepository.saveAll(tickets);
    }

    @Transactional(readOnly = true)
    public List<ScanRecordResult> recentScans() {
        return ticketScanRepository.findAll(
                org.springframework.data.domain.PageRequest.of(0, 30, org.springframework.data.domain.Sort.by("scannedAt").descending()))
                .getContent().stream()
                .map(scan -> new ScanRecordResult(
                        scan.getId(),
                        scan.getTicket() != null ? scan.getTicket().getTicketCode() : null,
                        scan.getResult(),
                        scan.getDeviceId(),
                        scan.getNote(),
                        scan.getScannedAt()))
                .toList();
    }

    public record ScanRecordResult(
            UUID id,
            String ticketCode,
            TicketScanResult result,
            String deviceId,
            String note,
            java.time.Instant scannedAt) {
    }

    public record ScanResult(String ticketCode, TicketScanResult result, java.time.Instant usedAt) {
    }
}
