package com.devsocial.backend.auth;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcCurrentUserRepository implements CurrentUserRepository {

    private final JdbcClient jdbc;

    public JdbcCurrentUserRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<CurrentUser> findById(UUID userId) {
        return jdbc.sql("""
                        SELECT id, email, username, "firstName", "lastName", "displayName",
                               bio, avatar, "bannerUrl", role, affiliation, "techCareerPath",
                               "techStack", "experienceLevel", "githubUsername", "linkedinUrl",
                               "portfolioUrl", location, website, interests, points, level, badges,
                               "loginStreak", "lastStreakDate", "followersCount", "followingCount",
                               "isVerified", "onboardingCompleted", "createdAt", "updatedAt"
                        FROM "User"
                        WHERE id = :userId
                        LIMIT 1
                        """)
                .param("userId", userId)
                .query((resultSet, rowNumber) -> map(resultSet))
                .optional();
    }

    private CurrentUser map(ResultSet resultSet) throws SQLException {
        return new CurrentUser(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("email"),
                resultSet.getString("username"),
                resultSet.getString("firstName"),
                resultSet.getString("lastName"),
                resultSet.getString("displayName"),
                resultSet.getString("bio"),
                resultSet.getString("avatar"),
                resultSet.getString("bannerUrl"),
                resultSet.getString("role"),
                resultSet.getString("affiliation"),
                resultSet.getString("techCareerPath"),
                stringList(resultSet.getArray("techStack")),
                resultSet.getString("experienceLevel"),
                resultSet.getString("githubUsername"),
                resultSet.getString("linkedinUrl"),
                resultSet.getString("portfolioUrl"),
                resultSet.getString("location"),
                resultSet.getString("website"),
                stringList(resultSet.getArray("interests")),
                resultSet.getInt("points"),
                resultSet.getInt("level"),
                stringList(resultSet.getArray("badges")),
                resultSet.getInt("loginStreak"),
                instant(resultSet.getTimestamp("lastStreakDate")),
                resultSet.getInt("followersCount"),
                resultSet.getInt("followingCount"),
                resultSet.getBoolean("isVerified"),
                resultSet.getBoolean("onboardingCompleted"),
                instant(resultSet.getTimestamp("createdAt")),
                instant(resultSet.getTimestamp("updatedAt"))
        );
    }

    private static List<String> stringList(Array sqlArray) throws SQLException {
        if (sqlArray == null) {
            return List.of();
        }
        Object value = sqlArray.getArray();
        if (value instanceof String[] strings) {
            return Arrays.asList(strings);
        }
        Object[] values = (Object[]) value;
        return Arrays.stream(values).map(String::valueOf).toList();
    }

    private static Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}

