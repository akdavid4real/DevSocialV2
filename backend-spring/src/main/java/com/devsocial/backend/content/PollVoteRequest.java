package com.devsocial.backend.content;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = false)
public record PollVoteRequest(List<String> optionIds) {
}
