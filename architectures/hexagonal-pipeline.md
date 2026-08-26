---
title: Hexagonal Pipeline
---

# Спрощена гексагональна архітектура — Pipeline

Еталон: `si-article-pipeline-refactored` (NYPost article/video collector).

## Коли застосовувати

Задача за формою — це послідовність незалежних кроків обробки даних, де кожен крок:
бере якийсь набір "необробленого" з БД → обробляє → записує результат назад у БД.
Приклад: crawl links → parse pages → download images → download videos → process authors → export.

Не підходить, якщо кроки повинні ділитись станом у пам'яті або виконуватись
паралельно один з одним (не послідовно) — тоді це вже інша форма (event-driven/чергова
система), не цей шаблон.

## Структура пакетів

```
domain/            чисті моделі (records), без Spring/JPA
port/in/           вхідні use-case контракти (напр. ArticlePipelineUseCase)
port/out/          вихідні контракти: persistence/, зовнішні сервіси
application/       оркестрація і кроки пайплайну (use-case класи)
adapter/           реалізації port/out, згруповані по фіча-домену
                    (article/, author/, video/, image/, export/, http/, sitemap/, shared/)
infrastructure/    ТІЛЬКИ @Configuration класи і біни, жодної бізнес-логіки
bootstrap/         точка запуску пайплайну: CommandLineRunner + properties
```

`adapter/` групується за доменом фічі (article, author, video...), а не за технічним типом
(не буде окремо "repositories/", "clients/" на весь проєкт) — кожна фіча самодостатня,
всередині неї вже є persistence/, mapper/ якщо треба.

## Pipeline-оркестратор — головна відмінність від "просто гексагональної"

Один клас реалізує вхідний порт пайплайну і виконує кроки послідовно:

`ArticleCollectorService implements ArticlePipelineUseCase` (`application/ArticleCollectorService.java`)

```java
runIfEnabled(steps.discoverLinks(), batchSize -> discoverLinksUseCase.discoverLinks(...));
runIfEnabled(steps.parsePages(), parseArticlesUseCase::parsePages);
runIfEnabled(steps.downloadImages(), downloadImagesUseCase::downloadImages);
...
```

Правила цього шару:

- Кожен крок — окремий use-case клас в `application/` з одним публічним методом
  (`DiscoverLinksUseCase`, `ParseArticlesUseCase`, `DownloadImagesUseCase`, ...).
- Крок вмикається/вимикається і параметризується (batchSize) **виключно через properties**,
  ніколи через if/else в коді оркестратора.
- Кроки **не знають один про одного** і не передають об'єкти в пам'яті між собою — вся
  комунікація йде через БД як через чергу: наступний крок сам читає свій "необроблений"
  зріз (`findNewBatch`, `findPendingImages`, `findPendingVideos`). Це дає змогу перезапускати
  будь-який крок окремо, без відновлення стану попереднього прогону.
- `runIfEnabled` — єдиний helper, що ховає перевірку `enabled` і валідацію (`batchSize > 0`).
  Не треба генералізувати це в `Step`-інтерфейс/framework — двох перевантажень достатньо.
- Помилка одного айтема всередині кроку (`markError` в БД) не валить весь крок; виключення,
  що вилетіло з самого кроку, валить весь пайплайн і логується в оркестраторі одним
  catch-блоком навколо всієї послідовності.

## Properties-driven керування кроками

`bootstrap/properties/StepsProps.java` — один record на всі кроки, з двома формами:

```java
@ConfigurationProperties(prefix = "steps")
public record StepsProps(
        Step discoverLinks,       // enabled + batchSize
        Step parsePages,
        ToggleStep exportAuthors, // тільки enabled, без batchSize
        ...
) {
    public record Step(boolean enabled, int batchSize) {}
    public record ToggleStep(boolean enabled) {}
}
```

`application.properties`:
```
steps.discover-links.enabled=false
steps.discover-links.batch-size=5000
steps.export-authors.enabled=false
```

Правила:

- Один `@ConfigurationProperties` record на **одну тему** (`StepsProps`, `CollectorProps`,
  `BrowserProps`, `VideoProps`, `StorageProps`, `ExportProps`) — не один величезний Properties
  клас на весь застосунок.
- `@ConfigurationPropertiesScan` в `Main.java` — records підхоплюються автоматично, без ручної
  реєстрації кожного в конфігу.
- Використовуй nested record для "форми" кроку (`Step` / `ToggleStep`), а не окремий top-level
  клас на кожен — форма спільна, тема (назва поля) різна.
- Дефолти й нормалізація значення — в компактному конструкторі рекорду
  (`ExportProps`: `mode = mode == null ? CATEGORY : mode`), не в місці використання.

## Стиль конфігів і бінів (`infrastructure/`)

- Config-класи групуються за темою (`AppConfig` — http/executor, `ExportConfig` — export
  resolver, `PlaywrightConfig` — browser), не один `AppConfig` на все.
- `infrastructure/` містить **тільки** `@Bean`/`@Configuration` — жодного бізнес-коду. Якщо в
  конфіг-класі з'явилась логіка складніша за вибір реалізації — це сигнал винести її в
  adapter/application.
- Опціональний важкий ресурс — через `@ConditionalOnProperty` (`PlaywrightConfig`:
  `browser.enabled=true`), а не через `null`-перевірки в коді, що його використовує.
- Ресурс з lifecycle — `@Bean(destroyMethod = "...")` (+ `@Lazy` якщо створення дороге і не
  завжди потрібне): `Playwright`, `Browser`, `ExecutorService`.
- Вибір реалізації порту за конфігом — явний `switch` у `@Bean`-методі за enum-полем
  properties (`ExportConfig.exportTargetResolver`), не через `@ConditionalOnProperty` на
  кожну реалізацію окремо.
- Наскрізні налаштування генераторів коду (MapStruct) — окремий маркер-конфіг
  (`MapStructConfig`, `@MapperConfig`), не розкидані анотації по кожному мапперу.

## Дві форми "підключення стратегії" — не плутати

- **"Спробувати всіх по черзі"** → Spring збирає всі біни інтерфейсу в `List<Port>`,
  порядок — через `@Order`. Приклад: `List<VideoExtractor>` в `ArticleParser` — кожен
  провайдер (JW, Connatix, YouTube) пробує знайти своє відео, перший, хто знайшов, виграє.
- **"Вибрати одного за конфігом"** → явний `@Bean` switch у Config-класі за enum property.
  Приклад: `ExportTargetResolver` — режим експорту (`export.mode=tags`) обирає одну
  реалізацію (`CategoryExportTargetResolver` / `TopicExportTargetResolver` /
  `SportsBettingExportTargetResolver`).

Не змішувати ці дві форми в одному порту — якщо треба і "спробувати всіх", і "мати
дефолт/override", це вже ускладнення, яке варто обговорити окремо, а не тягнути в обидва боки.

## Persistence: explicit ID, без ORM-звʼязків

Див. [[no-orm-relations]] — той самий принцип, тут конкретна форма:

- Кожна persistence-сутність — окрема таблиця/`@Entity`, звʼязки — прості `String`
  id-поля (`articleId`, `authorLink`), ніколи `@OneToMany`/`@ManyToOne`/cascade.
- ID генерується явно в adapter-шарі (`IdGenerationPort` → `UuidIdGenerationAdapter`),
  не через `@GeneratedValue` — ID потрібен *до* збереження (щоб проставити його в
  повʼязані записи: image/video → articleId).
- Реалізація порту (`ArticlePersistenceService implements ArticlePersistencePort`) ховає
  всередині Spring Data репозиторій (`private interface XxxRepository extends
  JpaRepository`, видимість пакету, не public) і за потреби прямий `JdbcTemplate` для
  bulk-операцій (`batchUpdate` + `ON CONFLICT ... DO NOTHING` для ідемпотентного інсерту
  посилань).
- MapStruct-маппер (`ArticleMapper`) — конвертація entity ↔ domain, ізольована від сервісу.

## Паралелізм

Один спільний `ParallelExecutor` (`@Component`, обгортає `ExecutorService`) з двома
методами — `execute(items, Consumer)` (fire-and-forget по батчу) і `map(items, Function)`
(зібрати результати). Use-case'и ніколи не працюють з `Future`/`ExecutorService` напряму —
паралелізм в одному місці, use-case залишається послідовним по батчах, паралельним
всередині батчу.

## Іменування адаптерів (спостереження, не строге правило)

Реалізація port/out найчастіше `*Adapter` (`ImageDownloadAdapter`, `VideoDownloadAdapter`,
`PlaywrightBrowserAdapter`), але persistence-реалізації — `*PersistenceService`
(`ArticlePersistenceService`), а деякі — просто описова назва без суфікса (`ArticleParser`,
`SitemapService`). Це нормально: головне — одна реалізація на порт і назва відображає що
клас робить, не механічне дописування "Adapter" всюди заради консистентності.

## Тестування

Оркестратор і кроки тестуються юніт-тестами напряму (`new ArticleCollectorService(mock, mock,
...).run()`), без Spring-контексту — швидко, ізольовано, перевіряє саме "які кроки з якими
параметрами викликані". `@SpringBootTest` тут майже не використовується: див.
[[springboottest-triggers-pipeline]] — повний контекст піднімає `CommandLineRunner`, який
одразу піде в реальну БД.

## Чого свідомо уникати тут (щоб не було оверінжинірингу)

- Не робити generic `Step`/`Pipeline` framework-абстракцію під кроки — явні use-case класи
  + `runIfEnabled` читаються прямолінійніше, ніж шар індирекції заради "гарної" абстракції.
- Не вводити message bus/чергу подій між кроками — послідовний прогін і БД-як-черга
  достатні для sequential-пайплайна; event-driven комунікація — це вже інша архітектура.
- Не оборачувати кожен бін у `@ConditionalOnProperty` — тільки для дійсно важких
  опціональних ресурсів (headless browser), не для дешевих бінів.
---------
# Архітектурні правила (спільні для всіх архітектур)

Цей файл — спільний шар поверх будь-якої з моїх базових архітектур:

- `architectures/modular-monolith.md` — модульний моноліт
- `architectures/hexagonal-simple.md` — спрощена гексагональна архітектура без pipeline
- `architectures/hexagonal-pipeline.md` — спрощена гексагональна архітектура у вигляді pipeline
- `architectures/event-driven.md` — event-driven/чергова архітектура

Перш ніж щось міняти в проєкті або створювати з нуля: визнач, яка з архітектур застосована (дивись пакетну
структуру, `checklists/architecture-discovery.md`), відкрий її конкретний файл в
`architectures/` і застосовуй правила звідти. Цей файл — про те, що спільне для всіх трьох.

---

## Пакетна структура — спільні ролі

Незалежно від конкретної архітектури, ці пакети означають одне й те саме:

- **`domain/`** — чисті моделі (records/POJO), без анотацій фреймворку (Spring, JPA).
  Правила предметної області, без інфраструктурних залежностей.
- **`port/in/`, `port/out/`** — явні контракти на межі шару: що застосунок приймає ззовні
  (in) і що йому потрібно від зовнішнього світу (out — persistence, http, файлова система).
- **`application/`** (або еквівалент для модульного моноліту — усередині модуля) —
  оркестрація use-case'ів. Тут бізнес-послідовність дій, не деталі реалізації портів.
- **`adapter/`** — реалізації `port/out`, згруповані **за доменом фічі**, а не за технічним
  типом (не "repositories/" + "clients/" на весь проєкт, а `article/`, `author/`, `video/`
  кожен зі своїм persistence/mapper всередині).
- **`infrastructure/`** — ТІЛЬКИ `@Configuration`/`@Bean`. Жодної бізнес-логіки. Якщо в
  конфіг-класі зʼявився бізнес-код — це сигнал винести його в `adapter/`/`application/`.
- **`bootstrap/`** (де застосовно, напр. pipeline) — точка входу і керування тим, що саме
  виконується: `CommandLineRunner`/entrypoint + properties, які вмикають/вимикають частини
  системи.

## Properties-driven конфігурація

- Один `@ConfigurationProperties` record — **одна тема** (`StepsProps`, `CollectorProps`,
  `StorageProps` тощо). Не один величезний Properties-клас на весь застосунок.
- `@ConfigurationPropertiesScan` на рівні `Main`/entrypoint — records підхоплюються
  автоматично, без ручної реєстрації кожного.
- Спільна "форма" (напр. увімкнено/вимкнено + розмір батчу) — nested record всередині
  теми, а не окремий top-level клас на кожне повторення форми.
- Дефолти й нормалізація значення — в компактному конструкторі рекорду, не в місці
  використання.

## Стиль конфігів і бінів

- Config-класи групуються за темою (http/executor, export, browser...), не один
  `AppConfig` на все.
- Опціональний важкий ресурс — `@ConditionalOnProperty`, а не `null`-перевірки в коді, що
  його споживає.
- Ресурс з lifecycle — явний `@Bean(destroyMethod = "...")` (+ `@Lazy` якщо створення
  дороге і потрібне не завжди).
- Вибір однієї реалізації порту за конфігом (enum property) — явний `switch` у
  `@Bean`-методі. Якщо натомість треба "спробувати всіх по черзі" — `List<Port>` і хай
  Spring збере всі біни інтерфейсу (`@Order` для пріоритету). Це дві різні форми, не
  змішувати їх в одному порту.

## Persistence

- [[no-orm-relations]] Явні ID замість ORM-звʼязків: `@OneToMany`/`@ManyToOne`/cascade —
  ні, навіть коли предметна область дійсно many-to-many. Звʼязок — простим id-полем
  (`articleId`, `authorId`), яке одна сторона проставляє явно.
- ID генерується в adapter-шарі (окремий `IdGenerationPort`), не через `@GeneratedValue` —
  особливо коли ID потрібен *до* збереження, щоб проставити його у повʼязані записи.
- Реалізація persistence-порту ховає Spring Data репозиторій усередині пакету (не
  `public interface`) і за потреби — прямий `JdbcTemplate`/bulk-операції поруч, без
  окремого шару абстракції над ними.

## Error handling

[[error-handling-rigor]] Перед тим, як покривати помилку одним спільним cleanup/catch —
розрізни: це збій *посеред* операції запису (частина стану вже змінена, потрібен explicit
rollback/compensating-дія) чи збій *між* операціями (попередній крок завершився чисто,
можна просто зупинитись)? Один and той самий catch-блок для обох випадків ховає різницю
і може замаскувати неконсистентний стан.

## Не форсувати уніфікацію

[[dont-force-pattern-reuse]] Кожна фіча має природну форму даних і запиту. Не копіювати
патерн сусідньої фічі заради "консистентності", якщо природна форма цієї фічі інша —
консистентність заради консистентності гірша за відповідність задачі.

## Тестування

[[springboottest-triggers-pipeline]] Якщо entrypoint — `CommandLineRunner` (або будь-що,
що самостійно стартує роботу при піднятті контексту), `@SpringBootTest` підніме реальний
прогін проти реальної БД. Тримати максимум один мінімальний `contextLoads`-тест з
`@SpringBootTest`; логіку тестувати юніт-тестами напряму (конструювати клас з мокнутими
залежностями, без Spring-контексту).

## Перед реалізацією в конкретному проєкті

1. Визнач, яка з трьох архітектур застосована.
2. Відкрий відповідний файл в `architectures/`.
3. Застосовуй спільні правила з цього файлу поверх специфічних.
4. Якщо конкретний проєкт свідомо відхиляється від спільного правила — це рішення
   проговорюється окремо, не мовчки.