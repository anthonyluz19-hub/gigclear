import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { fmtMoney, groupByMonth } from '../utils/calc';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const MONTH_NAMES = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
};

function getMonthLabel(monthStr, lang = 'en') {
  const [y, m] = monthStr.split('-');
  return `${MONTH_NAMES[lang]?.[parseInt(m) - 1] || MONTH_NAMES.en[parseInt(m) - 1]} ${y}`;
}

export default function TaxReport({ weeklyLog, onRemove }) {
  const { t, i18n } = useTranslation();
  const printRef = useRef();

  const months = groupByMonth(weeklyLog);

  const grand = weeklyLog.reduce(
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

  function handlePrint() {
    window.print();
  }

  function handlePDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const lang = i18n.language;
    const now = new Date().toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    // Header
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('⚡ GigClear', 14, 12);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(lang === 'es' ? 'Informe Fiscal' : 'Tax Report', 14, 20);
    doc.text(now, 196, 20, { align: 'right' });

    doc.setTextColor(30, 30, 30);
    let y = 36;

    // Grand totals summary box
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(14, y, 182, 36, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(124, 58, 237);
    doc.text(lang === 'es' ? 'RESUMEN TOTAL' : 'GRAND TOTAL SUMMARY', 20, y + 7);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const summaryItems = [
      [lang === 'es' ? 'Ganancias Brutas' : 'Total Gross', fmtMoney(grand.gross)],
      [lang === 'es' ? 'Gastos Totales' : 'Total Expenses', fmtMoney(grand.expenses)],
      [lang === 'es' ? 'Ingreso Neto' : 'Net Income', fmtMoney(grand.net)],
      [lang === 'es' ? 'Impuesto Autónomo (15.3%)' : 'SE Tax (15.3%)', fmtMoney(grand.seTax)],
      [lang === 'es' ? 'Apartar para Impuestos' : 'Set Aside for Taxes', fmtMoney(grand.taxSavings)],
      [lang === 'es' ? 'Total Horas' : 'Total Hours', grand.hours.toFixed(1) + ' hrs'],
      [lang === 'es' ? 'Total Millas' : 'Total Miles', grand.miles.toFixed(0) + ' mi'],
    ];

    const colW = 182 / 4;
    summaryItems.forEach((item, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 20 + col * colW;
      const iy = y + 14 + row * 14;
      doc.setFont('helvetica', 'bold');
      doc.text(item[1], x, iy);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(item[0], x, iy + 4);
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
    });

    y += 44;

    // Monthly tables
    for (const { month, items, totals } of months) {
      if (y > 240) { doc.addPage(); y = 20; }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(124, 58, 237);
      doc.text(getMonthLabel(month, lang), 14, y);
      y += 4;

      const head = [[
        lang === 'es' ? 'Semana' : 'Week',
        lang === 'es' ? 'Plataforma' : 'Platform',
        lang === 'es' ? 'Bruto' : 'Gross',
        lang === 'es' ? 'Gastos' : 'Expenses',
        lang === 'es' ? 'Neto' : 'Net',
        lang === 'es' ? 'Horas' : 'Hours',
        lang === 'es' ? '$/hr' : '$/hr',
        lang === 'es' ? 'Imp. SE' : 'SE Tax',
      ]];

      const body = items.map((e) => [
        e.weekOf,
        e.platform,
        fmtMoney(e.gross),
        fmtMoney(e.expenses),
        fmtMoney(e.net),
        e.hours.toFixed(1),
        e.hourlyRate > 0 ? fmtMoney(e.hourlyRate) : '—',
        fmtMoney(e.seTax),
      ]);

      // Totals row
      body.push([
        lang === 'es' ? 'TOTAL MES' : 'MONTH TOTAL',
        '',
        fmtMoney(totals.gross),
        fmtMoney(totals.expenses),
        fmtMoney(totals.net),
        totals.hours.toFixed(1),
        totals.hours > 0 ? fmtMoney(totals.net / totals.hours) : '—',
        fmtMoney(totals.seTax),
      ]);

      autoTable(doc, {
        startY: y,
        head,
        body,
        theme: 'striped',
        headStyles: { fillColor: [124, 58, 237], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        footStyles: { fillColor: [245, 243, 255], fontStyle: 'bold' },
        didParseCell: (data) => {
          if (data.row.index === body.length - 1) {
            data.cell.styles.fillColor = [245, 243, 255];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [124, 58, 237];
          }
        },
        margin: { left: 14, right: 14 },
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // Footer
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(t('report.irsNote'), 14, 290);
      doc.text(t('report.taxNote'), 14, 294);
      doc.text(`GigClear • ${now} • ${i}/${pages}`, 196, 294, { align: 'right' });
    }

    doc.save(`GigClear_TaxReport_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function handleClear() {
    if (window.confirm(t('report.confirmClear'))) {
      weeklyLog.forEach((e) => onRemove(e.id));
    }
  }

  if (weeklyLog.length === 0) {
    return (
      <div className="card">
        <h2 className="card-title">{t('report.title')}</h2>
        <p className="card-subtitle">{t('report.subtitle')}</p>
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <p>{t('report.empty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      {/* Actions bar */}
      <div className="card report-actions-card">
        <div className="report-header-row">
          <div>
            <h2 className="card-title">{t('report.title')}</h2>
            <p className="card-subtitle">{t('report.subtitle')}</p>
          </div>
          <div className="header-actions">
            <button className="btn-outline danger" onClick={handleClear}>{t('report.clearAll')}</button>
            <button className="btn-outline" onClick={handlePrint}>🖨 {t('report.print')}</button>
            <button className="btn-primary" onClick={handlePDF}>⬇ {t('report.download')}</button>
          </div>
        </div>
      </div>

      {/* Grand totals */}
      <div className="grand-totals-grid">
        {[
          { key: 'report.totalGross', value: fmtMoney(grand.gross) },
          { key: 'report.totalExpenses', value: fmtMoney(grand.expenses) },
          { key: 'report.netIncome', value: fmtMoney(grand.net), purple: true },
          { key: 'report.seLabel', value: fmtMoney(grand.seTax) },
          { key: 'report.setAside', value: fmtMoney(grand.taxSavings), orange: true },
          { key: 'report.totalHours', value: grand.hours.toFixed(1) + ' hrs' },
          { key: 'report.totalMiles', value: grand.miles.toFixed(0) + ' mi' },
        ].map((s) => (
          <div key={s.key} className={`mini-stat${s.purple ? ' purple' : ''}${s.orange ? ' orange' : ''}`}>
            <span className="mini-stat-value">{s.value}</span>
            <span className="mini-stat-label">{t(s.key)}</span>
          </div>
        ))}
      </div>

      {/* Monthly breakdown */}
      <div ref={printRef}>
        {months.map(({ month, items, totals }) => (
          <div key={month} className="card month-card">
            <h3 className="month-label">{getMonthLabel(month, i18n.language)}</h3>

            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('report.week')}</th>
                    <th>{t('report.platform')}</th>
                    <th>{t('report.gross')}</th>
                    <th>{t('report.expenses')}</th>
                    <th>{t('report.net')}</th>
                    <th>{t('report.hours')}</th>
                    <th>{t('report.perHour')}</th>
                    <th>{t('report.seTax')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((e) => (
                    <tr key={e.id}>
                      <td>{e.weekOf}</td>
                      <td><span className="platform-tag">{e.platform}</span></td>
                      <td>{fmtMoney(e.gross)}</td>
                      <td className="muted">{fmtMoney(e.expenses)}</td>
                      <td className="bold green">{fmtMoney(e.net)}</td>
                      <td>{e.hours.toFixed(1)}</td>
                      <td className="purple">{e.hourlyRate > 0 ? fmtMoney(e.hourlyRate) : '—'}</td>
                      <td className="muted">{fmtMoney(e.seTax)}</td>
                      <td>
                        <button
                          className="delete-row-btn"
                          onClick={() => onRemove(e.id)}
                          title={t('report.delete')}
                        >×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="month-total-row">
                    <td colSpan={2}>{t('report.monthTotal')}</td>
                    <td>{fmtMoney(totals.gross)}</td>
                    <td>{fmtMoney(totals.expenses)}</td>
                    <td className="bold">{fmtMoney(totals.net)}</td>
                    <td>{totals.hours.toFixed(1)}</td>
                    <td>{totals.hours > 0 ? fmtMoney(totals.net / totals.hours) : '—'}</td>
                    <td>{fmtMoney(totals.seTax)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="report-footnotes">
        <p>* {t('report.irsNote')}</p>
        <p>* {t('report.taxNote')}</p>
      </div>
    </div>
  );
}
