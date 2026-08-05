@echo off
setlocal

rem Tunel SSH hacia PostgreSQL de produccion de Comercia.
rem No guarda contrasenas: usa el alias SSH "comercia" configurado en esta PC.
set "LOCAL_PORT=15432"
set "REMOTE_DB_HOST=localhost"
set "REMOTE_DB_PORT=5432"
set "SSH_TARGET=comercia"

title Comercia - Tunel PostgreSQL

where ssh.exe >nul 2>&1
if errorlevel 1 (
  echo ERROR: No se encontro ssh.exe. Instala o habilita OpenSSH Client de Windows.
  pause
  exit /b 1
)

rem Evita abrir el tunel sobre un servicio o tunel que ya use el puerto local.
netstat -ano | findstr /R /C:":%LOCAL_PORT% .*LISTENING" >nul
if not errorlevel 1 (
  echo ERROR: El puerto localhost:%LOCAL_PORT% ya esta en uso.
  echo Si es el tunel de Comercia que ya estaba abierto, en pgAdmin usa:
  echo   Host: localhost
  echo   Puerto: %LOCAL_PORT%
  pause
  exit /b 1
)

echo Abriendo tunel SSH a PostgreSQL...
echo Deja esta ventana abierta mientras uses pgAdmin.
echo.
echo pgAdmin:
echo   Host: localhost
echo   Puerto: %LOCAL_PORT%
echo   Base de datos: comercia
echo   Usuario: comercia
echo.

ssh -N ^
  -o ExitOnForwardFailure=yes ^
  -o ServerAliveInterval=30 ^
  -o ServerAliveCountMax=3 ^
  -L %LOCAL_PORT%:%REMOTE_DB_HOST%:%REMOTE_DB_PORT% ^
  %SSH_TARGET%

set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo El tunel se cerro. Codigo de salida: %EXIT_CODE%
pause
exit /b %EXIT_CODE%
