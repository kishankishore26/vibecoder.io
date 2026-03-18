import { useState, useCallback, useRef } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import CodeEditor from "./components/CodeEditor";
import ReviewResults from "./components/ReviewResults";
import Footer from "./components/Footer";
import BackgroundEffects from "./components/BackgroundEffects";
import { reviewCode } from "./api";
import { Toaster, toast } from "react-hot-toast";
import "./App.css";

const SAMPLE_CODE = `def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    average = total / len(numbers)
    return average

def find_max(data):
    max_val = data[0]
    for i in range(len(data)):
        if data[i] > max_val:
            max_val = data[i]
    return max_val

def process_user_input(input_str):
    result = eval(input_str)
    return result

class DataProcessor:
    def __init__(self):
        self.data = []
        self.cache = {}

    def add_data(self, item):
        self.data.append(item)

    def get_processed(self):
        processed = []
        for item in self.data:
            processed.append(item * 2)
        return processed

    def find_item(self, target):
        for i in range(len(self.data)):
            if self.data[i] == target:
                return i
        return -1`;

const SAMPLE_PR_DIFF = `diff --git a/backend/main.py b/backend/main.py
index 5a89dff..ce71428 100644
--- a/backend/main.py
+++ b/backend/main.py
@@ -132,7 +132,10 @@ async def review_code(request: CodeReviewRequest):
 async def review_code(request: CodeReviewRequest):
-    if not request.code.strip():
+    if request.input_mode not in ("code", "pr"):
+        raise HTTPException(status_code=400, detail="Invalid input mode")
+
+    if not request.code.strip():
         raise HTTPException(status_code=400, detail="Code cannot be empty")
 
diff --git a/frontend/src/components/ReviewResults.jsx b/frontend/src/components/ReviewResults.jsx
index a8f21ca..7bd5310 100644
--- a/frontend/src/components/ReviewResults.jsx
+++ b/frontend/src/components/ReviewResults.jsx
@@ -84,7 +84,8 @@ function ReviewResults({ results, isLoading }) {
 function ReviewResults({ results, isLoading }) {
   if (isLoading) return <LoadingState />;
-  if (!results) return null;
+  const items = results.inline_comments;
+  if (!results || items.length === 0) return null;
 
   const { overall_score, summary, issues, suggestions, best_practices, security_concerns, metrics } = results;`;

function App() {
  const editorRef = useRef(null);
  const [code, setCode] = useState(SAMPLE_CODE);
  const [language, setLanguage] = useState("python");
  const [reviewType, setReviewType] = useState("full");
  const [inputMode, setInputMode] = useState("code");
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const handleInputModeChange = useCallback((mode) => {
    setInputMode(mode);
    setResults(null);
    setHasReviewed(false);
    setCode(mode === "pr" ? SAMPLE_PR_DIFF : SAMPLE_CODE);
  }, []);

  const handleReview = useCallback(async () => {
    if (!code.trim()) {
      toast.error(
        inputMode === "pr"
          ? "Please paste a PR diff to review"
          : "Please enter some code to review",
      );
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      const effectiveReviewType = inputMode === "pr" ? "full" : reviewType;
      const data = await reviewCode(
        code,
        language,
        effectiveReviewType,
        inputMode,
      );
      setResults(data);
      setHasReviewed(true);

      toast.success(
        inputMode === "pr" ? "PR review complete!" : "Code review complete!",
      );
    } catch (error) {
      const message =
        error.response?.data?.detail || error.message || "Review failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [code, inputMode, language, reviewType]);

  const scrollToEditor = () => {
    document
      .getElementById("editor-section")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const handleIssueClick = useCallback(
    (line) => {
      scrollToEditor();
      window.setTimeout(() => {
        editorRef.current?.goToLine(line);
      }, 220);
    },
    [],
  );

  return (
    <div className="app">
      <BackgroundEffects />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            fontFamily: "var(--font-sans)",
          },
        }}
      />

      <Navbar />
      <Hero onGetStarted={scrollToEditor} />

      <main className="main-content">
        <section id="editor-section" className="editor-section">
          <div className="section-header">
            <div className="section-badge">
              <span className="badge-dot"></span>
              AI Code Analyzer
            </div>
            <h2 className="section-title">
              Review code or PR diffs with{" "}
              <span className="gradient-text">AI reviewer comments</span>
            </h2>
            <p className="section-subtitle">
              Snippet mode gives a quality analysis. PR mode behaves like a
              CodeRabbit review with inline comments, merge verdict, and
              suggested patches.
            </p>
          </div>

          <CodeEditor
            ref={editorRef}
            code={code}
            setCode={setCode}
            language={language}
            setLanguage={setLanguage}
            reviewType={reviewType}
            setReviewType={setReviewType}
            inputMode={inputMode}
            setInputMode={handleInputModeChange}
            onReview={handleReview}
            isLoading={isLoading}
          />
        </section>

        {(results || isLoading) && (
          <section className="results-section">
            <ReviewResults
              results={results}
              isLoading={isLoading}
              onIssueClick={handleIssueClick}
            />
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
