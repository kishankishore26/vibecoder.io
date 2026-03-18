import { motion } from "framer-motion";
import {
  FiAlertTriangle,
  FiAlertCircle,
  FiInfo,
  FiCheckCircle,
  FiXCircle,
  FiShield,
  FiZap,
  FiTrendingUp,
  FiCpu,
  FiGitPullRequest,
  FiGitCommit,
  FiCheck,
  FiX,
} from "react-icons/fi";
import "./ReviewResults.css";

function ScoreRing({ score }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getScoreColor = (s) => {
    if (s >= 80) return "#66bb6a";
    if (s >= 60) return "#ffa726";
    if (s >= 40) return "#ff7043";
    return "#ff5252";
  };

  const getScoreLabel = (s) => {
    if (s >= 90) return "Excellent";
    if (s >= 80) return "Great";
    if (s >= 70) return "Good";
    if (s >= 60) return "Fair";
    if (s >= 40) return "Needs Work";
    return "Critical";
  };

  const color = getScoreColor(score);

  return (
    <div className="score-ring-container">
      <svg className="score-ring" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="8"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          transform="rotate(-90 60 60)"
          style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
        />
        <text
          x="60"
          y="55"
          textAnchor="middle"
          className="score-value"
          fill={color}
        >
          {score}
        </text>
        <text
          x="60"
          y="72"
          textAnchor="middle"
          className="score-max"
          fill="var(--text-muted)"
        >
          / 100
        </text>
      </svg>
      <div className="score-label" style={{ color }}>
        {getScoreLabel(score)}
      </div>
    </div>
  );
}

function MetricBar({ label, value, icon: Icon }) {
  const getColor = (v) => {
    if (v >= 80) return "var(--success)";
    if (v >= 60) return "var(--warning)";
    return "var(--critical)";
  };

  return (
    <div className="metric-bar">
      <div className="metric-header">
        <span className="metric-label">
          <Icon className="metric-icon" />
          {label}
        </span>
        <span className="metric-value" style={{ color: getColor(value) }}>
          {value}%
        </span>
      </div>
      <div className="metric-track">
        <motion.div
          className="metric-fill"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          style={{ background: getColor(value) }}
        />
      </div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const config = {
    critical: {
      color: "var(--critical)",
      bg: "var(--critical-bg)",
      border: "var(--critical-border)",
      icon: FiAlertCircle,
    },
    warning: {
      color: "var(--warning)",
      bg: "var(--warning-bg)",
      border: "var(--warning-border)",
      icon: FiAlertTriangle,
    },
    info: {
      color: "var(--info)",
      bg: "var(--info-bg)",
      border: "var(--info-border)",
      icon: FiInfo,
    },
    high: {
      color: "var(--critical)",
      bg: "var(--critical-bg)",
      border: "var(--critical-border)",
      icon: FiAlertCircle,
    },
    medium: {
      color: "var(--warning)",
      bg: "var(--warning-bg)",
      border: "var(--warning-border)",
      icon: FiAlertTriangle,
    },
    low: {
      color: "var(--info)",
      bg: "var(--info-bg)",
      border: "var(--info-border)",
      icon: FiInfo,
    },
  };

  const { color, bg, border, icon: Icon } = config[severity] || config.info;

  return (
    <span
      className="severity-badge"
      style={{ color, background: bg, borderColor: border }}
    >
      <Icon size={12} />
      {severity}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <FiCpu className="spinner-icon" />
      </div>
      <h3 className="loading-title">Analyzing Your Code</h3>
      <p className="loading-text">
        Our AI is reviewing your code for bugs, security issues, and
        improvements...
      </p>
      <div className="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}

function CheckStatusBadge({ status }) {
  const config = {
    pass: { label: "PASS", className: "check-pass", icon: FiCheck },
    warn: { label: "WARN", className: "check-warn", icon: FiAlertTriangle },
    fail: { label: "FAIL", className: "check-fail", icon: FiX },
  };
  const selected = config[status] || config.warn;
  const Icon = selected.icon;

  return (
    <span className={`check-status-badge ${selected.className}`}>
      <Icon size={12} />
      {selected.label}
    </span>
  );
}

function PRReviewPanel({ results, onIssueClick }) {
  const {
    summary,
    verdict,
    merge_recommendation,
    pr_summary = [],
    files_reviewed = [],
    inline_comments = [],
    suggested_patches = [],
    checks = [],
    metrics = {},
  } = results;

  return (
    <div className="review-results">
      <div className="results-header pr-header">
        <div className="results-header-left">
          <h2 className="results-title">
            <FiGitPullRequest className="title-icon" />
            PR Review Results
          </h2>
          <p className="results-summary">{summary}</p>
          <div className="pr-verdict-row">
            <span className={`pr-verdict verdict-${verdict || "comment"}`}>
              {(verdict || "comment").replace("_", " ")}
            </span>
            {merge_recommendation && (
              <span className="pr-merge-note">{merge_recommendation}</span>
            )}
          </div>
        </div>
      </div>

      {pr_summary.length > 0 && (
        <div className="results-section">
          <h3 className="section-heading">
            <FiGitCommit />
            PR Summary
          </h3>
          <ul className="pr-summary-list">
            {pr_summary.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {files_reviewed.length > 0 && (
        <div className="results-section">
          <h3 className="section-heading">
            <FiCpu />
            Files Reviewed
            <span className="count-badge">{files_reviewed.length}</span>
          </h3>
          <div className="issues-list">
            {files_reviewed.map((item, index) => (
              <div key={index} className="issue-card">
                <div className="issue-header">
                  <SeverityBadge severity={item.risk} />
                  <span className="issue-title">{item.file}</span>
                  <span className="issue-line">{item.change_type}</span>
                </div>
                {item.notes && (
                  <p className="issue-description">{item.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {inline_comments.length > 0 && (
        <div className="results-section">
          <h3 className="section-heading">
            <FiAlertCircle />
            Inline Comments
            <span className="count-badge">{inline_comments.length}</span>
          </h3>
          <div className="issues-list">
            {inline_comments.map((comment, index) => {
              const canJump = Number.isInteger(comment.line) && comment.line > 0;

              return (
                <div
                  key={index}
                  className={`issue-card ${canJump ? "clickable" : ""}`}
                  role={canJump ? "button" : undefined}
                  tabIndex={canJump ? 0 : undefined}
                  onClick={canJump ? () => onIssueClick?.(comment.line) : undefined}
                  onKeyDown={
                    canJump
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onIssueClick?.(comment.line);
                          }
                        }
                      : undefined
                  }
                >
                  <div className="issue-header">
                    <SeverityBadge severity={comment.severity} />
                    <span className="issue-title">{comment.title}</span>
                    <span className="issue-line">
                      {comment.file || "unknown file"}
                      {comment.line ? `:${comment.line}` : ""}
                    </span>
                  </div>
                  <p className="issue-description">{comment.comment}</p>
                  <div className="suggestion-header">
                    <span className="suggestion-category">
                      {comment.category || "general"}
                    </span>
                  </div>
                  {comment.suggestion && (
                    <div className="issue-suggestion">
                      <FiCheckCircle className="suggestion-icon" />
                      <span>{comment.suggestion}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {suggested_patches.length > 0 && (
        <div className="results-section">
          <h3 className="section-heading">
            <FiZap />
            Suggested Patches
            <span className="count-badge">{suggested_patches.length}</span>
          </h3>
          <div className="security-list">
            {suggested_patches.map((patch, index) => (
              <div key={index} className="security-card">
                <div className="security-header">
                  <span className="security-title">
                    {patch.file || "Patch"}
                  </span>
                  {patch.line && (
                    <span className="issue-line">Line {patch.line}</span>
                  )}
                </div>
                {patch.before && (
                  <pre className="patch-block patch-before">{patch.before}</pre>
                )}
                {patch.after && (
                  <pre className="patch-block patch-after">{patch.after}</pre>
                )}
                {patch.reason && (
                  <p className="security-description">{patch.reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {checks.length > 0 && (
        <div className="results-section">
          <h3 className="section-heading">
            <FiShield />
            Review Checks
          </h3>
          <div className="pr-checks-list">
            {checks.map((check, index) => (
              <div key={index} className="pr-check-card">
                <div className="pr-check-head">
                  <span className="pr-check-title">{check.name}</span>
                  <CheckStatusBadge status={check.status} />
                </div>
                <p>{check.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics?.test_coverage_suggestion && (
        <div className="test-coverage-card">
          <FiCpu className="test-icon" />
          <div>
            <h4>Testing Recommendation</h4>
            <p>{metrics.test_coverage_suggestion}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewResults({ results, isLoading, onIssueClick }) {
  if (isLoading) return <LoadingState />;
  if (!results) return null;

  if (results.review_mode === "pr") {
    return <PRReviewPanel results={results} onIssueClick={onIssueClick} />;
  }

  const {
    overall_score,
    summary,
    issues,
    suggestions,
    best_practices,
    security_concerns,
    metrics,
  } = results;

  return (
    <div className="review-results">
      {/* Header */}
      <div className="results-header">
        <div className="results-header-left">
          <h2 className="results-title">Review Results</h2>
          <p className="results-summary">{summary}</p>
        </div>
        <ScoreRing score={overall_score} />
      </div>

      {/* Metrics */}
      <motion.div
        className="results-metrics"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="metrics-grid">
          <MetricBar
            label="Readability"
            value={metrics.readability}
            icon={FiTrendingUp}
          />
          <MetricBar
            label="Maintainability"
            value={metrics.maintainability}
            icon={FiZap}
          />
        </div>
        <div className="complexity-badge-wrapper">
          <span className="complexity-label">Complexity</span>
          <span className={`complexity-badge complexity-${metrics.complexity}`}>
            {metrics.complexity}
          </span>
        </div>
      </motion.div>

      {/* Issues */}
      {issues && issues.length > 0 && (
        <motion.div
          className="results-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="section-heading">
            <FiAlertCircle />
            Issues Found
            <span className="count-badge">{issues.length}</span>
          </h3>
          <div className="issues-list">
            {issues.map((issue, i) => {
              const canJump = Number.isInteger(issue.line) && issue.line > 0;

              return (
                <motion.div
                  key={i}
                  className={`issue-card ${canJump ? "clickable" : ""}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  role={canJump ? "button" : undefined}
                  tabIndex={canJump ? 0 : undefined}
                  onClick={canJump ? () => onIssueClick?.(issue.line) : undefined}
                  onKeyDown={
                    canJump
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onIssueClick?.(issue.line);
                          }
                        }
                      : undefined
                  }
                >
                  <div className="issue-header">
                    <SeverityBadge severity={issue.severity} />
                    <span className="issue-title">{issue.title}</span>
                    {issue.line && (
                      <span className="issue-line">Line {issue.line}</span>
                    )}
                  </div>
                  <p className="issue-description">{issue.description}</p>
                  {issue.suggestion && (
                    <div className="issue-suggestion">
                      <FiCheckCircle className="suggestion-icon" />
                      <span>{issue.suggestion}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <motion.div
          className="results-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="section-heading">
            <FiZap />
            Suggestions
            <span className="count-badge">{suggestions.length}</span>
          </h3>
          <div className="suggestions-list">
            {suggestions.map((suggestion, i) => (
              <motion.div
                key={i}
                className="suggestion-card"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
              >
                <div className="suggestion-header">
                  <SeverityBadge severity={suggestion.priority} />
                  <span className="suggestion-category">
                    {suggestion.category}
                  </span>
                </div>
                <h4 className="suggestion-title">{suggestion.title}</h4>
                <p className="suggestion-description">
                  {suggestion.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Best Practices */}
      {best_practices && best_practices.length > 0 && (
        <motion.div
          className="results-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="section-heading">
            <FiCheckCircle />
            Best Practices
          </h3>
          <div className="practices-list">
            {best_practices.map((practice, i) => (
              <motion.div
                key={i}
                className={`practice-card ${practice.followed ? "followed" : "not-followed"}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.08 }}
              >
                <div className="practice-icon">
                  {practice.followed ? (
                    <FiCheckCircle className="practice-check" />
                  ) : (
                    <FiXCircle className="practice-x" />
                  )}
                </div>
                <div className="practice-content">
                  <h4>{practice.practice}</h4>
                  <p>{practice.details}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Security */}
      {security_concerns && security_concerns.length > 0 && (
        <motion.div
          className="results-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h3 className="section-heading">
            <FiShield />
            Security Concerns
            <span className="count-badge count-critical">
              {security_concerns.length}
            </span>
          </h3>
          <div className="security-list">
            {security_concerns.map((concern, i) => (
              <motion.div
                key={i}
                className="security-card"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
              >
                <div className="security-header">
                  <SeverityBadge severity={concern.severity} />
                  <span className="security-title">{concern.title}</span>
                </div>
                <p className="security-description">{concern.description}</p>
                {concern.recommendation && (
                  <div className="security-recommendation">
                    <FiShield className="recommendation-icon" />
                    <span>{concern.recommendation}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Test Coverage Suggestion */}
      {metrics.test_coverage_suggestion && (
        <motion.div
          className="test-coverage-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <FiCpu className="test-icon" />
          <div>
            <h4>Testing Recommendation</h4>
            <p>{metrics.test_coverage_suggestion}</p>
          </div>
        </motion.div>
      )}

      {/* Demo notice */}
    </div>
  );
}

export default ReviewResults;
