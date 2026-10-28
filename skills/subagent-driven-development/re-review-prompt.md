# Scoped Re-review — перевірка виправлень

Перед передачею reviewer підстав конкретні абсолютні шляхи й ID із
підготовленого пакета. PACKAGE_PATH — каталог матеріалів review,
HEAD_ID — ID нового snapshot, не обов’язково Git commit. Додай шлях
до початкового task review report і всі ще відкриті причини FAIL / Needs fixes.
Для фінального fix pass передай відповідний фінальний report.

```text
Перевір fix round [TASK_ID / ROUND], не виконуй новий повний аудит.
Brief/spec: [BRIEF_PATH / SPEC_PATH].
Попередній review report: [PREVIOUS_REVIEW_REPORT_PATH].
Відкриті findings і причини FAIL / Needs fixes дослівно: [FINDINGS].
Report із доданими fix evidence: [REPORT_PATH].
Попередній reviewed snapshot: [FIX_BASE_ID].
Новий immutable snapshot/manifest і fix diff: [HEAD_ID / PACKAGE_PATH].

Для кожного finding визнач, чи виправлено конкретний дефект,
і перевір лише fix diff на нові проблеми, спричинені виправленням.
Використовуй зафіксовані версії, не live checkout.

Читай і шукай у переданих матеріалах дозволеними read-only інструментами,
зокрема файловими командами, якщо це доступний спосіб читання.
Не редагуй файли/Git-стан, не запускай проєктний код, build або tests,
не генеруй tests і не делегуй review. Потрібний exact контекст
запитай у координатора. Report — твердження; зістав evidence з diff.
Не оголошуй «виправлено», якщо код лише змінено без усунення дефекту.

Поверни:
## Finding verdicts
Для кожного: ADDRESSED | NOT_ADDRESSED | CANNOT_VERIFY,
із exact file:line та поясненням.
## Початкові причини FAIL / Needs fixes
Для кожної: усунено / залишається / неможливо підтвердити; посилання
на finding verdict і evidence. Незачеплені висновки попереднього report
не переглядай без причини. Це scoped re-review, а не новий повний аудит.
## New breakage
Нові проблеми у fix diff з severity/evidence; або «Немає».
## Out-of-scope observations
Помічене поза fix diff; не розширюй ним цикл автоматично.
## Verdict
Виправлено / залишаються blocking findings / бракує контексту.
```

Поза-scope знахідки не перекласифіковуй автоматично як Minor: збережи
реальний вплив для окремого triage. Суттєвий відомий ризик не приховуй
за межею review; координатор вирішує наступну дію з користувачем.
