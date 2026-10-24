import React, { useState, useMemo } from 'react';
import { StockAuditLog } from '../types';
import { 
  FileText, 
  Download, 
  Search, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  RotateCcw, 
  Filter,
  CheckCircle2
} from 'lucide-react';

interface AuditLogTabProps {
  logs: StockAuditLog[];
}

export const AuditLogTab: React.FC<AuditLogTabProps> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return logs.filter(log => {
      const matchQuery = 
        !q ||
        log.productName.toLowerCase().includes(q) ||
        log.barcode.toLowerCase().includes(q) ||
        log.operator.toLowerCase().includes(q) ||
        (log.note && log.note.toLowerCase().includes(q));

      const matchType = filterType === 'all' || log.changeType === filterType;
      return matchQuery && matchType;
    });
  }, [logs, search, filterType]);

  const exportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Timestamp', 'Product Name', 'Barcode', 'Change Type', 'Previous Quantity', 'New Quantity', 'Delta', 'Breached Minimum', 'Operator', 'Note'];
    const rows = logs.map(l => [
      `"${l.timestamp}"`,
      `"${l.productName.replace(/"/g, '""')}"`,
      `"${l.barcode}"`,
      `"${l.changeType}"`,
      l.previousQuantity,
      l.newQuantity,
      l.changeAmount,
      l.breachedMinimum ? 'TRUE' : 'FALSE',
      `"${l.operator}"`,
      `"${(l.note || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stockpulse_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Stock Movement & Audit Trail
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {logs.length} Total Events
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Immutable log of every atomic stock decrement from barcode sales, manual adjustments, and shipment replenishments.
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={logs.length === 0}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by item, barcode, or operator..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Change Types</option>
          <option value="sale_scan">Barcode Sales Scans (-1)</option>
          <option value="manual_adjustment">Manual Adjustments</option>
          <option value="restock_received">Shipments Received (+)</option>
          <option value="initial_count">Initial Counts</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Product / Barcode</th>
                <th className="py-3 px-4 text-center">Previous Qty</th>
                <th className="py-3 px-4 text-center">Delta</th>
                <th className="py-3 px-4 text-center">New Qty</th>
                <th className="py-3 px-4">Breach State</th>
                <th className="py-3 px-4">Operator / Terminal</th>
                <th className="py-3 px-4">Notes / PO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const isNegative = log.changeAmount < 0;
                  const isPositive = log.changeAmount > 0;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      <td className="py-3 px-4">
                        {log.changeType === 'sale_scan' ? (
                          <span className="px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Barcode Sale
                          </span>
                        ) : log.changeType === 'restock_received' ? (
                          <span className="px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            Restock Received
                          </span>
                        ) : log.changeType === 'manual_adjustment' ? (
                          <span className="px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                            Manual Adjust
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            Catalog Seed
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {log.productName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {log.barcode}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {log.previousQuantity}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-0.5 font-bold font-mono px-1.5 py-0.5 rounded ${
                          isNegative 
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                            : isPositive 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isPositive ? `+${log.changeAmount}` : log.changeAmount}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white font-mono">
                        {log.newQuantity}
                      </td>

                      <td className="py-3 px-4">
                        {log.breachedMinimum ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            Below Min
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Healthy</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {log.operator}
                      </td>

                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {log.note || (log.draftOrderId ? `Auto-draft ${log.draftOrderId}` : '-')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
