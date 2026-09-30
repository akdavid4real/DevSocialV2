package com.devsocial.backend.status;

import com.devsocial.backend.common.http.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatusController {

    @GetMapping
    ApiResponse<String> status() {
        return ApiResponse.success("Hello World!");
    }
}
