# Infrastructure Rules

Цей документ визначає стандартну infrastructure/configuration
організацію для Spring Boot проєктів.

Мета документа --- забезпечити однаковий підхід до: - Spring
configuration; - environment variables; - application profiles; - typed
properties; - bootstrap; - Swagger URL; - Docker; - Docker Compose; -
PostgreSQL networking; - configuration classes.

AI повинен дотримуватися цих правил під час створення нового проєкту або
зміни існуючої infrastructure-конфігурації, якщо поточний проєкт не має
іншого явно зафіксованого стандарту.

---

## Standard Project Infrastructure

Типова структура:

```text
project/
├── docker/
│   ├── docker-compose.yml
│   ├── .env
│   └── .env.example
│
├── src/
│   └── main/
│       ├── java/
│       │   └── .../
│       │       ├── bootstrap/
│       │       │   ├── AppProps.java
│       │       │   └── AppRunner.java
│       │       │
│       │       └── infrastructure/
│       │           └── config/
│       │
│       └── resources/
│           ├── application.properties
│           ├── application-dev.properties
│           └── application-prod.properties
│
├── Dockerfile
└── pom.xml
```

Базовий Spring Boot проєкт повинен мати три application configuration
файли:

```text
application.properties
application-dev.properties
application-prod.properties
```

`application.properties` містить спільну конфігурацію.

`application-dev.properties` містить локальні development-specific
значення.

`application-prod.properties` містить production configuration та
отримує deployment-specific значення через environment variables.

---

# Configuration Organization

## Rule

`infrastructure` містить лише конфігурацію застосунку та інші
infrastructure-specific компоненти відповідно до архітектури проєкту.

Конфігурація розділяється за відповідальністю.

Кожен великий компонент має власний `Configuration` class.

## Examples

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

## AppConfig

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

# Environment Variables

Environment-specific значення та секрети не hardcode-яться в application
code.

Не зберігати у Java-класах:

```text
API keys
passwords
database credentials
production host
production ports
provider secrets
tokens
```

Не використовувати пряме читання environment у business/application
code:

```java
System.getenv(...)
```

Не розкидати environment configuration через окремі `@Value` по
application-коду.

Для application configuration використовуються:

```text
environment
        ↓
application-*.properties
        ↓
@ConfigurationProperties
        ↓
typed properties
        ↓
application
```

---

## Docker Environment Files

Стандарт:

```text
docker/
├── docker-compose.yml
├── .env
└── .env.example
```

### `.env`

Містить реальні environment-specific значення:

```text
API_HOST=...
API_PORT=...
POSTGRES_PORT=...
POSTGRES_DB=...
POSTGRES_USER=...
POSTGRES_PASSWORD=...
```

`.env` завжди залишається локальним та повинен бути в `.gitignore`.

### `.env.example`

Містить лише назви необхідних environment variables або безпечні example
values.

Наприклад:

```text
API_HOST=
API_PORT=
POSTGRES_PORT=
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
```

`.env.example` може і повинен зберігатися в Git, щоб було зрозуміло, які
environment variables потрібні application.

---

# Spring Configuration

Загальна схема:

```text
                    application.properties
                    ├── context-path=/api
                    └── common Spring/JPA config

              ┌──────────────┴──────────────┐

application-dev.properties          application-prod.properties
host=localhost                      host=${API_HOST}
port=8080                           port=${API_PORT}
DB=localhost:${POSTGRES_PORT}       DB=postgres-service:5432
              │                                  │
              └────────── AppProps ──────────────┘
                              │
                         AppRunner
                              │
                              ▼
                   correct Swagger URL
                        printed in logs
```

---

## application.properties

Спільні properties не дублюються між profiles.

Reference example:

```properties
spring.application.name=familymenu-backend

server.forward-headers-strategy=framework
server.servlet.context-path=/api

spring.datasource.driver-class-name=org.postgresql.Driver
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.properties.hibernate.format_sql=true
```

Тут знаходяться properties, однакові для `dev` та `prod`.

Наприклад:

```text
application name
context path
datasource driver
Hibernate dialect
SQL formatting
forward headers strategy
```

---

## application-dev.properties

Development profile призначений для локального запуску application.

Reference example:

```properties
server.port=8080
server.host=localhost

spring.datasource.url=jdbc:postgresql://localhost:${POSTGRES_PORT}/${POSTGRES_DB}
spring.datasource.username=${POSTGRES_USER}
spring.datasource.password=${POSTGRES_PASSWORD}

spring.jpa.hibernate.ddl-auto=validate
```

У development application запускається локально:

```text
Application
    ↓
localhost:${POSTGRES_PORT}
    ↓
PostgreSQL
```

`server.host=localhost` потрібен bootstrap-механізму для побудови
коректного локального Swagger URL.

Development port може бути стабільним локальним default:

```properties
server.port=8080
```

---

## application-prod.properties

Production profile використовується при запуску application через
production Docker Compose.

Reference standard:

```properties
server.port=${API_PORT}
server.host=${API_HOST}

spring.datasource.url=jdbc:postgresql://postgres-familymenu-backend:5432/${POSTGRES_DB}
spring.datasource.username=${POSTGRES_USER}
spring.datasource.password=${POSTGRES_PASSWORD}

spring.jpa.hibernate.ddl-auto=validate
```

Production-specific host та port не hardcode-яться.

Вони надходять із environment:

```text
API_HOST
API_PORT
```

Це забезпечує один source of truth для deployment configuration.

---

# Server Port and Host Convention

`server.port` використовується Spring Boot для фактичного порту
application.

`server.host` --- custom property.

Spring Boot не потребує `server.host` для запуску сервера, але він
використовується нашим bootstrap-механізмом для побудови зовнішньої URL
application та Swagger.

Тому AI не повинен видаляти `server.host` як "unused Spring property".

Логіка:

```text
server.host
server.port
server.servlet.context-path
        │
        ▼
      AppProps
        │
        ▼
     AppRunner
        │
        ▼
Swagger URL
```

---

# Bootstrap

`bootstrap` містить application startup/configuration components, які
потрібні для початкової ініціалізації application.

Reference structure:

```text
bootstrap/
├── AppProps.java
└── AppRunner.java
```

---

## AppProps

Reference implementation:

```java
package com.familymenu.backend.bootstrap;

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

у typed configuration object.

Application code не повинен самостійно читати ці properties із
environment.

---

## AppRunner

Reference implementation:

```java
package com.familymenu.backend.bootstrap;

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

Після startup application автоматично логує правильний Swagger URL.

Development:

```text
http://localhost:8080/api/swagger-ui/index.html
```

Production:

```text
http://<API_HOST>:<API_PORT>/api/swagger-ui/index.html
```

Таким чином URL автоматично залежить від активного Spring profile та
відповідної environment configuration.

---

# Typed Configuration Properties

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

# Docker Compose

Docker Compose використовується для production deployment.

Reference example:

```yaml
networks:
  familymenu-backend-net:

services:
  familymenu-backend:
    build:
      context: ..
      dockerfile: ./Dockerfile
    restart: unless-stopped
    environment:
      SPRING_PROFILES_ACTIVE: prod
      API_HOST: ${API_HOST}
      API_PORT: ${API_PORT}
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

    ports:
      - "${API_PORT}:${API_PORT}"
    networks:
      - familymenu-backend-net
    depends_on:
      - postgres-familymenu-backend

  postgres-familymenu-backend:
    image: postgres:16
    container_name: familymenu-backend-postgres
    restart: unless-stopped
    networks:
      - familymenu-backend-net
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "127.0.0.1:${POSTGRES_PORT}:5432"
    volumes:
      - familymenu-postgres-data:/var/lib/postgresql/data

volumes:
  familymenu-postgres-data:
```

---

## Production Profile

Backend container явно запускається з:

```yaml
SPRING_PROFILES_ACTIVE: prod
```

Docker Compose є production configuration, тому всі environment
variables, необхідні `application-prod.properties`, повинні бути
передані container через `environment`.

Наприклад:

```yaml
environment:
  SPRING_PROFILES_ACTIVE: prod
  API_HOST: ${API_HOST}
  API_PORT: ${API_PORT}
  POSTGRES_DB: ${POSTGRES_DB}
  POSTGRES_USER: ${POSTGRES_USER}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

Не покладатися на випадкову наявність environment variable всередині
container.

---

# API Port: Single Source of Truth

Production API port береться з:

```text
.env
```

Наприклад:

```text
API_PORT=8082
```

Далі:

```text
.env
 │
 └── API_PORT
       │
       ▼
docker-compose
       │
       ├── ports: ${API_PORT}:${API_PORT}
       │
       └── environment: API_PORT=${API_PORT}
                 │
                 ▼
       application-prod.properties
                 │
                 ▼
       server.port=${API_PORT}
                 │
                 ▼
              AppProps
                 │
                 ▼
              AppRunner
                 │
                 ▼
        correct Swagger URL
```

Не допускається ситуація, коли:

```properties
server.port=8082
```

hardcoded у production properties, а Docker Compose незалежно
використовує:

```yaml
"${API_PORT}:${API_PORT}"
```

Це створює два незалежні sources of truth.

Production standard:

```properties
server.port=${API_PORT}
```

---

# PostgreSQL Networking

PostgreSQL у Docker Compose bind-иться тільки на loopback host:

```yaml
ports:
  - "127.0.0.1:${POSTGRES_PORT}:5432"
```

Не використовувати за замовчуванням:

```yaml
ports:
  - "${POSTGRES_PORT}:5432"
```

Причина: другий варіант може опублікувати PostgreSQL port на зовнішніх
network interfaces host machine.

Наш стандарт:

```text
External network
      X
      │
      │ PostgreSQL не публікується напряму
      │
      ▼
127.0.0.1:${POSTGRES_PORT}
      │
      ▼
PostgreSQL container
```

При цьому backend container не використовує host mapping для доступу до
PostgreSQL.

---

## Docker Network Communication

Backend та PostgreSQL знаходяться в одній Docker network:

```yaml
networks:
  familymenu-backend-net:
```

Тому backend звертається до PostgreSQL через Docker DNS за service name:

```text
postgres-familymenu-backend
```

Production datasource:

```properties
spring.datasource.url=jdbc:postgresql://postgres-familymenu-backend:5432/${POSTGRES_DB}
```

Flow:

```text
familymenu-backend
        │
        │ familymenu-backend-net
        ▼
postgres-familymenu-backend:5432
        │
        ▼
     PostgreSQL
```

Тут використовується внутрішній PostgreSQL port:

```text
5432
```

а не `${POSTGRES_PORT}`.

`${POSTGRES_PORT}` потрібен для host-side access.

---

# Development vs Production Database Access

## Development

Application працює безпосередньо на host:

```text
Local Spring Boot
       │
       ▼
localhost:${POSTGRES_PORT}
       │
       ▼
PostgreSQL container
```

Тому:

```properties
spring.datasource.url=jdbc:postgresql://localhost:${POSTGRES_PORT}/${POSTGRES_DB}
```

## Production

Application знаходиться у Docker network:

```text
Backend container
       │
       ▼
postgres-familymenu-backend:5432
       │
       ▼
PostgreSQL container
```

Тому:

```properties
spring.datasource.url=jdbc:postgresql://postgres-familymenu-backend:5432/${POSTGRES_DB}
```

Не використовувати `localhost` для communication між різними containers.

---

# Dockerfile

Reference Dockerfile:

```dockerfile
FROM --platform=linux/amd64 maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /build

COPY pom.xml ./
RUN mvn -X dependency:go-offline

COPY src ./src
RUN mvn clean package -DskipTests


FROM --platform=linux/amd64 eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /build/target/familymenu-backend*jar familymenu-backend.jar

EXPOSE 8082

CMD ["java", "-jar", "familymenu-backend.jar"]
```

---

## Dockerfile Rules

Використовується multi-stage build:

```text
Maven build image
       │
       ▼
build JAR
       │
       ▼
JRE runtime image
```

Build stage:

```dockerfile
FROM --platform=linux/amd64 maven:3.9.9-eclipse-temurin-21 AS build
```

Runtime stage:

```dockerfile
FROM --platform=linux/amd64 eclipse-temurin:21-jre
```

Application використовує Java 21.

Dependencies завантажуються після окремого copy `pom.xml`:

```dockerfile
COPY pom.xml ./
RUN mvn -X dependency:go-offline
```

Після цього копіюється source:

```dockerfile
COPY src ./src
```

Це дозволяє Docker повторно використовувати dependency layer, якщо
`pom.xml` не змінився.

Build:

```dockerfile
RUN mvn clean package -DskipTests
```

Runtime image містить тільки JRE та готовий application JAR, а не Maven
build environment.

---

## EXPOSE and Dynamic Production Port

Reference Family Menu Dockerfile зараз містить:

```dockerfile
EXPOSE 8082
```

Це відповідає поточному production default/reference port.

Водночас фактичний runtime port application визначається:

```properties
server.port=${API_PORT}
```

і Docker Compose:

```yaml
ports:
  - "${API_PORT}:${API_PORT}"
```

Тому `API_PORT` є фактичним source of truth для runtime.

`EXPOSE` є metadata/documentation Docker image і сам по собі не виконує
port publishing.

Якщо стандартний production port проєкту змінюється, reference `EXPOSE`
також слід актуалізувати для консистентності.

---

# Full Configuration Flow

Production:

```text
docker/.env
│
├── API_HOST
├── API_PORT
├── POSTGRES_PORT
├── POSTGRES_DB
├── POSTGRES_USER
└── POSTGRES_PASSWORD
       │
       ▼
docker-compose.yml
       │
       ├── SPRING_PROFILES_ACTIVE=prod
       ├── API_HOST
       ├── API_PORT
       ├── POSTGRES_DB
       ├── POSTGRES_USER
       └── POSTGRES_PASSWORD
       │
       ▼
application-prod.properties
       │
       ├── server.host=${API_HOST}
       ├── server.port=${API_PORT}
       └── datasource=postgres-familymenu-backend:5432
       │
       ▼
Spring Boot
       │
       ├── AppProps
       │      │
       │      ▼
       │   AppRunner
       │      │
       │      ▼
       │   Swagger URL
       │
       └── DataSource
              │
              ▼
      Docker internal network
              │
              ▼
postgres-familymenu-backend:5432
```

Development:

```text
local environment
       │
       ▼
application-dev.properties
       │
       ├── server.host=localhost
       ├── server.port=8080
       └── datasource=localhost:${POSTGRES_PORT}
       │
       ▼
Spring Boot
       │
       ├── AppProps → AppRunner
       │                 │
       │                 ▼
       │      http://localhost:8080/api/swagger-ui/index.html
       │
       └── DataSource
              │
              ▼
       localhost:${POSTGRES_PORT}
              │
              ▼
       PostgreSQL container
```

---

# AI Implementation Rules

Під час створення або зміни infrastructure AI повинен:

1. Спочатку перевірити існуючу configuration structure.
2. Не змінювати цей infrastructure standard без окремої причини та
   погодження.
3. Зберігати common properties у `application.properties`.
4. Зберігати local development configuration у
   `application-dev.properties`.
5. Зберігати production configuration у `application-prod.properties`.
6. Production-specific host, port, credentials та secrets отримувати
   через environment.
7. Не hardcode-ити production IP/host.
8. Не hardcode-ити production API port, якщо він керується через
   `${API_PORT}`.
9. Передавати необхідні production environment variables у backend
   container через Docker Compose.
10. Використовувати `SPRING_PROFILES_ACTIVE=prod` для production Docker
    Compose.
11. Не використовувати `localhost` для communication між containers.
12. Для Docker-to-Docker communication використовувати Docker service
    name.
13. PostgreSQL host mapping bind-ити до `127.0.0.1`, якщо немає окремої
    вимоги зробити database externally accessible.
14. Не давати business/application code прямий доступ до
    `System.getenv`.
15. Не розкидати `@Value` для configuration по application-коду.
16. Використовувати typed `@ConfigurationProperties`.
17. Не видаляти `server.host`: це custom property, необхідний
    `AppRunner`.
18. Підтримувати `AppRunner`, щоб після startup логувався правильний
    Swagger URL.
19. Розділяти великі configuration areas на окремі `Configuration`
    classes.
20. Використовувати `AppConfig` тільки для невеликих generic/local Bean.
21. Не дозволяти `AppConfig` перетворюватися на God Configuration.
22. Використовувати Java 21 Docker images для Java 21 application.
23. Використовувати multi-stage Docker build.
24. Не додавати `.env` у Git.
25. Підтримувати `.env.example` з переліком необхідних variables без
    секретів.

---

# Core Principle

Infrastructure configuration повинна мати чіткий flow:

```text
Environment
    ↓
Spring properties
    ↓
Typed @ConfigurationProperties
    ↓
Application / Infrastructure components
```

Production deployment:

```text
.env
 ↓
Docker Compose
 ↓
application-prod.properties
 ↓
Spring Boot
```

Development:

```text
local environment
 ↓
application-dev.properties
 ↓
Spring Boot
```

Docker networking:

```text
Host access
    ↓
127.0.0.1:${POSTGRES_PORT}

Container access
    ↓
postgres-service:5432
```

Swagger bootstrap:

```text
server.host
+
server.port
+
server.servlet.context-path
        ↓
      AppProps
        ↓
     AppRunner
        ↓
correct Swagger URL in startup logs
```

Головний принцип:

> **Environment визначає deployment-specific values, Spring properties
> описують configuration, typed properties доставляють її в application,
> а infrastructure/config відповідає за створення та налаштування
> технічних компонентів.**