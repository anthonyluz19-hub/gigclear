import { useTranslation } from 'react-i18next';

const FEATURES = [
  { icon: '💰', tk: 'landing.feature1' },
  { icon: '🧾', tk: 'landing.feature2' },
  { icon: '⚖️',  tk: 'landing.feature3' },
];

const STATS = ['landing.stat1', 'landing.stat2', 'landing.stat3'];

export default function Landing({ onStart, theme, onToggleTheme, onToggleLang, lang }) {
  const { t } = useTranslation();

  return (
    <div className="landing">
      <div className="landing-topbar">
        <button
          className="theme-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button className="lang-btn" onClick={onToggleLang} aria-label="Toggle language">
          <span className="lang-active">{lang.toUpperCase()}</span>
          <span className="lang-sep">›</span>
          <span className="lang-next">{lang === 'en' ? 'ES' : 'EN'}</span>
        </button>
      </div>

      <section className="landing-hero">
        <div className="landing-logo" aria-hidden="true">⚡</div>
        <div className="landing-brand">GigClear</div>
        <h1 className="landing-headline">{t('landing.headline')}</h1>
        <p className="landing-subtitle">{t('landing.subtitle')}</p>
        <button className="landing-cta" onClick={onStart}>
          <span>{t('landing.cta')}</span>
          <span className="landing-cta-arrow" aria-hidden="true">→</span>
        </button>
      </section>

      <section className="landing-features">
        {FEATURES.map(({ icon, tk }) => (
          <div key={tk} className="landing-feature-card">
            <div className="landing-feature-icon" aria-hidden="true">{icon}</div>
            <h3 className="landing-feature-title">{t(`${tk}.title`)}</h3>
            <p className="landing-feature-desc">{t(`${tk}.desc`)}</p>
          </div>
        ))}
      </section>

      <section className="landing-stats">
        {STATS.map((key) => (
          <div key={key} className="landing-stat">
            <span className="landing-stat-check" aria-hidden="true">✓</span>
            <span>{t(key)}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
