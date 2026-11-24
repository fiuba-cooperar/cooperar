package ar.uba.fi.cooperar.shared.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Counts every search of the catalog and of the directory of organizations against the address that made it. */
@Configuration
public class SearchRateLimitConfig implements WebMvcConfigurer {

    // Optional so a slice test of one controller, which does not load the limiter, still starts.
    private final ObjectProvider<SearchRateLimiter> limiter;

    public SearchRateLimitConfig(ObjectProvider<SearchRateLimiter> limiter) {
        this.limiter = limiter;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        limiter.ifAvailable(searches -> registry.addInterceptor(new HandlerInterceptor() {
                    @Override
                    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                        if (HttpMethod.GET.matches(request.getMethod())) {
                            searches.acquire(request.getRemoteAddr());
                        }
                        return true;
                    }
                })
                // Exactly these two paths: the detail of a product or of an organization is not a search.
                .addPathPatterns("/api/products", "/api/organizations"));
    }
}
