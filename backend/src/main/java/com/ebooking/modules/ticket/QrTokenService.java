package com.ebooking.modules.ticket;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class QrTokenService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private final byte[] secret;

    public QrTokenService(@Value("${ebooking.security.qr-secret}") String secret) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalArgumentException("EBOOKING_QR_SECRET must contain at least 32 characters.");
        }
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String payloadFor(String ticketCode) {
        return ticketCode + "." + sign(ticketCode);
    }

    public String hashPayload(String payload) {
        return sha256Hex(payload);
    }

    private String sha256Hex(String value) {
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

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("QR token signing is not available.", exception);
        }
    }
}
