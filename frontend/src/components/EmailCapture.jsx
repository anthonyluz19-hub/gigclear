import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { subscribe } from '../utils/api';

export default function EmailCapture({ entries, onClose, onSubscribed }) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr(t('email.invalid'));
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await subscribe({ email, locale: i18n.language, entries });
      onSubscribed(email);
    } catch (e) {
      const apiMsg = e?.response?.data?.error || e?.message;
      console.error('subscribe failed:', apiMsg, e);
      setErr(apiMsg ? `${t('email.error')} (${apiMsg})` : t('email.error'));
      setBusy(false);
    }
  }

  return (
    <div className="email-modal-backdrop" role="dialog" aria-modal="true">
      <div className="email-modal">
        <button className="email-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="email-icon" aria-hidden="true">📬</div>
        <h2 className="email-title">{t('email.title')}</h2>
        <p className="email-desc">{t('email.desc')}</p>

        <form onSubmit={handleSubmit} className="email-form">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('email.placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            required
            autoFocus
          />
          <button type="submit" className="email-submit" disabled={busy}>
            {busy ? t('email.sending') : t('email.subscribe')}
          </button>
        </form>

        {err && <p className="email-error">{err}</p>}

        <p className="email-privacy">{t('email.privacy')}</p>

        <button type="button" className="email-skip" onClick={onClose}>
          {t('email.skip')}
        </button>
      </div>
    </div>
  );
}
