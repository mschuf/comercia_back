@echo off
title Traer BD de PRODUCCION a LOCAL
echo ============================================================
echo  Esto REEMPLAZA tu base de datos LOCAL con una copia fresca
echo  de PRODUCCION (estructura + datos).
echo  La base de PRODUCCION no se toca: solo se LEE.
echo ============================================================
set /p CONF="Continuar? (S/N): "
if /i not "%CONF%"=="S" goto :fin

cd /d "%~dp0.."

echo.
echo [1/3] Levantando la base local si no esta corriendo...
docker compose up -d postgres
if errorlevel 1 goto :error

set INTENTOS=0
:waitdb
set /a INTENTOS+=1
if %INTENTOS% GTR 15 goto :error
docker exec comercia-postgres pg_isready -U postgres >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto :waitdb
)

echo [2/3] Limpiando la base local...
docker exec comercia-postgres psql -U postgres -d comercia -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
if errorlevel 1 goto :error

echo [3/3] Copiando estructura y datos de produccion (segun tamano puede tardar)...
ssh comercia "cd /opt/comercia && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump --no-owner --no-privileges -U comercia comercia" | docker exec -i comercia-postgres psql -q -v ON_ERROR_STOP=1 -U postgres -d comercia
if errorlevel 1 goto :error

echo.
echo ============================================================
echo  LISTO: tu base LOCAL es ahora una copia de PRODUCCION.
echo  (Acordate: el .env debe apuntar a la URL LOCAL :5433)
echo ============================================================
goto :fin

:error
echo.
echo ERROR: revisa que Docker Desktop este corriendo y que haya
echo conexion al servidor (ssh comercia).

:fin
pause
