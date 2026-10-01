package com.devsocial.backend.careers;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/career-paths")
public class CareerPathsController {
    private final List<Map<String, Object>> paths;

    public CareerPathsController(ObjectMapper mapper) throws IOException {
        try (var stream = new ClassPathResource("career-paths.json").getInputStream()) {
            paths = List.copyOf(mapper.readValue(stream, new TypeReference<List<Map<String, Object>>>() {}));
        }
    }

    @GetMapping
    List<Map<String, Object>> list() {
        return paths;
    }

    @GetMapping("/{pathId}")
    Map<String, Object> detail(@PathVariable String pathId) {
        return paths.stream().filter(path -> pathId.equals(path.get("id"))).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Career path not found"));
    }
}
