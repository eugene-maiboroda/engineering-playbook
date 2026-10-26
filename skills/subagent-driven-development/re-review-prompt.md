# Scoped Re-review — перевірка виправлень

```text
Перевір fix round [TASK_ID / ROUND], не виконуй новий повний аудит.
Brief/spec: [BRIEF_PATH / SPEC_PATH].
Попередні findings дослівно: [FINDINGS].
Report із доданими fix evidence: [REPORT_PATH].
Попередній reviewed snapshot: [FIX_BASE_ID].
Новий immutable snapshot/manifest і fix diff: [HEAD_ID / PACKAGE_PATH].

Для кожного finding визнач, чи виправлено конкретний дефект,
і перевір лише fix diff на нові проблеми, спричинені виправленням.
Використовуй зафіксовані версії, не live checkout.

Read-only: не редагуй файли/Git-стан, не запускай commands/tests,
не генеруй tests і не делегуй review. Потрібний exact контекст
запитай у координатора. Report — твердження; зістав evidence з diff.
Не оголошуй «виправлено», якщо код лише змінено без усунення дефекту.

Поверни:
## Finding verdicts
Для кожного: ADDRESSED | NOT_ADDRESSED | CANNOT_VERIFY,
із exact file:line та поясненням.
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
