import os
import json
import re
import math
from typing import Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = FastAPI(title="VibeCoder AI Code Review API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
GEMINI_FALLBACK_MODELS = [
    model.strip()
    for model in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-2.5-flash,gemini-2.0-flash-lite,gemini-2.0-flash").split(",")
    if model.strip() and model.strip() != GEMINI_MODEL
]
if GEMINI_API_KEY and GEMINI_API_KEY not in ("your_gemini_api_key_here", ""):
    client = genai.Client(api_key=GEMINI_API_KEY)
    API_KEY_VALID = True
else:
    client = None
    GEMINI_API_KEY = ""
    API_KEY_VALID = False


class QuotaExceededError(Exception):
    def __init__(self, message: str, models_tried: list[str], retry_after_seconds: int | None = None):
        super().__init__(message)
        self.models_tried = models_tried
        self.retry_after_seconds = retry_after_seconds


class ModelConfigurationError(Exception):
    def __init__(self, message: str, errors: list[dict[str, str]]):
        super().__init__(message)
        self.errors = errors


def is_quota_error(error_text: str) -> bool:
    lowered = error_text.lower()
    return (
        "resource_exhausted" in lowered
        or "quota exceeded" in lowered
        or "429" in lowered
    )


def is_model_not_found_error(error_text: str) -> bool:
    lowered = error_text.lower()
    return "not_found" in lowered or "is not found" in lowered or "unsupported" in lowered


def parse_retry_after_seconds(error_text: str) -> int | None:
    retry_match = re.search(r"retry in\s+([0-9]+(?:\.[0-9]+)?)s", error_text, re.IGNORECASE)
    if retry_match:
        return max(1, math.ceil(float(retry_match.group(1))))

    delay_match = re.search(r"retryDelay':\s*'([0-9]+)s'", error_text)
    if delay_match:
        return max(1, int(delay_match.group(1)))

    return None


def number_code_lines(code: str) -> str:
    return "\n".join(
        f"{line_no:4}: {line}"
        for line_no, line in enumerate(code.split("\n"), start=1)
    )


def generate_with_model_fallback(prompt: str):
    models_to_try = [GEMINI_MODEL, *GEMINI_FALLBACK_MODELS]
    retry_after_candidates: list[int] = []
    model_errors: list[dict[str, str]] = []

    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            return response
        except Exception as model_error:
            error_text = str(model_error)
            if is_quota_error(error_text):
                retry_after = parse_retry_after_seconds(error_text)
                if retry_after:
                    retry_after_candidates.append(retry_after)
                continue
            if is_model_not_found_error(error_text):
                model_errors.append({"model": model_name, "error": "model_not_available"})
                continue
            model_errors.append({"model": model_name, "error": "request_failed"})
            raise

    retry_after_seconds = max(retry_after_candidates) if retry_after_candidates else None
    if retry_after_candidates:
        raise QuotaExceededError(
            message="Gemini quota was exhausted for all configured models.",
            models_tried=models_to_try,
            retry_after_seconds=retry_after_seconds,
        )

    raise ModelConfigurationError(
        message="No configured Gemini model is available for generateContent.",
        errors=model_errors,
    )


class CodeReviewRequest(BaseModel):
    code: str
    language: str = "python"
    review_type: str = "full"  # full, bugs, performance, security, style
    input_mode: str = "code"  # code, pr


class CodeReviewResponse(BaseModel):
    overall_score: int | None = None
    summary: str
    issues: list[dict[str, Any]] = Field(default_factory=list)
    suggestions: list[dict[str, Any]] = Field(default_factory=list)
    best_practices: list[dict[str, Any]] = Field(default_factory=list)
    security_concerns: list[dict[str, Any]] = Field(default_factory=list)
    metrics: dict[str, Any] = Field(default_factory=dict)
    review_mode: str = "code"
    verdict: str | None = None
    merge_recommendation: str | None = None
    pr_summary: list[str] = Field(default_factory=list)
    files_reviewed: list[dict[str, Any]] = Field(default_factory=list)
    inline_comments: list[dict[str, Any]] = Field(default_factory=list)
    suggested_patches: list[dict[str, Any]] = Field(default_factory=list)
    checks: list[dict[str, Any]] = Field(default_factory=list)


REVIEW_PROMPT = """You are an expert senior software engineer performing a thorough code review.
Analyze the following {language} code and provide a detailed review.

Review type requested: {review_type}

IMPORTANT LINE NUMBERING RULES:
- The code below is numbered line-by-line.
- The "line" field in each issue must use the exact numbered line.
- If an issue spans multiple lines, use the first relevant line.
- If no exact line exists, use null.

Code to review:
```{language}
{code}
```

Respond ONLY with valid JSON in the following format (no markdown, no code fences, just pure JSON):
{{
  "overall_score": <integer 0-100>,
  "summary": "<2-3 sentence summary of code quality>",
  "issues": [
    {{
      "severity": "<critical|warning|info>",
      "line": <line number or null>,
      "title": "<short title>",
      "description": "<detailed description of the issue>",
      "suggestion": "<how to fix it>"
    }}
  ],
  "suggestions": [
    {{
      "category": "<performance|readability|maintainability|architecture>",
      "title": "<short title>",
      "description": "<detailed suggestion>",
      "priority": "<high|medium|low>"
    }}
  ],
  "best_practices": [
    {{
      "followed": <true|false>,
      "practice": "<name of practice>",
      "details": "<explanation>"
    }}
  ],
  "security_concerns": [
    {{
      "severity": "<critical|warning|info>",
      "title": "<short title>",
      "description": "<detailed description>",
      "recommendation": "<how to mitigate>"
    }}
  ],
  "metrics": {{
    "complexity": "<low|medium|high>",
    "readability": <integer 0-100>,
    "maintainability": <integer 0-100>,
    "test_coverage_suggestion": "<suggestion about testing>"
  }}
}}

Be thorough but fair. Provide actionable feedback. If the code is good, acknowledge what's done well.
Focus especially on: {review_type} aspects.
"""


PR_REVIEW_PROMPT = """You are an expert pull request reviewer like CodeRabbit.
Review the following unified git diff and provide a structured PR review.

Review type requested: {review_type}

Unified diff:
```diff
{code}
```

Respond ONLY with valid JSON in the following format (no markdown, no code fences, just pure JSON):
{{
    "summary": "<2-3 sentence high-level PR summary>",
    "review_mode": "pr",
    "verdict": "<approved|changes_requested|comment>",
    "merge_recommendation": "<short recommendation for merge readiness>",
    "pr_summary": [
        "<concise bullet point>",
        "<concise bullet point>"
    ],
    "files_reviewed": [
        {{
            "file": "<relative file path>",
            "change_type": "<added|modified|deleted>",
            "risk": "<high|medium|low>",
            "notes": "<brief file level summary>"
        }}
    ],
    "inline_comments": [
        {{
            "severity": "<critical|warning|info>",
            "file": "<relative file path>",
            "line": <line number or null>,
            "title": "<short comment title>",
            "comment": "<specific issue description>",
            "suggestion": "<actionable fix>",
            "category": "<bug|security|performance|readability|testing|architecture>"
        }}
    ],
    "suggested_patches": [
        {{
            "file": "<relative file path>",
            "line": <line number or null>,
            "before": "<optional short code excerpt>",
            "after": "<improved code excerpt>",
            "reason": "<why this patch helps>"
        }}
    ],
    "checks": [
        {{
            "name": "<check name>",
            "status": "<pass|warn|fail>",
            "details": "<what was found>"
        }}
    ],
    "metrics": {{
        "complexity": "<low|medium|high>",
        "readability": <integer 0-100>,
        "maintainability": <integer 0-100>,
        "test_coverage_suggestion": "<suggestion about missing tests>"
    }}
}}

Be direct, concrete, and fair. Prioritize correctness and security risks.
"""


def extract_json(text: str) -> dict:
    """Extract JSON from text, handling potential markdown fences."""
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown code fences
    patterns = [
        r"```json\s*([\s\S]*?)\s*```",
        r"```\s*([\s\S]*?)\s*```",
        r"\{[\s\S]*\}",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            try:
                json_str = match.group(1) if match.lastindex else match.group(0)
                return json.loads(json_str)
            except (json.JSONDecodeError, IndexError):
                continue

    raise ValueError("Could not extract valid JSON from response")


@app.get("/")
async def root():
    return {"message": "VibeCoder AI Code Review API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "api_key_configured": bool(GEMINI_API_KEY),
        "model": GEMINI_MODEL,
        "fallback_models": GEMINI_FALLBACK_MODELS,
    }


@app.get("/api/models")
async def list_models():
    if not API_KEY_VALID or not client:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Please set GEMINI_API_KEY in backend/.env",
        )

    try:
        models = client.models.list()
        supported = []
        for model in models:
            methods = getattr(model, "supported_actions", None) or getattr(model, "supportedGenerationMethods", [])
            if "generateContent" in methods:
                supported.append(getattr(model, "name", "unknown"))

        return {
            "count": len(supported),
            "models": sorted(supported),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list Gemini models: {str(e)}",
        )


@app.post("/api/review", response_model=CodeReviewResponse)
async def review_code(request: CodeReviewRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code or diff cannot be empty")

    if request.input_mode not in ("code", "pr"):
        raise HTTPException(status_code=400, detail="input_mode must be either 'code' or 'pr'")

    if not API_KEY_VALID or not client:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Please set GEMINI_API_KEY in backend/.env",
        )

    try:
        code_for_prompt = number_code_lines(request.code) if request.input_mode == "code" else request.code

        prompt = (
            PR_REVIEW_PROMPT if request.input_mode == "pr" else REVIEW_PROMPT
        ).format(
            language=request.language,
            review_type=request.review_type,
            code=code_for_prompt,
        )

        response = generate_with_model_fallback(prompt)
        result = extract_json(response.text)

        if request.input_mode == "pr":
            result.setdefault("review_mode", "pr")
            result.setdefault("overall_score", None)
            result.setdefault("issues", [])
            result.setdefault("suggestions", [])
            result.setdefault("best_practices", [])
            result.setdefault("security_concerns", [])
            result.setdefault("metrics", {})
        else:
            result.setdefault("review_mode", "code")
            result.setdefault("pr_summary", [])
            result.setdefault("files_reviewed", [])
            result.setdefault("inline_comments", [])
            result.setdefault("suggested_patches", [])
            result.setdefault("checks", [])

        return CodeReviewResponse(**result)

    except QuotaExceededError as e:
        detail = {
            "error": "gemini_quota_exhausted",
            "message": "Gemini quota is exhausted for all configured models.",
            "models_tried": e.models_tried,
            "next_steps": [
                "Enable billing or increase Gemini quota for your project.",
                "Set GEMINI_MODEL and GEMINI_FALLBACK_MODELS in backend/.env to models that have available quota.",
                "Retry after the suggested delay if provided.",
            ],
        }
        headers = {}
        if e.retry_after_seconds:
            headers["Retry-After"] = str(e.retry_after_seconds)
            detail["retry_after_seconds"] = e.retry_after_seconds
        raise HTTPException(status_code=429, detail=detail, headers=headers)
    except ModelConfigurationError as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "gemini_model_configuration_error",
                "message": "Configured Gemini models are not available for this API key or API version.",
                "model": GEMINI_MODEL,
                "fallback_models": GEMINI_FALLBACK_MODELS,
                "details": e.errors,
                "next_steps": [
                    "Set GEMINI_MODEL to a model available to your key.",
                    "Set GEMINI_FALLBACK_MODELS to valid model names for your account.",
                    "Call ListModels in Gemini docs to see supported models for generateContent.",
                ],
            },
        )
    except ValueError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse AI response: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI review failed: {str(e)}",
        )


@app.post("/api/review/demo")
async def review_code_demo(request: CodeReviewRequest):
    """Demo endpoint that returns mock data when no API key is set."""
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code or diff cannot be empty")

    if request.input_mode not in ("code", "pr"):
        raise HTTPException(status_code=400, detail="input_mode must be either 'code' or 'pr'")

    if request.input_mode == "pr":
        return {
            "summary": "This PR improves API error handling and frontend rendering flow, but it introduces a few merge blockers in validation and test coverage.",
            "review_mode": "pr",
            "verdict": "changes_requested",
            "merge_recommendation": "Address critical validation issue and add regression tests before merge.",
            "pr_summary": [
                "Input validation was tightened in most handlers, which reduces runtime failures.",
                "A new rendering branch improves UX responsiveness but lacks edge-case handling.",
                "No automated tests were added for the new branches and error paths.",
            ],
            "files_reviewed": [
                {
                    "file": "backend/main.py",
                    "change_type": "modified",
                    "risk": "high",
                    "notes": "Request model and endpoint logic changed; validation paths need hardening.",
                },
                {
                    "file": "frontend/src/components/ReviewResults.jsx",
                    "change_type": "modified",
                    "risk": "medium",
                    "notes": "Rendering logic improved, but null-safe fallbacks are incomplete.",
                },
            ],
            "inline_comments": [
                {
                    "severity": "critical",
                    "file": "backend/main.py",
                    "line": 148,
                    "title": "Missing strict guard for unsupported mode",
                    "comment": "The handler continues execution for unsupported modes in one branch, which can produce invalid AI prompts.",
                    "suggestion": "Return HTTP 400 immediately when mode is not in the allowlist and add a unit test for this branch.",
                    "category": "bug",
                },
                {
                    "severity": "warning",
                    "file": "frontend/src/components/ReviewResults.jsx",
                    "line": 102,
                    "title": "Possible null property access",
                    "comment": "The component reads nested fields without fallback defaults during first render in PR mode.",
                    "suggestion": "Provide safe defaults for all optional sections before rendering arrays.",
                    "category": "readability",
                },
            ],
            "suggested_patches": [
                {
                    "file": "backend/main.py",
                    "line": 148,
                    "before": "if request.input_mode not in ('code', 'pr'):\n    pass",
                    "after": "if request.input_mode not in ('code', 'pr'):\n    raise HTTPException(status_code=400, detail=\"input_mode must be either 'code' or 'pr'\")",
                    "reason": "Failing fast prevents malformed prompts and unexpected response shapes.",
                }
            ],
            "checks": [
                {
                    "name": "Validation and guard rails",
                    "status": "fail",
                    "details": "Unsupported mode branch lacks strict rejection in one path.",
                },
                {
                    "name": "Security and secrets handling",
                    "status": "pass",
                    "details": "No hardcoded credentials or direct secret leakage detected in changes.",
                },
                {
                    "name": "Automated tests",
                    "status": "warn",
                    "details": "New logic paths are not covered by tests.",
                },
            ],
            "metrics": {
                "complexity": "medium",
                "readability": 78,
                "maintainability": 73,
                "test_coverage_suggestion": "Add API tests for invalid input_mode and component tests for PR-mode rendering fallbacks.",
            },
            "overall_score": None,
            "issues": [],
            "suggestions": [],
            "best_practices": [],
            "security_concerns": [],
        }

    lines = request.code.strip().split("\n")
    num_lines = len(lines)

    return {
        "overall_score": 72,
        "summary": f"The submitted {request.language} code ({num_lines} lines) shows reasonable structure but has several areas for improvement. There are potential bugs and some best practice violations that should be addressed.",
        "issues": [
            {
                "severity": "critical",
                "line": min(3, num_lines),
                "title": "Potential null reference",
                "description": "Variable may be used before being properly initialized, which could cause a runtime error.",
                "suggestion": "Add a null check or initialize the variable with a default value before use.",
            },
            {
                "severity": "warning",
                "line": min(7, num_lines),
                "title": "Missing error handling",
                "description": "This operation could fail but has no try-catch block or error handling mechanism.",
                "suggestion": "Wrap the operation in a try-catch block and handle potential errors gracefully.",
            },
            {
                "severity": "info",
                "line": min(12, num_lines),
                "title": "Magic number detected",
                "description": "A hardcoded numeric value is used without explanation. This reduces code readability.",
                "suggestion": "Extract the magic number into a named constant with a descriptive name.",
            },
        ],
        "suggestions": [
            {
                "category": "readability",
                "title": "Add type annotations",
                "description": "Adding type hints would improve code documentation and enable better IDE support and static analysis.",
                "priority": "high",
            },
            {
                "category": "performance",
                "title": "Consider caching",
                "description": "Repeated computations could benefit from memoization or caching to improve performance.",
                "priority": "medium",
            },
            {
                "category": "maintainability",
                "title": "Extract helper functions",
                "description": "Some logic blocks are complex and could be broken into smaller, well-named helper functions.",
                "priority": "medium",
            },
        ],
        "best_practices": [
            {
                "followed": True,
                "practice": "Consistent naming convention",
                "details": "Variable and function names follow a consistent naming pattern.",
            },
            {
                "followed": False,
                "practice": "Single Responsibility Principle",
                "details": "Some functions appear to handle multiple concerns and should be decomposed.",
            },
            {
                "followed": False,
                "practice": "Input validation",
                "details": "User inputs are not validated before processing, which could lead to unexpected behavior.",
            },
        ],
        "security_concerns": [
            {
                "severity": "warning",
                "title": "Input sanitization",
                "description": "User input is used directly without sanitization, potentially allowing injection attacks.",
                "recommendation": "Sanitize and validate all user inputs before processing.",
            },
        ],
        "metrics": {
            "complexity": "medium",
            "readability": 68,
            "maintainability": 65,
            "test_coverage_suggestion": "Add unit tests for core logic, especially edge cases and error paths.",
        },
        "review_mode": "code",
        "verdict": None,
        "merge_recommendation": None,
        "pr_summary": [],
        "files_reviewed": [],
        "inline_comments": [],
        "suggested_patches": [],
        "checks": [],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
