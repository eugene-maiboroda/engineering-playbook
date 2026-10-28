# Maven: структура POM і базові dependencies

## Сформуй metadata

Використовуй Maven, Java 25, packaging jar і configuration у .properties.
Отримай baseName з JSON за [input-contract.md](input-contract.md).
GroupId і кореневий Java package мають бути однакові. Не додавай до
package суфікс artifactId або додаткові рівні без запиту користувача.
ArtifactId записуй у lowercase kebab-case. Для прикладу familymenu:
`groupId = packageName = com.familymenu`, `artifactId = familymenu-backend`.
Початкова project version — `0.0.1-SNAPSHOT`, name — artifactId.
Не вигадуй description, URL, license або developer metadata; не копіюй
порожні секції з прикладу POM, якщо вони не потрібні.

## Організуй версії

Розмісти parent і metadata, потім properties, dependencies, потрібний
 dependencyManagement і build. Дотримуйся відступу чотири пробіли.
У properties зверху запиши java.version і лише версії реально використаних
бібліотек, processors або plugins. У залежностях і processors посилайся
на `${...}`; не розкидай явні версії по POM. Версію Spring Boot parent
запиши конкретно в parent/version: не посилайся звідти на властивість
дочірнього POM. Версії, керовані Spring Boot parent/BOM, не дублюй без
потреби в явному override. Це відповідає прикладу користувача, де starters
і PostgreSQL driver не мають власного version.

Початкова база з наданих матеріалів (MapStruct і binding — лише для опції):

| Компонент | Значення | Дія |
| --- | --- | --- |
| Java | 25 | java.version |
| Spring Boot parent | 4.1.2 | Вибір на знімку користувача; перевір перед генерацією |
| MapStruct | 1.6.3 | mapstruct.version, library і processor однієї версії |
| Lombok | 1.18.46 | lombok.version із прикладу; перевір доступність і Java 25 |
| Springdoc | 3.1.0 | springdoc.version із прикладу; перевір сумісність з Boot |
| Lombok/MapStruct binding | 0.2.0 | lombok-mapstruct-binding.version, не literal у processor path |
| PostgreSQL JDBC | Керована parent/BOM | Не плутай із версією PostgreSQL server/image |

Не називай ці значення перевіреною повною матрицею або «latest».
Перед генерацією перевір їх за офіційними джерелами й Maven resolution;
якщо задана версія недоступна/несумісна — повідом конкретну проблему,
погодь заміну, не підмінюй мовчки й не використовуй SNAPSHOT/RC автоматично.

## Додай базові залежності

Для цього стандартного backend використовуй:

| groupId | artifactId | Налаштування |
| --- | --- | --- |
| org.springframework.boot | spring-boot-starter-webmvc | Spring Web |
| org.springframework.boot | spring-boot-starter-data-jpa | Spring Data JPA |
| org.springframework.boot | spring-boot-starter-validation | Validation |
| org.springframework.boot | spring-boot-starter-actuator | Actuator |
| org.projectlombok | lombok | optional=true |
| org.springdoc | springdoc-openapi-starter-webmvc-ui | version=${springdoc.version} |
| org.postgresql | postgresql | scope=runtime |
| org.springframework.boot | spring-boot-starter-actuator-test | scope=test, прямо запитано користувачем |

Тестова dependency не дозволяє створювати нові тестові сценарії без запиту.
Не додавай решту test starters із прикладу автоматично.
Для @Slf4j використовуй Lombok `lombok.extern.slf4j.Slf4j`; не додавай
окрему бібліотеку лише заради цієї анотації. Перевір транзитивне стандартне
логування Spring Boot перед додаванням іншого logging backend.

Додавай spring-boot-starter-security лише за features.security=true,
тоді застосуй [security.md](security.md). Не додавай OAuth2/resource-server, токени, Spring AI,
Stripe, Gson, Jsoup, CSV/IO або їхні version properties лише тому, що вони
присутні в наданому POM. Додавай їх лише за конкретною потребою й запитом.
BOM імпортуй лише для реально використаної групи dependencies.

## Налаштуй build

Додай spring-boot-maven-plugin. Для maven-compiler-plugin явно налаштуй
Lombok annotationProcessorPaths. За замовчуванням використовуй ручний
mapping: MapStruct library, processor і binding та їхні properties не додавай.
Лише за features.mapstruct=true додай org.mapstruct:mapstruct,
mapstruct-processor і lombok-mapstruct-binding із properties для версій.
Узгодь версії library/processor. Якщо в тестах потрібні processors,
налаштуй їх явно й послідовно.

Не копіюй із прикладу виключення RepeatBookingTest або інші workaround-и
конкретного проєкту. Surefire javaagent для Mockito додавай лише коли
Mockito реально використовується й така конфігурація потрібна; не
створюй непотрібні налаштування тестів у skeleton.

## Перевір результат

Перевір metadata, Java toolchain і effective POM: відсутність невикористаних
properties/dependencies, керовані версії та processor paths. Виконай збірку
на Java 25 й зафіксуй результат. Maven/JDK version і команди бери з
фактичного середовища; не вигадуй перевірки. Не генеруй тестів для перевірки
цього стандарту. Поверни результат до поточного кроку Project Init.
