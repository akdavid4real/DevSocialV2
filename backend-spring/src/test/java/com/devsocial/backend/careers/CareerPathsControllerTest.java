package com.devsocial.backend.careers;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CareerPathsControllerTest {
    @Autowired MockMvc mockMvc;

    @Test
    void catalogAndLessonsAreServedBySpring() throws Exception {
        mockMvc.perform(get("/career-paths"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("frontend-developer"));
        mockMvc.perform(get("/career-paths/frontend-developer"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.modules[0].id").value("html-basics"))
                .andExpect(jsonPath("$.data.modules[0].lesson[0].type").value("paragraph"));
    }

    @Test
    void unknownPathsReturnNotFoundAndWritesRemainDenied() throws Exception {
        mockMvc.perform(get("/career-paths/unknown"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Career path not found"));
        mockMvc.perform(post("/career-paths")).andExpect(status().isUnauthorized());
    }
}
