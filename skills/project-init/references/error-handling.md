# Error Handling

Цей документ визначає спільний стандарт обробки HTTP-помилок для Spring MVC
проєктів. Приклади універсальні: package `com.example` замінюється
на package конкретного проєкту, а бізнес-помилки належать відповідним модулям.

## Rule

- Використовуй один JSON-контракт помилки для REST API та Spring Security.
- HTTP status та формат відповіді визначаються на web-межі. Business/application
  exceptions не повинні залежати від HTTP або Spring Web.
- Повертай стабільний `code`, безпечний `message` і, за потреби, помилки полів.
  Назви exception-класів, stack trace, SQL та внутрішні повідомлення не повертай.
- Очікувані бізнес-помилки мапляться явно. Не перетворюй кожен
  `IllegalArgumentException` на 400: він може означати помилку програмування.
- Неочікувані помилки логуються зі stack trace, клієнт отримує нейтральне
  повідомлення. Не додавай секрети або request body до логів.
- Зберігай status та HTTP-заголовки стандартних Spring MVC exceptions.
- Не створюй універсальну ієрархію exceptions, registry чи factory service
  без реальної потреби. Невеликих класів і явних handler-методів достатньо.

## Reference Structure

```text
shared/
└── api/
    └── web/
        ├── responses/
        │   ├── ErrorResponse.java
        │   └── ErrorDetailsResponse.java
        ├── controllers/
        │   └── ApiExceptionHandler.java
        └── mappers/
            └── ErrorResponseWriter.java
```

Два records описують контракт, advice обробляє MVC exceptions, writer
серіалізує відповідь у servlet filters/Security handlers.
Якщо немає такого використання поза MVC, writer не потрібно створювати.
Це reference structure, а не вимога завжди мати рівно чотири класи.

Бізнес-винятки залишаються в модулі, який володіє бізнес-правилом.
Якщо вони є частиною public Java API, розміщуй їх у
`<feature>/api/internal/exception`, а спільні internal + web контрактні
помилки — у `<feature>/api/exception`. Вони не містять HTTP status чи
`@ResponseStatus`. `api/web/exception` містить лише web-specific помилки
або локальний HTTP-мапінг; загальний advice може залишатися в
`shared/api/web`. Приватні exceptions не потрібно експортувати.
Naming `exception`/`exceptions` та responses/responds адаптується до проєкту.
Їх HTTP-мапінг додається до advice на web-межі з дотриманням public API
та меж модулів; не імпортуй internal service classes іншого модуля.

## Error Contract

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Request validation failed",
    "errors": {
      "name": "Name is required"
    }
  }
}
```

`code` — стабільний машинний ідентифікатор. Клієнт не повинен аналізувати
`message` для визначення типу помилки. `errors` відсутній, якщо немає
помилок полів. У reference implementation зберігається перше повідомлення
на поле; object-level validation errors мають ключ `request`.

Зміна наявного `exceptionName` на `code` є зміною API-контракту:
для існуючого проєкту погодь міграцію з користувачем та клієнтами API.
Не перейменовуй поля мовчки під час іншої задачі.

## ErrorResponse.java

```java
package com.example.shared.api.web.responses;

public record ErrorResponse(

        ErrorDetailsResponse error
) {

    public static ErrorResponse of(String code, String message) {
        ErrorDetailsResponse details = ErrorDetailsResponse.of(code, message);
        return new ErrorResponse(
                details
        );
    }
}
```

## ErrorDetailsResponse.java

```java
package com.example.shared.api.web.responses;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

public record ErrorDetailsResponse(

        String code,

        String message,

        @JsonInclude(JsonInclude.Include.NON_EMPTY) Map<String, String> errors
) {

    public static ErrorDetailsResponse of(String code, String message) {
        return new ErrorDetailsResponse(
                code,
                message,
                Map.of()
        );
    }

    public static ErrorDetailsResponse validation(Map<String, String> errors) {
        return new ErrorDetailsResponse(
                "INVALID_REQUEST",
                "Request validation failed",
                Map.copyOf(errors)
        );
    }
}
```

Фабрики називають намір створення record і задають узгоджений стан.
Не додавай enum або окремий клас constants лише заради кількох codes.
Якщо каталог помилок реально зростає, обери єдине місце для codes за
потребою проєкту; не дублюй їх значення з різною семантикою.

## ApiExceptionHandler.java

Reference implementation використовує Spring Framework 6+ API.
У прикладі немає бізнес-помилок конкретного продукту: їхні явні handlers
додаються за реальною потребою, як показано нижче.

```java
package com.example.shared.api.web.controllers;

import com.example.shared.api.web.responses.ErrorResponse;
import com.example.shared.api.web.responses.ErrorDetailsResponse;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationFailure(
            MethodArgumentNotValidException exception
    ) {
        Map<String, String> validationErrors = collectValidationErrors(exception);
        ErrorDetailsResponse details = ErrorDetailsResponse.validation(validationErrors);
        ErrorResponse response = new ErrorResponse(
                details
        );

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableRequest(
            HttpMessageNotReadableException exception
    ) {
        return respond(HttpStatus.BAD_REQUEST, "INVALID_REQUEST",
                "Request body is missing or invalid");
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleConcurrentUpdate(
            OptimisticLockingFailureException exception
    ) {
        return respond(HttpStatus.CONFLICT, "CONCURRENT_UPDATE",
                "The record was changed by another request; reload it and try again");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataConflict(
            DataIntegrityViolationException exception
    ) {
        log.warn("Data integrity violation while processing a request", exception);
        return respond(HttpStatus.CONFLICT, "DATA_CONFLICT",
                "The operation conflicts with existing data");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpectedFailure(Exception exception) {
        if (exception instanceof org.springframework.web.ErrorResponse webError) {
            return handleFrameworkFailure(exception, webError);
        }

        log.error("Unexpected request failure", exception);
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "An unexpected server error occurred");
    }

    private Map<String, String> collectValidationErrors(
            MethodArgumentNotValidException exception
    ) {
        Map<String, String> validationErrors = new LinkedHashMap<>();

        for (ObjectError error : exception.getBindingResult().getAllErrors()) {
            String fieldName = error instanceof FieldError fieldError
                    ? fieldError.getField() : "request";
            String message = error.getDefaultMessage();
            String safeMessage = message == null ? "Invalid value" : message;
            validationErrors.putIfAbsent(fieldName, safeMessage);
        }

        return validationErrors;
    }

    private ResponseEntity<ErrorResponse> handleFrameworkFailure(
            Exception exception,
            org.springframework.web.ErrorResponse webError
    ) {
        HttpStatusCode status = webError.getStatusCode();
        String code = "HTTP_" + status.value();
        String message = "The request could not be processed";

        if (status.is5xxServerError()) {
            log.error("Framework request failure", exception);
            code = "INTERNAL_ERROR";
            message = "An unexpected server error occurred";
        }

        HttpHeaders headers = new HttpHeaders();
        headers.putAll(webError.getHeaders());
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.remove(HttpHeaders.CONTENT_LENGTH);
        ErrorResponse response = ErrorResponse.of(code, message);

        return ResponseEntity.status(status).headers(headers).body(response);
    }

    private ResponseEntity<ErrorResponse> respond(
            HttpStatus status,
            String code,
            String message
    ) {
        ErrorResponse response = ErrorResponse.of(code, message);
        return ResponseEntity.status(status).body(response);
    }
}
```

Власний `ErrorResponse` та Spring interface мають однакову коротку назву.
Тому саме Spring interface тут вказано з повним package: Java не підтримує
aliases для imports. Решта типів імпортуються звичайним способом.

Framework fallback зберігає, наприклад, `Allow` для 405 та інші response
headers. Content-Type задається для власного JSON-контракту, а старий
Content-Length прибирається, бо body замінено. Сирий `getDetail()` не
публікується. Для потрібних клієнту точніших повідомлень додавай явний
handler із погодженими безпечними `code` та `message`.

Тексти validation annotations також є публічними: не вставляй у них
секрети, SQL або rejected values. Інші механізми validation, наприклад
method validation, адаптуються окремо за потребою фактичного API.

`DataIntegrityViolationException` не визначає точну бізнес-причину.
409 із нейтральним повідомленням — reference fallback для конфліктів
даних. Якщо причина — дефект persistence або некоректний стан сервера,
її потрібно обробити як 500. Не визначай бізнес-помилку парсингом тексту SQL.
DAO handlers потрібні лише в проєктах, де такі exceptions реально виникають.

## Explicit Business Error Mapping

Наприклад, модуль може публікувати такий application exception:

```java
package com.example.document.api.internal.exception;

public class DocumentNotFoundException extends RuntimeException {

    public DocumentNotFoundException(String documentId) {
        super("Document not found: " + documentId);
    }
}
```

У `ApiExceptionHandler` імпортуй цей exception і додай явний метод:

```java
@ExceptionHandler(DocumentNotFoundException.class)
public ResponseEntity<ErrorResponse> handleDocumentNotFound(
        DocumentNotFoundException exception
) {
    return respond(HttpStatus.NOT_FOUND, "DOCUMENT_NOT_FOUND",
            "The requested document was not found");
}
```

Аналогічно мапляться погоджені бізнес-помилки некоректного запиту на 400,
конфлікту на 409. Не створюй такі exceptions для кожного методу механічно.
Не використовуй `exception.getMessage()` у відповіді без перевірки, що
повідомлення призначене для клієнта і не містить внутрішніх деталей.

## ErrorResponseWriter.java

Приклад для Spring Boot 4 / Jackson 3. У Spring Boot 3 / Jackson 2
використовуй `com.fasterxml.jackson.databind.ObjectMapper` відповідно
до фактичних dependencies. Версії не змінюються заради цього прикладу.

```java
package com.example.shared.api.web.mappers;

import com.example.shared.api.web.responses.ErrorResponse;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class ErrorResponseWriter {

    private final ObjectMapper objectMapper;

    public void writeError(
            HttpServletResponse response,
            HttpStatus status,
            String code,
            String message
    ) throws IOException {
        if (response.isCommitted()) {
            return;
        }

        ErrorResponse errorResponse = ErrorResponse.of(code, message);
        response.resetBuffer();
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getWriter(), errorResponse);
    }
}
```

Writer використовує налаштований Spring `ObjectMapper`, а не створює
власний. Він не приймає exception: контракту відповіді потрібні тільки
status, code та безпечний message. Логування, якщо воно потрібне,
залишається на рівні caller, який знає контекст помилки.
Committed response вже не можна замінити; ця перевірка не гарантує
JSON для помилок після початку streaming response.

## Spring Security Integration

Цей фрагмент застосовуй лише за features.security=true. Без цієї опції
не додавай Security imports або класи до базового error handling.

Фрагмент налаштування наявного `SecurityFilterChain`:

```java
http.exceptionHandling(exceptions -> exceptions
        .authenticationEntryPoint((request, response, exception) ->
                errorResponseWriter.writeError(
                        response,
                        HttpStatus.UNAUTHORIZED,
                        "AUTHENTICATION_REQUIRED",
                        "Authentication is required"))
        .accessDeniedHandler((request, response, exception) ->
                errorResponseWriter.writeError(
                        response,
                        HttpStatus.FORBIDDEN,
                        "ACCESS_DENIED",
                        "Access is denied")));
```

Для form login failure handler використовуй той самий writer із
`INVALID_CREDENTIALS` і нейтральним повідомленням, без уточнення, чи існує
користувач. Цей фрагмент не задає повну authentication/CORS/CSRF policy.
Якщо протокол вимагає додаткових headers, наприклад `WWW-Authenticate`
для Basic/Bearer, збережи або встанови їх у відповідному Security handler.
Не замінюй протокольну поведінку лише заради JSON body.

## Before Implementation

1. Перевір наявний контракт помилок та очікування клієнтів API.
2. Перевір версії Spring/Jackson та вже налаштовані MVC/Security handlers.
3. Визнач реальні бізнес-помилки й погоджений HTTP-мапінг.
4. Використовуй існуючу структуру та явні типи, без `var` і зайвих абстракцій.
5. Перевір безпечність повідомлень, HTTP statuses, headers та єдність JSON.
6. Не додавай тести автоматично: діє [Testing Policy (testing-policy.md)](../../../ai-rules/testing-policy.md).

## References

- [Spring ErrorResponse API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/ErrorResponse.html) — status, headers та body framework errors.
- [Spring Boot JSON support](https://docs.spring.io/spring-boot/reference/features/json.html) — налаштований mapper та підтримка Jackson.
