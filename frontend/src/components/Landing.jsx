import { useTranslation } from 'react-i18next';

const FEATURES = [
  { icon: '💰', tk: 'landing.feature1' },
  { icon: '🧾', tk: 'landing.feature2' },
  { icon: '⚖️',  tk: 'landing.feature3' },
];

const STATS = ['landing.stat1', 'landing.stat2', 'landing.stat3'];

const HOW_STEPS = [
  { n: '1', tk: 'landing.how.step1' },
  { n: '2', tk: 'landing.how.step2' },
  { n: '3', tk: 'landing.how.step3' },
];

const FAQ = [
  { q: 'landing.faq.q1', a: 'landing.faq.a1' },
  { q: 'landing.faq.q2', a: 'landing.faq.a2' },
  { q: 'landing.faq.q3', a: 'landing.faq.a3' },
  { q: 'landing.faq.q4', a: 'landing.faq.a4' },
  { q: 'landing.faq.q5', a: 'landing.faq.a5' },
  { q: 'landing.faq.q6', a: 'landing.faq.a6' },
];

const PRIVACY_POINTS = [
  'landing.privacy.point1',
  'landing.privacy.point2',
  'landing.privacy.point3',
];

const TIP_COUNT = 10;

function getWeeklyTipKey() {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const week = Math.floor((now - yearStart) / (7 * 24 * 60 * 60 * 1000));
  return `landing.tip${(week % TIP_COUNT) + 1}`;
}

export default function Landing({ onStart, theme, onToggleTheme, onToggleLang, lang }) {
  const { t } = useTranslation();
  const tipKey = getWeeklyTipKey();

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
        <div className="landing-privacy-badge" aria-hidden="false">
          <span aria-hidden="true">🔒</span>
          <span>{t('landing.privacyBadge')}</span>
        </div>
      </section>

      <section className="landing-stats">
        {STATS.map((key) => (
          <div key={key} className="landing-stat">
            <span className="landing-stat-check" aria-hidden="true">✓</span>
            <span>{t(key)}</span>
          </div>
        ))}
      </section>

      <section className="landing-features" aria-label="Features">
        {FEATURES.map(({ icon, tk }) => (
          <div key={tk} className="landing-feature-card">
            <div className="landing-feature-icon" aria-hidden="true">{icon}</div>
            <h3 className="landing-feature-title">{t(`${tk}.title`)}</h3>
            <p className="landing-feature-desc">{t(`${tk}.desc`)}</p>
          </div>
        ))}
      </section>

      <section className="landing-demo" aria-label={t('landing.demo.label')}>
        <div className="landing-demo-label">{t('landing.demo.label')}</div>
        <h2 className="landing-demo-title">{t('landing.demo.title')}</h2>
        <div className="landing-demo-card">
          <div className="landing-demo-inputs">
            <div className="landing-demo-row">
              <span>{t('landing.demo.gross')}</span><strong>$850</strong>
            </div>
            <div className="landing-demo-row">
              <span>{t('landing.demo.hours')}</span><strong>28</strong>
            </div>
            <div className="landing-demo-row">
              <span>{t('landing.demo.miles')}</span><strong>380</strong>
            </div>
            <div className="landing-demo-row">
              <span>{t('landing.demo.gas')}</span><strong>$52</strong>
            </div>
          </div>
          <div className="landing-demo-arrow" aria-hidden="true">↓</div>
          <div className="landing-demo-output">
            <div className="landing-demo-kept">
              <div className="landing-demo-kept-label">{t('landing.demo.kept')}</div>
              <div className="landing-demo-kept-value">$638</div>
            </div>
            <div className="landing-demo-grid">
              <div>
                <div className="landing-demo-mini-label">{t('landing.demo.realHourly')}</div>
                <div className="landing-demo-mini-value">$22.79/hr</div>
              </div>
              <div>
                <div className="landing-demo-mini-label">{t('landing.demo.grossHourly')}</div>
                <div className="landing-demo-mini-value muted">$30.36/hr</div>
              </div>
              <div>
                <div className="landing-demo-mini-label">{t('landing.demo.taxAside')}</div>
                <div className="landing-demo-mini-value">$160</div>
              </div>
            </div>
          </div>
        </div>
        <p className="landing-demo-note">{t('landing.demo.note')}</p>
      </section>

      <section className="landing-how" aria-label={t('landing.how.title')}>
        <h2 className="landing-section-title">{t('landing.how.title')}</h2>
        <div className="landing-how-steps">
          {HOW_STEPS.map(({ n, tk }) => (
            <div key={n} className="landing-how-step">
              <div className="landing-how-num">{n}</div>
              <h3 className="landing-how-step-title">{t(`${tk}.title`)}</h3>
              <p className="landing-how-step-desc">{t(`${tk}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-tip" aria-label={t('landing.tipLabel')}>
        <div className="landing-tip-icon" aria-hidden="true">💡</div>
        <div className="landing-tip-body">
          <div className="landing-tip-label">{t('landing.tipLabel')}</div>
          <p className="landing-tip-text">{t(tipKey)}</p>
        </div>
      </section>

      <section className="landing-privacy" aria-labelledby="landing-privacy-title">
        <div className="landing-privacy-icon" aria-hidden="true">🔒</div>
        <h2 id="landing-privacy-title" className="landing-section-title">
          {t('landing.privacy.title')}
        </h2>
        <p className="landing-privacy-desc">{t('landing.privacy.desc')}</p>
        <ul className="landing-privacy-list">
          {PRIVACY_POINTS.map((key) => (
            <li key={key}>
              <span className="landing-stat-check" aria-hidden="true">✓</span>
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-faq" aria-labelledby="landing-faq-title">
        <h2 id="landing-faq-title" className="landing-section-title">
          {t('landing.faq.title')}
        </h2>
        <div className="landing-faq-list">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="landing-faq-item">
              <summary className="landing-faq-q">{t(q)}</summary>
              <p className="landing-faq-a">{t(a)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-final-cta">
        <h2 className="landing-final-cta-title">{t('landing.finalCta.title')}</h2>
        <p className="landing-final-cta-desc">{t('landing.finalCta.desc')}</p>
        <button className="landing-cta" onClick={onStart}>
          <span>{t('landing.finalCta.button')}</span>
          <span className="landing-cta-arrow" aria-hidden="true">→</span>
        </button>
      </section>

      <footer className="landing-footer">
        <p className="landing-footer-tagline">{t('landing.footer.tagline')}</p>
        <p className="landing-footer-disclaimer">{t('landing.footer.disclaimer')}</p>
        <p className="landing-footer-copyright">{t('landing.footer.copyright')}</p>
      </footer>
    </div>
  );
}
