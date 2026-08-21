package com.rd.platform.service;

import org.mybatis.spring.annotation.MapperScan;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ComponentScan(basePackages = "com.rd.platform")
@MapperScan("com.rd.platform.model.mapper")
@EnableAsync
@EnableScheduling
public class RdPlatformApplication {

    private static final Logger log = LoggerFactory.getLogger(RdPlatformApplication.class);

    public static void main(String[] args) {
        ConfigurableApplicationContext ctx = SpringApplication.run(RdPlatformApplication.class, args);
        Environment env = ctx.getEnvironment();
        String port = env.getProperty("server.port", "8080");
        log.info("\n----------------------------------------------------------\n" +
                "  太一研发管理平台 启动成功!\n" +
                "  前端页面: http://localhost:{}/\n" +
                "  接口文档: http://localhost:{}/doc.html\n" +
                "----------------------------------------------------------", port, port);
    }
}
