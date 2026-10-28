# Dev and Prod Environments

Стандарт окремих середовищ для backend-проєктів на основі WhatsApp Midwives.
Налаштування середовищ: `application*.properties`, Docker Compose, `.env`,
Dockerfile та запуск prod/dev. Код configuration classes, bean wiring,
bootstrap і typed properties описано в [Infrastructure (infrastructure.md)](infrastructure.md).
Застосовуй, якщо проєкт не має іншого явно погодженого стандарту.

## Core Rule

Створи prod foundation. Docker dev додавай лише за features.devEnvironment=true;
усі три application*.properties створюй незалежно від цієї опції.
Production завжди містить backend і PostgreSQL через Docker Compose.
Окреме Docker dev з backend і власною БД додавай лише за запитом.
Якщо доручено зміну наявного prod або додавання dev, підготуй лише погоджене перенесення,
зберігаючи дані, ідентичність Docker resources та погоджені runtime contracts.
Зміна production deployment виконується окремо після перевірки конфігурації.

Dev і prod мають окремі Compose project names, services, networks, volumes,
БД, credentials, API/DB host ports та integration configuration.
Dev не використовує production database або production credentials.

## Structure

```text
project/
├── Dockerfile
├── .dockerignore
├── docker/
│   ├── docker-compose.yml       # prod, завжди
│   ├── .env                     # локальний, без вбудованих секретів
│   ├── .env.example
│   └── dev/                     # лише features.devEnvironment=true; prod переноситься в prod/
│       ├── docker-compose.yml
│       ├── .env
│       └── .env.example
├── sql/
│   └── sql-init.sql
└── src/main/resources/
    ├── application.properties
    ├── application-prod.properties
    └── application-dev.properties
```

Якщо `features.devEnvironment=true`, створи симетричні
`docker/prod/{docker-compose.yml,.env,.env.example}` і
`docker/dev/{docker-compose.yml,.env,.env.example}`, як у WhatsApp Midwives.
Prod-файли з дерева вище перенеси в `docker/prod`, не дублюй їх у `docker/`.
Обидва Compose тоді мають `build.context: ../..`. У README, env paths,
.gitignore та командах використовуй саме ці шляхи. Якщо опція false,
залиш prod у `docker/`, без dev Compose.

Завжди створюй усі три properties. Наявність dev profile не означає
створення dev Compose або другої БД: їх додавай лише за обраної опції.
За відсутності Docker dev запуск dev profile потребує явно заданої
локальної БД; не підставляй production credentials як fallback.

Реальні `.env` локальні та ignored; `.env.example` містять лише безпечні
приклади та зберігаються в Git як перелік потрібних змінних.
У вихідному проєкті env examples відсутні, тому це доповнення
до reusable стандарту, а не копія його секретів.

```gitignore
/docker/.env
/docker/dev/.env
/docker/prod/.env
```

У `.dockerignore` виключи `.git`, `target`, IDE-файли та реальні env-файли.
Не включай секрети в image через `COPY . .`.

## Names and Resource Identity

На початку кожного Compose обов'язково задавай top-level `name`.
Для нового проєкту використовуй `<project>-prod` і `<project>-dev`.
Dev також має явний `-dev` у service, network і volume keys, як у reference.
Окремий `container_name` не потрібний: Compose сам іменує контейнери.

У WhatsApp Midwives dev має `name: whatsapp-midwives-dev`, а prod —
історичний `name: docker`. Prod services та volume також мають історичні
імена. Це compatibility constraint, а не назви для копіювання в нові проєкти.

Project name входить у фактичні імена Compose volumes/networks. Перед
перенесенням чинного prod зафіксуй project name, service keys, фактичні volume
names, mount paths, порти та branch/checkout. Не перейменовуй їх механічно:
новий volume може виглядати як втрата даних. Збережи існуючу ідентичність
або підготуй явну перевірену міграцію з backup та rollback.

## Compose Examples

`sample` — placeholder назви проєкту, не готовий service name для копіювання.
Обидва файли самодостатні; prod не є base-файлом для dev overrides.

### docker/docker-compose.yml

```yaml
name: sample-prod

networks:
  sample-prod-net:

services:
  sample-backend-prod:
    build:
      context: ..
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      SPRING_PROFILES_ACTIVE: prod
      FRONTEND_URL: ${FRONTEND_URL}
      API_HOST: ${API_HOST}
      API_PORT: ${API_PORT}
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "${API_PORT}:${API_PORT}"
    networks:
      - sample-prod-net
    depends_on:
      postgres-sample-prod:
        condition: service_healthy

  postgres-sample-prod:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "127.0.0.1:${POSTGRES_PORT}:5432"
    networks:
      - sample-prod-net
    volumes:
      - sample-postgres-prod-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \"$$POSTGRES_USER\" -d \"$$POSTGRES_DB\""]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

volumes:
  sample-postgres-prod-data:
```

### docker/dev/docker-compose.yml

```yaml
name: sample-dev

networks:
  sample-dev-net:

services:
  sample-backend-dev:
    build:
      context: ../..
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      SPRING_PROFILES_ACTIVE: dev
      FRONTEND_URL: ${FRONTEND_URL}
      API_HOST: ${API_HOST}
      API_PORT: ${API_PORT}
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "${API_PORT}:${API_PORT}"
    networks:
      - sample-dev-net
    depends_on:
      postgres-sample-dev:
        condition: service_healthy

  postgres-sample-dev:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "127.0.0.1:${POSTGRES_PORT}:5432"
    networks:
      - sample-dev-net
    volumes:
      - sample-postgres-dev-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \"$$POSTGRES_USER\" -d \"$$POSTGRES_DB\""]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

volumes:
  sample-postgres-dev-data:
```

Production `context: ..` рахується від docker/docker-compose.yml,
а dev `context: ../..` — від docker/dev/docker-compose.yml; обидва
вказують на корінь репозиторію.
За layout `docker/prod` зміни prod context на `../..`.
Обидва середовища використовують один Dockerfile.

Профіль у reusable прикладі зафіксований у відповідному Compose, щоб dev
не піднявся як prod через помилкове env-значення. У WhatsApp Midwives він
заданий як `${SPRING_PROFILES_ACTIVE:-dev}` / `${SPRING_PROFILES_ACTIVE:-prod}`;
якщо зберігаєш цей варіант, перевір відповідність env та Compose перед запуском.

`depends_on: service_healthy` чекає readiness PostgreSQL перед стартом
backend, але не перевіряє наявність schema чи завершення migrations.
`$$` у healthcheck залишає `$` для shell усередині контейнера.

У Compose передавай звичайні значення як `${VARIABLE}`, без `${VARIABLE:?…}`
або `${VARIABLE?…}` і тексту `Set VARIABLE`. Для справді optional значень
застосовуй `${FLAG:-true}` / `${FLAG:-false}` або `${VALUE:-}`; конкретний
безпечний default визначає відповідна опція. Не додавай чужі dashboard,
JWT чи інтеграційні поля з прикладу проєкту до базового skeleton.

## Environment Examples

Передай FRONTEND_URL у backend environment та .env.example для кожного
обраного Docker-середовища за [cors.md](cors.md). Лише за security=true
додай APP_ADMIN_USERNAME і APP_ADMIN_PASSWORD_HASH до backend environment
і .env.example; значення hash передавай буквально за правилами нижче.
Без security ці поля не додавай. У application.properties auth.* додавай
також лише за security=true.


`docker/.env.example` (або `docker/prod/.env.example` за Docker dev):

```dotenv
FRONTEND_URL=https://frontend.example.com
API_HOST=api.example.com
API_PORT=12199
POSTGRES_PORT=5440
POSTGRES_DB=sample_prod
POSTGRES_USER=sample_prod
POSTGRES_PASSWORD=replace-with-unique-prod-password
```

`docker/dev/.env.example`:

```dotenv
FRONTEND_URL=http://localhost:3000
API_HOST=localhost
API_PORT=12200
POSTGRES_PORT=5441
POSTGRES_DB=sample_dev
POSTGRES_USER=sample_dev
POSTGRES_PASSWORD=replace-with-unique-dev-password
```

Лише за features.security=true додай до `environment` backend у
`docker/docker-compose.yml` та, якщо створено, `docker/dev/docker-compose.yml`:

```yaml
      APP_ADMIN_USERNAME: ${APP_ADMIN_USERNAME}
      APP_ADMIN_PASSWORD_HASH: ${APP_ADMIN_PASSWORD_HASH}
```

У відповідні `.env.example` додай:

```dotenv
APP_ADMIN_USERNAME=replace-with-admin-username
APP_ADMIN_PASSWORD_HASH='replace-with-bcrypt-hash'
```

Placeholder не є валідним BCrypt hash. Перед реальним запуском користувач
задає окремі значення для середовищ. Зберігай BCrypt `$` буквально,
не виконуй повторну interpolation через копіювання hash у Compose YAML.
У `application.properties` лише за цієї опції додай:

```properties
app.auth.username=${APP_ADMIN_USERNAME}
app.auth.password-hash=${APP_ADMIN_PASSWORD_HASH}
```

Порти наведено за розділенням у reference, а не як глобально обов'язкові числа.
На shared server перевір відсутність конфліктів. Для remote dev `API_HOST`
має відповідати зовнішньому dev hostname.

`.env` використовується Compose для interpolation, але не передає всі
значення в container автоматично. Кожне потрібне application значення
додай у `environment` backend service. Shell environment може перевизначати
значення з `--env-file`; перевір джерело змінних перед deployment.

Secrets із `$`, наприклад password hashes, оформлюй single-quoted у `.env`,
щоб уникнути ненавмисної interpolation. Не копіюй реальні ключі в Playbook.

## Application Properties

Спільні властивості — в `application.properties`:

```properties
spring.application.name=sample
server.servlet.context-path=/api/v1
spring.jpa.open-in-view=false
spring.jpa.properties.hibernate.jdbc.time_zone=UTC
spring.sql.init.mode=never
```

Не додавай до нового skeleton `server.error.include-message`,
`server.error.include-stacktrace` та `server.error.include-binding-errors`.
Не замінюй їх механічно на явні default `spring.web.error.*`: для базового
create ці три налаштування не потрібні. Безпечний HTTP error contract
забезпечуй за [error-handling.md](error-handling.md).

Спільні properties не дублюються між profiles. Application name, context path,
datasource driver/dialect, SQL logging/formatting і proxy headers strategy
розміщуються у common properties, якщо однакові в обох середовищах.
Значення адаптуй до фактичного проєкту. Production Compose явно задає
SPRING_PROFILES_ACTIVE=prod. Dev profile використовуй для IDE/локальної
БД або optional Docker dev; не запускай його з production credentials.

`application-prod.properties`:

```properties
server.port=${API_PORT}
server.host=${API_HOST}
spring.datasource.url=jdbc:postgresql://postgres-sample-prod:5432/${POSTGRES_DB}
spring.datasource.username=${POSTGRES_USER}
spring.datasource.password=${POSTGRES_PASSWORD}
spring.jpa.hibernate.ddl-auto=validate
```

`application-dev.properties` за `features.devEnvironment=true`:

```properties
server.port=${API_PORT}
server.host=${API_HOST}
spring.datasource.url=jdbc:postgresql://postgres-sample-dev:5432/${POSTGRES_DB}
spring.datasource.username=${POSTGRES_USER}
spring.datasource.password=${POSTGRES_PASSWORD}
spring.jpa.hibernate.ddl-auto=validate
```

За `features.devEnvironment=false` створи `application-dev.properties`
саме для backend із IDE та окремої локальної PostgreSQL:

```properties
server.port=8080
server.host=localhost

spring.datasource.url=jdbc:postgresql://localhost:${POSTGRES_PORT}/${POSTGRES_DB}
spring.datasource.username=${POSTGRES_USER}
spring.datasource.password=${POSTGRES_PASSWORD}

spring.jpa.hibernate.ddl-auto=validate
```

У цьому сценарії не використовуй `${API_PORT}`, `${API_HOST}` або
`${POSTGRES_HOST}` у dev profile. POSTGRES_PORT — опублікований host port
окремої локальної БД, наприклад 5441/5442/5443; користувач обирає вільний
порт і запускає PostgreSQL сам, зокрема через Docker. Не запускай БД
автоматично й не генеруй Docker dev без обраної опції. Передай DB credentials
і FRONTEND_URL у Run Configuration IDE; Compose `.env` сам по собі Spring
з IDE не завантажує. Не використовуй prod credentials чи prod env-file.
`server.host` не є bind address. `server.address=0.0.0.0` додавай лише за
потреби доступу з інших машин, не як обов’язкову властивість локального dev.

Backend у контейнері використовує service DNS та внутрішній порт `5432`.
`POSTGRES_PORT` потрібний лише для доступу з host; БД публікується на
loopback. Dev і prod — два PostgreSQL services з окремими volumes, а не
дві schema в одній спільній production database.

За `features.devEnvironment=true` локальний IDE-запуск — додатковий режим, не заміна dev Compose. Запусти
тільки dev DB, передай dev credentials і явно перевизнач datasource URL
через `SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5441/sample_dev`.
Не змінюй container hostname у спільному dev profile заради IDE.

`ddl-auto=validate` не створює schema. У reference SQL bootstrap/migrations
застосовуються окремо, `spring.sql.init.mode=never`. В інших проєктах
використовуй погоджений migration tool. Нову dev DB ініціалізуй до старту
backend; для prod зміни schema потребують backup і плану відновлення.
Зміна `POSTGRES_DB/USER/PASSWORD` у env не перестворює користувачів і базу
в уже ініціалізованому PostgreSQL volume — потрібна явна DB-операція.

## API Port and Host

### API Port: Single Source of Truth

Production API port береться з `docker/.env` або `docker/prod/.env`,
якщо обрано Docker dev. Приклад ланцюжка нижче показує перший layout.
Наприклад:

```dotenv
API_PORT=8082
```

Повний ланцюжок передачі значення:

```text
docker/.env
 │
 └── API_PORT=8082
       │
       ▼
docker/docker-compose.yml
       │
       ├── ports: ${API_PORT}:${API_PORT}
       │
       └── environment: API_PORT=${API_PORT}
                 │
                 ▼
       application-prod.properties
                 │
                 └── server.port=${API_PORT}
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

Compose використовує те саме значення для публікації порту та передачі
`API_PORT` у backend container. Spring підставляє його в `server.port`,
`AppProps` читає налаштований порт, а `AppRunner` використовує його
разом із host і context path для Swagger URL.

У container prod/dev profile не допускається незалежний hardcoded порт:

```properties
server.port=8082
```

Якщо Compose читає `API_PORT` із `.env`, а properties містять окреме число,
зміна `.env` оновить port mapping, але application може продовжити слухати
старий порт. Це створює два sources of truth та неузгоджений Swagger URL.

Правильно:

```properties
server.port=${API_PORT}
```

Те саме правило діє для Docker dev через `docker/dev/.env` та dev Compose.
Для локального dev без Docker dev застосуй виняток вище: `server.port=8080`
і `server.host=localhost`, незалежно від production API port.
`server.port` керує портом сервера; `server.host` — custom metadata для URL,
а не bind address. Приклади вище припускають однаковий host/container API port,
як у стандартних Compose цього документа.

За reverse proxy узгодь зовнішні scheme/host/port та forwarded headers
strategy з deployment. Код читання цих properties і startup URL описано
в [Infrastructure — Startup URL Contract (infrastructure.md)](infrastructure.md#startup-url-contract).

## Integrations and External Effects

WhatsApp Midwives окремо передає dashboard auth/JWT, frontend URL/CORS,
AI provider, messaging/webhook та payment configuration через environment.
Для іншого проєкту зберігай принцип, а не копіюй його providers і business settings.

- Dev/prod мають окремі credentials, frontend URLs, callback/webhook URLs.
- Dev використовує sandbox/test integrations або вимикає зовнішні ефекти
  погодженими flags. Не надсилай реальні повідомлення та платежі з dev.
- Feature flags передаються явно в Compose; безпечний default для
  необов'язкових зовнішніх ефектів — вимкнено. Це не вимикає schedulers
  автоматично: перевір кожен реальний механізм запуску.
- Dev не означає вимкнення authentication; доступ і CORS налаштовуються
  окремо для потрібних origins.

Наприклад, лише якщо такі properties існують у проєкті:

```yaml
environment:
  AI_ENABLED: ${AI_ENABLED:-false}
  OPENAI_API_KEY: ${OPENAI_API_KEY:-}
  MESSAGING_WEBHOOK_ENABLED: ${MESSAGING_WEBHOOK_ENABLED:-false}
  PAYMENTS_ENABLED: ${PAYMENTS_ENABLED:-false}
```

## Dockerfile

Один multi-stage Dockerfile для обох середовищ: Maven build → JRE runtime,
готовий `app.jar`, непривілейований runtime user. Версії Maven/JDK/JRE
мають відповідати фактичному build configuration, не старому прикладу.
WhatsApp Midwives використовує JDK/JRE 25; це не вимога оновлювати всі проєкти.

```dockerfile
FROM maven:3.9.16-eclipse-temurin-25-noble AS build
WORKDIR /build
COPY pom.xml ./
RUN mvn -B -ntp -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -B -ntp -Dmaven.test.skip=true package

FROM eclipse-temurin:25-jre-noble
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app --home-dir /app app
COPY --from=build --chown=app:app /build/target/sample-*.jar app.jar
USER app:app
EXPOSE 12199
ENTRYPOINT ["java", "-jar", "app.jar"]
```

JAR pattern адаптуй до artifactId і перевір, що він вибирає один executable
JAR. `EXPOSE` — документація image, фактичний порт задають `API_PORT`,
`server.port` і Compose mapping; dev може використовувати інший порт.
Maven flags у reference пропускають тести; це не вимога додавати або
видаляти тести. Runtime image містить лише JRE та executable JAR, без Maven.
Окремий `COPY pom.xml` перед source дозволяє повторно використати dependency
layer, якщо build dependencies не змінилися. Target platform визначай за
deployment host, не копіюй `linux/amd64` механічно. При зміні стандартного
порту онови також документаційний `EXPOSE`.

## Commands and Deployment

Команди з кореня репозиторію; завжди явно задавай env-file та Compose file:

```bash
docker compose --env-file docker/.env -f docker/docker-compose.yml config --quiet
docker compose --env-file docker/.env -f docker/docker-compose.yml up -d --build
docker compose --env-file docker/dev/.env -f docker/dev/docker-compose.yml config --quiet
docker compose --env-file docker/dev/.env -f docker/dev/docker-compose.yml up -d --build
```

За `features.devEnvironment=true` у двох prod-командах вище заміни
`docker/.env` на `docker/prod/.env`, а `docker/docker-compose.yml` на
`docker/prod/docker-compose.yml`; prod build context має бути `../..`.
Без Docker dev не включай dev Compose-команди в README: опиши IDE backend
на 8080 та ручну підготовку окремої локальної БД/Run Configuration.

Це інструкції для запуску оператором, не автоматичний deployment під час
редагування Playbook. `config --quiet` перевіряє Compose без друку секретів;
він не доводить, що credentials, migrations або integrations працюють.

У reference сервер має окремі checkouts: dev branch у `<project>-dev`,
production branch у `<project>`. Його redeploy script перевіряє environment
argument, paths, branch, clean working tree, виконує `git pull --ff-only`,
валідує Compose, будує backend і піднімає лише потрібні DB/backend services.
Якщо додаєш такий скрипт, параметризуй paths/branches, зупиняйся при помилці,
передавай явний env-file та зберігай існуючий prod project name.

Не використовуй `down -v`, очищення volumes або перейменування production
resources як спосіб «полагодити» deployment. Якщо історичне prod ім'я
ділиться з іншими services, оновлюй лише потрібні services, без project-wide
`down` чи `--remove-orphans`. Runtime logs/health перевіряються після запуску.

## Implementation Checklist

1. Досліди prod Compose, Dockerfile, profiles, env keys, migrations і deployment.
2. Зафіксуй existing resource identity та відокрем prod/dev configuration.
3. Підготуй prod layout; потім dev з окремими DB, volume, network і портами.
4. Синхронізуй service DNS, datasource URL, profile, env keys та build paths.
5. Додай безпечні `.env.example`, ignore rules та команди запуску.
6. Перевір Compose без друку секретів, env/profile consistency та ізоляцію БД.
7. Перевір потрібні schema, health і зовнішні ефекти до ввімкнення інтеграцій.
8. Після дозволеного deployment перевір health/logs обох середовищ.
   Перевірку configuration-коду виконуй за [Infrastructure (infrastructure.md)](infrastructure.md).
9. Після рефакторингу повтори доречні build/static та runtime checks.
   Infrastructure/CI не є підставою додавати тести: застосовуй
   [Testing Policy (testing-policy.md)](../../../ai-rules/testing-policy.md).

## References

- [Docker Compose interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/) — env-file та interpolation.
- [Docker Compose services](https://docs.docker.com/reference/compose-file/services/) — services, healthchecks і залежності запуску.
