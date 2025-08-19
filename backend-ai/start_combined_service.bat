@echo off
echo Starting Combined Backend Service with API Keys...

cd backend-ai
call venv\Scripts\activate.bat

set OPENAI_API_KEY=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
set MISTRAL_API_KEY=deNpjI2ZANiSN6ZmWUwONZQf8FWh8BUB
set GEMINI_API_KEY=AIzaSyAEfhANJ5nBYacg4LGeHuVEiGj1jz-6ttU

echo API Keys set successfully!
echo Starting main.py...
python main.py

pause
