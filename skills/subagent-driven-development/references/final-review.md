# Фінальний review і завершення

Після задач підготуй aggregate snapshot від початкового baseline плану
до підсумкового стану за
[review-snapshots.md](../../executing-plans/references/review-snapshots.md).
Включи план, spec, Review Focus, reports, evidence, відхилення та
відкладені/спірні findings. Передай
[final-reviewer-prompt.md](../final-reviewer-prompt.md) незалежному reviewer
у межах обраного користувачем режиму; модель — за правилами середовища.
Якщо reviewer недоступний, поясни обмеження й погодь fallback, не імітуй
review та не підміняй його самоперевіркою мовчки.

Для підтверджених погоджених виправлень — один fix dispatch з цілісним
списком, а не fixer на кожен finding, потім один scoped re-review fix
snapshot за [re-review-prompt.md](../re-review-prompt.md). Перевірки
виконує implementer, reviewer читає exact evidence й код. Нові tests і
commit не створюються автоматично.

Якщо після цього залишився суттєвий дефект/невідомість, не запускай
нескінченні хвилі і не оголошуй успіх: поверни користувачу конкретний
стан та запропонуй наступну роботу. Minor поза scope збережи для рішення
користувача. Відомий високий ризик не ховай у списку неблокувальних.

Перед завершенням зведи всі суттєві Rulings, approvals, deferred/open
findings та limitations у фінальне повідомлення. Додай report/ledger
paths і snapshot IDs. Журнал залишається джерелом аудиту після сесії,
не видаляй його автоматично під припущенням, що все вже є в Git.
Merge/push/cleanup не виконуються як наслідок approval review.
