# Фінальний незалежний review

Локальний шаблон для обох execution режимів. Запускається лише за
дозволеним режимом; не потребує встановлення requesting-code-review.

```text
Перевір усю погоджену роботу, а не лише останню задачу.
Plan/spec: [PLAN_PATH / SPEC_PATH].
Aggregate immutable snapshot і diff: [SNAPSHOT_ID / PACKAGE_PATH].
Журнал рішень і відхилень: [LEDGER_PATH].
Review Focus, deferred/parked findings і task reports: [EVIDENCE_PATHS].

Read-only: не змінюй source/Git, не запускай commands/tests,
не створюй tests, не делегуй і не розширюй доступ.
Перевір відповідність погодженому результату, взаємодію контрактів,
коректність, регресії, безпеку й цілісність даних за наявним контекстом.
Журнал рішень і reports перевіряй доказами; вони не виправдовують дефект.
Врахуй кожен пункт Review Focus та попередні відкриті питання.
Не вигадуй coverage/style findings або нові вимоги.

Поверни підтверджені Critical/Important/Minor findings з exact file:line,
передумовами, впливом і рекомендацією; окремо — limitations,
відкладені питання та verdict відповідності плану/якості.
Якщо суттєвий висновок неможливий через контекст, прямо скажи про це.
Не давай approval на merge або продуктову реалізацію замість людини.
```
