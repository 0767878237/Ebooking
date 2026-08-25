package com.ebooking.modules.ticket;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
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

@Service
public class TicketService {

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final TicketRepository ticketRepository;
    private final TicketScanRepository ticketScanRepository;
    private final UserAccountRepository userAccountRepository;

    public TicketService(
            BookingRepository bookingRepository,
            BookingSeatRepository bookingSeatRepository,
            TicketRepository ticketRepository,
            TicketScanRepository ticketScanRepository,
            UserAccountRepository userAccountRepository) {
        this.bookingRepository = bookingRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.ticketRepository = ticketRepository;
        this.ticketScanRepository = ticketScanRepository;
        this.userAccountRepository = userAccountRepository;
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
            return existing.stream().map(TicketResult::from).toList();
        }

        List<Ticket> tickets = bookingSeatRepository.findByBookingIdOrderBySeatLabelSnapshot(bookingId)
                .stream()
                .map(item -> createTicket(booking, item))
                .toList();
        return ticketRepository.saveAll(tickets).stream().map(TicketResult::from).toList();
    }

    @Transactional(readOnly = true)
    public List<TicketResult> findByBooking(UUID bookingId) {
        if (!bookingRepository.existsById(bookingId)) {
            throw new NotFoundException("Booking was not found.");
        }
        return ticketRepository.findByBookingIdOrderByTicketCode(bookingId).stream()
                .map(TicketResult::from)
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
        Ticket ticket = ticketRepository.lockByTicketCode(ticketCode).orElse(null);
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
        return new ScanResult(ticket.getTicketCode(), result, ticket.getUsedAt());
    }

    private Ticket createTicket(Booking booking, BookingSeat item) {
        String ticketCode = "TKT-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        return new Ticket(
                UUID.randomUUID(),
                booking,
                item.getSeat(),
                ticketCode,
                sha256(ticketCode));
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte current : digest) {
                hex.append(String.format("%02x", current));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
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

        static TicketResult from(Ticket ticket) {
            return new TicketResult(
                    ticket.getId(),
                    ticket.getBooking().getId(),
                    ticket.getSeat().getId(),
                    ticket.getTicketCode(),
                    ticket.getTicketCode(),
                    ticket.getStatus(),
                    ticket.getIssuedAt(),
                    ticket.getUsedAt());
        }
    }

    public record ScanResult(String ticketCode, TicketScanResult result, java.time.Instant usedAt) {
    }
}
