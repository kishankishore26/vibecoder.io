import { FiArrowRight, FiShield, FiZap, FiCpu } from 'react-icons/fi';
import './Hero.css';

function Hero({ onGetStarted }) {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-badge">
          <FiCpu className="badge-icon" />
          <span>Powered by Google Gemini AI</span>
        </div>

        <h1 className="hero-title">
          AI-Powered
          <br />
          <span className="hero-gradient">Code Reviews</span>
          <br />
          in Seconds
        </h1>

        <p className="hero-description">
          Analyze your code for bugs, security vulnerabilities, performance issues,
          and best practice violations — all powered by advanced AI that thinks like
          a senior engineer.
        </p>

        <div className="hero-actions">
          <button className="hero-cta" onClick={onGetStarted} id="hero-cta-button">
            <span>Start Reviewing</span>
            <FiArrowRight />
          </button>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-value">10+</span>
              <span className="stat-label">Languages</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-value">&lt;5s</span>
              <span className="stat-label">Analysis</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-value">AI</span>
              <span className="stat-label">Powered</span>
            </div>
          </div>
        </div>

        <div className="hero-features" id="features">
          <div className="feature-card">
            <div className="feature-icon feature-icon-bugs">
              <FiShield />
            </div>
            <h3>Bug Detection</h3>
            <p>Find potential bugs, null references, and logic errors before they reach production.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon feature-icon-perf">
              <FiZap />
            </div>
            <h3>Performance Tips</h3>
            <p>Get actionable suggestions to optimize your code for speed and efficiency.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon feature-icon-security">
              <FiCpu />
            </div>
            <h3>Best Practices</h3>
            <p>Ensure your code follows industry standards and modern development patterns.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
