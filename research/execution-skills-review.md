# Execution Skills — два етапи підготовки

Дата: 2026-10-26. Статус: обидва пакети підготовлено для review користувача;
це не посекційно погоджена фінальна версія й не дозвіл запускати агентів.

Користувач доручив самостійно опрацювати обидва пакети Superpowers,
адаптувати до погодженої методології та створити у Skills. General не
редагується. Нові packages мають версію `0.1.0-draft`, глобально не
встановлювалися. Продуктовий код і runtime DevGuard не змінювалися.

## Етапи та статуси

| Етап | Результат | Статус |
| --- | --- | --- |
| 1. Executing Plans | Основний агент, exact brief, журнал, snapshots, перевірки, final review | Підготовлено; очікує review користувача |
| 2. Subagent-Driven Development | Coordinator, implementer/reviewer prompts, fix loop, final review | Підготовлено; очікує review користувача |

## Прочитані джерела

Локальний Superpowers: обидва SKILL.md, implementer-prompt,
task-reviewer-prompt, re-review-prompt; references preflight, resuming,
handling-reports, cannot-verify, batching, fix-loop, final-review. Також
прочитано scripts task-start, task-done, sdd-workspace, task-brief,
review-package. Scripts не запускалися.

Це адаптація процесів, не дослівний переклад усіх джерел. Збережено
операційні ролі й допоміжні контракти; зміни політик нижче зроблені на
основі вже погоджених правил користувача. Нові конкретні defaults, як
ліміт fix loop та локальний формат evidence, потребують його review.

## Структура створених пакетів

```text
skills/
├── executing-plans/
│   ├── SKILL.md
│   └── references/
│       ├── execution-records.md
│       ├── review-snapshots.md
│       └── final-review.md
└── subagent-driven-development/
    ├── SKILL.md
    ├── implementer-prompt.md
    ├── task-reviewer-prompt.md
    ├── re-review-prompt.md
    ├── final-reviewer-prompt.md
    └── references/
        ├── task-coordination.md
        ├── fix-loop.md
        └── final-review.md
```

Обидва режими посилаються на спільні execution-records і review-snapshots
у executing-plans. Inline final-review використовує локальний
final-reviewer-prompt із другого пакета лише для погодженого незалежного
review. Це явне спільне використання документів; пакети підготовлені як
набір, не як два незалежні дистрибутиви без references.

## Покриття джерельних процесів

| Superpowers | Де враховано в наших пакетах |
| --- | --- |
| Вибір inline/SDD, контекст і continuous execution | Обидва SKILL.md; scope користувача й межі переходу |
| Ledger, task brief, recovery | executing-plans/references/execution-records.md |
| Preflight між задачами | execution-records.md; перевірка exact контрактів |
| Snapshot/review package | executing-plans/references/review-snapshots.md |
| Model Selection | SDD SKILL.md; вибір за користувачем/середовищем, без auto escalation |
| Dispatch implementer | implementer-prompt.md та SDD task loop |
| DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED | references/task-coordination.md |
| Batching та очікування | task-coordination.md |
| Spec compliance + task quality | task-reviewer-prompt.md |
| Cannot verify from diff | task-coordination.md та reviewer output |
| Fix loop та scoped re-review | fix-loop.md і re-review-prompt.md |
| Completion evidence | Обидва task loops; complete не з обіцянки implementer |
| Final review / fix wave / finish | Обидва final-review.md, локальний final-reviewer-prompt.md |
| Rationalizations | Таблиці в обох SKILL.md |

## Важливі адаптації для review

- Mandatory TDD замінено погодженими перевірками. Нові тести не
  генеруються без явного запиту; reviewer не виконує/не створює tests.
- Commit/push, merge й destructive cleanup не виконуються автоматично.
  Журнал і evidence не видаляються під припущенням, що вони вже в Git.
- Rulings дозволяють записувати дрібні рішення, але не обходити approval
  суттєвих вимог, архітектури, scope або дозволів. Збережено зупинку для
  непередбачених проблем із General.
- Snapshot може описувати реально існуючі commits або exact незакомічений
  результат; другий не називається commit. Жодного auto commit заради review.
  Production DevGuard immutable commit snapshot contract цими файлами не
  реалізований; read-only текст не видається за OS sandbox.
- Inline independent review не запускається лише через доступність tool;
  режим має бути погоджений. SDD обраний режим включає task/final reviewers,
  але не дає implementer/reviewer права створювати додаткових субагентів.
- У fix loop збережено максимум п’ять раундів; після трьох безрезультатних
  спроб — аналіз з користувачем замість автоматичного підвищення моделі.
  На ліміті відомий blocking дефект не стає complete/parked-success.
- Один обмежений final fix pass/wave не приховує залишкові дефекти:
  результат повертається користувачу з відкритими питаннями.
- Scripts Superpowers не скопійовано: вони залежать від їхніх workspace
  шляхів, англомовних task headings, commit ranges і test command gate.
  Потрібні артефакти описано як ручний workflow наявними інструментами,
  без тверджень про автоматичний runner.

## Зовнішні Skills із джерел — відкладено

| Посилання Superpowers | Роль у джерелі | Стан у нашій адаптації |
| --- | --- | --- |
| writing-plans | Вхідний погоджений план | Наш пакет уже створено |
| using-git-worktrees | Ізоляція робочого середовища | Відкладено; неактивний FUTURE-SKILL маркер |
| test-driven-development | Обов’язковий RED/GREEN gate | Не є залежністю; mandatory TDD суперечить нашим погодженим правилам |
| systematic-debugging | Дослідження причин невдачі | Відкладено; неактивний FUTURE-SKILL маркер |
| verification-before-completion | Докази перед заявою про успіх | Принцип включено; зовнішній Skill відкладено, маркер неактивний |
| requesting-code-review / code-reviewer.md | Незалежний whole-branch reviewer | Окремо не опрацьовано; локальний draft final-reviewer-prompt закриває явний контракт без зовнішньої залежності |
| finishing-a-development-branch | Завершення, вибір merge/PR/cleanup | Відкладено; неактивний маркер, без автоматичних Git mutations |
| using-superpowers/references | Адаптація можливостей середовища | Зовнішній bootstrap не переноситься; можливості й дозволи визначає поточне середовище |

Ці зовнішні Skills відкладені за рішенням користувача; не переходити до їхнього опрацювання. Відкладений scope: [загальний план](general-skills-migration.md). Незалежний Design Review Brainstorm і
code review реалізації мають різні задачі й не підміняють одне одного.

## Перевірки та межі висновку

Перевірено YAML frontmatter обох Skills стандартним Ruby YAML parser,
name/description, всі локальні Markdown-посилання та code fences.
Перечитано всі створені файли й звірено workflow-покриття з таблицею вище.
Пройдено ручною перевіркою сценарії: task complete з evidence; відсутній
контекст; failed check; відновлення журналу іншого плану; dirty baseline;
Cannot verify; fix cap; недоступний reviewer; відсутні Git commits.

Це перевірка інструкцій, не поведінковий запуск агента. Додаткових агентів,
команд проєктів, tests/build або live reviews не запускали. Штатний
Python quick_validate має раніше виявлену залежність від відсутнього
PyYAML; його успіх не заявляється, залежності не встановлювали.

General SHA-256 незмінний:
`05e9bae3b8eb146d0591bce67ac73e02ec7a47ca37728f30a75bfa99adcc062e`.
Наступна дія — користувацький review двох draft пакетів; до інших Skills
автоматично не переходимо.


## Уточнення scope — 2026-10-27

Додано лише неактивні FUTURE-SKILL маркери для п’яти відкладених зовнішніх Skills в основних executing-plans і subagent-driven-development SKILL.md. Старий текст цих файлів збережено; всі створені prompts і references залишено без змін. Нічого не видалено й не вимкнено. Подальше розширення зупинено; опис ролей наявних MD і межа DevGuard — у [загальному плані](general-skills-migration.md). Обидва execution пакети й далі очікують користувацького review.


## Що збережено

Користувач уточнив: відкладати лише п’ять ще не створених зовнішніх Skills,
не видаляти й не вимикати вже створені MD. Після уточнення попередня
пропозиція агента перевести внутрішні reviewers у неактивні заглушки
скасована; жодного такого переписування не виконано.

| Наявний файл / група | Для чого потрібні |
| --- | --- |
| `executing-plans/SKILL.md` | Основний агент виконує погоджений план |
| `execution-records.md` | Журнал, exact brief, preflight і відновлення; спільні для двох режимів |
| `review-snapshots.md` | Правила зафіксованого контексту для наявних локальних review-процесів |
| `executing-plans/references/final-review.md` | Фінальна самоперевірка / погоджений незалежний review |
| `subagent-driven-development/SKILL.md` | Координація обраного режиму із субагентами |
| `implementer-prompt.md` | Завдання виконавцю, його межі й report contract |
| `task-reviewer-prompt.md` | Перевірка однієї задачі за вимогами та якістю |
| `re-review-prompt.md` | Перевірка конкретних виправлень без нового повного аудиту |
| `final-reviewer-prompt.md` | Перевірка цілісного результату погодженого плану |
| `task-coordination.md` | Відновлення, batching, статуси виконавця, Cannot verify та очікування |
| `fix-loop.md` | Обмежений цикл виправлень і ескалація проблем |
| `subagent-driven-development/references/final-review.md` | Фінальний review і завершення координованого режиму |

Ці MD — допоміжні інструкції, не нові глобальні Skills і не окремі
фонові процеси. Файл prompt не запускає агента сам по собі.


## Межа з DevGuard

Користувач описав основний зовнішній цикл: він робить commit → DevGuard
аналізує зміни → користувач вибирає findings і передає developer prompt
у чат → агент виконує дозволені виправлення. Наявний локальний review
обраного execution режиму не є автоматичним запуском DevGuard і не
замінює цей окремий цикл. Усі поточні prompts збережені за прямим
уточненням користувача; зміна їхніх обов’язків потребуватиме окремого
узгодження, а не прихованого вимкнення під час додавання маркерів.

Межа подальшої роботи: шліфувати вже створений набір. Нові зовнішні
пакети з цього реєстру автоматично не опрацьовувати. Якщо користувач
пізніше вирішить додати конкретний Skill, знайти його маркери, погодити
контракт, замінити місця реальними посиланнями й перевірити весь маршрут.

