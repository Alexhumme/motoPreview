@echo off
setlocal
title MotoPreview - Launcher

rem Ruta relativa: funciona en cualquier carpeta donde este el proyecto
set "ROOT=%~dp0"
set "BACK=%ROOT%backend"
set "FRONT=%ROOT%frontend"
set "PY=%BACK%\venv\Scripts\python.exe"

echo ==============================================
echo   MotoPreview - Django (8000) + Vite (5173)
echo ==============================================

rem --- Requisitos ---
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python no esta instalado o no esta en el PATH.
    pause
    exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js/npm no esta instalado o no esta en el PATH.
    pause
    exit /b 1
)
if not exist "%BACK%\.env" (
    echo [ERROR] Falta backend\.env. Copia backend\.env.example a backend\.env y completalo.
    pause
    exit /b 1
)

rem --- Backend: entorno virtual y dependencias ---
if not exist "%PY%" (
    echo [BACKEND] Creando entorno virtual...
    python -m venv "%BACK%\venv"
    if errorlevel 1 (
        echo [ERROR] No se pudo crear el entorno virtual.
        pause
        exit /b 1
    )
)
"%PY%" -c "import django, rest_framework, corsheaders, psycopg, jwt, bcrypt, dotenv" >nul 2>&1
if errorlevel 1 (
    echo [BACKEND] Instalando dependencias...
    "%PY%" -m pip install -r "%BACK%\requirements.txt"
    if errorlevel 1 (
        echo [ERROR] Fallo la instalacion de dependencias del backend.
        pause
        exit /b 1
    )
)

rem --- Frontend: dependencias y URL del API local ---
if not exist "%FRONT%\node_modules" (
    echo [FRONTEND] Instalando dependencias con npm install...
    call npm install --prefix "%FRONT%"
    if errorlevel 1 (
        echo [ERROR] Fallo npm install en el frontend.
        pause
        exit /b 1
    )
)
if not exist "%FRONT%\.env.local" (
    echo [FRONTEND] Creando frontend\.env.local apuntando al backend local...
    echo VITE_API_URL=http://127.0.0.1:8000/api> "%FRONT%\.env.local"
)

rem --- Arranque (cada servicio en su propia ventana) ---
echo [BACKEND] Iniciando Django en http://127.0.0.1:8000 ...
start "MotoPreview - Backend" /d "%BACK%" cmd /k "venv\Scripts\python.exe manage.py runserver 

echo [FRONTEND] Iniciando Vite en http://localhost:5173 ...
start "MotoPreview - Frontend" /d "%FRONT%" cmd /k npm run dev

timeout /t 6 /nobreak >nul
start "" http://localhost:5173

echo.
echo Listo. Para detener, cierra las dos ventanas (Backend y Frontend).
endlocal