package com.rd.platform.service.config;

import com.rd.platform.security.JwtUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;

@Slf4j
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    @Autowired
    private JwtUtils jwtUtils;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = accessor.getFirstNativeHeader("Authorization");
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);
            }
            // 也尝试从query参数获取token
            if (token == null || token.isEmpty()) {
                token = accessor.getFirstNativeHeader("token");
            }
            if (token != null && !token.isEmpty()) {
                try {
                    if (jwtUtils.validateToken(token)) {
                        String username = jwtUtils.getUsername(token);
                        Long userId = jwtUtils.getUserId(token);
                        if (username != null && userId != null) {
                            // 设置用户身份，使 convertAndSendToUser 可以路由
                            accessor.setUser(new WebSocketPrincipal(String.valueOf(userId), username));
                            log.debug("WebSocket连接认证成功: userId={}, username={}", userId, username);
                        }
                    }
                } catch (Exception e) {
                    log.warn("WebSocket连接认证失败: {}", e.getMessage());
                }
            }
        }
        return message;
    }

    /**
     * WebSocket用户身份标识
     */
    public static class WebSocketPrincipal implements Principal {
        private final String userId;
        private final String username;

        public WebSocketPrincipal(String userId, String username) {
            this.userId = userId;
            this.username = username;
        }

        @Override
        public String getName() {
            return userId; // 使用userId作为Principal名称，与convertAndSendToUser匹配
        }

        public String getUsername() {
            return username;
        }
    }
}
