package com.rd.platform.service.config;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * 前后端不分离：Spring Boot 直接托管打包进 jar 的前端产物（classpath:/static/）。
 *
 * <p>对客户端路由（wouter）做 SPA 回退——命中真实静态文件则返回该文件，否则回退到 index.html，
 * 使刷新/直达 /projects 等前端路由不再 404。API(/api) 与 WebSocket(/ws) 前缀不回退，交由各自处理器。
 */
@Configuration
public class SpaWebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws java.io.IOException {
                        Resource requested = location.createRelative(resourcePath);
                        if (requested.exists() && requested.isReadable()) {
                            return requested;
                        }
                        // API 与 WebSocket 不回退，返回 null 让后续处理器接管（最终 404/由控制器处理）
                        if (resourcePath.startsWith("api/") || resourcePath.startsWith("ws/")) {
                            return null;
                        }
                        // 其余（前端客户端路由）回退到 SPA 外壳
                        return new ClassPathResource("/static/index.html");
                    }
                });
    }
}
