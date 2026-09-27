package com.example.modauth.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.GlobalOpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Adds a "bearerAuth" security scheme (Authorization: Bearer &lt;token&gt;) via
 * springdoc's {@link GlobalOpenApiCustomizer} extension point, additively —
 * gen-auth-starter's own {@code OpenApiConfig} already provides the base
 * {@code OpenAPI} bean (title, servers, cookieAuth/internalSecret schemes);
 * defining a second {@code @Bean OpenAPI} here would conflict with it, so
 * this customizer merges into that same bean instead. Used by the endpoints
 * this module adds, which — like the starter's own — accept the JWT as
 * either a cookie or an Authorization header.
 */
@Configuration
public class ModAuthOpenApiConfig {

    @Bean
    public GlobalOpenApiCustomizer bearerAuthSchemeCustomizer() {
        return openApi -> {
            if (openApi.getComponents() == null) {
                openApi.setComponents(new Components());
            }
            openApi.getComponents().addSecuritySchemes("bearerAuth", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("Paste the accessToken from /api/v1/modauth/login (json delivery mode) here"));
        };
    }
}
