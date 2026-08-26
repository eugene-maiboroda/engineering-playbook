---
title: Modular Monolith
---

# Модульний моноліт --- Feature Modules First

Еталонний підхід для бізнес-застосунків, які розробляються і деплояться
як один Spring Boot application, але внутрішньо розділені на
самодостатні бізнес-модулі.

Головна мета цієї архітектури --- **швидко розробляти функціонал без
зайвого boilerplate, але не перетворювати проєкт у глобальні
`controller/service/repository` шари**.

Базовий принцип:

> **Спочатку бізнес-модуль і чітка межа відповідальності. Абстракції,
> shared-код, ports/adapters та окремі модулі додаються тільки тоді,
> коли для них з'явилась реальна причина.**

---

## Коли застосовувати

Модульний моноліт --- базовий вибір для застосунку, якщо:

- система має декілька зрозумілих бізнес-областей;
- усе поки що можна запускати одним Spring Boot application;
- не потрібна незалежна deployment/scaling модель для кожної області;
- одна команда або один розробник повинні швидко додавати функціонал;
- важливо зберігати межі між частинами системи;
- у майбутньому окремі модулі потенційно можуть вирости або бути
  винесені в окремі сервіси;
- повна hexagonal architecture дала б більше портів, адаптерів і
  boilerplate, ніж реальної користі.

Приклад Family Menu:

```text
recipe
mealplan
shopping
family
```

Це різні бізнес-capabilities, але поки що немає причини робити з них
окремі deployable services.

Не треба вибирати microservices тільки тому, що система має модулі.
**Модульність --- це спочатку межі коду і ownership, а не мережа.**

---

# Головний принцип структури

Проєкт групується **за бізнес-фічами / capabilities**, а не за
технічними шарами.

Не так:

```text
controller/
service/
repository/
entity/
dto/
mapper/
```

Бо тоді всі бізнес-області змішуються у глобальних технічних папках.

Базова форма:

```text
com.familymenu.backend

├── recipe/
├── mealplan/
├── shopping/
├── family/
├── shared/              # тільки реально спільні технічні речі
├── infrastructure/      # тільки конфігурація / @Bean
└── bootstrap/           # startup + configuration properties
```

Кожен бізнес-модуль сам володіє своїм кодом і даними.

---

# Структура одного модуля

Не потрібно механічно створювати однакові папки у кожному модулі.

Маленький модуль може бути плоским:

```text
shopping/
├── ShoppingApi.java
├── ShoppingService.java
├── ShoppingRepository.java
├── ShoppingList.java
└── ShoppingListEntity.java
```

Коли модуль росте, його можна деталізувати:

```text
shopping/
├── api/
│   ├── ShoppingApi.java
│   └── dto/
├── service/
│   ├── ShoppingService.java
│   └── ShoppingListExportService.java
├── domain/
│   ├── ShoppingList.java
│   └── ShoppingListItem.java
├── repository/
│   └── ShoppingRepository.java
├── persistence/
│   ├── ShoppingListEntity.java
│   └── ShoppingMapper.java
└── web/                 # якщо HTTP endpoint природно належить модулю
    └── ShoppingController.java
```

**Структура повинна рости разом зі складністю модуля.**

Не створювати `api/service/domain/repository/persistence/mapper/...`,
якщо в кожній папці буде по одному класу і від цього немає користі.

---

# `domain/`: локальний, а не глобальний

За замовчуванням **не робити один глобальний `domain/` для всього
застосунку**.

Погано:

```text
domain/
├── Recipe.java
├── MealPlan.java
├── ShoppingList.java
└── Family.java
```

Це поступово перетворює domain на спільний склад моделей і послаблює
ownership.

Краще:

```text
recipe/domain/Recipe.java
mealplan/domain/MealPlan.java
shopping/domain/ShoppingList.java
family/domain/Family.java
```

Domain належить тому модулю, який володіє відповідною бізнес-концепцією.

Якщо модуль маленький, окрема папка `domain/` не обов'язкова:

```text
recipe/
├── Recipe.java
├── RecipeService.java
└── RecipeRepository.java
```

Папка з'являється тоді, коли вона реально покращує читабельність.

### Чи може бути shared domain?

Тільки у виняткових випадках.

Якщо `Money`, `Unit`, `DateRange` або інший value object справді має
**однаковий бізнес-сенс** у багатьох модулях, його можна винести у:

```text
shared/domain/
```

Але не виносити модель у shared тільки тому, що два модулі її зараз
використовують.

Спочатку перевірити: **хто є власником цієї концепції?**

Якщо власник є --- інші модулі повинні звертатись до нього через API, а
не отримувати його internal domain model.

---

# API модуля --- його публічна межа

Кожен модуль, який використовується іншими модулями, має маленький
public API.

Наприклад:

```text
mealplan
    │
    ▼
RecipeApi
    │
    ▼
recipe internals
```

Приклад:

```java
public interface RecipeApi {

    RecipeView getRecipe(String recipeId);

}
```

Реалізація знаходиться всередині `recipe`.

Інший модуль не повинен знати:

- який repository використовує `recipe`;
- які JPA entities там є;
- які mapper-и там є;
- як побудована внутрішня service-логіка;
- де і як recipe зберігається.

### Дозволено

```text
MealPlanService
      │
      ▼
RecipeApi
```

### Заборонено

```text
MealPlanService
      │
      ├──> RecipeRepository
      ├──> RecipeEntity
      └──> internal RecipeMapper
```

**Інший модуль використовує API власника, а не його repository або
persistence model.**

---

# API не означає HTTP

`RecipeApi` у модульному моноліті --- це звичайний Java contract.

```java
private final RecipeApi recipeApi;
```

Виклик:

```text
MealPlanService
    ↓ Java method call
RecipeApi
    ↓
RecipeService
```

Не потрібно робити REST між модулями одного application.

HTTP API --- це зовнішня межа застосунку.

Module API --- внутрішня межа між бізнес-модулями.

---

# Web API / controllers

HTTP endpoint повинен передавати запит бізнес-модулю, який володіє use
case.

Можливі дві організації.

### Варіант 1 --- controller всередині модуля

Для більшості feature-oriented застосунків це preferred:

```text
shopping/
├── web/
│   └── ShoppingController.java
├── service/
├── repository/
└── domain/
```

Тоді все, що стосується Shopping, знаходиться поруч.

### Варіант 2 --- окремий верхньорівневий `web/`

Можна використовувати, якщо застосунок має один великий зовнішній
transport layer або окрему gateway-композицію:

```text
web/
├── ShoppingController.java
├── RecipeController.java
└── MealPlanController.java
```

Але `web/` не повинен містити бізнес-логіку.

Default для модульного моноліту: **controller тримати біля модуля**,
якщо немає причини централізувати transport layer.

---

# Persistence і repositories

Repository за замовчуванням належить бізнес-модулю.

```text
recipe/
    RecipeRepository

mealplan/
    MealPlanRepository

shopping/
    ShoppingRepository
```

Не створювати глобальне:

```text
repository/
├── RecipeRepository
├── ShoppingRepository
├── MealPlanRepository
└── FamilyRepository
```

Причина: repository --- частина способу, яким конкретний модуль працює
зі своїми даними.

### Ownership даних

```text
recipe      → recipe tables
mealplan    → meal-plan tables
shopping    → shopping tables
```

Навіть якщо фізично всі таблиці знаходяться в одній PostgreSQL database,
**логічно вони мають власника**.

`mealplan` не повинен напряму використовувати `RecipeRepository`.

Він використовує:

```text
RecipeApi
```

а `recipe` сам читає свої дані.

Це одна з найважливіших умов справжньої модульності.

---

# Чи потрібен repository interface + implementation?

Не обов'язково.

Якщо Spring Data repository повністю закриває задачу:

```java
interface ShoppingRepository extends JpaRepository<ShoppingEntity, String> {
}
```

його можна використовувати всередині модуля напряму.

Не потрібно автоматично створювати:

```text
ShoppingPersistencePort
        ↓
ShoppingPersistenceAdapter
        ↓
ShoppingJpaRepository
```

тільки заради архітектури.

Port додається, коли з'являється реальна причина відокремити application
logic від конкретної persistence implementation.

Наприклад:

- декілька persistence implementations;
- складна зовнішня storage system;
- модуль повинен бути незалежним від конкретного storage;
- потрібна окрема тестова implementation і abstraction реально спрощує
  систему;
- persistence стала складною підсистемою.

---

# Загальний repository / metadata / metrics

Першим питанням завжди є:

> **Хто володіє цими даними?**

Якщо metadata належать конкретному модулю:

```text
recipe/RecipeMetadataRepository
```

вони залишаються в `recipe`.

Якщо metrics --- окрема бізнес-capability:

```text
metrics/
├── MetricsApi.java
├── MetricsService.java
└── MetricsRepository.java
```

це окремий модуль.

Якщо це лише маленька технічна cross-cutting utility, наприклад запис
технічних execution metrics, допустимо:

```text
shared/
└── metrics/
    ├── MetricsRecorder.java
    └── MetricsRepository.java
```

Але **не створювати global repository в корені тільки тому, що ним
користуються декілька модулів**.

Правило:

```text
business ownership є       → business module
окрема capability є        → окремий module
чисто технічна utility     → shared
```

---

# `shared/` --- використовувати обережно

`shared/` не є місцем для всього, що не вдалося класифікувати.

Погано:

```text
shared/
├── Utils.java
├── CommonService.java
├── RecipeMapper.java
├── ShoppingHelper.java
├── UserRepository.java
└── ...
```

Добре:

```text
shared/
├── export/
│   └── CsvWriter.java
├── time/
│   └── ClockProvider.java
└── metrics/
    └── MetricsRecorder.java
```

У shared повинні потрапляти маленькі, стабільні, реально cross-cutting
capabilities, які:

- не належать одному бізнес-модулю;
- не знають про domain конкретного модуля;
- мають однакову семантику для всіх користувачів.

### Найважливіше правило

> **Спочатку local. Потім shared.**

Не виносити код у shared через припущення: "можливо, колись ще комусь
знадобиться".

---

# Як додавати нову залежність або технічну можливість

Коли з'являється CSV, PDF, AI, email, storage, HTTP client, image
processing тощо, не починати з питання:

> "У яку технічну папку покласти бібліотеку?"

Почати з:

> **Який business use case я зараз додаю і хто ним володіє?**

---

## Decision pipeline для нової функціональності

### 1. Визнач use case

Наприклад:

```text
Export Shopping List to CSV
```

Власник:

```text
shopping
```

Тому use case знаходиться там:

```text
shopping/
└── service/
    └── ShoppingListExportService.java
```

### 2. Визнач технічний механізм

Use case потребує:

```text
CSV generation
```

Якщо CSV потрібен тільки Shopping:

```text
shopping/
└── export/
    └── CsvWriter.java
```

Не потрібно створювати global CSV module.

### 3. З'явився другий реальний користувач

Наприклад Recipe теж експортується в CSV.

Тоді generic CSV writer можна винести:

```text
shared/
└── export/
    └── CsvWriter.java
```

При цьому бізнес-use-case залишається локальним:

```text
shopping/ShoppingListExportService
recipe/RecipeExportService
```

Обидва використовують shared `CsvWriter`.

### 4. Capability стала складною

З'явились:

- CSV;
- PDF;
- templates;
- localization;
- asynchronous generation;
- file storage;
- history;
- download links;
- email delivery.

Тепер export може стати самостійним модулем:

```text
export/
├── api/
├── service/
├── model/
├── repository/
├── csv/
└── pdf/
```

### 5. Якщо потрібна змінність implementation --- додати локальний port

Наприклад PDF можна генерувати різними engines:

```java
public interface PdfGenerator {
    byte[] generate(ExportDocument document);
}
```

Реалізації:

```text
ITextPdfGenerator
OpenHtmlPdfGenerator
```

Для цього **не потрібно переводити весь модуль на hexagonal
architecture**.

Локальна interface boundary допустима будь-де, де вона вирішує реальну
проблему.

---

# CSV / PDF --- повний приклад

Вимога:

> Користувач може експортувати Shopping List у CSV.

Структура:

```text
shopping/
├── web/
│   └── ShoppingController.java
├── service/
│   ├── ShoppingService.java
│   └── ShoppingListExportService.java
├── repository/
│   └── ShoppingRepository.java
├── domain/
│   └── ShoppingList.java
└── export/
    └── CsvWriter.java
```

Flow:

```text
GET /shopping-lists/{id}/export?format=csv
                 │
                 ▼
       ShoppingController
                 │
                 ▼
    ShoppingListExportService
          │             │
          ▼             ▼
ShoppingRepository    CsvWriter
                         │
                         ▼
                       byte[]
```

`ShoppingListExportService` знає, **які дані Shopping треба
експортувати**.

`CsvWriter` знає тільки, **як записати дані у CSV**.

Якщо CSV потім знадобився Recipe:

```text
shared/export/CsvWriter
```

але:

```text
shopping/ShoppingListExportService
recipe/RecipeExportService
```

залишаються окремими.

Не створювати global `ExportService` з методами:

```text
exportShopping()
exportRecipe()
exportMealPlan()
exportFamily()
...
```

Такий сервіс швидко стає god-service і забирає ownership у
бізнес-модулів.

---

# AI --- як розміщувати

AI сам по собі не обов'язково є модулем.

Спочатку запитати:

> **Для якого use case потрібен AI?**

Наприклад AI генерує Meal Plan.

Тоді початкова форма:

```text
mealplan/
├── service/
│   └── MealPlanGenerationService.java
└── ai/
    └── OpenAiMealPlanGenerator.java
```

Якщо одна implementation і немає потреби її міняти --- interface не
обов'язковий.

---

## Коли AI потребує interface

Якщо провайдер може змінюватись:

```java
public interface MealPlanGenerator {

    MealPlanSuggestion generate(MealPlanRequest request);

}
```

Implementation:

```text
OpenAiMealPlanGenerator
```

Пізніше:

```text
GeminiMealPlanGenerator
```

Це локальний port/strategy всередині `mealplan`.

Не потрібно через один interface перебудовувати весь модуль на:

```text
domain/
port/
application/
adapter/
```

**Hexagonal pattern можна застосувати локально.**

---

## AI використовується декількома модулями

Наприклад:

```text
mealplan → AI
recipe   → AI
shopping → AI
```

Спочатку можна винести технічний client:

```text
shared/
└── ai/
    └── AiClient.java
```

але тільки якщо це справді generic technical capability.

Наприклад:

```java
public interface AiClient {
    AiResponse execute(AiRequest request);
}
```

При цьому бізнес-prompts, mapping і правила залишаються у власниках:

```text
mealplan/ai/
recipe/ai/
shopping/ai/
```

`shared.ai` не повинен знати, що таке `MealPlan`, `Recipe` або
`ShoppingList`.

---

## AI виріс у capability

Якщо з'являються:

- prompt management;
- provider selection;
- retries;
- token accounting;
- caching;
- embeddings;
- model routing;
- moderation;
- observability;
- usage limits;
- декілька AI consumers;

тоді є сенс:

```text
ai/
├── api/
│   └── AiApi.java
├── service/
├── model/
├── provider/
│   ├── AiProvider.java
│   ├── OpenAiProvider.java
│   └── GeminiProvider.java
└── config/
```

Інші модулі бачать тільки:

```text
AiApi
```

Усередині цього модуля можна використати simplified hexagonal pattern:

```text
AiService
    ↓
AiProvider interface
    ↓
OpenAiProvider / GeminiProvider
```

Але немає вимоги механічно створювати повний набір `port/in`,
`port/out`, `adapter`, `application`, якщо маленького interface
достатньо.

---

# Еволюція функціональності

Default evolution:

```text
LOCAL
  ↓
SHARED UTILITY
  ↓
MODULE
  ↓
LOCAL HEXAGON / PORTS, якщо потрібні
  ↓
можливо MICROSERVICE
```

Приклад CSV:

```text
shopping/export/CsvWriter
        ↓
shared/export/CsvWriter
        ↓
export module
        ↓
можливо export service
```

Приклад AI:

```text
mealplan/ai/OpenAiGenerator
        ↓
mealplan/ai/MealPlanGenerator + OpenAI implementation
        ↓
shared AI client або ai module
        ↓
AI module з provider port
        ↓
можливо AI microservice
```

Не починати з останньої стадії.

---

# Коли застосовувати Hexagonal усередині модуля

Модульний моноліт і hexagonal architecture не суперечать один одному.

Modular Monolith відповідає на питання:

> **Де проходять бізнес-межі системи?**

Hexagonal відповідає:

> **Як ізолювати core конкретної області від зовнішніх
> implementations?**

Тому великий модуль може еволюціонувати:

```text
shopping/
├── api/
├── domain/
├── application/
├── port/
│   └── out/
└── adapter/
```

у той час як простий `family` залишиться:

```text
family/
├── FamilyApi.java
├── FamilyService.java
└── FamilyRepository.java
```

Це нормально.

**Не форсувати однакову внутрішню архітектуру всіх модулів.**

---

# Коли створювати interface / port

Не створювати interface тільки тому, що dependency зовнішня.

Створювати boundary, якщо хоча б одна з причин реальна:

1. Є або очікуються декілька implementations.
2. Провайдер справді може бути замінений.
3. Зовнішній API складний і його модель не повинна протікати у business
   code.
4. Потрібна чітка anti-corruption boundary.
5. Integration logic стала достатньо складною, щоб її ізолювати.
6. Interface суттєво спрощує тестування.
7. Це API між бізнес-модулями.

Не робити abstraction "про всяк випадок".

Наприклад:

```java
UUID.randomUUID()
```

не потребує `IdGenerationPort`, якщо немає конкретної причини підміняти
генерацію ID.

---

# Як визначити, чи щось є модулем

Кандидат на окремий business module має хоча б декілька ознак:

- має власну бізнес-відповідальність;
- має власні use cases;
- має власну модель;
- часто має власні дані;
- має API, корисний іншим модулям;
- може змінюватись відносно незалежно;
- його можна описати бізнес-словом: `recipe`, `shopping`, `mealplan`,
  `billing`, `notification`.

Технічне слово саме по собі ще не робить модуль:

```text
csv
json
http
mapper
repository
utils
```

---

# Як визначити власника нового функціоналу

Задай питання:

> **Яка бізнес-можливість з'являється для користувача або системи?**

Приклади:

```text
"Export shopping list"        → shopping
"Generate weekly meal plan"   → mealplan
"Suggest recipe with AI"      → recipe
"Send meal plan by email"     → mealplan
"Calculate shopping list"     → shopping
```

Технічний механізм (`CSV`, `PDF`, `OpenAI`, `SMTP`) не визначає
ownership.

---

# Cross-module use case

Іноді use case реально координує декілька модулів.

Наприклад:

```text
Generate shopping list from meal plan
```

Потрібно визначити, **хто володіє результатом**.

Якщо результат --- Shopping List, природний власник:

```text
shopping
```

Тоді:

```text
ShoppingService
     │
     ├──> MealPlanApi
     └──> RecipeApi
```

і Shopping створює свій aggregate/result.

Не створювати global `ApplicationService` тільки тому, що use case
торкається декількох модулів.

Окремий orchestration module потрібен лише тоді, коли orchestration сама
стала незалежною capability і жоден існуючий модуль природно не є
власником процесу.

---

# Залежності між модулями

Бажано:

```text
shopping → recipe.api
shopping → mealplan.api
```

Не бажано:

```text
shopping → recipe.repository
shopping → recipe.persistence
shopping → recipe.internal.service
```

Слідкувати за dependency cycles:

```text
shopping → mealplan
mealplan → shopping
```

Якщо цикл з'явився, це сигнал перевірити boundaries.

Можливі причини:

- неправильно визначений ownership;
- API містить зайві responsibilities;
- shared concept насправді має окремого власника;
- потрібен domain event або orchestration;
- два "модулі" насправді є однією capability.

Не лікувати цикл просто винесенням усіх класів у `shared`.

---

# `infrastructure/` і `config/`

У цьому стилі зберігається правило зі спрощеної hexagonal architecture:

```text
infrastructure/
```

містить **тільки Spring configuration / bean wiring / technical
configuration**.

Наприклад:

```text
infrastructure/
├── DatabaseConfig.java
├── HttpClientConfig.java
├── JacksonConfig.java
├── MapStructConfig.java
└── ExecutorConfig.java
```

Жодної бізнес-логіки.

Якщо слово `infrastructure` не дає додаткової користі, допустимо назвати
верхньорівневий пакет просто:

```text
config/
```

Але в межах engineering playbook краще зберігати один convention:

```text
infrastructure/
```

для `@Configuration` / `@Bean`.

### Module-specific config

Якщо конфіг належить тільки одному великому модулю, допустимо:

```text
ai/config/
mealplan/config/
```

Особливо якщо він є частиною внутрішнього wiring цього модуля.

Глобальні cross-cutting beans залишаються:

```text
infrastructure/
```

---

# `bootstrap/`

`bootstrap/` залишається окремим верхньорівневим пакетом.

Приклад:

```text
bootstrap/
├── properties/
│   ├── AiProps.java
│   ├── StorageProps.java
│   └── ExportProps.java
└── ...
```

`@ConfigurationProperties` організовуються за темою.

Не створювати один величезний:

```text
ApplicationProperties
```

на весь application.

Використовувати:

```java
@ConfigurationProperties(prefix = "ai")
public record AiProps(...) {}
```

```java
@ConfigurationProperties(prefix = "storage")
public record StorageProps(...) {}
```

і:

```java
@ConfigurationPropertiesScan
```

на entrypoint.

---

# Spring profiles / application files

Базова конфігурація application залишається незалежною від вибраної
архітектури.

Наприклад:

```text
src/main/resources/

application.properties
application-dev.properties
application-prod.properties
```

або відповідні `.yml`.

Архітектура модулів не повинна змінювати стандартний
profile/configuration flow Spring Boot.

`bootstrap/properties` містить typed Java representation configuration.

`application*.properties` містять environment-specific values.

---

# Приклад Family Menu

```text
com.familymenu.backend

├── recipe/
│   ├── api/
│   │   ├── RecipeApi.java
│   │   └── RecipeView.java
│   ├── domain/
│   │   ├── Recipe.java
│   │   └── Ingredient.java
│   ├── service/
│   │   ├── RecipeService.java
│   │   └── RecipeExportService.java
│   ├── repository/
│   │   └── RecipeRepository.java
│   ├── persistence/
│   │   ├── RecipeEntity.java
│   │   └── RecipeMapper.java
│   └── web/
│       └── RecipeController.java
│
├── mealplan/
│   ├── api/
│   ├── domain/
│   ├── service/
│   ├── repository/
│   ├── persistence/
│   └── web/
│
├── shopping/
│   ├── api/
│   ├── domain/
│   ├── service/
│   │   ├── ShoppingService.java
│   │   └── ShoppingListExportService.java
│   ├── repository/
│   ├── persistence/
│   └── web/
│
├── family/
│   ├── api/
│   ├── service/
│   └── repository/
│
├── shared/
│   └── export/
│       ├── CsvWriter.java
│       └── PdfWriter.java
│
├── infrastructure/
│   ├── DatabaseConfig.java
│   ├── JacksonConfig.java
│   └── MapStructConfig.java
│
└── bootstrap/
    └── properties/
        ├── ExportProps.java
        └── AiProps.java
```

Це **приклад зрілого стану**, а не список папок, які треба створити в
перший день.

На старті модулі можуть бути значно простішими.

---

# Мікросервісна еволюція

Добре організований modular monolith спрощує майбутнє виділення сервісу,
але не робить його автоматичним.

Сьогодні:

```text
MealPlanService
      │
      ▼
RecipeApi
      │
      ▼
RecipeService
```

це Java call у тому самому process.

Після extraction:

```text
MealPlan Service
      │
      ▼
HTTP / messaging
      │
      ▼
Recipe Service
```

Найцінніше, що вже було визначено:

- ownership;
- public API;
- internal implementation;
- data boundaries.

Але extraction у microservice також додає:

- network failures;
- retries/timeouts;
- distributed tracing;
- eventual consistency;
- distributed transactions / compensation;
- API versioning;
- deployment;
- observability.

Тому **не проєктувати modular monolith як "майже microservices" з
першого дня**.

---

# Тестування

Основна бізнес-логіка тестується на рівні конкретного модуля.

```text
shopping/
    ShoppingServiceTest
    ShoppingListExportServiceTest
```

Не потрібно піднімати весь Spring context для кожного тесту.

Repository / integration boundaries тестуються integration tests там, де
це дає користь.

Cross-module contracts варто тестувати через public API модуля, а не
через internal classes.

Архітектурні тести (наприклад ArchUnit) можна додати, коли модулів стає
достатньо багато і є ризик випадкових dependency violations:

```text
shopping may access recipe.api
shopping must not access recipe.persistence
```

На маленькому проєкті це не обов'язково.

---

# Чого свідомо уникати

- Не створювати `port` для кожної dependency.
- Не створювати interface для кожного service/repository автоматично.
- Не робити кожен business module окремим Maven/Gradle module на
  старті.
- Не робити REST між модулями одного Spring Boot application.
- Не створювати global `service/`, `repository/`, `entity/` для всіх
  фіч.
- Не робити global `domain/`, якщо моделі мають конкретних власників.
- Не виносити код у `shared` "на майбутнє".
- Не створювати `Utils` / `CommonService` як сміттєві контейнери.
- Не робити `CSV`, `PDF`, `HTTP`, `JSON` окремими business modules
  тільки через їх технічну природу.
- Не форсувати однакову внутрішню структуру всіх модулів.
- Не перетворювати один модуль на hexagonal тільки тому, що інший
  модуль уже hexagonal.
- Не робити microservice extraction до появи реальної
  operational/business причини.
- Не дозволяти модулям напряму використовувати repositories/entities
  інших модулів.

---

# Швидкий алгоритм: куди покласти новий клас

Коли додається новий клас, пройти послідовно:

### 1. Це частина конкретного business use case?

Так:

```text
→ модуль-власник
```

### 2. Це domain model?

```text
→ <owner-module>/domain
```

або просто root модуля, якщо він маленький.

### 3. Це repository / entity / mapper конкретного модуля?

```text
→ <owner-module>/repository|persistence
```

### 4. Це API, через яке інші модулі користуються capability?

```text
→ <owner-module>/api
```

### 5. Це технічна реалізація, яку поки використовує тільки один модуль?

```text
→ залишити локально в цьому модулі
```

### 6. Її реально використовують декілька модулів і вона не містить domain knowledge?

```text
→ shared/<capability>
```

### 7. Shared capability виросла і має власні use cases / state / API?

```text
→ окремий business/technical module
```

### 8. Є декілька implementations або потрібна isolation boundary?

```text
→ додати interface/port локально
```

Не перебудовувати весь application.

### 9. Модуль став operationally незалежним і є реальна причина окремого deployment?

```text
→ розглядати microservice extraction
```

---

# Швидкий алгоритм: нова зовнішня dependency

Наприклад додали OpenAI SDK, PDF library, S3 SDK або email provider.

1. **Не створювати package за назвою бібліотеки автоматично.**
2. Визначити business use case.
3. Визначити module owner.
4. Поставити integration локально в owner module.
5. Не створювати interface, якщо implementation одна і abstraction
   нічого не дає.
6. Якщо implementation треба підміняти --- створити маленький semantic
   interface.
7. Не протікати SDK DTO/model у domain/business API.
8. Якщо другий модуль потребує тієї самої generic integration ---
   розглянути `shared`.
9. Якщо integration перетворилась на самостійну capability --- зробити
   module.
10. Тільки після реальної потреби розглядати окремий service.

---

# Головна модель прийняття рішення

```text
Що я додаю?
      │
      ▼
Хто business owner?
      │
      ▼
Покласти локально
      │
      ▼
Чи є другий реальний consumer?
   │             │
   ні            так
   │             │
залишити      Чи generic?
локально       │
            ┌──┴──┐
            ні    так
            │      │
        owner API shared utility
                   │
                   ▼
             capability росте?
               │       │
               ні      так
               │       │
             shared   module
                       │
                       ▼
              потрібна змінність?
                  │       │
                  ні      так
                  │       │
               simple   local ports/
               module   strategies
                         │
                         ▼
                 потрібен незалежний
                    deployment?
                    │       │
                    ні      так
                    │       │
                  module  microservice
```

---

# Default rules для AI / coding agent

При створенні або зміні проєкту з цією архітектурою:

1. Спочатку визначити business module owner.
2. Новий функціонал розміщувати локально у власника.
3. Інші модулі звертаються тільки через public module API.
4. Не використовувати repository/entity/internal service іншого модуля.
5. Domain model належить модулю; не створювати глобальний domain без
   окремого рішення.
6. Repository належить модулю, чиї дані він зберігає.
7. Технічну dependency спочатку тримати локально.
8. У `shared` виносити тільки після появи реального повторного
   використання.
9. `shared` код не повинен знати domain конкретних модулів.
10. Якщо shared capability отримала власні use cases/state/API ---
    підняти її до окремого модуля.
11. Interface/port створювати через реальну потребу, а не механічно.
12. Hexagonal architecture дозволено застосовувати локально всередині
    складного модуля.
13. Не вимагати однакової внутрішньої структури від усіх модулів.
14. `infrastructure/` --- тільки configuration/bean wiring.
15. `bootstrap/` --- startup/configuration properties; один properties
    record на одну тему.
16. Spring profiles (`application.properties`,
    `application-dev.properties`, `application-prod.properties`)
    залишаються стандартними.
17. Не створювати microservice тільки через можливість майбутнього
    extraction.
18. При сумніві вибирати **найпростішу локальну реалізацію, яку легко
    рефакторити пізніше**.

---

# Коротка формула

> **Business code живе у business module.**

> **Domain належить власнику, а не всьому проєкту.**

> **Repository належить власнику даних.**

> **Module API --- єдиний дозволений шлях для інших модулів.**

> **Technical dependency спочатку local.**

> **Другий реальний consumer → подумати про shared.**

> **Shared виріс у capability → module.**

> **Потрібна змінна implementation → локальний interface/port.**

> **Модуль став складним → усередині можна застосувати hexagonal.**

> **Потрібен незалежний deployment/scaling → тільки тоді розглядати
> microservice.**

Еволюція за замовчуванням:

```text
LOCAL → SHARED → MODULE → LOCAL HEXAGON (якщо потрібен) → MICROSERVICE (якщо потрібен)
```

Ця еволюція не є обов'язковим lifecycle. Більшість функціональності може
назавжди залишитися на стадії `LOCAL` або `MODULE`, і це нормальний
результат.