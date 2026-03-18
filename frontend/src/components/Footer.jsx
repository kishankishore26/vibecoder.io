import { FiCode, FiHeart } from 'react-icons/fi';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <FiCode className="footer-logo" />
          <span>
            vibe<span className="footer-accent">coder</span>
          </span>
        </div>
        <p className="footer-text">
          Made with <FiHeart className="heart-icon" /> using React & FastAPI
        </p>
        <p className="footer-copyright">
          © {new Date().getFullYear()} VibeCoder. AI-powered code analysis.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
