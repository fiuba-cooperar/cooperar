package ar.uba.fi.cooperar;

import org.springframework.boot.SpringApplication;

/** Starts the application locally against a throwaway database container: {@code ./gradlew bootTestRun}. */
public class TestCooperarApplication {

    public static void main(String[] args) {
        SpringApplication.from(CooperarApplication::main)
                .with(TestcontainersConfiguration.class)
                .run(args);
    }
}
