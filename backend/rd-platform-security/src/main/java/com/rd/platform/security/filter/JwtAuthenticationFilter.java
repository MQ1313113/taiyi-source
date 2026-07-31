package com.rd.platform.security.filter;

import com.rd.platform.security.JwtUtils;
import com.rd.platform.security.context.SecurityContextHolder;
import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtils jwtUtils;

    private static final List<String> WHITE_LIST = Arrays.asList(
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/system-config/public",
            "/swagger-resources",
            "/v2/api-docs",
            "/doc.html",
            "/webjars",
            "/ws"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();

        // 非 API 请求（前端静态资源与 SPA 路由）直接放行，鉴权只作用于 /api/**
        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Skip white list
        for (String white : WHITE_LIST) {
            if (path.startsWith(white)) {
                filterChain.doFilter(request, response);
                return;
            }
        }

        String token = extractToken(request);
        if (token != null && jwtUtils.validateToken(token)) {
            Claims claims = jwtUtils.parseToken(token);
            Long userId = ((Number) claims.get("userId")).longValue();
            String username = claims.getSubject();
            String roles = (String) claims.get("roles");

            // Set custom context
            SecurityContextHolder.setCurrentUser(userId, username, roles);

            // Set Spring Security authentication context
            List<SimpleGrantedAuthority> authorities = Arrays.stream(roles.split(","))
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role.trim()))
                    .collect(Collectors.toList());
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(username, null, authorities);
            org.springframework.security.core.context.SecurityContextHolder.getContext()
                    .setAuthentication(authentication);
        } else {
            response.setStatus(401);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":401,\"message\":\"未登录或登录已过期\"}");
            return;
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            SecurityContextHolder.clear();
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
