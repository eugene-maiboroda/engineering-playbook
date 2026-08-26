---
title: Modular Monolith integrations, dto, cache
---

# Модульний моноліт --- API boundaries, DTO, зовнішні інтеграції та cache

Цей розділ доповнює основну нотатку про модульний моноліт і деталізує
одну з найважливіших тем: **де повинні жити API, DTO, зовнішні
інтеграції, cache/Redis та як не змішувати різні типи контрактів**.

Головна ідея:

> **DTO живе біля того контракту, який воно представляє.**

І ще одна принципова річ:

> **API ≠ Controller. Controller --- лише HTTP adapter твого
> застосунку.**

У модульному моноліті можуть одночасно існувати: - module API ---
внутрішній контракт між бізнес-модулями; - web API --- HTTP-контракт із
зовнішнім користувачем/клієнтом; - integration API/client --- вихід у
сторонній сервіс; - cache representation --- модель даних, яку ми
зберігаємо в Redis/Caffeine.

Це різні boundaries і їх не треба змішувати.

------------------------------------------------------------------------

# 1. Якщо зовнішня інтеграція потрібна тільки одному модулю

Уявімо зовнішній сервіс `Datafarcio`, який потрібен тільки `shopping`.

Структура:

``` text
shopping/
├── api/                         ← API модуля для ІНШИХ модулів
│   ├── ShoppingApi.java
│   └── dto/
│       └── ShoppingView.java
│
├── service/
│   └── ShoppingService.java
│
├── integration/
│   └── datafarcio/
│       ├── DatafarcioClient.java
│       ├── dto/
│       │   ├── DatafarcioRequest.java
│       │   └── DatafarcioResponse.java
│       └── DatafarcioMapper.java
│
├── domain/
│   └── ShoppingList.java
│
└── repository/
```

Тут є **дві абсолютно різні DTO**.

Перша:

``` text
shopping/api/dto/ShoppingView
```

--- це **наш контракт між модулями**.

Друга:

``` text
shopping/integration/datafarcio/dto/DatafarcioResponse
```

--- це **контракт чужого Datafarcio API**.

Це принципово різні речі.

------------------------------------------------------------------------

## Як проходять дані

Datafarcio повернув:

``` json
{
  "product_id": "123",
  "product_name": "Milk",
  "price": 1.49,
  "provider_internal_code": "ABC"
}
```

Ми десеріалізуємо саме зовнішній контракт:

``` java
public record DatafarcioResponse(
    String productId,
    String productName,
    BigDecimal price,
    String providerInternalCode
) {}
```

Після цього mapper:

``` text
Datafarcio JSON
       ↓
DatafarcioResponse
       ↓
DatafarcioMapper
       ↓
наша модель
```

Наприклад:

``` java
ProductInfo
```

І вже:

``` text
ShoppingService
```

працює з **нашими поняттями**, а не з `DatafarcioResponse`.

Краще не протягувати `DatafarcioResponse` глибоко у бізнес-логіку.

Preferred flow:

``` text
EXTERNAL WORLD                 SHOPPING

JSON
 ↓
DatafarcioResponse
 ↓
DatafarcioClient
 ↓
mapper
 ↓
ProductInfo
 ↓
ShoppingService
```

Тоді якщо Datafarcio завтра перейменував:

``` text
product_name
```

на:

``` text
display_name
```

зміни локалізуються переважно тут:

``` text
integration/datafarcio/
```

а не розповзаються по бізнес-логіці.

------------------------------------------------------------------------

# 2. External DTO не означає "всі поля, які повернув API"

Ми **не зобов'язані описувати всі 50 полів**, які повернув зовнішній
API.

Якщо нам потрібні тільки:

``` text
id
name
price
```

можна мати:

``` java
public record DatafarcioProductResponse(
    String id,
    String name,
    BigDecimal price
) {}
```

і ігнорувати решту JSON, якщо JSON-бібліотека/конфіг це дозволяє.

DTO описує **ту частину зовнішнього контракту, яка потрібна нашій
інтеграції**.

Тому правило не таке:

> "External API повернув поле → воно обов'язково повинно бути в нашій
> DTO."

А таке:

> **External DTO повинна достатньо точно описувати ту частину transport
> contract, яку реально споживає наш application.**

------------------------------------------------------------------------

# 3. Якщо Datafarcio потрібен ДВОМ модулям

Наприклад:

``` text
shopping ──┐
           ├──→ Datafarcio
recipe ────┘
```

Тепер дублювати два однакові HTTP clients уже може не мати сенсу.

Тоді інтеграцію можна винести:

``` text
shared/
└── datafarcio/
    ├── DatafarcioClient.java
    ├── dto/
    │   ├── DatafarcioProductResponse.java
    │   └── DatafarcioSearchResponse.java
    └── mapper/
```

А:

``` text
shopping/
recipe/
```

можуть використовувати:

``` java
DatafarcioClient
```

Наприклад:

``` java
public class DatafarcioClient {

    public DatafarcioProductResponse getProduct(String id) {
        ...
    }
}
```

Структурно:

``` text
shopping ─────┐
              ▼
        DatafarcioClient
              │
recipe ───────┘
              │
              ▼
        Datafarcio API
```

## Де DTO?

**У `shared/datafarcio/dto`.**

Тому що ця DTO описує **Datafarcio**, а не Shopping і не Recipe.

Це хороший спосіб визначати ownership:

> `DatafarcioResponse` належить інтеграції Datafarcio.

Тому якщо сама інтеграція стала shared, її transport DTO їдуть у shared
**разом із нею**.

При цьому `ShoppingView`, `RecipeView` та domain models своїх модулів у
`shared/datafarcio` не переїжджають.

------------------------------------------------------------------------

# 4. Ще один рівень ізоляції --- не прив'язувати бізнес-модулі до Datafarcio

Припустимо Datafarcio нестабільний або ми потенційно хочемо замінити
його іншим provider.

Тоді можна не дозволяти:

``` text
ShoppingService
      ↓
DatafarcioClient
```

Бо Shopping у такому випадку знає конкретного постачальника.

Замість цього вводимо маленьку semantic abstraction:

``` java
public interface ProductDataProvider {

    ProductData getProduct(String id);

}
```

Структура:

``` text
shared/
└── productdata/
    ├── ProductDataProvider.java
    ├── ProductData.java
    │
    └── datafarcio/
        ├── DatafarcioClient.java
        ├── DatafarcioProductResponse.java
        ├── DatafarcioMapper.java
        └── DatafarcioProductDataProvider.java
```

Тоді:

``` text
ShoppingService ──┐
                  │
                  ▼
           ProductDataProvider
                  ▲
                  │
RecipeService ────┘
                  │
                  ▼
      DatafarcioProductDataProvider
                  │
                  ▼
          DatafarcioClient
                  │
                  ▼
           Datafarcio API
```

Тепер бізнес-модулі знають тільки:

``` java
ProductDataProvider
```

і їм не важливо, яка конкретно реалізація підставлена.

Сьогодні:

``` text
ProductDataProvider
        ↑
DatafarcioProductDataProvider
```

Завтра:

``` text
ProductDataProvider
        ↑
AnotherProviderAdapter
```

`ShoppingService` та `RecipeService` при цьому можуть взагалі не
змінитися.

Це зберігає інкапсуляцію реалізації:

> **Consumer залежить від потрібної йому capability, а не від назви
> конкретного зовнішнього provider.**

І це вже **маленький шматок hexagonal architecture всередині modular
monolith**.

Не потрібно через це переробляти весь проєкт у:

``` text
port/
adapter/
application/
domain/
```

Просто в конкретному місці abstraction виправдана.

------------------------------------------------------------------------

# 5. Фактично тут можуть існувати три різні моделі

Одна зовнішня інтеграція може мати три різні representations:

``` text
Datafarcio JSON
      ↓
[1] DatafarcioResponse
      ↓
      mapper
      ↓
[2] ProductData
      ↓
ShoppingService
      ↓
Shopping domain
      ↓
      mapper
      ↓
[3] ShoppingView
      ↓
ShoppingApi
      ↓
інший модуль
```

У них три різні відповідальності.

  -----------------------------------------------------------------------
  Model                   Кому належить           Для чого
  ----------------------- ----------------------- -----------------------
  `DatafarcioResponse`    Datafarcio integration  контракт зовнішнього
                                                  API

  `ProductData`           наша integration        внутрішня стабільна
                          boundary                модель потрібних нам
                                                  даних

  `ShoppingView`          Shopping API            контракт Shopping з
                                                  іншими модулями
  -----------------------------------------------------------------------

Не треба намагатися однією DTO закрити всі три задачі.

### `[1] DatafarcioResponse`

Відображає зовнішній transport contract.

Може змінитися через зміну стороннього API.

### `[2] ProductData`

Наша стабільна representation capability:

``` java
public record ProductData(
    String id,
    String name,
    BigDecimal price
) {}
```

Вона не повинна містити випадкові provider-specific деталі на кшталт:

``` text
datafarcioInternalCode
datafarcioRequestId
datafarcioRawPayload
```

якщо бізнесу вони не потрібні.

### `[3] ShoppingView`

Публічний контракт `shopping` для інших модулів.

Він описує те, що **Shopping хоче відкрити назовні**, а не те, що колись
повернув Datafarcio.

------------------------------------------------------------------------

# 6. Три різні рівні відповідальності API/DTO

У modular monolith важливо не змішувати три різні boundaries.

## Module API

Означає:

> **Публічний контракт бізнес-модуля для інших модулів.**

``` text
recipe/api/
├── RecipeApi.java
└── RecipeView.java
```

Наприклад:

``` java
public interface RecipeApi {

    RecipeView getRecipe(String id);

}
```

Це звичайний Java contract.

Controller тут не потрібен.

------------------------------------------------------------------------

## Web API

Означає:

> **HTTP interface нашого application для зовнішнього світу.**

``` text
recipe/web/
├── RecipeController.java
└── dto/
    ├── CreateRecipeRequest.java
    └── RecipeResponse.java
```

Саме тут живе controller.

Наприклад:

``` text
HTTP
 ↓
RecipeController
 ↓
RecipeService / RecipeApi
```

------------------------------------------------------------------------

## External integration API

Означає:

> **Наш вихід у сторонній API.**

``` text
integration/datafarcio/
├── DatafarcioClient.java
└── dto/
    └── DatafarcioResponse.java
```

Flow:

``` text
recipe ──→ integration/datafarcio ──HTTP──→ DATAFARCIO
```

Тут controller теж не потрібен.

Ми не приймаємо HTTP request --- ми самі є client і робимо outbound
request.

------------------------------------------------------------------------

## Всі три boundaries разом

``` text
             OUTSIDE USER
                  │
                 HTTP
                  ▼
            recipe/web
                  │
                  ▼
                recipe
                  ▲
                  │
             recipe/api
                  ▲
                  │
              shopping


recipe ──→ integration/datafarcio ──HTTP──→ DATAFARCIO
```

Тому:

> **API не означає Controller.**

Controller --- це конкретний inbound HTTP adapter.

------------------------------------------------------------------------

# 7. Domain одного модуля не повинен витікати через module API

Уявімо:

``` text
shopping
    ↓
MealPlanApi
    ↓
mealplan
```

Всередині `mealplan` є власний domain:

``` text
mealplan/
├── api/
│   ├── MealPlanApi.java
│   └── dto/
│       └── MealPlanView.java
│
├── domain/
│   ├── MealPlan.java
│   ├── Meal.java
│   └── MealDay.java
│
├── service/
│   ├── MealPlanService.java
│   └── MealPlanGenerator.java
│
└── repository/
```

Внутрішні сервіси працюють із:

``` java
MealPlan
```

але `Shopping` за замовчуванням не повинен отримувати цей internal
domain напряму.

Module API:

``` java
public interface MealPlanApi {

    MealPlanView getMealPlan(String id);

}
```

Наприклад:

``` java
public record MealPlanView(
    String id,
    List<MealView> meals
) {}
```

Flow:

``` text
MealPlan domain
      ↓
mapper
      ↓
MealPlanView
      ↓
MealPlanApi
      ↓
Shopping
```

А Shopping:

``` java
class ShoppingService {

    private final MealPlanApi mealPlanApi;

    public ShoppingList createFromMealPlan(String id) {

        MealPlanView mealPlan = mealPlanApi.getMealPlan(id);

        ...
    }
}
```

Це дозволяє змінювати internal `MealPlan` без автоматичного ламання всіх
consumers.

Default правило:

> **Domain одного модуля не виходить за його межі. Module API повертає
> власні API DTO/read models.**

Маленькі immutable value objects іноді можна свідомо розділити між
boundaries, але це окреме рішення, а не default.

------------------------------------------------------------------------

# 8. Тепер Redis / Caffeine

Redis трохи інший за REST integration.

Зазвичай немає такого flow:

``` text
GET external REST API
→ JSON
→ RedisResponseDto
```

Ми працюємо через Redis client / Spring Data Redis.

Тому якщо Redis використовується тільки Recipe:

``` text
recipe/
├── api/
├── service/
├── repository/
└── cache/
    ├── RecipeCache.java
    └── RecipeCacheEntry.java
```

Наприклад:

``` java
@Component
class RecipeCache {

    private final RedisTemplate<String, RecipeCacheEntry> redis;

    ...
}
```

`RecipeCacheEntry` --- це не API DTO.

Це **cache representation**.

Наприклад:

``` java
public record RecipeCacheEntry(
    String id,
    String name,
    List<String> ingredients
) {}
```

Краще називати його `RecipeCacheEntry`, а не просто `RecipeDto`, щоб із
назви було видно його boundary та призначення.

------------------------------------------------------------------------

# 9. Якщо Redis використовують два або більше модулів

Не потрібно автоматично робити:

``` text
shared/cache/
└── RedisCacheService.java
```

який кешує все підряд.

Краще:

``` text
recipe/
└── cache/
    ├── RecipeCache.java
    └── RecipeCacheEntry.java

mealplan/
└── cache/
    ├── MealPlanCache.java
    └── MealPlanCacheEntry.java

infrastructure/
└── RedisConfig.java
```

Обидва модулі можуть фізично використовувати один:

``` text
RedisTemplate
RedisConnectionFactory
Redis server
```

але кожен модуль сам володіє:

-   key naming;
-   TTL;
-   cache entry;
-   invalidation;
-   тим, що саме кешувати;
-   коли читати cache;
-   коли його оновлювати.

Структурно:

``` text
                  Redis
                    ▲
          ┌─────────┴─────────┐
          │                   │
     RecipeCache        MealPlanCache
          ▲                   ▲
          │                   │
       recipe             mealplan
```

А глобально знаходиться тільки configuration:

``` text
infrastructure/
└── RedisConfig.java
```

Наприклад:

``` java
@Configuration
public class RedisConfig {

    @Bean
    RedisConnectionFactory redisConnectionFactory(...) {
        ...
    }

    @Bean
    RedisTemplate<String, Object> redisTemplate(...) {
        ...
    }
}
```

Головне правило:

> **Infrastructure створює технічний механізм. Business module визначає,
> навіщо і як його використовувати.**

------------------------------------------------------------------------

# 10. Redis фізично global ≠ caching logic global

Те, що Redis один на весь application, не означає, що caching logic
повинна бути глобальною.

Це той самий принцип, що з PostgreSQL.

Фізично:

``` text
              PostgreSQL
             /    |     \
         recipe mealplan shopping
```

але логічно:

``` text
recipe    → RecipeRepository
mealplan  → MealPlanRepository
shopping  → ShoppingRepository
```

Точно так само:

``` text
                Redis
               /     \
          recipe    mealplan
```

але логічно:

``` text
recipe/cache/RecipeCache
mealplan/cache/MealPlanCache
```

Технологія може бути shared фізично.

**Business policy залишається локальною.**

------------------------------------------------------------------------

# 11. Не переносити caching у web тільки тому, що запит прийшов через Controller

Наприклад:

``` text
HTTP
 ↓
RecipeController
 ↓
RecipeService
 ↓
cache
```

зазвичай краще, ніж:

``` text
HTTP
 ↓
RecipeController
 ↓
Redis
 ↓
RecipeService
```

Чому?

Бо caching --- це зазвичай властивість **use case / query**, а не HTTP
transport.

Завтра `RecipeService` може викликатися не тільки controller:

``` text
MealPlan
 ↓
RecipeApi
 ↓
RecipeService
```

Якщо cache сидить тільки у controller:

``` text
REST request → cached

MealPlanApi call → not cached
```

хоча обидва читають ті самі recipes.

Тому частіше правильніше:

``` text
Controller
     ↓
RecipeApi / Service
     ↓
Caching
     ↓
Repository
```

Тоді неважливо, хто викликав use case:

``` text
REST
Shopping
MealPlan
Background job
```

cache policy застосовується однаково.

------------------------------------------------------------------------

# 12. Приклад cache flow

Структура:

``` text
recipe/
├── api/
│   └── RecipeApi.java
├── service/
│   └── RecipeService.java
├── cache/
│   ├── RecipeCache.java
│   └── RecipeCacheEntry.java
└── repository/
    └── RecipeRepository.java
```

Flow:

``` text
RecipeApi
   ↓
RecipeService
   │
   ├─ cache.get(id)
   │       │
   │       └─ HIT → return
   │
   └─ MISS
       ↓
   RecipeRepository
       ↓
   cache.put(...)
       ↓
     return
```

`RecipeCache` відповідає за technical cache access.

`RecipeService` визначає business/use-case flow.

`RecipeCacheEntry` визначає representation, яка лежить у cache.

`RedisConfig` створює connection/template infrastructure.

------------------------------------------------------------------------

# 13. Redis чи Caffeine --- коли потрібен interface

Не кожна cache implementation потребує interface.

Якщо application точно використовує Redis і abstraction нічого не дає:

``` java
@Component
class RecipeCache {
    ...
}
```

достатньо.

Якщо реально потрібно мати можливість перемикати:

``` text
Redis
↕
Caffeine
```

тоді можна ввести:

``` java
public interface RecipeCache {

    Optional<RecipeCacheEntry> get(String id);

    void put(String id, RecipeCacheEntry recipe);

    void evict(String id);
}
```

Implementation:

``` text
RedisRecipeCache
```

або:

``` text
CaffeineRecipeCache
```

Flow:

``` text
RecipeService
     ↓
RecipeCache
    ↙   ↘
Redis   Caffeine
```

Це знову локальна abstraction.

Не потрібно переводити весь application на hexagonal architecture.

------------------------------------------------------------------------

# 14. Коли cache/Redis справді може стати shared capability

Є два різні випадки.

## Варіант A --- shared тільки technical infrastructure/helper

Наприклад три модулі мають caching.

Можна мати:

``` text
infrastructure/
└── RedisConfig.java
```

і більше нічого shared не створювати.

Кожен модуль сам використовує Redis.

Якщо з'явилась реально reusable generic helper:

``` text
shared/
└── cache/
    └── CacheExecutor.java
```

вона не повинна знати:

``` text
Recipe
MealPlan
Shopping
```

Це generic technical utility.

------------------------------------------------------------------------

## Варіант B --- Redis usage перетворився на централізовану platform capability

Наприклад система використовує Redis для:

-   distributed locks;
-   rate limits;
-   sessions;
-   idempotency keys;
-   shared counters;
-   TTL policies;
-   distributed state;
-   cache statistics.

Тоді може з'явитися:

``` text
platform/
└── redis/
```

або:

``` text
shared/
└── redis/
```

Це вже platform/infrastructure capability.

Але навіть тоді:

``` text
recipe cache policy
```

залишається у `recipe`.

Platform layer знає **як працювати з Redis**.

Recipe знає **що, коли і навіщо кешувати**.

------------------------------------------------------------------------

# 15. Два питання для будь-якої технології

Для будь-якої нової dependency корисно завжди розділяти:

``` text
1. WHO OWNS THE USE CASE?
2. WHO CREATES / OWNS THE TECHNICAL RESOURCE?
```

## Redis

``` text
WHO OWNS CACHE OF RECIPES?
→ recipe

WHO CREATES RedisConnectionFactory?
→ infrastructure
```

## AI

``` text
WHO OWNS "GENERATE MEAL PLAN"?
→ mealplan

WHO CONFIGURES OpenAI client?
→ mealplan/config, якщо integration локальна
   або infrastructure/shared AI integration, якщо client реально shared
```

## CSV

``` text
WHO OWNS "EXPORT SHOPPING LIST"?
→ shopping

WHO KNOWS HOW TO WRITE GENERIC CSV?
→ shopping локально
   → shared/export, якщо reused
```

## PostgreSQL

``` text
WHO OWNS Recipe data?
→ recipe

WHO CONFIGURES DataSource?
→ infrastructure
```

Ця модель дуже корисна для питання:

> **"Куди покласти нову штуку?"**

------------------------------------------------------------------------

# 16. Де повинна жити DTO --- коротке правило

DTO не має одного глобального місця.

DTO живе **біля boundary, контракт якого вона представляє**.

### HTTP request/response нашого застосунку

``` text
recipe/web/dto/
├── CreateRecipeRequest.java
└── RecipeResponse.java
```

### Контракт Recipe для інших модулів

``` text
recipe/api/
├── RecipeApi.java
└── RecipeView.java
```

або:

``` text
recipe/api/dto/RecipeView.java
```

### Контракт Datafarcio

Якщо integration локальна:

``` text
shopping/integration/datafarcio/dto/
└── DatafarcioResponse.java
```

Якщо integration shared:

``` text
shared/datafarcio/dto/
└── DatafarcioResponse.java
```

### Representation Redis cache

``` text
recipe/cache/
└── RecipeCacheEntry.java
```

### Внутрішня stable model provider abstraction

``` text
shared/productdata/
└── ProductData.java
```

Тому:

> **Не створювати глобальний `dto/` на весь application.**

Назва і розташування DTO повинні одразу показувати, **чий контракт вона
представляє**.

------------------------------------------------------------------------

# 17. Повний приклад: два модулі + shared provider + Datafarcio

``` text
com.familymenu.backend

├── shopping/
│   ├── api/
│   │   ├── ShoppingApi.java
│   │   └── ShoppingView.java
│   ├── domain/
│   │   └── ShoppingList.java
│   ├── service/
│   │   └── ShoppingService.java
│   └── web/
│       ├── ShoppingController.java
│       └── dto/
│           └── ShoppingResponse.java
│
├── recipe/
│   ├── api/
│   │   ├── RecipeApi.java
│   │   └── RecipeView.java
│   ├── domain/
│   │   └── Recipe.java
│   └── service/
│       └── RecipeService.java
│
├── shared/
│   └── productdata/
│       ├── ProductDataProvider.java
│       ├── ProductData.java
│       └── datafarcio/
│           ├── DatafarcioClient.java
│           ├── DatafarcioProductDataProvider.java
│           ├── DatafarcioMapper.java
│           └── dto/
│               ├── DatafarcioProductResponse.java
│               └── DatafarcioSearchResponse.java
│
└── infrastructure/
    └── DatafarcioConfig.java
```

Flow:

``` text
ShoppingService ──┐
                  │
                  ▼
           ProductDataProvider
                  ▲
                  │
RecipeService ────┘
                  │
                  ▼
      DatafarcioProductDataProvider
                  │
                  ▼
          DatafarcioClient
                  │
                  ▼
            HTTP request
                  │
                  ▼
           Datafarcio API
                  │
                  ▼
      DatafarcioProductResponse
                  │
                  ▼
          DatafarcioMapper
                  │
                  ▼
             ProductData
                  │
          ┌───────┴───────┐
          ▼               ▼
      shopping          recipe
```

Тут: - Datafarcio contract ізольований; - business modules не знають
конкретного provider; - provider можна підмінити; - `ProductData` є
нашою stable integration model; - `ShoppingView` та `RecipeView`
залишаються module API contracts; - domain кожного модуля залишається
локальним.

------------------------------------------------------------------------

# 18. Повний приклад: два модулі + Redis

``` text
com.familymenu.backend

├── recipe/
│   ├── api/
│   ├── domain/
│   ├── service/
│   │   └── RecipeService.java
│   ├── repository/
│   │   └── RecipeRepository.java
│   └── cache/
│       ├── RecipeCache.java
│       └── RecipeCacheEntry.java
│
├── mealplan/
│   ├── api/
│   ├── domain/
│   ├── service/
│   │   └── MealPlanService.java
│   ├── repository/
│   │   └── MealPlanRepository.java
│   └── cache/
│       ├── MealPlanCache.java
│       └── MealPlanCacheEntry.java
│
└── infrastructure/
    └── RedisConfig.java
```

Flow:

``` text
RecipeService                     MealPlanService
     │                                  │
     ▼                                  ▼
 RecipeCache                       MealPlanCache
     │                                  │
     └──────────────┐      ┌────────────┘
                    ▼      ▼
                       Redis
```

При цьому:

``` text
RecipeCache
```

може мати TTL 30 хвилин,

а:

``` text
MealPlanCache
```

TTL 5 хвилин.

Один Redis server не означає одну cache policy.

------------------------------------------------------------------------

# 19. AI --- той самий принцип

Якщо AI потрібен тільки `mealplan`:

``` text
mealplan/
├── service/
│   └── MealPlanGenerationService.java
└── ai/
    ├── OpenAiMealPlanGenerator.java
    ├── dto/
    │   └── OpenAiResponse.java
    └── OpenAiMapper.java
```

Якщо implementation одна і немає причини її міняти --- interface не
обов'язковий.

Якщо хочемо не залежати від OpenAI:

``` java
public interface MealPlanGenerator {

    MealPlanSuggestion generate(MealPlanRequest request);

}
```

Тоді:

``` text
MealPlanGenerationService
          ↓
   MealPlanGenerator
          ↑
OpenAiMealPlanGenerator
```

Якщо завтра Gemini:

``` text
MealPlanGenerationService
          ↓
   MealPlanGenerator
       ↙      ↘
    OpenAI   Gemini
```

Якщо AI integration потрібна декільком модулям, generic technical client
або provider capability може перейти у `shared`.

Наприклад:

``` text
shared/
└── ai/
    ├── AiClient.java
    ├── AiRequest.java
    ├── AiResponse.java
    └── openai/
        ├── OpenAiClient.java
        └── dto/
            └── OpenAiResponse.java
```

Але business prompts, mapping у `MealPlan`, `Recipe` тощо залишаються у
відповідних business modules.

Якщо AI виростає у власну capability --- prompt management, provider
routing, retries, token accounting, embeddings, caching, observability
--- тоді він може стати окремим:

``` text
ai/
├── api/
├── service/
├── model/
├── provider/
│   ├── AiProvider.java
│   ├── OpenAiProvider.java
│   └── GeminiProvider.java
└── config/
```

Усередині цього модуля можна застосувати локальний
hexagonal/ports-and-adapters pattern, не переводячи весь application на
hexagonal architecture.

------------------------------------------------------------------------

# 20. Підсумкова mental model

Коли бачимо нову integration або dependency, не питаємо одразу:

> "Це shared чи infrastructure?"

Йдемо послідовно.

### Крок 1

Хто володіє business use case?

``` text
→ owner module
```

### Крок 2

Integration потрібна тільки цьому модулю?

``` text
так → integration/cache/ai/... залишається локально
```

### Крок 3

З'явився другий реальний consumer?

``` text
так → перевірити, чи integration справді generic
```

### Крок 4

Якщо generic:

``` text
→ shared
```

разом із transport DTO, які описують цю integration.

### Крок 5

Business modules не повинні знати конкретного provider?

``` text
→ semantic interface/provider
```

Наприклад:

``` text
ProductDataProvider
AiProvider
RecipeCache
```

### Крок 6

Provider-specific DTO залишаються біля provider implementation:

``` text
datafarcio/dto/
openai/dto/
```

### Крок 7

Stable internal model знаходиться біля abstraction:

``` text
ProductData
AiResult
```

### Крок 8

Module API DTO залишається у module API:

``` text
shopping/api/ShoppingView
recipe/api/RecipeView
```

### Крок 9

Web DTO залишається біля controller:

``` text
recipe/web/dto/RecipeResponse
```

### Крок 10

Технічний resource configuration:

``` text
RedisConnectionFactory
DataSource
WebClient
ObjectMapper
```

за потреби створюється у:

``` text
infrastructure/
```

але business usage цього resource залишається у module owner.

------------------------------------------------------------------------

# Короткі правила для AI / coding agent

1.  **API не означає Controller.**
2.  `module/api` --- Java contract між бізнес-модулями.
3.  `module/web` --- HTTP inbound boundary.
4.  `integration/<provider>` --- outbound boundary до стороннього API.
5.  External transport DTO живе біля конкретної integration/provider.
6.  Якщо integration стає shared, її transport DTO переходять у shared
    разом із integration.
7.  Domain одного business module не експортується іншим модулям за
    замовчуванням.
8.  Module API повертає API DTO/read model (`RecipeView`,
    `MealPlanView`).
9.  Не використовувати одну DTO одночасно як external response, domain
    model і module API response.
10. Provider-specific DTO не повинна протікати у business services.
11. За потреби mapper перетворює provider DTO у stable internal model.
12. Якщо consumers не повинні залежати від конкретного provider ---
    ввести semantic interface (`ProductDataProvider`, `AiProvider`).
13. Interface вводиться через реальну потребу в
    isolation/replaceability, не механічно.
14. Redis/Caffeine cache policy належить business module, який кешує
    свої дані.
15. Один фізичний Redis не означає один global `RedisCacheService`.
16. `RecipeCacheEntry` живе у `recipe/cache`; `MealPlanCacheEntry` --- у
    `mealplan/cache`.
17. `RedisConfig` / `RedisConnectionFactory` можуть бути global
    infrastructure.
18. Cache не переноситься у web тільки тому, що дані читаються через
    controller.
19. Cache краще розташовувати на рівні use case/service/query, щоб ним
    користувалися всі entrypoints.
20. `shared` використовується тільки після появи реального повторного
    використання.
21. Shared technical code не повинен знати domain конкретних business
    modules.
22. Якщо shared integration розростається у capability --- зробити
    окремий module.
23. Усередині окремого складного модуля дозволено локально застосувати
    ports/adapters.
24. Не потрібно через локальний provider/interface переводити весь
    modular monolith на hexagonal architecture.

------------------------------------------------------------------------

# Найкоротша формула

``` text
DTO живе біля свого контракту.
```

``` text
Web DTO             → module/web/dto
Module API DTO      → module/api[/dto]
External API DTO    → integration/provider/dto
Shared provider DTO → shared/.../provider/dto
Cache representation→ module/cache
Domain model        → module/domain
```

І:

``` text
Фізично shared technology
        ≠
global business responsibility
```

Наприклад:

``` text
RedisConnectionFactory → infrastructure
Recipe cache policy    → recipe
MealPlan cache policy  → mealplan
```

А для зовнішньої інтеграції:

``` text
External JSON
      ↓
ProviderResponse DTO
      ↓
Mapper
      ↓
Stable internal model
      ↓
Business service
      ↓
Domain
      ↓
Module API DTO
      ↓
Other module
```

Це дозволяє одночасно зберігати: - чіткий ownership; - ізоляцію
зовнішніх API; - стабільні module contracts; - локальний domain; -
можливість підміняти provider; - мінімальний boilerplate; - можливість
поступово перейти від simple integration до shared capability, локальної
hexagonal architecture або окремого модуля тільки тоді, коли це реально
потрібно.
