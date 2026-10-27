# Вхід Project Init

## Прочитай параметри

Прийми JSON із запуску або явно задані користувачем еквівалентні значення.
Для стандартного backend користувач задає baseName; parentDirectory
надходить із вибору папки в застосунку або прямого запиту. Не вгадуй
батьківську папку за назвою GitHub repository.

```json
{
  "mode": "create",
  "parentDirectory": "/Users/eugene/workspace/projects/pet",
  "baseName": "familymenu",
  "javaVersion": 25,
  "buildTool": "maven",
  "packaging": "jar",
  "configurationFormat": "properties"
}
```

Це приклад входу, не дозвіл створювати familymenu за наведеним шляхом.
При відсутності параметрів формату використовуй явно погоджені defaults:
Java 25, Maven, jar, properties. Базові dependencies і правила версій бери
з [maven-standard.md](maven-standard.md), не вимагай повторного вибору.

Для перевірки вже створеного проєкту прийми:

```json
{
  "mode": "inspect",
  "projectDirectory": "/Users/eugene/workspace/projects/pet/familymenu-backend"
}
```

У inspect не застосовуй defaults Java, dependencies або naming як зміни.
Визнач фактичні значення з проєкту. Зістав їх зі стандартами для
рекомендацій; не вважай відмінність автоматичним дозволом виправити.
У create потрібні parentDirectory і baseName; в inspect — projectDirectory.
Невідомий mode відхили й уточни. Явний запит користувача може задавати
режим без JSON; відсутній mode не перетворюй на create автоматично.

## Визнач ідентичність

Для поточного простого правила baseName має бути lowercase Java identifier
із латинських літер і цифр, починаючись із літери, без Java keywords.
Якщо користувач передав пробіли, дефіси чи інші символи, не видаляй їх
мовчки: погодь Java-сумісну базову назву або явні metadata overrides.

Для baseName familymenu обчисли:

```json
{
  "directoryName": "familymenu-backend",
  "artifactId": "familymenu-backend",
  "name": "familymenu-backend",
  "groupId": "com.familymenu",
  "packageName": "com.familymenu",
  "targetDirectory": "/Users/eugene/workspace/projects/pet/familymenu-backend"
}
```

Використовуй суфікс -backend за цим прикладом. Якщо користувач явно задав
іншу artifact/directory назву, використовуй її після перевірки; groupId
і packageName залишаються однаковими. Не додавай artifactId до package.

## Перевір перед створенням

Перевір, що targetDirectory — нова дочірня папка вибраної parentDirectory,
без виходу через path traversal. Покажи обчислені metadata, конкретні
версії та кінцевий шлях перед записом. Працюй лише в дозволеному scope;
не перезаписуй непорожню папку. У JSON не приймай секрети або довільні
shell-команди. Після перевірки поверни обчислені параметри в Project Init.
