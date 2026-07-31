package com.rd.platform.service.aspect;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.model.entity.SysAuditLog;
import com.rd.platform.model.mapper.SysAuditLogMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.*;

@Slf4j
@Aspect
@Component
public class AuditLogAspect {

    @Autowired
    private SysAuditLogMapper auditLogMapper;

    @Autowired
    private ApplicationContext applicationContext;

    private final ObjectMapper auditObjectMapper;

    public AuditLogAspect() {
        this.auditObjectMapper = new ObjectMapper();
        this.auditObjectMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        this.auditObjectMapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
        this.auditObjectMapper.findAndRegisterModules();
    }

    @Around("@annotation(com.rd.platform.common.annotation.AuditLog)")
    public Object around(ProceedingJoinPoint point) throws Throwable {
        long startTime = System.currentTimeMillis();
        SysAuditLog auditLog = new SysAuditLog();

        try {
            // Get annotation info
            MethodSignature signature = (MethodSignature) point.getSignature();
            Method method = signature.getMethod();
            AuditLog annotation = method.getAnnotation(AuditLog.class);

            auditLog.setModule(annotation.module());
            auditLog.setOperation(annotation.operation());
            auditLog.setMethod(point.getTarget().getClass().getName() + "." + method.getName());

            // Get user info
            Long userId = SecurityContextHolder.getCurrentUserId();
            String username = SecurityContextHolder.getCurrentUsername();
            auditLog.setUserId(userId != null ? userId : 0L);
            auditLog.setUsername(username != null ? username : "anonymous");

            // Get request info
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                auditLog.setRequestUrl(request.getRequestURI());
                auditLog.setIpAddress(getClientIp(request));
            }

            // Record request parameters
            String requestParams = buildRequestParams(point, signature);
            auditLog.setRequestParams(truncate(requestParams, 2000));

            // For update/delete operations, capture before-data
            String beforeData = captureBeforeData(point, signature, method);
            if (beforeData != null) {
                auditLog.setBeforeData(truncate(beforeData, 2000));
            }

            // Execute method
            Object result = point.proceed();

            auditLog.setStatus(1);
            auditLog.setExecutionTime(System.currentTimeMillis() - startTime);

            // Capture after-data
            String afterData = captureAfterData(result, point, signature, method);
            if (afterData != null) {
                auditLog.setAfterData(truncate(afterData, 2000));
            }

            // Save log
            auditLogMapper.insert(auditLog);
            return result;
        } catch (Exception e) {
            auditLog.setStatus(0);
            auditLog.setErrorMsg(truncate(e.getMessage(), 1000));
            auditLog.setExecutionTime(System.currentTimeMillis() - startTime);
            auditLogMapper.insert(auditLog);
            throw e;
        }
    }

    /**
     * Build request parameters as JSON string
     */
    private String buildRequestParams(ProceedingJoinPoint point, MethodSignature signature) {
        try {
            Object[] args = point.getArgs();
            String[] paramNames = signature.getParameterNames();
            if (args == null || args.length == 0) return null;

            Map<String, Object> params = new LinkedHashMap<>();
            for (int i = 0; i < args.length; i++) {
                Object arg = args[i];
                if (arg == null) continue;
                // Skip non-serializable types
                if (arg instanceof HttpServletRequest || arg instanceof HttpServletResponse) continue;
                if (arg instanceof MultipartFile) {
                    MultipartFile file = (MultipartFile) arg;
                    params.put(paramNames[i], "文件: " + file.getOriginalFilename() + " (" + formatFileSize(file.getSize()) + ")");
                    continue;
                }
                if (arg instanceof MultipartFile[]) {
                    MultipartFile[] files = (MultipartFile[]) arg;
                    List<String> fileNames = new ArrayList<>();
                    for (MultipartFile f : files) {
                        fileNames.add(f.getOriginalFilename() + " (" + formatFileSize(f.getSize()) + ")");
                    }
                    params.put(paramNames[i], "文件列表: " + fileNames);
                    continue;
                }
                String name = (paramNames != null && i < paramNames.length) ? paramNames[i] : "arg" + i;
                params.put(name, arg);
            }
            if (params.isEmpty()) return null;
            return auditObjectMapper.writeValueAsString(params);
        } catch (Exception e) {
            log.debug("Failed to serialize request params", e);
            return null;
        }
    }

    /**
     * For update/delete operations, capture the entity state before modification
     */
    private String captureBeforeData(ProceedingJoinPoint point, MethodSignature signature, Method method) {
        try {
            boolean isUpdate = method.isAnnotationPresent(PutMapping.class);
            boolean isDelete = method.isAnnotationPresent(DeleteMapping.class);
            if (!isUpdate && !isDelete) return null;

            Long entityId = extractEntityId(point, signature);
            if (entityId == null) return null;

            Object entity = queryEntityById(point, entityId);
            if (entity == null) return null;

            return auditObjectMapper.writeValueAsString(entity);
        } catch (Exception e) {
            log.debug("Failed to capture before-data", e);
            return null;
        }
    }

    /**
     * Capture the result/after-data of the operation
     */
    private String captureAfterData(Object result, ProceedingJoinPoint point, MethodSignature signature, Method method) {
        try {
            if (result == null) return null;

            boolean isCreate = method.isAnnotationPresent(PostMapping.class);
            boolean isUpdate = method.isAnnotationPresent(PutMapping.class);

            if (!isCreate && !isUpdate) return null;

            // Result is typically Result<entity> - try to extract data field
            try {
                java.lang.reflect.Method getData = result.getClass().getMethod("getData");
                Object data = getData.invoke(result);
                if (data != null && !(data instanceof String)) {
                    return auditObjectMapper.writeValueAsString(data);
                }
            } catch (NoSuchMethodException ignored) {}

            // For update operations, query the updated entity
            if (isUpdate) {
                Long entityId = extractEntityId(point, signature);
                if (entityId != null) {
                    Object entity = queryEntityById(point, entityId);
                    if (entity != null) {
                        return auditObjectMapper.writeValueAsString(entity);
                    }
                }
            }
            return null;
        } catch (Exception e) {
            log.debug("Failed to capture after-data", e);
            return null;
        }
    }

    /**
     * Extract entity ID from method parameters
     */
    private Long extractEntityId(ProceedingJoinPoint point, MethodSignature signature) {
        Object[] args = point.getArgs();
        String[] paramNames = signature.getParameterNames();
        Parameter[] parameters = signature.getMethod().getParameters();

        for (int i = 0; i < parameters.length; i++) {
            if (args[i] == null) continue;
            PathVariable pv = parameters[i].getAnnotation(PathVariable.class);
            if (pv != null) {
                try { return Long.parseLong(args[i].toString()); } catch (NumberFormatException ignored) {}
            }
            if (paramNames != null && i < paramNames.length && "id".equals(paramNames[i])) {
                try { return Long.parseLong(args[i].toString()); } catch (NumberFormatException ignored) {}
            }
        }
        return null;
    }

    /**
     * Query entity by ID using the appropriate mapper
     */
    private Object queryEntityById(ProceedingJoinPoint point, Long entityId) {
        try {
            String controllerName = point.getTarget().getClass().getSimpleName();
            String mapperBeanName = null;

            if (controllerName.contains("Requirement")) mapperBeanName = "bizRequirementMapper";
            else if (controllerName.contains("Task")) mapperBeanName = "bizTaskMapper";
            else if (controllerName.contains("Bug")) mapperBeanName = "bizBugMapper";
            else if (controllerName.contains("TestCase")) mapperBeanName = "bizTestCaseMapper";
            else if (controllerName.contains("Project")) mapperBeanName = "bizProjectMapper";
            else if (controllerName.contains("User")) mapperBeanName = "sysUserMapper";
            else if (controllerName.contains("Role")) mapperBeanName = "sysRoleMapper";
            else if (controllerName.contains("Sprint")) mapperBeanName = "bizSprintMapper";
            else if (controllerName.contains("Change")) mapperBeanName = "bizChangeRequestMapper";

            if (mapperBeanName == null) return null;

            Object mapper = applicationContext.getBean(mapperBeanName);
            if (mapper instanceof BaseMapper) {
                return ((BaseMapper<?>) mapper).selectById(entityId);
            }
            return null;
        } catch (Exception e) {
            log.debug("Failed to query entity by id: {}", entityId, e);
            return null;
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    private String truncate(String str, int maxLen) {
        if (str == null) return null;
        return str.length() > maxLen ? str.substring(0, maxLen) + "..." : str;
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + "B";
        if (bytes < 1024 * 1024) return String.format("%.1fKB", bytes / 1024.0);
        return String.format("%.1fMB", bytes / (1024.0 * 1024));
    }
}
