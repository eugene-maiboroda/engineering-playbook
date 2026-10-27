# Infrastructure Code and Bootstrap

Правила написання infrastructure-коду: configuration classes, bean wiring,
bootstrap та typed `@ConfigurationProperties`. Налаштування значень у
`application*.properties`, Docker Compose, `.env` і запуск prod/dev описані
окремо в [Dev and Prod Environments](environments.md).

Застосовуй разом із погодженою архітектурою та
[Java Code Style](project-conventions.md#agreed-java-code-style).

## Configuration Organization

### Rule

`infrastructure` містить лише конфігурацію застосунку та інші
infrastructure-specific компоненти відповідно до архітектури проєкту.

Конфігурація розділяється за відповідальністю.

Кожен великий компонент має власний `Configuration` class.

### Examples

Добре:

```text
PlaywrightConfig
StorageConfig
SecurityConfig
DatabaseConfig
RetryConfig
MessagingConfig
```

Кожен із них містить лише конфігурацію відповідного компонента.

Наприклад:

```text
infrastructure/
└── config/
    ├── PlaywrightConfig.java
    ├── StorageConfig.java
    ├── DatabaseConfig.java
    └── MessagingConfig.java
```

Не створювати один великий configuration class, який конфігурує всі
підсистеми application.

---

### AppConfig

Для невеликих локальних Bean, які використовуються лише в одному проєкті
та не потребують окремих налаштувань, використовується `AppConfig`.

Наприклад:

- `ObjectMapper`
- `RestClient`
- `ExecutorService`
- `Clock`
- `Validator`

`AppConfig` не повинен перетворюватися на **God Configuration**.

Якщо кількість Bean починає суттєво зростати або вони відносяться до
окремої підсистеми --- вони виносяться у власний `Configuration` class.

---

## Configuration Values and Typed Access

Environment-specific значення та секрети не hardcode-яться у Java-коді:
API keys, passwords, database credentials, deployment hosts/ports та tokens
надходять через environment і Spring properties. Business/application code
не читає `System.getenv(...)` напряму й не використовує розкидані `@Value`.

```text
Environment → application-*.properties → @ConfigurationProperties
            → application components / infrastructure bean wiring
```

Typed properties розміщуй у `bootstrap/properties/`.

## Application Entry Point

У новому проєкті додай `@ConfigurationPropertiesScan` поруч із
`@SpringBootApplication` на головному Application-класі. Використовуй
імпорт `org.springframework.boot.context.properties.ConfigurationPropertiesScan`.
Розташуй Application-клас у кореневому package, однаковому з groupId,
щоб properties у його підпакетах потрапляли в scan. Не додавай зайвий
package-рівень лише через artifactId.

```java
package com.familymenu;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class FamilymenuBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(FamilymenuBackendApplication.class, args);
    }
}
```

Підстав назви поточного проєкту. Якщо properties розташовані поза
кореневим package, явно задай область scan. У наявному проєкті перевір
чинну реєстрацію через scan або `@EnableConfigurationProperties` перед
змінами; не додавай дублюючу реєстрацію. Перевір binding properties
під час погодженої перевірки запуску; сам успішний compile не підтверджує binding.

## Typed Configuration Properties

Для окремих configuration областей створюються невеликі typed
`@ConfigurationProperties` classes/records.

Наприклад:

```java
@ConfigurationProperties(prefix = "browser")
public record BrowserProperties(

        boolean headless,

        int timeout,

        int retries,

        String userAgent
) {}
```

Якщо є окрема configuration область:

```text
browser
storage
retry
export
messaging
security
```

вона повинна мати власний properties object, якщо це виправдано її
розміром та відповідальністю.

Не створювати один глобальний properties class для всіх application
settings.

---

## Startup URL Contract

`AppProps` зв'язує `server.host`, `server.port` і `server.servlet.context-path`;
`AppRunner` використовує їх для startup Swagger URL. Не видаляй `server.host`
як «unused Spring property»: це custom metadata для bootstrap.
Значення портів, host і proxy configuration задаються в
[Environments — API Port and Host](environments.md#api-port-and-host).

Приклад нижче показує прямий HTTP-доступ. За reverse proxy генерацію URL
потрібно узгодити із зовнішніми scheme/host/port; не оголошуй внутрішню
HTTP-адресу правильною публічною HTTPS-адресою.

## Bootstrap

`bootstrap` містить application startup/configuration components, які
потрібні для початкової ініціалізації application.

Reference structure:

```text
bootstrap/
├── AppProps.java
└── AppRunner.java
```

---

### AppProps

Reference implementation:

```java
package com.example.backend.bootstrap;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "server")
public class AppProps {

    private String host;
    private int port;
    private Servlet servlet;

    @Getter
    @Setter
    public static class Servlet {
        private String contextPath;
    }
}
```

`AppProps` збирає:

```text
server.host
server.port
server.servlet.context-path
```

у typed configuration object. Application code отримує ці значення через
`AppProps`, а не читає environment самостійно.

---

### AppRunner

Reference implementation:

```java
package com.example.backend.bootstrap;

import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AppRunner implements ApplicationRunner {

    private static final String URL_TEMPLATE =
            "http://%s:%d%s/swagger-ui/index.html";

    private final AppProps appProps;

    @Override
    public void run(@NonNull ApplicationArguments args) {
        log.info(
                "Swagger UI available at {}",
                String.format(
                        URL_TEMPLATE,
                        appProps.getHost(),
                        appProps.getPort(),
                        appProps.getServlet().getContextPath()
                )
        );
    }
}
```

### Swagger URL Substitution

Після startup `AppRunner` автоматично логує Swagger URL з налаштувань
активного Spring profile. Значення підставляються в шаблон у такому порядку:

```text
http://%s:%d%s/swagger-ui/index.html
       │  │ └── server.servlet.context-path
       │  └──── server.port
       └─────── server.host
```

Наприклад, для dev зі значеннями `server.host=localhost`, `server.port=12200`
і `server.servlet.context-path=/api/v1` у логах буде:

```text
http://localhost:12200/api/v1/swagger-ui/index.html
```

Для prod із `server.host=${API_HOST}`, `server.port=${API_PORT}` і тим самим
context path результат має вигляд:

```text
http://<API_HOST>:<API_PORT>/api/v1/swagger-ui/index.html
```

`API_HOST` у цьому шаблоні містить лише hostname/IP, без `http://`, порту
або шляху. Context path підставляється один раз, із початковим `/` і без
кінцевого `/`. Якщо application працює без context path, використовуй
порожнє значення. Не hardcode-и host, port чи context path у `AppRunner`.

Таким чином посилання автоматично відповідає активному profile та його
environment configuration. При зміні порту або context path не потрібно
редагувати Java-код. Для публічного HTTPS URL за reverse proxy застосовуй
узгодження, описане в [Startup URL Contract](#startup-url-contract).

## Before Implementation

1. Перевір наявні configuration classes, bootstrap та спосіб реєстрації properties.
2. Повторно використай існуючі компоненти; не додавай дублюючі beans.
3. Розділяй configuration за відповідальністю, без business logic у wiring.
4. Перевір binding properties, створення beans та коректність startup URL.
5. Дотримуйся [Testing Policy](../../../ai-rules/testing-policy.md).
