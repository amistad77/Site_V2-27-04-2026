@echo off
chcp 65001 >nul
title Portfolio — serveur local
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
  echo.
  echo [ERREUR] Python n'est pas installe ou pas dans le PATH.
  echo Installez Python 3 : https://www.python.org/downloads/
  echo.
  pause
  exit /b 1
)

python server.py
pause
