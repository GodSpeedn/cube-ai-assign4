# AI-Powered Code Generation and Testing System

This project implements an AI-powered system for code generation, testing, and execution. It uses multiple AI agents (Coordinator, Coder, Tester, and Runner) to handle different aspects of the software development process.

## Features

- **Code Generation**: Uses Mistral AI to generate Python code based on user requirements
- **Test Generation**: Uses Phi AI to create comprehensive unit tests
- **Test Execution**: Uses Llama3.2 to run and analyze test results
- **Interactive UI**: Real-time visualization of agent interactions
- **Dark/Light Mode**: Modern UI with theme support

## Project Structure

```
.
├── backend-ai/           # Backend server and AI integration
│   ├── main.py          # FastAPI server and AI agent logic
│   └── generated/       # Generated code and test files
├── offline-ai-frontend/  # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # React contexts
│   │   └── styles/      # CSS styles
│   └── public/          # Static assets
└── README.md            # This file
```

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Install Node.js dependencies:
   ```bash
   cd offline-ai-frontend
   npm install
   ```

3. Start the backend server:
   ```bash
   cd backend-ai
   uvicorn main:app --reload
   ```

4. Start the frontend development server:
   ```bash
   cd offline-ai-frontend
   npm start
   ```

## Usage

1. Open your browser to `http://localhost:3000`
2. Enter your coding requirements in the prompt
3. Watch as the AI agents work together to:
   - Generate code
   - Create tests
   - Run tests
   - Refine code if needed

## Requirements

- Python 3.8+
- Node.js 14+
- Ollama (for local AI models)
- FastAPI
- React
- TypeScript

## License

MIT License 