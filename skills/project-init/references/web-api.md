# Web API Contracts

Правила HTTP-відповідей на межі backend і frontend. Застосовуються незалежно
від архітектури проєкту. DTO та enum належать фічі-власнику; контролер
формує HTTP-контракт, а бізнес-правила залишаються в application/domain.
Формат помилок описано окремо в [Error Handling (error-handling.md)](error-handling.md).

## Розташування контрактів

У feature-oriented структурі HTTP boundary — `<feature>/api/web`:
`controllers`, `requests`, `responses` (або `responds` за конвенцією
проєкту), `dto`, `exception` та `mappers` за потреби.
`api/internal` містить Java API фічі, а `api/dto` — погоджені спільні
моделі internal і web. Web-only action enum належить `api/web/dto`;
спільний контрактний status enum може належати `api/dto`.
Не дублюй DTO лише заради двох входів і не експортуй HTTP-specific DTO
як міжфічевий контракт. Правила вибору та повне дерево:
[Структура одного модуля (modular-monolith.md)](../../../architectures/modular-monolith.md#структура-одного-модуля).

## Available Actions

Для сутностей, над якими користувач має реальний вибір дій залежно від
стану та прав доступу, повертай поле `availableActions`.
Можливі дії описуються enum у контракті відповідної фічі.

```java
public enum UserAction {

    EDIT,

    ENABLE,

    DISABLE
}
```

Приклад DTO для однієї сутності або рядка списку:

```java
public record UserListItemRespond(

        String id,

        String status,

        Set<UserAction> availableActions
) {}
```

`Set` імпортується з `java.util.Set`. Назва DTO та типи `id`/`status`
адаптуються до погоджених conventions і моделей конкретного проєкту.

```json
{
  "id": "user-id",
  "status": "ACTIVE",
  "availableActions": ["EDIT", "DISABLE"]
}
```

### Rules

- Backend визначає actions для поточного користувача з урахуванням його
  прав і актуального стану сутності. Порожній набір передається як `[]`.
- Frontend зіставляє enum із кнопками та API-викликами, не дублюючи
  бізнес-правила доступності. Порядок кнопок визначає frontend, а не Set.
- Кожен endpoint дії повторно перевіряє права та актуальний стан.
  `availableActions` — підказка для UI, а не гарантія дозволу:
  між читанням та виконанням операції стан або права можуть змінитися.
- Формування actions і виконання операції використовують узгоджені
  спільні перевірки. Не копіюй умови окремо в controller та service.
- Перевірки прав і бізнес-стану виконуються в application/domain згідно
  з архітектурою. На web-межі їх результат відображається в enum контракту;
  domain не повинен залежати від HTTP DTO чи web enum.
- Не створюй універсальний action enum для всього application.
- У списку actions описують дії над конкретним об'єктом. Дії рівня
  сторінки, якщо потрібні, мають окремий контракт.
- Не додавай поле механічно до кожного controller або DTO. Не створюй
  окремий policy framework, якщо достатньо наявних перевірок фічі.

## Paginated Responses — PagedModel<T>

Для HTTP-endpoints зі списками з пагінацією використовуй Spring Data
`org.springframework.data.web.PagedModel<T>`.
Не плутай його з однойменним класом Spring HATEOAS.

Сервіс повертає `Page<T>`, контролер обгортає сторінку DTO в `PagedModel`.
`PagedModel` залишається на web-межі, persistence entities у JSON не потрапляють.

### Controller Example

Imports для прикладів:

```java
import org.springframework.data.domain.Page;
import org.springframework.data.web.PagedModel;
import org.springframework.http.ResponseEntity;
```

Якщо сервіс уже повертає погоджену read projection для HTTP-відповіді:

```java
Page<UserListItemRespond> users = userService.findUsers(page, size);
return ResponseEntity.ok().body(new PagedModel<>(users));
```

Цей варіант не є вимогою переносити HTTP DTO в business/domain.
Якщо сервіс повертає внутрішню модель результату, мапінг залишається
на web-межі, відповідно до [Domain First (project-conventions.md)](project-conventions.md#2-domain-first):

```java
Page<UserSummary> users = userService.findUsers(page, size);
Page<UserListItemRespond> response = users.map(userMapper::toListItemRespond);
return ResponseEntity.ok().body(new PagedModel<>(response));
```

Обидва фрагменти — тіло controller-методу після перевірки параметрів.
`UserSummary`, mapper і service показують ролі компонентів, а не вимагають
створювати додаткові моделі там, де вже є придатна реалізація.
Дані для `availableActions`, якщо вони потрібні, визначаються спільними
перевірками фічі для поточного користувача перед формуванням DTO.

### Response Shape

```json
{
  "content": [],
  "page": {
    "size": 20,
    "number": 0,
    "totalElements": 45,
    "totalPages": 3
  }
}
```

`content` тут скорочено для демонстрації структури: у фактичній відповіді
це елементи поточної сторінки, а не порожня перша сторінка при 45 результатах.

### Rules

- Пагінація виконується в базі даних. Не завантажуй усі записи, щоб
  потім вирізати сторінку або фільтрувати доступ у пам'яті.
- Фільтри й обмеження доступу застосовуються до вибірки та count query.
  `totalElements` і `totalPages` описують увесь доступний результат
  з урахуванням цих умов, а не лише поточну сторінку.
- Використовуй стабільне сортування з унікальним завершальним критерієм:
  наприклад, `createdAt DESC, id DESC`. Це усуває неоднозначність при
  однакових значеннях, але не фіксує snapshot між різними HTTP-запитами.
- Нумерація сторінок починається з 0. Перевіряй `page >= 0` та
  `1 <= size <= maxPageSize`; погодь default і верхню межу для проєкту.
  Некоректні значення повертають 400 через стандартний error handling.
- У `content` повертай DTO, не persistence entities.
- Не серіалізуй `PageImpl` напряму. Не створюй власну обгортку, яка
  дублює `PagedModel`, і не додавай HATEOAS dependency заради цього класу.
- Для одного об'єкта, результату дії та статистики використовуй відповідний
  DTO без `PagedModel`. Не додавай пагінацію механічно до всіх відповідей.

Spring Data `PagedModel` доступний із версії 3.3. Для старішого проєкту
спочатку перевір dependencies і погодь сумісне рішення; не оновлюй стек
самовільно та не вигадуй дублюючу обгортку як автоматичний fallback.

## Before Implementation

1. Перевір існуючий API-контракт, naming, межі модулів і dependencies.
2. Визнач, чи потрібні actions та пагінація саме цьому endpoint.
3. Повторно використай перевірки фічі; не перенось бізнес-правила в controller.
4. Перевір DTO, metadata, права доступу, сортування та межі page/size.
5. Зміни наявного публічного контракту погоджуй із користувачем до реалізації;
   застосовуй чинні локальні інструкції та вже надані дозволи.
   Тести автоматично не додавай: діє [Testing Policy (testing-policy.md)](../../../ai-rules/testing-policy.md).

## Reference

[Spring Data PagedModel API](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/web/PagedModel.html)
— стабільне JSON-представлення `Page`, створене на web-межі.
