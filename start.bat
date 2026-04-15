@echo off
title Speedystopia
echo.
echo ============================================
echo   Speedystopia - Capture ecran ^& audio
echo ============================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js non installe.
    echo https://nodejs.org/
    pause & exit /b 1
)

:: Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Python non installe.
    echo https://python.org/
    pause & exit /b 1
)

:: Launch GUI
start "" pythonw "%~dp0launcher.pyw"
