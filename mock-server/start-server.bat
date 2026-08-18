@echo off
cd /d C:\SALHA\kapture-collections-voicebot\mock-server
echo.
echo ======================================================
echo   Kapture Finance Mock Webhook Server
echo   Listening on: http://localhost:3000/webhook
echo   ngrok tunnel: https://unchanging-tennille-normative.ngrok-free.dev/webhook
echo ======================================================
echo.
node server.js
pause
