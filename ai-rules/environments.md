# Dev and Prod Environments

Стандарт окремих середовищ для backend-проєктів на основі WhatsApp Midwives.
Застосовується разом з [Infrastructure Rules](infrastructure.md). Тут визначено
актуальну організацію prod/dev; старі single-compose приклади infrastructure
залишаються прикладами окремих механізмів, а не альтернативним default layout.

## Core Rule

Спочатку реалізуй prod foundation, потім dev за тією самою структурою.
Обидва середовища запускають backend та власну БД через Docker Compose.
Якщо наявний prod організовано інакше, підготуй його перенесення разом із dev,
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
│   ├── prod/
│   │   ├── docker-compose.yml
│   │   ├── .env
│   │   └── .env.example
│   └── dev/
│       ├── docker-compose.yml
│       ├── .env
│       └── .env.example
└── src/main/resources/
    ├── application.properties
    ├── application-prod.properties
    └── application-dev.properties
```

Реальні `.env` локальні та ignored; `.env.example` містять лише безпечні
приклади. У вихідному проєкті env examples відсутні, тому це доповнення
до reusable стандарту, а не копія його секретів.

```gitignore
/docker/prod/.env
/docker/dev/.env
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

### docker/prod/docker-compose.yml

```yaml
name: sample-prod

networks:
  sample-prod-net:

services:
  sample-backend-prod:
    build:
      context: ../..
      dockerfile: Dockerfile
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

`context: ../..` рахується від `docker/<environment>/docker-compose.yml` і
вказує на корінь репозиторію. `dockerfile: Dockerfile` — від build context.
Обидва середовища використовують один Dockerfile.

Профіль у reusable прикладі зафіксований у відповідному Compose, щоб dev
не піднявся як prod через помилкове env-значення. У WhatsApp Midwives він
заданий як `${SPRING_PROFILES_ACTIVE:-dev}` / `${SPRING_PROFILES_ACTIVE:-prod}`;
якщо зберігаєш цей варіант, перевір відповідність env та Compose перед запуском.

`depends_on: service_healthy` чекає readiness PostgreSQL перед стартом
backend, але не перевіряє наявність schema чи завершення migrations.
`$$` у healthcheck залишає `$` для shell усередині контейнера.

## Environment Examples

`docker/prod/.env.example`:

```dotenv
API_HOST=api.example.com
API_PORT=12199
POSTGRES_PORT=5440
POSTGRES_DB=sample_prod
POSTGRES_USER=sample_prod
POSTGRES_PASSWORD=replace-with-unique-prod-password
```

`docker/dev/.env.example`:

```dotenv
API_HOST=localhost
API_PORT=12200
POSTGRES_PORT=5441
POSTGRES_DB=sample_dev
POSTGRES_USER=sample_dev
POSTGRES_PASSWORD=replace-with-unique-dev-password
```

Порти наведено за розділенням у reference, а не як глобально обов'язкові числа.
На shared server перевір відсутність конфліктів. Для remote dev `API_HOST`
має відповідати зовнішньому dev hostname. `server.host` — custom metadata
для URL, а не bind address Spring Boot.

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

Context path, proxy headers strategy та інші defaults адаптуються до
фактичного проєкту. У reference `spring.profiles.default=dev`; це допустимий
local default, але deployment завжди явно задає свій profile.

`application-prod.properties`:

```properties
server.port=${API_PORT}
server.host=${API_HOST}
spring.datasource.url=jdbc:postgresql://postgres-sample-prod:5432/${POSTGRES_DB}
spring.datasource.username=${POSTGRES_USER}
spring.datasource.password=${POSTGRES_PASSWORD}
spring.jpa.hibernate.ddl-auto=validate
```

`application-dev.properties`:

```properties
server.port=${API_PORT}
server.host=${API_HOST}
spring.datasource.url=jdbc:postgresql://postgres-sample-dev:5432/${POSTGRES_DB}
spring.datasource.username=${POSTGRES_USER}
spring.datasource.password=${POSTGRES_PASSWORD}
spring.jpa.hibernate.ddl-auto=validate
```

Backend у контейнері використовує service DNS та внутрішній порт `5432`.
`POSTGRES_PORT` потрібний лише для доступу з host; БД публікується на
loopback. Dev і prod — два PostgreSQL services з окремими volumes, а не
дві schema в одній спільній production database.

Локальний IDE-запуск — додатковий режим, не заміна dev Compose. Запусти
тільки dev DB, передай dev credentials і явно перевизнач datasource URL
через `SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5441/sample_dev`.
Не змінюй container hostname у спільному dev profile заради IDE.

`ddl-auto=validate` не створює schema. У reference SQL bootstrap/migrations
застосовуються окремо, `spring.sql.init.mode=never`. В інших проєктах
використовуй погоджений migration tool. Нову dev DB ініціалізуй до старту
backend; для prod зміни schema потребують backup і плану відновлення.
Зміна `POSTGRES_DB/USER/PASSWORD` у env не перестворює користувачів і базу
в уже ініціалізованому PostgreSQL volume — потрібна явна DB-операція.

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
Maven flags у reference пропускають тести; це не вимога додавати тести.

## Commands and Deployment

Команди з кореня репозиторію; завжди явно задавай env-file та Compose file:

```bash
docker compose --env-file docker/prod/.env -f docker/prod/docker-compose.yml config --quiet
docker compose --env-file docker/prod/.env -f docker/prod/docker-compose.yml up -d --build
docker compose --env-file docker/dev/.env -f docker/dev/docker-compose.yml config --quiet
docker compose --env-file docker/dev/.env -f docker/dev/docker-compose.yml up -d --build
```

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
   Не створюй нових тестів автоматично: діє [Testing Policy](general.md#testing-policy).

## References

- [Docker Compose interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/) — env-file та interpolation.
- [Docker Compose services](https://docs.docker.com/reference/compose-file/services/) — services, healthchecks і залежності запуску.
