import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { RateRow, SavedQuote, PIItem } from '../types';
import { getHsCodeForCommodity } from '../utils/hscode';
import { todayISO, addDaysISO, fmtDate, getInitials } from '../utils';
import { 
  FileCheck, Printer, Save, Eye, EyeOff, Clipboard, 
  MapPin, Calendar, Building, ChevronRight, BookmarkCheck, FileSpreadsheet, Lock
} from 'lucide-react';

interface QuoteSheetProps {
  selectedRateIds: number[];
  rateList: RateRow[];
  savedQuotes: SavedQuote[];
  setSavedQuotes: (quotes: SavedQuote[] | ((prev: SavedQuote[]) => SavedQuote[])) => void;
  companies: string[];
  setCompanies: (list: string[]) => void;
  buyers: string[];
  setBuyers: (list: string[]) => void;
  buyerLocations: string[];
  setBuyerLocations: (list: string[]) => void;
  onNavigateToTab: (tab: string) => void;
  allowedModules?: string[];
  industry?: string;
}

export default function QuoteSheet({
  selectedRateIds,
  rateList,
  savedQuotes,
  setSavedQuotes,
  companies,
  setCompanies,
  buyers,
  setBuyers,
  buyerLocations,
  setBuyerLocations,
  onNavigateToTab,
  allowedModules,
  industry = 'grain'
}: QuoteSheetProps) {
  const isSavingAllowed = (allowedModules || ['rate_calc']).includes('quote_saving');

  // Helper function to calculate cost of alternate blends dynamically
  const calculateAlternateBlendRate = (
    rice1Pct: number,
    rice2Pct: number,
    r1ExMill: number,
    r2ExMill: number,
    rPackaging = 0,
    rTransport = 0,
    rCfsPort = 0,
    rFreight = 0,
    rInsurance = 0,
    rDutyPct = 0,
    rExrate = 91.50,
    rCommission = 0
  ) => {
    const blendExMill = ((r1ExMill * rice1Pct) + (r2ExMill * rice2Pct)) / 100;
    const baseCostInrKg = blendExMill + rPackaging + rTransport + rCfsPort + rFreight + rInsurance;
    const dutyAmt = rDutyPct > 0 ? (baseCostInrKg * (rDutyPct / 100)) : 0;
    const totalInrKg = baseCostInrKg + dutyAmt;
    const baseUsdMt = rExrate > 0 ? (totalInrKg / rExrate) * 1000 : 0;
    return baseUsdMt + rCommission;
  };

  // Config States
  const [refNo, setRefNo] = useState('');
  const [company, setCompany] = useState('');
  const [buyer, setBuyer] = useState('');
  const [buyerLoc, setBuyerLoc] = useState('');
  const [validDays, setValidDays] = useState('7');
  const [additionalTerms, setAdditionalTerms] = useState('1. Rates are subject to standard crop market availability.\n2. Shipment is subject to timely allocation of containers by the shipping line.');

  // Editable lists (to allow user to quickly click saved items)
  const [showForm, setShowForm] = useState(true);

  // Items chosen for PI
  const chosenRates = rateList.filter(row => selectedRateIds.includes(row.id));

  // Default values setup
  useEffect(() => {
    if (!refNo) {
      setRefNo(`RFQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    }
    if (chosenRates.length > 0) {
      if (!company && companies.length > 0) setCompany(companies[0]);
      
      const rateWithBuyer = chosenRates.find(r => r.buyer);
      if (rateWithBuyer) {
        if (!buyer) setBuyer(rateWithBuyer.buyer || '');
        if (!buyerLoc) setBuyerLoc(rateWithBuyer.buyerLoc || rateWithBuyer.consigneeDetails || '');
      } else {
        if (!buyer && buyers.length > 0) setBuyer(buyers[0]);
        if (!buyerLoc && buyerLocations.length > 0) setBuyerLoc(buyerLocations[0]);
      }
    }
  }, [selectedRateIds, rateList, companies, buyers, buyerLocations, chosenRates]);

  // Aggregate values from chosen items
  const displayDest = chosenRates.map(r => r.dest).filter((v, i, a) => a.indexOf(v) === i).join(' / ');
  const displayCond = chosenRates.map(r => r.condition).filter((v, i, a) => a.indexOf(v) === i).join(' / ');
  const displayPayments = chosenRates.map(r => r.paymentTerms).filter((v, i, a) => a.indexOf(v) === i).join('; ');

  // Save the quotation structure
  const handleSaveQuote = () => {
    if (!isSavingAllowed) {
      alert("Quotation saving and history logging is deactivated under this workspace configuration.");
      return;
    }
    if (!company.trim()) {
      alert('Please select or specify a Company letterhead header.');
      return;
    }
    if (!buyer.trim()) {
      alert('Please specify the Buyer details.');
      return;
    }
    if (chosenRates.length === 0) {
      alert('No rate list items were selected to populate this quote. Select rows in Rate List first!');
      return;
    }

    // Add company/buyer to list for futures prefill
    const normCo = company.trim();
    const normBuy = buyer.trim();
    const normLoc = buyerLoc.trim();

    if (normCo && !companies.includes(normCo)) setCompanies([...companies, normCo]);
    if (normBuy && !buyers.includes(normBuy)) setBuyers([...buyers, normBuy]);
    if (normLoc && !buyerLocations.includes(normLoc)) setBuyerLocations([...buyerLocations, normLoc]);

    // Format PI item structures
    const items: PIItem[] = chosenRates.map((r, index) => ({
      id: Date.now() + index,
      dest: r.dest,
      commodity: r.commodity,
      brand: r.brand,
      packed: r.packed,
      size: r.size,
      master: r.master,
      crop: r.crop,
      year: r.year,
      rate: r.rate,
      condition: r.condition,
      paymentTerms: r.paymentTerms,
      numFCL: r.numFCL,
      weightPerContainerKg: r.weightPerContainerKg,
      totalWeightKg: r.totalWeightKg,
      totalBags: Math.round(r.totalWeightKg / (parseFloat(r.size.replace(/[^\d.]/g, '')) || 20)),
      
      // Copy over blended rice metrics
      blendRice1Name: r.blendRice1Name,
      blendRice1Pct: r.blendRice1Pct,
      blendRice1ExMill: r.blendRice1ExMill,
      blendRice2Name: r.blendRice2Name,
      blendRice2Pct: r.blendRice2Pct,
      blendRice2ExMill: r.blendRice2ExMill,
      blendCookingRemarks: r.blendCookingRemarks,
      bPackaging: r.bPackaging,
      bTransport: r.bTransport,
      bCfsPort: r.bCfsPort,
      bFreight: r.bFreight,
      bInsurance: r.bInsurance,
      dutyPct: r.dutyPct,
      exrate: r.exrate,
      commission: r.commission
    }));

    const firstRate = chosenRates[0];
    const newQuote: SavedQuote = {
      id: Date.now(),
      ref: refNo.trim().toUpperCase(),
      company: normCo,
      buyer: normBuy,
      buyerLoc: normLoc,
      consigneeDetails: firstRate?.consigneeDetails || normLoc || `${normBuy}\n${normLoc}`,
      notifyParty: firstRate?.notifyParty || 'SAME AS CONSIGNEE',
      dest: displayDest,
      cond: displayCond,
      terms: displayPayments,
      valid: addDaysISO(todayISO(), parseInt(validDays) || 7),
      date: todayISO(),
      rateIds: selectedRateIds,
      items,
      html: '', // auto-compile or custom view
      piStatus: 'DRAFT_PI',
      industry: industry
    };

    setSavedQuotes((prev) => [newQuote, ...prev]);
    alert(`Quotation ${newQuote.ref} saved successfully to active local directory!`);
    onNavigateToTab('savedquotes');
  };

  const handleCheckIframe = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  const notifyIframeBlock = (feature: string) => {
    alert(`The preview window blocked ${feature}. Please click the "Open application in new tab" icon (↗️) at the top right of this preview to use this feature.`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const card = document.getElementById('printable-quote-sheet-card');
    if (!card) return;
    try {
      const canvas = await html2canvas(card, {
        scale: 2.2,
        backgroundColor: '#ffffff',
        ignoreElements: (node) => node.hasAttribute && node.hasAttribute('data-html2canvas-ignore')
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
      const targetWidth = pdfWidth - (margin * 2);
      
      // We need to calculate height from the data URL.
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => { img.onload = resolve; });
      const targetHeight = (img.height * targetWidth) / img.width;
      
      pdf.addImage(imgData, 'PNG', margin, margin, targetWidth, targetHeight);
      pdf.save(`QUOTATION-${refNo || 'OFFER'}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Direct PDF generation failed. If you are in the preview iframe, consider opening the app in a new tab.');
      window.print();
    }
  };

  const handleDownloadImage = async () => {
    const card = document.getElementById('printable-quote-sheet-card');
    if (!card) return;
    try {
      const canvas = await html2canvas(card, {
        scale: 2,
        backgroundColor: '#ffffff',
        ignoreElements: (node) => node.hasAttribute && node.hasAttribute('data-html2canvas-ignore')
      });
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `QUOTATION-${refNo || 'OFFER'}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('Failed to generate high-resolution image in this environment. If you are in the preview iframe, consider opening the app in a new tab.');
    }
  };

  const handleCopyImage = async () => {
    const card = document.getElementById('printable-quote-sheet-card');
    if (!card) return;
    try {
      const canvas = await html2canvas(card, {
        scale: 2,
        backgroundColor: '#ffffff',
        ignoreElements: (node) => node.hasAttribute && node.hasAttribute('data-html2canvas-ignore')
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert("Could not generate image blob.");
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert("Full high-resolution quotation image copied successfully to your clipboard! You can paste (Ctrl+V) it anywhere.");
        } catch (copyErr) {
          console.error(copyErr);
          alert("Clipboard write failed. Wait, you might be in a preview window. Try downloading or open in a new tab.");
        }
      }, 'image/png', 1.0);
    } catch (e) {
      console.error(e);
      alert('Could not copy image. Check browser capabilities or open in a new tab.');
    }
  };

  return (
    <div className="space-y-6" id="quote-sheet-page">
      {/* Page Header */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-3 select-none no-print">
        <div>
          <div className="breadcrumb">📄 Documents & Exports</div>
          <h2 className="text-xl font-extrabold tracking-tight">Active Export Offer Worksheet</h2>
          <p className="text-sm text-gray-500 mt-1">
            Turn selected rate rows into beautiful corporate quotation offers under professional letterheads.
          </p>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3.5 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white rounded-lg text-xs font-black flex items-center gap-1.5 transition"
          >
            {showForm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showForm ? 'Hide Form Editor' : 'Open Form Editor'}
          </button>
          
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
          >
            <Printer className="w-4 h-4" /> Print Quotation
          </button>

          {!isSavingAllowed ? (
            <button
              disabled
              className="px-4 py-2 bg-slate-100 border border-slate-350 text-slate-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed"
              title="Quotation saving is deactivated under your current workspace options."
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" /> Save RFQ Locked
            </button>
          ) : (
            <button
              onClick={handleSaveQuote}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm transition"
            >
              <Save className="w-4 h-4" /> Save RFQ Offer
            </button>
          )}
        </div>
      </div>

      {chosenRates.length === 0 ? (
        <div className="no-print bg-amber-50 border border-amber-200 p-8 rounded-xl text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
            <Clipboard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-amber-900">No active grades selected!</h3>
            <p className="text-xs text-amber-700 mt-1.5">
              Before setting up an RFQ Quote letterhead, go to the <span className="font-bold underline cursor-pointer" onClick={() => onNavigateToTab('rates')}>Rate List Board</span> and check the checkboxes next to the rice prices you want to offer.
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('rates')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-black hover:bg-blue-700 transition"
          >
            Go to Pricing Board <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
          </button>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${showForm ? 'xl:grid-cols-4' : 'xl:grid-cols-5'} gap-6 items-start print:block print:gap-0`}>
          
          {/* EDITOR FORM */}
          {showForm && (
            <div className="no-print bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4 xl:col-span-1 text-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block border-b pb-1.5 mb-2">Quotation Details</span>

              <div className="field">
                <label>Offer Ref Number</label>
                <input
                  type="text"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold uppercase outline-none focus:border-blue-500"
                />
              </div>

              <div className="field">
                <label>Exporter Company (Letterhead)</label>
                <input
                  type="text"
                  placeholder="e.g. S.A. ENTERPRISES EXPORTS"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase outline-none"
                  list="co-pref"
                />
                <datalist id="co-pref">
                  {companies.map(c => <option key={c} value={c} />)}
                  <option value="S.A. ENTERPRISES EXPORTS" />
                  <option value="GLOBAL RICE EXPORTERS INDIA" />
                </datalist>
              </div>

              <div className="field">
                <label>Buyer Business Name</label>
                <input
                  type="text"
                  placeholder="e.g. AL MAHA SUPERMARKETS GCC"
                  value={buyer}
                  onChange={(e) => setBuyer(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase outline-none"
                  list="buy-pref"
                />
                <datalist id="buy-pref">
                  {buyers.map(b => <option key={b} value={b} />)}
                </datalist>
              </div>

              <div className="field">
                <label>Buyer Destination / Location</label>
                <input
                  type="text"
                  placeholder="e.g. DOHA, QATAR"
                  value={buyerLoc}
                  onChange={(e) => setBuyerLoc(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs outline-none uppercase"
                  list="loc-pref"
                />
                <datalist id="loc-pref">
                  {buyerLocations.map(l => <option key={l} value={l} />)}
                </datalist>
              </div>

              <div className="field">
                <label>Offer Validity (Days)</label>
                <select
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs font-semibold"
                >
                  <option value="3">3 Days Validity</option>
                  <option value="5">5 Days Validity</option>
                  <option value="7">7 Days Validity (Recommended)</option>
                  <option value="10">10 Days Validity</option>
                  <option value="15">15 Days Validity</option>
                </select>
                <span className="fc info">Valid until {fmtDate(addDaysISO(todayISO(), parseInt(validDays) || 7))}</span>
              </div>

              <div className="field">
                <label>Contract Terms / Exporter Notes</label>
                <textarea
                  rows={4}
                  value={additionalTerms}
                  onChange={(e) => setAdditionalTerms(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-[11px] font-medium leading-normal outline-none focus:border-blue-500"
                  placeholder="Write terms..."
                />
              </div>
            </div>
          )}

          {/* PRINTABLE SHEET PREVIEW */}
          <div id="printable-quote-sheet-card" className={`bg-white border border-blue-100 rounded-xl shadow-lg p-8 sm:p-12 font-serif text-gray-900 select-text leading-relaxed relative ${showForm ? 'xl:col-span-3' : 'xl:col-span-4'} print:col-span-4 print:w-full print:border-0 print:shadow-none print:p-0 print:m-0 print:block`}>
            
            {/* Actions Panel right above OFFICIAL OFFER */}
            <div data-html2canvas-ignore="true" className="absolute top-4 right-4 flex flex-wrap items-center justify-end gap-1.5 no-print select-none">
              <span className="text-[9px] font-sans font-extrabold text-blue-400 uppercase tracking-widest mr-1 hidden sm:inline">
                OFFER TOOLS:
              </span>
              <button
                onClick={handleDownloadPDF}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs font-sans"
                title="Download Quotation directly as high-resolution PDF file"
              >
                <FileCheck className="w-3.5 h-3.5 text-white" /> Save PDF Direct
              </button>
              <button
                onClick={handlePrint}
                className="px-2.5 py-1 bg-blue-50/75 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Open browser print preview / Save using System printer"
              >
                <Printer className="w-3.5 h-3.5 text-blue-700" /> Print / System PDF
              </button>
              <button
                onClick={handleDownloadImage}
                className="px-2.5 py-1 bg-blue-50/70 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Download Quotation as PNG Image"
              >
                <Save className="w-3.5 h-3.5 text-blue-700" /> Save Image
              </button>
              <button
                onClick={handleCopyImage}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm font-sans"
                title="Copy Full High-Res Image to Clipboard (Ctrl+V)"
              >
                <Clipboard className="w-3.5 h-3.5" /> Copy Full Image
              </button>
            </div>

            {/* Print Header Logo & Company info */}
            <div className="border-b-4 border-double border-blue-900 pb-5 text-center sm:text-left select-text pt-4 sm:pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 sm:mt-0">
                <div className="space-y-1">
                  <h1 className="text-2xl font-black font-sans uppercase tracking-wider text-blue-900">
                    {company || 'S.A. ENTERPRISES EXPORTS'}
                  </h1>
                  <p className="text-xs font-sans text-blue-700 font-bold uppercase tracking-widest">
                    Premium Quality Basmati & Non-Basmati Rice Merchant Exporters
                  </p>
                  <p className="text-[10.5px] font-sans text-gray-500 font-medium">
                    Office Block C-4, Terminal Zone, Mundra, India • Email: exports@saenterprises.co
                  </p>
                </div>
                {/* Visual badge */}
                <span className="hidden sm:inline border-2 border-blue-900 text-blue-900 px-3 py-1 font-sans text-xs font-extrabold uppercase tracking-widest scale-90 select-none">
                  OFFICIAL OFFER
                </span>
              </div>
            </div>

            {/* QUOTE GRID DESCRIPTION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 text-xs font-sans text-gray-800 leading-normal select-text">
              <div className="space-y-1.5">
                <span className="text-[9.5px] font-extrabold text-blue-700 tracking-wider uppercase block">CONSIGNED BUYER INTEREST:</span>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[9.5px] font-black px-1.5 py-0.5 rounded uppercase shrink-0" title="Buyer Initials">
                    {getInitials(buyer || 'CLIENT DETAILS')}
                  </span>
                  <div className="font-extrabold text-sm text-gray-900 uppercase">
                    M/S {buyer || 'CLIENT DETAILS'}
                  </div>
                </div>
                {buyerLoc && <div className="text-gray-500 uppercase flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {buyerLoc}</div>}
              </div>

              <div className="space-y-1 sm:text-right">
                <div className="flex justify-between sm:justify-end gap-3">
                  <span className="text-gray-400 font-bold uppercase">OFFER REF NO:</span>
                  <span className="font-mono font-bold text-gray-900 border-b border-gray-300 pb-px">{refNo || 'TBD'}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-3">
                  <span className="text-gray-400 font-bold uppercase">OFFER DATE:</span>
                  <span className="font-mono font-bold text-gray-900">{fmtDate(todayISO())}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-3">
                  <span className="text-gray-400 font-bold uppercase">VALD LIMIT:</span>
                  <span className="font-mono font-black text-rose-700">
                    {fmtDate(addDaysISO(todayISO(), parseInt(validDays) || 7))}
                  </span>
                </div>
                <div className="flex justify-between sm:justify-end gap-3">
                  <span className="text-gray-400 font-bold uppercase">INCOTERM ZONES:</span>
                  <span className="font-bold text-indigo-700 uppercase">{displayCond || 'CIF'}</span>
                </div>
              </div>
            </div>

            {/* GREETING TEXT */}
            <div className="text-xs my-4 leading-relaxed font-sans text-gray-700 select-text">
              Dear Sir/Madam,<br />
              We are pleased to submit our firm export quotation for the finest grades of Indian Origin Rice, processed with state-of-the-art milling technologies under strict hygiene controls. Herein we summarize our pricing offerings for your kind evaluation and purchase commitment:
            </div>

            {/* ITEMS TABLE */}
            <div className="my-6 ring-1 ring-blue-150 rounded-lg overflow-hidden select-text">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-950 to-blue-900 text-white font-extrabold uppercase text-[9.5px] tracking-wider select-none">
                    <th className="p-3">#</th>
                    <th className="p-3">Commodity & Grade Description</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3">Packaging Spec</th>
                    <th className="p-3 text-center">Double Master</th>
                    <th className="p-3 text-center">Crop Age</th>
                    <th className="p-3 text-right">Quoted Price (USD/MT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {chosenRates.map((row, idx) => {
                    const hasBlendDetails = row.commodity === 'BLENDED (MIX) RICE' || (row.blendRice1Name && row.blendRice2Name);
                    
                    return (
                      <React.Fragment key={row.id}>
                        {/* Primary Item Row */}
                        <tr className="hover:bg-blue-50/20 transition leading-snug">
                          <td className="p-3 align-middle text-gray-400 font-mono font-bold">{idx + 1}</td>
                          <td className="p-3 align-middle">
                            <div className="flex flex-wrap items-center gap-1.5 align-middle">
                              <span className="font-extrabold text-blue-950 uppercase">{row.commodity}</span>
                              <span className="inline-flex items-center text-[8.5px] font-mono font-black text-blue-700 bg-blue-50 border border-blue-150 px-1 py-0.2 rounded">
                                HS {getHsCodeForCommodity(row.commodity)}
                              </span>
                            </div>
                            {hasBlendDetails && (
                              <div className="text-[10px] text-blue-800 font-extrabold uppercase mt-0.5">
                                Spec Ratio: {row.blendRice1Pct || 70}% {row.blendRice1Name || 'Type 1'} &amp; {row.blendRice2Pct || 30}% {row.blendRice2Name || 'Type 2'}
                              </div>
                            )}
                            <div className="text-[10px] text-gray-405 font-medium">DEST: {row.dest}</div>
                            {row.transitTime && (
                              <div className="text-[10px] text-teal-700 font-bold font-sans flex items-center gap-1 mt-0.5 uppercase tracking-wide">
                                ⏱ Transit: {row.transitTime}
                              </div>
                            )}
                          </td>
                          <td className="p-3 align-middle font-mono font-bold text-gray-750 uppercase">{row.brand}</td>
                          <td className="p-3 align-middle text-gray-650">
                            <span className="font-semibold block">{row.packed}</span>
                            <span className="text-[10px] font-mono font-bold text-blue-600">{row.size}</span>
                          </td>
                          <td className="p-3 align-middle text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              row.master === 'YES' ? 'bg-slate-100 text-slate-800' : 'text-gray-300'
                            }`}>
                              {row.master}
                            </span>
                          </td>
                          <td className="p-3 align-middle text-center text-[10.5px] font-medium text-gray-500">
                            {row.crop} Crop ({row.year})
                          </td>
                          <td className="p-3 align-middle text-right font-mono font-black text-sm text-blue-900">
                            $ {row.rate.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[9px] font-normal text-gray-400 uppercase">/ MT</span>
                          </td>
                        </tr>

                        {/* Alternate Blends Table Row */}
                        {hasBlendDetails && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={7} className="p-3 bg-slate-50/30">
                              <div className="space-y-2.5 pl-6 pr-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-dashed border-gray-200 pb-1">
                                  <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                                    FORMULATION PRICING matrix (ALTERNATE BLEND RATIOS)
                                  </span>
                                  {row.blendCookingRemarks && (
                                    <span className="text-[10px] font-sans text-right italic text-indigo-900 font-semibold">
                                      * Remarks: &quot;{row.blendCookingRemarks}&quot;
                                    </span>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pb-1 text-left">
                                  {(() => {
                                    const r1Name = row.blendRice1Name || '1509 STEAM BASMATI RICE';
                                    const r2Name = row.blendRice2Name || 'PR-11 STEAM RICE';
                                    const r1Price = row.blendRice1ExMill !== undefined ? row.blendRice1ExMill : 78;
                                    const r2Price = row.blendRice2ExMill !== undefined ? row.blendRice2ExMill : 44;

                                    // Extract cost coefficients
                                    const rPkg = row.bPackaging !== undefined ? row.bPackaging : 0.9;
                                    const rTrans = row.bTransport !== undefined ? row.bTransport : 1.2;
                                    const rCfs = row.bCfsPort !== undefined ? row.bCfsPort : 0.45;
                                    const rFr = row.bFreight !== undefined ? row.bFreight : 3.5;
                                    const rIns = row.bInsurance !== undefined ? row.bInsurance : 0;
                                    const rDuty = row.dutyPct !== undefined ? row.dutyPct : 20;
                                    const rEx = row.exrate !== undefined ? row.exrate : 91.5;
                                    const rCom = row.commission !== undefined ? row.commission : 0;

                                    const ratios = [
                                      { r1: 90, r2: 10 },
                                      { r1: 80, r2: 20 },
                                      { r1: 70, r2: 30 },
                                      { r1: 60, r2: 40 },
                                      { r1: 50, r2: 50 }
                                    ];

                                    return ratios.map((ratio) => {
                                      const calculatedRate = calculateAlternateBlendRate(
                                        ratio.r1,
                                        ratio.r2,
                                        r1Price,
                                        r2Price,
                                        rPkg,
                                        rTrans,
                                        rCfs,
                                        rFr,
                                        rIns,
                                        rDuty,
                                        rEx,
                                        rCom
                                      );

                                      const isRowActiveSelection = (row.blendRice1Pct === ratio.r1 && row.blendRice2Pct === ratio.r2) || (!row.blendRice1Pct && ratio.r1 === 70);

                                      return (
                                        <div 
                                          key={`${ratio.r1}-${ratio.r2}`}
                                          className={`px-3 py-2 rounded-lg border transition-all flex flex-col justify-center ${
                                            isRowActiveSelection 
                                              ? 'bg-blue-50/90 border-blue-400 shadow-2xs font-bold ring-2 ring-blue-100/40' 
                                              : 'bg-white border-gray-200 hover:border-blue-200'
                                          }`}
                                        >
                                          <div className="text-[10px] font-extrabold text-blue-950 flex justify-between">
                                            <span>{ratio.r1}% {r1Name.split(' ')[0]}</span>
                                            <span className="text-gray-400 font-normal">/</span>
                                            <span>{ratio.r2}% {r2Name.split(' ')[0]}</span>
                                          </div>
                                          
                                          <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-blue-100/50 font-mono">
                                            <span className="text-[8px] text-gray-400">₹{((r1Price * ratio.r1 + r2Price * ratio.r2) / 100).toFixed(1)}/kg</span>
                                            <span className="text-[10.5px] font-black text-blue-900 text-right">
                                              $ {calculatedRate.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              {isRowActiveSelection && <span className="text-[8px] text-blue-700 ml-1 font-sans font-black">★</span>}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
 
            {/* CONDITIONS BLOCK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8 border-t border-blue-200 pt-6 select-text">
              <div className="space-y-4 font-sans text-xs">
                <div className="space-y-1">
                  <span className="text-[9.5px] font-extrabold text-blue-500 uppercase tracking-widest block">PAYMENT TERMS SUMMARY</span>
                  <p className="font-extrabold text-blue-900 uppercase leading-snug">
                    {displayPayments || 'LC at Sight, or TT 20% Advance + 80% Draft Cad'}
                  </p>
                </div>
 
                <div className="space-y-1">
                  <span className="text-[9.5px] font-extrabold text-blue-500 uppercase tracking-widest block">PORT LOADING CAPACITY</span>
                  <p className="text-gray-600 font-medium">
                    Stuffed 26 Metric Tonnes per 20' Heavy Container Build (FCL).
                  </p>
                </div>
              </div>
 
              {/* Signature boxes */}
              <div className="flex flex-col justify-between items-end pr-3 select-none">
                <div className="text-right font-sans text-xs space-y-1">
                  <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider block">ACCEPTED BUYER SIGNATURE / SEAL:</span>
                  <div className="h-16 w-44 border border-dashed border-blue-200 rounded-lg mt-1 mb-2"></div>
                  <div className="font-extrabold text-gray-800 uppercase text-[11px]">{buyer || 'M/S CLIENT CO'}</div>
                  <div className="text-[10px] text-gray-400">Date: ____ / ____ / 2026</div>
                </div>
              </div>
            </div>
 
            {/* TERMS AND COND (PREFILL) */}
            <div className="mt-8 border-t border-blue-100 pt-5 font-sans text-[10px] text-gray-500 space-y-2 select-text">
              <span className="font-extrabold text-blue-900 uppercase tracking-widest block">CONTRACTUAL EXPORTER AGREEMENT CONDITIONS:</span>
              <p className="whitespace-pre-line leading-normal font-medium">
                {additionalTerms || '1. Offer is governed strictly by state-level cereal crop board regulations.\n2. Invoices are subject to FOB packing parameters.'}
              </p>
            </div>
 
            {/* Export disclaimer */}
            <div className="border-t border-blue-100 mt-10 pt-4 text-center font-sans text-[9px] text-gray-400 tracking-wider font-semibold select-none">
              THIS IS AN ELECTRONICALLY GENERATED QUOTATION VALIDATED LOCAL REGISTER. NO SIGNATURE IS REQUIRED BY DEFAULT DELEGATOR.
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
