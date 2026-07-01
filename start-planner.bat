@echo off
cd /d "%~dp0"
set PORT=%1
if "%PORT%"=="" set PORT=8080
echo CSM Planner at http://localhost:%PORT%
echo Press Ctrl+C to stop.
python -m http.server %PORT%
