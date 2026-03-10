# Roadmap: как разобраться в backend этого проекта

## 1. Понять «жизненный цикл» запроса

Начни с точки входа приложения — **`src/main.ts`**:

- `NestFactory.create(AppModule)` — создание приложения из корневого модуля.
- Глобальные пайпы (`ValidationPipe`) — автоматическая валидация входящих данных по DTO.
- Глобальные фильтры (`HttpExceptionFilter`) — единый формат ответов при ошибках.
- Swagger — документация API доступна по адресу `/docs`.
- `app.listen(process.env.PORT ?? 3000)` — сервер слушает порт из переменных окружения или 3000.

## 2. Понять общую структуру модулей

Открой **`src/app.module.ts`**:

- **ConfigModule** — загрузка переменных окружения из `.env` (глобально).
- **TypeOrmModule.forRoot** — подключение к PostgreSQL, параметры из env.
- Доменные модули: **AuthModule**, **DoctorsModule**, **ScheduleModule**, **AppointmentsModule** — это основные «разделы» приложения.
- **controllers** и **providers** корневого модуля — базовый контроллер и сервис приложения.

## 3. Разобраться на конкретном примере — модуль Auth

Изучи модуль авторизации по порядку:

1. **`auth/auth.module.ts`** — какие контроллеры, сервисы и зависимости (JwtModule, TypeOrmModule.forFeature([User]) и т.д.).
2. **`auth/auth.controller.ts`** — эндпоинты (`/auth/register`, `/auth/login`), какие DTO принимаются, какие guards используются.
3. **`auth/auth.service.ts`** — бизнес-логика: проверка email, хеширование пароля (bcrypt), сохранение пользователя, выдача JWT.
4. **`auth/dto/register.dto.ts`** и **`login.dto.ts`** — структура входящих данных и валидация.
5. **`shared/roles.decorator.ts`** и **`shared/roles.guard.ts`** — как ограничивается доступ по ролям.
6. **`auth/jwt.strategy.ts`** — как из JWT получается `request.user` для защищённых эндпоинтов.

Цепочка запроса: **HTTP → Controller → Guard (если есть) → Service → Repository (БД) → ответ**.

## 4. Потрогать API вживую

- Запусти `npm run start:dev`.
- Открой в браузере `http://localhost:3000/docs` (Swagger).
- Вызови `POST /auth/register`, затем `POST /auth/login`.
- Для защищённых эндпоинтов используй кнопку «Authorize» и вставь полученный `accessToken`.

Так ты увидишь, какой контроллер и сервис обрабатывают каждый запрос.

## 5. Дальше по модулям

После Auth разбирай по той же схеме (module → controller → service → entity):

- **doctors** — сущность врача, CRUD, фильтры.
- **schedule** — расписание и слоты.
- **appointments** — создание и отмена записей.
