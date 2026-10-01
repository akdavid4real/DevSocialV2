package com.devsocial.backend.configuration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(OutputCaptureExtension.class)
class HttpRequestLoggingFilterTest {
    @Test
    void logsRejectedRequestsWithoutCredentialsOrQueryStrings(CapturedOutput output) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v2/auth/login");
        request.setQueryString("token=secret-query-value");
        request.addHeader("Authorization", "Bearer secret-header-value");
        request.setContent("secret-password-value".getBytes());
        MockHttpServletResponse response = new MockHttpServletResponse();

        new HttpRequestLoggingFilter().doFilter(request, response,
                (req, res) -> ((jakarta.servlet.http.HttpServletResponse) res).setStatus(401));

        assertThat(output).contains("HTTP POST /api/v2/auth/login -> 401 (");
        assertThat(output).doesNotContain("secret-query-value", "secret-header-value", "secret-password-value");
    }
}
