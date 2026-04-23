import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fmtMoney, getWeekStart } from '../utils/calc';

function RingProgress({ pct, reached }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - Math.min(1, pct) * circ;
  const clampedPct = Math.min(100, Math.round(pct * 100));
  const { t } = useTranslation();

  return (
    <div className="ring-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--purple-border)" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke={reached ? '#22c55e' : '#7c3aed'}
          strokeWidth="12"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset .6s ease, stroke .3s' }}
        />
      </svg>
      <div className="ring-label">
        <span className="ring-pct" style={{ color: reached ? 'var(--green)' : undefined }}>
          {clampedPct}%
        </span>
        <span className="ring-sub">{t('goal.ofGoal')}</span>
      </div>
    </div>
  );
}

function SavedEntriesNote({ count, lang }) {
  const { t } = useTranslation();
  // Build "From N saved entry/entries this week" without hardcoding English
  if (lang === 'es') {
    const suffix = count === 1 ? 'ada' : 'adas';
    return (
      <p className="calc-source-note">
        📊 {t('goal.savedNote', { count, suffix, suffix2: count === 1 ? '' : 's' })}
      </p>
    );
  }
  return (
    <p className="calc-source-note">
      📊 {t('goal.savedNote', { count, suffix: count === 1 ? 'y' : 'ies', suffix2: '' })}
    </p>
  );
}

export default function GoalTracker({ goal, onGoalChange, weeklyLog }) {
  const { t, i18n } = useTranslation();
  const thisWeek = getWeekStart();

  // Pull this week's saved entries from the Tax Report log
  const thisWeekEntries = weeklyLog.filter((e) => e.weekOf === thisWeek);
  const hasSaved = thisWeekEntries.length > 0;

  const savedGross = thisWeekEntries.reduce((s, e) => s + e.gross, 0);
  const savedHours = thisWeekEntries.reduce((s, e) => s + e.hours, 0);

  // Manual inputs (used when nothing saved yet)
  const [manualGross, setManualGross] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [goalInput, setGoalInput] = useState(goal > 0 ? goal.toString() : '');

  // Resolve current values from saved entries or manual inputs
  const currentGross = hasSaved ? savedGross : parseFloat(manualGross) || 0;
  const currentHours = hasSaved ? savedHours : parseFloat(manualHours) || 0;

  // Derive hourly rate automatically
  const hourlyRate = currentHours > 0 ? currentGross / currentHours : 0;

  const goalAmount = goal > 0 ? goal : parseFloat(goalInput) || 0;
  const remaining = Math.max(0, goalAmount - currentGross);
  const pct = goalAmount > 0 ? currentGross / goalAmount : 0;
  const hoursNeeded = hourlyRate > 0 ? remaining / hourlyRate : null;
  const reached = goalAmount > 0 && currentGross >= goalAmount;

  // Estimated completion day
  const today = new Date();
  const weekStartDate = new Date(thisWeek + 'T00:00:00');
  const daysElapsed = Math.max(1, Math.floor((today - weekStartDate) / (1000 * 60 * 60 * 24)) + 1);
  const dailyHoursRate = currentHours > 0 ? currentHours / daysElapsed : 0;
  const estimatedDay = (!reached && hoursNeeded !== null && hoursNeeded > 0 && dailyHoursRate > 0)
    ? (() => {
        const daysToGoal = hoursNeeded / dailyHoursRate;
        const estimatedDate = new Date(today.getTime() + daysToGoal * 24 * 60 * 60 * 1000);
        return estimatedDate.toLocaleDateString(i18n.language === 'es' ? 'es' : 'en', { weekday: 'long' });
      })()
    : null;

  function applyGoal(e) {
    const g = parseFloat(e.target.value) || 0;
    if (g > 0) onGoalChange(g);
  }

  return (
    <div className="goal-page">
      {/* ── Inputs ── */}
      <div className="card">
        <h2 className="card-title">{t('goal.title')}</h2>

        <div className="goal-setup">
          {/* Weekly goal — always shown */}
          <div className="field" style={{ maxWidth: 220 }}>
            <label>{t('goal.weeklyGoal')}</label>
            <div className="input-prefix-wrap">
              <span className="input-prefix">$</span>
              <input
                type="number" min="0" step="10"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onBlur={applyGoal}
                placeholder="500.00"
                className="has-prefix"
              />
            </div>
          </div>

          {/* Manual inputs — only when no saved entries for this week */}
          {!hasSaved && (
            <div className="field-row">
              <div className="field">
                <label>{t('goal.grossEarnings')}</label>
                <div className="input-prefix-wrap">
                  <span className="input-prefix">$</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={manualGross}
                    onChange={(e) => setManualGross(e.target.value)}
                    placeholder="0.00"
                    className="has-prefix"
                  />
                </div>
              </div>
              <div className="field">
                <label>{t('goal.hoursWorked')}</label>
                <div className="input-suffix-wrap">
                  <input
                    type="number" min="0" step="0.5"
                    value={manualHours}
                    onChange={(e) => setManualHours(e.target.value)}
                    placeholder="0"
                  />
                  <span className="input-suffix">hrs</span>
                </div>
              </div>
            </div>
          )}

          {/* Calculated hourly rate — shown inline once both values are set */}
          {!hasSaved && hourlyRate > 0 && (
            <div className="calculated-rate-row">
              <span className="calc-rate-label">{t('goal.calculatedRate')}</span>
              <span className="calc-rate-value">{fmtMoney(hourlyRate)}/hr</span>
            </div>
          )}

          {/* Badge when data comes from saved entries */}
          {hasSaved && (
            <SavedEntriesNote count={thisWeekEntries.length} lang={i18n.language} />
          )}

          {/* Show calculated rate from saved entries */}
          {hasSaved && hourlyRate > 0 && (
            <div className="calculated-rate-row">
              <span className="calc-rate-label">{t('goal.calculatedRate')}</span>
              <span className="calc-rate-value">{fmtMoney(hourlyRate)}/hr</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Progress ── */}
      {goalAmount > 0 && (
        <div className="card goal-progress-card">
          <div className="goal-progress-layout">
            <RingProgress pct={pct} reached={reached} />

            <div className="goal-stats">
              {reached && (
                <div className="goal-reached-banner">{t('goal.reached')}</div>
              )}

              <div className="goal-stat-row">
                <div className="goal-stat">
                  <span className="goal-stat-label">{t('goal.earned')}</span>
                  <span className="goal-stat-value purple">{fmtMoney(currentGross)}</span>
                </div>
                <div className="goal-stat">
                  <span className="goal-stat-label">{t('goal.remaining')}</span>
                  <span className="goal-stat-value">{fmtMoney(remaining)}</span>
                </div>
                <div className="goal-stat">
                  <span className="goal-stat-label">{t('goal.goal')}</span>
                  <span className="goal-stat-value">{fmtMoney(goalAmount)}</span>
                </div>
              </div>

              {!reached && hoursNeeded !== null && hoursNeeded > 0 && (
                <div className="hours-needed-banner">
                  <span className="hours-big">{hoursNeeded.toFixed(1)}</span>
                  <span className="hours-label">{t('goal.hoursNeeded')}</span>
                  <span className="hours-sub">
                    {t('goal.atRate', { rate: fmtMoney(hourlyRate) })}
                  </span>
                </div>
              )}

              {estimatedDay && (
                <p className="goal-estimate-day">
                  {t('goal.estimatedDay', { day: estimatedDay })}
                </p>
              )}

              {!reached && pct >= 0.8 && hoursNeeded !== null && (
                <div className="goal-motivational">
                  {t('goal.almostThere', { hours: hoursNeeded.toFixed(1) })}
                </div>
              )}

              {!reached && currentGross > 0 && hourlyRate === 0 && (
                <p className="hint-text">{t('goal.enterHours')}</p>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="goal-bar-pct-row">
            <span className="goal-bar-pct-label">{Math.min(100, Math.round(pct * 100))}%</span>
          </div>
          <div className="goal-bar-track">
            <div
              className={`goal-bar-fill${reached ? ' reached' : ''}`}
              style={{ width: `${Math.min(100, pct * 100)}%` }}
            />
          </div>
          <div className="goal-bar-labels">
            <span>$0</span>
            <span className="goal-label-goal">{fmtMoney(goalAmount)} {t('goal.goal').toLowerCase()}</span>
          </div>
        </div>
      )}

      {!goalAmount && (
        <div className="empty-hint">{t('goal.setGoal')}</div>
      )}
    </div>
  );
}
