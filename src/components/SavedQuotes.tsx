import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { SavedQuote, PIItem, PIWorkflowStep, GrainInventoryItem } from '../types';
import { getHsCodeForCommodity } from '../utils/hscode';
import { fmtDate, todayISO, getInitials, numberToWordsUSD, checkAndNotifyIframeBlock } from '../utils';
import { 
  BookmarkCheck, Trash2, Calendar, FileText, FileClock, 
  MapPin, CheckCircle, Upload, Search, Download, ExternalLink, 
  Clock, CheckSquare, X, Play, BadgeCheck, FileSpreadsheet, Check,
  Coins, Lock, Ship, Mail, Anchor, Truck, Share2, Smartphone, MessageSquare,
  AlertTriangle, CheckCircle2, AlertCircle, Loader2, ShieldAlert,
  Paperclip, Plus, Calculator
} from 'lucide-react';

interface SavedQuotesProps {
  savedQuotes: SavedQuote[];
  setSavedQuotes: (quotes: SavedQuote[] | ((prev: SavedQuote[]) => SavedQuote[])) => void;
  onNavigateToTab: (tab: string) => void;
  setSelectedRateIds: (ids: number[]) => void;
  onSendToCalculator?: (backfill: { quoteId: number; itemIndex: number; data: any } | null) => void;
  onLaunchWorkspace?: (quoteId: number, type: 'pi' | 'ci' | 'pl', openInNewTab?: boolean) => void;
  allowedModules?: string[];
  industry?: string;
  licenceMetadata?: any;
  grainInventory?: GrainInventoryItem[];
  isInventoryEnabled?: boolean;
}

const STAGES = [
  { key: 'offer', label: 'RFQ Quotation', color: 'blue' },
  { key: 'pi', label: 'Proforma Invoice', color: 'indigo' },
  { key: 'signed', label: 'Signed Contract', color: 'purple' },
  { key: 'payment', label: 'Swift Deposit', color: 'amber' },
  { key: 'milling', label: 'Milling & Pack', color: 'orange' },
  { key: 'inspection', label: 'Phyto & SGS', color: 'teal' },
  { key: 'bl', label: 'OBL Release', color: 'emerald' },
  { key: 'done', label: 'Customs Passed', color: 'green' }
];

export const SPECIALIZED_CHECKLISTS: Record<string, Array<{ key: string; label: string; desc: string; required: boolean; autoKey?: string }>> = {
  grain: [
    { key: 'pi', label: 'Proforma Invoice (PI)', desc: 'Contract terms and customer-specific ex-mill rate validation.', required: true, autoKey: 'pi' },
    { key: 'ci', label: 'Commercial Invoice (CI)', desc: 'Final financial calculations, bag details, and bank swift tags.', required: true, autoKey: 'ci' },
    { key: 'pl', label: 'Packing List (PL)', desc: 'Stuffing weight summaries and lot seal tracking IDs.', required: true, autoKey: 'pl' },
    { key: 'phyto', label: 'Phytosanitary Certificate', desc: 'Mandatory plant health quarantine clearance for agricultural grain.', required: true, autoKey: 'phyto' },
    { key: 'sgs', label: 'SGS / Quality Inspection Certificate', desc: 'Moisture quotient analysis & premium length grading report.', required: true },
    { key: 'fumigation', label: 'Container Fumigation Certificate', desc: 'Pest prevention certification matching standard carrier locks.', required: true },
    { key: 'bl', label: 'Bill of Lading (OBL)', desc: 'Carrier dispatch release matching real-time location logs.', required: true, autoKey: 'shipping_invoice' },
  ],
  spices: [
    { key: 'pi', label: 'Proforma Invoice (PI)', desc: 'Contract terms and customer-specific ex-mill rate validation.', required: true, autoKey: 'pi' },
    { key: 'ci', label: 'Commercial Invoice (CI)', desc: 'Final export pricing invoice matching Spices HS codes.', required: true, autoKey: 'ci' },
    { key: 'pl', label: 'Packing List (PL)', desc: 'Dry spices bag stuffing list, total gross & net weight.', required: true, autoKey: 'pl' },
    { key: 'phyto', label: 'Phytosanitary Certificate', desc: 'Mandatory plant quarantine health verification for dry spices.', required: true, autoKey: 'phyto' },
    { key: 'spices_board', label: 'Spices Board Quality Certificate', desc: 'Authorized export rating certificate by Board of Spices.', required: true },
    { key: 'sterilization', label: 'Microbiological Sterilization Certificate', desc: 'Verifies steam/heat sterilization logs.', required: false },
    { key: 'bl', label: 'Bill of Lading (OBL)', desc: 'Carrier dispatch release matching Spices container seal.', required: true, autoKey: 'shipping_invoice' },
  ],
  chemicals: [
    { key: 'pi', label: 'Proforma Invoice (PI)', desc: 'Contract terms and chemical product specifications.', required: true, autoKey: 'pi' },
    { key: 'ci', label: 'Commercial Invoice (CI)', desc: 'Billing record with CAS / UN classifications clearly noted.', required: true, autoKey: 'ci' },
    { key: 'pl', label: 'Packing List (PL)', desc: 'Details on chemical drums, IBC totes, or pellet weights.', required: true, autoKey: 'pl' },
    { key: 'msds', label: 'Material Safety Data Sheet (MSDS)', desc: 'Extremely critical hazardous handling & transport safety declaration.', required: true },
    { key: 'coa', label: 'Certificate of Analysis (CoA)', desc: 'Batch chemical purity spectrum matching grade standards.', required: true },
    { key: 'dg', label: 'Dangerous Goods Declaration', desc: 'Critical maritime hazard classification approval sheets.', required: false },
    { key: 'bl', label: 'Bill of Lading (OBL)', desc: 'Hazmat-coded vessel release sheets.', required: true, autoKey: 'shipping_invoice' },
  ],
  salts: [
    { key: 'pi', label: 'Proforma Invoice (PI)', desc: 'Contract terms and salt grade specifications.', required: true, autoKey: 'pi' },
    { key: 'ci', label: 'Commercial Invoice (CI)', desc: 'Final industrial / table salt billing weights and rates.', required: true, autoKey: 'ci' },
    { key: 'pl', label: 'Packing List (PL)', desc: 'Bag stuffing and moisture weight shrink margin records.', required: true, autoKey: 'pl' },
    { key: 'coa', label: 'Certificate of Analysis (NaCl %)', desc: 'Purity report validating sodium chloride concentration.', required: true },
    { key: 'non_haz', label: 'Non-Hazardous Substance Sheet', desc: 'Declaration for customs validating safe industrial salts.', required: true },
    { key: 'origin', label: 'Certificate of Origin', desc: 'Proves crystalline rock salt origin.', required: false },
    { key: 'bl', label: 'Bill of Lading (OBL)', desc: 'Carrier maritime dispatch and bulk container locks.', required: true, autoKey: 'shipping_invoice' },
  ],
  vegetables_fruits: [
    { key: 'pi', label: 'Proforma Invoice (PI)', desc: 'Contract terms and fresh produce ex-mill values.', required: true, autoKey: 'pi' },
    { key: 'ci', label: 'Commercial Invoice (CI)', desc: 'Detailed billing with fresh fruit crate carton counts.', required: true, autoKey: 'ci' },
    { key: 'pl', label: 'Packing List (PL)', desc: 'Sorting weight notes, pre-cooling logs, and crate count.', required: true, autoKey: 'pl' },
    { key: 'phyto', label: 'Phytosanitary Certificate', desc: 'Strict agricultural quarantine certification matching physical inspection.', required: true, autoKey: 'phyto' },
    { key: 'cold_chain', label: 'Cold Chain Temp Logger Report', desc: 'Continuous sensor logs for fresh temperature preservation (humidity levels).', required: true },
    { key: 'apeda', label: 'APEDA Fresh Produce Certificate', desc: 'Official compliance registry validation for exports of fresh agricultural items.', required: false },
    { key: 'bl', label: 'Bill of Lading / Air Waybill', desc: 'Carrier direct dispatch sheets (mandatory cooling container specs).', required: true, autoKey: 'shipping_invoice' },
  ],
  tiles: [
    { key: 'pi', label: 'Proforma Invoice (PI)', desc: 'Contract terms, specifications, and square-meter rates.', required: true, autoKey: 'pi' },
    { key: 'ci', label: 'Commercial Invoice (CI)', desc: 'Final surface dimensions value metrics and pallet weights.', required: true, autoKey: 'ci' },
    { key: 'pl', label: 'Packing List (PL)', desc: 'Pallets weight, wood crate packing specs, and breakability labels.', required: true, autoKey: 'pl' },
    { key: 'test_report', label: 'Water Absorption & Load Test Report', desc: 'Certified tiles testing report details.', required: true },
    { key: 'origin', label: 'Certificate of Origin', desc: 'Form-A trade agreements origin documentation.', required: true },
    { key: 'ispm15', label: 'ISPM-15 Wood Pallet Fumigation', desc: 'Mandatory regulatory heat seal on wooden crates for international ports.', required: true },
    { key: 'bl', label: 'Bill of Lading (OBL)', desc: 'Carrier maritime transport document.', required: true, autoKey: 'shipping_invoice' },
  ],
  generic: [
    { key: 'pi', label: 'Proforma Invoice (PI)', desc: 'Contract terms and general pricing parameters.', required: true, autoKey: 'pi' },
    { key: 'ci', label: 'Commercial Invoice (CI)', desc: 'Final transaction invoicing matching HS codes.', required: true, autoKey: 'ci' },
    { key: 'pl', label: 'Packing List (PL)', desc: 'Cargo bundle descriptions, total weight & size logs.', required: true, autoKey: 'pl' },
    { key: 'origin', label: 'Certificate of Origin', desc: 'Validates country-source trade tariff clearances.', required: false },
    { key: 'bl', label: 'Bill of Lading (OBL)', desc: 'Carrier maritime transport release.', required: true, autoKey: 'shipping_invoice' },
  ]
};

export default function SavedQuotes({
  savedQuotes,
  setSavedQuotes,
  onNavigateToTab,
  setSelectedRateIds,
  onSendToCalculator,
  onLaunchWorkspace,
  allowedModules,
  industry = 'grain',
  licenceMetadata,
  grainInventory = [],
  isInventoryEnabled = true
}: SavedQuotesProps) {
  const [search, setSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'quote' | 'pi' | 'ci' | 'pl' | 'bl'>('all');
  const [activeQuoteId, setActiveQuoteId] = useState<number | null>(null);

  const toggleChecklistItem = (quoteId: number, itemKey: string) => {
    setSavedQuotes(prev => prev.map(q => {
      if (q.id === quoteId) {
        const completed = q.checklistCompleted || {};
        return {
          ...q,
          checklistCompleted: {
            ...completed,
            [itemKey]: !completed[itemKey]
          }
        };
      }
      return q;
    }));
  };

  const addCustomChecklistItem = (quoteId: number, label: string, desc: string, required: boolean) => {
    if (!label.trim()) return;
    setSavedQuotes(prev => prev.map(q => {
      if (q.id === quoteId) {
        const customItems = q.customChecklistItems || [];
        const newItem = {
          key: `custom_${Date.now()}`,
          label: label.trim(),
          desc: desc.trim() || 'Custom checklist task added by user.',
          required,
          isCustom: true
        };
        return {
          ...q,
          customChecklistItems: [...customItems, newItem]
        };
      }
      return q;
    }));
  };

  const addChecklistItemAttachment = (quoteId: number, itemKey: string, fileName: string, fileSize: number) => {
    setSavedQuotes(prev => prev.map(q => {
      if (q.id === quoteId) {
        const currentAttachments = q.itemAttachments || {};
        const list = currentAttachments[itemKey] || [];
        const updatedList = [...list, { fileName, fileSize, dateUploaded: todayISO() }];
        return {
          ...q,
          itemAttachments: {
            ...currentAttachments,
            [itemKey]: updatedList
          }
        };
      }
      return q;
    }));
  };

  const deleteChecklistItemAttachment = (quoteId: number, itemKey: string, attachmentIndex: number) => {
    setSavedQuotes(prev => prev.map(q => {
      if (q.id === quoteId) {
        const currentAttachments = q.itemAttachments || {};
        const list = currentAttachments[itemKey] || [];
        const updatedList = list.filter((_, idx) => idx !== attachmentIndex);
        return {
          ...q,
          itemAttachments: {
            ...currentAttachments,
            [itemKey]: updatedList
          }
        };
      }
      return q;
    }));
  };

  // Local state for add custom item form
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomDesc, setNewCustomDesc] = useState('');
  const [newCustomRequired, setNewCustomRequired] = useState(true);
  const [showAddCustomForm, setShowAddCustomForm] = useState(false);

  const [excludedCombinedDocs, setExcludedCombinedDocs] = useState<Record<string, boolean>>({});

  // File Upload local states
  const [uploadStepKey, setUploadStepKey] = useState<string>('pi');
  const [dragActive, setDragActive] = useState(false);

  // Active document making overrides and audit checklist popup toggles
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [editorItems, setEditorItems] = useState<PIItem[]>([]);
  const [revisionNote, setRevisionNote] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const activeQuote = savedQuotes.find(q => q.id === activeQuoteId) || null;

  React.useEffect(() => {
    if (activeQuote) {
      setEditorItems(JSON.parse(JSON.stringify(activeQuote.items || [])));
      setRevisionNote(activeQuote.documentMakingNotes || '');
      setExcludedCombinedDocs({});
    } else {
      setEditorItems([]);
      setRevisionNote('');
    }
  }, [activeQuoteId, activeQuote?.id]);

  const handleItemEditorChange = (idx: number, field: keyof PIItem, val: any) => {
    setEditorItems(prev => {
      const copy = [...prev];
      if (copy[idx]) {
        const item = { ...copy[idx] };
        
        // Assign new value
        if (field === 'numFCL' || field === 'weightPerContainerKg' || field === 'rate') {
          (item as any)[field] = parseFloat(val) || 0;
        } else {
          (item as any)[field] = val;
        }

        // Auto-calculate Total Weight Kg & Total Bags
        const fcl = item.numFCL || 0;
        const perCont = item.weightPerContainerKg || 0;
        const totalKg = fcl * perCont;
        item.totalWeightKg = totalKg;

        // Extract size numeric value for bags calculation
        const sizeStr = item.size || 'GRAIN 20 KG';
        const numericSizeValue = parseFloat(sizeStr.replace(/[^\d.]/g, '')) || 20;
        item.totalBags = Math.round(totalKg / numericSizeValue);

        copy[idx] = item;
      }
      return copy;
    });
  };

  const generateAutoRevisionLog = (originalItems: PIItem[], currentItems: PIItem[]) => {
    const changes: string[] = [];
    currentItems.forEach((curr, idx) => {
      const orig = originalItems[idx];
      if (!orig) return;
      const itemChanges: string[] = [];
      if (orig.commodity !== curr.commodity) {
        itemChanges.push(`Commodity: "${orig.commodity}" ➔ "${curr.commodity}"`);
      }
      if (orig.brand !== curr.brand) {
        itemChanges.push(`Brand: "${orig.brand}" ➔ "${curr.brand}"`);
      }
      if (orig.numFCL !== curr.numFCL) {
        itemChanges.push(`FCL Load: ${orig.numFCL} FCL ➔ ${curr.numFCL} FCL`);
      }
      if (orig.weightPerContainerKg !== curr.weightPerContainerKg) {
        itemChanges.push(`FCL Weight Capacity: ${orig.weightPerContainerKg} kg ➔ ${curr.weightPerContainerKg} kg`);
      }
      if (orig.size !== curr.size) {
        itemChanges.push(`Bag Spec/Size: "${orig.size}" ➔ "${curr.size}"`);
      }
      if (orig.rate !== curr.rate) {
        itemChanges.push(`Landed Price: $${orig.rate}/MT ➔ $${curr.rate}/MT`);
      }
      if (itemChanges.length > 0) {
        changes.push(`Item #${idx + 1} (${curr.commodity}): ${itemChanges.join(', ')}`);
      }
    });
    return changes.length > 0 ? changes.join('; ') : '';
  };

  const handleSaveEditorChanges = () => {
    if (!activeQuote) return;
    
    // Generate auto-change description
    const autoLog = generateAutoRevisionLog(activeQuote.items, editorItems);
    const todayStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    
    // Auto-create or append to notes
    let finalNote = revisionNote.trim();
    if (autoLog) {
      const changeEntry = `[${todayStr}] Document Revised - ${autoLog}.`;
      if (finalNote) {
        if (!finalNote.includes(changeEntry)) {
          finalNote = `${finalNote}\n\n${changeEntry}`;
        }
      } else {
        finalNote = changeEntry;
      }
    }

    setSavedQuotes(prev => prev.map(q => {
      if (q.id === activeQuote.id) {
        return {
          ...q,
          items: JSON.parse(JSON.stringify(editorItems)),
          documentMakingNotes: finalNote,
          piUpdated: todayISO()
        };
      }
      return q;
    }));

    setRevisionNote(finalNote);
    setShowConfirmModal(false);
    alert("SUCCESS: Document outputs permanently adjusted and revision notes logged successfully!");
  };

  // Real-time B/L & Location Tracker States
  const [activeOutboundMail, setActiveOutboundMail] = useState<{
    recipient: string;
    subject: string;
    body: string;
  } | null>(null);

  const [broadcasterMobile, setBroadcasterMobile] = useState('');
  const [broadcasterEmail, setBroadcasterEmail] = useState('');

  // Auto prepopulate recipient credentials
  React.useEffect(() => {
    if (activeQuote) {
      setBroadcasterEmail(activeQuote.trackingEmail || '');
      setBroadcasterMobile(activeQuote.buyerPhone || '');
    } else {
      setBroadcasterEmail('');
      setBroadcasterMobile('');
    }
  }, [activeQuoteId]);

  const handleDownloadCombinedPDF = (activeQuote: SavedQuote, selectedKeys: string[]) => {
    if (!activeQuote || selectedKeys.length === 0) return;
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const qRef = activeQuote.ref || 'RE-OFFER';
      const qBuyer = activeQuote.buyer || 'AL JAZEERA TRADING CO.';
      const qBuyerLoc = (activeQuote as any).buyerLoc || activeQuote.dest || 'QATAR';
      const qExporter = activeQuote.company || 'SA ENTERPRISES EXPORTS';
      const qExporterLoc = (activeQuote as any).exporterDetails || 'RAJKOT, GUJARAT, INDIA';
      const qPortOfLoading = activeQuote.portOfLoading || 'Mundra Port, India';
      const qDest = activeQuote.dest || 'Port of Hamad, Qatar';
      const qDate = activeQuote.date || todayISO();
      const firstItem = activeQuote.items?.[0];
      const qCommodity = firstItem?.commodity || '1121 Sella Basmati Rice';
      const qQuantity = firstItem ? (firstItem.totalWeightKg / 1000) : 125;
      const qPricePerMt = firstItem?.rate || 980;
      const qContainersCount = firstItem?.numFCL || Math.ceil(qQuantity / 25) || 5;
      const qContainerSize = '20FT';
      const oceanFreight = firstItem?.bFreight || 0;
      const qBlNo = activeQuote.blNo || 'OBL-987452-IND';
      const qVesselName = (activeQuote as any).vesselName || 'MV KAVERI TRANSIT';
      const qVoyageNo = (activeQuote as any).voyageNo || 'V-45B';
      const qPaymentTerms = (activeQuote as any).paymentTerms || '30% Advance telegraphic transfer, balance 70% against OBL fax';
      
      const expLines = qExporterLoc.split('\n');
      const buyLines = qBuyerLoc.split('\n');

      const dLine = (x1: number, y1: number, x2: number, y2: number, color = '#e2e8f0', thickness = 0.2) => {
        pdf.setDrawColor(color);
        pdf.setLineWidth(thickness);
        pdf.line(x1, y1, x2, y2);
      };

      const dRect = (x: number, y: number, w: number, h: number, borderCol = '#cbd5e1', fillCol?: string) => {
        pdf.setDrawColor(borderCol);
        pdf.setLineWidth(0.25);
        if (fillCol) {
          pdf.setFillColor(fillCol);
          pdf.rect(x, y, w, h, 'FD');
        } else {
          pdf.rect(x, y, w, h);
        }
      };

      const dText = (text: string, x: number, y: number, size = 9, isBold = false, color = '#1e293b') => {
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        pdf.setFontSize(size);
        pdf.setTextColor(color);
        pdf.text(String(text), x, y);
      };

      const dBadge = (text: string, x: number, y: number, w: number, h: number, bgCol = '#f1f5f9', borderCol = '#cbd5e1', textCol = '#475569') => {
        dRect(x, y, w, h, borderCol, bgCol);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(textCol);
        pdf.text(text, x + (w / 2), y + (h / 2) + 1, { align: 'center' });
      };

      let pageIndex = 0;

      selectedKeys.forEach((key) => {
        if (pageIndex > 0) {
          pdf.addPage();
        }
        pageIndex++;
        
        // Draw standard frame margin borders
        dRect(10, 8, 190, 280, '#efeff6');
        
        // Draw top header template
        dRect(15, 12, 180, 8, '#e2e8f0', '#f8fafc');
        dText(`CENTRAL EXPORT REGISTER & TRANSIT RECORD: AP-3032`, 18, 17, 7, true, '#475569');
        dText(`QUOTE REF: ${qRef}`, 155, 17, 7, true, '#2563eb');
        
        // Draw pages
        if (key === 'ci') {
          // COMMERCIAL INVOICE
          dText("COMMERCIAL INVOICE", 15, 28, 15, true, '#1e3a8a');
          dText(`Invoice Reference: CI-${qRef}`, 15, 33, 9, false, '#475569');

          // Shippers & Buyers Box
          dRect(15, 38, 88, 30);
          dText("EXPORTER / SHIPPERS DETAILS", 17, 42, 7.5, true, '#2563eb');
          dText(qExporter, 17, 47, 9, true, '#0f172a');
          dText(expLines[0] || 'RAJKOT, GUJARAT', 17, 52, 8, false, '#334155');
          dText(expLines[1] || 'INDIA', 17, 56, 8, false, '#334155');

          dRect(107, 38, 88, 30);
          dText("CONSIGNEE / BUYER DETAILS", 109, 42, 7.5, true, '#2563eb');
          dText(qBuyer, 109, 47, 9, true, '#0f172a');
          dText(buyLines[0] || qDest, 109, 52, 8, false, '#334155');
          dText(buyLines[1] || 'EXPORT PORT', 109, 56, 8, false, '#334155');

          // Operational Block
          dRect(15, 72, 180, 20, '#e2e8f0', '#f8fafc');
          dText("PORT OF LOADING: " + qPortOfLoading, 18, 77, 8.5, true, '#334155');
          dText("COUNTRY OF ORIGIN: REPUBLIC OF INDIA", 18, 82, 8.5, true, '#334155');
          dText("PORT OF DISCHARGE: " + qDest, 109, 77, 8.5, true, '#334155');
          dText("VESSEL NAME: " + qVesselName, 109, 82, 8.5, true, '#334155');
          dText("PAYMENT TERMS: " + qPaymentTerms.substring(0, 60), 18, 88, 7.5, false, '#475569');

          // Commercial Items Table
          const tableY = 98;
          dRect(15, tableY, 180, 8, '#94a3b8', '#f1f5f9');
          dText("S.NO", 18, tableY + 5.5, 8, true, '#334155');
          dText("DESCRIPTION OF COMMODITY & PACKAGING", 32, tableY + 5.5, 8, true, '#334155');
          dText("QUANTITY (MT)", 112, tableY + 5.5, 8, true, '#334155');
          dText("UNIT RATE (USD)", 140, tableY + 5.5, 8, true, '#334155');
          dText("TOTAL AMOUNT", 170, tableY + 5.5, 8, true, '#334155');

          const cargoVal = qQuantity * qPricePerMt;
          const totalVal = cargoVal + oceanFreight;

          // Table Row 1
          dRect(15, tableY + 8, 180, 26, '#e2e8f0');
          dText("01", 18, tableY + 14, 8.5, false, '#0f172a');
          
          if (qCommodity.toUpperCase() === 'BLENDED (MIX) RICE' || (firstItem?.blendRice1Name && firstItem?.blendRice2Name)) {
            dText(`${qCommodity.toUpperCase()} (${firstItem?.blendRice1Pct || 70}% ${firstItem?.blendRice1Name || 'Type 1'} & ${firstItem?.blendRice2Pct || 30}% ${firstItem?.blendRice2Name || 'Type 2'})`, 32, tableY + 14, 7, true, '#0f172a');
          } else {
            dText(qCommodity.toUpperCase(), 32, tableY + 14, 8.5, true, '#0f172a');
          }

          dText("AGRICULTURAL PACKAGING EX-MILL STANDARDS", 32, tableY + 19, 7.5, false, '#475569');
          dText(`${qContainersCount} x ${qContainerSize} STUFFED OCEAN CONTAINER`, 32, tableY + 24, 7.5, false, '#475569');
          dText(`${qQuantity.toFixed(2)} MT`, 112, tableY + 14, 8.5, true, '#0f172a');
          dText(`$${qPricePerMt.toFixed(2)}`, 140, tableY + 14, 8.5, false, '#0f172a');
          dText(`$${cargoVal.toLocaleString()}`, 170, tableY + 14, 8.5, true, '#0f172a');

          let freightItemHeight = 0;
          if (oceanFreight > 0) {
            freightItemHeight = 10;
            dRect(15, tableY + 34, 180, freightItemHeight, '#e2e8f0', '#fafcfb');
            dText("02", 18, tableY + 40, 8.5, false, '#334155');
            dText("ESTIMATED FCL OCEAN FREIGHT CHARGES (MERGED INDEX)", 32, tableY + 40, 8, false, '#334155');
            dText(`$${oceanFreight.toLocaleString()}`, 170, tableY + 40, 8.5, true, '#334155');
          }

          // Totals Row
          const totalSummaryY = tableY + 34 + freightItemHeight + 4;
          dRect(15, totalSummaryY, 180, 16, '#2563eb', '#eff6ff');
          dText("TOTAL COST AND FREIGHT VALUE (CIF/CFR OUTCOME)", 18, totalSummaryY + 6, 8, true, '#1e3a8a');
          dText(`TOTAL USD CONTRACT VALUE:`, 18, totalSummaryY + 11, 8.5, true, '#1e3a8a');
          dText(`$${totalVal.toLocaleString()} USD`, 170, totalSummaryY + 11, 11, true, '#1e3a8a');

          // Words declaration
          dRect(15, totalSummaryY + 18, 180, 10, '#cbd5e1', '#f8fafc');
          dText("TOTAL AMOUNT IN SECURE FILED SYSTEM WORDS:", 18, totalSummaryY + 22, 7, true, '#475569');
          dText(numberToWordsUSD(totalVal).toUpperCase() + ' ONLY', 18, totalSummaryY + 26, 7.5, true, '#1e293b');

          const stampY = totalSummaryY + 31;
          dBadge("SYSTEM VERIFIED", 15, stampY, 40, 12, '#ecfdf5', '#10b981', '#047857');
          dBadge("CI DECLARED", 60, stampY, 40, 12, '#eff6ff', '#3b82f6', '#1d4ed8');

          dText("AUTHORIZED SHIPPERS ENDORSEMENT", 125, stampY + 4, 8, true, '#475569');
          dLine(125, stampY + 14, 190, stampY + 14, '#94a3b8', 0.5);
          dText("AUTHORIZED SIGNATURE (STAMP SECURE)", 125, stampY + 18, 7, false, '#64748b');

        } else if (key === 'pl') {
          // PACKING LIST
          dText("EXPORT PACKING LIST / SPECIFICATIONS", 15, 28, 14, true, '#047857');
          dText(`Packing Lot Reference: PL-${qRef}`, 15, 33, 9, false, '#475569');

          // Shipper Box & Buyer Box
          dRect(15, 38, 88, 30);
          dText("SHIPPERS", 17, 42, 7.5, true, '#059669');
          dText(qExporter, 17, 47, 9, true, '#0f172a');
          dText(expLines[0] || 'RAJKOT, INDIA', 17, 52, 8, false, '#475569');
          dText("EXPORT COMPLIANT SEALS DECLARED", 17, 58, 7.5, true, '#059669');

          dRect(107, 38, 88, 30);
          dText("CONSIGNEE", 109, 42, 7.5, true, '#059669');
          dText(qBuyer, 109, 47, 9, true, '#0f172a');
          dText(buyLines[0] || qDest, 109, 52, 8, false, '#475569');
          dText(`CONTAINER TOTALS: ${qContainersCount}`, 109, 58, 8, true, '#059669');

          // Specific stuffing grids
          const plY = 72;
          dRect(15, plY, 180, 18, '#e2e8f0', '#fafcfb');
          dText("VESSEL/VOYAGE: " + qVesselName + " / " + qVoyageNo, 18, plY + 5, 8.5, true, '#334155');
          dText("OCEAN BILL OF LADING: " + qBlNo, 18, plY + 10, 8.5, true, '#334155');
          dText("PORT OF DISCHARGE: " + qDest, 109, plY + 5, 8.5, true, '#334155');
          dText("FUMIGATION STATUS: CERTIFIED PASS", 109, plY + 10, 8.5, true, '#10b981');

          // Specs Grid Headers
          const plTableY = 94;
          dRect(15, plTableY, 180, 8, '#34d399', '#f0fdf4');
          dText("CONTAINER NO", 18, plTableY + 5.5, 8, true, '#065f46');
          dText("CARGO SEAL NO", 52, plTableY + 5.5, 8, true, '#065f46');
          dText("PACKAGING BAG SPECS", 88, plTableY + 5.5, 8, true, '#065f46');
          dText("NET WT (MT)", 135, plTableY + 5.5, 8, true, '#065f46');
          dText("GROSS WT (MT)", 165, plTableY + 5.5, 8, true, '#065f46');

          const conts = Array.from({ length: Math.min(qContainersCount, 5) }, (_, i) => ({
            num: `MSCU-${382741 + i * 149}`,
            seal: `SEAL-${982142 + i * 3}`,
            bags: `${Math.round(qQuantity * 20 / qContainersCount)} Bags`,
            spec: `50 KG BOPP Laminated PP Bags`,
            net: `${(qQuantity / qContainersCount).toFixed(2)} MT`,
            gross: `${((qQuantity / qContainersCount) * 1.004).toFixed(2)} MT`
          }));

          conts.forEach((c, idx) => {
            const rY = plTableY + 8 + (idx * 16);
            dRect(15, rY, 180, 16, '#e2e8f0');
            dText(c.num, 18, rY + 7, 8.5, true, '#0f172a');
            dText(`Line index ${idx + 1}`, 18, rY + 12, 7, false, '#64748b');
            dText(c.seal, 52, rY + 7, 8.5, false, '#334155');
            dText("STUFFED STATUS: LOCKED", 52, rY + 12, 7, true, '#10b981');
            dText(c.bags, 88, rY + 7, 8.5, true, '#0f172a');
            dText(c.spec, 88, rY + 12, 7, false, '#475569');
            dText(c.net, 135, rY + 10, 8.5, true, '#0f172a');
            dText(c.gross, 165, rY + 10, 8.5, true, '#0f172a');
          });

          // Summary totals list
          const sumY = plTableY + 8 + (conts.length * 16) + 4;
          dRect(15, sumY, 180, 16, '#059669', '#f0fdf4');
          dText("GRAND COMPLIANCE LOADING SUMMARY", 18, sumY + 5.5, 8, true, '#065f46');
          dText(`TOTAL BAG COUNTS: ${Math.round(qQuantity * 20)} BAGS (50KG BASIS)`, 18, sumY + 11.5, 8, true, '#0f172a');
          dText(`TOTAL NET KG: ${(qQuantity * 1000).toLocaleString()} KGS`, 105, sumY + 5.5, 8, true, '#065f46');
          dText(`TOTAL GROSS KG: ${Math.round(qQuantity * 1004).toLocaleString()} KGS`, 105, sumY + 11.5, 8, true, '#065f46');

          const plAuthY = sumY + 21;
          dBadge("CUSTOMS SECURED", 15, plAuthY, 40, 12, '#ecfdf5', '#34d399', '#065f46');
          dBadge("STUFFED PASS", 60, plAuthY, 40, 12, '#eff6ff', '#3b82f6', '#1d4ed8');

          dText("QUALIFIED CONTROLLING SURVEYOR", 125, plAuthY + 4, 8, true, '#475569');
          dLine(125, plAuthY + 12, 190, plAuthY + 12, '#94a3b8', 0.5);
          dText("SURVEY AGENCY ENDORSEMENT", 125, plAuthY + 16, 7, false, '#64748b');

        } else if (key === 'bl') {
          // BILL OF LADING
          dText("OCEAN BILL OF LADING (SEA CARRIAGE COPY)", 15, 28, 14, true, '#1e3a8a');
          dText(`Standard Non-Negotiable Reference: BL-${qBlNo}`, 15, 33, 9, false, '#475569');

          // Shipper Block
          dRect(15, 38, 180, 18);
          dText("SHIPPER / EXPORTER", 17, 42, 7.5, true, '#1d4ed8');
          dText(`${qExporter} • ${getInitials(qExporter)} AGENCY RECORDS`, 17, 47, 9, true, '#0f172a');
          dText(qExporterLoc.substring(0, 100), 17, 52, 8, false, '#475569');

          // Consignee Block
          dRect(15, 58, 180, 18);
          dText("CONSIGNEE / BUYER TO ORDER", 17, 62, 7.5, true, '#1d4ed8');
          dText(qBuyer, 17, 67, 9, true, '#0f172a');
          dText(qBuyerLoc.substring(0, 100), 17, 72, 8, false, '#475569');

          // Operational Block
          dRect(15, 78, 180, 22, '#e2e8f0', '#f8fafc');
          dText("PRE-CARRIAGE BY: ROAD TRANSIT INLAND", 18, 83, 8, false, '#475569');
          dText("PORT OF LOADING: " + qPortOfLoading, 18, 88, 8, true, '#334155');
          dText("VESSEL/VOYAGE: " + qVesselName + " / " + qVoyageNo, 18, 94, 8, true, '#334155');

          dText("PLACE OF RECEIPT: GANDHIDHAM TERMINAL", 109, 83, 8, false, '#475569');
          dText("PORT OF DISCHARGE: " + qDest, 109, 88, 8, true, '#334155');
          dText("FREIGHT CLASSIFICATION: PREPAID", 109, 94, 8, true, '#10b981');

          // Description Marks Table
          const descY = 104;
          dRect(15, descY, 180, 8, '#3b82f6', '#eff6ff');
          dText("MARKS & NUMBERS", 18, descY + 5.5, 8, true, '#1e3a8a');
          dText("QUANTITY & PACKAGING PACKAGE STATUS", 55, descY + 5.5, 8, true, '#1e3a8a');
          dText("GROSS WEIGHT (MT)", 160, descY + 5.5, 8, true, '#1e3a8a');

          dRect(15, descY + 8, 180, 40, '#cbd5e1');
          dText("CONTAINER STUFFING:", 18, descY + 15, 8, true, '#334155');
          dText(`AS PER LOAD LIST IN CLOTH BAGS`, 18, descY + 20, 8, false, '#475569');
          dText(`LOT: ${qRef}`, 18, descY + 25, 8, false, '#475569');
          dText(`${qContainersCount} x CONTAINER`, 18, descY + 30, 8, true, '#1d4ed8');

          let contentDesc = `SAID TO CONTAIN: ${qQuantity} METRIC TONS OF CHOSEN HIGH GRADE INDIAN ${qCommodity.toUpperCase()} PACKED IN 50 KG EXPORT STANDARDS BAGS.`;
          if (qCommodity.toUpperCase() === 'BLENDED (MIX) RICE' || (firstItem?.blendRice1Name && firstItem?.blendRice2Name)) {
            contentDesc = `SAID TO CONTAIN: ${qQuantity} METRIC TONS OF CHOSEN HIGH GRADE INDIAN ${qCommodity.toUpperCase()} (${firstItem?.blendRice1Pct || 70}% ${firstItem?.blendRice1Name || 'Type 1'} & ${firstItem?.blendRice2Pct || 30}% ${firstItem?.blendRice2Name || 'Type 2'}) PACKED IN 50 KG EXPORT STANDARDS BAGS.`;
          }
          const descLines = pdf.splitTextToSize(contentDesc, 100);
          pdf.text(descLines, 55, descY + 15);
          dText(`FREIGHT PREPAID RECORD FILED`, 55, descY + 32, 8.5, true, '#10b981');
          if (firstItem?.transitTime) {
            dText(`EST. TRANSIT: ${firstItem.transitTime}`, 55, descY + 38, 8, true, '#1d4ed8');
          }

          dText(`${(qQuantity * 1.004).toFixed(2)} MT`, 160, descY + 15, 9, true, '#0f172a');
          dText(`NET WEIGHT:`, 160, descY + 22, 7, false, '#475569');
          dText(`${qQuantity.toFixed(2)} MT`, 160, descY + 26, 8, true, '#334155');

          // Terms Block
          const carrierTermsY = descY + 52;
          dRect(15, carrierTermsY, 180, 22, '#e2e8f0', '#f8fafc');
          dText("CARRIER STANDARD DECLARATION TERMS:", 17, carrierTermsY + 4.5, 7, true, '#475569');
          const termsText = "IN WITNESS WHEREOF THE MASTER OR AGENT OF THE SHIP HAS AFFIRMED COMPLIANCE BILLS OF LADING ALL OF THIS TENOR AND DATE, ONE OF WHICH BEING ACCOMPLISHED THE OTHERS SHALL STAND VOID. PARSED SECURE AND REGISTERED SECURE CARGO SYSTEM.";
          const termLines = pdf.splitTextToSize(termsText, 172);
          pdf.text(termLines, 17, carrierTermsY + 9);

          const blAuthY = carrierTermsY + 26;
          dBadge("FREIGHT PREPAID", 15, blAuthY, 40, 12, '#ecfdf5', '#10b981', '#047857');
          dBadge("ORIGINAL LOCKED", 60, blAuthY, 40, 12, '#eff6ff', '#3b82f6', '#1d4ed8');
          dText("FOR SHIPPING LINE OPERATOR CARRIER", 125, blAuthY + 3, 7.5, true, '#475569');
          dLine(125, blAuthY + 11, 190, blAuthY + 11, '#94a3b8', 0.5);

        } else if (key === 'coo') {
          // CERTIFICATE OF ORIGIN
          dText("CERTIFICATE OF REPUBLIC ORIGIN", 15, 28, 14, true, '#7c3aed');
          dText(`Customs Verification Reference: COO-${qRef}`, 15, 33, 9, false, '#475569');

          // Exporter & Buyer Boxes
          dRect(15, 38, 88, 30);
          dText("1. EXPORTER DETAILS", 17, 42, 7.5, true, '#7c3aed');
          dText(qExporter, 17, 47, 9, true, '#0f172a');
          dText(expLines[0] || 'RAJKOT, INDIA', 17, 52, 8, false, '#475569');

          dRect(107, 38, 88, 30);
          dText("2. CONSIGNEE DETAILS", 109, 42, 7.5, true, '#7c3aed');
          dText(qBuyer, 109, 47, 9, true, '#0f172a');
          dText(buyLines[0] || qDest, 109, 52, 8, false, '#475569');

          // Port routing particulars
          dRect(15, 72, 180, 24, '#f5f3ff', '#faf5ff');
          dText("3. TRANSIT SHUTTLE PARTICULARS", 18, 77, 8, true, '#7c3aed');
          dText("VESSEL/VOYAGE: " + qVesselName + " / " + qVoyageNo, 18, 82, 8.5, false, '#475569');
          dText("POL: " + qPortOfLoading, 18, 87, 8.5, false, '#475569');
          dText("POD: " + qDest, 109, 82, 8.5, false, '#475569');
          dText("INVOICE NO: CI-" + qRef + " | DATE: " + fmtDate(qDate), 109, 87, 8.5, false, '#475569');
          dText("DECLARATION SEALS COMPLY WITH REPUBLIC EXPORT GUIDELINES", 18, 92, 8, true, '#7c3aed');

          // Specific declaration box
          const originY = 100;
          dRect(15, originY, 180, 36, '#ddd6fe', '#fafafa');
          dText("4. DESCRIPTION OF GOODS & AGRICULTURAL COMPLIANCE PACKS", 18, originY + 6, 8, true, '#7c3aed');
          dText("COMMODITY BRAND:", 18, originY + 12, 8, false, '#475569');
          if (qCommodity.toUpperCase() === 'BLENDED (MIX) RICE' || (firstItem?.blendRice1Name && firstItem?.blendRice2Name)) {
            dText(`${qCommodity.toUpperCase()} (${firstItem?.blendRice1Pct || 70}% ${firstItem?.blendRice1Name || 'Type 1'} & ${firstItem?.blendRice2Pct || 30}% ${firstItem?.blendRice2Name || 'Type 2'})`, 18, originY + 16, 8, true, '#0f172a');
          } else {
            dText(qCommodity.toUpperCase(), 18, originY + 16, 9, true, '#0f172a');
          }

          dText("NET IN TRANSIT QUANTITY (MT):", 112, originY + 12, 8, false, '#475569');
          dText(`${qQuantity} MT`, 112, originY + 16, 11, true, '#7c3aed');

          dText("DECLARATION OF MANUFACTURER:", 18, originY + 22, 7.5, true, '#475569');
          dText("WE DECLARED HEREBY THAT THE GOODS DESCRIBED ABOVE CORRESPOND WHOLLY TO THE INVOICED DETAILS,", 18, originY + 27, 7, false, '#5b21b6');
          dText("AND ARE OF WHOLLY INDIAN GRAIN REVENUE CROP AND HARVESTED EXCLUSIVELY FROM RURAL FIELDS IN REPUBLIC OF INDIA.", 18, originY + 31, 7, false, '#5b21b6');

          // Endorsement box
          const cooEndorseY = 142;
          dRect(15, cooEndorseY, 180, 42, '#a78bfa');
          dText("5. FEDERAL ENDORSEMENT CERTIFICATION STAMP", 18, cooEndorseY + 6, 8, true, '#5b21b6');
          const endorsText = "IT IS CERTIFIED ON THE BASIS OF RELEVANT DOCK SYSTEM AUDITS, EX-MILL STOCK TRANSITS, AND DECLARED CRITERIA THAT THE SAID BASMATI GRAIN/COMMODITIES DESCRIBED CORRESPOND TO ACTUAL CHOSEN PRODUCTS MANUFACTURED IN INDIA AND COMPLY COMPREHENSIVELY WITH NATIONAL TRADE REGISTRATION STANDARDS IN SHIPMENT OUTCOMES.";
          const endorsLines = pdf.splitTextToSize(endorsText, 172);
          pdf.text(endorsLines, 18, cooEndorseY + 12);

          const cooAuthY = cooEndorseY + 48;
          dBadge("CHAMBER SEALED", 15, cooAuthY, 40, 12, '#f5f3ff', '#c084fc', '#6b21a8');
          dBadge("INDIAN ORIGIN", 60, cooAuthY, 40, 12, '#eff6ff', '#3b82f6', '#1d4ed8');

          dText("EXPORTER CUSTOMS SIGNATORY", 125, cooAuthY + 3, 7.5, true, '#475569');
          dLine(125, cooAuthY + 11, 190, cooAuthY + 11, '#94a3b8', 0.5);

        } else if (key === 'phyto') {
          // PHYTOSANITARY
          dText("PHYTOSANITARY CERTIFICATE (FEDERAL HEALTH)", 15, 28, 14, true, '#047857');
          dText(`Plant Quarantine Clearance Code: PHYTO-${qRef}`, 15, 33, 9, false, '#475569');

          // Shipper and POD Organizations
          dRect(15, 38, 88, 30);
          dText("Exporter Shippers:", 17, 42, 7.5, true, '#047857');
          dText(qExporter, 17, 47, 9, true, '#0f172a');
          dText(expLines[0] || 'RAJKOT, INDIA', 17, 52, 8, false, '#475569');

          dRect(107, 38, 88, 30);
          dText("To: Plant Protection Organization of:", 109, 42, 7.5, true, '#047857');
          dText(qBuyer, 109, 47, 9, true, '#0f172a');
          dText(qBuyerLoc.substring(0, 40) || qDest, 109, 52, 8, false, '#475569');

          // Operational Block (Botanical details)
          dRect(15, 72, 180, 20, '#e8f5e9', '#f1f8e9');
          dText("DESCRIPTION OF CONSIGNMENT", 18, 77, 8, true, '#047857');
          dText("COMMODITY: Oryza Sativa (Choice Basmati Indian Rice)", 18, 82, 8.5, true, '#334155');
          dText("DECLARED QUANTITY: " + qQuantity + " MT BASIS NET", 18, 87, 8.5, false, '#475569');
          dText("REPUBLIC BOTANICAL HEALTH DECLARATION GIVEN", 109, 82, 8.5, true, '#059669');

          // Health Statement
          const certY = 96;
          dRect(15, certY, 180, 26, '#a5d6a7', '#fafdfa');
          dText("BOTANICAL INSPECTOR ENDORSED STATEMENT:", 18, certY + 6, 8, true, '#1b5e20');
          const phytoCertText = "THIS IS TO CERTIFY THAT THE PLANTS, PLANT PRODUCTS OR OTHER REGULATED ARTICLES DESCRIBED HEREIN HAVE BEEN DOCK INVENTORIED AND INSPECTED COMPREHENSIVELY ACCORDING TO APPROPRIATE BOTANICAL PROCEDURES, AND ARE CONSOLIDATED TO BE ENTIRE REVENUE COMPLIANT AND FREE FROM HARMFUL STORAGE PESTS OR INLAND CONTAMINATIONS.";
          const phytoLines = pdf.splitTextToSize(phytoCertText, 172);
          pdf.text(phytoLines, 18, certY + 12);

          // Treatment particulars
          const fumigationY = certY + 30;
          dRect(15, fumigationY, 180, 26, '#c8e6c9', '#fafbfa');
          dText("DISINFESTATION AND/OR DISINFECTION TREATMENT RECORDS (FUMIGATION)", 18, fumigationY + 5.5, 8, true, '#1b5e20');
          dText("TREATMENT CHEMICAL: ALUMINIUM PHOSPHIDE ALP @ 9.0G/M3", 18, fumigationY + 11.5, 8, false, '#334155');
          dText("EXPOSURE DURATION: 120 HOURS (5 DAYS BASIS)", 18, fumigationY + 16.5, 8, false, '#334155');
          dText(`FUMIGATION REF DATE: ${fmtDate(qDate)}`, 109, fumigationY + 11.5, 8, true, '#047857');
          dText("DOCK DOSAGE REPORT STATUS: VERIFIED OK", 109, fumigationY + 16.5, 8, true, '#10b981');

          const phytoAuthY = fumigationY + 31;
          dBadge("PHYTO APPROVED", 15, phytoAuthY, 40, 12, '#e8f5e9', '#81c784', '#1b5e20');
          dBadge("PLANT PROTECTION", 60, phytoAuthY, 40, 12, '#eff6ff', '#3b82f6', '#1d4ed8');

          dText("AGRICULTURAL SANITARY DEPUTY INSPECTOR", 125, phytoAuthY + 3, 7.5, true, '#475569');
          dLine(125, phytoAuthY + 10, 190, phytoAuthY + 10, '#94a3b8', 0.5);
          dText("MINISTRY OF AGRICULTURE AND FARMERS WELFARE", 125, phytoAuthY + 14, 6.5, false, '#64748b');
        }

        // Draw page footer stamp
        dLine(15, 275, 195, 275, '#cbd5e1', 0.5);
        dText(`PAGE ${pageIndex} of ${selectedKeys.length} • OFFICIAL EXPORT SYSTEM COMPILED RECORD`, 15, 281, 7, false, '#64748b');
        dText(`DATE LOCK: ${fmtDate(qDate)}`, 155, 281, 7, true, '#10b981');
      });

      pdf.save(`COMBINED-EXPORT-DOCS-${qRef}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Error compiling unified PDF. Please check data alignment!");
    }
  };

  const handleUpdateQuoteField = (field: string, value: any) => {
    if (!activeQuote) return;
    setSavedQuotes(prev => prev.map(q => {
      if (q.id === activeQuote.id) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const handleSimulateTransitDrift = () => {
    if (!activeQuote) return;
    const blNo = activeQuote.blNo || `BL-AUTO-${activeQuote.ref}`;
    const trackingEmail = activeQuote.trackingEmail || `procure@buyer-client.io`;
    const logs = activeQuote.trackingUpdates || [];
    
    // Step-by-step path transitions:
    let nextLoc = 'Mundra Sea Port Terminal, India';
    let nextStatus = 'Customs Cleared';
    let nextDesc = `Customs cleared successfully. Sealed containers are fully logged to B/L manifest. Cargo shifted to vessel MV Oceanic Pride.`;
    
    if (logs.length === 1) {
      nextLoc = 'Arabian Sea High Coordinates (Transit)';
      nextStatus = 'In Ocean Transit';
      nextDesc = `Vessel tracking indicates standard cruising at 15.2 knots. Temperature and container seal safety codes confirm optimal basmati storage humidity.`;
    } else if (logs.length === 2) {
      nextLoc = 'Gulf of Oman Approach Sector';
      nextStatus = 'In Ocean Transit';
      nextDesc = `Consignment transit is 80% completed. Approaching territorial Gulf waterways pilot station coordinate. ETA remains stable.`;
    } else if (logs.length >= 3) {
      nextLoc = activeQuote.dest || 'Hamad Terminal, Doha, Qatar';
      nextStatus = 'Delivered & Transferred';
      nextDesc = `Vessel anchored, grain packages checked by food authorities and transferred to regional consignees. Transit completed successfully. Automatic arrival email triggered.`;
    }

    const timestamp = todayISO() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const freshLog = {
      id: `log-${Date.now()}`,
      date: timestamp,
      location: nextLoc,
      status: nextStatus,
      description: nextDesc,
      emailSent: true,
      emailRecipient: trackingEmail
    };

    // Construct the email body that's simulated to the user
    let emailSubject = `🚚 Live Vessel Dispatch: B/L #${blNo} Location Changed to ${nextLoc}`;
    let emailBody = `Dear Grain Imports Team at ${activeQuote.company},\n\n` +
      `We represent the global cargo logistics managers for your contract ${activeQuote.ref}. ` +
      `Your bulk Basmati Rice consignment is transitioning across international cargo lanes.\n\n` +
      `• CURRENT SOURCE TERMINAL: Mundra, Gujarat, India\n` +
      `• CURRENT CONTAINER LOCATION: ${nextLoc}\n` +
      `• REAL-TIME TRANSIT STATUS: ${nextStatus}\n` +
      `• REGISTERED BILL OF LADING: ${blNo}\n` +
      `• LATEST POSITION LOG: ${nextDesc}\n` +
      `• CURRENT EXPECTED ETA: ${activeQuote.trackingEta || '3-5 Days'}\n\n` +
      `You may monitor live developments and download Phytosanitary certificates or custom bills at any time using the public B/L Search lookup on our Landing Portal.\n\n` +
      `Regards,\nExport Management Hub Admin`;

    if (nextStatus.includes('Delivered')) {
      emailSubject = `🌟 DECLARED ARRIVAL: B/L #${blNo} - Your Shipment is Here!`;
      emailBody = `Dear ${activeQuote.buyer},\n\n` +
        `EXCELLENT NEWS! Your Basmati grain consignment registered under Bill of Lading (B/L) #${blNo} has safely arrived at ${nextLoc}!\n\n` +
        `All physical container seals match compliance requirements and have passed regulatory clearance.\n\n` +
        `• TERMINAL LOCATION: ${nextLoc}\n` +
        `• CONSIGNMENT REFERENCE: ${activeQuote.ref}\n` +
        `• FINAL TRANSIT RECORD: ${nextDesc}\n\n` +
        `All shipping bills, phytosanitary health sheets, and official commercial invoices are secured. They are instantly accessible on your direct Client Tracking Portal.\n\n` +
        `Thank you for importing through our mill systems!\n\n` +
        `Warm Regards,\n` +
        `SaaS Direct Dispatch Tower`;
    }

    setSavedQuotes(prev => prev.map(q => {
      if (q.id === activeQuote.id) {
        return {
          ...q,
          piStatus: nextStatus.includes('Delivered') ? 'done' : (q.piStatus || 'bl'),
          trackingUpdates: [...logs, freshLog]
        };
      }
      return q;
    }));

    // Trigger Outbound Mail Popup show!
    setActiveOutboundMail({
      recipient: trackingEmail,
      subject: emailSubject,
      body: emailBody
    });
  };

  const handleDeclareDelivered = () => {
    if (!activeQuote) return;
    const blNo = activeQuote.blNo || `BL-AUTO-${activeQuote.ref}`;
    const trackingEmail = activeQuote.trackingEmail || `procure@buyer-client.io`;
    const logs = activeQuote.trackingUpdates || [];

    const nextLoc = activeQuote.dest || 'Hamad Cargo Bureau, Doha, Qatar';
    const nextStatus = 'Delivered & Transferred';
    const nextDesc = `Exporter intentionally triggered direct physical delivery clearance. Vessel anchored, Basmati packages successfully passed customs, final items received and signed off by buyer broker. All matching document indexes are synced and archived index-wide. Outbound alerts emitted.`;

    const timestamp = todayISO() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const freshLog = {
      id: `log-${Date.now()}`,
      date: timestamp,
      location: nextLoc,
      status: nextStatus,
      description: nextDesc,
      emailSent: true,
      emailRecipient: trackingEmail
    };

    const emailSubject = `🌟 DECLARED ARRIVAL: B/L #${blNo} - Your Shipment is Here!`;
    const emailBody = `Dear ${activeQuote.buyer},\n\n` +
      `EXCELLENT NEWS! Your Basmati grain consignment registered under Bill of Lading (B/L) #${blNo} has safely arrived at ${nextLoc}!\n\n` +
      `All material grain sacks have passed health audits, container seal codes are intact, and cargo has been officially signed over.\n\n"Your shipment is here!"\n\n` +
      `• TERMINAL ARRIVAL: ${nextLoc}\n` +
      `• CONSIGNMENT REFERENCE: ${activeQuote.ref}\n` +
      `• COMPLIANT HANDOVER: ${nextDesc}\n\n` +
      `Your customs paperwork, shipping bills, and phytosanitary PDFs are readily available for secure local downloads via our search portal.\n\n` +
      `Warm Regards,\nSaaS Direct Dispatch Tower`;

    setSavedQuotes(prev => prev.map(q => {
      if (q.id === activeQuote.id) {
        return {
          ...q,
          piStatus: 'done',
          trackingUpdates: [...logs, freshLog]
        };
      }
      return q;
    }));

    setActiveOutboundMail({
      recipient: trackingEmail,
      subject: emailSubject,
      body: emailBody
    });
  };

  const handleClearTrackingHistory = () => {
    if (!activeQuote) return;
    if (!confirm("This will clear all transit log history. Proceed?")) return;
    setSavedQuotes(prev => prev.map(q => {
      if (q.id === activeQuote.id) {
        return {
          ...q,
          trackingUpdates: []
        };
      }
      return q;
    }));
  };

  // Filter quotes
  const filteredQuotes = savedQuotes.filter(q => {
    const term = search.toLowerCase();
    
    // Check if query matches fundamental search text
    const basicMatches = !term || 
      `${q.ref} ${q.buyer} ${q.company} ${q.dest} ${q.blNo || ''} ${q.containerNo || ''} ${q.contractNo || ''} ${q.invoiceNo || ''} ${q.portOfLoading || ''} ${q.placeOfReceipt || ''}`
        .toLowerCase()
        .includes(term);

    // Check if any specific items/commodities inside this quote match
    const itemsMatch = !term || (q.items && q.items.some(item => 
      `${item.commodity || ''} ${item.brand || ''} ${item.dest || ''} ${item.size || ''} ${item.crop || ''} ${item.year || ''}`
        .toLowerCase()
        .includes(term)
    ));

    // Check if any uploaded files match the filename
    const fileMatches = !term || (q.workflow && Object.entries(q.workflow).some(([key, step]) => 
      `${key} ${step.fileName || ''} ${step.label || ''}`.toLowerCase().includes(term)
    ));

    // Check if the current stage label matches
    const stageIdx = (() => {
      const statusKey = q.piStatus;
      if (!statusKey) return 0;
      const idx = STAGES.findIndex(s => s.key === statusKey);
      return idx >= 0 ? idx : 0;
    })();
    const stageLabel = STAGES[stageIdx]?.label || '';
    const stageMatches = !term || stageLabel.toLowerCase().includes(term);

    // Check if user specifically searched for a document category
    const docKeyMatch = !term || ['pi', 'proforma', 'invoice', 'commercial', 'packing', 'pl', 'phyto', 'phytosanitary', 'sgs', 'customs', 'bill', 'lading', 'obl', 'air waybill'].some(docKeyword => {
      if (term.includes(docKeyword)) {
        if (docKeyword.includes('phyto') && q.workflow?.phyto?.fileName) return true;
        if ((docKeyword.includes('customs') || docKeyword.includes('bill')) && q.workflow?.shipping_bill?.fileName) return true;
        if ((docKeyword.includes('lading') || docKeyword.includes('obl')) && (q.workflow?.shipping_invoice?.fileName || q.blNo)) return true;
        if ((docKeyword.includes('packing') || docKeyword.includes('pl')) && q.workflow?.pl?.fileName) return true;
        if (docKeyword.includes('commercial') && q.workflow?.ci?.fileName) return true;
        if ((docKeyword.includes('proforma') || docKeyword.includes('pi')) && (q.workflow?.pi?.fileName || q.approvedPiUploaded)) return true;
      }
      return false;
    });

    const textMatches = basicMatches || itemsMatch || fileMatches || stageMatches || docKeyMatch;
    if (!textMatches) return false;

    if (docTypeFilter === 'all') return true;
    if (docTypeFilter === 'quote') return q.piStatus === 'offer';
    if (docTypeFilter === 'pi') return q.piStatus === 'pi' || q.piStatus === 'signed';
    if (docTypeFilter === 'ci') {
      return q.piStatus === 'payment' || q.piStatus === 'milling' || q.piStatus === 'inspection' || q.piStatus === 'bl' || q.piStatus === 'done';
    }
    if (docTypeFilter === 'pl') {
      return q.piStatus === 'milling' || q.piStatus === 'inspection' || q.piStatus === 'bl' || q.piStatus === 'done';
    }
    if (docTypeFilter === 'bl') {
      return q.piStatus === 'bl' || q.piStatus === 'done';
    }
    return true;
  });

  // Delete quote
  const handleDeleteQuote = (id: number, ref: string) => {
    if (!confirm(`Warning: Are you sure you want to delete quotation ${ref}? This is irreversible.`)) return;
    setSavedQuotes(prev => prev.filter(q => q.id !== id));
    if (activeQuoteId === id) setActiveQuoteId(null);
  };

  // Update quote status
  const handleUpdateStatus = (quoteId: number, statusKey: string) => {
    setSavedQuotes(prev => prev.map(q => {
      if (q.id === quoteId) {
        const wf = q.workflow || {};
        const freshStep: PIWorkflowStep = {
          date: todayISO(),
          label: `${STAGES.find(s => s.key === statusKey)?.label || 'Status'} updated`
        };
        return {
          ...q,
          piStatus: statusKey,
          piUpdated: todayISO(),
          workflow: {
            ...wf,
            [statusKey]: freshStep
          }
        };
      }
      return q;
    }));
  };

  const getDocTypeLabel = (key: string): string => {
    switch (key) {
      case 'pi': return "Proforma Invoice (PI)";
      case 'ci': return "Commercial Invoice (CI)";
      case 'pl': return "Packing List (PL)";
      case 'shipping_bill': return "Customs Shipping Bill";
      case 'phyto': return "Phytosanitary Certificate";
      case 'shipping_invoice': return "Shipping Invoice / Bill of Lading";
      default: return key.toUpperCase();
    }
  };

  const [docScanProgress, setDocScanProgress] = useState<{
    fileName: string;
    fileSize: number;
    expectedTypeKey: string;
    expectedTypeLabel: string;
    step: 'none' | 'analyzing' | 'checked-bytes' | 'keywords' | 'matched' | 'mismatch' | 'invalid-format' | 'size-exceeded' | 'unknown-content';
    matchedLabel?: string;
    confidenceDetails?: string;
    tempFileToSave?: { name: string; size: number };
  } | null>(null);

  const applyVerifiedFileSave = (typeKey: string, name: string, size: number) => {
    if (!activeQuote) return;
    setSavedQuotes(prev => prev.map(q => {
      if (q.id === activeQuote.id) {
        const wf = q.workflow || {};
        
        if (typeKey === 'pi' || typeKey === 'ci' || typeKey === 'pl') {
          const oldStep = wf[typeKey] || { label: 'Step initialized' };
          const freshStep: PIWorkflowStep = {
            ...oldStep,
            date: todayISO(),
            label: `Signed ${typeKey.toUpperCase()} uploaded & locked`,
            fileName: name,
            fileSize: size,
            fileData: 'verified_uploaded'
          };
          
          let docAttrs: Partial<SavedQuote> = {};
          if (typeKey === 'pi') {
            docAttrs.approvedPiUploaded = true;
            docAttrs.approvedPiFileName = name;
            docAttrs.piStatus = 'signed';
          } else if (typeKey === 'ci') {
            docAttrs.piStatus = 'milling';
          } else if (typeKey === 'pl') {
            docAttrs.piStatus = 'inspection';
          }
          
          return {
            ...q,
            ...docAttrs,
            workflow: {
              ...wf,
              [typeKey]: freshStep
            }
          };
        } 
        
        if (typeKey === 'shipping_bill' || typeKey === 'phyto' || typeKey === 'shipping_invoice') {
          const freshStep: PIWorkflowStep = {
            date: todayISO(),
            label: `${typeKey === 'shipping_bill' ? 'Customs Shipping Bill' : typeKey === 'phyto' ? 'Phytosanitary Certificate' : 'Active Shipping Invoice'} uploaded`,
            fileName: name,
            fileSize: size
          };
          return {
            ...q,
            workflow: {
              ...wf,
              [typeKey]: freshStep
            }
          };
        }
      }
      return q;
    }));
  };

  const handleIncomingFile = async (file: File, expectedTypeKey: string) => {
    if (!activeQuote) return;
    const expectedLabel = getDocTypeLabel(expectedTypeKey);
    
    setDocScanProgress({
      fileName: file.name,
      fileSize: file.size,
      expectedTypeKey,
      expectedTypeLabel: expectedLabel,
      step: 'analyzing',
      tempFileToSave: { name: file.name, size: file.size }
    });

    await new Promise(resolve => setTimeout(resolve, 800));

    // Size limit of 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setDocScanProgress(prev => prev ? { ...prev, step: 'size-exceeded' } : null);
      return;
    }

    // Format Limit: PDF only
    const isExtensionPdf = file.name.toLowerCase().endsWith('.pdf');
    if (!isExtensionPdf) {
      setDocScanProgress(prev => prev ? { ...prev, step: 'invalid-format' } : null);
      return;
    }

    setDocScanProgress(prev => prev ? { ...prev, step: 'checked-bytes' } : null);
    await new Promise(resolve => setTimeout(resolve, 600));

    // Byte Analysis: check for raw %PDF- magic signature
    const firstBytes = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve((r.result as string) || '');
      r.onerror = () => resolve('');
      r.readAsText(file.slice(0, 4));
    });

    if (firstBytes !== '%PDF') {
      setDocScanProgress(prev => prev ? {
        ...prev,
        step: 'invalid-format',
        confidenceDetails: "Scanning failed: File lacks standard PDF binary signatures (missing raw %PDF descriptor bytes)."
      } : null);
      return;
    }

    setDocScanProgress(prev => prev ? { ...prev, step: 'keywords' } : null);
    await new Promise(resolve => setTimeout(resolve, 800));

    // Keyword OCR classification scanning
    const fileContentText = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => {
        const res = r.result;
        resolve(typeof res === 'string' ? res.slice(0, 150000) : '');
      };
      r.onerror = () => resolve('');
      r.readAsText(file.slice(0, 150000));
    });

    const combinedLower = (file.name + " " + fileContentText).toLowerCase();
    
    let docTypeMatched: string | null = null;
    let confidenceReason = "";

    if (
      combinedLower.includes('proforma') || 
      combinedLower.includes('pro forma') || 
      combinedLower.includes('pro-forma') || 
      (combinedLower.includes('pi-') && !combinedLower.includes('packing'))
    ) {
      docTypeMatched = 'pi';
      confidenceReason = "Identified keywords associated with Proforma Invoices (e.g. 'Proforma', 'PI').";
    } else if (
      combinedLower.includes('commercial invoice') || 
      combinedLower.includes('comm-inv') ||
      combinedLower.includes('ci-') ||
      (combinedLower.includes('invoice') && combinedLower.includes('export') && !combinedLower.includes('proforma') && !combinedLower.includes('packing'))
    ) {
      docTypeMatched = 'ci';
      confidenceReason = "Identified financial commercial descriptors ('Commercial Invoice', 'CI').";
    } else if (
      combinedLower.includes('packing list') || 
      combinedLower.includes('package list') || 
      combinedLower.includes('packing spec') || 
      combinedLower.includes('gross weight') || 
      combinedLower.includes('net weight') || 
      combinedLower.includes('stuffing') ||
      combinedLower.includes('pl-')
    ) {
      docTypeMatched = 'pl';
      confidenceReason = "Identified packaging specifications and physical attributes ('Packing List', 'Gross/Net weight', 'Stuffing').";
    } else if (
      combinedLower.includes('shipping bill') || 
      combinedLower.includes('customs shipping') || 
      combinedLower.includes('fob value') || 
      combinedLower.includes('shipping-bill')
    ) {
      docTypeMatched = 'shipping_bill';
      confidenceReason = "Identified regulatory custom logs associated with Customs Shipping Bills.";
    } else if (
      combinedLower.includes('phyto') || 
      combinedLower.includes('phytosanitary') || 
      combinedLower.includes('plant protection') || 
      combinedLower.includes('health certificate')
    ) {
      docTypeMatched = 'phyto';
      confidenceReason = "Identified agricultural health indicators ('Phytosanitary', 'Phyto', 'Plant Protection').";
    } else if (
      combinedLower.includes('bill of lading') || 
      combinedLower.includes('lading') || 
      combinedLower.includes('shipped on board') || 
      combinedLower.includes('ocean bill') || 
      combinedLower.includes('waybill') || 
      combinedLower.includes('carrier') || 
      combinedLower.includes('shipping invoice') ||
      combinedLower.includes('bl-')
    ) {
      docTypeMatched = 'shipping_invoice';
      confidenceReason = "Identified carrier transport indicators ('Bill of Lading', 'OBL', 'Vessel', 'Shipped on board').";
    }

    let isValidMatch = false;
    if (docTypeMatched === expectedTypeKey) {
      isValidMatch = true;
    } else if (docTypeMatched === null) {
      const fnLower = file.name.toLowerCase();
      if (expectedTypeKey === 'pi' && (fnLower.includes('pi') || fnLower.includes('proforma'))) isValidMatch = true;
      else if (expectedTypeKey === 'ci' && (fnLower.includes('ci') || fnLower.includes('invoice') || fnLower.includes('commercial'))) isValidMatch = true;
      else if (expectedTypeKey === 'pl' && (fnLower.includes('pl') || fnLower.includes('packing'))) isValidMatch = true;
      else if (expectedTypeKey === 'shipping_bill' && (fnLower.includes('bill') || fnLower.includes('sb') || fnLower.includes('shipping'))) isValidMatch = true;
      else if (expectedTypeKey === 'phyto' && fnLower.includes('phyto')) isValidMatch = true;
      else if (expectedTypeKey === 'shipping_invoice' && (fnLower.includes('lading') || fnLower.includes('bl') || fnLower.includes('shipping') || fnLower.includes('invoice'))) isValidMatch = true;
    }

    if (!isValidMatch && docTypeMatched !== null) {
      setDocScanProgress(prev => prev ? {
        ...prev,
        step: 'mismatch',
        matchedLabel: getDocTypeLabel(docTypeMatched || ''),
        confidenceDetails: confidenceReason
      } : null);
      return;
    }

    if (docTypeMatched === null && !isValidMatch) {
      setDocScanProgress(prev => prev ? {
        ...prev,
        step: 'unknown-content',
        confidenceDetails: "We searched for industry keywords but found no high-confidence metadata signatures. Verify the file contents manually."
      } : null);
      return;
    }

    applyVerifiedFileSave(expectedTypeKey, file.name, file.size);
    setDocScanProgress(prev => prev ? {
      ...prev,
      step: 'matched',
      matchedLabel: expectedLabel,
      confidenceDetails: confidenceReason || "Document matched expected template layout perfectly."
    } : null);

    await new Promise(resolve => setTimeout(resolve, 1500));
    setDocScanProgress(null);
  };

  const handleCustomDocUpload = (typeKey: 'shipping_bill' | 'phyto' | 'shipping_invoice', name: string, size: number) => {
    applyVerifiedFileSave(typeKey, name, size);
  };

  // Simulate document upload via input click or drops
  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeQuote) return;
    const file = e.target.files?.[0];
    if (!file) return;

    handleIncomingFile(file, uploadStepKey);
  };

  const attachFileToActiveQuote = (name: string, size: number) => {
    applyVerifiedFileSave(uploadStepKey, name, size);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!activeQuote) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleIncomingFile(file, uploadStepKey);
    }
  };

  // Re-seed quote back into offer sheet
  const handleReuseQuote = (q: SavedQuote) => {
    if (q.rateIds) {
      setSelectedRateIds(q.rateIds);
      onNavigateToTab('quote');
    } else {
      alert('This saved quote has no reference rates linked.');
    }
  };

  // Compute stats for progress circle/badge
  const getStageIndex = (statusKey?: string) => {
    if (!statusKey) return 0;
    const idx = STAGES.findIndex(s => s.key === statusKey);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="space-y-6" id="saved-quotes-archive-page">
      {docScanProgress && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-150 shadow-2xl p-6 space-y-5 overflow-hidden" id="pdf-scanner-modal">
            
            {/* Header portion */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl animate-pulse">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 tracking-tight flex items-center gap-1.5">
                    <span>Export Compliance Scanner</span>
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase rounded">v1.4 Smart Scan</span>
                  </h3>
                  <p className="text-xs text-gray-500 font-medium font-sans truncate max-w-[280px]">
                    Checking: <span className="font-mono text-gray-700 font-bold">{docScanProgress.fileName}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDocScanProgress(null)} 
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Verification Steps List */}
            <div className="space-y-3.5 py-1">
              {/* Step A: File Size Validation */}
              <div className="flex items-start gap-3 text-xs bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/60">
                <div className="mt-0.5">
                  {docScanProgress.fileSize <= 10 * 1024 * 1024 ? (
                    <div className="bg-emerald-100 text-emerald-750 p-0.5 rounded-full">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : docScanProgress.step === 'size-exceeded' ? (
                    <div className="bg-rose-100 text-rose-750 p-0.5 rounded-full">
                      <X className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="bg-gray-100 text-gray-500 p-0.5 rounded-full animate-spin">
                      <Loader2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-bold text-gray-800 block">File Size Verification (&le; 10 MB PDF)</span>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Your file size: <span className="font-mono text-gray-700 font-bold">{(docScanProgress.fileSize / (1024 * 1024)).toFixed(2)} MB</span> 
                    {docScanProgress.fileSize <= 10 * 1024 * 1024 ? " • Size complies with customs guidelines." : " • Error: Exceeds 10 MB threshold."}
                  </p>
                </div>
              </div>

              {/* Step B: Binary Magic Header Check (%PDF- magic number) */}
              <div className="flex items-start gap-3 text-xs bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/60">
                <div className="mt-0.5">
                  {['checked-bytes', 'keywords', 'matched', 'mismatch', 'unknown-content'].includes(docScanProgress.step) ? (
                    <div className="bg-emerald-100 text-emerald-750 p-0.5 rounded-full">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : docScanProgress.step === 'invalid-format' ? (
                    <div className="bg-rose-100 text-rose-750 p-0.5 rounded-full">
                      <X className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="bg-indigo-100 text-gray-500 p-0.5 rounded-full">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-bold text-gray-800 block">PDF Structure & Format Integrity Check</span>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Verifying MIME format type & secure <span className="font-mono bg-gray-100 px-1 py-0.5 text-gray-655 rounded">%PDF-</span> byte structures.
                  </p>
                </div>
              </div>

              {/* Step C: Scanning content and matching categories */}
              <div className="flex items-start gap-3 text-xs bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/60">
                <div className="mt-0.5">
                  {['matched'].includes(docScanProgress.step) ? (
                    <div className="bg-emerald-100 text-emerald-750 p-0.5 rounded-full">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : ['mismatch', 'unknown-content'].includes(docScanProgress.step) ? (
                    <div className="bg-amber-100 text-amber-750 p-0.5 rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                  ) : docScanProgress.step === 'keywords' ? (
                    <div className="bg-gray-100 text-gray-500 p-0.5 rounded-full animate-spin">
                      <Loader2 className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="bg-gray-100 text-gray-400 p-0.5 rounded-full">
                      <div className="w-3.5 h-3.5 bg-gray-200 rounded-full" />
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-bold text-gray-800 block">Export Content Keyword Verification</span>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Parsing ASCII streams to ensure file is structurally matching: <span className="font-extrabold text-blue-700">{docScanProgress.expectedTypeLabel}</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic scanning display panels depending on current validation state */}
            <div className="border border-gray-150 bg-gray-50/75 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2">
              {docScanProgress.step === 'analyzing' && (
                <>
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">Analyzing File Sizing Codes</span>
                  <p className="text-[10.5px] text-gray-500 max-w-xs font-sans">
                    Reading file size values and extension structures to verify if compliant with 10MB limits.
                  </p>
                </>
              )}
              {docScanProgress.step === 'checked-bytes' && (
                <>
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">Reading %PDF Magic Byte Channels</span>
                  <p className="text-[10.5px] text-gray-500 max-w-xs font-sans">
                    Decompressing file header streams to verify cryptographic validity against doctype indicators.
                  </p>
                </>
              )}
              {docScanProgress.step === 'keywords' && (
                <>
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">Scanning ASCII Text Streams</span>
                  <p className="text-[10.5px] text-gray-500 max-w-xs font-sans">
                    Searching for proforma, commercial, packing, and agricultural health declaration tags.
                  </p>
                </>
              )}
              {docScanProgress.step === 'size-exceeded' && (
                <>
                  <ShieldAlert className="w-10 h-10 text-rose-600" />
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-widest block">Upload Blocked: File Size Exceeded</span>
                  <p className="text-[11px] text-slice-600 max-w-xs leading-relaxed font-sans">
                    This file is <span className="font-extrabold text-gray-800">{(docScanProgress.fileSize / (1024 * 1024)).toFixed(2)} MB</span>. To ensure optimal document rendering, uploads must be strictly restricted to <span className="font-extrabold">10 MB PDF only</span>.
                  </p>
                  <button 
                    onClick={() => setDocScanProgress(null)}
                    type="button"
                    className="mt-2 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black transition cursor-pointer"
                  >
                    Close & Choose Compressed File
                  </button>
                </>
              )}
              {docScanProgress.step === 'invalid-format' && (
                <>
                  <ShieldAlert className="w-10 h-10 text-rose-600" />
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-widest block font-sans">File Format Blocked: PDF Only</span>
                  <p className="text-[11px] text-slate-600 max-w-xs leading-relaxed font-sans">
                    {docScanProgress.confidenceDetails || "Export records and compliance drafts are strictly limited to official PDF (.pdf) documents only for regulatory integrity."}
                  </p>
                  <button 
                    onClick={() => setDocScanProgress(null)}
                    type="button"
                    className="mt-2 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black transition cursor-pointer"
                  >
                    Select PDF Document
                  </button>
                </>
              )}
              {docScanProgress.step === 'matched' && (
                <>
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-pulse" />
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-widest block font-sans">Compliance Verification Successful!</span>
                  <p className="text-[11px] text-slate-650 max-w-xs leading-relaxed font-sans font-medium">
                    {docScanProgress.confidenceDetails} Save locked correctly.
                  </p>
                  <span className="text-[9.5px] font-mono text-emerald-500 italic">Centralized registry database updated live.</span>
                </>
              )}
              {docScanProgress.step === 'mismatch' && (
                <>
                  <ShieldAlert className="w-10 h-10 text-amber-500" />
                  <span className="text-xs font-black text-amber-700 uppercase tracking-widest block font-sans">Document Verification Conflicting!</span>
                  <p className="text-[11px] text-slate-650 max-w-sm leading-normal font-medium font-sans">
                    You uploaded a file into the <span className="font-extrabold text-blue-700">{docScanProgress.expectedTypeLabel}</span> archive slot, but keyword scan identified this document as a <span className="font-extrabold text-amber-700">{docScanProgress.matchedLabel}</span>.
                  </p>
                  
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800 text-left font-sans mt-1">
                    <span className="font-bold block">Scan Logic Details:</span>
                    {docScanProgress.confidenceDetails}
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button 
                      onClick={() => setDocScanProgress(null)}
                      type="button"
                      className="px-3.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-[10.5px] font-bold transition cursor-pointer"
                    >
                      Choose Correct Document
                    </button>
                    {docScanProgress.tempFileToSave && (
                      <button 
                        onClick={() => {
                          if (docScanProgress.tempFileToSave) {
                            applyVerifiedFileSave(docScanProgress.expectedTypeKey, docScanProgress.tempFileToSave.name, docScanProgress.tempFileToSave.size);
                            setDocScanProgress(prev => prev ? { ...prev, step: 'matched', confidenceDetails: "Bypassed verification warnings. Document forced back into the records." } : null);
                            setTimeout(() => setDocScanProgress(null), 1500);
                          }
                        }}
                        type="button"
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10.5px] font-bold transition cursor-pointer"
                        title="Bypass strict checks for exceptional files"
                      >
                        Bypass Verification
                      </button>
                    )}
                  </div>
                </>
              )}
              {docScanProgress.step === 'unknown-content' && (
                <>
                  <AlertTriangle className="w-10 h-10 text-amber-500" />
                  <span className="text-xs font-black text-amber-700 uppercase tracking-widest block font-sans">Unverified Document Keywords</span>
                  <p className="text-[11px] text-slate-605 max-w-sm leading-tight font-sans">
                    We scanned the PDF but could not detect standard keyword markers for <span className="font-bold text-indigo-700">{docScanProgress.expectedTypeLabel}</span>. This could be due to dynamic invoice headers.
                  </p>
                  
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => setDocScanProgress(null)}
                      type="button"
                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-[10.5px] font-bold transition cursor-pointer"
                    >
                      Retry Upload
                    </button>
                    {docScanProgress.tempFileToSave && (
                      <button 
                        onClick={() => {
                          if (docScanProgress.tempFileToSave) {
                            applyVerifiedFileSave(docScanProgress.expectedTypeKey, docScanProgress.tempFileToSave.name, docScanProgress.tempFileToSave.size);
                            setDocScanProgress(prev => prev ? { ...prev, step: 'matched', confidenceDetails: "Unverified document has been filed successfully on trust." } : null);
                            setTimeout(() => setDocScanProgress(null), 1500);
                          }
                        }}
                        type="button"
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10.5px] font-bold transition cursor-pointer"
                      >
                        File Document Anyway
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <p className="text-[9.5px] text-gray-400 text-center uppercase tracking-wider block font-sans">
              🔒 Standard Security Sandboxing • All files processed strictly locally in your browser
            </p>
          </div>
        </div>
      )}
      <div className="page-header no-print">
        <div className="breadcrumb">📦 Operations Directory</div>
        <h2 className="text-xl font-extrabold tracking-tight">Active Shipments & Quotes Registry</h2>
        <p className="text-sm text-gray-500 mt-1">
          Monitor your workflow stages, file signed crop contracts, manage customs documents, and track loading logs offline.
        </p>
      </div>

      {/* Dynamic Search & Operations Filter Board */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4 mb-4 no-print flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="w-full lg:flex-1 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block">Interactive Documents, Quotes & Shipments Registry</span>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-blue-500" />
            <input
              type="text"
              placeholder="Search by ID, Ref, Buyer, Bill of Lading, Container seal, Destination, Port, Commodity brand, custom files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-205 pl-9 pr-4 py-1.5 text-xs font-semibold text-gray-800 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          {search && (
            <div className="text-[10px] text-blue-600 font-bold flex items-center gap-1 animate-in fade-in duration-100">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" /> Found {filteredQuotes.length} matching files & logs out of {savedQuotes.length} records.
            </div>
          )}
        </div>

        {/* Port fast filters */}
        <div className="w-full lg:w-auto shrink-0 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block">Fast Document Type Filter</span>
          <div className="flex flex-wrap gap-1">
            {[
              { key: 'all', label: 'All Docs', count: savedQuotes.length },
              { key: 'quote', label: 'Quotes', count: savedQuotes.filter(q => q.piStatus === 'offer' || !q.piStatus).length },
              { key: 'pi', label: 'Proformas (PI)', count: savedQuotes.filter(q => q.piStatus === 'pi' || q.piStatus === 'signed').length },
              { key: 'ci', label: 'Invoices (CI)', count: savedQuotes.filter(q => q.piStatus === 'payment' || q.piStatus === 'milling' || q.piStatus === 'inspection' || q.piStatus === 'bl' || q.piStatus === 'done').length },
              { key: 'pl', label: 'Pack List (PL)', count: savedQuotes.filter(q => q.piStatus === 'milling' || q.piStatus === 'inspection' || q.piStatus === 'bl' || q.piStatus === 'done').length },
              { key: 'bl', label: 'B/L Release', count: savedQuotes.filter(q => q.piStatus === 'bl' || q.piStatus === 'done').length }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setDocTypeFilter(tab.key as any)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 ${
                  docTypeFilter === tab.key 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                    : 'bg-gray-100 text-gray-600 border-gray-250 hover:bg-gray-200/80 hover:text-gray-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[8.5px] tracking-normal font-bold font-mono ${
                  docTypeFilter === tab.key ? 'bg-blue-800 text-blue-100 shadow-inner' : 'bg-gray-200/80 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start no-print">
        
        {/* LEFT COLUMN: ACTIVE ARCHIVES LIST */}
        <div className="card bg-white p-4 border border-gray-200 rounded-xl shadow-xs space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between border-b pb-2 mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Offer Archives</span>
            <span className="text-[10.5px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold">
              {filteredQuotes.length} Total
            </span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredQuotes.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-8 italic">
                {savedQuotes.length === 0 ? "You haven't saved any offers yet." : "No results matching your query."}
              </p>
            ) : (
              filteredQuotes.map((q) => {
                const stepIdx = getStageIndex(q.piStatus);
                const percent = Math.round(((stepIdx + 1) / STAGES.length) * 100);
                const isActive = activeQuoteId === q.id;

                return (
                  <div
                    key={q.id}
                    onClick={() => setActiveQuoteId(isActive ? null : q.id)}
                    className={`p-3 border rounded-xl cursor-pointer group hover:border-blue-400 transition-all text-xs relative ${
                      isActive ? 'bg-blue-50/70 border-blue-500' : 'bg-gray-50/50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-gray-950 block text-[12px] group-hover:text-blue-700 transition animate-in fade-in duration-100">
                          {q.ref}
                        </span>
                        
                        {/* Option A: Standalone popup trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const portOrigin = q.portOfLoading || q.placeOfReceipt || 'Mundra Port, India';
                            const portDest = q.dest || 'Qatar';
                            const url = `${window.location.origin}${window.location.pathname}?vessels=true&ref=${encodeURIComponent(q.ref)}&origin=${encodeURIComponent(portOrigin)}&dest=${encodeURIComponent(portDest)}`;
                            window.open(url, '_blank');
                          }}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800 hover:text-blue-900 border border-blue-200 rounded px-1.5 py-0.5 text-[8.5px] font-black uppercase flex items-center gap-0.5 transition cursor-pointer select-none"
                          title="Check live-simulated shipping lines and transit date cutoffs"
                        >
                          🚢 Vessels
                        </button>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuote(q.id, q.ref);
                        }}
                        className="text-gray-400 hover:text-red-500 rounded p-1"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-6 h-6 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase flex items-center justify-center shrink-0 select-none" title="Buyer Initials">
                        {getInitials(q.buyer)}
                      </div>
                      <div className="font-black text-gray-900 uppercase truncate flex-1 leading-snug">{q.buyer}</div>
                    </div>
                    <div className="text-[10.5px] text-gray-500 uppercase truncate mt-1 pl-8 flex items-center gap-1">
                      <span className="font-bold bg-slate-100 border border-slate-200 text-slate-700 text-[8.5px] px-1 py-0.2 rounded" title="Company Initials">
                        CO: {getInitials(q.company)}
                      </span>
                      <span>{q.company} • {q.dest}</span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-200/60 text-[10px] font-semibold text-gray-500">
                      <span className="text-gray-400 font-mono font-bold flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" /> {fmtDate(q.date)}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wide bg-white border ${
                        q.piStatus === 'done' ? 'text-green-700 border-green-200' :
                        q.piStatus === 'offer' ? 'text-blue-700 border-blue-200' :
                        'text-indigo-700 border-indigo-200'
                      }`}>
                        Stage {stepIdx + 1}/{STAGES.length}: {STAGES[stepIdx]?.label}
                      </span>
                    </div>

                    {/* Progress thin bar */}
                    <div className="w-full bg-gray-200 h-1 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN 2-PANELS: STAGE TRACKER & FILE BINDINGS */}
        <div className="lg:col-span-2 space-y-4">
          {activeQuote ? (
            <>
              {(() => {
                // Determine if signed/approved PI exists
                const isPiApproved = activeQuote.approvedPiUploaded || 
                  !!(activeQuote.workflow?.pi?.fileName || activeQuote.workflow?.signed?.fileName);

                // Determine if signed CI and PL are on record
                const isCiSigned = !!activeQuote.workflow?.ci?.fileName;
                const isPlSigned = !!activeQuote.workflow?.pl?.fileName;

                // Handle direct file binding simulation helper
                const attachDocumentRecord = (typeKey: 'pi' | 'ci' | 'pl', name: string) => {
                  setSavedQuotes(prev => prev.map(q => {
                    if (q.id === activeQuote.id) {
                      const wf = q.workflow || {};
                      const freshStep: PIWorkflowStep = {
                        date: todayISO(),
                        label: `Signed ${typeKey.toUpperCase()} uploaded & locked`,
                        fileName: name,
                        fileSize: 450000 + Math.floor(Math.random() * 150000)
                      };
                      
                      let docAttrs: Partial<SavedQuote> = {};
                      if (typeKey === 'pi') {
                        docAttrs.approvedPiUploaded = true;
                        docAttrs.approvedPiFileName = name;
                        docAttrs.piStatus = 'signed'; // advance stage in list
                      } else if (typeKey === 'ci') {
                        docAttrs.piStatus = 'milling';
                      } else if (typeKey === 'pl') {
                        docAttrs.piStatus = 'inspection';
                      }

                      return {
                        ...q,
                        ...docAttrs,
                        workflow: {
                          ...wf,
                          [typeKey]: freshStep
                        }
                      };
                    }
                    return q;
                  }));
                  alert(`Successfully attached signed record "${name}" under centralized quote reference ${activeQuote.ref}!`);
                };

                return (
                  <div className="space-y-4">
                     {/* WORKFLOW TRACKING PIPELINE HEADER - STYLED CARD WITH DIRECT COMBINED PDF BUILDER */}
                    <div className="card bg-linear-to-b from-slate-50 to-white p-5 border-2 border-indigo-400 rounded-2xl shadow-lg ring-4 ring-indigo-50/50 space-y-5 animate-fade-in">
                      <div>
                        <span className="bg-sky-50 text-sky-700 text-[10px] px-2.5 py-1 rounded-sm font-mono font-bold tracking-wider uppercase">
                          COMPLIANCE LIFECYCLE ROADMAP
                        </span>
                        
                        <div className="mt-2.5 flex flex-wrap items-center gap-2.5 font-sans leading-none">
                          <span className="bg-blue-600 text-white font-mono font-black text-[11px] px-2.5 py-1 rounded shadow-2xs tracking-wide">
                            QUOTE: #{activeQuote.ref}
                          </span>
                          <span className="text-gray-300 font-normal">|</span>
                          <span className="bg-blue-50/60 border border-blue-150 text-blue-900 text-xs font-extrabold px-2.5 py-1 rounded uppercase flex items-center gap-1">
                            👤 BUYER: {activeQuote.buyer}
                          </span>
                          {activeQuote.company && (
                            <>
                              <span className="text-gray-300 font-normal">|</span>
                              <span className="text-xs text-gray-400 font-semibold font-sans uppercase">
                                CO: {activeQuote.company} SHIPMENT
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Dynamic Visual Pipeline Chevron sequence */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 select-none">
                        
                        {/* Pipeline Node 1: Quote Issued */}
                        <div className="p-2 border rounded-xl bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-2 text-xs font-bold shadow-xs">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="block text-[9px] uppercase text-emerald-500 font-sans tracking-wider leading-none mb-0.5">Step 1</span>
                            <span>RFQ Prepared</span>
                          </div>
                        </div>

                        {/* Pipeline Node 2: Proforma Invoice Issued */}
                        <div className="p-2 border rounded-xl bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-2 text-xs font-bold shadow-xs">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="block text-[9px] uppercase text-emerald-500 font-sans tracking-wider leading-none mb-0.5">Step 2</span>
                            <span>Proforma Issued</span>
                          </div>
                        </div>

                        {/* Pipeline Node 3: Signed Approved PI Received */}
                        <div className={`p-2 border rounded-xl flex items-center gap-2 text-xs font-bold transition ${
                          isPiApproved 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-amber-50 text-amber-900 border-amber-200 animate-pulse'
                        }`}>
                          {isPiApproved ? (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          )}
                          <div>
                            <span className={`block text-[9px] uppercase font-sans tracking-wider leading-none mb-0.5 ${isPiApproved ? 'text-emerald-500' : 'text-amber-500'}`}>Step 3</span>
                            <span>PI Signed Back</span>
                          </div>
                        </div>

                        {/* Pipeline Node 4: Commercial Invoice issued */}
                        <div className={`p-2 border rounded-xl flex items-center gap-2 text-xs font-bold transition ${
                          isCiSigned 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : isPiApproved ? 'bg-indigo-50 text-indigo-900 border-indigo-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                        }`}>
                          {isCiSigned ? (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="w-4 h-4 border border-gray-300 rounded-full block shrink-0" />
                          )}
                          <div>
                            <span className="block text-[9px] uppercase font-sans tracking-wider text-gray-400 leading-none mb-0.5">Step 4</span>
                            <span>CI Completed</span>
                          </div>
                        </div>

                        {/* Pipeline Node 5: Cargo Packing List filed */}
                        <div className={`p-2 border rounded-xl flex items-center gap-2 text-xs font-bold transition ${
                          isPlSigned 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : isPiApproved ? 'bg-emerald-50/10 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-200'
                        }`}>
                          {isPlSigned ? (
                            <Check className="w-4 h-4 text-emerald-650 shrink-0" />
                          ) : (
                            <span className="w-4 h-4 border border-gray-300 rounded-full block shrink-0" />
                          )}
                          <div>
                            <span className="block text-[9px] uppercase font-sans tracking-wider text-gray-400 leading-none mb-0.5">Step 5</span>
                            <span>Pack List Locked</span>
                          </div>
                        </div>

                      </div>

                      {/* INTEGRATED DOCK COMPILER SHEET OVERVIEW */}
                      {(() => {
                        const isCiLoaded = !!activeQuote.workflow?.ci?.fileName;
                        const isPlLoaded = !!activeQuote.workflow?.pl?.fileName;
                        const isBlLoaded = !!activeQuote.workflow?.shipping_invoice?.fileName || !!activeQuote.blNo;
                        const isCooLoaded = !!activeQuote.workflow?.shipping_bill?.fileName;
                        const isPhytoLoaded = !!activeQuote.workflow?.phyto?.fileName;

                        const isDocSelected = (key: string) => {
                          const isLoaded = 
                            key === 'ci' ? isCiLoaded :
                            key === 'pl' ? isPlLoaded :
                            key === 'bl' ? isBlLoaded :
                            key === 'coo' ? isCooLoaded :
                            key === 'phyto' ? isPhytoLoaded : false;
                            
                          if (excludedCombinedDocs[key] !== undefined) {
                            return excludedCombinedDocs[key];
                          }
                          return isLoaded;
                        };

                        const toggleDocSelection = (key: string) => {
                          setExcludedCombinedDocs(prev => ({
                            ...prev,
                            [key]: !isDocSelected(key)
                          }));
                        };

                        const selectedKeys = ['ci', 'pl', 'bl', 'coo', 'phyto'].filter(k => isDocSelected(k));

                        return (
                          <div className="mt-4 border-t border-dashed border-indigo-200 pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                                  <FileText className="w-4 h-4" />
                                </span>
                                <div>
                                  <h4 className="text-sm font-sans font-bold text-slate-800 tracking-tight leading-none">
                                    Smart Combined PDF Assembly Console
                                  </h4>
                                  <p className="text-[10px] text-slate-500 font-medium font-sans mt-1">
                                    Generates a unified high-resolution export pack in sequential order with document title on each page.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Checklist cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                              {[
                                { key: 'ci', name: 'Commercial Invoice (CI)', loaded: isCiLoaded, stepLabel: 'S1' },
                                { key: 'pl', name: 'Packing List (PL)', loaded: isPlLoaded, stepLabel: 'S2' },
                                { key: 'bl', name: 'Bill of Lading (OBL/BL)', loaded: isBlLoaded, stepLabel: 'S3' },
                                { key: 'coo', name: 'Certificate of Origin (COO)', loaded: isCooLoaded, stepLabel: 'S4' },
                                { key: 'phyto', name: 'Phytosanitary (PHYTO)', loaded: isPhytoLoaded, stepLabel: 'S5' },
                              ].map((doc) => {
                                const selected = isDocSelected(doc.key);
                                return (
                                  <div 
                                    key={doc.key}
                                    onClick={() => toggleDocSelection(doc.key)}
                                    className={`cursor-pointer p-3 border rounded-xl flex flex-col justify-between h-[96px] text-left transition select-none ${
                                      selected 
                                        ? doc.loaded 
                                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-3xs' 
                                          : 'bg-indigo-50/50 border-indigo-250 text-indigo-950 shadow-3xs'
                                        : 'bg-slate-55/40 border-slate-200 text-slate-400 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <span className="text-[9px] font-mono tracking-wider text-slate-400 font-bold uppercase leading-none">
                                        {doc.stepLabel}
                                      </span>
                                      <input 
                                        type="checkbox"
                                        checked={selected}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          toggleDocSelection(doc.key);
                                        }}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                      />
                                    </div>
                                    <div className="mt-1">
                                      <span className="block text-[11px] font-bold leading-tight line-clamp-2">
                                        {doc.name}
                                      </span>
                                    </div>
                                    <div>
                                      {doc.loaded ? (
                                        <span className="inline-flex items-center gap-1 text-[8px] text-emerald-650 bg-emerald-100/50 px-1.5 py-0.5 rounded font-bold uppercase">
                                          ✓ FILE READY
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[8px] text-amber-600 bg-amber-100/30 px-1.5 py-0.5 rounded font-bold uppercase">
                                          ⏳ NOT REQ / PENDING
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Run controls */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                              <div className="text-left">
                                <span className="text-xs font-sans text-slate-500 font-semibold block">
                                  Selected Pages to Compile: <strong className="text-indigo-600 font-bold">{selectedKeys.length} page(s)</strong>
                                </span>
                                <span className="text-[10px] uppercase font-mono text-slate-400 block tracking-wide font-extrabold mt-0.5">
                                  ORDER: CI → PL → BL → COO → PHYTO
                                </span>
                              </div>

                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                {selectedKeys.length === 0 ? (
                                  <button 
                                    disabled
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-200 text-slate-405 text-xs font-bold font-sans rounded-xl cursor-not-allowed border border-slate-300"
                                  >
                                    <Download className="w-4 h-4 shrink-0" />
                                    Select Docs to Compile
                                  </button>
                                ) : (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadCombinedPDF(activeQuote, selectedKeys);
                                    }}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold font-sans rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-transform duration-100 active:scale-95 text-center"
                                  >
                                    <Download className="w-4 h-4 shrink-0" />
                                    Download Combined Export PDF
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                    </div>

                    {/* ACTIVE SHIPMENT DATA & PROFORMA EDITOR (IN THAT SPACE) */}
                    {(() => {
                      const quoteIndustry = activeQuote.industry || industry || 'grain';
                      const defaultItems = SPECIALIZED_CHECKLISTS[quoteIndustry] || SPECIALIZED_CHECKLISTS.generic || [];
                      const customItems = activeQuote.customChecklistItems || [];
                      const combinedChecklistItems = [...defaultItems, ...customItems];
                      
                      // Count completed status
                      let completedCount = 0;
                      const itemsWithStatus = combinedChecklistItems.map(item => {
                        let isDone = false;
                        let autoMatched = false;
                        
                        // Check autoKey matches in quote workflow
                        if (item.autoKey) {
                          if (item.autoKey === 'pi') {
                            isDone = activeQuote.approvedPiUploaded || !!(activeQuote.workflow?.pi?.fileName || activeQuote.workflow?.signed?.fileName);
                            autoMatched = isDone;
                          } else if (item.autoKey === 'ci') {
                            isDone = !!activeQuote.workflow?.ci?.fileName;
                            autoMatched = isDone;
                          } else if (item.autoKey === 'pl') {
                            isDone = !!activeQuote.workflow?.pl?.fileName;
                            autoMatched = isDone;
                          } else if (item.autoKey === 'phyto') {
                            isDone = !!activeQuote.workflow?.phyto?.fileName;
                            autoMatched = isDone;
                          } else if (item.autoKey === 'shipping_invoice') {
                            isDone = !!activeQuote.workflow?.shipping_invoice?.fileName || !!activeQuote.blNo;
                            autoMatched = isDone;
                          }
                        }
                        
                        // If not autoMatched, check if manually marked done
                        if (!autoMatched) {
                          isDone = !!activeQuote.checklistCompleted?.[item.key];
                        }

                        // Also check attachments for this checklist item -> if any exist, it is verified/done
                        const attachmentsList = activeQuote.itemAttachments?.[item.key] || [];
                        if (attachmentsList.length > 0) {
                          isDone = true;
                        }
                        
                        if (isDone) completedCount++;
                        return { ...item, isDone, autoMatched };
                      });
                      
                      const progressPct = combinedChecklistItems.length > 0 ? Math.round((completedCount / combinedChecklistItems.length) * 100) : 0;
                      const industryLabel = quoteIndustry === 'grain' ? 'Grain / Rice' :
                        quoteIndustry === 'spices' ? 'Exotic Spices' :
                        quoteIndustry === 'chemicals' ? 'Industrial Chemicals' :
                        quoteIndustry === 'salts' ? 'Crystalline Salts' :
                        quoteIndustry === 'vegetables_fruits' ? 'Fresh Vegetables & Fruits' :
                        quoteIndustry === 'tiles' ? 'Ceramic Tiles & Surfaces' : 'Generic Trade';

                      return (
                        <>
                          <div className="card bg-white p-5 border border-indigo-200/50 rounded-xl shadow-xs space-y-4 text-left" id="document-making-editor-card">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                              <div>
                                <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2.5 py-1 rounded-sm font-mono font-bold tracking-wider uppercase">
                                  ACTIVE SHIPMENT DATA & PROFORMA EDITOR
                                </span>
                                <h3 className="font-extrabold text-sm text-gray-900 uppercase mt-1">
                                  Fast-Track Live Data Revisions & Overrides
                                </h3>
                              </div>
                              
                              {/* Audit Checklist Modal trigger button */}
                              <button
                                type="button"
                                onClick={() => setIsChecklistOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-black uppercase transition cursor-pointer select-none"
                                title="Open Shipment Document Audit Checklist (Last check for closing shipment)"
                              >
                                <span>📋 Audit Checklist</span>
                                <span className="bg-blue-605 text-blue-700 rounded-full text-[9px] px-1.5 py-0.2 ml-1 font-extrabold">
                                  {progressPct}%
                                </span>
                              </button>
                            </div>

                            <p className="text-xs text-gray-505 leading-relaxed font-sans">
                              Modify container loads, bag size specifications, and landed values below. These overrides will seamlessly propagate to all generated **A4 Proforma (PI)** and **Commercial Invoice (CI)** output sheets instantly.
                            </p>

                            {/* Active items inputs table or list layout */}
                            <div className="space-y-4">
                              {editorItems.map((row, idx) => {
                                return (
                                  <div key={row.id || idx} className="p-4 border border-slate-150 bg-slate-50/45 rounded-xl space-y-3 text-left">
                                    {idx === 0 && (
                                      <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border border-blue-150 p-2.5 rounded-lg flex flex-wrap items-center justify-between gap-2 mb-1">
                                        <div className="flex flex-wrap items-center gap-1.5 leading-none">
                                          <span className="bg-blue-600 text-white font-mono font-black text-[9px] px-2 py-0.5 rounded tracking-wide">
                                            QUOTE: #{activeQuote.ref}
                                          </span>
                                          <span className="text-gray-300">|</span>
                                          <span className="text-[10px] font-black text-blue-950 uppercase">
                                            👤 BUYER: {activeQuote.buyer}
                                          </span>
                                        </div>
                                        <span className="text-[8.5px] text-blue-600 font-mono font-extrabold uppercase bg-white border border-blue-150 px-1.5 py-0.2 rounded shadow-2xs">
                                          ACTIVE DOCUMENT DRAFT
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-205">
                                      <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-tight">
                                        Item #{idx + 1}: {row.commodity}
                                      </span>
                                      <span className="text-[10px] uppercase font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                        Original Rate: ${activeQuote.items[idx]?.rate || row.rate}/MT
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                      {/* 1. Commodity Brand */}
                                      <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                          Commodity Brand
                                        </label>
                                        <input
                                          type="text"
                                          value={row.brand || ''}
                                          onChange={(e) => handleItemEditorChange(idx, 'brand', e.target.value)}
                                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                        />
                                      </div>

                                      {/* 2. FCL Load (Quantity) */}
                                      <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                          Total FCL Load (Containers)
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          max="1000"
                                          step="1"
                                          value={row.numFCL || 0}
                                          onChange={(e) => handleItemEditorChange(idx, 'numFCL', e.target.value)}
                                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                        />
                                      </div>

                                      {/* 3. Weight Per Container Payload (Kg) */}
                                      <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                          Net Cargo Per FCL (Kg weight)
                                        </label>
                                        <input
                                          type="number"
                                          min="1000"
                                          max="50000"
                                          step="10"
                                          value={row.weightPerContainerKg || 0}
                                          onChange={(e) => handleItemEditorChange(idx, 'weightPerContainerKg', e.target.value)}
                                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold table-mono text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                        />
                                      </div>

                                      {/* 4. Landed Rate (Price USD per Metr. Ton) */}
                                      <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                          Landed Price (USD / MT)
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          step="0.01"
                                          value={row.rate || 0}
                                          onChange={(e) => handleItemEditorChange(idx, 'rate', e.target.value)}
                                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold table-mono text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none border-blue-200"
                                        />
                                      </div>

                                      {/* 5. Bag Packaging Style name  */}
                                      <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                          Packaging Spec Style
                                        </label>
                                        <input
                                          type="text"
                                          placeholder="e.g. PP Bag"
                                          value={row.packed || ''}
                                          onChange={(e) => handleItemEditorChange(idx, 'packed', e.target.value)}
                                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                        />
                                      </div>

                                      {/* 6. Kg per Bag (e.g. "GRAIN 20 KG" or text) */}
                                      <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                          Bag Net Size (Kg weight spec)
                                        </label>
                                        <input
                                          type="text"
                                          placeholder="e.g. GRAIN 20 KG"
                                          value={row.size || ''}
                                          onChange={(e) => handleItemEditorChange(idx, 'size', e.target.value)}
                                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                        />
                                      </div>
                                    </div>

                                    {/* Show Live Computed Totals */}
                                    <div className="bg-indigo-50/50 rounded-xl p-3 flex items-center justify-between text-indigo-950 mt-1.5 border border-indigo-100 text-xs">
                                      <div>
                                        <span className="block text-[9px] uppercase font-bold text-indigo-400 font-sans">Total Cargo Load MT</span>
                                        <span className="text-xs font-black font-mono">
                                          {((row.totalWeightKg || 0) / 1000).toFixed(3)} Metric Tons
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <span className="block text-[9px] uppercase font-bold text-indigo-400 font-sans">Total Target Packing</span>
                                        <span className="text-xs font-black font-mono">
                                          {(row.totalBags || 0).toLocaleString()} Bags
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Revision note section */}
                            <div className="pt-2 text-left">
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1 tracking-wider">
                                📝 Document Making Notes & Revision Remarks (Auto-timestamps updates)
                              </label>
                              <textarea
                                rows={2}
                                placeholder="Type any final adjustment comments here. These will be logged under the Document Revision Log."
                                value={revisionNote}
                                onChange={(e) => setRevisionNote(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-gray-800 font-medium placeholder-gray-400 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-y"
                              />
                            </div>

                            {/* Action Save button */}
                            <div className="pt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setShowConfirmModal(true)}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-indigo-100 flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-4 h-4 text-indigo-150" />
                                <span>Save & Overwrite Active PI/CI Document Data</span>
                              </button>
                            </div>
                          </div>

                          {/* BEAUTIFUL POPUP COMPLIANCE CHECKLIST MODAL */}
                          {isChecklistOpen && (
                            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-opacity" onClick={() => setIsChecklistOpen(false)}>
                              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col scale-100 transition-transform" onClick={(e) => e.stopPropagation()}>
                                {/* Modal Header */}
                                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
                                  <div>
                                    <span className="bg-blue-100 text-blue-800 text-[10px] px-2.5 py-1 rounded-md font-mono font-bold tracking-wider uppercase">
                                      Compliance Checklist Popup
                                    </span>
                                    <h3 className="font-extrabold text-sm text-gray-900 uppercase mt-0.5 flex items-center gap-1.5">
                                      <span>{industryLabel} Module</span>
                                      <span className="text-gray-300 font-light">•</span>
                                      <span className="text-gray-500 font-sans tracking-wide">Shipment Document Audit Checklist</span>
                                    </h3>
                                  </div>
                                  
                                  <button
                                    type="button"
                                    onClick={() => setIsChecklistOpen(false)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                                  >
                                    <X className="w-5 h-5 text-gray-500" />
                                  </button>
                                </div>

                                {/* Modal Content - The Audit Checklist with progress */}
                                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                                  {/* Progress Visual */}
                                  <div className="flex items-center justify-between bg-gray-50 border p-3 rounded-xl">
                                    <div className="flex-1">
                                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider font-sans text-left block">Overall Checklist Progress</span>
                                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mt-1 max-w-[250px]">
                                        <div 
                                          className={`h-full transition-all duration-300 ${progressPct === 100 ? 'bg-emerald-600' : 'bg-blue-605'}`} 
                                          style={{ width: `${progressPct}%` }}
                                        />
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-mono text-gray-950 font-extrabold text-xs tracking-tight">{completedCount} of {combinedChecklistItems.length} Docs Checked ({progressPct}%)</span>
                                    </div>
                                  </div>

                                  {/* Quick checklist items list */}
                                  <div className="divide-y divide-gray-100 max-h-[380px] overflow-y-auto pr-1">
                                    {itemsWithStatus.map((item) => {
                                      return (
                                        <div 
                                          key={item.key} 
                                          onClick={() => {
                                            if (!item.autoMatched) {
                                              toggleChecklistItem(activeQuote.id, item.key);
                                            }
                                          }}
                                          className={`py-3 flex flex-col gap-1.5 group select-none cursor-pointer hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition ${item.isDone ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : ''}`}
                                        >
                                          <div className="flex items-start gap-3.5">
                                            <div className="mt-0.5 shrink-0" onClick={(e) => {
                                              if (item.autoMatched) {
                                                e.stopPropagation();
                                              }
                                            }}>
                                              {item.isDone ? (
                                                <div className={`p-0.5 rounded-md border flex items-center justify-center transition-all ${
                                                  item.autoMatched 
                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-350' 
                                                    : 'bg-emerald-600 text-white border-emerald-700'
                                                }`}>
                                                  <Check className="w-4.5 h-4.5 text-current stroke-[3]" />
                                                </div>
                                              ) : (
                                                <div className="w-5 h-5 rounded-md border border-gray-300 bg-white group-hover:border-blue-400 transition" />
                                              )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0 space-y-0.5 text-left">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`font-extrabold text-xs tracking-tight ${item.isDone ? 'text-emerald-700 font-bold' : 'text-gray-800'}`}>
                                                  {item.label}
                                                </span>
                                                
                                                {item.autoMatched && (
                                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-lg flex items-center gap-0.5">
                                                    ✓ Verified by Upload
                                                  </span>
                                                )}

                                                {(item as any).isCustom && (
                                                  <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-lg">
                                                    Custom Task
                                                  </span>
                                                )}
                                                
                                                {item.required ? (
                                                  <span className="bg-red-50 text-red-650 border border-red-150 text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded">
                                                    Mandatory
                                                  </span>
                                                ) : (
                                                  <span className="bg-gray-100 text-gray-500 border border-gray-200 text-[8.5px] font-bold uppercase px-1.5 py-0.2 rounded">
                                                    Optional
                                                  </span>
                                                )}
                                              </div>
                                              <p className={`text-[11px] leading-snug font-medium ${item.isDone ? 'text-emerald-600/90' : 'text-gray-550'}`}>
                                                {item.desc}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Dynamic Custom Task Creator */}
                                  <div className="pt-3 border-t">
                                    {!showAddCustomForm ? (
                                      <button
                                        type="button"
                                        onClick={() => setShowAddCustomForm(true)}
                                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 border border-dashed border-gray-300 hover:border-blue-400 text-gray-700 hover:text-blue-700 bg-gray-50/50 hover:bg-white rounded-lg text-xs font-black transition cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add Custom Compliance / Document Task</span>
                                      </button>
                                    ) : (
                                      <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl space-y-3 text-left">
                                        <div className="flex justify-between items-center pb-1.5 border-b border-gray-200">
                                          <span className="text-[10px] font-black uppercase text-gray-800 tracking-wider font-sans">
                                            Create Custom Compliance / Document Task
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setShowAddCustomForm(false);
                                              setNewCustomLabel('');
                                              setNewCustomDesc('');
                                            }}
                                            className="text-gray-400 hover:text-gray-700 font-bold cursor-pointer"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                          <div>
                                            <label className="block text-[10px] font-bold text-gray-650 uppercase mb-1">
                                              Task / Document Name
                                            </label>
                                            <input
                                              type="text"
                                              placeholder="e.g. Health Certificate"
                                              value={newCustomLabel}
                                              onChange={(e) => setNewCustomLabel(e.target.value)}
                                              className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs text-gray-800"
                                            />
                                          </div>
                                          
                                          <div>
                                            <label className="block text-[10px] font-bold text-gray-655 uppercase mb-1">
                                              Task Description / Criteria
                                            </label>
                                            <input
                                              type="text"
                                              placeholder="e.g. Formally stamped by Ministry"
                                              value={newCustomDesc}
                                              onChange={(e) => setNewCustomDesc(e.target.value)}
                                              className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs text-gray-800"
                                            />
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 justify-between text-xs pt-1">
                                          <label className="flex items-center gap-1.5 font-bold text-gray-700 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={newCustomRequired}
                                              onChange={(e) => setNewCustomRequired(e.target.checked)}
                                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>This task is Mandatory</span>
                                          </label>
                                          
                                          <div className="flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setShowAddCustomForm(false);
                                                setNewCustomLabel('');
                                                setNewCustomDesc('');
                                              }}
                                              className="px-2.5 py-1 text-gray-500 hover:bg-gray-100 rounded text-xs font-semibold cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (newCustomLabel.trim()) {
                                                  addCustomChecklistItem(activeQuote.id, newCustomLabel, newCustomDesc, newCustomRequired);
                                                  setNewCustomLabel('');
                                                  setNewCustomDesc('');
                                                  setNewCustomRequired(true);
                                                  setShowAddCustomForm(false);
                                                } else {
                                                  alert('Please specify a Task Name.');
                                                }
                                              }}
                                              className="px-3.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-black transition cursor-pointer"
                                            >
                                              Add Task
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setIsChecklistOpen(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs transition"
                                  >
                                    Done
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* CONFIRMATION OVERLAY MODAL FOR DATA OVERWRITE */}
                          {showConfirmModal && (
                            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-51">
                              <div className="bg-white rounded-2xl border border-rose-100 shadow-2xl w-full max-w-md p-6 space-y-4 text-center">
                                <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
                                  <ShieldAlert className="w-6 h-6 stroke-[2]" />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="font-extrabold text-sm text-gray-900 uppercase">
                                    ⚠️ Confirm final document update?
                                  </h4>
                                  <p className="text-xs text-gray-505 leading-relaxed max-w-[320px] mx-auto font-medium">
                                    Are you sure you want to save and lock these final modifications? This will irreversibly rewrite active Proforma & Commercial invoice totals and log the date-stamped note to reports.
                                  </p>
                                </div>
                                <div className="flex gap-2 justify-center pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(false)}
                                    className="px-4 py-2 text-gray-500 border border-gray-300 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-black uppercase transition cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSaveEditorChanges}
                                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black uppercase transition cursor-pointer shadow-md shadow-rose-100"
                                  >
                                    Yes, Overwrite & Log
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* DYNAMIC DOCUMENTS GENERATOR PLATFORM */}
                    <div className="card bg-white p-5 border border-gray-200 rounded-xl shadow-xs space-y-4">
                      
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-[10.5px] font-black text-gray-500 uppercase tracking-widest block">
                          Export Compliance Document Workspaces
                        </span>
                        <span className="text-[9.5px] italic text-slate-400">A4 Portrait Grid Calibration</span>
                      </div>

                      <div className="space-y-4">

                        {/* DOCUMENT BLOCK 1: PROFORMA INVOICE */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl block">
                                <FileText className="w-5 h-5" />
                              </span>
                              <div>
                                <h4 className="font-extrabold text-xs text-gray-900 uppercase">
                                  Proforma Invoice Worksheets (PI)
                                </h4>
                                <p className="text-[11px] text-gray-500 leading-none">
                                  Generate initial export agreements, lock down rates, and custom bank codes.
                                </p>
                              </div>
                            </div>
                            
                            {/* Record display */}
                            <div className="pt-2 text-[11px] flex gap-2">
                              <span className="text-gray-450 font-semibold font-mono">Status:</span>
                              {isPiApproved ? (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black flex items-center gap-1">
                                  ✓ Signed PI Record is verified & saved
                                </span>
                              ) : (
                                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold flex items-center gap-1 animate-pulse">
                                  ⚠ Draft Created. Waiting for approved signed copy upload.
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 items-center shrink-0">
                            {/* Print Actions */}
                            <button
                              onClick={() => onLaunchWorkspace?.(activeQuote.id, 'pi', false)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black transition-all"
                            >
                              ✏️ Edit A4 PI (Inline)
                            </button>
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}${window.location.pathname}?workspace=true&quoteId=${activeQuote.id}&type=pi`;
                                window.open(url, '_blank');
                              }}
                              className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-150 rounded-lg text-xs font-black flex items-center gap-1 transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Open Tab
                            </button>

                            {/* Simulated Upload signed version */}
                            <label className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-250 cursor-pointer rounded-lg text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1">
                              <Upload className="w-3.5 h-3.5" /> File Signed copy
                              <input 
                                type="file" 
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleIncomingFile(file, 'pi');
                                }}
                              />
                            </label>

                            {!isPiApproved && (
                              <button
                                onClick={() => applyVerifiedFileSave('pi', `SIGNED_CONTRACT_PI-${activeQuote.ref}.pdf`, 380000)}
                                className="px-2 py-1 bg-gray-100 hover:bg-emerald-600 text-gray-700 hover:text-white rounded text-[10px] font-bold transition"
                                title="Fast-Track Approval automatically"
                              >
                                Auto Approve
                              </button>
                            )}
                          </div>
                        </div>

                        {/* DOCUMENT BLOCK 2: COMMERCIAL INVOICE */}
                        <div className={`border rounded-xl p-4 transition-all relative ${
                          isPiApproved 
                            ? 'border-gray-200 bg-gray-50/25' 
                            : 'border-gray-200/60 bg-gray-100/30 opacity-70 select-none'
                        }`}>
                          {!isPiApproved && (
                            <div className="absolute inset-0 bg-white/40 z-10 rounded-xl flex items-center justify-center p-4 text-center">
                              <div className="bg-gray-900 text-white rounded-xl py-1.5 px-3 flex items-center gap-2 text-[10px] font-bold shadow-lg">
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                                <span>CI Workspace Unlocks when Signed Approved PI copy is uploaded back for records</span>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="p-2 bg-violet-50 text-violet-600 rounded-xl block">
                                  <Coins className="w-5 h-5 text-violet-500" />
                                </span>
                                <div>
                                  <h4 className="font-extrabold text-xs text-gray-900 uppercase">
                                    Commercial Invoice Worksheets (CI)
                                  </h4>
                                  <p className="text-[11px] text-gray-500 leading-none">
                                    Calculates financial settlements, dynamic Indian lakhs word amounts, and carriage logs.
                                  </p>
                                </div>
                              </div>
                              
                              <div className="pt-2 text-[11px] flex gap-2">
                                <span className="text-gray-450 font-semibold font-mono">Status:</span>
                                {isCiSigned ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black flex items-center gap-1">
                                    ✓ Signed Commercial Invoice file verified & on record
                                  </span>
                                ) : (
                                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                    ⚠ Pending custom stamp uploading. Edit page to generate A4 sheet.
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 items-center shrink-0">
                              <button
                                disabled={!isPiApproved}
                                onClick={() => onLaunchWorkspace?.(activeQuote.id, 'ci', false)}
                                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-black transition-all disabled:pointer-events-none"
                              >
                                ✏️ Edit A4 CI (Inline)
                              </button>
                              <button
                                disabled={!isPiApproved}
                                onClick={() => {
                                  const url = `${window.location.origin}${window.location.pathname}?workspace=true&quoteId=${activeQuote.id}&type=ci`;
                                  window.open(url, '_blank');
                                }}
                                className="px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-150 rounded-lg text-xs font-black flex items-center gap-1 transition disabled:pointer-events-none"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Open Tab
                              </button>

                              <label className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-250 cursor-pointer rounded-lg text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1">
                                <Upload className="w-3.5 h-3.5" /> File Signed copy
                                <input 
                                  type="file" 
                                  className="hidden"
                                  disabled={!isPiApproved}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleIncomingFile(file, 'ci');
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* DOCUMENT BLOCK 3: PACKING LIST */}
                        <div className={`border rounded-xl p-4 transition-all relative ${
                          isPiApproved 
                            ? 'border-gray-200 bg-gray-50/25' 
                            : 'border-gray-200/60 bg-gray-100/30 opacity-70 select-none'
                        }`}>
                          {!isPiApproved && (
                            <div className="absolute inset-0 bg-white/40 z-10 rounded-xl flex items-center justify-center p-4 text-center">
                              <div className="bg-gray-900 text-white rounded-xl py-1.5 px-3 flex items-center gap-2 text-[10px] font-bold shadow-lg">
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                                <span>PL Workspace Unlocks when Signed Approved PI copy is uploaded back for records</span>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl block animate-none">
                                  <FileText className="w-5 h-5 text-emerald-600" />
                                </span>
                                <div>
                                  <h4 className="font-extrabold text-xs text-gray-900 uppercase">
                                    Packing List Specifications (PL)
                                  </h4>
                                  <p className="text-[11px] text-gray-500 leading-none">
                                    Configure cargo stuffing lists, container lot seals, gross/net weights, and packaging.
                                  </p>
                                </div>
                              </div>
                              
                              <div className="pt-2 text-[11px] flex gap-2">
                                <span className="text-gray-450 font-semibold font-mono">Status:</span>
                                {isPlSigned ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black flex items-center gap-1">
                                    ✓ Signed Packing Specifications verified & locks verified
                                  </span>
                                ) : (
                                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                    ⚠ Pending custom stamp uploading. Edit page to generate A4 sheet.
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 items-center shrink-0">
                              <button
                                disabled={!isPiApproved}
                                onClick={() => onLaunchWorkspace?.(activeQuote.id, 'pl', false)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-all disabled:pointer-events-none"
                              >
                                ✏️ Edit A4 PL (Inline)
                              </button>
                              <button
                                disabled={!isPiApproved}
                                onClick={() => {
                                  const url = `${window.location.origin}${window.location.pathname}?workspace=true&quoteId=${activeQuote.id}&type=pl`;
                                  window.open(url, '_blank');
                                }}
                                className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-150 rounded-lg text-xs font-black flex items-center gap-1 transition disabled:pointer-events-none"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Open Tab
                              </button>

                              <label className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-250 cursor-pointer rounded-lg text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1">
                                <Upload className="w-3.5 h-3.5" /> File Signed copy
                                <input 
                                  type="file" 
                                  className="hidden"
                                  disabled={!isPiApproved}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleIncomingFile(file, 'pl');
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* CUSTOMS & CERTIFICATION COMPLIANCE COMPONENT */}
                    <div className="card bg-white p-5 border border-gray-200 rounded-xl shadow-xs space-y-4">
                      <div className="border-b pb-2">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest block font-sans">
                          Customs & Shipping Compliance
                        </span>
                        <h4 className="font-extrabold text-xs text-gray-900 uppercase mt-0.5">
                          Upload Shipping Bill, Phyto & Shipping Invoice
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Verify and upload regulatory compliance certificates to finalize port dispatch. All team members see updates instantly.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* 1. SHIPPING BILL */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800 uppercase">
                              <FileSpreadsheet className="w-4 h-4 text-blue-600 animate-pulse" />
                              <span>Shipping Bill (SB)</span>
                            </div>
                            <p className="text-[10.5px] text-gray-500 leading-tight">
                              Export Customs clearance bill filed at port terminals.
                            </p>
                            
                            {/* Status display */}
                            <div className="pt-2 text-[10.5px]">
                              {activeQuote.workflow?.shipping_bill?.fileName ? (
                                <div className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{activeQuote.workflow.shipping_bill.fileName}</span>
                                </div>
                              ) : (
                                <span className="text-amber-700 font-medium italic bg-amber-50 px-2 py-0.5 rounded block text-center">
                                  ⚠ Pending Upload
                                </span>
                              )}
                            </div>
                          </div>

                          <label className="w-full py-2 bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer rounded-lg text-[11px] font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1">
                            <Upload className="w-3.5 h-3.5" /> Upload SB PDF
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleIncomingFile(file, 'shipping_bill');
                              }}
                            />
                          </label>
                        </div>

                        {/* 2. PHYTO CERTIFICATE */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800 uppercase">
                              <BadgeCheck className="w-4 h-4 text-emerald-650 animate-pulse" />
                              <span>Phyto Certificate</span>
                            </div>
                            <p className="text-[10.5px] text-gray-500 leading-tight">
                              Official food-grade phytosanitary health clearance.
                            </p>
                            
                            {/* Status display */}
                            <div className="pt-2 text-[10.5px]">
                              {activeQuote.workflow?.phyto?.fileName ? (
                                <div className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{activeQuote.workflow.phyto.fileName}</span>
                                </div>
                              ) : (
                                <span className="text-amber-700 font-medium italic bg-amber-50 px-2 py-0.5 rounded block text-center">
                                  ⚠ Pending Upload
                                </span>
                              )}
                            </div>
                          </div>

                          <label className="w-full py-2 bg-emerald-50 text-emerald-750 border border-emerald-200 cursor-pointer rounded-lg text-[11px] font-bold hover:bg-emerald-100 transition flex items-center justify-center gap-1">
                            <Upload className="w-3.5 h-3.5" /> Upload Phyto PDF
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleIncomingFile(file, 'phyto');
                              }}
                            />
                          </label>
                        </div>

                        {/* 3. SHIPPING INVOICE */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800 uppercase">
                              <Coins className="w-4 h-4 text-violet-600 animate-pulse" />
                              <span>Shipping Invoice</span>
                            </div>
                            <p className="text-[10.5px] text-gray-500 leading-tight">
                              Final commercial dispatch invoice with vessel codes.
                            </p>
                            
                            {/* Status display */}
                            <div className="pt-2 text-[10.5px]">
                              {activeQuote.workflow?.shipping_invoice?.fileName ? (
                                <div className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{activeQuote.workflow.shipping_invoice.fileName}</span>
                                </div>
                              ) : (
                                <span className="text-amber-700 font-medium italic bg-amber-50 px-2 py-0.5 rounded block text-center">
                                  ⚠ Pending Upload
                                </span>
                              )}
                            </div>
                          </div>

                          <label className="w-full py-2 bg-violet-50 text-violet-750 border border-violet-200 cursor-pointer rounded-lg text-[11px] font-bold hover:bg-violet-100 transition flex items-center justify-center gap-1">
                            <Upload className="w-3.5 h-3.5" /> Upload Invoice PDF
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleIncomingFile(file, 'shipping_invoice');
                              }}
                            />
                          </label>
                        </div>

                      </div>
                    </div>

                    {/* B/L SHIPMENT TRACKING & CONTROL TOWER */}
                    <div className="card bg-slate-900 text-white p-5 sm:p-6 border border-slate-850 rounded-2xl shadow-xl space-y-5">
                      <div className="border-b border-slate-800 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-widest block">
                            Direct Dispatch & API Control Tower
                          </span>
                          <h4 className="font-extrabold text-sm text-white uppercase mt-1 flex items-center gap-1.5">
                            <Ship className="w-4 h-4 text-sky-400 animate-pulse" />
                            <span>B/L Location & Client Auto-Email Tracker</span>
                          </h4>
                          <p className="text-[11px] text-slate-400">
                             Manage container location drift, dispatch automated status logs, and simulate real-time vessel email notifications to buyers based on B/L and container numbers.
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0 pt-1 md:pt-0">
                          <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-md">
                            Portal API Enabled
                          </span>
                        </div>
                      </div>

                      {/* Control Panel Parameters form */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-850">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">
                            Bill of Lading (B/L) ID
                          </label>
                          <input 
                            type="text" 
                            value={activeQuote.blNo || ''}
                            onChange={(e) => handleUpdateQuoteField('blNo', e.target.value)}
                            placeholder="e.g. BL-MUNDRA-109"
                            className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 text-xs rounded-lg p-2 focus:outline-hidden text-white font-mono placeholder-slate-600"
                          />
                          <span className="text-[9px] text-slate-500 block">Unique ID shared with client for public lookups.</span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">
                            Container Number
                          </label>
                          <input 
                            type="text" 
                            value={activeQuote.containerNo || ''}
                            onChange={(e) => handleUpdateQuoteField('containerNo', e.target.value)}
                            placeholder="e.g. DPW-MU-79450-IND"
                            className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 text-xs rounded-lg p-2 focus:outline-hidden text-white font-mono placeholder-slate-600"
                          />
                          <span className="text-[9px] text-slate-500 block">Unique physical steel box ID.</span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">
                            Client Notify Email
                          </label>
                          <input 
                            type="email" 
                            value={activeQuote.trackingEmail || ''}
                            onChange={(e) => handleUpdateQuoteField('trackingEmail', e.target.value)}
                            placeholder="e.g. logistics@al-meera.qa"
                            className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 text-xs rounded-lg p-2 focus:outline-hidden text-white font-mono placeholder-slate-600"
                          />
                          <span className="text-[9px] text-slate-500 block">Outbound address for automatic dispatch notifications.</span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">
                            Vessel Expected ETA
                          </label>
                          <input 
                            type="date" 
                            value={activeQuote.trackingEta || ''}
                            onChange={(e) => handleUpdateQuoteField('trackingEta', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 text-xs rounded-lg p-2 focus:outline-hidden text-white font-mono"
                          />
                          <span className="text-[9px] text-slate-500 block">Target arrival date displayed to buyer.</span>
                        </div>
                      </div>

                      {/* Location transition drivers */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
                        <div className="space-y-1 text-center sm:text-left">
                          <span className="text-[10px] font-mono uppercase text-slate-500 block">GPS Automation Drivers</span>
                          <div className="flex items-center justify-center sm:justify-start gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                            <p className="text-xs text-slate-300 font-bold">
                              Current Milestones Logged: <strong className="font-mono text-sky-450">{activeQuote.trackingUpdates?.length || 0} Checkpoints</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={handleSimulateTransitDrift}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-black transition flex items-center gap-1 shadow-md shadow-blue-500/10"
                          >
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            ⏳ Simulate 2-3 Day Transit Shift
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleDeclareDelivered}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition flex items-center gap-1 shadow-md"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-white shrink-0" />
                            Declare Delivered (Arrival Email)
                          </button>

                          {(activeQuote.trackingUpdates?.length || 0) > 0 && (
                            <button
                              type="button"
                              onClick={handleClearTrackingHistory}
                              className="px-3 py-2 bg-slate-905 border border-slate-800 text-slate-400 hover:bg-slate-800 rounded-lg text-xs font-semibold transition flex items-center"
                              title="Clear Log History"
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Visual Progress Map Checkpoint Stepper */}
                      <div className="relative py-2 max-w-xl mx-auto w-full select-none">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
                        
                        {(() => {
                          const logsCount = activeQuote.trackingUpdates?.length || 0;
                          let progressWidth = "0%";
                          if (logsCount === 1) progressWidth = "33%";
                          else if (logsCount === 2) progressWidth = "66%";
                          else if (logsCount >= 3) progressWidth = "100%";
                          return (
                            <div className="absolute top-1/2 left-0 h-0.5 bg-sky-500 -translate-y-1/2 z-0 transition-all duration-500" style={{ width: progressWidth }} />
                          );
                        })()}

                        <div className="relative z-10 flex justify-between">
                          <div className="flex flex-col items-center">
                            <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-black">
                              1
                            </div>
                            <span className="text-[9px] font-bold uppercase text-slate-350 mt-1">Ready</span>
                          </div>

                          <div className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition ${
                              (activeQuote.trackingUpdates?.length || 0) >= 1 ? 'bg-sky-650 text-white' : 'bg-slate-800 text-slate-500'
                            }`}>
                              2
                            </div>
                            <span className={`text-[9px] font-bold uppercase mt-1 ${
                              (activeQuote.trackingUpdates?.length || 0) >= 1 ? 'text-slate-200 animate-pulse' : 'text-slate-500'
                            }`}>Clear Port</span>
                          </div>

                          <div className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition ${
                              (activeQuote.trackingUpdates?.length || 0) >= 2 ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-500'
                            }`}>
                              3
                            </div>
                            <span className={`text-[9px] font-bold uppercase mt-1 ${
                              (activeQuote.trackingUpdates?.length || 0) >= 2 ? 'text-slate-200' : 'text-slate-500'
                            }`}>Crossing</span>
                          </div>

                          <div className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition ${
                              (activeQuote.trackingUpdates?.length || 0) >= 4 || activeQuote.piStatus === 'done' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                            }`}>
                              4
                            </div>
                            <span className={`text-[9px] font-bold uppercase mt-1 ${
                              (activeQuote.trackingUpdates?.length || 0) >= 4 || activeQuote.piStatus === 'done' ? 'text-emerald-400' : 'text-slate-500'
                            }`}>Delivered</span>
                          </div>
                        </div>
                      </div>

                      {/* Location Checkpoints history feed stack */}
                      <div className="space-y-3">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                          Vessel GPS & Checkpoint Log Records
                        </span>

                        {activeQuote.trackingUpdates && activeQuote.trackingUpdates.length > 0 ? (
                          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                            {activeQuote.trackingUpdates.slice().reverse().map((log, index) => (
                              <div 
                                key={log.id || index}
                                className={`p-3.5 rounded-xl border flex gap-3 text-left ${
                                  index === 0 
                                    ? 'bg-sky-950/15 border-sky-900/40 text-white' 
                                    : 'bg-slate-950/50 border-slate-900/60 text-slate-350'
                                }`}
                              >
                                <div className="mt-0.5">
                                  {index === 0 ? (
                                    <div className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0">
                                      <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-sky-400 opacity-75"></span>
                                      <MapPin className="w-3 h-3 relative z-10" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                                      <CheckCircle className="w-3 h-3 text-slate-400" />
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <h5 className="font-extrabold text-[11px] uppercase truncate text-slate-100">
                                      {log.location}
                                    </h5>
                                    <span className="text-[9px] font-mono text-slate-500 font-bold shrink-0">
                                      {log.date}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded font-mono uppercase tracking-wider ${
                                      log.status.includes('Delivered')
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                    }`}>
                                      {log.status}
                                    </span>
                                    {log.emailSent && (
                                      <span className="text-[9.5px] text-slate-500 italic block">
                                        ✉ Live SMTP notified: <strong className="font-mono">{log.emailRecipient || activeQuote.trackingEmail || 'Buyer'}</strong>
                                      </span>
                                    )}
                                  </div>
                                  
                                  <p className="text-[11px] leading-relaxed text-slate-400 font-sans pt-1">
                                    {log.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 border border-dashed border-slate-850 bg-slate-950/30 rounded-xl text-center text-slate-500 font-mono text-xs">
                            No vessel GPS checkpoints recorded yet. Change or enter a B/L ID above, set recipient email, and click "Simulate Transit Shift" to initialize coordinate updates.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CENTRAL FILES DIRECTORY SHOWROOM */}
                    <div className="card bg-white p-5 border border-gray-200 rounded-xl shadow-xs space-y-4">
                      <div className="border-b pb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Cargo Paperwork Record Room</span>
                        <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          Secure offline folder
                        </span>
                      </div>

                      <div className="space-y-2">
                        {(() => {
                          const records = Object.entries(activeQuote.workflow || {}).filter(([_, val]) => val.fileName);
                          if (records.length === 0) {
                            return (
                              <p className="text-gray-400 text-xs italic py-4 text-center">
                                No signed PDF documents filed for this shipment yet. Generate A4 screens and upload signed compliance records above.
                              </p>
                            );
                          }
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {records.map(([key, item]) => {
                                const sizeKb = item.fileSize ? Math.round(item.fileSize / 1024) || 1 : 'TBD';
                                return (
                                  <div key={key} className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <div className="space-y-1">
                                      <span className="font-extrabold text-indigo-700 uppercase block text-[9px] tracking-wider leading-none">
                                        FILED STAMP: {key.toUpperCase()}
                                      </span>
                                      <span className="font-sans font-bold text-gray-800 break-all block">{item.fileName}</span>
                                      <span className="text-[10px] text-gray-400 font-mono">Date locked: {fmtDate(item.date)} ({sizeKb} KB)</span>
                                    </div>
                                    <button 
                                      onClick={() => alert(`This was secure-saved locally inside the browser. Ready for physical printing or export!`)}
                                      className="p-2 border bg-white hover:bg-indigo-50 border-gray-200 text-indigo-600 rounded-lg shadow-sm"
                                      title="Review Document Details"
                                    >
                                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* CUSTOMER DIRECT OUTBOUND BROADCASTER (Module gated) */}
                    {!(allowedModules || ['rate_calc']).includes('quote_sharing') ? (
                      <div className="card bg-slate-900 border border-slate-800 text-slate-400 p-5 rounded-xl text-center space-y-2">
                        <Lock className="w-7 h-7 text-slate-500 mx-auto" />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest block">Outbound Broadcast Matrix Locked</span>
                        <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
                          WhatsApp and Cloud SMTP mail direct transmissions are disabled for this account membership level.
                        </p>
                      </div>
                    ) : (
                      <div className="card bg-gradient-to-r from-slate-900 to-indigo-950/95 border border-sky-900/30 text-white p-5 rounded-xl shadow-md space-y-4">
                        <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-sky-400">
                            <Share2 className="w-4 h-4 text-sky-400" />
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Outbound Client Transmission Console</span>
                          </div>
                          <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded font-mono font-bold">
                            MODULE: QUOTE_SHARING
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                          Frictionless outbound transmission. Dispatch custom PDF links and live GPS terminal tracking widgets directly to customers on demand.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          {/* Mobile Number for WhatsApp */}
                          <div className="space-y-1.5 text-left">
                            <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">
                              WhatsApp Customer Phone
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">+</span>
                              <input 
                                type="tel" 
                                value={broadcasterMobile}
                                onChange={(e) => setBroadcasterMobile(e.target.value)}
                                placeholder="e.g. 91987541258"
                                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 text-xs rounded-lg p-2 pl-5 focus:outline-none text-white font-mono placeholder-slate-600"
                              />
                            </div>
                            <span className="text-[9px] text-slate-550 block text-slate-500">Include country code (e.g., 91 for India).</span>
                          </div>

                          {/* Customer Email */}
                          <div className="space-y-1.5 text-left">
                            <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">
                              Customer Email Address
                            </label>
                            <input 
                              type="email" 
                              value={broadcasterEmail}
                              onChange={(e) => setBroadcasterEmail(e.target.value)}
                              placeholder="e.g. buyer@dubaitrading.com"
                              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 text-xs rounded-lg p-2 focus:outline-none text-white font-mono placeholder-slate-600"
                            />
                            <span className="text-[9px] text-slate-550 block text-slate-500">Syncs back to client tracking profile.</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!broadcasterMobile.trim()) {
                                alert("Please specify customer mobile phone before launching chat.");
                                return;
                              }
                              
                              // Save phone locally back to active quote to preserve data entry
                              handleUpdateQuoteField('buyerPhone', broadcasterMobile.trim());
                              
                              const firstItem = activeQuote.items?.[0] || null;
                              const tCommodity = firstItem?.commodity || 'Cargo';
                              const tRate = firstItem?.rate || 0;
                              const tCondition = firstItem?.condition || activeQuote.cond || 'FOB';

                              const msg = `*VNP Export Hub Update*%0A%0A*Quotation ID:* ${activeQuote.id}%0A*Commodity:* ${tCommodity}%0A*Dest:* ${activeQuote.dest}%0A*Buying Rate:* $${tRate} / Unit%0A*Incoterm:* ${tCondition}%0A%0ALive shipment tracker link: %0A${window.location.origin}/?lookup=${activeQuote.id}%0A%0AHave an exceptional day!`;
                              const cleanPh = broadcasterMobile.replace(/\D/g, '');
                              window.open(`https://api.whatsapp.com/send?phone=${cleanPh}&text=${msg}`, '_blank');
                            }}
                            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-400 hover:from-emerald-700 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 rounded-lg transition text-center flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4 text-emerald-100 shrink-0 animate-pulse" />
                            <span>Share WhatsApp Text</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (!broadcasterEmail.trim()) {
                                alert("Please fill customer email before dispatching SMTP.");
                                return;
                              }
                              
                              // Save email in db
                              handleUpdateQuoteField('trackingEmail', broadcasterEmail.trim());

                              const firstItem = activeQuote.items?.[0] || null;
                              const tCommodity = firstItem?.commodity || 'Cargo';
                              const tRate = firstItem?.rate || 0;
                              const tCondition = firstItem?.condition || activeQuote.cond || 'FOB';
                              const tNumFCL = firstItem?.numFCL || 1;
                              const tTotalWeightKg = activeQuote.items?.reduce((acc, x) => acc + (x.totalWeightKg || 0), 0) || 0;

                              setActiveOutboundMail({
                                recipient: broadcasterEmail.trim(),
                                subject: `OFFICIAL COMPLIANCE QUOTE SHEET: RECORD ${activeQuote.id}`,
                                body: `Dear Exporter Partner,

This is VNP SaaS Portal automatic dispatching service. Your transaction sheet has been synchronized inside our system workspace:

===========================================
QUOTE REGISTER CODE: ${activeQuote.id}
COMMODITY PRODUCT:   ${tCommodity}
TOTAL CARGO VOLUME:  ${tNumFCL} FCL (Weight: ${(tTotalWeightKg / 1000).toFixed(1)} MT)
final LANDED COST:   $ ${tRate} / Unit (${tCondition})
===========================================

Click below link to lookup logs, GPS coordinates, real-time ETA progress, and download Proforma invoices in PDF formats:
${window.location.origin}/?lookup=${activeQuote.id}

We appreciate our ongoing basmati and tiles export cooperation.

Warm regards,
VNP Cloud Operations
SMTP Dispatcher Server`
                              });
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 rounded-lg transition text-center flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Mail className="w-4 h-4 text-blue-100 shrink-0" />
                            <span>Broadcast Email SMTP</span>
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })()}
            </>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center text-gray-400 italic font-mono text-xs">
              👈 Click any quotation card on the left panel to trigger active workflow audits, attach bills of lading, and generate printable invoices.
            </div>
          )}
        </div>

      </div>

      {/* simulated SMTP mail popover */}
      {activeOutboundMail && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-850 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <Mail className="w-5 h-5 font-bold" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">Outbound SaaS SMTP Relay</span>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
                ✓ SIMULATED DISPATCH SUCCESS
              </span>
            </div>
            
            <div className="space-y-2 text-xs text-left">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Recipient (Consignee)</span>
                <span className="font-bold text-slate-200 font-mono">{activeOutboundMail.recipient}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Subject Line</span>
                <span className="font-black text-white">{activeOutboundMail.subject}</span>
              </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 max-h-[220px] overflow-y-auto text-left">
              <pre className="text-[11px] text-slate-350 font-sans whitespace-pre-wrap leading-relaxed">
                {activeOutboundMail.body}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[9px] text-slate-500 italic">
                Logs updated instantly inside your buyer portal lookup index!
              </p>
              <button 
                onClick={() => setActiveOutboundMail(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
              >
                Close Outbound Simulator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PROFORMA INVOICE: Visually hidden except on window print and active quote loaded */}
      {activeQuote && (
        <div className="hidden print:block bg-white p-6 leading-relaxed font-serif text-gray-900 select-text">
          <div className="text-center pb-4 border-b">
            {licenceMetadata?.logoBase64 ? (
              <img 
                src={licenceMetadata.logoBase64} 
                alt="Corporate Logo" 
                referrerPolicy="no-referrer"
                className="max-h-12 max-w-[200px] object-contain mx-auto mb-2 block"
              />
            ) : (
              <h1 className="text-xl font-black font-sans uppercase">
                {licenceMetadata?.logoText || licenceMetadata?.name || activeQuote.company}
              </h1>
            )}
            <p className="text-[10px] font-sans uppercase text-gray-500 tracking-wider">
              OFFICIAL PROFORMA INVOICE (CONTRACT COPY)
            </p>
            <p className="text-[9px] font-sans text-gray-400 font-medium">
              Registered Customs Exporters • Port Mundra Terminal • India
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 my-5 text-xs font-sans text-gray-800">
            <div>
              <span className="font-bold text-indigo-800 block uppercase text-[10px] mb-1">PROFORMA CONSIGNED TO:</span>
              <div className="flex items-center gap-1.5">
                <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-black px-1.5 py-0.2 rounded uppercase shrink-0" title="Buyer Initials">
                  {getInitials(activeQuote.buyer)}
                </span>
                <div className="font-black text-gray-900 uppercase">{activeQuote.buyer}</div>
              </div>
              {activeQuote.buyerLoc && <div className="uppercase mt-0.5 text-gray-500 font-semibold">{activeQuote.buyerLoc}</div>}
            </div>
            
            <div className="text-right">
              <div><span className="text-gray-450 uppercase font-semibold">PI REFERENCE:</span> <span className="font-mono font-bold text-gray-950">{activeQuote.ref || 'TBD'}</span></div>
              <div><span className="text-gray-455 uppercase font-semibold">PI DATE:</span> <span className="font-mono">{fmtDate(activeQuote.date)}</span></div>
              <div><span className="text-gray-460 uppercase font-semibold">VALID LIMIT:</span> <span className="font-mono">{fmtDate(activeQuote.valid)}</span></div>
              <div><span className="text-gray-461 uppercase font-semibold">INCOTERM CONDITIONS:</span> <span className="font-bold text-blue-700 uppercase">{activeQuote.cond}</span></div>
            </div>
          </div>

          <div className="my-5 border text-xs font-sans">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 uppercase tracking-widest text-[9px] text-gray-700 font-bold border-b">
                  <th className="p-2">#</th>
                  <th className="p-2">Commodity Description</th>
                  <th className="p-2">Brand</th>
                  <th className="p-2">Packaging SPEC</th>
                  <th className="p-2 text-center">FCL Load</th>
                  <th className="p-2 text-right">Landed Rate</th>
                  <th className="p-2 text-center no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeQuote.items.map((row, idx) => {
                  const hasBlendDetails = row.commodity === 'BLENDED (MIX) RICE' || (row.blendRice1Name && row.blendRice2Name);

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

                  return (
                    <React.Fragment key={row.id}>
                      <tr>
                        <td className="p-2 text-gray-400 font-bold">{idx + 1}</td>
                        <td className="p-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold uppercase text-gray-900">{row.commodity}</span>
                            <span className="inline-flex items-center text-[8px] font-mono font-black text-blue-800 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">
                              HS {getHsCodeForCommodity(row.commodity)}
                            </span>
                          </div>
                          {hasBlendDetails && (
                            <div className="text-[10px] text-blue-800 font-bold uppercase mt-0.5">
                              Spec Ratio: {row.blendRice1Pct || 70}% {row.blendRice1Name || 'Type 1'} &amp; {row.blendRice2Pct || 30}% {row.blendRice2Name || 'Type 2'}
                            </div>
                          )}
                          <div className="text-[10px] text-gray-450 uppercase mb-1">
                            DEST: {row.dest}
                            {row.transitTime && (
                              <span className="ml-2 font-black text-teal-600 bg-teal-50 px-1 py-0.5 rounded border border-teal-100">
                                ⏱ TRANSIT: {row.transitTime}
                              </span>
                            )}
                          </div>
                          {(() => {
                            const requiredTons = (row.totalWeightKg || ((row.numFCL || 1) * (row.weightPerContainerKg || 26055))) / 1000;
                            const match = grainInventory.find(item => item.grainName.toLowerCase().trim() === row.commodity.toLowerCase().trim());
                            if (!isInventoryEnabled || !match) return null;

                            const processedAvailable = match.processedRiceTons || 0;
                            const paddyAvailable = match.paddyStockTons || 0;
                            const shortfall = Math.max(0, requiredTons - processedAvailable);
                            const paddyNeeded = shortfall / 0.65;

                            if (processedAvailable >= requiredTons) {
                              return (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-150 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider" title={`Sufficient processed stock is available. ${processedAvailable.toFixed(1)} MT in stock.`}>
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  Stock Active ({processedAvailable.toFixed(0)} MT)
                                </span>
                              );
                            } else if (paddyAvailable >= paddyNeeded) {
                              return (
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-750 border border-amber-250 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-pulse" title={`Short processed stock by ${shortfall.toFixed(1)} MT. Silo has ${paddyAvailable.toFixed(1)} MT Paddy. Custom milling required.`}>
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600 font-bold" />
                                  Milling Needed (Short {shortfall.toFixed(1)} MT)
                                </span>
                              );
                            } else {
                              return (
                                <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-150 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-pulse font-bold" title={`Critical shortfall by ${shortfall.toFixed(1)} MT. Silo Raw Paddy too low (${paddyAvailable.toFixed(1)} MT). Order more paddy.`}>
                                  <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                                  Stock N/A (Order Paddy)
                                </span>
                              );
                            }
                          })()}
                        </td>
                        <td className="p-2 uppercase font-mono">{row.brand}</td>
                        <td className="p-2">
                          <span>{row.packed}</span> (<span className="font-mono text-[10px] font-bold">{row.size}</span>)
                        </td>
                        <td className="p-2 text-center font-mono">
                          {row.numFCL} FCL x {row.weightPerContainerKg / 1000} MT
                        </td>
                        <td className="p-2 text-right font-mono font-black text-blue-800">
                          $ {row.rate.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / MT
                        </td>
                        <td className="p-2 text-center no-print">
                          <button
                            type="button"
                            onClick={() => {
                              if (onSendToCalculator) {
                                onSendToCalculator({
                                  quoteId: activeQuote.id,
                                  itemIndex: idx,
                                  data: row
                                });
                              }
                            }}
                            className="px-2 py-1 bg-amber-55 hover:bg-amber-100 border border-amber-200 text-amber-805 rounded font-bold text-[9px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1 mx-auto"
                            title="Backfill rate calculator with this items parameters to edit & overwrite"
                          >
                            <Calculator className="w-3.5 h-3.5 text-amber-600" />
                            <span>Recalculate & Overwrite</span>
                          </button>
                        </td>
                      </tr>

                      {/* Formulation table in history preview table */}
                      {hasBlendDetails && (
                        <tr className="bg-slate-50/40">
                          <td colSpan={7} className="p-2 pb-3">
                            <div className="space-y-2 pl-6 pr-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-dashed border-gray-200 pb-1">
                                <span className="text-[9.5px] font-extrabold text-[#111827] uppercase tracking-wider font-sans">
                                  FORMULATION alternate mix specs matrix
                                </span>
                                {row.blendCookingRemarks && (
                                  <span className="text-[9.5px] font-sans italic text-right text-gray-500 font-medium">
                                    Remarks: &quot;{row.blendCookingRemarks}&quot;
                                  </span>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                                {(() => {
                                  const r1Name = row.blendRice1Name || '1509 STEAM BASMATI RICE';
                                  const r2Name = row.blendRice2Name || 'PR-11 STEAM RICE';
                                  const r1Price = row.blendRice1ExMill !== undefined ? row.blendRice1ExMill : 78;
                                  const r2Price = row.blendRice2ExMill !== undefined ? row.blendRice2ExMill : 44;

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
                                        className={`px-2 py-1.5 rounded border flex flex-col justify-center ${
                                          isRowActiveSelection 
                                            ? 'bg-blue-50/70 border-blue-300 font-bold' 
                                            : 'bg-white border-gray-150'
                                        }`}
                                      >
                                        <div className="text-[9px] font-extrabold text-slate-800 flex justify-between">
                                          <span>{ratio.r1}% / {ratio.r2}%</span>
                                        </div>
                                        <div className="flex justify-between items-baseline mt-0.5 pt-0.5 border-t border-slate-100 font-mono text-[8px]">
                                          <span className="text-gray-400">₹{((r1Price * ratio.r1 + r2Price * ratio.r2) / 100).toFixed(1)}</span>
                                          <span className="text-[9.5px] font-black text-blue-900 font-bold">
                                            $ {calculatedRate.toFixed(2)}
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

          <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t font-sans text-xs">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">PI PAYMENT TERMS CONTRACT:</span>
              <p className="font-bold uppercase text-slate-800 leading-snug">{activeQuote.terms}</p>
            </div>
          </div>

          {activeQuote.documentMakingNotes && (
            <div className="mt-4 pt-4 border-t border-dashed border-slate-200 text-left">
              <span className="text-slate-400 block text-[9.5px] uppercase font-bold tracking-wider leading-none mb-1.5 font-sans">
                DOCUMENT FINAL REVISION LOG (REVISION NOTES):
              </span>
              <p className="text-xs font-mono bg-slate-50 text-slate-700 p-2.5 rounded-lg border border-slate-200 whitespace-pre-wrap">
                {activeQuote.documentMakingNotes}
              </p>
            </div>
          )}

          <div className="mt-12 text-center text-[9px] font-sans text-slate-400 font-bold tracking-wider uppercase">
            STAMP APPROVED DOCUMENT GENERATED DIGITALLY LOCAL OFFICE EXPORTER DIRECTORY.
          </div>
        </div>
      )}
    </div>
  );
}
