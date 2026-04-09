#!/bin/bash
set -e
MODE=${1:-smoke}

echo "=============================="
echo " Ayla Test Suite: $MODE"
echo "=============================="

run_jest() {
  echo ">> Jest тесты..."
  yarn workspace @beautygo/client jest --passWithNoTests
}

run_maestro_smoke() {
  echo ">> Maestro smoke..."
  maestro test apps/client/tests/maestro/smoke.yaml
}

run_maestro_client() {
  echo ">> Maestro client suite..."
  maestro test apps/client/tests/maestro/
}

case "$MODE" in
  smoke)
    run_jest
    run_maestro_smoke
    ;;
  client)
    run_jest
    run_maestro_client
    ;;
  both)
    run_jest
    run_maestro_client
    ;;
  *)
    echo "Использование: $0 [smoke|client|both]"
    exit 1
    ;;
esac

echo "=============================="
echo " Готово!"
echo "=============================="
