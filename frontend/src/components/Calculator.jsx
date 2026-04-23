import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calcEntry, fmtMoney, getWeekStart, generateWeekOptions, formatWeekRange } from '../utils/calc';

const PLATFORMS = ['DoorDash', 'Uber Eats', 'Instacart', 'Lyft', 'Uber', 'Other'];

const PLATFORM_COLORS = {
  DoorDash: '#ff3008',
  'Uber Eats': '#06c167',
  Instacart: '#003d2b',
  Lyft: '#ff00bf',
  Uber: '#000000',
  Other: '#7c3aed',
};

const EMPTY = {
  platform: 'DoorDash',
  weekOf: getWeekStart(),
  gross: '',
  hours: '',
  miles: '',
  gasExpense: '',
  otherExpense: '',
};

function Tooltip({ text }) {
  return (
    <span className="tooltip-wrap">
      <span className="tooltip-icon">?</span>
      <span className="tooltip-text">{text}</span>
    </span>
  );
}

function ResultRow({ label, value, sub, accent, large, orange }) {
  return (
    <div className={`result-row${large ? ' large' : ''}${accent ? ' accent' : ''}${orange ? ' orange-accent' : ''}`}>
      <div className="result-label">
        {label}
        {sub && <span className="result-sub">{sub}</span>}
      </div>
      <div className="result-value">{value}</div>
    </div>
  );
}

const WEEK_OPTIONS = generateWeekOptions(8);

export default function Calculator({ onSave, weeklyLog }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [form, setForm] = useState(EMPTY);
  const [savedId, setSavedId] = useState(null);

  function set(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setSavedId(null);
    };
  }

  const gross = parseFloat(form.gross) || 0;
  const hasData = gross > 0;
  const calc = calcEntry({
    gross,
    hours: parseFloat(form.hours) || 0,
    miles: parseFloat(form.miles) || 0,
    gasExpense: parseFloat(form.gasExpense) || 0,
    otherExpense: parseFloat(form.otherExpense) || 0,
  });

  function handleSave() {
    const id = Date.now().toString();
    const entry = {
      id,
      weekOf: form.weekOf,
      platform: form.platform,
      gross,
      hours: parseFloat(form.hours) || 0,
      miles: parseFloat(form.miles) || 0,
      gasExpense: parseFloat(form.gasExpense) || 0,
      otherExpense: parseFloat(form.otherExpense) || 0,
      expenses: calc.expenses,
      net: calc.net,
      seTax: calc.seTax,
      taxSavings: calc.taxSavings,
      hourlyRate: calc.hourlyRate,
      costPerMile: calc.costPerMile,
      irsDeduction: calc.irsDeduction,
    };
    onSave(entry);
    setSavedId(id);
  }

  const alreadySaved = weeklyLog.some(
    (e) => e.weekOf === form.weekOf && e.platform === form.platform
  );

  return (
    <div className="calc-layout">
      {/* ── Input Panel ── */}
      <div className="card input-card">
        <h2 className="card-title">{t('calc.title')}</h2>

        <div className="field">
          <label>{t('calc.weekOf')}</label>
          <select value={form.weekOf} onChange={set('weekOf')} className="week-select">
            {WEEK_OPTIONS.map(({ value, index }) => {
              const range = formatWeekRange(value, lang);
              const suffix =
                index === 0 ? ` — ${t('calc.currentWeek')}` :
                index === 1 ? ` — ${t('calc.lastWeek')}` : '';
              return (
                <option key={value} value={value}>{range}{suffix}</option>
              );
            })}
          </select>
        </div>

        <div className="field">
          <label>{t('calc.platform')}</label>
          <div className="platform-select-wrap">
            <span
              className="platform-dot"
              style={{ background: PLATFORM_COLORS[form.platform] }}
            />
            <select value={form.platform} onChange={set('platform')}>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>{t('calc.gross')}</label>
          <div className="input-prefix-wrap">
            <span className="input-prefix">$</span>
            <input
              type="number" step="0.01" min="0"
              value={form.gross}
              onChange={set('gross')}
              placeholder="0.00"
              className="has-prefix"
              autoFocus
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>{t('calc.hours')}</label>
            <div className="input-suffix-wrap">
              <input
                type="number" step="0.5" min="0"
                value={form.hours}
                onChange={set('hours')}
                placeholder="0"
              />
              <span className="input-suffix">hrs</span>
            </div>
          </div>
          <div className="field">
            <label>{t('calc.miles')}</label>
            <div className="input-suffix-wrap">
              <input
                type="number" step="1" min="0"
                value={form.miles}
                onChange={set('miles')}
                placeholder="0"
              />
              <span className="input-suffix">mi</span>
            </div>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>{t('calc.gas')}</label>
            <div className="input-prefix-wrap">
              <span className="input-prefix">$</span>
              <input
                type="number" step="0.01" min="0"
                value={form.gasExpense}
                onChange={set('gasExpense')}
                placeholder="0.00"
                className="has-prefix"
              />
            </div>
          </div>
          <div className="field">
            <label>{t('calc.other')}</label>
            <div className="input-prefix-wrap">
              <span className="input-prefix">$</span>
              <input
                type="number" step="0.01" min="0"
                value={form.otherExpense}
                onChange={set('otherExpense')}
                placeholder="0.00"
                className="has-prefix"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Results Panel ── */}
      <div className="card results-card">
        <h2 className="card-title">{t('calc.results')}</h2>

        {!hasData ? (
          <div className="results-empty">
            <span className="results-empty-icon">🧮</span>
            <p>{t('calc.enterGross')}</p>
          </div>
        ) : (
          <>
            <ResultRow
              label={t('calc.netIncome')}
              value={fmtMoney(calc.net)}
              large
              accent={calc.net >= 0}
            />

            <div className="results-divider" />

            {(parseFloat(form.hours) || 0) > 0 && (
              <>
                <ResultRow
                  label={t('calc.hourlyRate')}
                  value={fmtMoney(calc.hourlyRate) + '/hr'}
                  large
                  orange
                />
                <ResultRow
                  label={t('calc.grossHourly')}
                  value={fmtMoney(calc.grossHourly) + '/hr'}
                />
                <div className="results-divider" />
              </>
            )}

            <ResultRow
              label={t('calc.seTax')}
              value={fmtMoney(calc.seTax)}
              sub={t('calc.seNote')}
            />
            <ResultRow
              label={t('calc.taxSavings')}
              value={fmtMoney(calc.taxSavings)}
              sub={t('calc.savingsNote')}
              orange
            />
            <p className="tax-disclaimer">{t('calc.taxDisclaimer')}</p>

            {(parseFloat(form.miles) || 0) > 0 && (
              <>
                <div className="results-divider" />
                <ResultRow
                  label={t('calc.costPerMile')}
                  value={fmtMoney(calc.costPerMile) + '/mi'}
                />
                <ResultRow
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {t('calc.irsDeduction')}
                      <Tooltip text={t('calc.irsTooltip')} />
                    </span>
                  }
                  value={fmtMoney(calc.irsDeduction)}
                  sub={`${parseFloat(form.miles).toFixed(0)} mi × $0.67`}
                />
              </>
            )}

            <div className="results-divider" />

            <button
              className={`save-btn${savedId ? ' saved' : ''}`}
              onClick={handleSave}
              disabled={!!savedId}
            >
              {savedId ? `✓ ${t('calc.saved')}` : t('calc.saveWeek')}
            </button>

            <p className="calc-summary">
              {t('calc.summary', {
                gross: fmtMoney(gross),
                net: fmtMoney(calc.net - calc.taxSavings),
                tax: fmtMoney(calc.taxSavings),
              })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
