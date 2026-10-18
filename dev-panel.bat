@echo off
chcp 65001 >nul
title PHYSICSLAB 3D - Panel de desarrollo
mode con: cols=100 lines=40
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev-panel.ps1"
