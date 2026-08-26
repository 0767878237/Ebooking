package com.ebooking.modules.ticket;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class QrTokenServiceTest {

    private final QrTokenService service = new QrTokenService(
            "01234567890123456789012345678901");

    @Test
    void createsSignedPayloadThatCannotBeReplacedByTicketCodeAlone() {
        String ticketCode = "TKT-ABC123";
        String payload = service.payloadFor(ticketCode);

        assertThat(payload).startsWith(ticketCode + ".");
        assertThat(payload).isNotEqualTo(ticketCode);
        assertThat(service.hashPayload(payload)).isNotEqualTo(service.hashPayload(ticketCode));
        assertThat(service.payloadFor(ticketCode)).isEqualTo(payload);
    }

    @Test
    void changesSignatureWhenTicketCodeChanges() {
        assertThat(service.payloadFor("TKT-ABC123"))
                .isNotEqualTo(service.payloadFor("TKT-ABC124"));
    }
}
