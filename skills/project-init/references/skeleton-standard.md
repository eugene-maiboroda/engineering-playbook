# Стандартний склад backend

## Створи обов’язкову основу

У режимі create застосуй цей склад без повторних питань про кожний пункт:

- Maven POM і Wrapper, Java 25, jar, кореневий package = groupId;
- Application із SpringBootApplication і ConfigurationPropertiesScan;
- Spring Web MVC, JPA, Validation, Actuator, Lombok, Springdoc, PostgreSQL
  JDBC та прямо запитаний actuator-test; Lombok processor;
- ручні mapper-и там, де вони потрібні; не створюй порожній mapper;
- application.properties, application-dev.properties, application-prod.properties
  завжди, навіть без окремого Docker dev;
- Dockerfile, .dockerignore, production Compose та .env/.env.example:
  у docker/ без Docker dev або в docker/prod/ за Docker dev;
  локальний .env містить лише не секретні placeholders;
- PostgreSQL production service, healthcheck і persistent volume;
- AppProps, AppRunner зі Swagger URL, AppConfig із Clock;
- Springdoc/OpenAPI; у shared/errorhandler рівно ApiExceptionHandler,
  ErrorResponse та ErrorDetailsResponse за [error-handling.md](error-handling.md);
- CORS за cors.md; значення FRONTEND_URL отримай від користувача або
  переданих параметрів, не підставляй довільний origin;
- sql/sql-init.sql і правила змін БД за sql-standard.md;
- локальний AGENTS.md із підключенням Playbook, один спільний docs/progress.md;
- Не додавай три server.error.include-* default-властивості чи Compose
  interpolation з :?Set; дотримуйся [environments.md](environments.md).
- .gitignore і короткі команди збірки/запуску та підготовки environment.

Не створюй бізнес-функціональність, демонстраційний CRUD, нові тестові
сценарії або непотрібні конфігураційні класи. Реальні секрети не генеруй
і не записуй без явного доручення; познач необхідні значення як незадані,
не називай запуск із placeholders перевіреним.

## Узгодь тільки додаткові можливості

Опції: devEnvironment, security, mapstruct. Якщо вони явно передані
JSON або вже обрані в розмові, застосуй вибір без повторного питання.
Якщо хоча б одна невідома, одним повідомленням запропонуй тільки невідомі
опції: «Додати Docker dev, session security або MapStruct? Можна відповісти
“нічого” або перелічити потрібне». Відповідь “нічого” вимикає невизначені
опції; мовчання не є відповіддю. Не питай про обов’язковий склад.

- devEnvironment=true: створи симетричні docker/dev і docker/prod з власними
  docker-compose.yml, .env/.env.example, DB/network/volume та context ../..,
  за [environments.md](environments.md). Не дублюй prod Compose у docker/.
  dev profile бере API_HOST/API_PORT з env, DB hostname — dev service DNS.
- devEnvironment=false: залиш prod у docker/; dev profile — server.port=8080,
  server.host=localhost, JDBC localhost:${POSTGRES_PORT}/${POSTGRES_DB}.
  DB credentials і порт користувач передає локальному запуску сам;
  Окремі Docker dev Compose/dev DB не створюй і не запускай автоматично;
  обов’язкова production основа при цьому залишається.
- security=true: додай Security starter і security.md, AuthProps,
  APP_ADMIN_USERNAME/APP_ADMIN_PASSWORD_HASH та Compose mappings.
  security=false: не додавай starter, security classes, auth properties,
  admin env-поля або Spring Security-only dependencies у базові класи.
- mapstruct=true: додай бібліотеку, processor і Lombok binding за Maven
  стандартом; інакше не додавай їх або їхні properties.

Init виконуй лише за явним запитом незалежно від поточного етапу розмови.
Натискання Brainstorm або сам його new-project сценарій не дає дозволу
створювати файли. Для inspect не додавай обов’язковий склад автоматично:
спочатку звіт і окреме доручення на потрібні зміни.
