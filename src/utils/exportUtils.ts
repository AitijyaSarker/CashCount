import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Expense, PLReport, CashFlowReport, TaxPrepReport } from '../types';

export const exportTransactionsCSV = (transactions: Transaction[], filename = 'transactions.csv') => {
  const headers = ['Date', 'Type', 'Platform', 'Client/Payer', 'Gross ($)', 'Fee ($)', 'Net ($)', 'Status', 'Note', 'Ref ID'];
  const rows = transactions.map(tx => [
    tx.transaction_date,
    tx.type,
    tx.destination_platform || tx.source_platform || 'Bank',
    `"${(tx.client_name || '').replace(/"/g, '""')}"`,
    tx.gross_amount.toFixed(2),
    tx.fee_amount.toFixed(2),
    tx.net_amount.toFixed(2),
    tx.status,
    `"${(tx.notes || '').replace(/"/g, '""')}"`,
    tx.reference_id,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportTransactionsPDF = (transactions: Transaction[], title = 'Transaction Statement') => {
  const doc = new jsPDF();

  // Header Title
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(title, 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 25);
  doc.text(`Total Records: ${transactions.length}`, 14, 30);

  // Table Data
  const head = [['Date', 'Platform', 'Type', 'Payer/Client', 'Gross', 'Fee', 'Net', 'Status', 'Note']];
  const body = transactions.map(tx => [
    tx.transaction_date,
    tx.destination_platform || tx.source_platform || 'Bank',
    tx.type,
    tx.client_name || '-',
    `$${tx.gross_amount.toFixed(2)}`,
    tx.fee_amount > 0 ? `-$${tx.fee_amount.toFixed(2)}` : '$0.00',
    `$${tx.net_amount.toFixed(2)}`,
    tx.status === 'CLEARED' || tx.status === 'DEPOSITED' ? 'Received' : 'Pending',
    tx.notes || '-',
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 35,
    theme: 'grid',
    styles: { fontSize: 8, font: 'helvetica' },
    headStyles: { fillColor: [20, 20, 20], textColor: [240, 240, 240], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 243] },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right', textColor: [180, 40, 40] },
      6: { halign: 'right', fontStyle: 'bold' },
      7: { halign: 'center' },
    },
  });

  doc.save(`transactions_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const exportExpensesCSV = (expenses: Expense[], filename = 'expenses.csv') => {
  const headers = ['Date', 'Vendor', 'Category', 'Schedule C Line', 'Amount ($)', 'Deductible', 'Payment Account', 'Notes'];
  const rows = expenses.map(e => [
    e.expense_date,
    `"${(e.vendor || '').replace(/"/g, '""')}"`,
    `"${(e.category_name || '').replace(/"/g, '""')}"`,
    e.schedule_c_line || 'Other',
    e.amount.toFixed(2),
    e.is_tax_deductible ? 'YES' : 'NO',
    e.account_name || 'Personal Card / Cash',
    `"${(e.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportExpensesPDF = (expenses: Expense[], title = 'Business Expenses Statement') => {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(title, 14, 18);

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);
  doc.text(`Total Expenses: $${totalAmount.toFixed(2)} (${expenses.length} items)`, 14, 30);

  const head = [['Date', 'Vendor', 'Category', 'Tax Line', 'Amount', 'Deductible', 'Notes']];
  const body = expenses.map(e => [
    e.expense_date,
    e.vendor || '-',
    e.category_name || 'General',
    e.schedule_c_line || 'Other',
    `$${e.amount.toFixed(2)}`,
    e.is_tax_deductible ? 'Yes' : 'No',
    e.notes || '-',
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 35,
    theme: 'grid',
    styles: { fontSize: 8, font: 'helvetica' },
    headStyles: { fillColor: [20, 20, 20], textColor: [240, 240, 240], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 243] },
    columnStyles: {
      4: { halign: 'right', fontStyle: 'bold', textColor: [180, 40, 40] },
      5: { halign: 'center' },
    },
  });

  doc.save(`expenses_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const exportFinancialReportPDF = (
  plReport: PLReport | null,
  businessName: string = 'Freelance Studio LLC',
  year: number = new Date().getFullYear()
) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(`${businessName} - Profit & Loss Statement`, 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(`Tax Year: ${year} | Basis: Cash Basis GAAP | Generated: ${new Date().toLocaleDateString()}`, 14, 26);

  let startY = 35;

  if (plReport) {
    // Summary table
    const summaryData = [
      ['Gross Billings / Inflows', `$${(plReport.revenue?.grossRevenue || 0).toFixed(2)}`],
      ['Less: Gateway & Platform Processing Fees', `-$${(plReport.revenue?.platformFees || 0).toFixed(2)}`],
      ['Net Realized Revenue', `$${(plReport.revenue?.netRevenue || 0).toFixed(2)}`],
      ['Less: Deductible Operating Expenses', `-$${(plReport.operatingExpenses?.deductibleTotal || 0).toFixed(2)}`],
      ['Net Taxable Business Profit', `$${(plReport.netTaxableIncome || 0).toFixed(2)}`],
      ['Quarterly Estimated Tax Reserve (25%)', `$${(plReport.estimatedTaxProvision || 0).toFixed(2)}`],
    ];

    autoTable(doc, {
      head: [['Metric', 'Amount (USD)']],
      body: summaryData,
      startY,
      theme: 'grid',
      headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 100;

    // Platform Breakdown
    if (plReport.revenue?.byRail) {
      const railData = Object.entries(plReport.revenue.byRail).map(([rail, data]: [string, any]) => [
        rail,
        data.count,
        `$${data.gross.toFixed(2)}`,
        `-$${data.fees.toFixed(2)}`,
        `$${data.net.toFixed(2)}`,
      ]);

      doc.setFontSize(12);
      doc.setTextColor(20, 20, 20);
      doc.text('Payment Platform Breakdown', 14, finalY + 12);

      autoTable(doc, {
        head: [['Platform', 'Payments', 'Gross', 'Fees', 'Net']],
        body: railData,
        startY: finalY + 16,
        theme: 'striped',
        headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
        styles: { fontSize: 8 },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right', fontStyle: 'bold' },
        },
      });
    }
  }

  doc.save(`pl_statement_${year}_${businessName.replace(/\s+/g, '_')}.pdf`);
};
