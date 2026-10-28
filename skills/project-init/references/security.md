# Базове session security

## Створи основу

За features.security=true додай `spring-boot-starter-security`.
Використовуй form login і серверну HTTP-сесію, без JWT, Bearer tokens,
OAuth2/resource-server або власної таблиці користувачів.

Відтвори перевірену структуру Family Menu:

- `security/SecurityConfig.java` — `@Configuration(proxyBeanMethods = false)`,
  beans SecurityFilterChain, PasswordEncoder, UserDetailsService;
- `security/CsrfController.java` — GET `/auth/csrf`, відповідь record
  `CsrfResponse(String headerName, String token)` з CsrfToken.getHeaderName()
  і getToken(); не повертай ім’я користувача або credentials;
- `bootstrap/properties/AuthProps.java` — record з `@ConfigurationProperties(prefix = "app.auth")`,
  поля `String username`, `String passwordHash`. Використовуй погоджений
  для skeleton package properties й root package, не копіюй backend.props
  hierarchy з Family Menu механічно.

Реєструй AuthProps через ConfigurationPropertiesScan головного Application
за infrastructure.md. У Family Menu є EnableConfigurationProperties(AuthProps.class);
не додавай обидва способи реєстрації до нового skeleton.

## Налаштуй authentication

Використовуй BCryptPasswordEncoder та InMemoryUserDetailsManager з одним
користувачем із AuthProps і роллю ADMIN. Порожній/blank username або
passwordHash відхиляй при запуску через IllegalStateException; не задавай
вбудований пароль або автоматичний fallback. Передавай збережений BCrypt
hash у User.withUsername(username).password(passwordHash).roles("ADMIN").build();
не хешуй повторно вже хешований пароль.

У SecurityFilterChain застосуй:

- cors(Customizer.withDefaults()); це не дозвіл усіх origins. Не вигадуй
  allowlist або додаткові CORS правила без заданої конфігурації;
- `/actuator/health` і `/auth/csrf` — permitAll;
- будь-який інший request — authenticated;
- formLogin із permitAll і JSON failure handler;
- authenticationEntryPoint — 401, accessDeniedHandler — 403 через спільний
  ErrorResponseWriter. Не створюй інший JSON-контракт лише для security.

Не вимикай CSRF й не перемикай policy на stateless. CSRF token із
`/auth/csrf` клієнт використовує разом із cookie сесії для захищених
state-changing requests. Цей CSRF token не є access token. Збережи
стандартні form-login/session механізми Spring; не додавай власний login
controller, JWT endpoint або public Swagger matcher без окремого рішення.

## Передай credentials через environment

Задай спільні properties:

```properties
app.auth.username=${APP_ADMIN_USERNAME}
app.auth.password-hash=${APP_ADMIN_PASSWORD_HASH}
```

Використовуй ці самі APP_ADMIN_* names для всіх проєктів; назву проєкту
не підставляй. Пароль надходить лише як BCrypt hash.
У dev/prod Compose передай відповідні variables до backend. У локальних
.env зберігай лише явно надані користувачем значення; у .env.example —
placeholder без реального логіна, пароля чи хеша. Застосуй правила
[environments.md](environments.md) для буквальних `$` у BCrypt hash,
Compose interpolation і розділення dev/prod. Не читай реальні .env заради
прикладу, не логуй credentials і не копіюй секрети вихідного проєкту.

## Застосуй спільний error handler

Використовуй контракт [error-handling.md](error-handling.md#spring-security-integration):
`writeError(response, status, code, message)`. Передавай стабільні коди
AUTHENTICATION_REQUIRED, ACCESS_DENIED та INVALID_CREDENTIALS і безпечні
повідомлення для клієнта. Не передавай exception або назву його Java-класу
в JSON замість коду. Використовуй той самий writer для security й REST API.

## Збережи структуру коду за прикладом

Використовуй окремі bean methods, як нижче. Підстав кореневий package
поточного проєкту. Не збирай створення користувача, encoder і policy в
один довгий SecurityFilterChain method.

### SecurityConfig.java

```java
package com.example.security;

import com.example.bootstrap.properties.AuthProps;
import com.example.shared.api.web.mappers.ErrorResponseWriter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration(proxyBeanMethods = false)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            ErrorResponseWriter errorResponseWriter
    ) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/auth/csrf").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) ->
                                errorResponseWriter.writeError(
                                        response,
                                        HttpStatus.UNAUTHORIZED,
                                        "AUTHENTICATION_REQUIRED",
                                        "Authentication is required"))
                        .accessDeniedHandler((request, response, exception) ->
                                errorResponseWriter.writeError(
                                        response,
                                        HttpStatus.FORBIDDEN,
                                        "ACCESS_DENIED",
                                        "Access is denied or CSRF token is invalid")))
                .formLogin(form -> form
                        .permitAll()
                        .failureHandler((request, response, exception) ->
                                errorResponseWriter.writeError(
                                        response,
                                        HttpStatus.UNAUTHORIZED,
                                        "INVALID_CREDENTIALS",
                                        "Invalid username or password")));

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService(AuthProps properties) {
        String username = properties.username();
        String passwordHash = properties.passwordHash();

        if (username == null || username.isBlank()) {
            throw new IllegalStateException("Authentication username is required");
        }

        if (passwordHash == null || passwordHash.isBlank()) {
            throw new IllegalStateException("Authentication password hash is required");
        }

        UserDetails admin = User.withUsername(username)
                .password(passwordHash)
                .roles("ADMIN")
                .build();

        return new InMemoryUserDetailsManager(admin);
    }
}
```

Перевір фактичне розташування ErrorResponseWriter і виправ import під
структуру проєкту, зберігши його погоджений API. Не створюй дубль writer.
AuthProps реєструється Application-класом через ConfigurationPropertiesScan.

### CsrfController.java

```java
package com.example.security;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CsrfController {

    @GetMapping("/auth/csrf")
    public CsrfResponse getCsrfToken(CsrfToken csrfToken) {
        return new CsrfResponse(
                csrfToken.getHeaderName(),
                csrfToken.getToken()
        );
    }

    public record CsrfResponse(String headerName, String token) {
    }
}
```

Це CSRF controller. CORS інтеграція в SecurityConfig — окреме налаштування
`.cors(Customizer.withDefaults())`. Не додавай довільний CORS controller
або allow-all origins: дозволені origins/credentials задай лише за
вимогами конкретного клієнта.

### AuthProps.java

```java
package com.example.bootstrap.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth")
public record AuthProps(

        String username,

        String passwordHash
) {
}
```

## Перевір результат

Перевір compilation і properties binding; переконайся, що credentials
відсутні у коді й tracked env-файлах. Якщо дозволена перевірка запуску,
перевір 401 без authentication, login failure, успішну session login,
отримання CSRF token і відмову в state-changing request без нього.
Не створюй нових автоматизованих тестів без запиту. Запиши фактичні
перевірки й неперевірене в progress, поверни результат у Project Init.
