# BeautyGO Mobile

Монорепо: `apps/client` (клиентское приложение) + `apps/pro` (приложение для мастеров) + `packages/shared` (общий код).

## Запуск

```bash
# Клиентское приложение
yarn --cwd apps/client expo start --clear

# Приложение для мастеров
yarn --cwd apps/pro expo start --clear
```

## Тестирование

### Smoke (при каждом PR) — ~2-3 мин
```bash
./apps/client/tests/ayla_test_suite.sh smoke
```

### Полный прогон Client App — ~15 мин
```bash
./apps/client/tests/ayla_test_suite.sh client
```

### Только Jest
```bash
yarn workspace @beautygo/client jest
```

### Только Maestro
```bash
maestro test apps/client/tests/maestro/
```

### Покрытие

| Экран              | Jest | Maestro  | Задача  |
|--------------------|------|----------|---------|
| Entry              | ✅   | ✅ smoke | DRF-24  |
| Phone + OTP        | ✅   | ✅ smoke | DRF-25  |
| Onboarding         | ✅   | —        | DRF-26  |
| Профиль клиента    | ✅   | —        | DRF-27  |
| Home Feed          | ✅   | —        | DRF-128 |
| Карточка мастера   | ✅   | ✅       | DRF-65  |
| Избранные          | ✅   | ✅       | DRF-72  |
| Booking Flow       | ✅   | ✅       | DRF-137 |
| Форма отзыва       | ✅   | —        | DRF-129 |
