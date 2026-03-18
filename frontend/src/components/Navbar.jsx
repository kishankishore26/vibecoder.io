import { useState, useEffect } from 'react';
import { FiCode, FiGithub, FiMenu, FiX } from 'react-icons/fi';
import './Navbar.css';

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-inner">
        <a href="/" className="navbar-brand">
          <div className="brand-icon">
            <FiCode />
          </div>
          <span className="brand-text">
            vibe<span className="brand-accent">coder</span>
          </span>
        </a>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <a href="#editor-section" className="nav-link" onClick={() => setMenuOpen(false)}>
            Analyze
          </a>
          <a href="#features" className="nav-link" onClick={() => setMenuOpen(false)}>
            Features
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link nav-github"
          >
            <FiGithub />
            GitHub
          </a>
        </div>

        <button
          className="navbar-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
