package ar.uba.fi.cooperar.integration.nominatim;

import ar.uba.fi.cooperar.service.organizations.Geocoder;
import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(NominatimProperties.class)
class NominatimConfig {

    // The address is looked up while the request is open, so a slow server must not hold it for long.
    private static final Duration TIMEOUT = Duration.ofSeconds(3);

    @Bean
    Geocoder geocoder(NominatimProperties properties) {
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(TIMEOUT).build());
        requestFactory.setReadTimeout(TIMEOUT);
        return new NominatimGeocoder(RestClient.builder()
                .baseUrl(properties.url().toString())
                .defaultHeader(HttpHeaders.USER_AGENT, properties.userAgent())
                .requestFactory(requestFactory)
                .build());
    }
}
