package ar.uba.fi.cooperar.shared.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Lets slow work, such as calls to external services, run after the request answers. Spring Boot provides the
 * executor, on virtual threads because {@code spring.threads.virtual.enabled} is on.
 */
@Configuration
@EnableAsync
public class AsyncConfig {}
