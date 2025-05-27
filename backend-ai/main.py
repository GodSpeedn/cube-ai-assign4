import os
from pathlib import Path
import re
from datetime import datetime
from typing import List, Dict, Any, Tuple
import tempfile
import subprocess
import sys
import logging
import ast

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from langchain_ollama import OllamaLLM

# -----------------------------------------------------------------------------
# App & CORS Configuration
# -----------------------------------------------------------------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Paths & Directories
# -----------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
GENERATED_DIR = BASE_DIR / "generated"
GENERATED_DIR.mkdir(exist_ok=True)
app.mount(
    "/generated",
    StaticFiles(directory=str(GENERATED_DIR)),
    name="generated"
)

# -----------------------------------------------------------------------------
# LLM Agents Initialization
# -----------------------------------------------------------------------------
# Coder: generates & refines source code
# Tester: generates unit tests
# Runner: executes tests
coder_llm  = OllamaLLM(model="mistral")
tester_llm = OllamaLLM(model="phi")
runner_llm = OllamaLLM(model="llama3.2:3b")

# -----------------------------------------------------------------------------
# Request Schemas
# -----------------------------------------------------------------------------
class PromptRequest(BaseModel):
    prompt: str
    code_history: List[str] = []
    error_history: List[str] = []

class RunTestRequest(BaseModel):
    code: str
    test_code: str
    previous_errors: List[str] = []

class RefineRequest(BaseModel):
    code: str
    test_code: str
    test_output: str
    code_history: List[str] = []
    error_history: List[str] = []
    previous_errors: List[str] = []

# -----------------------------------------------------------------------------
# Utility Functions
# -----------------------------------------------------------------------------
def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _extract_code(raw: str) -> str:
    match = re.search(r"```(?:python)?\s*([\s\S]*?)\s*```", raw)
    return match.group(1).strip() if match else raw.strip()


def _format_test_results(output: str) -> str:
    lines = output.strip().split("\n")
    summary = []
    results = {}
    current = None
    for line in lines:
        if not line.strip() or line.startswith('Ran '):
            continue
        m = re.match(r"(test_\w+).*?\.\.\.\s*(ok|FAIL|ERROR)", line)
        if m:
            name, status = m.groups()
            results[name] = {"status": status, "msg": ""}
            current = name
        elif current:
            results[current]['msg'] += line.strip() + ' '
    for name, d in results.items():
        if d['status'] == 'ok':
            summary.append(f"{name}: PASS")
        else:
            summary.append(f"{name}: {d['status']} - {d['msg'].strip()}")
    total = len(results)
    passed = sum(1 for d in results.values() if d['status']=='ok')
    failed = total - passed
    summary.append(f"\nTest Summary:\n- Total Tests: {total}\n- Passed: {passed}\n- Failed: {failed}")
    return "\n".join(summary)


def extract_definitions(source: str) -> Tuple[List[str], List[str], Dict[str, List[str]]]:
    tree = ast.parse(source)
    classes, funcs, methods = [], [], {}
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            cls = node.name
            classes.append(cls)
            methods[cls] = [m.name for m in node.body if isinstance(m, ast.FunctionDef)]
        elif isinstance(node, ast.FunctionDef):
            funcs.append(node.name)
    return classes, funcs, methods


def _normalize_imports(test_code: str, class_name: str=None) -> str:
    test_code = re.sub(r"from\s+\w+\s+import.*?\n", "", test_code)
    test_code = re.sub(r"import\s+unittest.*?\n", "", test_code)
    header = ["import unittest"]
    if class_name:
        header.append(f"from source import {class_name}")
    else:
        header.append("from source import *")
    return "\n".join(header) + "\n\n" + test_code


def validate_test_code(test_code: str) -> bool:
    return bool(re.search(r"def\s+test_\w+", test_code))


def _fix_test_code(test_code: str, source_code: str) -> str:
    classes, funcs, methods = extract_definitions(source_code)
    if not classes and not funcs:
        raise ValueError("No classes or functions to test.")
    is_class = bool(classes)
    class_name = classes[0] if is_class else None
    # strip existing definitions up to first Test
    if "class Test" in test_code:
        test_code = test_code[test_code.index("class Test"):]
    # scaffold new class
    tc_name = f"Test{class_name}" if is_class else "TestFunctions"
    body = []
    if is_class:
        body.append(f"    def setUp(self):\n        self.instance = {class_name}()\n")
        for m in methods.get(class_name, []):
            if m != '__init__':
                body.append(
                    f"    def test_{m}(self):\n"
                    f"        result = self.instance.{m}(2,3)\n"
                    f"        self.assertIsNotNone(result)\n"
                )
                if m == 'divide':
                    body.append(
                        "    def test_divide_by_zero(self):\n"
                        "        with self.assertRaises(ValueError):\n"
                        f"            self.instance.divide(1,0)\n"
                    )
    else:
        for f in funcs:
            body.append(
                f"    def test_{f}(self):\n"
                f"        result = {f}(2,3)\n"
                f"        self.assertIsNotNone(result)\n"
            )
    runner = "\nif __name__=='__main__':\n    unittest.main(verbosity=2)"
    code = f"class {tc_name}(unittest.TestCase):\n" + "\n".join(body) + runner
    return _normalize_imports(code, class_name)

# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------
@app.post("/generate-code")
async def generate_code(data: PromptRequest):
    try:
        prompt = f"System: Senior Software Engineer. Generate production-ready Python code.\n\n# Task: {data.prompt.strip()}"
        code = _extract_code(coder_llm.invoke(prompt))
        fname = f"main_{_timestamp()}.py"
        (GENERATED_DIR/fname).write_text(code, encoding='utf-8')
        return {"code": code, "file": fname, "message": "✅ Code saved."}
    except Exception as e:
        logging.error(f"/generate-code error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-test")
async def generate_test(data: PromptRequest):
    try:
        src = _extract_code(data.prompt)
        prompt = f"System: QA Engineer. Generate unittest code.\n\n# Source:\n{src}\n"
        raw = tester_llm.invoke(prompt)
        ai_tests = _extract_code(raw)
        final_tests = _fix_test_code(ai_tests, src)
        if not validate_test_code(final_tests):
            raise ValueError("No test methods generated.")
        fname = f"test_{_timestamp()}.py"
        (GENERATED_DIR/fname).write_text(final_tests, encoding='utf-8')
        return {"code": final_tests, "file": fname, "message": "✅ Tests generated."}
    except Exception as e:
        logging.error(f"/generate-test error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/run-test")
async def run_test(data: RunTestRequest):
    try:
        with tempfile.TemporaryDirectory() as td:
            # Write source and test files
            (Path(td)/'source.py').write_text(data.code, encoding='utf-8')
            (Path(td)/'test_source.py').write_text(data.test_code, encoding='utf-8')
            
            # Set up Python path
            env = os.environ.copy()
            env['PYTHONPATH'] = str(td)
            
            # Run tests using unittest
            cmd = [sys.executable, '-m', 'unittest', 'discover', '-v', '-s', str(td), '-p', 'test_*.py']
            res = subprocess.run(cmd, capture_output=True, text=True, env=env)
            
            # Format test results
            output = _format_test_results(res.stdout + res.stderr)
            
            # Have coordinator analyze results
            prompt = f"System: Project Coordinator. Analyze test results and provide a final status.\n\nTest Results:\n{output}\n"
            coordinator_response = runner_llm.invoke(prompt)
            
            return {
                "output": output,
                "coordinator_status": coordinator_response
            }
    except Exception as e:
        logging.error(f"/run-test error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-prompt")
async def process_prompt(data: PromptRequest):
    try:
        messages = []
        
        # 1. Generate code
        prompt = f"System: Senior Software Engineer. Generate production-ready Python code.\n\n# Task: {data.prompt.strip()}"
        code = _extract_code(coder_llm.invoke(prompt))
        fname = f"main_{_timestamp()}.py"
        (GENERATED_DIR/fname).write_text(code, encoding='utf-8')
        messages.append({
            "role": "coder",
            "content": code,
            "file": fname
        })
        messages.append({
            "role": "coordinator",
            "content": "✅ Code generated and saved."
        })

        # 2. Generate tests
        src = code
        prompt = f"System: QA Engineer. Generate unittest code.\n\n# Source:\n{src}\n"
        raw = tester_llm.invoke(prompt)
        ai_tests = _extract_code(raw)
        final_tests = _fix_test_code(ai_tests, src)
        if not validate_test_code(final_tests):
            raise ValueError("No test methods generated.")
        test_fname = f"test_{_timestamp()}.py"
        (GENERATED_DIR/test_fname).write_text(final_tests, encoding='utf-8')
        messages.append({
            "role": "tester",
            "content": final_tests,
            "file": test_fname
        })

        # 3. Run tests
        with tempfile.TemporaryDirectory() as td:
            (Path(td)/'source.py').write_text(code, encoding='utf-8')
            (Path(td)/'test_source.py').write_text(final_tests, encoding='utf-8')
            
            env = os.environ.copy()
            env['PYTHONPATH'] = str(td)
            
            cmd = [sys.executable, '-m', 'unittest', 'discover', '-v', '-s', str(td), '-p', 'test_*.py']
            res = subprocess.run(cmd, capture_output=True, text=True, env=env)
            
            output = _format_test_results(res.stdout + res.stderr)
            messages.append({
                "role": "runner",
                "content": output
            })

            # 4. Coordinator analysis
            prompt = f"System: Project Coordinator. Analyze test results and provide a final status.\n\nTest Results:\n{output}\n"
            coordinator_response = runner_llm.invoke(prompt)
            messages.append({
                "role": "coordinator",
                "content": coordinator_response
            })

        return {
            "messages": messages,
            "showRefine": "FAIL" in output or "ERROR" in output
        }
    except Exception as e:
        logging.error(f"/process-prompt error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/list-files")
async def list_files():
    files = [f.name for f in GENERATED_DIR.iterdir() if f.suffix == '.py']
    return JSONResponse({"files": sorted(files, reverse=True)})
        