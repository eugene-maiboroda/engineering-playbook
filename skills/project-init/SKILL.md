---
name: project-init
description: >-
  Створи початковий Java/Spring проєкт за явно заданими параметрами
  й стандартами користувача або застосуй конкретний стандарт foundation
  до наявного проєкту за прямим запитом.
metadata:
  version: "0.1.0-draft"
---

# Project Init

## Визнач завдання

Прочитай запит, локальний AGENTS.md і спільний progress проєкту, якщо вони
доступні. Визнач, що доручено: створення нового проєкту чи конкретна зміна
наявного. Не починай Brainstorm або Writing Plans лише через читання цього
Skill. Працюй у наданому scope та збережи користувацькі файли.

Якщо користувач вказав конкретний стандарт, прочитай відповідний reference
нижче й застосуй його до дорученої задачі. Не створюй новий skeleton для
додавання error handling, configuration або іншої частини наявного проєкту.

## Обери сценарій за запитом

- `mode: create` або явно обраний користувачем Create Project — створи
  новий проєкт за параметрами, input-contract і standards нижче.
- `mode: inspect` або підключений користувачем готовий проєкт для перевірки —
  прочитай [checklist перевірки](../../ai-rules/references/project-initialization.md).
  Не генеруй skeleton, не замінюй POM, версії, конфігурацію чи унікальні
  компоненти шаблоном. Поверни факти, розбіжності й рекомендації.
- Якщо режим не заданий і намір неоднозначний — уточни його до запису.
  Відсутність папки або наявність лише skeleton не є дозволом на create.

У inspect читай лише стандарти, потрібні для перевірки. Якщо користувач
погодив конкретне виправлення, виконай його в наданому scope; не переходь
до повної регенерації. Кроки створення нижче виконуй лише в режимі create.

## Прочитай потрібні стандарти

- Перед створенням metadata прочитай [input-contract.md](references/input-contract.md).
- Перед формуванням POM прочитай [maven-standard.md](references/maven-standard.md):
  Java 25, базові dependencies, properties і annotation processors.

- Перед написанням Java-коду прочитай
  [project-conventions.md](references/project-conventions.md): стиль,
  відповідальності компонентів, naming, Java Code Style.
- Для configuration, typed properties, Clock та startup bootstrap прочитай
  [infrastructure.md](references/infrastructure.md).
- Для Docker, dev/prod, назв ресурсів, properties і env-файлів прочитай
  [environments.md](references/environments.md).
- Для базового security стандартного backend прочитай
  [security.md](references/security.md); додай його за замовчуванням.
- Для HTTP-контрактів прочитай [web-api.md](references/web-api.md).
- Для обробки HTTP-помилок прочитай
  [error-handling.md](references/error-handling.md).
- Перед рішеннями про тести прочитай
  [Testing Policy](../../ai-rules/testing-policy.md).

Читай лише потрібні для поточної дії references. Для нового HTTP-проєкту
з Docker dev/prod застосуй усі відповідні стандарти. Для іншого складу не
додавай HTTP, Docker або persistence без потреби й погодженого scope.

## Підготуй створення проєкту

1. Отримай точну цільову директорію, ім’я, package/group/artifact identity,
   Java version, build tool та погоджений склад foundation.
2. Покажи кінцевий абсолютний шлях. Перевір дозволи й вміст директорії;
   непорожній проєкт не перезаписуй. Не читай сусідні репозиторії чи секрети.
3. Перевір сумісність конкретних версій за актуальними офіційними
   джерелами. Запиши точні версії; не використовуй плаваюче latest.
4. Застосуй metadata й Maven-стандарт із references. Не проси повторно
   обирати базові dependencies. Уточнюй лише відсутній parentDirectory,
   неоднозначну назву, несумісні версії чи запитані відхилення. Базове session security додавай за замовчуванням за security.md;
   для помилок використовуй погоджений code/message контракт ErrorResponseWriter.

## Створи й перевір

Після визначення входів і дозволу створити проєкт:

1. Створи build-файли, структуру та entry point за погодженими параметрами.
   Додай на головний Application-клас `@SpringBootApplication` і
   `@ConfigurationPropertiesScan` за [infrastructure](references/infrastructure.md#application-entry-point).
2. Додай погоджені configuration/bootstrap, profiles, Docker та HTTP основу
   за прочитаними references. Не реалізовуй бізнес-функціональність поза scope.
3. Додай внутрішні AGENTS.md, design, plan, progress і реальні env-файли
   до .gitignore; .env.example заповни лише прикладами без секретів.
   Продуктову AI-функціональність не ігноруй як внутрішні AI-артефакти.
4. Перевір фактичні версії, dependencies, структуру й конфігурацію.
   Виконай погоджену збірку й прочитай результат. Не додавай нові тести
   автоматично. Не запускай Docker або зовнішні сервіси без дозволу.
5. При помилці зупини залежні дії, повідом причину й потрібне рішення.
   Не видавай неперевірений skeleton за готовий.

## Заверши

Запиши створені/змінені файли, версії, перевірки, limitations і наступну
дію в спільний progress за
[правилами журналу](../../ai-rules/references/project-progress.md).
Повідом користувачу результат і точний шлях. Не виконуй commit/push.
Якщо завдання надійшло з іншого процесу, поверни йому результат;
не запускай наступний Skill самостійно.
