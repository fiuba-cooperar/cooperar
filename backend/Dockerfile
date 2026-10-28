# Build: produce the jar with the Gradle wrapper (tests run in CI, not here).
FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /workspace
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN ./gradlew --no-daemon dependencies > /dev/null
COPY src src
RUN ./gradlew --no-daemon bootJar \
    && java -Djarmode=tools -jar build/libs/cooperar-*.jar extract --layers --launcher --destination extracted

# Runtime: JRE only, unprivileged user and split layers for better caching.
FROM eclipse-temurin:25-jre-alpine
RUN addgroup -S cooperar && adduser -S cooperar -G cooperar
USER cooperar
WORKDIR /app
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=5 \
    CMD wget -qO- http://localhost:8080/actuator/health/readiness || exit 1
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
