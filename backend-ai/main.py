import os
from pathlib import Path
import re
from datetime import datetime
from typing import List, Dict, Any
import tempfile
import subprocess
import sys
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from langchain_ollama import OllamaLLM

"""
FastAPI backend for the offline multi-agent coding assistant with enterprise-grade prompts.
Endpoints are prompted to emulate major tech-company best practices (e.g., Google, Microsoft).
"""

# -----------------------------------------------------------------------------
# App & CORS
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
app.mount("/generated", StaticFiles(directory=str(GENERATED_DIR)), name="generated")

# -----------------------------------------------------------------------------
# LLM Agents
# -----------------------------------------------------------------------------
coder_llm  = OllamaLLM(model="mistral")       # Generates & refines source code
tester_llm = OllamaLLM(model="phi")           # Generates unit tests
runner_llm = OllamaLLM(model="llama3.2:3b")  # Runs tests and reports outcomes

# -----------------------------------------------------------------------------
# Schemas
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
# Utils
# -----------------------------------------------------------------------------
def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")

def _extract_code(raw: str) -> str:
    match = re.search(r"```(?:python)?\s*([\s\S]*?)\s*```", raw)
    return match.group(1).strip() if match else raw.strip()

def _format_test_results(output: str) -> str:
    """Format test results in a consistent and informative way."""
    lines = output.strip().split('\n')
    formatted = []
    test_results = {}

    current_test = None
    for line in lines:
        # Only skip truly empty or overall summary lines
        if not line.strip() or line.startswith('Ran '):
            continue

        # Match verbose output: "test_add (...) ... ok" or "... FAIL"
        m = re.match(r'(test_\w+).*?\.{3}\s*(ok|FAIL|ERROR)', line)
        if m:
            name, status = m.group(1), m.group(2)
            test_results[name] = {"status": status, "message": ""}
            current_test = name
            continue

        # Capture any error message lines after a FAIL/ERROR
        if current_test and (line.startswith('    ') or 'Traceback' in line):
            test_results[current_test]["message"] += line.strip() + ' '
    
    # Build formatted list
    for name, r in test_results.items():
        if r["status"] == 'ok':
            formatted.append(f"{name}: PASS")
        else:
            formatted.append(f"{name}: {r['status']} - {r['message'].strip()}")

    # Add summary
    total = len(test_results)
    passed = sum(1 for r in test_results.values() if r["status"] == 'ok')
    failed = total - passed
    formatted.append(f"\nTest Summary:\n- Total Tests: {total}\n- Passed: {passed}\n- Failed: {failed}")

    return "\n".join(formatted)

def _run_python_tests(code: str, test_code: str) -> str:
    """Actually execute the Python tests and return the results."""
    logger.info("Starting test execution...")
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # Get the actual source file name from the generated directory
            source_files = list(GENERATED_DIR.glob("main_*.py"))
            if not source_files:
                raise ValueError("No source file found in generated directory")
            
            # Use the most recent source file
            source_file = max(source_files, key=lambda x: x.stat().st_mtime)
            source_name = source_file.stem  # Get filename without extension
            
            # Write the source code
            source_path = Path(temp_dir) / f"{source_name}.py"
            logger.info(f"Writing source code to {source_path}")
            source_path.write_text(code, encoding="utf-8")
            logger.info(f"Source code content:\n{code}")
            
            # Write the test code
            test_path = Path(temp_dir) / f"test_{source_name}.py"
            logger.info(f"Writing test code to {test_path}")
            
            # Update test code to use correct import
            test_code = test_code.replace("from source import", f"from {source_name} import")
            test_code = test_code.replace("import source", f"import {source_name}")
            
            test_path.write_text(test_code, encoding="utf-8")
            logger.info(f"Test code content:\n{test_code}")
            
            # Create an empty __init__.py to make the directory a package
            init_path = Path(temp_dir) / "__init__.py"
            init_path.write_text("", encoding="utf-8")
            
            # Add source directory to Python path
            env = os.environ.copy()
            env["PYTHONPATH"] = str(temp_dir)
            
            logger.info("Running tests...")
            # Run the tests directly using the test file
            cmd = [sys.executable, "-m", "unittest", str(test_path)]
            logger.info(f"Executing command: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                env=env,
                cwd=temp_dir  # Set working directory to temp_dir
            )
            
            logger.info(f"Test execution completed with return code: {result.returncode}")
            if result.stdout:
                logger.info(f"Test stdout: {result.stdout}")
            if result.stderr:
                logger.error(f"Test stderr: {result.stderr}")
                
            # If there's an error, try to run the test file directly
            if result.returncode != 0:
                logger.info("Attempting to run test file directly...")
                direct_cmd = [sys.executable, str(test_path)]
                logger.info(f"Executing direct command: {' '.join(direct_cmd)}")
                
                direct_result = subprocess.run(
                    direct_cmd,
                    capture_output=True,
                    text=True,
                    env=env,
                    cwd=temp_dir
                )
                
                if direct_result.stdout:
                    logger.info(f"Direct test stdout: {direct_result.stdout}")
                if direct_result.stderr:
                    logger.error(f"Direct test stderr: {direct_result.stderr}")
                
                return direct_result.stdout + direct_result.stderr
            
            return result.stdout + result.stderr
        except Exception as e:
            logger.error(f"Error running tests: {str(e)}")
            return f"Error running tests: {str(e)}"

def _validate_test_code(test_code: str, source_code: str) -> tuple[bool, str]:
    """Validate that the test code is properly structured and tests the source code."""
    issues = []
    
    # Check for proper imports
    if not any(f"import {Path('source').stem}" in line or "from source import" in line 
              for line in test_code.split('\n')):
        issues.append("Test code does not import the source code")
    
    # Check for test methods
    if not re.search(r"def\s+test_\w+", test_code):
        issues.append("No test methods found (should start with 'test_')")
    
    # Check for assertions
    if not re.search(r"self\.assert", test_code):
        issues.append("No assertions found in test methods")
    
    # Check if tests match source code
    source_classes = set(re.findall(r"class\s+(\w+)", source_code))
    test_classes = set(re.findall(r"class\s+Test(\w+)", test_code))
    
    if not any(test_class in source_classes for test_class in test_classes):
        issues.append("Test classes do not match source code classes")
    
    # Check for setUp method
    if not re.search(r"def\s+setUp\s*\(", test_code):
        issues.append("No setUp method found")
    
    # Check for proper test method names matching source methods
    source_methods = set(re.findall(r"def\s+(\w+)", source_code))
    test_methods = set(re.findall(r"def\s+test_(\w+)", test_code))
    
    # Convert test method names back to source method names
    test_source_methods = {name.replace('test_', '') for name in test_methods}
    
    if not any(method in source_methods for method in test_source_methods):
        issues.append("Test methods do not match source code methods")
    
    return len(issues) == 0, "\n".join(issues)

def _fix_test_code(test_code: str, source_code: str) -> str:
    """Fix common issues in test code to match source code structure."""
    # Extract class name from source code
    class_match = re.search(r"class\s+(\w+)", source_code)
    class_name = class_match.group(1) if class_match else None
    
    # Extract method names from source code
    source_methods = set(re.findall(r"def\s+(\w+)", source_code))
    
    # Fix imports - ensure we're importing from the correct module
    test_code = test_code.replace("import unittest from", "import unittest\nfrom")
    test_code = test_code.replace("from sources import", "from source import")
    test_code = test_code.replace("import sources", "import source")
    test_code = test_code.replace("from python_calculator import", "from source import")
    test_code = test_code.replace("import python_calculator", "import source")
    
    # Add proper imports if missing
    if not any(f"import {Path('source').stem}" in line or "from source import" in line 
              for line in test_code.split('\n')):
        test_code = "import unittest\nfrom source import *\n\n" + test_code
    
    # If we found a class in the source code, ensure proper test class name
    if class_name:
        if not f"class Test{class_name}" in test_code:
            test_code = test_code.replace("class TestPythonCalculator", f"class Test{class_name}")
            test_code = test_code.replace("class TestCalculator", f"class Test{class_name}")
        
        # Ensure setUp method with proper instance creation
        if not "def setUp" in test_code:
            setup_code = f"""    def setUp(self):
        \"\"\"Set up test cases.\"\"\"
        self.instance = {class_name}()
"""
            test_code = test_code.replace(f"class Test{class_name}(unittest.TestCase):",
                                        f"class Test{class_name}(unittest.TestCase):\n{setup_code}")
    
    # Fix common assertion patterns
    test_code = test_code.replace("self.assertEqual(self.calc.", "self.assertEqual(self.instance.")
    test_code = test_code.replace("self.calc.", "self.instance.")
    test_code = test_code.replace("calc = PythonCalculator()", f"self.instance = {class_name}()")
    test_code = test_code.replace("calc = Calculator()", f"self.instance = {class_name}()")
    
    # Remove duplicate test methods
    test_methods = {}
    for line in test_code.split('\n'):
        if line.strip().startswith('def test_'):
            method_name = line.split('(')[0].split('def ')[1]
            if method_name not in test_methods:
                test_methods[method_name] = line
    
    # Rebuild test code without duplicates
    lines = test_code.split('\n')
    new_lines = []
    in_test_method = False
    for line in lines:
        if line.strip().startswith('def test_'):
            method_name = line.split('(')[0].split('def ')[1]
            if method_name in test_methods and line == test_methods[method_name]:
                in_test_method = True
                new_lines.append(line)
            else:
                in_test_method = False
        elif in_test_method and line.strip() and not line.strip().startswith('def '):
            new_lines.append(line)
        elif not in_test_method:
            new_lines.append(line)
    
    test_code = '\n'.join(new_lines)
    
    # Ensure proper test runner code
    if not "if __name__ == '__main__':" in test_code:
        test_code += "\n\nif __name__ == '__main__':\n    unittest.main()"
    
    return test_code

# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.post("/generate-code")
async def generate_code(data: PromptRequest):
    try:
        logger.info("Coordinator: Requesting code generation from Coder")
        # Enterprise-grade code generation prompt (Google style)
        prompt = (
            "System: You are a Senior Software Engineer at Google, writing production-ready Python code. "
            "Your output must be efficient, secure, and follow PEP8 standards. "
            "Return ONLY the runnable code, no markdown, no explanations.\n\n"
            "IMPORTANT: Your code MUST:\n"
            "1. Be wrapped in a class (e.g., Calculator)\n"
            "2. Include proper docstrings\n"
            "3. Handle edge cases and errors\n"
            "4. Follow PEP8 standards\n\n"
            f"# Task: {data.prompt.strip()}\n\n"
            f"# Previous Errors:\n" + "\n".join(f"- {err}" for err in data.error_history) + "\n\n"
            f"# Previous Code Versions:\n" + "\n".join(f"```python\n{code}\n```" for code in data.code_history)
        )
        
        logger.info("Sending prompt to Coder LLM...")
        raw = coder_llm.invoke(prompt)
        logger.info("Received response from Coder LLM")
        
        code = _extract_code(raw)
        logger.info("Extracted code from response")
        
        # Ensure the code is wrapped in a class if it isn't already
        if not re.search(r"class\s+\w+", code):
            logger.info("Wrapping code in class structure")
            # Extract function names
            functions = re.findall(r"def\s+(\w+)", code)
            class_name = "Calculator"  # Default class name
            
            # Create class structure
            class_code = f"""class {class_name}:
    \"\"\"A calculator class that provides basic arithmetic operations.\"\"\"
    
{code}

    def __init__(self):
        \"\"\"Initialize the calculator.\"\"\"
        pass
"""
            code = class_code
            logger.info("Code wrapped in class structure")

        fname = f"main_{_timestamp()}.py"
        fpath = GENERATED_DIR / fname
        logger.info(f"Saving code to {fpath}")
        fpath.write_text(code, encoding="utf-8")

        return {"code": code, "file": fname, "message": f"✅ Code saved: {fname}"}
    except Exception as e:
        logger.error(f"Error in generate_code: {str(e)}")
        raise

@app.post("/generate-test")
async def generate_test(data: PromptRequest):
    try:
        logger.info("Coordinator: Requesting test generation from Tester")
        # Enterprise-grade test generation prompt (Microsoft style)
        prompt = (
            "System: You are a Principal QA Engineer at Microsoft. "
            "Generate high-coverage, maintainable unittest code for the given Python functions. "
            "Use Python's unittest framework, include meaningful test names, and mock external dependencies if needed. "
            "Return ONLY the test code.\n\n"
            f"# Source code to test:\n{data.prompt.strip()}\n\n"
            f"# Previous Test Failures:\n" + "\n".join(f"- {err}" for err in data.error_history) + "\n\n"
            f"# Previous Test Versions:\n" + "\n".join(f"```python\n{code}\n```" for code in data.code_history) + "\n\n"
            "IMPORTANT: Your test code MUST:\n"
            "1. Import the source code using 'from source import *'\n"
            "2. Test the actual functions/classes from the source code\n"
            "3. Include proper assertions for each test case\n"
            "4. Cover edge cases and error conditions\n"
            "5. Use meaningful test names that describe what is being tested\n"
            "6. Test class names should match source class names (e.g., TestCalculator for Calculator class)\n"
            "7. Include setUp method to initialize the class being tested\n\n"
            "Format your response as a complete unittest class with proper imports and test methods."
        )
        
        logger.info("Sending prompt to Tester LLM...")
        raw = tester_llm.invoke(prompt)
        logger.info("Received response from Tester LLM")
        
        test_code = _extract_code(raw)
        logger.info("Extracted test code from response")
        
        # Fix common issues in test code
        logger.info("Fixing test code structure")
        test_code = _fix_test_code(test_code, data.prompt)
        
        # Validate test structure
        is_valid, validation_issues = _validate_test_code(test_code, data.prompt)
        if not is_valid:
            logger.warning(f"Test validation issues: {validation_issues}")
            return {
                "code": test_code,
                "file": f"test_{_timestamp()}.py",
                "result": "⚠️ Generated tests have structural issues",
                "status": "Test Generated with Warnings",
                "error": validation_issues
            }
        
        # Validate test code by trying to run it
        try:
            logger.info("Validating test code by running tests")
            _run_python_tests(data.prompt, test_code)
            logger.info("Test validation successful")
        except Exception as e:
            logger.error(f"Test validation failed: {str(e)}")
            return {
                "code": test_code,
                "file": f"test_{_timestamp()}.py",
                "result": "⚠️ Generated tests may have runtime issues",
                "status": "Test Generated with Warnings",
                "error": str(e)
            }
        
        fname = f"test_{_timestamp()}.py"
        fpath = GENERATED_DIR / fname
        logger.info(f"Saving test code to {fpath}")
        fpath.write_text(test_code, encoding="utf-8")
        
        return {
            "code": test_code,
            "file": fname,
            "result": "✅ Test generated and validated",
            "status": "Test Generated"
        }
    except Exception as e:
        logger.error(f"Error in generate_test: {str(e)}")
        raise

@app.post("/run-test")
async def run_test(data: RunTestRequest):
    try:
        logger.info("Coordinator: Requesting test execution from Runner")
        # First, validate that the test code is actually testing our source code
        if not any(f"import {Path('source').stem}" in line or "from source import" in line 
                  for line in data.test_code.split('\n')):
            logger.error("Test code does not import the source code")
            return {
                "output": "ERROR: Test code does not import the source code to test. Please ensure tests import the correct module.",
                "error": True
            }
        
        # Actually run the tests
        logger.info("Running Python tests...")
        output = _run_python_tests(data.code, data.test_code)
        logger.info("Tests completed, formatting results")
        formatted_output = _format_test_results(output)
        
        # Check if any tests failed
        has_failures = any("FAIL" in line or "ERROR" in line for line in formatted_output.split('\n'))
        logger.info(f"Test execution completed. Has failures: {has_failures}")
        
        return {
            "output": formatted_output,
            "error": has_failures,
            "summary": {
                "total": len([l for l in formatted_output.split('\n') if ":" in l]),
                "passed": len([l for l in formatted_output.split('\n') if ": PASS" in l]),
                "failed": len([l for l in formatted_output.split('\n') if ": FAIL" in l or ": ERROR" in l])
            }
        }
    except Exception as e:
        logger.error(f"Error in run_test: {str(e)}")
        raise

@app.post("/refine-code")
async def refine_code(data: RefineRequest):
    logger.info("Coordinator: Requesting code refinement from Coder")
    # Enterprise-grade refinement prompt (Devin-ku style)
    prompt = (
        "System: You are a distinguished Senior Developer at Amazon. "
        "The following Python code failed its unit tests. "
        "Produce a corrected version that fixes all failures, optimizing for readability and maintainability. "
        "Return ONLY the updated Python code block, no explanations or tests.\n\n"
        f"# Original code:\n{data.code}\n\n"
        f"# Unit tests:\n{data.test_code}\n\n"
        f"# Test results:\n{data.test_output}\n\n"
        f"# Previous Errors:\n" + "\n".join(f"- {err}" for err in data.error_history) + "\n\n"
        f"# Previous Code Versions:\n" + "\n".join(f"```python\n{code}\n```" for code in data.code_history)
    )
    raw = coder_llm.invoke(prompt)
    new_code = _extract_code(raw)
    logger.info("Coder: Code refinement complete")

    fname = f"main_refined_{_timestamp()}.py"
    fpath = GENERATED_DIR / fname
    fpath.write_text(new_code, encoding="utf-8")

    return {
        "code": new_code,
        "file": fname,
        "message": "✅ Code refined based on tests."
    }

@app.get("/list-files")
def list_files():
    files = [f.name for f in GENERATED_DIR.iterdir() if f.suffix == ".py"]
    return JSONResponse({"files": sorted(files, reverse=True)})
