package com.ebooking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EbookingApplication {

    public static void main(String[] args) {
        SpringApplication.run(EbookingApplication.class, args);
    }
}
