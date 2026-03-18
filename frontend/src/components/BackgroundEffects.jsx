import './BackgroundEffects.css';

function BackgroundEffects() {
  return (
    <div className="bg-effects" aria-hidden="true">
      <div className="bg-gradient-orb bg-orb-1"></div>
      <div className="bg-gradient-orb bg-orb-2"></div>
      <div className="bg-gradient-orb bg-orb-3"></div>
      <div className="bg-grid"></div>
      <div className="bg-noise"></div>
    </div>
  );
}

export default BackgroundEffects;
