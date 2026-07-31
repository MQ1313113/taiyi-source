package com.rd.platform.security.context;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class SecurityContextHolder {

    private static final ThreadLocal<LoginUser> CONTEXT = new ThreadLocal<>();

    public static void setCurrentUser(Long userId, String username, String roles) {
        LoginUser user = new LoginUser();
        user.setUserId(userId);
        user.setUsername(username);
        user.setRoles(roles != null ? Arrays.asList(roles.split(",")) : Collections.emptyList());
        CONTEXT.set(user);
    }

    public static LoginUser getCurrentUser() {
        return CONTEXT.get();
    }

    public static Long getCurrentUserId() {
        LoginUser user = CONTEXT.get();
        return user != null ? user.getUserId() : null;
    }

    public static String getCurrentUsername() {
        LoginUser user = CONTEXT.get();
        return user != null ? user.getUsername() : null;
    }

    public static List<String> getCurrentRoles() {
        LoginUser user = CONTEXT.get();
        return user != null ? user.getRoles() : Collections.emptyList();
    }

    public static boolean hasRole(String role) {
        return getCurrentRoles().contains(role);
    }

    public static boolean hasAnyRole(String... roles) {
        List<String> currentRoles = getCurrentRoles();
        for (String role : roles) {
            if (currentRoles.contains(role)) return true;
        }
        return false;
    }

    public static void clear() {
        CONTEXT.remove();
    }

    public static class LoginUser {
        private Long userId;
        private String username;
        private List<String> roles;

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public List<String> getRoles() { return roles; }
        public void setRoles(List<String> roles) { this.roles = roles; }
    }
}
