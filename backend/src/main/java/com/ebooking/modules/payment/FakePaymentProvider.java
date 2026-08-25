package com.ebooking.modules.payment;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Component;

@Component
public class FakePaymentProvider implements PaymentProvider {

    @Override
    public PaymentAuthorization authorize(String paymentMethod, BigDecimal amount, String currency) {
        boolean approved = !"FAIL".equalsIgnoreCase(paymentMethod)
                && !"DECLINED".equalsIgnoreCase(paymentMethod);
        return new PaymentAuthorization(
                "FAKE_SANDBOX",
                "FAKE-" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT),
                approved);
    }
}
