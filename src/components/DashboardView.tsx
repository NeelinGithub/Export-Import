import React, { useMemo, useState, useEffect } from 'react';
import { FileText, Activity, DollarSign, TrendingUp, Briefcase } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { SavedQuote, PIItem } from '../types';

interface DashboardViewProps {
  savedQuotes: SavedQuote[];
}

const COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f43f5e', '#6366f1'];

export default function DashboardView({ savedQuotes }: DashboardViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentYear = new Date().getFullYear();

  const { industryData, commodityData, industryMetrics, pipelineMetrics } = useMemo(() => {
    const indMap: Record<string, number> = {};
    const commMap: Record<string, number> = {};
    const metrics: Record<string, { volume: number; active: number; revenue: number }> = {};
    const pipeline = {
      issued: { count: 0, quantityMt: 0 },
      received: { count: 0, quantityMt: 0 },
      loading: { count: 0, quantityMt: 0 },
      shipped: { count: 0, quantityMt: 0 }
    };

    if (savedQuotes && Array.isArray(savedQuotes)) {
      savedQuotes.forEach(q => {
        // 1. Group by Industry
        const ind = q.industry || 'grain';
        const label = ind === 'grain' ? 'Grain / Rice' : ind.charAt(0).toUpperCase() + ind.slice(1);
        indMap[label] = (indMap[label] || 0) + 1;

        // Calculate MT for this quote
        let totalMt = 0;
        if (q.items && Array.isArray(q.items)) {
          q.items.forEach((item: PIItem) => {
            const wgt = item.totalWeightKg || ((item.numFCL || 0) * (item.weightPerContainerKg || 25000));
            totalMt += wgt / 1000;
            if (item.commodity) {
              commMap[item.commodity] = (commMap[item.commodity] || 0) + 1;
            }
          });
        }

        // 2. Pipeline metrics
        if (q.piStatus) {
          if (q.piStatus === 'pi') {
            pipeline.issued.count += 1;
            pipeline.issued.quantityMt += totalMt;
          } else if (q.piStatus === 'signed' || q.piStatus === 'payment') {
            pipeline.received.count += 1;
            pipeline.received.quantityMt += totalMt;
          } else if (q.piStatus === 'milling' || q.piStatus === 'inspection') {
            pipeline.loading.count += 1;
            pipeline.loading.quantityMt += totalMt;
          } else if (q.piStatus === 'bl' || q.piStatus === 'done') {
            pipeline.shipped.count += 1;
            pipeline.shipped.quantityMt += totalMt;
          }
        }

        // 3. Metrics for current year
        if (q.date) {
          const qDate = new Date(q.date);
          if (qDate.getFullYear() === currentYear) {
            if (!metrics[label]) {
              metrics[label] = { volume: 0, active: 0, revenue: 0 };
            }

            metrics[label].volume += 1;

            if (!q.piStatus || q.piStatus === 'draft' || q.piStatus === 'sent') {
              metrics[label].active += 1;
            }

            let rev = 0;
            if (q.items && Array.isArray(q.items)) {
              q.items.forEach((item: PIItem) => {
                const wgt = item.totalWeightKg || ((item.numFCL || 0) * (item.weightPerContainerKg || 25000));
                const mt = wgt / 1000;
                rev += (item.rate || 0) * mt;
              });
            }
            metrics[label].revenue += rev;
          }
        }
      });
    }

    const indResult = Object.keys(indMap).map(key => ({
      name: key,
      value: indMap[key]
    })).sort((a, b) => b.value - a.value);

    const commResult = Object.keys(commMap).map(key => ({
      name: key,
      value: commMap[key]
    })).sort((a, b) => b.value - a.value);

    const metricsResult = Object.keys(metrics).map(k => ({
      name: k,
      ...metrics[k]
    })).sort((a, b) => b.revenue - a.revenue);

    return { industryData: indResult, commodityData: commResult, industryMetrics: metricsResult, pipelineMetrics: pipeline };
  }, [savedQuotes, currentYear]);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              System Global Dashboard
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1">Visualization of export data and active pipelines.</p>
          </div>
          <div className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-bold text-indigo-900">YTD {currentYear} Overview</span>
          </div>
        </div>

        {/* Sales & Shipment Pipeline */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Active Sales & Shipment Pipeline
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
              <h4 className="font-extrabold text-gray-800 text-xs mb-1">PI Issued (Awaiting Action)</h4>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-black text-blue-700">{pipelineMetrics.issued.count}</div>
                <div className="text-xs font-bold text-gray-500">Quotes</div>
              </div>
              <div className="text-sm font-bold text-gray-600 mt-2 bg-gray-50 rounded p-1.5 inline-block">
                {pipelineMetrics.issued.quantityMt.toLocaleString(undefined, { maximumFractionDigits: 1 })} MT
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
              <h4 className="font-extrabold text-gray-800 text-xs mb-1">PI Received & In Progress</h4>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-black text-indigo-700">{pipelineMetrics.received.count}</div>
                <div className="text-xs font-bold text-gray-500">Quotes</div>
              </div>
              <div className="text-sm font-bold text-gray-600 mt-2 bg-gray-50 rounded p-1.5 inline-block">
                {pipelineMetrics.received.quantityMt.toLocaleString(undefined, { maximumFractionDigits: 1 })} MT
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-amber-500"></div>
              <h4 className="font-extrabold text-gray-800 text-xs mb-1">Loading & Awaiting Shipment</h4>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-black text-amber-700">{pipelineMetrics.loading.count}</div>
                <div className="text-xs font-bold text-gray-500">Quotes</div>
              </div>
              <div className="text-sm font-bold text-gray-600 mt-2 bg-gray-50 rounded p-1.5 inline-block">
                {pipelineMetrics.loading.quantityMt.toLocaleString(undefined, { maximumFractionDigits: 1 })} MT
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
              <h4 className="font-extrabold text-gray-800 text-xs mb-1">Shipped & Completed</h4>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-black text-emerald-700">{pipelineMetrics.shipped.count}</div>
                <div className="text-xs font-bold text-gray-500">Quotes</div>
              </div>
              <div className="text-sm font-bold text-gray-600 mt-2 bg-gray-50 rounded p-1.5 inline-block">
                {pipelineMetrics.shipped.quantityMt.toLocaleString(undefined, { maximumFractionDigits: 1 })} MT
              </div>
            </div>
          </div>
        </div>

        {/* Industry Metrics Summary Cards */}
        {industryMetrics.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Industry Workspace Summaries ({currentYear})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {industryMetrics.map((metric, idx) => (
                <div key={metric.name} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-50 to-white rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                  <h4 className="font-extrabold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                    {metric.name}
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                      <FileText className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
                      <div className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Volume</div>
                      <div className="font-black text-gray-800 text-sm">{metric.volume}</div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-100">
                      <Activity className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-1" />
                      <div className="text-[10px] uppercase font-bold text-emerald-600 mb-0.5">Active</div>
                      <div className="font-black text-emerald-700 text-sm">{metric.active}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-100">
                      <DollarSign className="w-3.5 h-3.5 text-blue-500 mx-auto mb-1" />
                      <div className="text-[10px] uppercase font-bold text-blue-600 mb-0.5">Revenue</div>
                      <div className="font-black text-blue-700 text-sm" title={`$${metric.revenue.toLocaleString()}`}>
                        ${metric.revenue >= 1000000 ? (metric.revenue / 1000000).toFixed(1) + 'M' : metric.revenue >= 1000 ? (metric.revenue / 1000).toFixed(1) + 'K' : metric.revenue.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Industry Distribution Chart */}
          <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-4">
             <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">Total Saved Quotes by Industry</h3>
             {industryData.length > 0 ? (
                 <div className="h-64 w-full">
                     {mounted ? (
                         <ResponsiveContainer width="100%" height={256}>
                            <BarChart data={industryData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                            />
                            <YAxis 
                                allowDecimals={false}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                            />
                            <RechartsTooltip 
                                cursor={{ fill: '#F3F4F6' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar 
                                dataKey="value" 
                                fill="#4f46e5" 
                                radius={[4, 4, 0, 0]}
                                barSize={40}
                            >
                                {industryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                     ) : (
                         <div className="h-full w-full bg-gray-50/50 rounded-xl" />
                     )}
                 </div>
             ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400 space-y-2">
                   <span className="text-3xl">📊</span>
                   <p className="text-sm font-medium">No quotes recorded yet</p>
                </div>
             )}
          </div>

          {/* Commodity Distribution Chart */}
          <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-4">
             <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">Commodity Distribution in Quotes</h3>
             {commodityData.length > 0 ? (
                 <div className="h-64 w-full">
                     {
                      mounted ? (
                          <ResponsiveContainer width="100%" height={256}>

                         <PieChart>
                             <Pie
                                 data={commodityData}
                                 cx="50%"
                                 cy="50%"
                                 innerRadius={60}
                                 outerRadius={80}
                                 paddingAngle={5}
                                 dataKey="value"
                                 label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                 labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                             >
                                 {commodityData.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                 ))}
                             </Pie>
                             <RechartsTooltip 
                                 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                             />
                             <Legend 
                                iconType="circle"
                                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                             />
                         </PieChart>
                      </ResponsiveContainer>
                     ) : (
                         <div className="h-full w-full bg-gray-50/50 rounded-xl" />
                     )}
                  </div>
             ) : (
                 <div className="h-64 flex flex-col items-center justify-center text-gray-400 space-y-2">
                     <span className="text-3xl">🥧</span>
                     <p className="text-sm font-medium">No commodities found</p>
                 </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}
