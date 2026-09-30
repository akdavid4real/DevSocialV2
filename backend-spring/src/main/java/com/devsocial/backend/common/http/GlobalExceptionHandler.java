package com.devsocial.backend.common.http;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> handleOversizedUpload(
            MaxUploadSizeExceededException exception,
            HttpServletRequest request
    ) {
        return error(HttpStatus.BAD_REQUEST, request, "File too large. Max size is 20MB.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        List<String> errors = exception.getBindingResult().getFieldErrors().stream()
                .map(this::validationMessage)
                .toList();
        return error(HttpStatus.BAD_REQUEST, request, errors);
    }

    @ExceptionHandler({
            ConstraintViolationException.class,
            HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class
    })
    ResponseEntity<ApiError> handleBadRequest(Exception exception, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, request, exception.getMessage());
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException exception, HttpServletRequest request) {
        return error(HttpStatus.valueOf(exception.getStatusCode().value()), request, exception.getReason());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> handleUnexpected(Exception exception, HttpServletRequest request) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR, request, "Internal server error");
    }

    private ResponseEntity<ApiError> error(HttpStatus status, HttpServletRequest request, Object message) {
        return ResponseEntity.status(status).body(ApiError.of(status.value(), request.getRequestURI(), message));
    }

    private String validationMessage(FieldError error) {
        return error.getDefaultMessage() == null ? error.getField() + " is invalid" : error.getDefaultMessage();
    }
}
