> Актуалізація: користувач погодив схему design → plan → progress.
> Нижче назви Roadmap/Runtime в карті означають історичні секції джерела,
> а не чинну вимогу створювати ці файли. Стан дослівного збігу описує
> первинний аудит; нові погоджені зміни наведено наприкінці.

# General: перевірка збереження правил

Дата: 2026-10-27. Scope: декомпозиція General, без нового Project-init,
генератора, виконання планів або погодження execution drafts.

## Джерело перевірки

База: `b3ccfe7:ai-rules/general.md`, 566 рядків, до створення Skills.
Це останній commit, що змінював General перед поточним HEAD `18d8175`.
`git diff b3ccfe7 HEAD -- ai-rules/general.md` порожній: два наступні
коміти не змінювали базу. SHA-256 початкового вмісту:
`05e9bae3b8eb146d0591bce67ac73e02ec7a47ca37728f30a75bfa99adcc062e`.
Це також hash, раніше записаний у плані міграції. Початковий текст
відновлюється через `git show b3ccfe7:ai-rules/general.md`.

Порівнювався повний текст, включно з прикладами, списками й вкладеними
секціями. «Дослівно» нижче означає збіг тіла секції без заголовка та
розділювача; «за змістом» — ручну звірку вимог, а не побайтовий збіг.

## Посекційна карта

| Початкова секція | Поточне джерело | Результат |
| --- | --- | --- |
| Project Initialization: область застосування | [init reference](../ai-rules/references/project-initialization.md) | Новий програмний проєкт, ручний skeleton; не універсальний етап усіх задач |
| 1. Study Project Context | [init reference](../ai-rules/references/project-initialization.md#контекст-технічний-аналіз-і-обговорення) | Збережено матеріали, роль Playbook і документації, architectures, conventions, infrastructure, environments, principles, decisions та HTTP API правила; читання релевантне задачі й дозволам |
| 2. Initial Technical Analysis | той самий reference | Збережено всі сім складових бачення, Java/Spring приклади dependencies, лише реальна потреба, рекомендаційний характер, заборона передчасних реалізації та roadmap/runtime |
| 3. Architecture Discussion | той самий reference; [Brainstorm](../skills/brainstorming/SKILL.md) | Збережено погодження напряму до детального плану, modules, integrations, persistence, dependencies, technologies, protocols, infrastructure |
| 4. Project Creation Is User-Controlled | [init reference](../ai-rules/references/project-initialization.md#project-creation-is-user-controlled) | Дослівно: включно з Java 21/25, фактичним source of truth й забороною самовільного повернення конфігурації |
| 5. Inspect Created Project | [init reference](../ai-rules/references/project-initialization.md#inspect-created-project) | Дослівно: build config, Java/Spring versions, dependencies, packages, configuration, Git, файли й повідомлення розбіжностей |
| 6. Explicit Transition to Planning | [init reference](../ai-rules/references/project-initialization.md#перехід-до-планування-та-реалізації-foundation) | Явний scope і приклад дозволу збережені; вже наданий дозвіл не перепитується |
| 7. Planning Starts With Project Foundation | той самий reference; [Writing Plans](../skills/writing-plans/SKILL.md#design-plan-і-progress) | Roadmap/runtime, technical decisions, повний список foundation, infrastructure/environments, відмежування business functionality збережені; виконання foundation відділене від planning |
| Project Initialization Flow, Core Rule | [init reference](../ai-rules/references/project-initialization.md#послідовність-для-нового-програмного-проєкту) | Послідовність від контексту до business implementation явно відтворена з погодженням плану перед foundation |
| Senior-Level Readable Code | [Project Conventions](../skills/project-init/references/project-conventions.md#11-readable-code) і [Java style](../skills/project-init/references/project-conventions.md#agreed-java-code-style) | Усі принципи збережені: людський послідовний код, назви, методи без дроблення, явний flow, приклади Playbook/проєкту, production Java без var, var лише в тестах, стиль змінених фрагментів без масового форматування |
| Testing Policy | [Testing Policy](../ai-rules/testing-policy.md) | Дослівно: явний запит, критична логіка, мінімум перевірок, максимум 20 на весь проєкт, кожен набір параметрів окремо, заборони, наявне перевищення, пріоритет і перевірка якості без нових тестів |
| Before Implementation | [implementation rules](../skills/executing-plans/references/implementation-rules.md#before-implementation) | Дослівно, усі сім пунктів |
| Planning | [Writing Plans](../skills/writing-plans/SKILL.md) | Обидва іменовані документи, українська мова, approval до коду й після суттєвих змін збережені |
| Roadmap | [Writing Plans](../skills/writing-plans/SKILL.md#design-plan-і-progress) | Мета, концепція, архітектура, етапи, напрямок і актуалізація при зміні концепції/важливого функціоналу збережені |
| Runtime | той самий Skill | Поточний етап, реалізоване, зміни/рішення, відхилення, критичні деталі, наступний крок та оновлення після суттєвих етапів збережені |
| Planning Workflow | [Writing Plans](../skills/writing-plans/SKILL.md#робочий-цикл-документів) | Дев’ять дій збережено за змістом; наявні документи використовуються без дублювання для дрібних задач |
| Implementation | [implementation rules](../skills/executing-plans/references/implementation-rules.md#implementation) | Дослівно, включно з мінімальними змінами, naming/packages, межами рефакторингу й журналами |
| Git Rules | `b3ccfe7:ai-rules/general.md`, Git Rules | Дослівно, commit/push залишаються користувачу |
| Local AI Files | `b3ccfe7:ai-rules/general.md`, Local AI Files | Дослівно: приклади, .gitignore, виключення для продуктової AI-функціональності |
| Configuration and Environment | [Infrastructure](../skills/project-init/references/infrastructure.md#configuration-values-and-typed-access) | Заборони hardcode, API keys у Java, System.getenv і розкиданих @Value, environment/configuration та typed access збережені |
| Docker environment | [Environments](../skills/project-init/references/environments.md) | Обидві директорії, compose, .env і .env.example; реальні значення локально/у .gitignore, приклади без секретів у Git збережені |
| Bootstrap Properties | [Infrastructure](../skills/project-init/references/infrastructure.md#typed-configuration-properties) | bootstrap/properties, невеликі ConfigurationProperties, приклад BrowserProperties з чотирма полями, typed доступ і заборона глобального properties object збережені |
| Unexpected Situations | [implementation rules](../skills/executing-plans/references/implementation-rules.md#unexpected-situations) | Дослівно: п’ять тригерів і шість кроків, включно зі зупинкою й рішенням користувача |
| Code Reuse | [implementation rules](../skills/executing-plans/references/implementation-rules.md#code-reuse) | Дослівно, усі п’ять пунктів |
| General Rules | `b3ccfe7:ai-rules/general.md`, General Rules, Git/Local AI Files; Infrastructure | Усі вісім пунктів збережені, технічні деталі мають прямі посилання |

## Відмінності від оригіналу, які не приховуємо

- Читання всього Playbook замінено контекстним читанням. Це відповідає
  погодженій моделі: Skills читають релевантні AI rules, Brainstorm не
  запускає перевірку skeleton за замовчуванням.
- Старий текст поєднував Planning і створення foundation. За раніше
  погодженою методологією Writing Plans готує план, execution реалізує
  foundation тільки після його затвердження. Склад foundation збережено.
- Для очевидного погодженого fix не нав’язується повторний повний
  Brainstorm; дрібні задачі не створюють дублікати roadmap/runtime.
- Дозволи на доступ залишаються обов’язковими; надані приклади з іншого
  проєкту не означають дозвіл читати інші репозиторії.

Це зміни процесу з погодженого контексту, не твердження про дослівну
ідентичність усіх документів. Нової політики тестів або Git не введено.

## Виправлення цього проходу

- Повернуто явне формулювання про усвідомлений людський код без механічно
  згенерованих конструкцій у Project Conventions.
- У General відновлено загальну вимогу уточнювати недостатню інформацію
  замість припущень; попереднє скорочення звужувало її до суттєвих вимог.
- У init reference додано явну послідовність, що замінює стару flow-схему.
- У прикладі BrowserProperties прибрано сторонню цифру `2` перед int timeout.
- У плані міграції позначено історичні твердження про незмінність General
  та додано посилання на цей актуальний аудит.

## Перевірки та межі висновку

Програмно підтверджено точне перенесення тіл дев’яти секцій: Testing
Policy, Before Implementation, Implementation, Unexpected Situations,
Code Reuse, Git Rules, Local AI Files, Project Creation Is User-Controlled,
Inspect Created Project. Решту звірено вручну за вимогами, прикладами й
переліками; погоджені відмінності наведено вище.

У межах цього порівняння неврахованих вимог початкового General після
виправлень не виявлено. Це аудит документів, не поведінковий eval агента.
Посилання перевіряються окремо; автоматичне discovery/встановлення не
реалізовано. General є збереженою точкою входу, але сам по собі не
забезпечує завантаження агентом. Нові Skills не створювалися, execution
drafts не оголошено погодженими. Commit/push не виконувалися.

## Подальша погоджена зміна: AGENTS.md

Після первинного аудиту користувач попросив прибрати два старі приклади
agent-specific MD-файлів і використовувати AGENTS.md. Local AI Files
тепер відрізняється від початкового тексту цим погодженим перейменуванням;
позначка «дослівно» в таблиці описує стан первинної перевірки.
Додано [правила підключення](../ai-rules/references/project-agent-instructions.md):
короткі межі й посилання в AGENTS.md, повні джерела збережені, стан у runtime.
Файли інструкцій у продуктових репозиторіях цим проходом не змінювалися.

## Подальша погоджена зміна: design → plan → progress

Окремі roadmap і runtime скасовані за прямим рішенням користувача.
Задум, цілі, концепція, архітектура й напрямок розвитку зберігаються в
design; етапи, порядок, залежності й задачі — у plan. Progress є єдиним
журналом: поточний етап, виконане, рішення, відхилення, критичні деталі,
перевірки й наступний крок. Вимоги української мови, локальності, approval
та актуалізації після суттєвих змін збережені. Старі документи інших
проєктів не видалялися й не перейменовувалися. Правила перенесення без
втрат наведено в project-agent-instructions; посилання на новий журнал
визначають Writing Plans та execution-records. Це погоджена зміна
організації документів, а не випадкова втрата початкових вимог.

## Уточнення: один progress на проєкт

Користувач погодив єдиний спільний `docs/progress.md` для всіх фіч,
планів і чатів проєкту. Попередній опис progress конкретного плану
замінено. Стан, рішення, докази й наступні дії збережені; кожний запис
містить прив’язку до відповідної роботи. Оновлення обов’язкове після
кожної задачі або зміни, до наступної роботи. Текст призначено іншому
чату без доступу до розмови. Чинне джерело —
[project-progress.md](../ai-rules/references/project-progress.md).
