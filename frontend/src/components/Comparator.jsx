import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calcEntry, fmtMoney } from '../utils/calc';

const PLATFORMS = ['DoorDash', 'Uber Eats', 'Instacart', 'Lyft', 'Uber', 'Other'];

const PLATFORM_COLORS = {
  DoorDash: '#7c3aed',
  'Uber Eats': '#06c167',
  Instacart: '#003d2b',
  Lyft: '#ff00bf',
  Uber: '#1a1a1a',
  Other: '#7c3aed',
};

function newRow(platform = 'DoorDash') {
  return { id: Date.now().toString() + Math.random(), platform, gross: '', hours: '', miles: '', gasExpense: '' };
}

function Bar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function Comparator() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([newRow('DoorDash'), newRow('Uber Eats')]);

  function addRow() {
    setRows((r) => [...r, newRow(PLATFORMS[r.length % PLATFORMS.length])]);
  }

  function removeRow(id) {
    setRows((r) => r.filter((x) => x.id !== id));
  }

  function updateRow(id, field, value) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  }

  const calculated = rows.map((r) => {
    const c = calcEntry({
      gross: parseFloat(r.gross) || 0,
      hours: parseFloat(r.hours) || 0,
      miles: parseFloat(r.miles) || 0,
      gasExpense: parseFloat(r.gasExpense) || 0,
    });
    return { ...r, ...c, hasData: (parseFloat(r.gross) || 0) > 0 };
  });

  const maxHourly = Math.max(0, ...calculated.map((c) => c.hourlyRate));
  const maxNet = Math.max(0, ...calculated.map((c) => c.net));

  const bestHourlyId = maxHourly > 0
    ? calculated.reduce((best, c) => (c.hourlyRate > best.hourlyRate ? c : best), calculated[0]).id
    : null;

  const withHourlyData = calculated.filter((c) => c.hasData && c.hourlyRate > 0);
  const comparatorSummary = withHourlyData.length >= 2 ? (() => {
    const sorted = [...withHourlyData].sort((a, b) => b.hourlyRate - a.hourlyRate);
    const diff = sorted[0].hourlyRate - sorted[1].hourlyRate;
    return t('comp.betterPlatform', {
      best: sorted[0].platform,
      diff: fmtMoney(diff),
      other: sorted[1].platform,
    });
  })() : null;

  return (
    <div className="comparator-page">
      <div className="card">
        <div className="card-header-row">
          <div>
            <h2 className="card-title">{t('comp.title')}</h2>
            <p className="card-subtitle">{t('comp.subtitle')}</p>
          </div>
          <div className="header-actions">
            <button className="btn-outline" onClick={() => setRows([newRow('DoorDash'), newRow('Uber Eats')])}>
              {t('comp.clear')}
            </button>
            <button className="btn-primary" onClick={addRow}>+ {t('comp.addPlatform')}</button>
          </div>
        </div>

        {/* Input rows */}
        <div className="comp-inputs">
          {rows.map((row) => (
            <div key={row.id} className="comp-input-row">
              <div className="comp-platform-select">
                <span
                  className="platform-dot large"
                  style={{ background: PLATFORM_COLORS[row.platform] }}
                />
                <select
                  value={row.platform}
                  onChange={(e) => updateRow(row.id, 'platform', e.target.value)}
                >
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="comp-field">
                <label>{t('comp.grossLabel')}</label>
                <input
                  type="number" step="0.01" min="0"
                  value={row.gross}
                  onChange={(e) => updateRow(row.id, 'gross', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="comp-field">
                <label>{t('comp.hoursLabel')}</label>
                <input
                  type="number" step="0.5" min="0"
                  value={row.hours}
                  onChange={(e) => updateRow(row.id, 'hours', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="comp-field">
                <label>{t('comp.milesLabel')}</label>
                <input
                  type="number" step="1" min="0"
                  value={row.miles}
                  onChange={(e) => updateRow(row.id, 'miles', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="comp-field">
                <label>{t('comp.gasLabel')}</label>
                <input
                  type="number" step="0.01" min="0"
                  value={row.gasExpense}
                  onChange={(e) => updateRow(row.id, 'gasExpense', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {rows.length > 2 && (
                <button className="comp-remove" onClick={() => removeRow(row.id)} title={t('comp.remove')}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Results comparison */}
      {calculated.some((c) => c.hasData) && (
        <>
          {comparatorSummary && (
            <p className="comp-better-sentence">{comparatorSummary}</p>
          )}
        <div className="comp-results-grid">
          {calculated.map((c) => {
            const isBest = c.id === bestHourlyId && c.hourlyRate > 0;
            const color = PLATFORM_COLORS[c.platform];
            return (
              <div
                key={c.id}
                className={`comp-result-card${isBest ? ' best-card' : ''}`}
                style={{ '--platform-color': color }}
              >
                <div className="comp-card-header" style={{ background: color }}>
                  <span className="comp-platform-name">{c.platform}</span>
                  {isBest && <span className="best-badge">{t('comp.best')} ⭐</span>}
                </div>

                <div className="comp-stat">
                  <span className="comp-stat-label">{t('comp.netIncome')}</span>
                  <span className="comp-stat-value">{c.hasData ? fmtMoney(c.net) : '—'}</span>
                  {c.hasData && maxNet > 0 && (
                    <Bar value={c.net} max={maxNet} color={color} />
                  )}
                </div>

                <div className="comp-stat">
                  <span className="comp-stat-label">{t('comp.perHour')}</span>
                  <span className={`comp-stat-value${isBest ? ' orange' : ''}`}>
                    {c.hasData && c.hourlyRate > 0 ? fmtMoney(c.hourlyRate) + '/hr' : '—'}
                  </span>
                  {c.hasData && maxHourly > 0 && (
                    <Bar value={c.hourlyRate} max={maxHourly} color={isBest ? '#f97316' : color} />
                  )}
                </div>

                <div className="comp-stat">
                  <span className="comp-stat-label">{t('comp.perMile')}</span>
                  <span className="comp-stat-value">
                    {c.hasData && c.costPerMile > 0 ? fmtMoney(c.costPerMile) + '/mi' : '—'}
                  </span>
                </div>

                <div className="comp-stat">
                  <span className="comp-stat-label">SE Tax</span>
                  <span className="comp-stat-value muted">
                    {c.hasData ? fmtMoney(c.seTax) : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}

      {!calculated.some((c) => c.hasData) && (
        <div className="empty-hint">{t('comp.empty')}</div>
      )}
    </div>
  );
}
