package com.ebooking.modules.payment;

import java.math.BigDecimal;

public interface PaymentProvider {

    PaymentAuthorization authorize(String paymentMethod, BigDecimal amount, String currency);

    record PaymentAuthorization(String provider, String providerReference, boolean approved) {
    }
}
