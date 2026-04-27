import './i18n';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Calculator from './components/Calculator';
import Comparator from './components/Comparator';
import GoalTracker from './components/GoalTracker';
import TaxReport from './components/TaxReport';
import Landing from './components/Landing';
import i18n from './i18n';
import './App.css';

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

const TABS = ['calculator', 'comparator', 'goals', 'report'];

const TAB_ICONS = {
  calculator: '🧮',
  comparator: '⚖️',
  goals:      '🎯',
  report:     '📄',
};

export default function App() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('calculator');
  const [, forceRender] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('gc_theme') || 'dark');
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gc_theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    const onInstalled = () => setDeferredPrompt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (isIOS) { setShowIOSHint(true); return; }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  const showInstallBtn = !isStandalone && (deferredPrompt || isIOS);

  const [weeklyLog, setWeeklyLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gc_log') || '[]'); } catch { return []; }
  });

  const [weeklyGoal, setWeeklyGoal] = useState(0);

  function saveEntry(entry) {
    const next = [...weeklyLog, entry];
    setWeeklyLog(next);
    localStorage.setItem('gc_log', JSON.stringify(next));
  }

  function removeEntry(id) {
    const next = weeklyLog.filter((e) => e.id !== id);
    setWeeklyLog(next);
    localStorage.setItem('gc_log', JSON.stringify(next));
  }

  function saveGoal(g) {
    setWeeklyGoal(g);
  }

  function toggleLang() {
    const next = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('gigclear_lang', next);
    forceRender((n) => n + 1);
  }

  function startApp() {
    setTab('calculator');
    setShowLanding(false);
  }

  if (showLanding) {
    return (
      <Landing
        onStart={startApp}
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleLang={toggleLang}
        lang={i18n.language}
      />
    );
  }

  return (
    <div className="shell">
      {/* Sidebar / bottom tab bar on mobile */}
      <aside className="sidebar">
        <nav className="sidebar-nav">
          {TABS.map((key) => (
            <button
              key={key}
              className={`nav-item${tab === key ? ' active' : ''}`}
              onClick={() => setTab(key)}
            >
              <span className="nav-icon">{TAB_ICONS[key]}</span>
              <span className="nav-label">{t(`tab.${key}`)}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="main-wrap">
        <header className="topbar">
          <div className="topbar-brand">
            <span className="topbar-logo" aria-hidden="true">⚡</span>
            <div className="topbar-brand-text">
              <span className="topbar-name">GigClear</span>
              <span className="topbar-tag">{t('tagline')}</span>
            </div>
          </div>
          <div className="topbar-actions">
            {showInstallBtn && (
              <button className="install-btn" onClick={handleInstall} aria-label="Install app">
                <span>📲</span>
                <span className="install-btn-label">Install</span>
              </button>
            )}
            <button
              className="theme-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="lang-btn" onClick={toggleLang} aria-label="Toggle language">
              <span className="lang-active">{i18n.language.toUpperCase()}</span>
              <span className="lang-sep">›</span>
              <span className="lang-next">{i18n.language === 'en' ? 'ES' : 'EN'}</span>
            </button>
          </div>
        </header>

        <main className="page-content">
          {tab === 'calculator' && (
            <Calculator onSave={saveEntry} weeklyLog={weeklyLog} />
          )}
          {tab === 'comparator' && <Comparator />}
          {tab === 'goals' && (
            <GoalTracker goal={weeklyGoal} onGoalChange={saveGoal} weeklyLog={weeklyLog} />
          )}
          {tab === 'report' && (
            <TaxReport weeklyLog={weeklyLog} onRemove={removeEntry} />
          )}
        </main>
      </div>

      {/* iOS install hint */}
      {showIOSHint && (
        <div className="ios-hint-banner" role="status">
          <span className="ios-hint-arrow">▼</span>
          <span className="ios-hint-text">
            Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
          </span>
          <button className="ios-hint-close" onClick={() => setShowIOSHint(false)} aria-label="Dismiss">✕</button>
        </div>
      )}
    </div>
  );
}
