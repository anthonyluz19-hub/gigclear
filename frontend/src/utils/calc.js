export const SE_TAX_RATE = 0.153;
export const INCOME_TAX_EST = 0.047;
export const IRS_MILEAGE_RATE = 0.67;

export function calcEntry({ gross = 0, hours = 0, miles = 0, gasExpense = 0, otherExpense = 0 }) {
  const g = Number(gross) || 0;
  const h = Number(hours) || 0;
  const m = Number(miles) || 0;
  const gas = Number(gasExpense) || 0;
  const other = Number(otherExpense) || 0;

  const expenses = gas + other;
  const net = g - expenses;
  const seTax = Math.max(0, net * SE_TAX_RATE);
  const taxSavings = Math.max(0, net * (SE_TAX_RATE + INCOME_TAX_EST));
  const hourlyRate = h > 0 ? net / h : 0;
  const grossHourly = h > 0 ? g / h : 0;
  const costPerMile = m > 0 ? expenses / m : 0;
  const irsDeduction = m * IRS_MILEAGE_RATE;

  return { net, expenses, seTax, taxSavings, hourlyRate, grossHourly, costPerMile, irsDeduction };
}

export function fmtMoney(n) {
  const val = Number(n) || 0;
  return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtMiles(n) {
  return (Number(n) || 0).toFixed(1);
}

export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return toYMD(d);
}

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ES_MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export function formatWeekRange(weekStart, lang = 'en') {
  const [y, mo, d] = weekStart.split('-').map(Number);
  const mon = new Date(y, mo - 1, d);
  const sun = new Date(y, mo - 1, d + 6);
  const months = lang === 'es' ? ES_MONTHS : EN_MONTHS;
  const monName = months[mon.getMonth()];
  const sunName = months[sun.getMonth()];
  const monDay = mon.getDate();
  const sunDay = sun.getDate();
  if (lang === 'es') {
    return mon.getMonth() === sun.getMonth()
      ? `${monDay}–${sunDay} ${sunName}`
      : `${monDay} ${monName} – ${sunDay} ${sunName}`;
  }
  return mon.getMonth() === sun.getMonth()
    ? `${monName} ${monDay}–${sunDay}`
    : `${monName} ${monDay} – ${sunName} ${sunDay}`;
}

export function generateWeekOptions(count = 8) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay();
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: count }, (_, i) => {
    const monday = new Date(thisMonday);
    monday.setDate(thisMonday.getDate() - i * 7);
    return { value: toYMD(monday), index: i };
  });
}

export function groupByMonth(entries) {
  const map = {};
  for (const e of entries) {
    const month = e.weekOf.slice(0, 7);
    if (!map[month]) map[month] = [];
    map[month].push(e);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, items]) => {
      const totals = items.reduce(
        (acc, e) => ({
          gross: acc.gross + e.gross,
          expenses: acc.expenses + e.expenses,
          net: acc.net + e.net,
          hours: acc.hours + e.hours,
          miles: acc.miles + e.miles,
          seTax: acc.seTax + e.seTax,
          taxSavings: acc.taxSavings + e.taxSavings,
        }),
        { gross: 0, expenses: 0, net: 0, hours: 0, miles: 0, seTax: 0, taxSavings: 0 }
      );
      return { month, items, totals };
    });
}
