# Production и автодеплой

Сайт: https://orenbio.ru. Сервер доступен администратору по SSH как `vps-msk`.

Compose-проект `biotest-prod` находится в `/root`: `compose.yml`, `.env`, `Caddyfile`. Фактический серверный Compose дополнительно содержит MongoDB; репозиторный `compose.yml` рассчитан на внешнюю базу и при обновлении приложения на сервер не копируется.

- `app`: Next.js, образ `primtive/biotest` с Docker Hub, `APP_IMAGE` закреплён по digest в `/root/.env`
- `mongo`: MongoDB 8.0.34, replica set `rs0`, база `biotest_tasks_reviewed_20261020`, постоянный том `biotest-prod_mongo_data`
- `caddy`: HTTPS для orenbio.ru; порты приложения и MongoDB наружу не опубликованы

Пароли MongoDB и `NEXTAUTH_SECRET` хранятся только на сервере. Приложение входит в MongoDB отдельным пользователем с `readWrite` для рабочей базы. Вход в BioTest — по логину; существующие аккаунты без полей учителя остаются учениками или администраторами.

## GitHub Actions

Workflow `.github/workflows/docker-image.yml` выполняет:

1. Для pull request и `master`: установку зависимостей, генерацию Prisma Client, TypeScript, ESLint, модульные тесты, проверки сценариев деплоя/отката и сборку.
2. После успешных проверок `master`: публикацию `primtive/biotest:latest` и `primtive/biotest:sha-<полный commit SHA>`. Метки образа содержат репозиторий и commit SHA.
3. В environment `production`: проверку актуальности коммита и вызов ограниченной SSH-команды `deploy <commit SHA> <sha256:digest>`.
4. На сервере: сохранение конфигурации и предыдущего образа, полный бэкап БД с проверкой, загрузку опубликованного образа по digest и сверку меток.
5. Пересоздание только `app`, ожидание `healthy`, проверки входа, страниц, отчётов, ограничений доступа и публичного HTTPS. При ошибке после переключения возвращается предыдущий образ.

Push-запуски не отменяют выполняющийся деплой. На сервере дополнительно действует файловая блокировка `/run/lock/biotest-deploy.lock`. Pull request не получает доступ к деплою. Environment `production` разрешает только ветку `master`; ручное подтверждение для обычного автодеплоя не требуется. Повторный запуск доступен через `workflow_dispatch` на `master`.

Все используемые Actions закреплены полным commit SHA. Разрешения `GITHUB_TOKEN` — `contents: read`.

### Настройки GitHub

Секреты репозитория, уже используемые для публикации:

| Имя | Назначение |
| --- | --- |
| `DOCKERHUB_USERNAME` | Пользователь Docker Hub |
| `DOCKERHUB_TOKEN` | Токен публикации образа |

Environment `production`:

| Тип | Имя | Назначение |
| --- | --- | --- |
| Secret | `DEPLOY_SSH_KEY` | Отдельный приватный Ed25519-ключ только для деплоя |
| Secret | `DEPLOY_KNOWN_HOSTS` | Проверенный ключ SSH-хоста, полученный через административный SSH-доступ |
| Variable | `DEPLOY_HOST` | Адрес сервера |
| Variable | `DEPLOY_PORT` | SSH-порт |
| Variable | `DEPLOY_USER` | Пользователь серверной команды |

Приватный ключ не попадает в Git, Docker-образ или логи. Во время job он записывается во временный файл с правами 0600 и удаляется при завершении. SSH проверяет ключ хоста; автоматическое принятие неизвестного хоста отключено.

## Серверная команда

`ops/deploy.py` устанавливается администратором как `/usr/local/sbin/biotest-actions-deploy`, а `ops/production-smoke.cjs` — как `/usr/local/lib/biotest/production-smoke.cjs`. Файлы принадлежат root и недоступны для изменения контейнером приложения.

Публичный ключ Actions в `/root/.ssh/authorized_keys` имеет опции:

```text
restrict,command="/usr/local/sbin/biotest-actions-deploy"
```

Ключ принимает только `status` и `deploy` с полным SHA коммита и SHA-256 образа. Произвольные команды, shell, PTY, forwarding и передача файлов этим ключом недоступны. Образы загружаются только из `primtive/biotest`, а их метки должны совпадать с коммитом и репозиторием.

Первичная установка или обновление доверенных серверных скриптов выполняется через обычный административный SSH-доступ. Из корня локального репозитория:

```sh
scp -r ops vps-msk:/root/biotest-ops
scp /path/to/actions-deploy-key.pub vps-msk:/root/biotest-actions-key.pub
ssh vps-msk 'bash /root/biotest-ops/install.sh /root/biotest-actions-key.pub'
```

Установщик сохраняет действующие SSH-ключи, добавляет только отдельный ограниченный ключ и проверяет prerequisites. Для будущего изменения логики серверного деплоя нужно повторить установку через административный SSH. Загрузка произвольного нового deploy-скрипта через ключ Actions не предусмотрена.

## Бэкапы, миграции и откат

Каждый автодеплой запускает `/root/biotest-backup.sh`: полный `mongodump --archive --gzip --oplog`, проверка `mongorestore --dryRun` и SHA-256. Архивы находятся в `/root/biotest-backups/database/`. Операционные журналы, `.env`, Compose, результат smoke-проверок и `state.json` сохраняются в `/root/biotest-backups/deploy-<UTC timestamp>-<commit>/`; каталог имеет права 0700, файлы — 0600. Бэкапы и образы для отката автоматически не удаляются.

Бэкап перед ручным обновлением 30 октября 2026 также скопирован в `~/other/dumps/biotest-demp-2026-10-30/`; SHA-256 локальной копии проверен. Автодеплой создаёт новые архивы на VPS. Для отдельного резервирования:

```sh
ssh vps-msk '/root/biotest-backup.sh'
```

Миграции снимков тестов, счётчиков и отправителей жалоб уже применены. Для роли учителя backfill не нужен: новые поля совместимы с существующими аккаунтами. Массовый `db:repair` при автодеплое не запускается. Миграции, изменяющие данные, следует проверять и применять отдельно с бэкапом; откат приложения сам по себе не откатывает БД.

Для ручного возврата образа возьмите `rollbackImage` из нужного `state.json`, установите его в `APP_IMAGE` в `/root/.env` и запустите:

```sh
ssh vps-msk 'cd /root && docker compose up -d --no-deps --pull never --wait app'
```

## Проверка состояния

```sh
gh run list -R primtive/biotest --workflow docker-image.yml
gh run view RUN_ID -R primtive/biotest --log-failed
ssh vps-msk 'cd /root && docker compose ps'
ssh vps-msk 'cd /root && docker compose logs --tail 100 app caddy'
```

Локальные проверки серверного сценария используют временные файлы и подменённую границу Docker, без подключения к production:

```sh
python3 -m unittest discover -s tests -p 'test_deploy.py'
```
