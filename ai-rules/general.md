## Project Initialization

Цей етап виконується **до Planning та до будь-якої реалізації**, якщо проєкт створюється з нуля.

### 1. Study Project Context

Перед створенням проєкту AI повинен:

1. Прочитати `Engineering Playbook`:
    - `ai-rules`;
    - доступні `architectures`;
    - `project-conventions`;
    - `infrastructure`;
    - релевантні `principles`, `decisions` та інші матеріали.

2. Прочитати всю надану папку з інформацією про конкретний проєкт.

Вона може містити:

- technical specification;
- project description;
- business requirements;
- architecture/flow diagrams;
- client proposal;
- commercial proposal;
- API/integration requirements;
- інші матеріали, що описують проєкт.

`Engineering Playbook` визначає **як ми будуємо проєкти**.

Project-specific documentation визначає **що саме потрібно побудувати**.

---

### 2. Initial Technical Analysis

Після вивчення матеріалів AI **не починає реалізацію і не створює roadmap/runtime**.

Спочатку AI повинен представити користувачу початкове технічне бачення:

- коротко описати своє розуміння проєкту;
- визначити основні функціональні блоки;
- запропонувати відповідну архітектуру на основі `Engineering Playbook`;
- пояснити, чому ця архітектура підходить;
- визначити основні integrations та infrastructure requirements;
- запропонувати необхідний technology stack;
- запропонувати початковий набір dependencies.

Наприклад:

```text
Java
Spring Boot
PostgreSQL
Spring Data JPA
Validation
Lombok
MapStruct
Springdoc OpenAPI / Swagger
Actuator / Health Check
gRPC
...
```

Додавати потрібно тільки ті dependencies, для яких є реальна потреба.

На цьому етапі AI дає **рекомендації**, а не приймає остаточні рішення замість користувача.

---

### 3. Architecture Discussion

Запропонована архітектура та technology stack повинні бути обговорені з користувачем **до створення детального roadmap**.

На цьому етапі можуть змінюватися:

- architecture;
- module boundaries;
- integrations;
- persistence;
- dependencies;
- technology choices;
- communication protocols;
- infrastructure approach;
- інші фундаментальні рішення.

AI не повинен створювати детальний implementation plan, поки основний напрямок проєкту не погоджений.

---

### 4. Project Creation Is User-Controlled

Початковий Spring Boot проєкт користувач створює самостійно, наприклад через Spring Initializr.

AI може рекомендувати:

- Java version;
- Spring Boot version;
- dependencies;
- необхідні starters;
- infrastructure dependencies.

Але остаточний створений проєкт є source of truth.

Наприклад, якщо AI рекомендував Java 21, але користувач створив проєкт на Java 25, після підключення проєкту AI повинен орієнтуватися на Java 25.

AI не повинен самовільно повертати проєкт до попередньо рекомендованої конфігурації.

---

### 5. Inspect Created Project

Після того як користувач повідомив, що проєкт створений і підключений, AI повинен повторно дослідити його.

Перевірити:

- `pom.xml` / build configuration;
- фактичну Java version;
- Spring Boot version;
- dependencies;
- package structure;
- existing configuration;
- Git structure;
- вже створені файли та компоненти.

Попередні рекомендації після цього не є source of truth — source of truth є фактичний стан створеного проєкту.

Якщо між початковими рекомендаціями та створеним проєктом є важливі розбіжності — повідомити про них користувачу перед продовженням.

---

### 6. Explicit Transition to Planning

AI **не переходить до Planning автоматично**.

Після завершення Project Initialization потрібно дочекатися явного дозволу користувача перейти до Planning.

Наприклад:

> Проєкт створений. Можеш переходити до Planning.

Тільки після цього застосовується секція `Planning` цього документа.

---

### 7. Planning Starts With Project Foundation

Після дозволу перейти до Planning AI:

1. створює/оновлює `roadmap`;
2. створює/оновлює `runtime`;
3. фіксує погоджену архітектуру та основні technical decisions;
4. формує початковий project foundation відповідно до `infrastructure.md`.

Початковий foundation може включати:

```text
bootstrap/
properties/
configuration/
application.properties
application-dev.properties
application-prod.properties
Swagger / OpenAPI
Dockerfile
docker-compose.yml
.env.example
.gitignore rules
basic package structure
```

Конкретний набір визначається потребами проєкту та правилами `infrastructure.md`.

На цьому етапі створюється **каркас проєкту**, а не business functionality.

Business modules, use cases та feature implementation починаються відповідно до погоджених етапів `roadmap`.

---

### Project Initialization Flow

```text
Engineering Playbook
        +
Project Documentation
        │
        ▼
Study Context
        │
        ▼
Initial Technical Analysis
        │
        ├── project understanding
        ├── architecture proposal
        ├── technology stack
        ├── dependencies
        └── infrastructure requirements
        │
        ▼
Discussion With User
        │
        ▼
Architecture / Stack Agreement
        │
        ▼
User Creates Project
        │
        ▼
AI Inspects Actual Project
        │
        ▼
User explicitly allows Planning
        │
        ▼
Planning
        │
        ├── Roadmap
        ├── Runtime
        └── Project Foundation
        │
        ▼
Implementation
```

### Core Rule

> **Спочатку зрозуміти та обговорити проєкт. Потім користувач створює початковий проєкт. Після цього AI перевіряє фактичний стан проєкту. І лише після явного дозволу користувача починаються Planning, створення foundation та подальша реалізація.**


# General AI Engineering Rules

Цей документ містить загальні правила, яких AI повинен дотримуватися під
час роботи над моїми проєктами.

---

## Before Implementation

Перед реалізацією будь-якої задачі:

1. Досліди поточну структуру проєкту.
2. Визнач існуючу архітектуру.
3. Знайди схожі реалізації.
4. Проаналізуй компоненти, які будуть зачеплені.
5. Дотримуйся поточної архітектури проєкту.
6. Не порушуй існуючі архітектурні принципи.
7. Перевір актуальні `roadmap` та `runtime` файли, якщо вони існують,
   щоб зрозуміти загальну концепцію, поточний етап і вже прийняті
   рішення.

---

## Planning

Перед написанням коду AI повинен створити та підтримувати два planning-файли:

1. `<project-or-feature-name>-roadmap.md` — загальний план реалізації.
2. `<project-or-feature-name>-runtime.md` — поточний стан виконання та журнал важливих рішень.

Обидва файли ведуться українською мовою.

Не починай реалізацію до отримання підтвердження плану.
Якщо план суттєво змінився — онови planning-файли та дочекайся підтвердження перед продовженням.

### Roadmap

`roadmap` — це основний план реалізації проєкту або feature.

На початку нового проєкту або великої feature створи:

`<project-or-feature-name>-roadmap.md`

Roadmap повинен містити:

- мету та загальну концепцію;
- основні архітектурні рішення;
- етапи реалізації;
- загальний напрямок розвитку.

Roadmap є джерелом відповіді на питання:

> Що ми будуємо і за яким планом?

Якщо під час роботи змінюється концепція, архітектура, етапи або додається важливий функціонал — актуалізуй roadmap.

### Runtime

`runtime` — це робочий журнал виконання roadmap.

На початку нового проєкту або великої feature створи:

`<project-or-feature-name>-runtime.md`

Runtime повинен містити:

- поточний етап roadmap;
- що вже реалізовано;
- важливі зміни та прийняті рішення;
- відхилення від початкового плану;
- критичні технічні деталі;
- що потрібно робити наступним.

Runtime є джерелом відповіді на питання:

> Де ми зараз знаходимося і що робити далі?

Після кожного суттєвого етапу або зміни рішення оновлюй runtime.

Якщо зміна впливає на загальний план — онови також roadmap.

### Planning Workflow

Для кожної нової задачі:

1. Прочитай існуючі `roadmap` і `runtime`, якщо вони є.
2. Визнач поточний етап та вже прийняті рішення.
3. Для нового проєкту або великої feature створи/онови `roadmap`.
4. Створи/онови `runtime`.
5. Покажи користувачу план реалізації.
6. Дочекайся підтвердження.
7. Тільки після підтвердження починай реалізацію.
8. Під час роботи підтримуй `runtime` актуальним.
9. Якщо змінюється загальний план — актуалізуй `roadmap`.

---

## Implementation

Під час реалізації:

- Роби мінімально необхідні зміни.
- Не змінюй код, який не відноситься до задачі.
- Не роби рефакторинг без окремої необхідності.
- Не додавай нові абстракції без реальної причини.
- Дотримуйся існуючого naming та package structure.
- Використовуй існуючі підходи проєкту, якщо вони не порушують
  архітектуру.
- Після суттєвих змін актуалізуй `runtime`, а якщо зміни впливають на
  загальний план --- також `roadmap`.

---

## Git Rules

AI **ніколи самостійно не виконує `git commit` або `git push`**.

Коміти та push завжди виконує користувач.

AI може:

- підготувати зміни;
- перевірити diff/status;
- запропонувати commit message;
- пояснити, які файли були змінені.

Але фінальні `commit` і `push` залишаються відповідальністю користувача.

---

## Local AI Files

Внутрішні файли, які використовуються для роботи з AI, повинні
залишатися **тільки локально** і не потрапляти в Git.

Наприклад:

```text
*-roadmap.md
*-runtime.md
CLAUDE.md
CHATGPT.md
```

та інші аналогічні AI/workflow MD-файли.

Такі файли потрібно додавати до `.gitignore`.

Це правило стосується лише внутрішніх файлів для AI та процесу розробки.
Воно **не стосується функціональності AI, яка є частиною самого
application** (`ai` package, AI integrations, providers, clients тощо).

---

## Configuration and Environment

Секрети та environment-specific configuration ніколи не повинні бути
hardcoded у коді.

Не використовувати для цього:

- API keys у Java-класах;
- пряме читання environment через `System.getenv(...)`;
- розкидані `@Value` по application-коду.

Значення повинні надходити через environment/configuration.

### Docker environment

У проєкті використовується:

```text
docker/
├── docker-compose.yml
├── .env
└── .env.example
```

`docker/.env` містить реальні локальні значення та секрети і завжди
знаходиться в `.gitignore`.

`docker/.env.example` містить тільки приклад необхідних змінних без
секретів і може зберігатися в Git.

### Bootstrap Properties

Для typed configuration використовуй:

```text
bootstrap/
└── properties/
```

Кожна окрема конфігураційна область повинна мати свій невеликий
`@ConfigurationProperties` class/record.

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

Business/application code отримує конфігурацію через typed properties, а
не читає environment напряму.

Не створюй один великий global properties class для всіх налаштувань.

---

## Unexpected Situations

Якщо під час реалізації ти виявив:

- новий баг;
- архітектурну проблему;
- відсутню функціональність;
- неоднозначне рішення;
- проблему, яка не була врахована в плані,

то:

1. Зупини реалізацію.
2. Опиши проблему.
3. Запропонуй можливі варіанти вирішення з їх плюсами та мінусами.
4. Дочекайся мого рішення.
5. Після прийнятого рішення онови `roadmap` / `runtime`, якщо воно
   впливає на них.
6. Лише після цього продовжуй реалізацію.

---

## Code Reuse

Перед створенням нової реалізації AI повинен:

1. Перевірити, чи вже існує аналогічна логіка в проєкті.
2. Оцінити можливість повторного використання існуючої реалізації.
3. Якщо логіка значною мірою дублюється, запропонувати винесення
   спільної частини в абстракцію (інтерфейс, базовий клас, спільний
   сервіс або інший механізм, що відповідає поточній архітектурі).
4. Не дублювати код, якщо його можна перевикористати без порушення
   архітектурних принципів.
5. Якщо пропонується нова абстракція, пояснити, чому вона потрібна та
   яку проблему вирішує.

---

## General Rules

- Не вигадуй вимоги, яких немає в задачі.
- Не змінюй публічні контракти без погодження.
- Якщо існує кілька можливих рішень --- поясни компроміси.
- Якщо інформації недостатньо --- постав уточнюючі питання, а не роби
  припущення.
- Не виконуй `git commit` або `git push`.
- Не додавай внутрішні AI/workflow файли до Git.
- Не зберігай секрети у repository.
- Використовуй environment + typed `bootstrap/properties` для
  конфігурації.