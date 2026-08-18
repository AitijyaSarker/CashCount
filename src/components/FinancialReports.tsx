import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Building2,
  PieChart,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowRightLeft,
} from 'lucide-react';
import { PLReport, CashFlowReport, TaxPrepReport, LedgerEntry, User } from '../types';
import { exportFinancialReportPDF } from '../utils/exportUtils';

interface FinancialReportsProps {
  plReport: PLReport | null;
  cashFlowReport: CashFlowReport | null;
  taxPrepReport: TaxPrepReport | null;
  ledgerJournal: LedgerEntry[];
  trialBalance: { totalDebits: number; totalCredits: number; isBalanced: boolean } | null;
  user: User | null;
  onRefresh: () => void;
}

export const FinancialReports: React.FC<FinancialReportsProps> = ({
  plReport,
  cashFlowReport,
  taxPrepReport,
  ledgerJournal,
  trialBalance,
  user,
}) => {
  const [selectedReportTab, setSelectedReportTab] = useState<'PL' | 'CASHFLOW' | 'TAX_PREP' | 'LEDGER'>('PL');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const formatCurrency = (val: number | undefined) => {
    const num = val || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const handleExportPDF = () => {
    exportFinancialReportPDF(plReport, user?.businessName || 'Freelance Studio', selectedYear);
  };

  const downloadReportJSON = () => {
    const bundle = {
      generatedAt: new Date().toISOString(),
      freelancer: user?.fullName || 'Alex Morgan',
      businessName: user?.businessName || 'Freelance Studio LLC',
      taxYear: selectedYear,
      profitAndLoss: plReport,
      cashFlowStatement: cashFlowReport,
      scheduleCTaxPrep: taxPrepReport,
      trialBalance,
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial_statement_${user?.businessName?.replace(/\s+/g, '_') || 'freelance'}_${selectedYear}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-[#141414] dark:text-[#F3F2EE] font-mono">
      {/* 1. REPORT NAVIGATION & EXPORT BAR */}
      <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Report Selector Tabs */}
        <div className="flex flex-wrap gap-1 bg-[#E4E3E0] dark:bg-[#262626] p-1 border border-[#141414] dark:border-[#383838]">
          <button
            id="report-tab-pl"
            onClick={() => setSelectedReportTab('PL')}
            className={`px-3 py-1 text-xs font-bold uppercase transition-colors border ${
              selectedReportTab === 'PL'
                ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-white shadow-xs'
                : 'text-[#141414] dark:text-[#F3F2EE]/80 border-transparent hover:bg-[#D4D2CE] dark:hover:bg-[#303030]'
            }`}
          >
            Profit & Loss (P&L)
          </button>
          <button
            id="report-tab-cashflow"
            onClick={() => setSelectedReportTab('CASHFLOW')}
            className={`px-3 py-1 text-xs font-bold uppercase transition-colors border ${
              selectedReportTab === 'CASHFLOW'
                ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-white shadow-xs'
                : 'text-[#141414] dark:text-[#F3F2EE]/80 border-transparent hover:bg-[#D4D2CE] dark:hover:bg-[#303030]'
            }`}
          >
            Cash Flow Statement
          </button>
          <button
            id="report-tab-tax"
            onClick={() => setSelectedReportTab('TAX_PREP')}
            className={`px-3 py-1 text-xs font-bold uppercase transition-colors border ${
              selectedReportTab === 'TAX_PREP'
                ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-white shadow-xs'
                : 'text-[#141414] dark:text-[#F3F2EE]/80 border-transparent hover:bg-[#D4D2CE] dark:hover:bg-[#303030]'
            }`}
          >
            IRS Schedule C Tax-Prep
          </button>
          <button
            id="report-tab-ledger"
            onClick={() => setSelectedReportTab('LEDGER')}
            className={`px-3 py-1 text-xs font-bold uppercase transition-colors border ${
              selectedReportTab === 'LEDGER'
                ? 'bg-[#141414] dark:bg-[#383838] text-[#E4E3E0] dark:text-[#F3F2EE] border-[#141414] dark:border-white shadow-xs'
                : 'text-[#141414] dark:text-[#F3F2EE]/80 border-transparent hover:bg-[#D4D2CE] dark:hover:bg-[#303030]'
            }`}
          >
            General Ledger
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <select
            id="report-year-select"
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="px-2.5 py-1 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] text-xs text-[#141414] dark:text-[#F3F2EE] font-bold focus:outline-none"
          >
            <option value={2026}>TAX YEAR 2026</option>
            <option value={2025}>TAX YEAR 2025</option>
          </select>

          <button
            id="print-statement-btn"
            onClick={handleExportPDF}
            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#E4E3E0] dark:bg-[#262626] hover:bg-[#141414] hover:text-[#E4E3E0] dark:hover:bg-[#383838] text-[#141414] dark:text-[#F3F2EE] text-xs font-bold uppercase border border-[#141414] dark:border-[#383838] transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            id="download-accountant-bundle-btn"
            onClick={downloadReportJSON}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1 bg-[#141414] dark:bg-[#383838] hover:bg-[#2A2A2A] text-[#E4E3E0] dark:text-[#F3F2EE] text-xs font-bold uppercase border border-[#141414] dark:border-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON Bundle</span>
          </button>
        </div>
      </div>

      {/* 2. REPORT CONTENT AREA */}

      {/* --- TAB 1: PROFIT & LOSS STATEMENT --- */}
      {selectedReportTab === 'PL' && (
        <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="border-b border-[#141414] dark:border-[#383838] pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#141414]/70 dark:text-[#F3F2EE]/70">
                  Accountant-Ready Financial Statement
                </span>
                <h2 className="text-base font-bold uppercase tracking-tight mt-0.5">
                  Statement of Profit & Loss (P&L)
                </h2>
                <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70 mt-0.5">
                  PREPARED FOR: <span className="font-bold">{plReport?.preparedFor || 'Freelance Studio'}</span> // TAX YEAR {selectedYear} // CASH BASIS GAAP
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase bg-[#E4E3E0] dark:bg-[#262626] text-emerald-800 dark:text-emerald-400 border border-[#141414] dark:border-[#383838]">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" /> GAAP FORMATTED
                </span>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider border-b border-[#141414]/40 dark:border-[#383838] pb-1.5">
              1. Gross Inflows & Revenue by Payment Rail
            </h3>
            <div className="space-y-2 text-xs bg-[#E4E3E0] dark:bg-[#262626] p-3 border border-[#141414] dark:border-[#383838]">
              {plReport?.revenue.byRail && Object.entries(plReport.revenue.byRail).map(([rail, data]: [string, { gross: number; fees: number; net: number; count: number }]) => (
                <div key={rail} className="flex items-center justify-between py-1 border-b border-[#141414]/10 dark:border-[#383838]">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">{rail} Rail</span>
                    <span className="text-[#141414]/60 dark:text-[#F3F2EE]/60 text-[10px]">({data.count} PAYMENTS)</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-[#141414]/70 dark:text-[#F3F2EE]/70">GROSS: {formatCurrency(data.gross)}</span>
                    <span className="text-rose-700 dark:text-rose-400 font-bold">FEES: -{formatCurrency(data.fees)}</span>
                    <span className="font-bold text-emerald-800 dark:text-emerald-400 w-24 text-right">
                      {formatCurrency(data.net)}
                    </span>
                  </div>
                </div>
              ))}

              <div className="flex justify-between py-1.5 border-t border-[#141414] dark:border-[#383838] font-bold text-xs pt-2">
                <span>TOTAL GROSS BILLINGS:</span>
                <span className="text-emerald-800 dark:text-emerald-400">{formatCurrency(plReport?.revenue.grossRevenue)}</span>
              </div>
              <div className="flex justify-between py-1 text-xs text-rose-700 dark:text-rose-400 font-bold">
                <span>LESS: PAYMENT GATEWAY FEES (DEDUCTIBLE):</span>
                <span>-{formatCurrency(plReport?.revenue.platformFees)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-t border-[#141414] dark:border-[#383838] text-xs font-bold">
                <span>NET REALIZED REVENUE:</span>
                <span className="text-emerald-800 dark:text-emerald-400">{formatCurrency(plReport?.revenue.netRevenue)}</span>
              </div>
            </div>
          </div>

          {/* Operating Expenses Breakdown */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider border-b border-[#141414]/40 dark:border-[#383838] pb-1.5">
              2. Operating Expenses (IRS Schedule C Categorized)
            </h3>
            <div className="space-y-2 text-xs bg-[#E4E3E0] dark:bg-[#262626] p-3 border border-[#141414] dark:border-[#383838]">
              {plReport?.operatingExpenses.byCategory.map(cat => (
                <div key={cat.name} className="flex justify-between py-1 border-b border-[#141414]/10 dark:border-[#383838]">
                  <div>
                    <span className="font-bold">{cat.name}</span>
                    <span className="text-[#141414]/60 dark:text-[#F3F2EE]/60 text-[10px] ml-2">({cat.scheduleC})</span>
                  </div>
                  <div className="text-rose-700 dark:text-rose-400 font-bold">
                    -{formatCurrency(cat.amount)}
                  </div>
                </div>
              ))}

              <div className="flex justify-between py-1.5 border-t border-[#141414] dark:border-[#383838] font-bold text-xs pt-2">
                <span>TOTAL DEDUCTIBLE OPERATING EXPENSES:</span>
                <span className="text-rose-700 dark:text-rose-400">-{formatCurrency(plReport?.operatingExpenses.deductibleTotal)}</span>
              </div>
            </div>
          </div>

          {/* Net Taxable Income & Estimated Tax Box */}
          <div className="pt-3 border-t border-[#141414] dark:border-[#383838] space-y-3">
            <div className="flex justify-between text-sm font-bold bg-[#E4E3E0] dark:bg-[#262626] p-3 border border-[#141414] dark:border-[#383838]">
              <span>NET TAXABLE BUSINESS PROFIT (FORM 1040 LINE 31):</span>
              <span className="text-emerald-800 dark:text-emerald-400 text-base">
                {formatCurrency(plReport?.netTaxableIncome)}
              </span>
            </div>

            <div className="p-3 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-xs uppercase block">Quarterly Estimated Tax Reserve Provision</span>
                <p className="text-[#141414]/70 dark:text-[#F3F2EE]/70 mt-0.5">
                  Calculated at standard 25% freelance allocation (15.3% Self-Employment Tax + Federal Income Tax bracket).
                </p>
              </div>
              <div className="text-right">
                <span className="text-base font-bold">
                  {formatCurrency(plReport?.estimatedTaxProvision)}
                </span>
                <span className="text-[10px] text-[#141414]/70 dark:text-[#F3F2EE]/70 block uppercase">Recommended Reserve Holdback</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: CASH FLOW STATEMENT --- */}
      {selectedReportTab === 'CASHFLOW' && (
        <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#141414] dark:border-[#383838] pb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#141414]/70 dark:text-[#F3F2EE]/70">
              Liquidity & Movement Statement
            </span>
            <h2 className="text-base font-bold uppercase tracking-tight mt-0.5">
              Statement of Cash Flows
            </h2>
            <p className="text-[11px] text-[#141414]/70 dark:text-[#F3F2EE]/70 mt-0.5">
              TRACKS CLEARED CASH INFLOWS, PENDING SETTLEMENT FLOAT, AND BANK ACCOUNT SWEEPS
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="bg-[#E4E3E0] dark:bg-[#262626] p-3.5 border border-[#141414] dark:border-[#383838]">
              <h3 className="font-bold uppercase border-b border-[#141414]/20 dark:border-[#383838] pb-1.5">
                I. Cash Flows from Operating Activities
              </h3>
              <div className="mt-2 space-y-1.5">
                <div className="flex justify-between py-1">
                  <span>Cash Cleared & Received from Clients:</span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-400">
                    +{formatCurrency(cashFlowReport?.operatingActivities.cashReceivedFromClients)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Cash Paid for Operating Expenses:</span>
                  <span className="font-bold text-rose-700 dark:text-rose-400">
                    -{formatCurrency(cashFlowReport?.operatingActivities.cashPaidForOperatingExpenses)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Platform Gateway Processing Fees Paid:</span>
                  <span className="font-bold text-rose-700 dark:text-rose-400">
                    -{formatCurrency(cashFlowReport?.operatingActivities.platformProcessingFeesPaid)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-t border-[#141414] dark:border-[#383838] font-bold">
                  <span>Net Cash Generated from Operations:</span>
                  <span className="text-emerald-800 dark:text-emerald-400">
                    {formatCurrency(cashFlowReport?.operatingActivities.netCashFromOperations)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#E4E3E0] dark:bg-[#262626] p-3.5 border border-[#141414] dark:border-[#383838]">
              <h3 className="font-bold uppercase border-b border-[#141414]/20 dark:border-[#383838] pb-1.5">
                II. Pending & In-Transit Liquidity Pipeline
              </h3>
              <div className="mt-2 space-y-1.5">
                <div className="flex justify-between py-1">
                  <span>Pending Inflows Awaiting Rail Clearance:</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    +{formatCurrency(cashFlowReport?.pendingInTransitLiquidity.pendingClientReceipts)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#E4E3E0] dark:bg-[#262626] p-3.5 border border-[#141414] dark:border-[#383838]">
              <h3 className="font-bold uppercase border-b border-[#141414]/20 dark:border-[#383838] pb-1.5">
                III. Financing & Inter-Account Sweeps
              </h3>
              <div className="mt-2 space-y-1.5">
                <div className="flex justify-between py-1">
                  <span>Wallet Payouts Swept to Checking:</span>
                  <span className="font-bold">
                    {formatCurrency(cashFlowReport?.financingAndTransfers.sweepsToBankChecking)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#141414] dark:border-[#383838] flex justify-between text-xs font-bold bg-[#E4E3E0] dark:bg-[#262626] p-3 border border-[#141414] dark:border-[#383838]">
              <span>CONSOLIDATED LIQUID CASH POSITION:</span>
              <span className="text-emerald-800 dark:text-emerald-400 text-sm">
                {formatCurrency(cashFlowReport?.netLiquidPosition)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: IRS SCHEDULE C TAX PREP --- */}
      {selectedReportTab === 'TAX_PREP' && (
        <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#141414] dark:border-[#383838] pb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#141414]/70 dark:text-[#F3F2EE]/70">
              Official IRS Tax Return Worksheet
            </span>
            <h2 className="text-base font-bold uppercase tracking-tight mt-0.5">
              Form 1040 Schedule C — Profit or Loss from Business
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs bg-[#E4E3E0] dark:bg-[#262626] p-2.5 border border-[#141414] dark:border-[#383838]">
              <div>TAXPAYER: <span className="font-bold">{taxPrepReport?.taxpayer.name}</span></div>
              <div>BUSINESS: <span className="font-bold">{taxPrepReport?.taxpayer.businessName}</span></div>
              <div>EIN / TAX ID: <span className="font-bold">{taxPrepReport?.taxpayer.taxIdMasked}</span></div>
              <div>ACCOUNTING: <span className="font-bold">{taxPrepReport?.taxpayer.accountingMethod}</span></div>
            </div>
          </div>

          {/* Part I: Income */}
          <div className="space-y-2 text-xs">
            <h3 className="font-bold uppercase bg-[#DCDAD7] dark:bg-[#1C1C1C] px-2 py-1 border border-[#141414] dark:border-[#383838]">
              Part I: Income
            </h3>
            <div className="space-y-1.5 bg-[#E4E3E0] dark:bg-[#262626] p-3 border border-[#141414] dark:border-[#383838]">
              <div className="flex justify-between py-1">
                <span>Line 1: Gross receipts or sales (1099-NEC & Multi-Rail Inflows):</span>
                <span className="font-bold text-emerald-800 dark:text-emerald-400">
                  {formatCurrency(taxPrepReport?.part1_income.line1_gross_receipts)}
                </span>
              </div>
              <div className="flex justify-between py-1 text-[#141414]/60 dark:text-[#F3F2EE]/60">
                <span>Line 2: Returns and allowances:</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between py-1.5 border-t border-[#141414] dark:border-[#383838] font-bold">
                <span>Line 7: Gross Income:</span>
                <span className="text-emerald-800 dark:text-emerald-400">
                  {formatCurrency(taxPrepReport?.part1_income.line7_gross_income)}
                </span>
              </div>
            </div>
          </div>

          {/* Part II: Expenses */}
          <div className="space-y-2 text-xs">
            <h3 className="font-bold uppercase bg-[#DCDAD7] dark:bg-[#1C1C1C] px-2 py-1 border border-[#141414] dark:border-[#383838]">
              Part II: Expenses (Deductible Business Write-offs)
            </h3>
            <div className="space-y-1.5 bg-[#E4E3E0] dark:bg-[#262626] p-3 border border-[#141414] dark:border-[#383838]">
              {taxPrepReport?.part2_expenses.breakdown && Object.entries(taxPrepReport.part2_expenses.breakdown).map(([lineKey, lineData]: [string, { label: string; amount: number; items: string[] }]) => (
                <div key={lineKey} className="flex justify-between py-1">
                  <div>
                    <span className="font-bold">{lineData.label}:</span>
                    <span className="text-[#141414]/60 dark:text-[#F3F2EE]/60 text-[10px] ml-2">({lineData.items.join(', ')})</span>
                  </div>
                  <span className="text-rose-700 dark:text-rose-400 font-bold">
                    -{formatCurrency(lineData.amount)}
                  </span>
                </div>
              ))}

              <div className="flex justify-between py-1.5 border-t border-[#141414] dark:border-[#383838] font-bold pt-2">
                <span>Line 28: Total Expenses before business use of home:</span>
                <span className="text-rose-700 dark:text-rose-400 font-bold">
                  -{formatCurrency(taxPrepReport?.part2_expenses.line28_total_expenses)}
                </span>
              </div>
            </div>
          </div>

          {/* Part III: Net Profit */}
          <div className="space-y-2 text-xs pt-1">
            <h3 className="font-bold uppercase bg-[#DCDAD7] dark:bg-[#1C1C1C] px-2 py-1 border border-[#141414] dark:border-[#383838]">
              Part III: Net Profit and Tax Liability Calculation
            </h3>
            <div className="space-y-2 bg-[#E4E3E0] dark:bg-[#262626] p-3 border border-[#141414] dark:border-[#383838]">
              <div className="flex justify-between py-1.5 text-xs font-bold border-b border-[#141414]/20 dark:border-[#383838]">
                <span>Line 31: Net Profit or (Loss):</span>
                <span className="text-emerald-800 dark:text-emerald-400 text-sm font-bold">
                  {formatCurrency(taxPrepReport?.part3_net_profit_or_loss.line31_net_profit)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <div className="p-2.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838]">
                  <span className="text-[#141414]/70 dark:text-[#F3F2EE]/70 text-[10px] uppercase block">Schedule SE Tax (15.3%)</span>
                  <span className="text-xs font-bold mt-0.5 block">
                    {formatCurrency(taxPrepReport?.part3_net_profit_or_loss.estimatedSelfEmploymentTax)}
                  </span>
                </div>
                <div className="p-2.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838]">
                  <span className="text-[#141414]/70 dark:text-[#F3F2EE]/70 text-[10px] uppercase block">Federal Income Tax Est.</span>
                  <span className="text-xs font-bold mt-0.5 block">
                    {formatCurrency(taxPrepReport?.part3_net_profit_or_loss.estimatedIncomeTax)}
                  </span>
                </div>
                <div className="p-2.5 bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838]">
                  <span className="text-[#141414]/70 dark:text-[#F3F2EE]/70 text-[10px] uppercase block">Quarterly Voucher Est.</span>
                  <span className="text-xs font-bold mt-0.5 block">
                    {formatCurrency((taxPrepReport?.part3_net_profit_or_loss.totalQuarterlyEstimatedProvision || 0) / 4)} / QTR
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: GENERAL LEDGER & TRIAL BALANCE --- */}
      {selectedReportTab === 'LEDGER' && (
        <div className="bg-[#DCDAD7] dark:bg-[#1C1C1C] border border-[#141414] dark:border-[#383838] p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#141414] dark:border-[#383838] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#141414]/70 dark:text-[#F3F2EE]/70">
                Audited Accounting Records
              </span>
              <h2 className="text-base font-bold uppercase tracking-tight mt-0.5">
                Double-Entry General Ledger & Trial Balance
              </h2>
            </div>
            <div>
              {trialBalance?.isBalanced ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-[#E4E3E0] dark:bg-[#262626] text-emerald-800 dark:text-emerald-400 border border-[#141414] dark:border-[#383838] text-xs font-bold uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span>Balanced (Debits = Credits)</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-[#E4E3E0] dark:bg-[#262626] text-rose-700 dark:text-rose-400 border border-[#141414] dark:border-[#383838] text-xs font-bold uppercase">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Out of Balance</span>
                </span>
              )}
            </div>
          </div>

          {/* Trial Balance Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838]">
              <span className="text-[10px] text-[#141414]/70 dark:text-[#F3F2EE]/70 uppercase">Total Journal Debits</span>
              <p className="text-base font-bold text-emerald-800 dark:text-emerald-400 mt-0.5">
                {formatCurrency(trialBalance?.totalDebits)}
              </p>
            </div>
            <div className="p-3 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838]">
              <span className="text-[10px] text-[#141414]/70 dark:text-[#F3F2EE]/70 uppercase">Total Journal Credits</span>
              <p className="text-base font-bold mt-0.5">
                {formatCurrency(trialBalance?.totalCredits)}
              </p>
            </div>
            <div className="p-3 bg-[#E4E3E0] dark:bg-[#262626] border border-[#141414] dark:border-[#383838] col-span-2 sm:col-span-1">
              <span className="text-[10px] text-[#141414]/70 dark:text-[#F3F2EE]/70 uppercase">Variance</span>
              <p className="text-base font-bold mt-0.5">$0.0000</p>
            </div>
          </div>

          {/* Ledger Journal Records Table */}
          <div className="border border-[#141414] dark:border-[#383838] overflow-hidden bg-[#E4E3E0] dark:bg-[#262626]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-[#DCDAD7] dark:bg-[#1C1C1C] text-[#141414] dark:text-[#F3F2EE] font-bold uppercase tracking-wider text-[11px] border-b border-[#141414] dark:border-[#383838]">
                    <th className="p-2.5 border-r border-[#141414]/20 dark:border-[#383838]">Date</th>
                    <th className="p-2.5 border-r border-[#141414]/20 dark:border-[#383838]">Account</th>
                    <th className="p-2.5 border-r border-[#141414]/20 dark:border-[#383838]">Description</th>
                    <th className="p-2.5 text-right border-r border-[#141414]/20 dark:border-[#383838]">Debit ($)</th>
                    <th className="p-2.5 text-right">Credit ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141414]/20 dark:divide-[#383838]">
                  {ledgerJournal.map(entry => (
                    <tr key={entry.id} className="hover:bg-[#D4D2CE] dark:hover:bg-[#303030] transition-colors">
                      <td className="p-2.5 whitespace-nowrap text-[11px] border-r border-[#141414]/20 dark:border-[#383838]">{entry.entry_date}</td>
                      <td className="p-2.5 font-bold whitespace-nowrap border-r border-[#141414]/20 dark:border-[#383838]">{entry.account_name}</td>
                      <td className="p-2.5 max-w-xs truncate border-r border-[#141414]/20 dark:border-[#383838]" title={entry.description}>{entry.description}</td>
                      <td className="p-2.5 text-right font-bold whitespace-nowrap border-r border-[#141414]/20 dark:border-[#383838]">
                        {entry.entry_type === 'DEBIT' ? (
                          <span className="text-emerald-800 dark:text-emerald-400">{formatCurrency(entry.amount)}</span>
                        ) : (
                          <span className="text-[#141414]/40 dark:text-[#F3F2EE]/40">—</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-bold whitespace-nowrap">
                        {entry.entry_type === 'CREDIT' ? (
                          <span>{formatCurrency(entry.amount)}</span>
                        ) : (
                          <span className="text-[#141414]/40 dark:text-[#F3F2EE]/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
