@echo off
echo Starting Combined Backend Service with API Keys...

cd backend-ai
call venv\Scripts\activate.bat

REM Set your API keys here or use environment variables
REM set OPENAI_API_KEY=your_openai_api_key_here
REM set MISTRAL_API_KEY=your_mistral_api_key_here
REM set GEMINI_API_KEY=your_gemini_api_key_here

echo API Keys set successfully!
echo Starting main.py...
python main.py

pause
