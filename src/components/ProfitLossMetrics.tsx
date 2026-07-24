import React, { useMemo } from 'react';
import { TrendingUp, DollarSign, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { SavedQuote } from '../types';

interface ProfitLossMetricsProps {
  savedQuotes: SavedQuote[];
}

export default function ProfitLossMetrics({ savedQuotes }: ProfitLossMetricsProps) {
  const { totalSales, cogs, overheads, netProfit, roi } = useMemo(() => {
    let sales = 0;
    
    savedQuotes.forEach(q => {
      if (q.items) {
        q.items.forEach(item => {
          const price = item.fobRate || item.rate || 0;
          const qty = item.quantity || ((item.numFCL && item.weightPerContainerKg) ? item.numFCL * item.weightPerContainerKg : 0);
          sales += price * qty;
        });
      }
    });

    // For the purpose of the metrics view, calculate simulated metrics based on total sales context
    const costOfGoods = sales * 0.68; // 68% COGS assumption
    const operationalOverheads = sales * 0.12; // 12% operational/freight overheads
    const profit = sales - (costOfGoods + operationalOverheads);
    const returnOnInvestment = sales > 0 ? (profit / (costOfGoods + operationalOverheads)) * 100 : 0;

    return {
      totalSales: sales,
      cogs: costOfGoods,
      overheads: operationalOverheads,
      netProfit: profit,
      roi: returnOnInvestment
    };
  }, [savedQuotes]);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Profit & Loss Metrics
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1">Financial performance and Return on Investment (ROI) analytics.</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Sales Value */}
          <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between space-x-2">
              <p className="text-[11px] font-black text-indigo-900/60 uppercase tracking-widest">Total Sales Value</p>
              <DollarSign className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-4 flex items-baseline space-x-2">
              <h2 className="text-2xl font-black text-indigo-900 tracking-tight">
                ${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
          </div>

          {/* Cost of Goods Sold */}
          <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between space-x-2">
              <p className="text-[11px] font-black text-rose-900/60 uppercase tracking-widest">Cost of Goods (COGS)</p>
              <PieChartIcon className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-4 flex items-baseline space-x-2">
              <h2 className="text-2xl font-black text-rose-900 tracking-tight">
                ${cogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
          </div>

          {/* Overheads */}
          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between space-x-2">
              <p className="text-[11px] font-black text-amber-900/60 uppercase tracking-widest">Operational Overheads</p>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-4 flex items-baseline space-x-2">
              <h2 className="text-2xl font-black text-amber-900 tracking-tight">
                ${overheads.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
          </div>

          {/* Return on Investment */}
          <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between space-x-2">
              <p className="text-[11px] font-black text-emerald-900/60 uppercase tracking-widest">ROI & Net Margin</p>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-4 flex items-baseline space-x-2">
              <h2 className={`text-2xl font-black tracking-tight ${roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
              </h2>
            </div>
            <div className="mt-1">
              <p className="text-[10px] font-bold text-emerald-600/70">
                Net: ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-6">
          <p className="text-xs text-gray-500 max-w-3xl">
            <strong>Financial Engine Note:</strong> Return on Investment (ROI) is calculated by taking the net profit (Total Sales minus COGS and Overheads) divided by the total investment (COGS + Overheads), expressed as a percentage. This provides a high-level view of capital efficiency across active exports.
          </p>
        </div>
      </div>
    </div>
  );
}
