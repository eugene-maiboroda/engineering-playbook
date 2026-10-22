# Architecture Discovery

Перед зміною структури або додаванням фічі:

1. Визнач бізнес-модулі, власників даних і deployment units. Модульний
   моноліт та hexagonal isolation усередині модуля можуть співіснувати.
2. Знайди входи: Java API, HTTP, webhook, queue, scheduler, CLI. Для
   feature API перевір `api/internal`, `api/web`, спільний `api/dto` та
   локальні conventions (`main/services` чи `service`, `responds` чи `responses`).
3. Простеж один HTTP і один міжфічевий виклик до сервісу, use case та
   persistence. Consumer повинен залежати від API власника, а не його
   service/usecase, DAO/entity чи приватного mapper.
4. Розділи internal-only, web-only та справді спільні контрактні моделі.
   Перевір також exceptions. Domain, persistence projections, provider
   DTO та cache entries зберігають власне призначення.
5. Перевір, чи головний сервіс координує процес, а підсервіси реалізують
   цілісні операції. Не додавай usecase-пакет без потреби й не створюй
   forwarding wrappers. Зафіксуй транзакції, retry та порядок дій.
6. Зістав фактичну структуру з локальними рішеннями: наявний виняток
   не стає загальним правилом і не означає автоматичної міграції.
7. Після зміни звір дерево, приклади, DTO/error rules та посилання в
   суміжних документах. Зберігай ownership, isolation, configuration,
   integration і cache правила, які не залежать від naming пакетів.

Джерела: [Modular Monolith](../architectures/modular-monolith.md),
[DTO, integrations та cache](../architectures/modular-monolith-integrations-dto-cache.md),
[Hexagonal Pipeline](../architectures/hexagonal-pipeline.md),
[Package Responsibilities](../ai-rules/project-conventions.md#4-package-responsibilities).
