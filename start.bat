@echo off
title Lumiere Nail Atelier
cd /d "%~dp0"
if not exist node_modules (
  echo Installing, please wait...
  call npm install
)
echo Building the website...
call npm run build
if errorlevel 1 (
  echo Build failed. See the messages above.
  pause
  exit /b 1
)
start "" http://localhost:4321
call npm start
