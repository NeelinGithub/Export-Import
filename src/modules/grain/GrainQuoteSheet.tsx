import React, { useState, useEffect } from "react";
import * as htmlToImage from "html-to-image";
import { jsPDF } from "jspdf";
import { RateRow, SavedQuote, PIItem, QuoteSequenceConfig } from "../../types";
import { getHsCodeForCommodity } from "../../utils/hscode";
import { todayISO, addDaysISO, fmtDate, getInitials } from "../../utils";
import {
  FileCheck,
  Printer,
  Save,
  Eye,
  EyeOff,
  Clipboard,
  MapPin,
  Calendar,
  Building,
  ChevronRight,
  BookmarkCheck,
  FileSpreadsheet,
  Lock,
  CheckCircle,
} from "lucide-react";

interface QuoteSheetProps {
  selectedRateIds: number[];
  rateList: RateRow[];
  savedQuotes: SavedQuote[];
  setSavedQuotes: (
    quotes: SavedQuote[] | ((prev: SavedQuote[]) => SavedQuote[]),
  ) => void;
  companies: string[];
  setCompanies: (list: string[]) => void;
  buyers: string[];
  setBuyers: (list: string[]) => void;
  buyerLocations: string[];
  setBuyerLocations: (list: string[]) => void;
  onNavigateToTab: (tab: string) => void;
  allowedModules?: string[];
  industry?: string;
  licenceMetadata?: any;
  isTrialMode?: boolean;
  quoteConfig?: QuoteSequenceConfig;
  setQuoteConfig?: (
    config:
      | QuoteSequenceConfig
      | ((prev: QuoteSequenceConfig) => QuoteSequenceConfig),
  ) => void;
}

export default function GrainQuoteSheet({
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
  industry = "grain",
  licenceMetadata,
  isTrialMode = false,
  quoteConfig,
  setQuoteConfig,
}: QuoteSheetProps) {
  const isSavingAllowed = (allowedModules || ["rate_calc"]).includes(
    "quote_saving",
  );

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
    rExrate = 91.5,
    rCommission = 0,
    rice3Pct = 0,
    r3ExMill = 0,
  ) => {
    const blendExMill = (r1ExMill * rice1Pct + r2ExMill * rice2Pct + r3ExMill * rice3Pct) / 100;
    const baseCostInrKg =
      blendExMill + rPackaging + rTransport + rCfsPort + rFreight + rInsurance;
    const dutyAmt = rDutyPct > 0 ? baseCostInrKg * (rDutyPct / 100) : 0;
    const totalInrKg = baseCostInrKg + dutyAmt;
    const baseUsdMt = rExrate > 0 ? (totalInrKg / rExrate) * 1000 : 0;
    return baseUsdMt + rCommission;
  };

  // Compute industry text
  const industryIntroFormat =
    (industry as any) === "grain"
      ? "finest grades of Indian Origin Rice, processed with state-of-the-art milling technologies under strict hygiene controls"
      : (industry as any) === "spices"
        ? "premium, hand-picked authentic Spices, processed and packaged under strict hygienic sorting conditions"
        : (industry as any) === "chemicals"
          ? "industrial and specialty Chemicals, formulated and certified conforming to precision analytical standards"
          : (industry as any) === "salts"
            ? "pure refined Salts and Minerals, crystallized and processed under controlled environments"
            : (industry as any) === "vegetables_fruits"
              ? "fresh, export-quality Fruits & Vegetables, carefully hand-picked and cold-chain transported for optimum shelf life"
              : (industry as any) === "tiles"
                ? "premium Ceramic, Porcelain & Vitrified Tiles, crafted with cutting edge European machinery and superior designs"
                : (industry as any) === "metal"
                  ? "premium grade Metals & Ingots, smelted and casted under precise metallurgical controls"
                  : (industry as any) === "sugar"
                    ? "refined granular Sugar varieties, processed to the highest ICUMSA standards"
                    : (industry as any) === "nuts"
                      ? "premium grade Nuts & Cashews, carefully shelled, sorted and vacuum-packed"
                      : "finest quality Cargo, prepared and verified for international shipment";

  // Config States
  const [refNo, setRefNo] = useState("");
  const [company, setCompany] = useState("");
  const [exporterTagline, setExporterTagline] = useState("");
  const [exporterAddress, setExporterAddress] = useState("");
  const [exporterDetails, setExporterDetails] = useState("");
  const [buyer, setBuyer] = useState("");
  const [buyerLoc, setBuyerLoc] = useState("");
  const [consigneeDetails, setConsigneeDetails] = useState("");
  const [validDays, setValidDays] = useState("7");
  const [offerDate, setOfferDate] = useState(() => todayISO());
  const [additionalTerms, setAdditionalTerms] = useState(
    "1. Rates are subject to standard crop market availability.\n2. Shipment is subject to timely allocation of containers by the shipping line.\n3. Transit time is approx and subject to change based on carrier scheduling.",
  );

  const [tableColumns, setTableColumns] = useState([
    { id: "srNo", label: "#", visible: true },
    { id: "dest", label: "Destination", visible: true },
    {
      id: "commodity",
      label: (industry as any) === "tiles" ? "Tile Style" : "Commodity",
      visible: true,
    },
    { id: "brand", label: "Brand", visible: true },
    {
      id: "packing",
      label: (industry as any) === "tiles" ? "Pallet Configuration" : "Packing",
      visible: true,
    },
    {
      id: "crop",
      label: (industry as any) === "tiles" ? "Grade" : "Crop",
      visible: true,
    },
    { id: "noOfFcl", label: "No. of FCL", visible: true },
    {
      id: "totalWeight",
      label: (industry as any) === "tiles" ? "Total Boxes" : "Total Weight",
      visible: true,
    },
    {
      id: "rate",
      label: `Rate / ${(industry as any) === "tiles" ? "SQM" : "MT"}`,
      visible: true,
    },
  ]);
  const [themeColor, setThemeColor] = useState("blue");
  const [fontSize, setFontSize] = useState("text-xs");
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    isError?: boolean;
  } | null>(null);

  const showToast = (message: string, isError: boolean = false) => {
    setToastMessage({ message, isError });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Editable lists (to allow user to quickly click saved items)
  const [showForm, setShowForm] = useState(true);

  // Items chosen for PI
  const chosenRates = rateList.filter((row) =>
    selectedRateIds.includes(row.id),
  );

  const THEMES: Record<
    string,
    {
      bg: string;
      ring: string;
      text: string;
      textSoft: string;
      textDark: string;
      divide: string;
      hoverRow: string;
      borderSubtle: string;
      bgSoft: string;
    }
  > = {
    blue: {
      bg: "bg-blue-600",
      ring: "ring-blue-100",
      text: "text-blue-900",
      textSoft: "text-blue-500",
      textDark: "text-blue-950",
      divide: "divide-blue-50",
      hoverRow: "hover:bg-blue-50/10",
      borderSubtle: "border-blue-200",
      bgSoft: "bg-blue-50",
    },
    indigo: {
      bg: "bg-indigo-600",
      ring: "ring-indigo-100",
      text: "text-indigo-900",
      textSoft: "text-indigo-500",
      textDark: "text-indigo-950",
      divide: "divide-indigo-50",
      hoverRow: "hover:bg-indigo-50/10",
      borderSubtle: "border-indigo-200",
      bgSoft: "bg-indigo-50",
    },
    emerald: {
      bg: "bg-emerald-600",
      ring: "ring-emerald-100",
      text: "text-emerald-900",
      textSoft: "text-emerald-500",
      textDark: "text-emerald-950",
      divide: "divide-emerald-50",
      hoverRow: "hover:bg-emerald-50/10",
      borderSubtle: "border-emerald-200",
      bgSoft: "bg-emerald-50",
    },
    slate: {
      bg: "bg-slate-800",
      ring: "ring-slate-300",
      text: "text-slate-900",
      textSoft: "text-slate-500",
      textDark: "text-slate-950",
      divide: "divide-slate-200",
      hoverRow: "hover:bg-slate-50",
      borderSubtle: "border-slate-300",
      bgSoft: "bg-slate-100",
    },
    rose: {
      bg: "bg-rose-600",
      ring: "ring-rose-200",
      text: "text-rose-900",
      textSoft: "text-rose-500",
      textDark: "text-rose-950",
      divide: "divide-rose-100",
      hoverRow: "hover:bg-rose-50",
      borderSubtle: "border-rose-200",
      bgSoft: "bg-rose-50",
    },
    teal: {
      bg: "bg-teal-600",
      ring: "ring-teal-200",
      text: "text-teal-900",
      textSoft: "text-teal-500",
      textDark: "text-teal-950",
      divide: "divide-teal-100",
      hoverRow: "hover:bg-teal-50",
      borderSubtle: "border-teal-200",
      bgSoft: "bg-teal-50",
    },
  };
  const theme = THEMES[themeColor] || THEMES.blue;

  const moveColumn = (index: number, direction: "up" | "down") => {
    const newCols = [...tableColumns];
    if (direction === "up" && index > 0) {
      [newCols[index - 1], newCols[index]] = [
        newCols[index],
        newCols[index - 1],
      ];
    } else if (direction === "down" && index < newCols.length - 1) {
      [newCols[index + 1], newCols[index]] = [
        newCols[index],
        newCols[index + 1],
      ];
    }
    setTableColumns(newCols);
  };

  const toggleColumnVisibility = (index: number) => {
    const newCols = [...tableColumns];
    newCols[index].visible = !newCols[index].visible;
    setTableColumns(newCols);
  };

  // Default values setup
  useEffect(() => {
    if (!refNo) {
      if (quoteConfig) {
        setRefNo(`${quoteConfig.prefix}${quoteConfig.nextNumber}`);
      } else {
        setRefNo(
          `RFQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        );
      }
    }

    if (chosenRates.length > 0 && !company) {
      const customCompany = licenceMetadata?.logoText || licenceMetadata?.name;
      if (customCompany) {
        setCompany(customCompany.toUpperCase());
      } else if (companies.length > 0) {
        setCompany(companies[0]);
      } else {
        setCompany("S.A. ENTERPRISES EXPORTS");
      }
    }

    if (!exporterTagline) {
      setExporterTagline(
        licenceMetadata?.exporterTagline ||
          "Premium Quality Merchant Exporters",
      );
    }
    if (!exporterAddress) {
      setExporterAddress(
        licenceMetadata?.exporterAddress ||
          "Office Block C-4, Terminal Zone, Mundra, India • Email: exports@saenterprises.co",
      );
    }

    if (chosenRates.length > 0) {
      const rateWithBuyer = chosenRates.find((r) => r.buyer);
      if (rateWithBuyer) {
        if (!buyer) setBuyer(rateWithBuyer.buyer || "");
        if (!buyerLoc)
          setBuyerLoc(
            rateWithBuyer.buyerLoc || rateWithBuyer.consigneeDetails || "",
          );
      } else {
        if (!buyer && buyers.length > 0) setBuyer(buyers[0]);
        if (!buyerLoc && buyerLocations.length > 0)
          setBuyerLoc(buyerLocations[0]);
      }
    }
  }, [
    selectedRateIds,
    rateList,
    companies,
    buyers,
    buyerLocations,
    chosenRates,
    company,
    licenceMetadata,
  ]);

  // Aggregate values from chosen items
  const displayDest = chosenRates
    .map((r) => r.dest)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(" / ");
  const displayCond = chosenRates
    .map((r) => r.condition)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(" / ");
  const displayPayments = chosenRates
    .map((r) => r.paymentTerms)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join("; ");

  // Save the quotation structure
  const handleSaveQuote = () => {
    if (isTrialMode && savedQuotes.length >= 2) {
      alert(
        "Licence required! You can only generate and save up to 2 RFQ Quotation folders in Trial Mode. Please upgrade to unlock unlimited records.",
      );
      return;
    }
    if (!isSavingAllowed) {
      alert(
        "Quotation saving and history logging is deactivated under this workspace configuration.",
      );
      return;
    }
    if (!company.trim()) {
      alert("Please select or specify a Company letterhead header.");
      return;
    }
    if (!buyer.trim()) {
      alert("Please specify the Buyer details.");
      return;
    }
    if (chosenRates.length === 0) {
      alert(
        "No rate list items were selected to populate this quote. Select rows in Rate List first!",
      );
      return;
    }

    // Add company/buyer to list for futures prefill
    const normCo = company.trim();
    const normBuy = buyer.trim();
    const normLoc = buyerLoc.trim();

    if (normCo && !companies.includes(normCo))
      setCompanies([...companies, normCo]);
    if (normBuy && !buyers.includes(normBuy)) setBuyers([...buyers, normBuy]);
    if (normLoc && !buyerLocations.includes(normLoc))
      setBuyerLocations([...buyerLocations, normLoc]);

    // Format PI item structures
    const items: PIItem[] = chosenRates.map((r, index) => ({
      ...r,
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
      transitTime: r.transitTime,
      totalBags: Math.round(
        r.totalWeightKg / (parseFloat(r.size.replace(/[^\d.]/g, "")) || 20),
      ),

      // Copy over blended rice metrics
      blendRice1Name: r.blendRice1Name,
      blendRice1Pct: r.blendRice1Pct,
      blendRice1ExMill: r.blendRice1ExMill,
      blendRice2Name: r.blendRice2Name,
      blendRice2Pct: r.blendRice2Pct,
      blendRice2ExMill: r.blendRice2ExMill,
      blendRice3Name: r.blendRice3Name,
      blendRice3Pct: r.blendRice3Pct,
      blendRice3ExMill: r.blendRice3ExMill,
      blendCookingRemarks: r.blendCookingRemarks,
      bPackaging: r.bPackaging,
      bTransport: r.bTransport,
      bCfsPort: r.bCfsPort,
      bFreight: r.bFreight,
      bInsurance: r.bInsurance,
      dutyPct: r.dutyPct,
      exrate: r.exrate,
      commission: r.commission,
    }));

    if (setQuoteConfig && quoteConfig) {
      const generatedRef = `${quoteConfig.prefix}${quoteConfig.nextNumber}`;
      if (refNo.trim().toUpperCase() === generatedRef.toUpperCase()) {
        setQuoteConfig((prev) => ({
          ...prev,
          nextNumber: prev.nextNumber + 1,
        }));
      }
    }

    const firstRate = chosenRates[0];
    const newQuote: SavedQuote = {
      id: Date.now(),
      ref: refNo.trim().toUpperCase(),
      company: normCo,
      exporterDetails: exporterDetails.trim() || undefined,
      buyer: normBuy,
      buyerLoc: normLoc,
      consigneeDetails:
        consigneeDetails.trim() ||
        firstRate?.consigneeDetails ||
        normLoc ||
        `${normBuy}\n${normLoc}`,
      notifyParty: firstRate?.notifyParty || "SAME AS CONSIGNEE",
      dest: displayDest,
      cond: displayCond,
      terms: displayPayments,
      valid: addDaysISO(offerDate, parseInt(validDays) || 7),
      date: offerDate,
      rateIds: selectedRateIds,
      items,
      html: "", // auto-compile or custom view
      piStatus: "DRAFT_PI",
      industry: industry,
    };

    setSavedQuotes((prev) => [newQuote, ...prev]);
    alert(
      `Quotation ${newQuote.ref} saved successfully to active local directory!`,
    );
    onNavigateToTab("savedquotes");
  };

  const handleCheckIframe = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  const notifyIframeBlock = (feature: string) => {
    alert(
      `The preview window blocked ${feature}. Please click the "Open application in new tab" icon (↗️) at the top right of this preview to use this feature.`,
    );
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const dateStr = fmtDate(offerDate).replace(/\s/g, "");
    const bInitials = getInitials(buyer);
    const cInitials = getInitials(company);
    document.title = `${bInitials}_${cInitials}_${dateStr}-${refNo || "OFFER"}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleDownloadPDF = async () => {
    const card = document.getElementById("printable-quote-sheet-card");
    if (!card) return;
    try {
      const dataUrl = await htmlToImage.toPng(card, {
        pixelRatio: 2.2,
        backgroundColor: "#ffffff",
        fontEmbedCSS: "",
        skipFonts: true,
        filter: (node) =>
          !(node.hasAttribute && node.hasAttribute("data-html2canvas-ignore")),
        style: { transform: "scale(1)", transformOrigin: "top left" },
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const targetWidth = pdfWidth - margin * 2;

      // We need to calculate height from the data URL.
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      const targetHeight = (img.height * targetWidth) / img.width;

      pdf.addImage(dataUrl, "PNG", margin, margin, targetWidth, targetHeight);
      pdf.save(`QUOTATION-${refNo || "OFFER"}.pdf`);
      showToast("PDF Saved Successfully");
    } catch (e: any) {
      console.warn("Direct PDF generation fallback:", e?.message);
      // Fallback silently to native print dialog
      window.print();
    }
  };

  const handleDownloadImage = async () => {
    const card = document.getElementById("printable-quote-sheet-card");
    if (!card) return;
    try {
      const dataUrl = await htmlToImage.toPng(card, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        fontEmbedCSS: "",
        skipFonts: true,
        filter: (node) =>
          !(node.hasAttribute && node.hasAttribute("data-html2canvas-ignore")),
        style: { transform: "scale(1)", transformOrigin: "top left" },
      });
      const link = document.createElement("a");
      link.download = `QUOTATION-${refNo || "OFFER"}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Image Saved Successfully");
    } catch (e: any) {
      console.warn("Direct image save fallback:", e?.message);
      showToast("Error: Open App in New Tab to save images", true);
    }
  };

  const handleCopyImage = async () => {
    const card = document.getElementById("printable-quote-sheet-card");
    if (!card) return;
    try {
      const blob = await htmlToImage.toBlob(card, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        fontEmbedCSS: "",
        skipFonts: true,
        filter: (node) =>
          !(node.hasAttribute && node.hasAttribute("data-html2canvas-ignore")),
        style: { transform: "scale(1)", transformOrigin: "top left" },
      });

      if (!blob) {
        throw new Error("Could not generate image blob.");
      }

      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        showToast("Image Copied to Clipboard!");
      } catch (copyErr) {
        console.warn("Clipboard copy fallback:", copyErr);
        showToast("Info: Open in New Tab to copy images to clipboard", true);
      }
    } catch (e: any) {
      console.warn("Clipboard image generation fallback:", e?.message);
      showToast("Error: Open in New Tab to use clipboard features", true);
    }
  };

  return (
    <div className="space-y-6" id="quote-sheet-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-2xl font-bold text-sm ring-1 transition-all animate-in fade-in slide-in-from-top-4 ${toastMessage.isError ? "bg-red-50 text-red-700 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}
        >
          <CheckCircle
            className={`w-5 h-5 ${toastMessage.isError ? "text-red-500" : "text-emerald-500"}`}
          />
          {toastMessage.message}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-3 select-none no-print">
        <div>
          <div className="breadcrumb">📄 Documents & Exports</div>
          <h2 className="text-xl font-extrabold tracking-tight">
            Active Export Offer Worksheet
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Turn selected rate rows into beautiful corporate quotation offers
            under professional letterheads.
          </p>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3.5 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white rounded-lg text-xs font-black flex items-center gap-1.5 transition"
          >
            {showForm ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            {showForm ? "Hide Form Editor" : "Open Form Editor"}
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
              className="px-4 py-2 bg-slate-100 border border-slate-300 text-slate-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed"
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

      <div
        className={`grid grid-cols-1 ${showForm ? "xl:grid-cols-4" : "xl:grid-cols-5"} gap-6 items-start print:block print:gap-0`}
      >
        {/* EDITOR FORM */}
        {showForm && (
          <div className="no-print bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4 xl:col-span-1 text-xs">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block border-b pb-1.5 mb-2">
              Quotation Details
            </span>

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
              <label>Offer Date</label>
              <input
                type="date"
                value={offerDate}
                onChange={(e) => setOfferDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold uppercase outline-none focus:border-blue-500"
              />
            </div>

            <div className="field">
              <label>Exporter Company (Letterhead)</label>
              <input
                type="text"
                placeholder={
                  licenceMetadata?.logoText?.toUpperCase() ||
                  licenceMetadata?.name?.toUpperCase() ||
                  "e.g. S.A. ENTERPRISES EXPORTS"
                }
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase outline-none"
                list="co-pref"
              />
              <datalist id="co-pref">
                {companies.map((c) => (
                  <option key={c} value={c} />
                ))}
                <option
                  value={
                    licenceMetadata?.logoText?.toUpperCase() ||
                    licenceMetadata?.name?.toUpperCase() ||
                    "S.A. ENTERPRISES EXPORTS"
                  }
                />
                <option value="GLOBAL RICE EXPORTERS INDIA" />
              </datalist>
            </div>

            <div className="field">
              <label>Exporter Tagline / Sub-Heading</label>
              <input
                type="text"
                value={exporterTagline}
                onChange={(e) => setExporterTagline(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-[11px] outline-none"
                placeholder="e.g. Premium Quality Rice Merchant Exporters"
              />
            </div>

            <div className="field">
              <label>Exporter Address & Contact Line (Header)</label>
              <input
                type="text"
                value={exporterAddress}
                onChange={(e) => setExporterAddress(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-[11px] outline-none"
                placeholder="e.g. Office Block C-4, India | Email: ..."
              />
            </div>

            <div className="field">
              <label>Full Exporter Details (For PI/CI)</label>
              <textarea
                placeholder="Leave blank to use default. Enter multi-line name & address..."
                value={exporterDetails}
                onChange={(e) => setExporterDetails(e.target.value)}
                rows={3}
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs uppercase outline-none"
              />
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
                {buyers.map((b) => (
                  <option key={b} value={b} />
                ))}
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
                {buyerLocations.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>

            <div className="field">
              <label>Full Consignee Details (For PI/CI)</label>
              <textarea
                placeholder="Leave blank to use default. Enter multi-line name & address..."
                value={consigneeDetails}
                onChange={(e) => setConsigneeDetails(e.target.value)}
                rows={3}
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs uppercase outline-none"
              />
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
              <span className="fc info">
                Valid until{" "}
                {fmtDate(addDaysISO(offerDate, parseInt(validDays) || 7))}
              </span>
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

            <div className="border-t border-gray-100 pt-3 mt-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Table Columns & Order
              </span>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto scrollbar-thin">
                {tableColumns.map((col, idx) => (
                  <div
                    key={col.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-gray-50 rounded border border-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => toggleColumnVisibility(idx)}
                        className="w-3 h-3 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-[10px] font-semibold text-gray-700">
                        {col.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveColumn(idx, "up")}
                        disabled={idx === 0}
                        className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m18 15-6-6-6 6" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveColumn(idx, "down")}
                        disabled={idx === tableColumns.length - 1}
                        className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m6 9 6 6-6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 mt-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Quote Color Theme
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.keys(THEMES).map((t) => (
                  <button
                    key={t}
                    onClick={() => setThemeColor(t)}
                    className={`text-[9px] font-bold uppercase py-1 px-2 rounded border focus:outline-none transition-colors ${themeColor === t ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 mt-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Table Font Size
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { val: "text-[10px]", label: "Small" },
                  { val: "text-xs", label: "Medium" },
                  { val: "text-sm", label: "Large" },
                ].map((sz) => (
                  <button
                    key={sz.val}
                    onClick={() => setFontSize(sz.val)}
                    className={`text-[9px] font-bold uppercase py-1 px-2 rounded border focus:outline-none transition-colors ${fontSize === sz.val ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PRINTABLE SHEET PREVIEW */}
        <div
          id="printable-quote-sheet-card"
          className={`bg-white border border-blue-100 rounded-xl shadow-lg p-8 sm:p-12 font-serif text-gray-900 select-text leading-relaxed relative ${showForm ? "xl:col-span-3" : "xl:col-span-4"} print:col-span-4 print:w-full print:border-0 print:shadow-none print:p-0 print:m-0 print:block`}
        >
          {/* Actions Panel right above OFFICIAL OFFER */}
          <div
            data-html2canvas-ignore="true"
            className="absolute top-4 right-4 flex flex-wrap items-center justify-end gap-1.5 no-print select-none"
          >
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
              <Printer className="w-3.5 h-3.5 text-blue-700" /> Print / System
              PDF
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
          <div
            className={`border-b-4 border-double ${theme.text.replace("text-", "border-")} pb-5 text-center sm:text-left select-text pt-4 sm:pt-0`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 sm:mt-0">
              <div className="space-y-1">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {licenceMetadata?.logoBase64 && (
                    <img
                      src={licenceMetadata.logoBase64}
                      alt="Company Logo"
                      className="max-h-14 max-w-[150px] object-contain sm:mx-0 mx-auto block"
                    />
                  )}
                  <h1
                    className={`text-2xl font-black font-sans uppercase tracking-wider ${theme.text}`}
                  >
                    {company ||
                      licenceMetadata?.logoText ||
                      licenceMetadata?.name ||
                      "S.A. ENTERPRISES EXPORTS"}
                  </h1>
                </div>
                <p
                  className={`text-xs font-sans ${theme.textSoft} font-bold uppercase tracking-widest`}
                >
                  {exporterTagline || " Premium Quality Merchant Exporters"}
                </p>
                <p className="text-[10.5px] font-sans text-gray-500 font-medium">
                  {exporterAddress ||
                    "Office Block C-4, Terminal Zone, Mundra, India • Email: exports@saenterprises.co"}
                </p>
              </div>
              {/* Visual badge */}
              <span
                className={`hidden sm:inline border-2 ${theme.text.replace("text-", "border-")} ${theme.text} px-3 py-1 font-sans text-xs font-extrabold uppercase tracking-widest scale-90 select-none`}
              >
                OFFICIAL OFFER
              </span>
            </div>
          </div>

          {/* QUOTE GRID DESCRIPTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 text-xs font-sans text-gray-800 leading-normal select-text">
            <div className="space-y-1.5">
              <span
                className={`text-[9.5px] font-extrabold ${theme.textSoft} tracking-wider uppercase block`}
              >
                CONSIGNED BUYER INTEREST:
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`${theme.bgSoft} ${theme.textSoft} border ${theme.borderSubtle} text-[9.5px] font-black px-1.5 py-0.5 rounded uppercase shrink-0`}
                  title="Buyer Initials"
                >
                  {getInitials(buyer || "CLIENT DETAILS")}
                </span>
                <div className="font-extrabold text-sm text-gray-900 uppercase">
                  M/S {buyer || "CLIENT DETAILS"}
                </div>
              </div>
              {buyerLoc && (
                <div className="text-gray-500 uppercase flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {buyerLoc}
                </div>
              )}
            </div>

            <div className="space-y-1 sm:text-right">
              <div className="flex justify-between sm:justify-end gap-3">
                <span className="text-gray-400 font-bold uppercase">
                  OFFER REF NO:
                </span>
                <span className="font-mono font-bold text-gray-900 border-b border-gray-300 pb-px">
                  {refNo || "TBD"}
                </span>
              </div>
              <div className="flex justify-between sm:justify-end gap-3">
                <span className="text-gray-400 font-bold uppercase">
                  OFFER DATE:
                </span>
                <span className="font-mono font-bold text-gray-900">
                  {fmtDate(offerDate)}
                </span>
              </div>
              <div className="flex justify-between sm:justify-end gap-3">
                <span className="text-gray-400 font-bold uppercase">
                  VALD LIMIT:
                </span>
                <span className="font-mono font-black text-rose-700">
                  {fmtDate(addDaysISO(offerDate, parseInt(validDays) || 7))}
                </span>
              </div>
              <div className="flex justify-between sm:justify-end gap-3">
                <span className="text-gray-400 font-bold uppercase">
                  INCOTERM ZONES:
                </span>
                <span className="font-bold text-indigo-700 uppercase">
                  {displayCond || "CIF"}
                </span>
              </div>
            </div>
          </div>

          {/* GREETING TEXT */}
          <div className="text-xs my-4 leading-relaxed font-sans text-gray-700 select-text">
            Dear Sir/Madam,
            <br />
            We are pleased to submit our firm export quotation for the{" "}
            {industryIntroFormat}. Herein we summarize our pricing offerings for
            your kind evaluation and purchase commitment:
          </div>

          {/* ITEMS TABLE */}
          <div
            className={`my-6 ring-1 ${theme.ring} rounded-lg overflow-hidden select-text`}
          >
            <table
              className={`w-full text-left border-collapse font-sans ${fontSize}`}
            >
              <thead>
                <tr
                  className={`${theme.bg} text-white font-extrabold uppercase text-[0.8em] tracking-wider select-none`}
                >
                  {tableColumns.map(
                    (col) =>
                      col.visible && (
                        <th
                          key={col.id}
                          className={`p-3 ${["srNo", "crop", "noOfFcl"].includes(col.id) ? "text-center" : ["totalWeight", "rate"].includes(col.id) ? "text-right" : ""}`}
                        >
                          {col.label}
                        </th>
                      ),
                  )}
                </tr>
              </thead>
              <tbody className={`divide-y ${theme.divide}`}>
                {chosenRates.map((row, idx) => {
                  const hasBlendDetails =
                    row.commodity === "BLENDED (MIX) RICE" ||
                    (row.blendRice1Name && row.blendRice2Name);
                  const isRice = row.commodity.toLowerCase().includes("rice");
                  const sizeText = isRice
                    ? row.size.replace(/GRAIN/i, "RICE")
                    : row.size;

                  const renderCellContent = (colId: string) => {
                    switch (colId) {
                      case "srNo":
                        return <>{idx + 1}</>;
                      case "dest":
                        return (
                          <>
                            {row.dest}
                            {row.transitTime && (
                              <div className="text-[0.8em] text-gray-400 font-sans mt-0.5 whitespace-nowrap">
                                Transit: {row.transitTime}
                              </div>
                            )}
                          </>
                        );
                      case "commodity":
                        return (
                          <>
                            <div className="font-mono font-bold text-gray-900 uppercase">
                              {row.commodity}
                            </div>
                            {hasBlendDetails && (
                              <div
                                className={`text-[0.85em] ${theme.text} font-extrabold uppercase mt-0.5`}
                              >
                                Spec Ratio: {row.blendRice1Pct || 70}%{" "}
                                {row.blendRice1Name || "Type 1"} &amp;{" "}
                                {row.blendRice2Pct || 30}%{" "}
                                {row.blendRice2Name || "Type 2"}
                                {parseFloat(String(row.blendRice3Pct || "0")) > 0 && (
                                  <>
                                    {" "}
                                    &amp; {row.blendRice3Pct}% {row.blendRice3Name || "Type 3"}
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        );
                      case "brand":
                        return <>{row.brand}</>;
                      case "packing":
                        return (
                          <>
                            <span className="font-mono uppercase block">
                              {row.packed}
                            </span>
                            <span className="text-[0.85em] font-mono text-gray-400 uppercase">
                              {sizeText}
                            </span>
                          </>
                        );
                      case "crop":
                        return (
                          <>
                            {(industry as any) === "tiles"
                              ? row.crop === "NEW"
                                ? "PREMIUM"
                                : "STANDARD"
                              : `${row.crop} ${row.year}`}
                          </>
                        );
                      case "noOfFcl":
                        return <>{row.numFCL || 1}</>;
                      case "totalWeight":
                        return (
                          <>
                            {(
                              row.totalWeightKg ||
                              (row.numFCL || 1) *
                                (row.weightPerContainerKg || 26000)
                            ).toLocaleString()}{" "}
                            {(industry as any) === "tiles" ? "BOXES" : "KG"}
                          </>
                        );
                      case "rate":
                        return (
                          <>
                            <div
                              className={`font-mono font-bold ${theme.text} text-[1.15em]`}
                            >
                              USD{" "}
                              {(row.rate || 0).toLocaleString([], {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })}
                            </div>
                            <div className="mt-1 flex justify-end">
                              <span
                                className={`text-[0.75em] font-mono font-bold ${theme.text} ${theme.divide.replace("divide-", "bg-")} border ${theme.ring.replace("ring-", "border-")} px-1.5 py-0.5 rounded uppercase`}
                              >
                                {row.condition || "CIF"}
                              </span>
                            </div>
                          </>
                        );
                      default:
                        return null;
                    }
                  };

                  const getCellClass = (colId: string) => {
                    const base = "p-3 align-middle ";
                    if (colId === "srNo")
                      return (
                        base + "text-gray-400 font-mono text-center font-bold"
                      );
                    if (colId === "dest")
                      return (
                        base + "font-mono font-bold text-gray-800 uppercase"
                      );
                    if (colId === "brand")
                      return base + "font-mono text-gray-600 uppercase";
                    if (colId === "packing") return base + "text-gray-600";
                    if (colId === "crop")
                      return (
                        base + "text-center font-mono text-gray-600 uppercase"
                      );
                    if (colId === "noOfFcl")
                      return (
                        base + "text-center font-mono font-bold text-gray-900"
                      );
                    if (colId === "totalWeight")
                      return (
                        base + "text-right font-mono font-bold text-gray-900"
                      );
                    if (colId === "rate") return base + "text-right";
                    return base;
                  };

                  return (
                    <React.Fragment key={row.id}>
                      {/* Primary Item Row */}
                      <tr
                        className={`${theme.hoverRow} transition leading-snug`}
                      >
                        {tableColumns.map(
                          (col) =>
                            col.visible && (
                              <td key={col.id} className={getCellClass(col.id)}>
                                {renderCellContent(col.id)}
                              </td>
                            ),
                        )}
                      </tr>

                      {/* Alternate Blends Table Row */}
                      {hasBlendDetails && (
                        <tr className="bg-slate-50/50">
                          <td
                            colSpan={
                              tableColumns.filter((c) => c.visible).length
                            }
                            className="p-3 bg-slate-50/30"
                          >
                            <div className="space-y-2.5 pl-6 pr-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-dashed border-gray-200 pb-1">
                                <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                                  FORMULATION PRICING matrix (ALTERNATE BLEND
                                  RATIOS)
                                </span>
                                {row.blendCookingRemarks && (
                                  <span className="text-[10px] font-sans text-right italic text-indigo-900 font-semibold">
                                    * Remarks: &quot;{row.blendCookingRemarks}
                                    &quot;
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pb-1 text-left">
                                {(() => {
                                  const r1Name =
                                    row.blendRice1Name ||
                                    "1509 STEAM BASMATI RICE";
                                  const r2Name =
                                    row.blendRice2Name || "PR-11 STEAM RICE";
                                  const r3Name = row.blendRice3Name || "";
                                  const r1Price =
                                    row.blendRice1ExMill !== undefined
                                      ? row.blendRice1ExMill
                                      : 78;
                                  const r2Price =
                                    row.blendRice2ExMill !== undefined
                                      ? row.blendRice2ExMill
                                      : 44;
                                  const r3Price = 
                                    row.blendRice3ExMill !== undefined
                                      ? row.blendRice3ExMill
                                      : 0;

                                  // Extract cost coefficients
                                  const rPkg =
                                    row.bPackaging !== undefined
                                      ? row.bPackaging
                                      : 0.9;
                                  const rTrans =
                                    row.bTransport !== undefined
                                      ? row.bTransport
                                      : 1.2;
                                  const rCfs =
                                    row.bCfsPort !== undefined
                                      ? row.bCfsPort
                                      : 0.45;
                                  const rFr =
                                    row.bFreight !== undefined
                                      ? row.bFreight
                                      : 3.5;
                                  const rIns =
                                    row.bInsurance !== undefined
                                      ? row.bInsurance
                                      : 0;
                                  const rDuty =
                                    row.dutyPct !== undefined
                                      ? row.dutyPct
                                      : 20;
                                  const rEx =
                                    row.exrate !== undefined
                                      ? row.exrate
                                      : 91.5;
                                  const rCom =
                                    row.commission !== undefined
                                      ? row.commission
                                      : 0;

                                  const is3Part = parseFloat(String(row.blendRice3Pct || "0")) > 0;
                                  let ratios;
                                  if (is3Part) {
                                    const u1 = parseFloat(String(row.blendRice1Pct || "0"));
                                    const u2 = parseFloat(String(row.blendRice2Pct || "0"));
                                    const u3 = parseFloat(String(row.blendRice3Pct || "0"));
                                    ratios = [{ r1: u1, r2: u2, r3: u3 }];
                                    let currentR1 = 80;
                                    while(currentR1 >= 10 && ratios.length < 10) {
                                      let newR2 = 100 - currentR1 - u3;
                                      if (newR2 >= 0 && currentR1 !== u1) {
                                        ratios.push({ r1: currentR1, r2: newR2, r3: u3 });
                                      }
                                      currentR1 -= 10;
                                    }
                                  } else {
                                    const u1 = parseFloat(String(row.blendRice1Pct || "0"));
                                    const u2 = parseFloat(String(row.blendRice2Pct || "0"));
                                    ratios = [
                                      { r1: u1, r2: u2, r3: 0 },
                                      { r1: 90, r2: 10, r3: 0 },
                                      { r1: 80, r2: 20, r3: 0 },
                                      { r1: 70, r2: 30, r3: 0 },
                                      { r1: 60, r2: 40, r3: 0 },
                                      { r1: 50, r2: 50, r3: 0 },
                                    ];
                                  }

                                  
                                  // Deduplicate
                                  ratios = ratios.filter((ratio, index, self) =>
                                    index === self.findIndex((t) => (
                                      t.r1 === ratio.r1 && t.r2 === ratio.r2 && t.r3 === ratio.r3
                                    ))
                                  ).slice(0, 6); // take up to 6 elements to show a rich spectrum

                                  return ratios.map((ratio) => {
                                    const calculatedRate =
                                      calculateAlternateBlendRate(
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
                                        rCom,
                                        ratio.r3,
                                        r3Price
                                      );

                                    const isRowActiveSelection =
                                      (!is3Part && ((row.blendRice1Pct == ratio.r1 &&
                                        row.blendRice2Pct == ratio.r2) ||
                                      (!row.blendRice1Pct && ratio.r1 === 70))) ||
                                      (is3Part && (row.blendRice1Pct == ratio.r1 && row.blendRice2Pct == ratio.r2 && row.blendRice3Pct == ratio.r3));

                                    return (
                                      <div
                                        key={`${ratio.r1}-${ratio.r2}-${ratio.r3}`}
                                        className={`px-3 py-2 rounded-lg border transition-all flex flex-col justify-center ${
                                          isRowActiveSelection
                                            ? "border-blue-500 bg-blue-50/50 shadow-sm"
                                            : "border-gray-200 bg-white hover:border-blue-200"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 mb-1 justify-center whitespace-nowrap">
                                          <div className="flex flex-col">
                                            <span className="text-[10px] font-extrabold text-blue-900 border-b border-gray-100 pb-0.5 mb-0.5">
                                              {ratio.r1}% <span className="font-semibold text-gray-500">{r1Name.slice(0, 10)}.</span>
                                            </span>
                                            <span className="text-[10px] font-extrabold text-blue-900">
                                              {ratio.r2}% <span className="font-semibold text-gray-500">{r2Name.slice(0, 10)}.</span>
                                            </span>
                                            {is3Part && (
                                              <span className="text-[10px] font-extrabold text-blue-900 border-t border-gray-100 pt-0.5 mt-0.5">
                                                {ratio.r3}% <span className="font-semibold text-gray-500">{r3Name.slice(0, 10)}.</span>
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div
                                          className={`text-[1.12em] font-mono font-bold text-center ${isRowActiveSelection ? "text-blue-700" : "text-slate-800"}`}
                                        >
                                          $
                                          {calculatedRate.toLocaleString([], {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </div>
                                        <div className="text-[8px] font-sans font-bold text-gray-400 uppercase text-center mt-0.5">
                                          USD / MT
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
                <span className="text-[9.5px] font-extrabold text-blue-500 uppercase tracking-widest block">
                  PAYMENT TERMS SUMMARY
                </span>
                <p className="font-extrabold text-blue-900 uppercase leading-snug">
                  {displayPayments ||
                    "LC at Sight, or TT 20% Advance + 80% Draft Cad"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[9.5px] font-extrabold text-blue-500 uppercase tracking-widest block">
                  PORT LOADING CAPACITY
                </span>
                <p className="text-gray-600 font-medium">
                  Stuffed 26 Metric Tonnes per 20' Heavy Container Build (FCL).
                </p>
              </div>
            </div>

            {/* Signature boxes */}
            <div className="flex flex-col justify-between items-end pr-3 select-none">
              <div className="text-right font-sans text-xs space-y-1">
                <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider block">
                  ACCEPTED BUYER SIGNATURE / SEAL:
                </span>
                <div className="h-16 w-44 border border-dashed border-blue-200 rounded-lg mt-1 mb-2"></div>
                <div className="font-extrabold text-gray-800 uppercase text-[11px]">
                  {buyer || "M/S CLIENT CO"}
                </div>
                <div className="text-[10px] text-gray-400">
                  Date: ____ / ____ / 2026
                </div>
              </div>
            </div>
          </div>

          {/* TERMS AND COND (PREFILL) */}
          <div className="mt-8 border-t border-blue-100 pt-5 font-sans text-[10px] text-gray-500 space-y-2 select-text">
            <span className="font-extrabold text-blue-900 uppercase tracking-widest block">
              CONTRACTUAL EXPORTER AGREEMENT CONDITIONS:
            </span>
            <p className="whitespace-pre-line leading-normal font-medium">
              {additionalTerms ||
                "1. Offer is governed strictly by state-level cereal crop board regulations.\n2. Invoices are subject to FOB packing parameters."}
            </p>
          </div>

          {/* Export disclaimer */}
          <div className="border-t border-blue-100 mt-10 pt-4 text-center font-sans text-[9px] text-gray-400 tracking-wider font-semibold select-none">
            THIS IS AN ELECTRONICALLY GENERATED QUOTATION VALIDATED LOCAL
            REGISTER. NO SIGNATURE IS REQUIRED BY DEFAULT DELEGATOR.
          </div>
        </div>
      </div>
    </div>
  );
}
