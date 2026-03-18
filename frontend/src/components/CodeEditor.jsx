import { forwardRef, useImperativeHandle, useRef } from "react";
import Editor from "@monaco-editor/react";
import { FiPlay, FiLoader, FiChevronDown } from "react-icons/fi";
import "./CodeEditor.css";

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
];

const REVIEW_TYPES = [
  { value: "full", label: "Full Review", desc: "Complete analysis" },
  { value: "bugs", label: "Bug Detection", desc: "Find potential bugs" },
  { value: "performance", label: "Performance", desc: "Optimization tips" },
  { value: "security", label: "Security", desc: "Vulnerability scan" },
  { value: "style", label: "Code Style", desc: "Best practices" },
];

const INPUT_MODES = [
  { value: "code", label: "Code Snippet" },
  { value: "pr", label: "PR Diff" },
];

const CodeEditor = forwardRef(function CodeEditor(
  {
    code,
    setCode,
    language,
    setLanguage,
    reviewType,
    setReviewType,
    inputMode,
    setInputMode,
    onReview,
    isLoading,
  },
  ref,
) {
  const editorRef = useRef(null);
  const diffInputRef = useRef(null);

  const getMonacoLanguage = (lang) => {
    const map = { cpp: "cpp", csharp: "csharp" };
    return map[lang] || lang;
  };

  const goToLine = (line) => {
    const targetLine = Number(line);
    if (!Number.isFinite(targetLine) || targetLine < 1) {
      return;
    }

    if (inputMode === "code" && editorRef.current) {
      editorRef.current.revealLineInCenter(targetLine);
      editorRef.current.setPosition({ lineNumber: targetLine, column: 1 });
      editorRef.current.focus();
      return;
    }

    if (inputMode === "pr" && diffInputRef.current) {
      const textarea = diffInputRef.current;
      const lines = textarea.value.split("\n");
      const clampedLine = Math.min(Math.max(1, targetLine), lines.length);
      let offset = 0;
      for (let i = 0; i < clampedLine - 1; i += 1) {
        offset += lines[i].length + 1;
      }
      textarea.focus();
      textarea.setSelectionRange(offset, offset);
    }
  };

  useImperativeHandle(ref, () => ({
    goToLine,
  }));

  const reviewLabel = inputMode === "pr" ? "Review PR" : "Review Code";

  return (
    <div className="code-editor-container">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <div className="toolbar-dots">
            <span className="dot dot-red"></span>
            <span className="dot dot-yellow"></span>
            <span className="dot dot-green"></span>
          </div>

          <div className="select-wrapper">
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="toolbar-select"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            <FiChevronDown className="select-icon" />
          </div>

          <div className="select-wrapper">
            <select
              id="input-mode-select"
              value={inputMode}
              onChange={(e) => setInputMode(e.target.value)}
              className="toolbar-select"
            >
              {INPUT_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
            <FiChevronDown className="select-icon" />
          </div>

          <div className="select-wrapper">
            <select
              id="review-type-select"
              value={reviewType}
              onChange={(e) => setReviewType(e.target.value)}
              className={`toolbar-select ${inputMode === "pr" ? "toolbar-select-disabled" : ""}`}
              disabled={inputMode === "pr"}
              title={
                inputMode === "pr"
                  ? "PR mode always runs a full review"
                  : undefined
              }
            >
              {REVIEW_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <FiChevronDown className="select-icon" />
          </div>
        </div>

        <button
          className={`review-button ${isLoading ? "loading" : ""}`}
          onClick={onReview}
          disabled={isLoading}
          id="review-button"
        >
          {isLoading ? (
            <>
              <FiLoader className="spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <FiPlay />
              <span>{reviewLabel}</span>
            </>
          )}
        </button>
      </div>

      {/* Editor */}
      <div className="editor-wrapper">
        {inputMode === "code" ? (
          <Editor
            height="450px"
            language={getMonacoLanguage(language)}
            value={code}
            onChange={(val) => setCode(val || "")}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 10,
              lineNumbersMinChars: 3,
              renderLineHighlight: "line",
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              padding: { top: 16, bottom: 16 },
              wordWrap: "on",
              automaticLayout: true,
              tabSize: 4,
            }}
          />
        ) : (
          <textarea
            ref={diffInputRef}
            className="diff-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            placeholder="Paste a unified git diff here, for example:\n\ndiff --git a/src/app.js b/src/app.js\nindex e69de29..b7f5f8a 100644\n--- a/src/app.js\n+++ b/src/app.js\n@@ -1,3 +1,5 @@\n function add(a, b) {\n-  return a + b\n+  if (a == null || b == null) return 0\n+  return a + b\n }"
          />
        )}
      </div>

      {/* Footer hint */}
      <div className="editor-footer">
        <span className="editor-hint">
          {inputMode === "pr" ? (
            <>
              Paste a unified diff and click <strong>Review PR</strong> for
              CodeRabbit-style feedback
            </>
          ) : (
            <>
              Paste your code above and click <strong>Review Code</strong> to
              get AI-powered feedback
            </>
          )}
        </span>
        <span className="editor-line-count">
          {code.split("\n").length} lines
        </span>
      </div>
    </div>
  );
});

export default CodeEditor;
