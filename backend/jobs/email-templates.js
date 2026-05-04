const STRINGS = {
  en: {
    subject: 'Your GigClear weekly summary',
    hello: 'Here is what you made last week',
    weekRange: 'Week of {date}',
    gross: 'Gross earnings',
    expenses: 'Expenses',
    net: 'Net (after expenses)',
    setAside: 'Set aside for taxes',
    miles: 'Miles driven',
    hours: 'Hours worked',
    realHourly: 'Real hourly rate',
    bestPlatform: 'Best platform: {platform} ({amount})',
    noEntries: 'No entries logged last week — open the app to keep your record up to date.',
    cta: 'Open GigClear',
    footer: 'You are receiving this because you opted in for weekly summaries.',
    unsubscribe: 'Unsubscribe',
    disclaimer: 'Estimates only. Not tax advice.',
  },
  es: {
    subject: 'Tu resumen semanal de GigClear',
    hello: 'Esto es lo que ganaste la semana pasada',
    weekRange: 'Semana del {date}',
    gross: 'Ganancias brutas',
    expenses: 'Gastos',
    net: 'Neto (después de gastos)',
    setAside: 'Apartar para impuestos',
    miles: 'Millas recorridas',
    hours: 'Horas trabajadas',
    realHourly: 'Tarifa por hora real',
    bestPlatform: 'Mejor plataforma: {platform} ({amount})',
    noEntries: 'No registraste entradas la semana pasada — abrí la app para mantener tu registro al día.',
    cta: 'Abrir GigClear',
    footer: 'Recibís este email porque te suscribiste al resumen semanal.',
    unsubscribe: 'Darse de baja',
    disclaimer: 'Solo estimaciones. No es asesoría fiscal.',
  },
};

const SE_TAX_RATE = 0.153;
const COMBINED_TAX_RATE = 0.20;

function fmtMoney(n, locale) {
  const fmt = new Intl.NumberFormat(locale === 'es' ? 'es-AR' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  return fmt.format(n || 0);
}

function tpl(s, vars) {
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

function summarize(entries) {
  const totals = {
    gross: 0, expenses: 0, miles: 0, hours: 0,
  };
  const byPlatform = {};
  for (const e of entries) {
    const exp = (e.gas_expense || 0) + (e.other_expense || 0);
    totals.gross += e.gross_earnings || 0;
    totals.expenses += exp;
    totals.miles += e.miles_driven || 0;
    totals.hours += e.hours || 0;
    if (!byPlatform[e.platform]) byPlatform[e.platform] = 0;
    byPlatform[e.platform] += (e.gross_earnings || 0) - exp;
  }
  totals.net = totals.gross - totals.expenses;
  totals.setAside = Math.max(0, totals.net * COMBINED_TAX_RATE);
  totals.realHourly = totals.hours > 0 ? (totals.net - totals.setAside) / totals.hours : 0;

  let bestPlatform = null;
  let bestNet = -Infinity;
  for (const [p, net] of Object.entries(byPlatform)) {
    if (net > bestNet) { bestNet = net; bestPlatform = p; }
  }
  return { totals, bestPlatform, bestNet };
}

function row(label, value) {
  return `<tr><td style="padding:10px 0;color:#555;font-size:14px">${label}</td><td style="padding:10px 0;text-align:right;font-weight:600;color:#111;font-size:15px">${value}</td></tr>`;
}

function buildEmail({ entries, locale, weekLabel, appUrl, unsubscribeUrl }) {
  const s = STRINGS[locale] || STRINGS.en;
  const summary = summarize(entries);
  const { totals, bestPlatform, bestNet } = summary;
  const hasEntries = entries.length > 0;

  const rows = hasEntries
    ? [
        row(s.gross, fmtMoney(totals.gross, locale)),
        row(s.expenses, fmtMoney(totals.expenses, locale)),
        row(`<strong>${s.net}</strong>`, `<strong style="color:#0a7c3f">${fmtMoney(totals.net, locale)}</strong>`),
        row(s.setAside, fmtMoney(totals.setAside, locale)),
        totals.miles > 0 ? row(s.miles, `${totals.miles.toFixed(0)} mi`) : '',
        totals.hours > 0 ? row(s.hours, `${totals.hours.toFixed(1)} hrs`) : '',
        totals.hours > 0 ? row(s.realHourly, `${fmtMoney(totals.realHourly, locale)}/hr`) : '',
      ].filter(Boolean).join('')
    : '';

  const bestLine = hasEntries && bestPlatform
    ? `<p style="margin:24px 0 0;color:#333;font-size:14px">${tpl(s.bestPlatform, { platform: bestPlatform, amount: fmtMoney(bestNet, locale) })}</p>`
    : '';

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:32px 16px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:520px;width:100%">
        <tr><td style="padding:28px 28px 0">
          <div style="font-size:20px;font-weight:700;color:#111">⚡ GigClear</div>
          <h1 style="margin:20px 0 4px;font-size:22px;color:#111">${s.hello}</h1>
          <p style="margin:0;color:#777;font-size:14px">${tpl(s.weekRange, { date: weekLabel })}</p>
        </td></tr>
        <tr><td style="padding:8px 28px 4px">
          ${hasEntries
            ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #eee">${rows}</table>${bestLine}`
            : `<p style="margin:24px 0;color:#555;font-size:15px">${s.noEntries}</p>`}
        </td></tr>
        <tr><td style="padding:24px 28px 28px" align="center">
          <a href="${appUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px">${s.cta}</a>
        </td></tr>
        <tr><td style="padding:0 28px 24px">
          <p style="margin:0;color:#999;font-size:12px;line-height:1.5">${s.disclaimer}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;color:#999;font-size:12px;text-align:center;max-width:520px">
        ${s.footer}<br>
        <a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline">${s.unsubscribe}</a>
      </p>
    </td></tr>
  </table>
</body></html>`;

  return { subject: s.subject, html };
}

module.exports = { buildEmail, summarize };
