# CORS за Family Menu

Створи CorsConfig implements WebMvcConfigurer. Збережи policy Family Menu:
один явно заданий FRONTEND_URL; mapping /**; methods GET, POST, PUT, PATCH,
DELETE, OPTIONS; headers Content-Type і X-CSRF-TOKEN; allowCredentials=true;
maxAge=3600. Не замінюй origin на wildcard і не додавай інші headers/methods
без вимоги. Передай FRONTEND_URL у backend environment обох обраних
середовищ, додай безпечний placeholder у .env.example.

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String frontendUrl;

    public CorsConfig(@Value("${FRONTEND_URL}") String frontendUrl) {
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(frontendUrl)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type", "X-CSRF-TOKEN")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
```

Імпортуй Configuration, Value, CorsRegistry, WebMvcConfigurer. Цей конкретний
infrastructure constructor із @Value відтворює прямо обрану користувачем
конфігурацію Family Menu; не розповсюджуй @Value на application code.
Не замінюй його Lombok constructor без збереження injection-анотації.
Якщо security увімкнено, застосуй cors(Customizer.withDefaults()) у
SecurityFilterChain; якщо вимкнено — залиш MVC CORS без Security starter.
Не змінюй session/authentication policy налаштуванням CORS.
