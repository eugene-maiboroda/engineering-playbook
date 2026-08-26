---
title: Playwright Research
description: Research of Playwright concurrency and Java synchronous bindings
---

# Playwright: Java synchronous binding, concurrency та SERP fetching

## 1. Задача дослідження

### Контекст

Задача --- побудувати високопродуктивний browser-based fetcher для
SERP-запитів.

Browser працює окремо від worker-а. Worker підключається до remote
browser через Playwright. Один browser здатний тримати багато сторінок
одночасно (у нашому сценарії орієнтир --- близько 20 pages).

Для SERP fetcher не потрібна складна browser automation:

-   не потрібно клікати елементи;
-   не потрібно заповнювати форми;
-   не потрібно керувати UI;
-   основна задача --- відкрити URL у справжньому browser runtime;
-   дочекатися необхідного стану сторінки / виконання JavaScript;
-   отримати результат.

Спрощено:

``` text
URL
 ↓
Playwright
 ↓
Remote Chrome
 ↓
HTTP request
 ↓
HTML + resources
 ↓
JavaScript execution
 ↓
готова сторінка / DOM
 ↓
результат
```

Тобто Playwright тут використовується переважно як інструмент керування
реальним браузером і виконання JavaScript.

### Початкове очікування

Логічно було очікувати таку архітектуру:

``` text
1 Playwright
      │
      ↓
1 Remote Browser
      │
      ├── Page 1 ──→ navigate(URL 1)
      ├── Page 2 ──→ navigate(URL 2)
      ├── Page 3 ──→ navigate(URL 3)
      ├── ...
      └── Page 20 ─→ navigate(URL 20)
```

Chrome сам по собі здатний обробляти багато вкладок конкурентно.

Питання дослідження було:

> Чи може один Playwright Java instance ефективно керувати багатьма Page
> одночасно і конкурентно запускати navigation?

------------------------------------------------------------------------

# 2. Що було виявлено

## Java як мова не є проблемою

Java повністю підтримує concurrency і multithreading:

-   `Thread`;
-   `ExecutorService`;
-   `CompletableFuture`;
-   virtual threads;
-   інші concurrency primitives.

Тому твердження:

> "Java не може виконувати Playwright паралельно"

неправильне.

Обмеження знаходиться не в Java як мові, а в API та concurrency model
**Playwright Java binding**.

------------------------------------------------------------------------

## Playwright Java має synchronous API

Playwright Java надає synchronous API.

Типовий виклик:

``` java
page.navigate(url);
```

є синхронним викликом з точки зору Java-коду.

На високому рівні:

``` text
Java
 │
 │ navigate(URL)
 ↓
Playwright / driver
 │
 ↓
Remote Chrome
 │
 │ response
 ↓
Playwright
 │
 ↓
Java продовжує виконання
```

У Java binding немає повноцінного async API на кшталт:

``` java
CompletableFuture<Response> navigateAsync(...)
```

який дозволив би природно запустити багато Playwright operations і
чекати їх разом.

------------------------------------------------------------------------

## Playwright Java objects не призначені для довільного concurrent access з багатьох threads

Ідея:

``` java
executor.submit(() -> page1.navigate(url1));
executor.submit(() -> page2.navigate(url2));
executor.submit(() -> page3.navigate(url3));
```

виглядає природно з точки зору Java.

Але один набір Playwright objects не є звичайним thread-safe API, через
який можна без обмежень одночасно керувати багатьма Page з різних Java
threads.

Тому не можна просто взяти один Playwright instance і перетворити його
synchronous API на справжній async Playwright API за допомогою
`ExecutorService`.

------------------------------------------------------------------------

## Важливо: Chrome і Playwright --- це різні рівні

Chrome здатний мати багато сторінок:

``` text
Chrome

Page 1
Page 2
Page 3
...
Page 20
```

і браузер здатний виконувати network requests, JavaScript, rendering та
іншу роботу конкурентно.

Отже проблема НЕ в тому, що:

> Chrome не може завантажувати 10--20 сторінок одночасно.

Проблема знаходиться у шарі керування:

``` text
Java application
       ↓
Playwright Java synchronous API
       ↓
remote browser
```

Проста аналогія:

> Browser --- це кімната з багатьма вкладками/екранами.\
> Один synchronous Playwright controller --- це один оператор, який
> послідовно віддає команди.

Ця аналогія не означає, що Chrome фізично має "одну мишку". Вона лише
пояснює bottleneck у моделі керування Java binding.

------------------------------------------------------------------------

## `newPage()` і `navigate()` --- різні речі

Важливо не змішувати створення Page та navigation.

Можна заздалегідь створити:

``` java
Page page1 = context.newPage();
Page page2 = context.newPage();
Page page3 = context.newPage();
// ...
```

і мати багато відкритих сторінок.

Але для SERP fetcher головна операція:

``` java
page.navigate(url);
```

Сам факт існування 20 Page ще не означає, що один Java Playwright
ефективно dispatch-не 20 navigation одночасно.

Саме navigation стала важливою частиною benchmark.

------------------------------------------------------------------------

## Чи можна обійти `navigate()`?

Якщо задача --- реально відкрити URL браузером, завантажити сторінку та
виконати її JavaScript, браузеру все одно потрібно дати команду перейти
на URL.

Звичайний сценарій:

``` java
Page page = context.newPage();

page.navigate(url);

String html = page.content();
```

Без navigation нова сторінка фактично залишається на:

``` text
about:blank
```

Тому для нашого use case navigation прибрати не можна: browser повинен
отримати URL і завантажити документ.

------------------------------------------------------------------------

## Спроба використати CDP не прибрала проблему

Для перевірки використовувався прямий:

``` java
CDPSession.send("Page.navigate", params);
```

Ідея була в тому, щоб не чекати повного завершення звичайного
`page.navigate()` і максимально швидко dispatch-нути navigation
commands.

Але `CDPSession.send(...)` у Java також є synchronous operation з точки
зору binding.

Тобто сам перехід на CDP не створив async API.

------------------------------------------------------------------------

## Результат benchmark

Тест напряму запускав navigation через CDP `Page.navigate` до очікування
кінцевого результату.

Один Playwright, один remote browser context, 20 вимірів:

  --------------------------------------------------------------------------
        Pages на   Dispatch p95   Повний batch   Повний batch       Максимум
      Playwright                           p50            p95 
  -------------- -------------- -------------- -------------- --------------
               1         535 ms         657 ms         671 ms         685 ms

               2       1,102 ms       1,368 ms       1,438 ms       1,581 ms

               5       2,922 ms       3,538 ms       3,818 ms       3,889 ms

              10       5,438 ms       6,783 ms       7,143 ms       7,277 ms
  --------------------------------------------------------------------------

Найцікавіший показник --- dispatch:

``` text
1 command   ≈ 0.535 s
2 commands  ≈ 1.102 s
5 commands  ≈ 2.922 s
10 commands ≈ 5.438 s
```

Зростання майже лінійне.

Приблизно:

``` text
0.535 × 2  ≈ 1.07 s
0.535 × 5  ≈ 2.68 s
0.535 × 10 ≈ 5.35 s
```

Це сильний сигнал, що bottleneck у цьому тесті знаходиться не в
здатності Chrome тримати 10 pages, а в dispatch/control path через один
synchronous Java Playwright connection.

Умовно очікувалось:

``` text
P1 ─────────────→
P2 ─────────────→
P3 ─────────────→
P4 ─────────────→
P5 ─────────────→
```

а вимірювання dispatch більше схоже на:

``` text
command P1 ─────→
                command P2 ─────→
                                  command P3 ─────→
                                                    ...
```

Тобто Chrome потенційно здатний виконувати роботу конкурентно, але
Java-side controller не dispatch-ить усі команди так, як це робив би
справжній asynchronous API.

------------------------------------------------------------------------

## Чому в поточній Java-архітектурі обрано 2 Pages на Playwright

У Playwright **немає обмеження "максимум 2 pages"**.

Дві сторінки --- це не правило бібліотеки.

Це performance trade-off, отриманий у нашому конкретному benchmark:

``` text
1 Page  → ~0.5 s dispatch
2 Pages → ~1.1 s dispatch
5 Pages → ~2.9 s dispatch
10 Pages → ~5.4 s dispatch
```

Отже `2 pages / Playwright` --- практичний sweet spot для поточної
системи: ми ще використовуємо один Playwright для більше ніж однієї
сторінки, але не накопичуємо великий serial dispatch delay.

Цей параметр не потрібно вважати універсально правильним. Він залежить
від:

-   latency між worker та remote browser;
-   browser infrastructure;
-   версії Playwright;
-   конкретного workload;
-   URL;
-   network conditions;
-   способу очікування результату.

Його потрібно підтверджувати benchmark-ами.

------------------------------------------------------------------------

## Поточна Java-архітектура

Якщо один remote Chrome може ефективно тримати приблизно 20 pages, а
оптимальний виміряний режим --- 2 pages на один Playwright instance,
виходить приблизно:

``` text
                    REMOTE CHROME
                    ~20 Pages
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   Playwright #1    Playwright #2    Playwright #3
      │    │           │    │           │    │
     P1   P2          P3   P4          P5   P6
        ...
   Playwright #10
      │     │
     P19   P20
```

Тобто для насичення одного browser:

``` text
~20 Pages
÷
2 Pages / Playwright
=
~10 Playwright instances
```

Якщо worker працює, наприклад, з 5 browser instances:

``` text
5 browsers × 10 Playwright ≈ 50 Playwright instances
```

Це і є важливий operational cost Java-рішення.

------------------------------------------------------------------------

## Що споживає ресурси

Треба розділяти два випадки.

### Локальний browser

Якщо кожний Playwright запускає власний Chromium:

``` text
Playwright
   ↓
Chromium
```

то основна вартість --- сам Chromium:

-   RAM;
-   CPU;
-   renderer processes;
-   JavaScript/V8;
-   DOM;
-   network;
-   sockets;
-   browser processes.

Багато окремих Chromium instances дуже дорогі.

### Наша архітектура: remote browser

У нашому випадку browser знаходиться окремо.

Тому worker має приблизно:

``` text
WORKER

JVM
├── Playwright instance #1
├── Playwright instance #2
├── Playwright instance #3
├── ...
└── Playwright instance #N
        │
        ↓
   remote browsers
```

Тобто 50 Playwright instances на worker **не означають 50 Chromium
instances на worker**.

Але Playwright instances все одно не безкоштовні. Вони створюють
overhead:

-   driver/process infrastructure;
-   Java-side objects;
-   buffers;
-   protocol processing;
-   network connections;
-   sockets;
-   memory;
-   CPU;
-   lifecycle management.

Тому десятки Playwright instances на одному worker потрібно окремо
load-test-ити.

------------------------------------------------------------------------

# 3. Висновок дослідження

## Java Playwright

Головний висновок:

> Проблема не в Java, не в Chrome і не в кількості відкритих Page.
> Проблема для нашого workload --- synchronous concurrency model
> Playwright Java binding.

Chrome може працювати з багатьма сторінками.

Java може працювати з багатьма threads.

Але Playwright Java не надає аналогічного Python async API для
природного concurrent dispatch багатьох незалежних browser operations
через один Playwright instance.

Тому для високого throughput доводиться масштабувати controller layer
кількістю Playwright instances:

``` text
Remote Browser
│
├── Playwright #1 → 2 pages
├── Playwright #2 → 2 pages
├── Playwright #3 → 2 pages
├── ...
└── Playwright #10 → 2 pages
```

Це працює, але збільшує resource та operational overhead worker-а.

------------------------------------------------------------------------

## Python Playwright

Python Playwright має окремий asynchronous API:

``` python
from playwright.async_api import async_playwright
```

і дозволяє природно організувати concurrent browser operations:

``` python
await asyncio.gather(
    page1.goto(url1),
    page2.goto(url2),
    page3.goto(url3),
    page4.goto(url4),
)
```

Це не означає, що Python "швидший за Java" як мова.

Також це не означає, що одна конкретна сторінка завантажиться швидше:

``` text
Java   → page load ≈ X
Python → page load ≈ X
```

Основний час все одно може витрачатися на:

-   network;
-   remote browser latency;
-   server response;
-   JavaScript;
-   DOM;
-   rendering.

Перевага Python async для нашого workload --- **concurrency density та
orchestration model**.

Умовна цільова схема:

``` text
ONE Python Playwright
          │
          ↓
ONE Remote Browser
          │
   ┌──────┼──────────────────────────┐
   ↓      ↓      ↓      ↓           ↓
  P1     P2     P3     P4    ...   P20
   │      │      │      │           │
  NAV    NAV    NAV    NAV         NAV
   │      │      │      │           │
   └──── concurrent browser work ────┘
```

замість Java workaround:

``` text
10 Java Playwright instances
              │
              ↓
       ONE Remote Browser
              │
          20 Pages
```

------------------------------------------------------------------------

## Чому Python async особливо підходить саме для SERP fetcher

Наш workload переважно I/O-bound:

``` text
send browser command
        ↓
wait network
        ↓
wait remote server
        ↓
wait browser/JS
        ↓
receive result
```

Під час очікування однієї сторінки controller може займатися іншими
сторінками.

Саме для такого workload asynchronous model особливо корисна.

Нам не потрібна складна взаємодія:

``` text
click → type → drag → click → screenshot → ...
```

Нам переважно потрібно:

``` text
URL → navigate → JS/render → result
```

Тому можливість тримати багато незалежних navigation operations
in-flight через один Playwright instance має велику архітектурну
цінність.

------------------------------------------------------------------------

## Фінальний архітектурний висновок

Для звичайної browser automation Playwright Java залишається нормальним
вибором.

Але для нашої конкретної задачі:

> **велика кількість незалежних SERP navigation requests до remote
> browsers**

асинхронний Playwright binding потенційно підходить краще.

Тому кандидат на оптимальну архітектуру:

``` text
Main Java system
      │
      │ jobs / requests
      ↓
Browser Fetcher Worker
      │
      │ Python + async Playwright
      ↓
Remote Browser Pool
      │
      ├── Browser 1 → many pages
      ├── Browser 2 → many pages
      ├── Browser 3 → many pages
      └── ...
```

Java може залишатися основною мовою всієї системи. Немає необхідності
переписувати application/domain layer на Python.

Python має сенс використати саме там, де його Playwright async API дає
конкретну технічну перевагу:

``` text
Java
├── orchestration
├── domain
├── queues
├── persistence
└── business logic

Python browser worker
└── async Playwright
      └── high-concurrency browser navigation
```

------------------------------------------------------------------------

## Що потрібно перевірити перед остаточним рішенням

Поточні результати показують проблему Java implementation, але остаточне
рішення **Java vs Python** потрібно приймати після прямого A/B
benchmark.

Потрібно порівняти однаковий workload:

``` text
JAVA

1 remote browser
10 Playwright × 2 pages
20 URLs
```

проти:

``` text
PYTHON

1 remote browser
1 Playwright
20 pages
20 URLs
asyncio.gather(...)
```

Вимірювати:

``` text
batch latency
requests/sec
p50
p95
p99
worker RAM
worker CPU
remote browser RAM
remote browser CPU
error rate
timeouts
long-tail latency
```

Особливо важливо порівнювати не лише latency одного request, а:

> **скільки успішних SERP pages система обробляє за секунду на одиницю
> CPU/RAM.**

Тобто ключова метрика:

``` text
throughput / resource cost
```

Якщо Python async покаже приблизно такий самий або кращий throughput при
значно меншій кількості Playwright instances та меншому resource
overhead worker-а, це буде сильним аргументом винести browser-fetching
layer у Python.

------------------------------------------------------------------------

## Короткий підсумок

``` text
Java language
    ↓
multithreading підтримує
    ↓
НЕ проблема

Chrome
    ↓
може працювати з багатьма pages конкурентно
    ↓
НЕ проблема

Playwright Java binding
    ↓
synchronous API + concurrency/thread-safety constraints
    ↓
bottleneck для нашого workload

Current workaround
    ↓
кілька Playwright instances
    ↓
~2 pages на instance за поточним benchmark
    ↓
більший worker overhead

Python Playwright
    ↓
async API
    ↓
багато navigation operations in-flight
    ↓
потенційно менше Playwright instances
    ↓
краща concurrency density

FINAL HYPOTHESIS
    ↓
Python async Playwright може бути кращим
для browser-worker шару SERP fetcher
```

### Головна теза дослідження

> **Browser здатний виконувати багато сторінок конкурентно. Вузьким
> місцем у дослідженій Java-реалізації став не Chrome, а synchronous
> control path Playwright Java. Для I/O-heavy SERP fetching варто
> перевірити Python async Playwright як окремий browser-worker, оскільки
> він дозволяє природно тримати багато navigation operations in-flight
> через один Playwright instance.**
