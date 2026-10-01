# syntax=docker/dockerfile:1
FROM eclipse-temurin:17-jdk AS build-env
WORKDIR /app
COPY .mvn .mvn
COPY mvnw .
COPY pom.xml .
# Keep downloaded dependencies in this builder stage so Jenkins can run Maven
# in a disposable container without requiring Java/Maven on the controller.
RUN ./mvnw -B -ntp dependency:go-offline
COPY src ./src

FROM build-env AS build
RUN ./mvnw -B -ntp verify

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
RUN useradd --system --user-group spring
COPY --from=build --chown=spring:spring /app/target/backend-spring-*.jar app.jar
USER spring
ENV PORT=3001
ENV NODE_ENV=production JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60.0 -XX:+ExitOnOutOfMemoryError"
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl --fail --silent "http://127.0.0.1:${PORT}/api/v2/actuator/health/readiness" > /dev/null || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
