# Configuration Organization

## Rule
Infrastructure містить лише конфігурацію застосунку.
Конфігурація розділяється за відповідальністю.
Кожен великий компонент має власний Configuration клас.

## Examples

Добре:
PlaywrightConfig
StorageConfig
SecurityConfig
DatabaseConfig
RetryConfig
MessagingConfig

Кожен із них містить лише конфігурацію відповідного компонента.

---

Для невеликих локальних Bean, які використовуються лише в одному проєкті та не потребують окремих налаштувань, використовується AppConfig.

Наприклад:

- ObjectMapper
- RestClient
- ExecutorService
- Clock
- Validator

AppConfig не повинен перетворюватися на "God Configuration". Якщо кількість Bean починає суттєво зростати або вони відносяться до окремої підсистеми — вони виносяться у власний Configuration клас.