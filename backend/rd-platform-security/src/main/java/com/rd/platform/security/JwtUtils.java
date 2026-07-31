package com.rd.platform.security;

import io.jsonwebtoken.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtils {

    @Value("${jwt.secret:TaiYiRdPlatformSecretKey2026}")
    private String secret;

    @Value("${jwt.expiration:7200000}")
    private long defaultExpiration; // 2 hours fallback

    @Autowired(required = false)
    private DataSource dataSource;

    /**
     * 从数据库动态读取token有效期（小时），转换为毫秒
     */
    private long getExpiration() {
        if (dataSource != null) {
            try (Connection conn = dataSource.getConnection();
                 PreparedStatement ps = conn.prepareStatement(
                         "SELECT config_value FROM sys_config WHERE config_key = 'token.expiration.hours'")) {
                ResultSet rs = ps.executeQuery();
                if (rs.next()) {
                    int hours = Integer.parseInt(rs.getString(1));
                    return hours * 3600000L;
                }
            } catch (Exception ignored) {
                // 回退到默认值
            }
        }
        return defaultExpiration;
    }

    public String generateToken(Long userId, String username, String roles) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("username", username);
        claims.put("roles", roles);
        long expMs = getExpiration();
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expMs))
                .signWith(SignatureAlgorithm.HS256, secret)
                .compact();
    }

    public Claims parseToken(String token) {
        try {
            return Jwts.parser()
                    .setSigningKey(secret)
                    .parseClaimsJws(token)
                    .getBody();
        } catch (Exception e) {
            return null;
        }
    }

    public boolean validateToken(String token) {
        Claims claims = parseToken(token);
        if (claims == null) return false;
        return !claims.getExpiration().before(new Date());
    }

    public Long getUserId(String token) {
        Claims claims = parseToken(token);
        return claims != null ? ((Number) claims.get("userId")).longValue() : null;
    }

    public String getUsername(String token) {
        Claims claims = parseToken(token);
        return claims != null ? claims.getSubject() : null;
    }

    public String getRoles(String token) {
        Claims claims = parseToken(token);
        return claims != null ? (String) claims.get("roles") : null;
    }
}
