package com.rd.platform.service;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ComponentScan(basePackages = "com.rd.platform")
@MapperScan("com.rd.platform.model.mapper")
@EnableAsync
@EnableScheduling
public class RdPlatformApplication {
    public static void main(String[] args) {
        SpringApplication.run(RdPlatformApplication.class, args);
    }
}
