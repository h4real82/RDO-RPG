@echo off
cd /d "%~dp0"
node scripts\serve-valentine-map.mjs data\runtime\valentine\finished-map-2026-10-24 --open
if errorlevel 1 pause
