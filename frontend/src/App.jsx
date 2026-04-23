import './i18n';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Calculator from './components/Calculator';
import Comparator from './components/Comparator';
import GoalTracker from './components/GoalTracker';
import TaxReport from './components/TaxReport';
import i18n from './i18n';
import './App.css';

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

const TABS = ['calculator', 'comparator', 'goals', 'report'];

const TAB_ICONS = {
  calculator: '🧮',
  comparator: '⚖️',
  goals: '🎯',
  report: '📄',
};

export default function App() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('calculator');
  const [, forceRender] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSHint, setShowIOSHint] = useState(false);

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

  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('gigclear_theme');
    const isDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDark);
    return isDark;
  });

  const [weeklyLog, setWeeklyLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gc_log') || '[]'); } catch { return []; }
  });

  const [weeklyGoal, setWeeklyGoal] = useState(() => {
    return parseFloat(localStorage.getItem('gc_goal') || '0');
  });

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
    localStorage.setItem('gc_goal', g.toString());
  }

  function toggleLang() {
    const next = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('gigclear_lang', next);
    forceRender((n) => n + 1);
  }

  function toggleDark() {
    const next = !dark;
    setDark(next);
    localStorage.setItem('gigclear_theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-bolt">⚡</span>
            <div className="logo-text-wrap">
              <span className="logo-name">GigClear</span>
              <span className="logo-tag">{t('tagline')}</span>
            </div>
          </div>
          <div className="header-controls">
            {showInstallBtn && (
              <button className="install-btn" onClick={handleInstall} aria-label="Install app">
                <span>📲</span>
                <span className="install-btn-label">Install</span>
              </button>
            )}
            <button className="theme-btn" onClick={toggleDark} aria-label="Toggle dark mode">
              {dark ? '☀️' : '🌙'}
            </button>
            <button className="lang-btn" onClick={toggleLang} aria-label="Toggle language">
              <span className="lang-active">{i18n.language.toUpperCase()}</span>
              <span className="lang-sep">›</span>
              <span className="lang-next">{i18n.language === 'en' ? 'ES' : 'EN'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="tab-bar">
        <div className="tab-bar-inner">
          {TABS.map((key) => (
            <button
              key={key}
              className={`tab-btn${tab === key ? ' active' : ''}`}
              onClick={() => setTab(key)}
            >
              <span className="tab-icon">{TAB_ICONS[key]}</span>
              <span className="tab-label">{t(`tab.${key}`)}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="app-main">
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
