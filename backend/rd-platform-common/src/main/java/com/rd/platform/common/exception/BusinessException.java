package com.rd.platform.common.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final int code;

    public BusinessException(String message) {
        super(message);
        this.code = 500;
    }

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }

    public static BusinessException forbidden(String message) {
        return new BusinessException(403, message);
    }

    public static BusinessException badRequest(String message) {
        return new BusinessException(400, message);
    }
}
