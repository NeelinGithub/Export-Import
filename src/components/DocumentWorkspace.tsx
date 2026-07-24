import React, { useState, useEffect } from "react";
import { SavedQuote, PIItem, BagStockItem } from '../types';
import { getHsCodeForCommodity, saveCustomHsCode } from "../utils/hscode";
import {
  fmtDate,
  todayISO,
  numberToWordsUSD,
  getInitials,
  checkAndNotifyIframeBlock,
} from "../utils";
import {
  FileCheck,
  Printer,
  Save,
  Undo2,
  Coins,
  CreditCard,
  Ship,
  MapPin,
  Landmark,
  Trash2,
  Plus,
  Hash,
  FileSpreadsheet,
  Lock,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Brain,
  Copy,
  Check,
  Loader2,
  X,
  Link,
  Maximize2,
  Minimize2,
  Building,
  AlertTriangle,
  CheckCircle2,
  Search,
  FileText,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  getTenantGenerationLogs,
  logDocumentGeneration,
  DocumentGenerationLog,
} from "../services/db";

interface DocumentWorkspaceProps {
  quoteId: number;
  initialType: "pi" | "ci" | "pl";
  onClose?: () => void;
  onSaveCallback?: (updatedQuotes: SavedQuote[]) => void;
  licenceMetadata?: any;
  userId?: string;
  activeTenantId?: string;
  bagStock?: BagStockItem[];
  setBagStock?: (stock: BagStockItem[]) => void;
  showToast?: (message: string, type?: 'success' | 'warn' | 'error') => void;
  allowedModules?: string[];
  isViren?: boolean;
}

const SectionWrapper = ({
  id,
  title,
  enlargedSection,
  setEnlargedSection,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  enlargedSection: string | null;
  setEnlargedSection: (id: string | null) => void;
  icon?: any;
  children: React.ReactNode;
}) => {
  const isEnlarged = enlargedSection === id;

  if (isEnlarged) {
    return (
      <div className="fixed inset-4 md:inset-10 z-[110] bg-slate-950 border border-slate-700 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col no-print animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b border-slate-800 p-6 bg-slate-900 rounded-t-3xl shrink-0">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5 text-sky-400" />}
            <h3 className="text-xl font-black text-white uppercase tracking-wider">
              {title}
            </h3>
          </div>
          <button
            onClick={() => setEnlargedSection(null)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 shadow-blue-900/50 shadow-lg text-white font-black rounded-xl transition flex items-center gap-2 uppercase tracking-wide text-xs"
          >
            <Minimize2 className="w-4 h-4" /> Apply & Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="w-full max-w-4xl mx-auto space-y-6">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative group transition-all duration-300 hover:border-slate-700 shadow-sm hover:shadow focus-within:border-sky-500/50">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-sky-500" />}
          <h3 className="text-[11px] font-extrabold text-white uppercase tracking-wider font-sans line-clamp-1">
            {title}
          </h3>
        </div>
        <button
          onClick={() => setEnlargedSection(id)}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 bg-sky-600 hover:bg-sky-500 rounded-lg text-white transition shrink-0 flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-bold shadow-md shadow-sky-900/20"
          title="Enlarge for better editing view"
        >
          <Maximize2 className="w-3.5 h-3.5" />{" "}
          <span className="hidden md:inline">Enlarge</span>
        </button>
      </div>

      <div className="space-y-3 pt-1">{children}</div>
    </div>
  );
};

export default function DocumentWorkspace({
  quoteId,
  initialType,
  onClose,
  onSaveCallback,
  licenceMetadata,
  userId,
  activeTenantId,
  bagStock,
  setBagStock,
  showToast,
  allowedModules = [],
  isViren = false,
}: DocumentWorkspaceProps) {
  const [docType, setDocType] = useState<"pi" | "ci" | "pl">(initialType);
  const [workspaceZoom, setWorkspaceZoom] = useState(1);
  const [printCombined, setPrintCombined] = useState(false);
  const [quote, setQuote] = useState<SavedQuote | null>(null);
  const [enlargedSection, setEnlargedSection] = useState<string | null>(null);
  const [localToast, setLocalToast] = useState<{message: string, type: string} | null>(null);

  const [focusValues, setFocusValues] = useState<Record<string, number>>({});
  const [impactConfirm, setImpactConfirm] = useState<{
    itemId: number;
    field: 'rate' | 'totalWeightKg';
    oldValue: number;
    newValue: number;
    diffTotal: number;
    newGrandTotal: number;
  } | null>(null);

  // Document generation limits auditing state
  const [genLogs, setGenLogs] = useState<DocumentGenerationLog[]>([]);

  useEffect(() => {
    if (activeTenantId) {
      getTenantGenerationLogs(activeTenantId)
        .then((logs) => setGenLogs(logs))
        .catch((err) => console.error("Could not fetch document logs", err));
    }
  }, [activeTenantId]);

  const getDocCounts = (type: "pi" | "ci" | "pl") => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const monthStr = now.toISOString().substring(0, 7);
    const yearStr = now.toISOString().substring(0, 4);

    const filtered = genLogs.filter((log) => log.docType === type);

    const dayCount = filtered.filter(
      (l) => l.timestamp.split("T")[0] === todayStr,
    ).length;
    const monthCount = filtered.filter((l) =>
      l.timestamp.startsWith(monthStr),
    ).length;
    const yearCount = filtered.filter((l) =>
      l.timestamp.startsWith(yearStr),
    ).length;

    return {
               dayCount, monthCount, yearCount };
  };

  // Status and Alerts
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [autoSaveSuccess, setAutoSaveSuccess] = useState(false);

  // Autocomplete / suggestion states for Exporter and Consignee
  const [savedConsignees, setSavedConsignees] = useState<string[]>([]);
  const [savedExporters, setSavedExporters] = useState<string[]>([]);
  const [showConsigneeSuggestions, setShowConsigneeSuggestions] =
    useState(false);
  const [showExporterSuggestions, setShowExporterSuggestions] = useState(false);

  // Synchronously fetch / cache lists
  const getSavedConsigneesList = (): string[] => {
    const local = localStorage.getItem("rems_saved_consignees");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed))
          return parsed.map((s) => s.trim()).filter(Boolean);
      } catch (_) {}
    }
    // Extract unique ones from existing saved quotes
    const quotesRaw = localStorage.getItem("rems_saved_quotes_v2");
    const set = new Set<string>();
    if (quotesRaw) {
      try {
        const list = JSON.parse(quotesRaw);
        list.forEach((q: any) => {
          if (q.consigneeDetails && q.consigneeDetails.trim())
            set.add(q.consigneeDetails.trim());
          if (q.buyer || q.buyerLoc) {
            const composite = `${q.buyer}\n${q.buyerLoc}`.trim();
            if (composite) set.add(composite);
          }
        });
      } catch (_) {}
    }
    return Array.from(set).filter(Boolean);
  };

  const getSavedExportersList = (): string[] => {
    const local = localStorage.getItem("rems_saved_exporters");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed))
          return parsed.map((s) => s.trim()).filter(Boolean);
      } catch (_) {}
    }
    // Extract unique ones from existing saved quotes
    const quotesRaw = localStorage.getItem("rems_saved_quotes_v2");
    const set = new Set<string>();
    const customCompany = licenceMetadata?.logoText || licenceMetadata?.name;
    if (customCompany) {
      set.add(`${customCompany.toUpperCase()}\nINDIA`);
    } else {
      set.add(
        "SA ENTERPRISES EXPORTS\nOPP. STAR PLAZA, PHULCHHAB CHOWK,\nRAJKOT, GUJARAT, INDIA - 360001",
      );
    }
    if (quotesRaw) {
      try {
        const list = JSON.parse(quotesRaw);
        list.forEach((q: any) => {
          if (q.exporterDetails && q.exporterDetails.trim())
            set.add(q.exporterDetails.trim());
          if (q.company && q.company.trim())
            set.add(`${q.company.trim()}\nINDIA`);
        });
      } catch (_) {}
    }
    return Array.from(set).filter(Boolean);
  };

  useEffect(() => {
    setSavedConsignees(getSavedConsigneesList());
    setSavedExporters(getSavedExportersList());
  }, [quoteId, licenceMetadata]);

  const getFilteredConsignees = () => {
    if (!consignee) return savedConsignees;
    const lower = consignee.toLowerCase();
    return savedConsignees.filter((item) => item.toLowerCase().includes(lower));
  };

  const getFilteredExporters = () => {
    if (!exporter) return savedExporters;
    const lower = exporter.toLowerCase();
    return savedExporters.filter((item) => item.toLowerCase().includes(lower));
  };

  // AI Trade Assistant state
  const [aiMode, setAiMode] = useState<
    "audit" | "goods_description" | "cover_letter" | null
  >(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<string>("");
  const [copiedAi, setCopiedAi] = useState<boolean>(false);

  const handleAiAction = async (
    actionType: "audit" | "goods_description" | "cover_letter",
  ) => {
    if (licenceMetadata && licenceMetadata.aiEnabled === false) {
      if (showToast) {
        showToast("AI Features are restricted for your workspace. Please contact Administrator to upgrade.", "error");
      } else {
        alert("AI Features are restricted for your workspace. Please contact Administrator to upgrade.");
      }
      return;
    }

    setAiLoading(true);
    setAiMode(actionType);
    setAiResult("");
    setCopiedAi(false);

    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: actionType,
          payload: {
            docType,
            exporter,
            consignee,
            buyerName: quote?.buyer,
            invoiceNo,
            invoiceDate,
            portLoading,
            portDischarge,
            paymentTerms,
            signatory,
            items: items.map((it) => ({
              commodity: it.commodity,
              qtyTons: it.qtyTons,
              rate: it.rateUsdTons,
              totalAmount: Number(it.qtyTons) * Number(it.rateUsdTons),
              brandName: it.brandName,
              specCondition: it.specCondition,
              packingType: it.packingType,
            })),
            grandTotalRaw: items.reduce(
              (sum, item) =>
                sum + Number(item.qtyTons) * Number(item.rateUsdTons),
              0,
            ),
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status} Error`);
      }

      const data = await response.json();
      setAiResult(data.result || "No output generated.");
    } catch (err: any) {
      console.error("Error fetching AI insights:", err);
      setAiResult(
        `Error analyzing documents with AI: ${err.message || "Please check your internet connection and verify GEMINI_API_KEY is configured in Settings."}`,
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyAiToClipboard = () => {
    if (!aiResult) return;
    navigator.clipboard.writeText(aiResult);
    setCopiedAi(true);
    setTimeout(() => setCopiedAi(false), 2500);
  };

  const parseInlineFormatting = (text: string) => {
    if (!text) return "";
    // Simple bold extractor for **bold text**
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <strong key={i} className="font-extrabold text-teal-300">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  const parseMarkdownToJSX = (content: string) => {
    if (!content) return null;
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;

      // Error check
      if (trimmed.startsWith("Error analyzing") || trimmed.startsWith("❌")) {
        return (
          <p
            key={idx}
            className="text-[11px] text-rose-400 font-sans font-bold leading-relaxed mb-1.5 p-2 bg-rose-950/20 border border-rose-900 rounded-lg"
          >
            {trimmed}
          </p>
        );
      }

      // Headings
      if (trimmed.startsWith("###")) {
        return (
          <h4
            key={idx}
            className="text-[11px] font-black text-sky-400 uppercase tracking-wider mt-4 mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-1 font-sans"
          >
            {trimmed.replace(/^###\s*/, "")}
          </h4>
        );
      }
      if (trimmed.startsWith("##")) {
        return (
          <h3
            key={idx}
            className="text-xs font-black text-teal-400 mt-5 mb-2 border-l-2 border-teal-500 pl-2 font-sans"
          >
            {trimmed.replace(/^##\s*/, "")}
          </h3>
        );
      }
      if (trimmed.startsWith("#")) {
        return (
          <h2
            key={idx}
            className="text-sm font-black text-white mt-6 mb-3 font-sans"
          >
            {trimmed.replace(/^#\s*/, "")}
          </h2>
        );
      }

      // Bullet points
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const clean = trimmed.replace(/^[-*]\s*/, "");
        return (
          <li
            key={idx}
            className="list-none pl-3.5 relative text-[11px] text-slate-300 leading-relaxed mb-1.5 before:content-['•'] before:absolute before:left-0.5 before:text-teal-400 font-sans text-left"
          >
            {parseInlineFormatting(clean)}
          </li>
        );
      }

      // Numbered lists
      if (/^\d+\.\s+/.test(trimmed)) {
        const clean = trimmed.replace(/^\d+\.\s+/, "");
        const match = trimmed.match(/^(\d+)\.\s+/);
        const num = match ? match[1] : "1";
        return (
          <div
            key={idx}
            className="flex gap-2 pl-1 mb-1.5 text-[11px] text-slate-300 leading-relaxed font-sans text-left items-start"
          >
            <span className="font-bold text-teal-400 shrink-0">{num}.</span>
            <div className="flex-1">{parseInlineFormatting(clean)}</div>
          </div>
        );
      }

      // Standard paragraphs
      return (
        <p
          key={idx}
          className="text-[11px] text-slate-300 leading-relaxed mb-1.5 font-sans text-left"
        >
          {parseInlineFormatting(trimmed)}
        </p>
      );
    });
  };

  // App Layout Configuration
  const [pageMargins, setPageMargins] = useState(() => {
    const saved = localStorage.getItem("rems_doc_margins");
    return saved ? JSON.parse(saved) : { top: "15mm", bottom: "15mm", leftRight: "20mm" };
  });
  const [itemsPerPage, setItemsPerPage] = useState<number | string>(() => {
    const saved = localStorage.getItem("rems_doc_items_per_page");
    return saved ? parseInt(saved) : 7;
  }); // Crucial layout configuration matched to image details budget
  const [footerReserveSize, setFooterReserveSize] = useState<number | string>(() => {
    const saved = localStorage.getItem("rems_doc_footer_reserve");
    return saved ? parseInt(saved) : 4;
  }); // Footer takes up this many line items worth of heights
  const [docFontFamily, setDocFontFamily] = useState(() => localStorage.getItem("rems_doc_font_family") || "font-sans");
  const [docBaseFontSize, setDocBaseFontSize] = useState<number | string>(() => {
    const saved = localStorage.getItem("rems_doc_base_font_size");
    return saved ? parseFloat(saved) : 10;
  }); // 10mm to 12mm equivalent base size

  const defaultColumnsTemplate = {
    srNo: true,
    marking: true,
    noOfPkgs: true,
    description: true,
    prodCode: true,
    hsCode: true,
    qtyTotal: true,
    netWeight: true,
    rate: true,
    total: true,
  };

  const [allVisibleColumns, setAllVisibleColumns] = useState<Record<string, typeof defaultColumnsTemplate>>(() => {
    const saved = localStorage.getItem("rems_doc_visible_columns_v2");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const oldSaved = localStorage.getItem("rems_doc_visible_columns");
    const oldCols = oldSaved ? JSON.parse(oldSaved) : defaultColumnsTemplate;
    return {
              
      pi: { ...oldCols },
      ci: { ...oldCols },
      pl: { ...oldCols, rate: false, total: false } // PL usually doesn't have rates
    };
  });

  const visibleColumns = allVisibleColumns[docType] || defaultColumnsTemplate;

  const [rowHeights, setRowHeights] = useState({
    tableHeader: "auto",
    dataRow: "auto",
    emptySpacer: "0px",
  });

  const [typography, setTypography] = useState({
    fontFamily: "font-serif",
    baseFontSize: "text-[10px]",
  });

  const defaultSectionsTemplate = {
    logistics: true,
    incoterms: true,
    declaration: true,
    bankDetails: true,
    containerLocks: true,
    containerLocksPiCi: false,
    footerMetrics: true,
    spacerRow: true,
    headerRepeat: "all",
  };

  const [allVisibleSections, setAllVisibleSections] = useState<Record<string, typeof defaultSectionsTemplate>>(() => {
    const saved = localStorage.getItem("rems_doc_visible_sections_v2");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const oldSaved = localStorage.getItem("rems_doc_visible_sections");
    const oldSecs = oldSaved ? JSON.parse(oldSaved) : defaultSectionsTemplate;
    return {
              
      pi: { ...oldSecs },
      ci: { ...oldSecs },
      pl: { ...oldSecs, bankDetails: false, incoterms: false } // custom defaults
    };
  });

  const visibleSections = allVisibleSections[docType] || defaultSectionsTemplate;

  // Loaded Form Overrides state
  const [exporter, setExporter] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [companyContact, setCompanyContact] = useState("");
  const [consignee, setConsignee] = useState("");
  const [notifyParty, setNotifyParty] = useState("SAME AS CONSIGNEE");
  const [preCarriage, setPreCarriage] = useState("BY SEA");
  const [placeOfReceipt, setPlaceOfReceipt] = useState("MUNDRA PORT");
  const [countryOrigin, setCountryOrigin] = useState("INDIA");
  const [countryDest, setCountryDest] = useState("QATAR");
  const [vesselFlight, setVesselFlight] = useState("MV OCEAN COMMANDER V-204");
  const [portLoading, setPortLoading] = useState("MUNDRA PORT, INDIA");
  const [portDischarge, setPortDischarge] = useState("HAMAD PORT, DOHA");
  const [finalDest, setFinalDest] = useState("DOHA, QATAR");

  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [contractNo, setContractNo] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [iecNo, setIecNo] = useState("0312004561");
  const [gstin, setGstin] = useState("24AAAAB1234C1Z0");

  // CI parameters
  const [shipmentPeriod, setShipmentPeriod] = useState("10+2 DAYS");
  const [incoterms, setIncoterms] = useState("CFR HAMAD, DOHA");
  const [paymentTerms, setPaymentTerms] = useState("100% CAD AT SIGHT");
  const [bankDetails, setBankDetails] = useState('');
  const [usdToWordsStyle, setUsdToWordsStyle] = useState<"intl" | "lakh">(
    "intl",
  );
  const [manualWords, setManualWords] = useState("");

  // Sched modal toggle for integrated Option A scheduler helper
  const [showSchedulesModal, setShowSchedulesModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<"optionA" | "optionB">(
    "optionA",
  );

  // PL/Document details
  const [declaration, setDeclaration] = useState(
    "We hereby declare all documents and quality tested parameters are verified and certified under food grade specifications.",
  );
  const [signatory, setSignatory] = useState("FOR SA ENTERPRISES");
  const [signatureImageUrl, setSignatureImageUrl] = useState("");
  const [documentRemarks, setDocumentRemarks] = useState("");

  // Multi-item rows in the contract
  const [items, setItems] = useState<PIItem[]>([]);

  // Packing list specific container specifications
  const [bagsDetailsList, setBagsDetailsList] = useState<
    Array<{
      containerNo: string;
      sealNo: string;
      lotNo: string;
      packagesCount: number;
      netWt: number;
      grossWt: number;
    }>
  >([]);

  // Load from database / localStorage
  useEffect(() => {
    const listRaw = localStorage.getItem("rems_saved_quotes_v2");
    if (listRaw) {
      try {
        const list: SavedQuote[] = JSON.parse(listRaw);
        const target = list.find((q) => q.id === quoteId);
        if (target) {
          setQuote(target);

          const loadedItems = target.items || [];
          const hydratedItems = loadedItems.map((item: PIItem) => {
            const hasProperHsDigit =
              item.crop &&
              item.crop !== "NEW" &&
              item.crop !== "OLD" &&
              item.crop.match(/\d/);
            return {
              
              ...item,
              marking: item.marking || `${item.numFCL || 1} FCL`,
              crop: hasProperHsDigit
                ? item.crop
                : getHsCodeForCommodity(item.commodity),
            };
          });
          setItems(hydratedItems);

          // Try to fetch custom admin portal configured company name
          const customCompany =
            licenceMetadata?.logoText || licenceMetadata?.name;
          const defaultExporterText = customCompany
            ? `${customCompany.toUpperCase()}\nINDIA`
            : "SA ENTERPRISES EXPORTS\nOPP. STAR PLAZA, PHULCHHAB CHOWK,\nRAJKOT, GUJARAT, INDIA - 360001";

          let initialExporter =
            target.exporterDetails || target.company || defaultExporterText;
          // Upgrade legacy generic SA exporter to active custom business if configured
          if (
            customCompany &&
            (initialExporter.startsWith("SA ENTERPRISES") ||
              initialExporter.includes("SA ENTERPRISES EXPORTS"))
          ) {
            initialExporter = `${customCompany.toUpperCase()}\nOPP. STAR PLAZA, PHULCHHAB CHOWK, INDIA`;
          }

          setExporter(initialExporter);
          if (licenceMetadata?.logoBase64) {
            setCompanyLogoUrl(licenceMetadata.logoBase64);
          } else if (licenceMetadata?.logoUrl) {
            setCompanyLogoUrl(licenceMetadata.logoUrl);
          }
          
          if (target.companyContact) setCompanyContact(target.companyContact);
          if (target.documentRemarks) setDocumentRemarks(target.documentRemarks);
          if (target.signatureImageUrl) setSignatureImageUrl(target.signatureImageUrl);

          let finalConsignee = target.consigneeDetails
            ? target.consigneeDetails.trim()
            : "";

          if (finalConsignee) {
            if (
              target.buyer &&
              !finalConsignee
                .toLowerCase()
                .includes(target.buyer.trim().toLowerCase())
            ) {
              finalConsignee = `${target.buyer.trim()}\n${finalConsignee}`;
            }
          } else {
            finalConsignee =
              `${target.buyer || ""}\n${target.buyerLoc || ""}`.trim();
          }

          setConsignee(finalConsignee);
          setNotifyParty(target.notifyParty || "SAME AS CONSIGNEE");
          setPreCarriage(target.preCarriageBy || "BY SEA");
          setPlaceOfReceipt(target.placeOfReceipt || "MUNDRA PORT");
          setCountryOrigin(target.countryOfOrigin || "INDIA");
          setCountryDest(target.countryOfDestination || "QATAR");
          setVesselFlight(target.vesselFlightNo || "MV REGINA V-105");
          setPortLoading(target.portOfLoading || "MUNDRA PORT, INDIA");
          setPortDischarge(target.portOfDischarge || "HAMAD PORT, DOHA");
          setFinalDest(
            target.finalDestination || target.buyerLoc || "DOHA, QATAR",
          );

          setInvoiceNo(target.invoiceNo || `INV/${target.ref}`);
          setInvoiceDate(target.invoiceDate || target.date || todayISO());
          setContractNo(target.contractNo || target.ref);
          setContractDate(target.contractDate || target.date || todayISO());
          setIecNo(target.iecNo || "0312004561");
          setGstin(target.gstin || "24AAAAB1234C1Z0");

          setShipmentPeriod(target.shipmentPeriod || "IMMEDIATE");
          setIncoterms(target.incoterms || target.cond || "CFR DOHA");
          setPaymentTerms(
            target.paymentTerms || target.terms || "CAD AT SIGHT",
          );
          setBankDetails(target.bankDetails || licenceMetadata?.bankDetails || "BANK: HDFC BANK LTD\nACC: HDFC-CURRENT-0092451003445\nSWIFT: HDFCINBB");
          setUsdToWordsStyle(target.usdToWordsStyle || "intl");
          setManualWords(target.amountInWordsManual || "");

          setDeclaration(
            target.declarationText ||
              "WE HEREBY DECLARE THE RAW CROP SPECIES ARE HYGIENICALLY MILLED, CLEANED, AND PREPARED AS PER QUALITY CERTIFICATE STANDARDS.",
          );

          let initialSignatory =
            target.authorizedSignatory || `FOR ${target.company.toUpperCase()}`;
          if (
            customCompany &&
            (initialSignatory.includes("SA ENTERPRISES") ||
              initialSignatory.includes("SA ENTERPRISES EXPORTS") ||
              !target.authorizedSignatory)
          ) {
            initialSignatory = `FOR ${customCompany.toUpperCase()}`;
          }
          setSignatory(initialSignatory);

          // Containers stock list
          if (target.bagsDetailsList && target.bagsDetailsList.length > 0) {
            setBagsDetailsList(target.bagsDetailsList);
          } else {
            // Generate some baseline mock containers mirroring the FCL details
            const safeItems = target.items || [];
            const totalFcl = Math.max(
              safeItems.reduce((sum, item) => sum + (item.numFCL || 1), 0),
              1,
            );
            const list: any[] = [];
            for (let i = 0; i < totalFcl; i++) {
              const bagsCount =
                safeItems.length > 0 ? (safeItems[i % safeItems.length]?.totalBags || 10000) : 10000;
              const netWtSum =
                (safeItems.length > 0 ? (safeItems[i % safeItems.length]?.totalWeightKg || 260000) : 260000) / totalFcl;
              list.push({
                containerNo: `HLXU-${Math.floor(100000 + Math.random() * 900000)}-${Math.floor(0 + Math.random() * 9)}`,
                sealNo: `SL-${Math.floor(10000 + Math.random() * 90000)}`,
                lotNo: `LOT-${i + 1}`,
                packagesCount: Math.round(bagsCount / totalFcl) || 5000,
                netWt: Math.round(netWtSum),
                grossWt: Math.round(netWtSum * 1.01),
              });
            }
            setBagsDetailsList(list);
          }
        } else {
          // New document or template, initialize logo if available
          if (licenceMetadata?.logoBase64) {
            setCompanyLogoUrl(licenceMetadata.logoBase64);
          } else if (licenceMetadata?.logoUrl) {
            setCompanyLogoUrl(licenceMetadata.logoUrl);
          }
        }
      } catch (err) {
        console.error("Error hydrating document workspace parameters", err);
      }
    } else {
       if (licenceMetadata?.logoBase64) {
           setCompanyLogoUrl(licenceMetadata.logoBase64);
       } else if (licenceMetadata?.logoUrl) {
           setCompanyLogoUrl(licenceMetadata.logoUrl);
       }
    }

    try {
      const draftKey = `rems_draft_${quoteId}`;
      const draftRaw = localStorage.getItem(draftKey);
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        if (draft.exporter) setExporter(draft.exporter);
        if (draft.consignee) setConsignee(draft.consignee);
        if (draft.notifyParty) setNotifyParty(draft.notifyParty);
        if (draft.preCarriage) setPreCarriage(draft.preCarriage);
        if (draft.placeOfReceipt) setPlaceOfReceipt(draft.placeOfReceipt);
        if (draft.countryOrigin) setCountryOrigin(draft.countryOrigin);
        if (draft.countryDest) setCountryDest(draft.countryDest);
        if (draft.vesselFlight) setVesselFlight(draft.vesselFlight);
        if (draft.portLoading) setPortLoading(draft.portLoading);
        if (draft.portDischarge) setPortDischarge(draft.portDischarge);
        if (draft.finalDest) setFinalDest(draft.finalDest);
        if (draft.invoiceNo) setInvoiceNo(draft.invoiceNo);
        if (draft.invoiceDate) setInvoiceDate(draft.invoiceDate);
        if (draft.contractNo) setContractNo(draft.contractNo);
        if (draft.contractDate) setContractDate(draft.contractDate);
        if (draft.iecNo) setIecNo(draft.iecNo);
        if (draft.gstin) setGstin(draft.gstin);
        if (draft.shipmentPeriod) setShipmentPeriod(draft.shipmentPeriod);
        if (draft.incoterms) setIncoterms(draft.incoterms);
        if (draft.paymentTerms) setPaymentTerms(draft.paymentTerms);
        if (draft.bankDetails) setBankDetails(draft.bankDetails);
        if (draft.documentRemarks !== undefined) setDocumentRemarks(draft.documentRemarks);
        if (draft.items) setItems(draft.items);
        if (draft.bagsDetailsList) setBagsDetailsList(draft.bagsDetailsList);
        // Toast message will be shown if applicable
        if (typeof showToast !== 'undefined') {
          setTimeout(() => showToast("Restored unsaved document draft from previous session.", "success"), 800);
        }
      }
    } catch (e) {
      console.warn("Failed loading document draft", e);
    }
  }, [quoteId, licenceMetadata]);

  // Auto-save draft mechanism
  useEffect(() => {
    // Skip empty defaults / initial load cycles
    if (!exporter && !consignee && items.length === 0) return;

    const draftKey = `rems_draft_${quoteId}`;
    const draftData = {
      exporter, consignee, notifyParty, preCarriage, placeOfReceipt,
      countryOrigin, countryDest, vesselFlight, portLoading, portDischarge,
      finalDest, invoiceNo, invoiceDate, contractNo, contractDate,
      iecNo, gstin, shipmentPeriod, incoterms, paymentTerms, bankDetails,
      documentRemarks, items, bagsDetailsList
    };

    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(draftData));
        setAutoSaveSuccess(true);
        setTimeout(() => setAutoSaveSuccess(false), 2500);
      } catch (err) {
        console.warn("Failed to auto-save draft", err);
      }
    }, 1500); // Debounce saves by 1.5s

    return () => clearTimeout(timeoutId);
  }, [
    exporter, consignee, notifyParty, preCarriage, placeOfReceipt,
    countryOrigin, countryDest, vesselFlight, portLoading, portDischarge,
    finalDest, invoiceNo, invoiceDate, contractNo, contractDate,
    iecNo, gstin, shipmentPeriod, incoterms, paymentTerms, bankDetails,
    documentRemarks, items, bagsDetailsList, quoteId
  ]);

  // Handle table items numeric cells real-time sum propagation
  const handleItemCellChange = (
    itemId: number,
    field: keyof PIItem,
    val: string,
  ) => {
    let parsed: any = val;
    if (
      field === "rate" ||
      field === "totalWeightKg" ||
      field === "totalBags" ||
      field === "numFCL" ||
      field === "weightPerContainerKg" ||
      field === "blendRice1Pct" ||
      field === "blendRice2Pct" ||
      field === "blendRice3Pct"
    ) {
      parsed = parseFloat(val) || 0;
    }

    setItems((prev) => {
      let toastMsg = "";
      const newItems = prev.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: parsed };
          // Auto recalculate total weight and volume values if necessary
          if (field === "numFCL" || field === "weightPerContainerKg") {
            updated.totalWeightKg =
              updated.numFCL * updated.weightPerContainerKg;
          }
          
          if ((field === "numFCL" || field === "marking" || field === "totalWeightKg" || field === "commodity" || field === "weightPerContainerKg") && updated.commodity?.toLowerCase().includes("rice")) {
            let parsedFCL = updated.numFCL || 0;
            if (updated.marking) {
              const match = updated.marking.match(/(\d+)\s*(?:FCL|CONTAINERS?)/i);
              if (match && match[1]) {
                parsedFCL = parseInt(match[1], 10);
              } else if (/^\d+$/.test(updated.marking.trim())) {
                parsedFCL = parseInt(updated.marking.trim(), 10);
              }
            }
            if (parsedFCL > 0) {
              const expectedWeight = parsedFCL * 26000;
              const allowDiff = parsedFCL * 500;
              const diff = Math.abs(updated.totalWeightKg - expectedWeight);
              if (diff > allowDiff) {
                toastMsg = `Warning: ${parsedFCL} FCL of rice should be ~${expectedWeight}kg (±${allowDiff}kg allowance). Currently ${updated.totalWeightKg}kg!`;
              }
            }
          }
          
          return updated;
        }
        return item;
      });
      
      if (toastMsg) {
        setTimeout(() => {
          if (showToast) showToast(toastMsg, "warn");
          else alert(toastMsg);
        }, 0);
      }
      
      return newItems;
    });
  };

  const calculateGrandTotalUSD = () => {
    return items.reduce((sum, item) => {
      const isOilItem = item.industry === "oil" || (item.industry === "agri_multi" && /\bOIL\b/.test(item.commodity.toUpperCase()));
      const bottleSizeNum = parseFloat(item.size.replace(/[^\d.]/g, '')) || 1;
      const ratePerKl = item.ratePerKl || (isOilItem ? (item.oilPricingMode === "PIECE" ? item.rate * (1000 / bottleSizeNum) : item.rate) : item.rate);
      const rowTotalUSD = isOilItem
        ? ((item.totalWeightKg || 0) / 1000) * ratePerKl
        : ((item.totalWeightKg || 0) / 1000) * item.rate;
      return sum + rowTotalUSD;
    }, 0);
  };

  const handleItemFocus = (itemId: number, field: string, val: number) => {
    setFocusValues(prev => ({ ...prev, [`${itemId}-${field}`]: val }));
  };

  const handleItemBlur = (itemId: number, field: 'rate' | 'totalWeightKg', currentValue: number) => {
    const oldVal = focusValues[`${itemId}-${field}`];
    if (oldVal !== undefined && oldVal !== currentValue) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        const oldRate = field === 'rate' ? oldVal : item.rate;
        const oldWeight = field === 'totalWeightKg' ? oldVal : item.totalWeightKg;
        const newRate = field === 'rate' ? currentValue : item.rate;
        const newWeight = field === 'totalWeightKg' ? currentValue : item.totalWeightKg;
        
        const oldItemTotal = (oldRate || 0) * ((oldWeight || 0) / 1000);
        const newItemTotal = (newRate || 0) * ((newWeight || 0) / 1000);
        
        const diffItem = newItemTotal - oldItemTotal;
        if (Math.abs(diffItem) > 0.01) {
          // Re-calculate the whole grand total with this new item value (items state already has the new value since onChange fires before blur)
          const newGrandTotal = items.reduce((sum, it) => {
            const itRate = it.id === itemId && field === 'rate' ? currentValue : it.rate;
            const itWt = it.id === itemId && field === 'totalWeightKg' ? currentValue : it.totalWeightKg;
            return sum + (itRate * (itWt / 1000));
          }, 0);

          setImpactConfirm({
            itemId,
            field,
            oldValue: oldVal,
            newValue: currentValue,
            diffTotal: diffItem,
            newGrandTotal
          });
        }
      }
    }
  };

  const calculateTotalBags = () => {
    return items.reduce((sum, item) => sum + (item.totalBags || 0), 0);
  };

  const calculateTotalNetWt = () => {
    if (docType === "pl") {
      return bagsDetailsList.reduce((sum, c) => sum + (c.netWt || 0), 0);
    }
    return items.reduce((sum, item) => sum + (item.totalWeightKg || 0), 0);
  };

  const calculateTotalGrossWt = () => {
    if (docType === "pl") {
      return bagsDetailsList.reduce((sum, c) => sum + (c.grossWt || 0), 0);
    }
    return items.reduce(
      (sum, item) => sum + (item.totalWeightKg || 0) * 1.012,
      0,
    );
  };

  const computedUSDGrandTotal = calculateGrandTotalUSD();
  const autoWords = numberToWordsUSD(computedUSDGrandTotal, usdToWordsStyle);
  const displayWords = manualWords || autoWords;

  const handleAddBlankItem = () => {
    const defaultItem: PIItem = {
      id: Date.now(),
      dest: finalDest || "HAMAD",
      commodity: "INDIAN BASMATI EXTRA-LONG GRADE",
      brand: "PREMIUM BRAND",
      packed: "JUTE BAGS",
      size: "20KG BOPP PACK",
      master: "YES",
      crop: getHsCodeForCommodity("INDIAN BASMATI EXTRA-LONG GRADE"),
      year: "2026",
      rate: 980,
      condition: incoterms || "CFR",
      paymentTerms: paymentTerms || "CAD",
      numFCL: 1,
      marking: "1 FCL",
      weightPerContainerKg: 26000,
      totalWeightKg: 26000,
      totalBags: 1300,
    };
    setItems([...items, defaultItem]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length <= 1) {
      alert("Your document must preserve at least one active cargo description item.");
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const handleBagsCellChange = (idx: number, field: string, val: any) => {
    setBagsDetailsList((prev) => {
      const copy = [...prev];
      let finalVal = val;
      if (
        field === "packagesCount" ||
        field === "netWt" ||
        field === "grossWt"
      ) {
        finalVal = Math.max(parseInt(val) || 0, 0);
      }
      copy[idx] = { ...copy[idx], [field]: finalVal };
      return copy;
    });
  };

  const handleAddContainerRow = () => {
    setBagsDetailsList([
      ...bagsDetailsList,
      {
        containerNo: `TCNU-${Math.floor(100000 + Math.random() * 900000)}-${Math.floor(0 + Math.random() * 9)}`,
        sealNo: `S-${Math.floor(20000 + Math.random() * 80000)}`,
        lotNo: `LOT-${bagsDetailsList.length + 1}`,
        packagesCount: 1300,
        netWt: 26000,
        grossWt: 26312,
      },
    ]);
  };

  const handleRemoveContainerRow = (idx: number) => {
    setBagsDetailsList(bagsDetailsList.filter((_, i) => i !== idx));
  };

  const handleSaveWorkspaceData = () => {
    if (!quote) return;

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const monthStr = now.toISOString().substring(0, 7);
    const yearStr = now.toISOString().substring(0, 4);

    const filtered = genLogs.filter((log) => log.docType === docType);
    const dayCount = filtered.filter((l) => l.timestamp.split("T")[0] === todayStr).length;
    const monthCount = filtered.filter((l) => l.timestamp.startsWith(monthStr)).length;
    const yearCount = filtered.filter((l) => l.timestamp.startsWith(yearStr)).length;

    const isPayPerDoc = licenceMetadata?.planId === "pay_per_doc";
    const isFree = !isViren && (!licenceMetadata || licenceMetadata?.planId === "free" || licenceMetadata?.approved === false);

    // Track total document sets created this month across all types (PI/CI/PL combined) for quota enforcing
    const totalMonthDocsCount = genLogs.filter((log) => log.timestamp.startsWith(monthStr)).length;

    if (isFree && totalMonthDocsCount >= 4) {
      const warningMsg = `⚠️ FREE TIER QUOTA EXCEEDED\n\nYou have generated ${totalMonthDocsCount} of your 4 allowed shipping documents for this month.\n\nTo create more documents or access multi-commodity saved workflows, please upgrade to a Premium Subscription plan under the License settings!`;
      alert(warningMsg);
      if (showToast) showToast("Monthly document limit (4/month) reached! Upgrade under License.", "error");
      return;
    }

    if (isPayPerDoc && totalMonthDocsCount >= 1) {
      const warningMsg = `⚠️ PAY-AS-YOU-GO QUOTA EXCEEDED\n\nYou have already generated your 1 allowed shipping document set for this month.\n\nPlease purchase another Single-Shipment credit or upgrade to a Premium Subscription to generate more documents.`;
      alert(warningMsg);
      if (showToast) showToast("Single shipment credit limit exceeded! Upgrade to continue.", "error");
      return;
    }

    const limitDay = docType === "pi" ? licenceMetadata?.piLimitDay : docType === "ci" ? licenceMetadata?.ciLimitDay : licenceMetadata?.plLimitDay;
    const limitMonth = isPayPerDoc ? 1 : (docType === "pi" ? licenceMetadata?.piLimitMonth : docType === "ci" ? licenceMetadata?.ciLimitMonth : licenceMetadata?.plLimitMonth);
    const limitYear = docType === "pi" ? licenceMetadata?.piLimitYear : docType === "ci" ? licenceMetadata?.ciLimitYear : licenceMetadata?.plLimitYear;

    if (!isViren && !isFree && !isPayPerDoc) {
      if (limitDay && limitDay > 0 && dayCount >= limitDay) {
        alert(`Limit Exceeded: You have reached the daily generation limit of ${limitDay} for ${docType.toUpperCase()} documents.`);
        return;
      }
      if (limitMonth && limitMonth > 0 && monthCount >= limitMonth) {
        alert(`Limit Exceeded: Your plan restricts you to ${limitMonth} ${docType.toUpperCase()} document(s) per month.`);
        return;
      }
      if (limitYear && limitYear > 0 && yearCount >= limitYear) {
        alert(`Limit Exceeded: You have reached the yearly generation limit of ${limitYear} for ${docType.toUpperCase()} documents.`);
        return;
      }
    }

    const listRaw = localStorage.getItem("rems_saved_quotes_v2");
    if (!listRaw) return;

    try {
      const list: SavedQuote[] = JSON.parse(listRaw);
      let changedFieldsMsg = "";
      let hasChanges = false;
      const updatedList = list.map((q) => {
        if (q.id === quote.id) {
          const changedFields: string[] = [];
          if (q.exporterDetails !== exporter) changedFields.push("Exporter");
          if (q.consigneeDetails !== consignee) changedFields.push("Consignee");
          if (q.invoiceNo !== invoiceNo) changedFields.push("Invoice No");
          if (q.invoiceDate !== invoiceDate) changedFields.push("Invoice Date");
          if (q.contractNo !== contractNo) changedFields.push("Contract No");
          if (q.contractDate !== contractDate) changedFields.push("Contract Date");
          if (q.incoterms !== incoterms) changedFields.push("Incoterms");
          if (q.paymentTerms !== paymentTerms) changedFields.push("Payment Terms");
          if (q.bankDetails !== bankDetails) changedFields.push("Bank Details");
          if (q.portOfLoading !== portLoading) changedFields.push("Point of Loading");
          if (q.portOfDischarge !== portDischarge) changedFields.push("Point of Discharge");
          if (q.finalDestination !== finalDest) changedFields.push("Final Dest");
          if (q.documentRemarks !== documentRemarks) changedFields.push("Remarks");
          if (q.declarationText !== declaration) changedFields.push("Declaration");
          if (JSON.stringify(q.items) !== JSON.stringify(items)) changedFields.push("Items/Rates/Weights");
          if (JSON.stringify(q.bagsDetailsList) !== JSON.stringify(bagsDetailsList)) changedFields.push("Containers/Packing");

          if (changedFields.length === 0) {
            changedFieldsMsg = "No changes have been made, so nothing to save.";
            hasChanges = false;
            return q;
          }

          hasChanges = true;
          // limit the length of change list shown
          if (changedFields.length > 4) {
            changedFieldsMsg = "Changes saved: " + changedFields.slice(0, 4).join(", ") + ` and ${changedFields.length - 4} more.`;
          } else {
            changedFieldsMsg = "Changes saved: " + changedFields.join(", ");
          }

          const currentWF = q.workflow || {};
          if (docType === "pi") {
            currentWF["pi"] = { date: todayISO(), label: "Proforma Invoice generated & modified", fileName: `PI-${invoiceNo}.pdf`, fileSize: 452000 };
          } else if (docType === "ci") {
            currentWF["milling"] = { date: todayISO(), label: "Commercial Invoice created & edited", fileName: `CI-${invoiceNo}.pdf`, fileSize: 489000 };
          }
          return {
              
            ...q,
            exporterDetails: exporter,
            companyContact,
            documentRemarks,
            signatureImageUrl,
            consigneeDetails: consignee,
            notifyParty,
            preCarriageBy: preCarriage,
            placeOfReceipt,
            countryOfOrigin: countryOrigin,
            countryOfDestination: countryDest,
            vesselFlightNo: vesselFlight,
            portOfLoading: portLoading,
            portOfDischarge: portDischarge,
            finalDestination: finalDest,
            invoiceNo,
            invoiceDate,
            contractNo,
            contractDate,
            iecNo,
            gstin,
            shipmentPeriod,
            incoterms,
            paymentTerms,
            bankDetails,
            usdToWordsStyle,
            amountInWordsManual: manualWords,
            declarationText: declaration,
            authorizedSignatory: signatory,
            items: items,
            bagsDetailsList,
            ref: contractNo.toUpperCase(),
            company: exporter.split("\n")[0],
            buyer: consignee.split("\n")[0],
            buyerLoc: finalDest,
            terms: paymentTerms,
            cond: incoterms,
            workflow: currentWF,
          };
        }
        return q;
      });

      if (!hasChanges) {
        if (showToast) showToast(changedFieldsMsg, "warn");
        else alert(changedFieldsMsg);
        return;
      }

      localStorage.setItem("rems_saved_quotes_v2", JSON.stringify(updatedList));
      localStorage.removeItem(`rems_draft_${quote.id}`);
      
      setSaveStatus("SUCCESSFUL_SAVED");
      setTimeout(() => setSaveStatus(""), 4000);
      
      if (showToast) showToast(changedFieldsMsg, "success");
      else alert(changedFieldsMsg);

      // Log the document generation event persistently in Firestore
      if (activeTenantId && userId) {
        logDocumentGeneration(
          activeTenantId,
          userId,
          docType,
          `Invoice: ${invoiceNo || "Draft"} | Contract: ${contractNo || "Draft"}`
        ).then(() => {
          getTenantGenerationLogs(activeTenantId).then((logs) => setGenLogs(logs));
        }).catch(err => console.error("Error logging document generation:", err));
      }

      if (onSaveCallback) onSaveCallback(updatedList);
    } catch (err) {
      console.error(err);
    }
  };

  const getFormattedHeaderFilename = () => {
    let bName = (consignee.split("\n")[0] || quote?.buyer || "BUYER").trim().replace(/[^a-zA-Z0-9]/g, "_");
    let expName = (licenceMetadata?.companyName || exporter.split("\n")[0] || "EXPORTER").trim().replace(/[^a-zA-Z0-9]/g, "_");
    const docTypeStr = printCombined ? "CI_AND_PL" : docType.toUpperCase();
    const refNo = (invoiceNo || "DRAFT").trim().replace(/[^a-zA-Z0-9]/g, "_");
    return `${expName}_${bName}_${docTypeStr}_${refNo}`;
  };

  const handleSaveDefaultLayout = () => {
    localStorage.setItem("rems_doc_margins", JSON.stringify(pageMargins));
    localStorage.setItem("rems_doc_items_per_page", itemsPerPage.toString());
    localStorage.setItem("rems_doc_footer_reserve", footerReserveSize.toString());
    localStorage.setItem("rems_doc_font_family", docFontFamily);
    localStorage.setItem("rems_doc_base_font_size", docBaseFontSize.toString());
    localStorage.setItem("rems_doc_visible_columns_v2", JSON.stringify(allVisibleColumns));
    localStorage.setItem("rems_doc_visible_sections_v2", JSON.stringify(allVisibleSections));
    
    if (showToast) {
       showToast("Current print styles set as default for all documents.", "success");
    } else {
       alert("Saved settings as default layout!");
    }
  };

  const handlePrint = () => {
    try {
      if (window.parent !== window || !window.matchMedia) {
        alert('The preview window blocked printing/preview mode. Please click the "Open application in new tab" icon (↗️) at the top right of this preview to use this feature.');
        return;
      }
      const originalTitle = document.title;
      document.title = "\u200b";
      setTimeout(() => {
        window.print();
        document.title = originalTitle;
      }, 50);
    } catch (e) {
      alert('The preview window blocked printing/preview mode. Please click the "Open application in new tab" icon (↗️) at the top right of this preview to use this feature.');
    }
  };

  const handlePrintCombined = () => {
    try {
      if (window.parent !== window || !window.matchMedia) {
        alert('The preview window blocked printing/preview mode. Please click the "Open application in new tab" icon (↗️) at the top right of this preview to use this feature.');
        return;
      }
      const originalTitle = document.title;
      document.title = "\u200b";
      setPrintCombined(true);
      setTimeout(() => {
        window.print();
        document.title = originalTitle;
        setPrintCombined(false);
      }, 150);
    } catch (e) {
      alert('The preview window blocked printing/preview mode. Please click the "Open application in new tab" icon (↗️) at the top right of this preview to use this feature.');
      setPrintCombined(false);
    }
  };

  const getComplianceWarnings = () => {
    const warnings: string[] = [];
    const dest = countryDest.toLowerCase();
    
    // Middle East
    if (["qatar", "saudi", "uae", "oman", "kuwait", "bahrain", "emirate"].some(c => dest.includes(c))) {
      if (!documentRemarks.toLowerCase().includes("origin") && !documentRemarks.toLowerCase().includes("legal")) {
        warnings.push("Local certification headers (e.g. Certificate of Origin, Legalization) are typically required in Document Remarks for the Middle East.");
      }
    }
    
    // Latin America
    if (["brazil", "argentina", "chile", "mexico", "colombia", "peru"].some(c => dest.includes(c))) {
      if (!consignee.toLowerCase().includes("cnpj") && !consignee.toLowerCase().includes("rut") && !consignee.toLowerCase().includes("tax")) {
        warnings.push("Consignee Tax IDs (like CNPJ or RUT) are legally required on invoices for Latin American customs.");
      }
    }
    
    // EU region
    if (["germany", "france", "italy", "spain", "netherlands", "poland", "europe"].some(c => dest.includes(c))) {
      if (!exporter.toLowerCase().includes("eori") && !consignee.toLowerCase().includes("eori") && !consignee.toLowerCase().includes("vat")) {
         warnings.push("An EORI or VAT number is generally required in company details for EU destinations.");
      }
    }
    
    if (!iecNo && !gstin) {
      warnings.push("Exporter Origin Tax IDs (GSTIN / IEC) are missing.");
    }
    
    return warnings;
  };

  const complianceWarnings = getComplianceWarnings();

  return (
    <div className="flex flex-col min-h-screen print:min-h-0 print:h-auto bg-slate-900 text-slate-100 font-sans print:block" id="a4-document-root">
      
      {/* ACTION NAVBAR */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex flex-wrap gap-4 items-center justify-between no-print sticky top-0 z-40 select-none">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-slate-300 rounded-lg transition">
            <Undo2 className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-extrabold text-white">Document Workspace: {docType.toUpperCase()} Editor</h2>
          </div>
        </div>
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button onClick={() => setDocType("pi")} className={`px-3 py-1.5 rounded-lg text-xs font-black ${docType === "pi" ? "bg-blue-600 text-white" : "text-slate-400"}`}>📋 Proforma</button>
          <button onClick={() => setDocType("ci")} className={`px-3 py-1.5 rounded-lg text-xs font-black ${docType === "ci" ? "bg-violet-600 text-white" : "text-slate-400"}`}>💳 Commercial</button>
          <button onClick={() => setDocType("pl")} className={`px-3 py-1.5 rounded-lg text-xs font-black ${docType === "pl" ? "bg-emerald-600 text-white" : "text-slate-400"}`}>📦 Packing List</button>
        </div>
        <div className="flex gap-2 items-center">
          {autoSaveSuccess && (
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-900/50 transition-opacity duration-300">
              <CheckCircle2 className="w-3.5 h-3.5" /> Draft Saved
            </span>
          )}
          <div className="flex bg-slate-900 border border-slate-700/50 rounded-xl items-center text-slate-300 overflow-hidden mr-2">
            <button onClick={() => setWorkspaceZoom(z => Math.max(0.4, parseFloat((z - 0.1).toFixed(1))))} className="px-3 py-2 hover:bg-slate-800 hover:text-white border-r border-slate-800 cursor-pointer font-black" title="Zoom Out">-</button>
            <span className="text-[10px] w-12 text-center font-mono font-bold">{Math.round(workspaceZoom * 100)}%</span>
            <button onClick={() => setWorkspaceZoom(z => Math.min(2, parseFloat((z + 0.1).toFixed(1))))} className="px-3 py-2 hover:bg-slate-800 hover:text-white border-l border-slate-800 cursor-pointer font-black" title="Zoom In">+</button>
          </div>
          <button onClick={handlePrint} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl">Print Document</button>
          <button 
            onClick={handleSaveWorkspaceData} 
            disabled={saveStatus === "SUCCESSFUL_SAVED"}
            className={`px-4 py-2 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 ${saveStatus === "SUCCESSFUL_SAVED" ? "bg-teal-600 cursor-default" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {saveStatus === "SUCCESSFUL_SAVED" ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved Successfully</>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col xl:flex-row min-h-0 print:block print:h-auto">
        
        {/* EDIT SIDEBAR */}
        <aside className="w-full xl:w-[420px] bg-slate-950 border-r border-slate-800 p-4 overflow-y-auto no-print space-y-5 text-xs select-none shrink-0">
          
          {complianceWarnings.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-900/50 rounded-xl p-3 space-y-2 shadow-inner">
              <div className="flex items-center gap-2 text-amber-500 font-bold mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Destination Compliance Warnings ({countryDest.toUpperCase()})</span>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {complianceWarnings.map((w, idx) => (
                  <li key={idx} className="text-amber-400/90 leading-tight">{w}</li>
                ))}
              </ul>
            </div>
          )}

          <SectionWrapper id="layout" title="Print & Layout Settings" enlargedSection={enlargedSection} setEnlargedSection={setEnlargedSection} icon={Printer}>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-2">Table Columns</span>
                <div className="grid grid-cols-2 gap-y-2 pb-2">
                  {Object.keys(visibleColumns).map((colKey) => (
                    <label key={colKey} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns[colKey as keyof typeof visibleColumns]}
                        onChange={() => setAllVisibleColumns((prev) => ({
                          ...prev,
                          [docType]: {
                            ...prev[docType],
                            [colKey]: !prev[docType][colKey as keyof typeof visibleColumns]
                          }
                        }))}
                        className="rounded border-slate-700 bg-slate-950 text-sky-500"
                      />
                      <span className="text-[10px] text-slate-300 font-medium capitalize truncate">
                        {colKey === 'marking' ? 'No. of FCL' : colKey.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="border-t border-slate-800 pt-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-2">Visible Sections</span>
                <div className="grid grid-cols-2 gap-y-2 pb-2">
                  {Object.keys(visibleSections).filter(k => typeof visibleSections[k as keyof typeof visibleSections] === 'boolean').map((secKey) => (
                    <label key={secKey} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleSections[secKey as keyof typeof visibleSections] as boolean}
                        onChange={() => setAllVisibleSections((prev) => ({
                          ...prev,
                          [docType]: {
                            ...prev[docType],
                            [secKey]: !prev[docType][secKey as keyof typeof visibleSections]
                          }
                        }))}
                        className="rounded border-slate-700 bg-slate-950 text-emerald-500"
                      />
                      <span className="text-[10px] text-slate-300 font-medium capitalize truncate" title={secKey}>
                        {secKey === "containerLocks" ? "Container Specs (PL)" : secKey === "containerLocksPiCi" ? "Container Specs (PI/CI)" : secKey.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-emerald-400 font-bold block mb-1 uppercase tracking-wider">Top Margin</label>
                  <input type="text" value={pageMargins.top} onChange={(e) => setPageMargins(p => ({ ...p, top: e.target.value }))} className="w-full bg-slate-900 border border-emerald-500 rounded p-1.5 font-bold text-white outline-none"/>
                </div>
                <div>
                  <label className="text-[10px] text-emerald-400 font-bold block mb-1 uppercase tracking-wider">Bottom Margin</label>
                  <input type="text" value={pageMargins.bottom} onChange={(e) => setPageMargins(p => ({ ...p, bottom: e.target.value }))} className="w-full bg-slate-900 border border-emerald-500 rounded p-1.5 font-bold text-white outline-none"/>
                </div>
                <div>
                  <label className="text-[10px] text-emerald-400 font-bold block mb-1 uppercase tracking-wider">Left/Right Margins</label>
                  <input type="text" value={pageMargins.leftRight} onChange={(e) => setPageMargins(p => ({ ...p, leftRight: e.target.value }))} className="w-full bg-slate-900 border border-emerald-500 rounded p-1.5 font-bold text-white outline-none"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-amber-950/20 border-l-2 border-amber-500 p-2">
                  <label className="text-[10px] text-amber-500 font-bold block mb-1 uppercase tracking-wider">Document Font Family</label>
                  <select value={docFontFamily} onChange={(e) => setDocFontFamily(e.target.value)} className="w-full bg-slate-900 border border-amber-500 rounded p-1.5 font-bold text-white outline-none">
                    <option value="font-sans">Modern Default (Sans-Serif)</option>
                    <option value="font-serif">Classic Default (Serif)</option>
                    <option value="font-mono">Technical Default (Monospace)</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Garamond">Garamond</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Tahoma">Tahoma</option>
                    <option value="Trebuchet MS">Trebuchet MS</option>
                    <option value="Courier New">Courier New</option>
                  </select>
                </div>
                <div className="bg-amber-950/20 border-l-2 border-amber-500 p-2">
                  <label className="text-[10px] text-amber-500 font-bold block mb-1 uppercase tracking-wider">Doc Text Size (10 to 12mm)</label>
                  <input type="text" inputMode="decimal" value={docBaseFontSize} onChange={(e) => setDocBaseFontSize(e.target.value)} className="w-full bg-slate-900 border border-amber-500 rounded p-1.5 font-bold text-white outline-none"/>
                </div>
              </div>
              <div className="bg-amber-950/20 border-l-2 border-amber-500 p-2 mt-2">
                <label className="text-[10px] text-amber-500 font-bold block mb-1 uppercase tracking-wider">Items Per Page (Auto Page Break Trigger)</label>
                <input type="text" inputMode="numeric" value={itemsPerPage} onChange={(e) => setItemsPerPage(e.target.value)} className="w-full bg-slate-900 border border-amber-500 rounded p-1.5 font-bold text-white outline-none"/>
                <p className="text-[9px] text-amber-200 mt-1.5 italic font-medium"><b>CRITICAL:</b> If you increase the top or bottom margins, you MUST manually decrease this number so that the items automatically jump to the next page instead of overflowing into the footer!</p>
              </div>
              <div>
                <label className="text-[10px] text-emerald-400 font-bold block mb-1 uppercase tracking-wider">Footer Rows Reserve Size</label>
                <input type="text" inputMode="numeric" value={footerReserveSize} onChange={(e) => setFooterReserveSize(e.target.value)} className="w-full bg-slate-900 border border-emerald-500 rounded p-1.5 font-bold text-white outline-none"/>
                <p className="text-[9px] text-slate-400 mt-1 italic">Sets how many rows worth of space to reserve on the last page for totals, signature, and declarations.</p>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleSaveDefaultLayout}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm"
                >
                  Make default for all docs
                </button>
              </div>
            </div>
          </SectionWrapper>

          <SectionWrapper id="secA" title="1. Company Addresses" enlargedSection={enlargedSection} setEnlargedSection={setEnlargedSection} icon={Building}>
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 block font-bold mb-1">Company Logo</label>
                <div className="flex gap-2">
                  <input type="text" value={companyLogoUrl} onChange={(e) => setCompanyLogoUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-mono text-[10px]" placeholder="https://... or upload ->" />
                  <label className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-3 py-1.5 rounded cursor-pointer border border-slate-600 transition flex items-center shrink-0">
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCompanyLogoUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-slate-400 block font-bold mb-1">Exporter</label>
                <textarea rows={4} value={exporter} onChange={(e) => setExporter(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono" />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-1">Company Contact (Phone / Email)</label>
                <input type="text" value={companyContact} onChange={(e) => setCompanyContact(e.target.value)} className="w-full bg-slate-900 p-1.5 border border-slate-800 rounded text-[10px] text-slate-200 uppercase" placeholder="Tel: ... | Email: ..." />
              </div>
              <div>
                <label className="text-slate-400 block font-bold mb-1">Consignee</label>
                <textarea rows={3} value={consignee} onChange={(e) => setConsignee(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono" />
              </div>
            </div>
          </SectionWrapper>

          <SectionWrapper id="secB" title="2. Invoice Numerical Identifiers" enlargedSection={enlargedSection} setEnlargedSection={setEnlargedSection} icon={Hash}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-slate-500 mb-1 block">Invoice No.</label>
                <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="w-full bg-slate-900 p-1.5 border border-slate-800 rounded text-slate-200" />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 mb-1 block">Invoice Date</label>
                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-full bg-slate-900 p-1.5 border border-slate-800 rounded text-slate-200" />
              </div>
            </div>
          </SectionWrapper>

          <SectionWrapper id="secC" title="3. Logistics & Shipment" enlargedSection={enlargedSection} setEnlargedSection={setEnlargedSection} icon={Ship}>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-slate-500 mb-1 block">Port of Loading</label>
                  <input type="text" value={portLoading} onChange={(e) => setPortLoading(e.target.value)} className="w-full bg-slate-900 p-1.5 border border-slate-800 rounded text-slate-200 uppercase" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 mb-1 block">Port of Discharge</label>
                  <input type="text" value={portDischarge} onChange={(e) => setPortDischarge(e.target.value)} className="w-full bg-slate-900 p-1.5 border border-slate-800 rounded text-slate-200 uppercase" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-slate-500 mb-1 block">Vessel/Flight</label>
                  <input type="text" value={vesselFlight} onChange={(e) => setVesselFlight(e.target.value)} className="w-full bg-slate-900 p-1.5 border border-slate-800 rounded text-slate-200 uppercase" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 mb-1 block">Final Destination</label>
                  <input type="text" value={finalDest} onChange={(e) => setFinalDest(e.target.value)} className="w-full bg-slate-900 p-1.5 border border-slate-800 rounded text-slate-200 uppercase" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-slate-500 mb-1 block">Incoterms</label>
                  <input type="text" value={incoterms} onChange={(e) => setIncoterms(e.target.value)} className="w-full bg-slate-900 p-1.5 border border-slate-800 rounded text-slate-200 uppercase" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 mb-1 block">Payment Terms</label>
                  <input type="text" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="w-full bg-slate-900 p-1.5 border border-slate-800 rounded text-slate-200 uppercase" />
                </div>
              </div>
              <div>
                <label className="text-[9px] text-slate-500 mb-1 block mt-2">Bank Details (Overrides global configuration if set)</label>
                <textarea rows={3} value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} className="w-full bg-slate-900 p-1.5 border border-slate-800 rounded text-slate-200 uppercase font-mono text-xs whitespace-pre-line leading-tight" />
              </div>
            </div>
          </SectionWrapper>

          <SectionWrapper id="secE" title="4. Commodities Grid Manager" enlargedSection={enlargedSection} setEnlargedSection={setEnlargedSection} icon={FileSpreadsheet}>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 p-3 rounded text-slate-200 space-y-2 relative">
                  <div className="flex justify-between items-center bg-slate-950 p-1 rounded mb-2">
                    <span className="text-[9px] font-bold text-slate-400 font-mono">Row {idx + 1}</span>
                    <button onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-300 text-[10px] font-bold">Remove</button>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-1">Description (HTML allowed) - Overrides Default Render</label>
                    <textarea rows={2} value={String((item as any).description || '')} onChange={(e) => handleItemCellChange(item.id, 'description' as any, e.target.value)} placeholder="Leave blank to use auto-generated item rendering" className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[10px]" />
                  </div>
                  {item.commodity === "BLENDED (MIX) RICE" && (
                    <div className="p-2 border border-indigo-900/50 bg-indigo-950/20 rounded space-y-2">
                       <label className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1 block">Live Blended Formulation Override</label>
                       <div className="grid grid-cols-3 gap-2">
                         <div>
                           <label className="text-[8.5px] text-slate-500 block">Type 1 % {(item as any).blendRice1Name}</label>
                           <input type="number" value={(item as any).blendRice1Pct || 0} onChange={(e) => handleItemCellChange(item.id, 'blendRice1Pct' as any, e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-[10px]" />
                         </div>
                         <div>
                           <label className="text-[8.5px] text-slate-500 block">Type 2 % {(item as any).blendRice2Name}</label>
                           <input type="number" value={(item as any).blendRice2Pct || 0} onChange={(e) => handleItemCellChange(item.id, 'blendRice2Pct' as any, e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-[10px]" />
                         </div>
                         {((item as any).blendRice3Name) && (
                           <div>
                             <label className="text-[8.5px] text-slate-500 block">Type 3 % {(item as any).blendRice3Name}</label>
                             <input type="number" value={(item as any).blendRice3Pct || 0} onChange={(e) => handleItemCellChange(item.id, 'blendRice3Pct' as any, e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-[10px]" />
                           </div>
                         )}
                       </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">HS Code</label>
                      <input type="text" value={item.hsCode || item.crop || '1006.3010'} onChange={(e) => handleItemCellChange(item.id, 'hsCode', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[10px]" />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">Prod Code</label>
                      <input type="text" value={item.prodCode || '2905'} onChange={(e) => handleItemCellChange(item.id, 'prodCode', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[10px]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">FCL / Containers</label>
                      <input type="text" value={item.marking || `${item.numFCL || 1} FCL`} onChange={(e) => handleItemCellChange(item.id, 'marking', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[10px]" />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">Total Bags</label>
                      <input type="number" value={item.totalBags || 0} onChange={(e) => handleItemCellChange(item.id, 'totalBags', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[10px]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block mb-1">Net Weight (KG)</label>
                      <input 
                        type="number" 
                        value={item.totalWeightKg} 
                        onFocus={() => handleItemFocus(item.id, 'totalWeightKg', item.totalWeightKg || 0)}
                        onBlur={(e) => handleItemBlur(item.id, 'totalWeightKg', parseFloat(e.target.value) || 0)}
                        onChange={(e) => handleItemCellChange(item.id, 'totalWeightKg', e.target.value)} 
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[10px]" 
                      />
                    </div>
                    {docType !== "pl" && (
                      <div>
                        <label className="text-[9px] text-slate-400 block mb-1">Rate ($/MT)</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          value={item.rate} 
                          onFocus={() => handleItemFocus(item.id, 'rate', item.rate || 0)}
                          onBlur={(e) => handleItemBlur(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          onChange={(e) => handleItemCellChange(item.id, 'rate', e.target.value)} 
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[10px]" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={handleAddBlankItem} className="w-full py-1.5 bg-blue-600/30 text-blue-400 font-bold rounded border border-blue-500/30 hover:bg-blue-600/50 transition">
                + Append Cargo Row
              </button>
            </div>
          </SectionWrapper>
          
          <SectionWrapper id="secF" title="5. Container Specifications" enlargedSection={enlargedSection} setEnlargedSection={setEnlargedSection} icon={FileSpreadsheet}>
              <div className="space-y-3">
                {bagsDetailsList.map((bag, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 p-2 rounded text-slate-200 grid grid-cols-2 gap-2 relative">
                    <button onClick={() => setBagsDetailsList(bagsDetailsList.filter((_, i) => i !== idx))} className="absolute top-1 right-2 text-red-500 font-bold text-[10px]">✕</button>
                    <div>
                      <label className="text-[8px] text-slate-400">Container No.</label>
                      <input value={bag.containerNo} onChange={(e) => handleBagsCellChange(idx, 'containerNo', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-[10px] font-mono uppercase" />
                    </div>
                    <div>
                      <label className="text-[8px] text-slate-400">Seal No.</label>
                      <input value={bag.sealNo} onChange={(e) => handleBagsCellChange(idx, 'sealNo', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-[10px] font-mono uppercase" />
                    </div>
                    <div>
                      <label className="text-[8px] text-slate-400">Lot No.</label>
                      <input value={bag.lotNo} onChange={(e) => handleBagsCellChange(idx, 'lotNo', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-[10px] font-mono uppercase" />
                    </div>
                    <div>
                      <label className="text-[8px] text-slate-400">Net Wt. (KG)</label>
                      <input type="number" value={bag.netWt} onChange={(e) => handleBagsCellChange(idx, 'netWt', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-[10px] uppercase" />
                    </div>
                  </div>
                ))}
                <button onClick={() => setBagsDetailsList([...bagsDetailsList, { containerNo: "NEW CON", sealNo: "S123", lotNo: "L1", packagesCount: 1000, netWt: 26000, grossWt: 26050, tareWt: 50 }])} className="w-full py-1.5 bg-emerald-600/30 text-emerald-400 font-bold rounded border border-emerald-500/30 hover:bg-emerald-600/50 transition">
                  + Add Container Record
                </button>
              </div>
            </SectionWrapper>

          <SectionWrapper id="secG" title="6. Declaration & Footer" enlargedSection={enlargedSection} setEnlargedSection={setEnlargedSection} icon={FileCheck}>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-slate-400 block mb-1">Bottom Remarks / Notes (Optional)</label>
                <textarea rows={2} value={documentRemarks} onChange={(e) => setDocumentRemarks(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-[10px] text-slate-200" placeholder="e.g. Please arrange payment before shipment date" />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-1">Declaration Stamp Text</label>
                <textarea rows={3} value={declaration} onChange={(e) => setDeclaration(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-[10px] text-slate-200 leading-relaxed" />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-1">Authorized Signatory Name</label>
                <input type="text" value={signatory} onChange={(e) => setSignatory(e.target.value)} className="w-full bg-slate-900 p-1.5 border border-slate-800 rounded text-[10px] text-slate-200 uppercase font-bold" />
              </div>
              <div>
                <label className="text-slate-400 block font-bold mb-1 text-[9px]">Signature / Stamp Image Overlay</label>
                <div className="flex gap-2">
                  <input type="text" value={signatureImageUrl} onChange={(e) => setSignatureImageUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-mono text-[10px]" placeholder="https://..." />
                  <label className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-3 py-1.5 rounded cursor-pointer border border-slate-600 transition flex items-center shrink-0">
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (file.size > 2 * 1024 * 1024) { alert("File too large. Max 2MB."); return; }
                        const reader = new FileReader();
                        reader.onloadend = () => { setSignatureImageUrl(reader.result as string); };
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                </div>
              </div>
            </div>
          </SectionWrapper>

          {(allowedModules.includes("ai_doc_generator") || allowedModules.includes("ai_email_drafting") || allowedModules.includes("ai_smart_hscode")) && (
            <SectionWrapper id="secAI" title="AI Trade Assistant" enlargedSection={enlargedSection} setEnlargedSection={setEnlargedSection} icon={Brain}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {allowedModules.includes("ai_doc_generator") && (
                    <button onClick={() => handleAiAction("audit")} disabled={aiLoading} className="py-2.5 px-3 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white rounded-lg flex items-center justify-center gap-2 font-bold text-xs shadow-md border border-fuchsia-400">
                      <Search className="w-3.5 h-3.5" />
                      Run Compliance Check Audit
                    </button>
                  )}
                  {allowedModules.includes("ai_smart_hscode") && (
                    <button onClick={() => handleAiAction("goods_description")} disabled={aiLoading} className="py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg flex items-center justify-center gap-2 font-bold text-xs shadow-md border border-emerald-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      Enhance Cargo Description
                    </button>
                  )}
                  {allowedModules.includes("ai_email_drafting") && (
                    <button onClick={() => handleAiAction("cover_letter")} disabled={aiLoading} className="py-2.5 px-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-lg flex items-center justify-center gap-2 font-bold text-xs shadow-md border border-sky-400">
                      <FileText className="w-3.5 h-3.5" />
                      Draft Cover Letter Email
                    </button>
                  )}
                </div>
                
                {aiLoading && (
                  <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg text-center">
                    <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">Running GEMINI-3.5-FLASH Model...</div>
                  </div>
                )}

                {aiResult && !aiLoading && (
                  <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs font-serif leading-relaxed h-64 overflow-y-auto">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">AI Output Generated</span>
                      <button onClick={handleCopyAiToClipboard} className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider bg-slate-800 px-2 py-1 rounded">
                        {copiedAi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedAi ? "Copied" : "Copy text"}
                      </button>
                    </div>
                    <div className="whitespace-pre-wrap markdown-body" dangerouslySetInnerHTML={{ __html: parseInlineFormatting(aiResult) }} />
                  </div>
                )}
              </div>
            </SectionWrapper>
          )}
        </aside>

        {/* PRINT ENGINE STYLES SHEET */}
        <style>{`
          @media print {
            @page { margin: 0 !important; size: A4 portrait; }
            body, html { background: white !important; padding: 0 !important; }
            .a4-page-container {
               box-shadow: none !important;
               border: none !important;
               background-image: none !important;
               page-break-after: always !important;
               break-after: page !important;
               display: flex !important; flex-direction: column !important;
            }
            .a4-page-container:last-child {
               page-break-after: auto !important;
               break-after: auto !important;
            }
          }
          
          /* DYNAMIC FONT ZOOM & SELECTION SCHEME */
          .a4-page-container, .a4-page-container * {
             ${docFontFamily === 'font-serif' ? 'font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif !important;' : 
               docFontFamily === 'font-mono' ? 'font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;' : 
               docFontFamily === 'font-sans' ? '' : `font-family: "${docFontFamily}", sans-serif !important;`}
          }
          
          ${[7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 12, 13, 14].map(size => {
             const fontScale = parseFloat(docBaseFontSize as string);
             const scaleFactor = (isNaN(fontScale) || fontScale <= 0) ? 1 : fontScale / 10;
             return `
            .a4-page-container .text-\\[${size}px\\] {
               font-size: ${size * scaleFactor}px !important;
            }
          `}).join('')}
        `}</style>

        {/* CHUNK CONTAINER OUTPUT PREVIEW */}
        <section className="flex-1 bg-slate-950 p-4 md:p-8 overflow-y-auto print:overflow-visible print:bg-white print:p-0 flex flex-col items-center print:block relative">
          <div style={{ transform: `scale(${workspaceZoom})`, transformOrigin: 'top center', display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', gap: '2rem' }} className="print:!transform-none print:!gap-0 pb-[20rem]">
          {(() => {
            const warnings: string[] = [];
            items.forEach(item => {
              if (item.commodity && item.commodity.toLowerCase().includes("rice")) {
                let parsedFCL = item.numFCL || 0;
                if (item.marking) {
                  const match = item.marking.match(/(\d+)\s*(?:FCL|CONTAINERS?)/i);
                  if (match && match[1]) {
                    parsedFCL = parseInt(match[1], 10);
                  } else if (/^\d+$/.test(item.marking.trim())) {
                    parsedFCL = parseInt(item.marking.trim(), 10);
                  }
                }
                if (parsedFCL > 0) {
                  const expectedWeight = parsedFCL * 26000;
                  const allowDiff = parsedFCL * 500;
                  const diff = Math.abs((item.totalWeightKg || 0) - expectedWeight);
                  if (diff > allowDiff) {
                    warnings.push(`Row [${item.id}]: ${parsedFCL} FCL of rice should be ~${expectedWeight}kg (±${allowDiff}kg allowance). Currently ${item.totalWeightKg}kg!`);
                  }
                }
              }
            });
            if (warnings.length > 0) {
              return (
                <div className="w-full max-w-[210mm] bg-amber-500/10 border border-amber-500/50 rounded-lg p-3 text-amber-200 text-xs font-bold font-mono no-print space-y-1 mb-[-1rem]">
                  <div className="flex items-center gap-2 mb-1 text-amber-400 uppercase tracking-wider text-[10px]">
                    <span>⚠️</span> Cargo Payload Validation Warning
                  </div>
                  {warnings.map((w, i) => (
                    <div key={i}>• {w}</div>
                  ))}
                  <div className="text-[9.5px] text-amber-500/70 pt-1 font-sans font-medium italic">This warning is only visible in the editor and will not appear on the printed document.</div>
                </div>
              );
            }
            return null;
          })()}

          {(() => {
            let safeCapacity = parseInt(itemsPerPage as string, 10);
            if (isNaN(safeCapacity) || safeCapacity < 1) safeCapacity = 7;
            
            let safeFooterReserve = parseInt(footerReserveSize as string, 10);
            if (isNaN(safeFooterReserve) || safeFooterReserve < 0) safeFooterReserve = 4;

            interface DocPage {
              items: any[];
              isLastItemsPage: boolean;
              bags: any[];
              showFooter: boolean;
              chunkItemOffset: number;
              bagOffset: number;
            }

            const activeBags = (((docType === 'pl' && visibleSections.containerLocks) || (docType !== 'pl' && visibleSections.containerLocksPiCi)) && bagsDetailsList) ? bagsDetailsList : [];

            const pages: DocPage[] = [];
            let itemsIdx = 0;
            let bagsIdx = 0;
            
            // Handle edge case of completely empty doc
            if (items.length === 0 && activeBags.length === 0) {
              pages.push({
                items: [],
                isLastItemsPage: true,
                bags: [],
                showFooter: true,
                chunkItemOffset: 0,
                bagOffset: 0
              });
            } else {
              while (itemsIdx < items.length || bagsIdx < activeBags.length) {
                let remainingSpace = safeCapacity;
                const page: DocPage = {
                  items: [],
                  isLastItemsPage: false,
                  bags: [],
                  showFooter: false,
                  chunkItemOffset: itemsIdx,
                  bagOffset: bagsIdx
                };

                // 1. Fill items
                while (itemsIdx < items.length && remainingSpace >= 1) {
                  page.items.push(items[itemsIdx]);
                  itemsIdx++;
                  remainingSpace -= 1;
                }

                if (itemsIdx >= items.length && !pages.some(p => p.isLastItemsPage)) {
                  page.isLastItemsPage = true;
                  remainingSpace -= 0.5; // Reserve for Total Summary
                }

                // 2. Fill bags (only if items are done)
                if (itemsIdx >= items.length) {
                  const bagCost = 0.33; // 3 bags = 1 item row tall
                  while (bagsIdx < activeBags.length && remainingSpace >= bagCost) {
                    page.bags.push(activeBags[bagsIdx]);
                    bagsIdx++;
                    remainingSpace -= bagCost;
                  }
                  
                  // 3. Try Footer (Bank/Declarations take up reserved space)
                  if (bagsIdx >= activeBags.length && !pages.some(p => p.showFooter)) {
                    if (remainingSpace >= safeFooterReserve || (page.items.length === 0 && page.bags.length === 0)) {
                      page.showFooter = true;
                    }
                  }
                }

                pages.push(page);
                
                if (page.showFooter) break;
                if (pages.length > 50) break; // safety limit
              }
            }

            return pages.map((page, pageIdx) => {
              const { items: chunkItems, isLastItemsPage, bags: chunkBags, showFooter, chunkItemOffset } = page;
              const isLastPage = pageIdx === pages.length - 1;
              const isLastChunk = isLastPage; // keeping original naming for lower scope
              
              let tempTotalCols = 0;
              if (visibleColumns.srNo) tempTotalCols++;
              if (visibleColumns.marking) tempTotalCols++;
              if (visibleColumns.noOfPkgs) tempTotalCols++;
              if (visibleColumns.description) tempTotalCols++;
              if (visibleColumns.prodCode) tempTotalCols++;
              if (visibleColumns.hsCode) tempTotalCols++;
              if (visibleColumns.qtyTotal) tempTotalCols++;
              if (visibleColumns.netWeight) tempTotalCols++;
              if (docType !== "pl") {
                if (visibleColumns.rate) tempTotalCols++;
                if (visibleColumns.total) tempTotalCols++;
              }
              const totalCols = tempTotalCols === 0 ? 1 : tempTotalCols;

              const renderTitleBlock = () => (
                <table className="w-full bg-gray-50/70 font-sans tracking-widest font-black text-sm uppercase border-collapse">
                  <tbody>
                    <tr>
                      <td className="w-1/3 p-3 text-left">
                        {companyLogoUrl ? (
                          <img src={companyLogoUrl} alt="Company Logo" className="h-[52px] object-contain" />
                        ) : (
                          <span className="font-sans font-black text-[10px] uppercase text-slate-800">
                            {licenceMetadata?.logoText || exporter.split("\n")[0] || "SA EXPORTS"}
                          </span>
                        )}
                      </td>
                      <td className="w-1/3 p-3 text-center">
                        <span className="text-gray-900 text-[13px] font-black underline">
                          {docType === "pi" ? "PROFORMA INVOICE" : docType === "ci" ? "COMMERCIAL INVOICE" : "PACKING LIST"}
                        </span>
                      </td>
                      <td className="w-1/3 p-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <QRCodeSVG value={`${window.location.origin}/verify/${quote?.ref || quoteId}`} size={54} level="M" />
                          <span className="text-[7.5px] text-gray-400 font-mono font-bold uppercase tracking-widest mt-1">VERIFY DOC</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              );

              const renderDetailsBlock = () => (
                <div className="border-t-2 border-b-2 border-gray-950 flex flex-col divide-y divide-gray-950">
                  <table className="w-full text-[10.5px] font-sans border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-1/2 align-top border-r border-gray-950 p-3">
                          <div className="text-[8.5px] font-black text-gray-400 uppercase">EXPORTER:</div>
                          <div className="font-bold text-gray-900 uppercase whitespace-pre-line tracking-wide leading-relaxed">{exporter}</div>
                          {companyContact && (
                            <div className="mt-2 text-[8.5px] font-bold text-gray-600 uppercase border-t border-gray-200 pt-1">
                              {companyContact}
                            </div>
                          )}
                        </td>
                        <td className="w-1/2 align-top p-0">
                          <table className="w-full text-[10px] h-full">
                            <tbody>
                              <tr>
                                <td className="py-1 px-2.5 font-semibold text-gray-500">INVOICE NO: <span className="text-gray-950 font-mono font-bold">{invoiceNo}</span></td>
                                <td className="py-1 px-2.5 text-right text-gray-500">DATE: <span className="text-gray-950 font-mono font-bold">{fmtDate(invoiceDate)}</span></td>
                              </tr>
                              <tr className="border-t border-gray-950">
                                <td className="py-1 px-2.5 font-semibold text-gray-500">PI REF: <span className="text-gray-950 font-bold">{quote?.ref}</span></td>
                                <td className="py-1 px-2.5 text-right text-gray-500">GSTIN: <span className="text-gray-950 font-bold">{gstin}</span></td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <table className="w-full text-[10px] font-sans border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-1/2 align-top border-r border-gray-950 p-3">
                          <div className="text-[8.5px] font-black text-gray-400 uppercase">CONSIGNEE:</div>
                          <div className="font-extrabold text-gray-950 uppercase whitespace-pre-line leading-relaxed text-[11px] mt-1">{consignee}</div>
                        </td>
                        <td className="w-1/2 align-top p-3">
                          <div className="text-[8.5px] font-black text-gray-400 uppercase">NOTIFY PARTY:</div>
                          <div className="font-bold text-gray-800 uppercase leading-normal">{notifyParty}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {visibleSections.logistics && (
                    <table className="w-full text-[10px] font-sans border-collapse text-center uppercase tracking-wide table-fixed">
                      <tbody>
                        <tr className="divide-x divide-gray-950">
                          <td className="p-1.5"><span className="text-gray-400 text-[7.5px] block font-semibold">PRE-CARRIAGE:</span><span className="font-bold text-gray-900">{preCarriage}</span></td>
                          <td className="p-1.5"><span className="text-gray-400 text-[7.5px] block font-semibold">RECEIPT PLACE:</span><span className="font-bold text-gray-900">{placeOfReceipt}</span></td>
                          <td className="p-1.5"><span className="text-gray-400 text-[7.5px] block font-semibold">ORIGIN:</span><span className="font-bold text-gray-900">{countryOrigin}</span></td>
                          <td className="p-1.5"><span className="text-gray-400 text-[7.5px] block font-semibold">DESTINATION:</span><span className="font-bold text-gray-900">{countryDest}</span></td>
                        </tr>
                        <tr className="divide-x divide-gray-950 border-t border-gray-950">
                          <td className="p-1.5"><span className="text-gray-400 text-[7.5px] block font-semibold">VESSEL FLIGHT:</span><span className="font-bold text-gray-900">{vesselFlight}</span></td>
                          <td className="p-1.5"><span className="text-gray-400 text-[7.5px] block font-semibold">LOADING PORT:</span><span className="font-bold text-gray-900">{portLoading}</span></td>
                          <td className="p-1.5"><span className="text-gray-400 text-[7.5px] block font-semibold">DISCHARGE PORT:</span><span className="font-bold text-gray-900">{portDischarge}</span></td>
                          <td className="p-1.5"><span className="text-gray-400 text-[7.5px] block font-semibold">FINAL PLACE:</span><span className="font-bold text-gray-900">{finalDest}</span></td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {(docType === "ci" || docType === "pi") && visibleSections.incoterms && (
                    <table className="w-full text-[10px] font-sans bg-gray-50/50 uppercase tracking-wider text-center py-1 font-semibold border-collapse table-fixed">
                      <tbody>
                        <tr>
                          <td className="border-r border-gray-950"><span className="text-[7.5px] text-gray-400 block font-semibold">SHIPMENT PERIOD:</span><span className="text-gray-900 font-bold">{shipmentPeriod}</span></td>
                          <td className="border-r border-gray-950"><span className="text-[7.5px] text-gray-400 block font-semibold">INCOTERMS RULE:</span><span className="text-blue-900 font-extrabold">{incoterms}</span></td>
                          <td><span className="text-[7.5px] text-gray-400 block font-semibold">PAYMENT CONTRACT TERMS:</span><span className="text-indigo-900 font-black">{paymentTerms}</span></td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              );

              const renderLineItemRow = (item: PIItem, displayIndex: number, keyPrefix = "line") => {
                const isOilItem = item.industry === "oil" || (item.industry === "agri_multi" && /\bOIL\b/.test(item.commodity.toUpperCase()));
                const bottleSizeNum = parseFloat(item.size.replace(/[^\d.]/g, '')) || 1;
                const ratePerKl = item.ratePerKl || (isOilItem ? (item.oilPricingMode === "PIECE" ? item.rate * (1000 / bottleSizeNum) : item.rate) : item.rate);
                const rowTotalUSD = isOilItem
                  ? ((item.totalWeightKg || 0) / 1000) * ratePerKl
                  : ((item.totalWeightKg || 0) / 1000) * item.rate;
                const perBottlePrice = item.oilPricingMode === "PIECE" ? item.rate : (item.ratePerKl || item.rate) / (1000 / bottleSizeNum);
                
                // Determine Packages display
                let pkgsDisplay = `${(item.totalBags || 0).toLocaleString()} BAG`;
                if (isOilItem) {
                  if (item.oilUseBox === "YES" && item.totalBoxesPerFcl) {
                    pkgsDisplay = `${(item.totalBoxesPerFcl * (item.numFCL || 1)).toLocaleString()} BOXES`;
                  } else if (item.totalBottlesPerFcl) {
                    pkgsDisplay = `${(item.totalBottlesPerFcl * (item.numFCL || 1)).toLocaleString()} BOTTLES`;
                  }
                }

                return (
                  <tr key={`${keyPrefix}-${item.id}`} className="align-top divide-x divide-gray-950 relative text-[10px] font-semibold">
                    {visibleColumns.srNo && <td className="p-2 text-center font-mono font-bold text-gray-600">{displayIndex + 1}</td>}
                    {visibleColumns.marking && <td className="p-2 text-gray-500 font-mono text-[9px] uppercase whitespace-pre-wrap">{item.marking || `${item.numFCL || 1} FCL`}</td>}
                    {visibleColumns.noOfPkgs && <td className="p-2 font-mono text-gray-800">{pkgsDisplay}</td>}
                    {visibleColumns.description && (
                      <td className="p-2 font-sans">
                        {(item as any).description && (item as any).description.trim() ? (
                          <div dangerouslySetInnerHTML={{ __html: (item as any).description.trim() }} className="whitespace-pre-wrap [&>div]:font-extrabold [&>div]:text-gray-950 [&>div]:uppercase" />
                        ) : (
                          <>
                            <div className="font-extrabold text-gray-950 uppercase">{item.commodity}</div>
                            {item.commodity === "BLENDED (MIX) RICE" && (
                              <div className="text-[9.5px] text-gray-800 font-bold mt-1 mb-0.5 uppercase tracking-wider bg-gray-100/80 p-1.5 rounded inline-block border border-gray-200">
                                <span className="text-gray-500 font-extrabold pr-1">MIX FORMULATION</span>
                                <span className="text-indigo-800 font-black px-1">{parseFloat(String((item as any).blendRice1Pct || 0))}%</span> {(item as any).blendRice1Name} 
                                <span className="text-gray-400 font-black px-1.5">+</span>
                                <span className="text-teal-700 font-black px-1">{parseFloat(String((item as any).blendRice2Pct || 0))}%</span> {(item as any).blendRice2Name}
                                {parseFloat(String((item as any).blendRice3Pct || 0)) > 0 && (
                                  <>
                                    <span className="text-gray-400 font-black px-1.5">+</span>
                                    <span className="text-rose-700 font-black px-1">{parseFloat(String((item as any).blendRice3Pct || 0))}%</span> {(item as any).blendRice3Name}
                                  </>
                                )}
                              </div>
                            )}
                            <div className="text-[9px] text-gray-400 font-semibold mt-0.5">BRAND: {item.brand} • SIZE: {item.size} • PACKED: {item.packed}</div>
                            
                            {/* Oil Details */}
                            {isOilItem && (
                              <div className="text-[8.5px] text-slate-700 font-bold mt-1 space-y-0.5 border-t border-dashed border-gray-200 pt-1">
                                <div>• PACKING MODE: {item.oilPricingMode === "PIECE" ? "PIECE (BOTTLE/CAN)" : "BULK"}</div>
                                <div>• BOTTLES PER FCL: {item.totalBottlesPerFcl ? item.totalBottlesPerFcl.toLocaleString() : "N/A"} BOTTLES</div>
                                {item.oilUseBox === "YES" && (
                                  <div>• PIECES PER BOX: {item.oilPiecesPerBox} • BOXES PER FCL: {item.totalBoxesPerFcl ? item.totalBoxesPerFcl.toLocaleString() : "N/A"} BOXES</div>
                                )}
                              </div>
                            )}

                            {/* Pallet Details (for Oil, Grain or Tiles) */}
                            {item.palletEnabled && (
                              <div className="text-[8.5px] text-slate-700 font-bold mt-1 space-y-0.5 border-t border-dashed border-gray-200 pt-1">
                                <div className="text-emerald-700 uppercase tracking-wide">📦 PALLETIZATION DETAILS</div>
                                <div>• PALLETS PER FCL: {item.palletsPerFcl || 20} PALLETS</div>
                                {item.boxesPerPallet && (
                                  <div>• PACKAGES PER PALLET: {item.boxesPerPallet} PKGS</div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    )}
                    {visibleColumns.prodCode && <td className="p-2 text-center text-gray-500 font-mono">{item.prodCode || "2905"}</td>}
                    {visibleColumns.hsCode && <td className="p-2 text-center text-gray-800 font-bold font-mono">{item.hsCode || item.crop || "1006.3010"}</td>}
                    {visibleColumns.qtyTotal && (
                      <td className="p-2 text-right font-bold text-gray-950">
                        {isOilItem ? (
                          <>
                            {((item.totalWeightKg || 0) / 1000).toLocaleString()} KL
                            {item.oilPricingMode === "PIECE" && item.totalBottlesPerFcl && (
                              <div className="text-[7.5px] text-gray-400 font-semibold uppercase">
                                {((item.totalBottlesPerFcl || 0) * (item.numFCL || 1)).toLocaleString()} BTL
                              </div>
                            )}
                          </>
                        ) : (
                          `${((item.totalWeightKg || 0) / 1000).toLocaleString()} TON`
                        )}
                      </td>
                    )}
                    {visibleColumns.netWeight && <td className="p-2 text-right font-mono text-gray-800">{(item.totalWeightKg || 0).toLocaleString()} KG</td>}
                    {docType !== "pl" && (
                      <>
                        {visibleColumns.rate && (
                          <td className="p-2 text-right font-mono text-indigo-900 font-bold">
                            {isOilItem ? (
                              <>
                                $ {ratePerKl.toFixed(2)}
                                <span className="text-[7.5px] text-gray-400 font-bold pl-0.5 uppercase">
                                  /KL
                                </span>
                                <div className="text-[7.5px] text-indigo-600 font-bold mt-0.5 whitespace-nowrap">
                                  (${perBottlePrice.toFixed(2)} / bottle)
                                </div>
                              </>
                            ) : (
                              <>
                                $ {(item.rate || 0).toFixed(2)}
                                <span className="text-[7.5px] text-gray-400 font-bold pl-0.5 uppercase">
                                  /MT
                                </span>
                              </>
                            )}
                            {isOilItem && (
                              <div className="text-[7.5px] text-indigo-600 font-black mt-1 uppercase whitespace-nowrap">
                                FCL: ${(rowTotalUSD / (item.numFCL || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
                          </td>
                        )}
                        {visibleColumns.total && <td className="p-2 text-right font-mono font-black text-blue-900">$ {(rowTotalUSD || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                      </>
                    )}
                  </tr>
                );
              };

              return (
                <div key={pageIdx} className="a4-page-container bg-white text-gray-950 border border-gray-300 relative mx-auto flex flex-col shadow-sm" style={{ width: "210mm", height: "296.5mm", minHeight: "296.5mm", overflow: "hidden", padding: `${pageMargins.top} ${pageMargins.leftRight} ${pageMargins.bottom} ${pageMargins.leftRight}`, boxSizing: "border-box", breakInside: "auto" }}>
                  
                  {/* FULL BLOCK STAMPED ON TOP OF EVERY CHUNK CONTAINER */}
                  <div className="hidden print:block text-left text-[8.5px] font-sans font-bold text-gray-400 pb-2 px-2 shrink-0">{getFormattedHeaderFilename()}</div>
                  <div className="border-2 border-gray-950 flex flex-col">
                    <div className="shrink-0">{renderTitleBlock()}</div>
                    <div className="shrink-0">{renderDetailsBlock()}</div>

                    <div className="flex flex-col print:break-inside-auto">
                      <table className="document-print-table w-full table-auto border-collapse mt-0 bg-white">
                        <thead className="w-full shrink-0 h-auto break-inside-avoid">
                          <tr className="bg-gray-50 font-black text-[9px] text-gray-950 uppercase select-none divide-x divide-gray-950 border-b-2 border-gray-950">
                          {visibleColumns.srNo && <th className="p-2 text-center">SR. NO.</th>}
                          {visibleColumns.marking && <th className="p-2 text-left">NO. OF FCL</th>}
                          {visibleColumns.noOfPkgs && <th className="p-2 text-left">NO. OF PKGS</th>}
                          {visibleColumns.description && <th className="p-2 text-left">DESCRIPTION OF GOODS</th>}
                          {visibleColumns.prodCode && <th className="p-2 text-center">PROD CODE</th>}
                          {visibleColumns.hsCode && <th className="p-2 text-center">H.S. CODE</th>}
                          {visibleColumns.qtyTotal && <th className="p-2 text-right">QTY TOTAL</th>}
                          {visibleColumns.netWeight && <th className="p-2 text-right">NET WEIGHT</th>}
                          {docType !== "pl" && (
                            <>
                              {visibleColumns.rate && <th className="p-2 text-right">RATE (USD)</th>}
                              {visibleColumns.total && <th className="p-2 text-right">TOTAL (USD)</th>}
                            </>
                          )}
                        </tr>
                      </thead>
                      
                      <tbody className="divide-y divide-gray-950">
                        {/* CRUCIAL FIX: MULTIPLYING CHUNK INDEX FOR CONTINUOUS UNBROKEN SEQUENTIAL SERIAL NUMBERS */}
                        {chunkItems.length > 0 ? chunkItems.map((item, idx) => renderLineItemRow(item, chunkItemOffset + idx, "item")) : (
                            <tr style={{height: "0px"}}><td colSpan={totalCols} className="p-0 border-0 m-0"></td></tr>
                        )}
                      </tbody>

                      {isLastItemsPage && (
                        <tbody className="border-t-2 border-gray-950">
                          <tr className="font-black text-[10.5px] uppercase bg-gray-50/40">
                            <td colSpan={totalCols} className="p-2">
                            <div className="flex justify-between items-center font-bold">
                              <span>TOTAL SUMMARY</span>
                              {items.some(it => it.industry === "oil" || (it.industry === "agri_multi" && /\bOIL\b/.test(it.commodity.toUpperCase()))) ? (
                                <>
                                  <span>{items.reduce((sum, it) => sum + (it.oilUseBox === "YES" && it.totalBoxesPerFcl ? (it.totalBoxesPerFcl * (it.numFCL || 1)) : (it.totalBottlesPerFcl ? (it.totalBottlesPerFcl * (it.numFCL || 1)) : (it.totalBags || 0))), 0).toLocaleString()} {items.some(it => it.oilUseBox === "YES") ? "BOXES" : "BOTTLES"}</span>
                                  <span>{(items.reduce((sum, it) => sum + (it.totalWeightKg || 0), 0) / 1000).toLocaleString()} KL</span>
                                </>
                              ) : (
                                <>
                                  <span>{(calculateTotalBags() || 0).toLocaleString()} BAGS</span>
                                  <span>{(calculateTotalNetWt() || 0).toLocaleString()} KG</span>
                                </>
                              )}
                              {docType !== "pl" && <span className="text-blue-900 text-xs font-black">GRAND TOTAL: ${(calculateGrandTotalUSD() || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    )}
                  </table>
                  </div>

                  {/* BOTTOM FOOTER SECTION (Pushed to bottom of the content boundary) */}
                  {(chunkBags.length > 0 || showFooter) && (
                    <div className="mt-auto shrink-0 bg-white border-t-2 border-gray-950 print:break-inside-auto">
                      {chunkBags.length > 0 && (
                        <div className="border-b-2 border-gray-950 p-2 print:break-inside-auto">
                          <div className="font-bold text-[9px] mb-1 uppercase tracking-wider text-gray-800">FCL Container Specifications</div>
                          <table className="w-full text-left text-[8.5px] border-collapse font-sans font-medium text-gray-900 border border-gray-950 print:break-inside-auto">
                            <thead>
                              <tr className="bg-gray-50 uppercase text-[8px] text-gray-500 tracking-wider">
                                <th className="p-1 border border-gray-950">Container No.</th>
                                <th className="p-1 border border-gray-950">Seal No.</th>
                                <th className="p-1 border border-gray-950">Lot / Batch</th>
                                <th className="p-1 border border-gray-950 text-right">Packages</th>
                                <th className="p-1 border border-gray-950 text-right">Net Wt. (KG)</th>
                                <th className="p-1 border border-gray-950 text-right">Gross Wt. (KG)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {chunkBags.map((bag, i) => (
                                <tr key={i} className="divide-x divide-gray-950 border-b border-gray-950 last:border-0 hover:bg-gray-50 transition-colors print:break-inside-avoid">
                                  <td className="p-1 font-mono uppercase font-bold">{bag.containerNo}</td>
                                  <td className="p-1 font-mono uppercase font-semibold">{bag.sealNo}</td>
                                  <td className="p-1 font-mono uppercase">{bag.lotNo || '-'}</td>
                                  <td className="p-1 text-right font-bold">{(bag.packagesCount || 0).toLocaleString()}</td>
                                  <td className="p-1 text-right font-bold text-gray-800">{(bag.netWt || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                  <td className="p-1 text-right font-bold text-gray-800">{(bag.grossWt || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {showFooter && (docType === "ci" || docType === "pi") && visibleSections.bankDetails && (
                        <div className="grid grid-cols-2 text-[10px] font-sans divide-x divide-gray-950 p-2 border-b-2 border-gray-950">
                          <div className="whitespace-pre-line uppercase leading-tight">{bankDetails}</div>
                          <div className="italic p-2 uppercase"><b>TOTAL IN WORDS:</b><br/>{displayWords}</div>
                        </div>
                      )}
                      
                      {showFooter && documentRemarks && (
                        <div className="p-2 border-b-2 border-gray-950 text-[9px] font-sans text-gray-800">
                          <b>REMARKS / NOTES:</b>
                          <div className="whitespace-pre-wrap mt-1 leading-tight font-medium uppercase">{documentRemarks}</div>
                        </div>
                      )}

                      {showFooter && visibleSections.declaration && (
                        <div className="p-3 text-[9.5px] text-gray-600 flex justify-between items-end relative">
                          <div className="w-2/3 pr-4"><b>DECLARATION:</b> <i className="block font-medium">{declaration}</i></div>
                          <div className="text-right flex flex-col items-end">
                            <b className="mb-0.5">{signatory}</b>
                            <div className="h-10 w-28 border-b border-gray-400 my-1 relative flex items-center justify-center">
                              {signatureImageUrl && (
                                <img src={signatureImageUrl} alt="Signature" className="max-h-16 max-w-[120px] absolute bottom-1 object-contain" style={{ filter: "darken" }} />
                              )}
                            </div>
                            <span className="text-[8px] font-bold text-gray-900 block mt-1">AUTHORISED SIGNATORY</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  </div>

                  <div className="absolute right-8 text-[8.5px] font-sans font-bold text-gray-400 uppercase tracking-widest" style={{ bottom: `calc(${pageMargins.bottom} + 0.5rem)` }}>
                    PAGE {pageIdx + 1} OF {pages.length}
                  </div>
                </div>
              );
            });
          })()}
          </div>
        </section>
      </div>

      {/* Impact Confirmation Modal */}
      {impactConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 flex items-start gap-4">
              <div className="bg-amber-500/20 text-amber-500 rounded-xl p-3 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-100 text-sm">Value Impact Confirmation</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You changed the <span className="text-white font-bold">{impactConfirm.field === 'rate' ? 'Rate' : 'Net Weight'}</span> from <span className="line-through opacity-70">{impactConfirm.oldValue}</span> to <span className="text-teal-400 font-bold">{impactConfirm.newValue}</span>.
                </p>
              </div>
            </div>
            
            <div className="bg-slate-950 px-5 py-4 border-t border-slate-800 space-y-3">
               <div className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800/50">
                 <span className="text-xs text-slate-500 uppercase font-black">Shipment Impact</span>
                 <span className={`text-sm font-black font-mono ${impactConfirm.diffTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                   {impactConfirm.diffTotal >= 0 ? '+' : ''}${impactConfirm.diffTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                 </span>
               </div>
               
               <div className="flex justify-between items-center px-1">
                 <span className="text-xs text-slate-500 uppercase font-black">New Grand Total</span>
                 <span className="text-sm font-black text-slate-200 font-mono">
                   ${impactConfirm.newGrandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                 </span>
               </div>
            </div>
            
            <div className="p-4 grid grid-cols-2 gap-3 border-t border-slate-800">
              <button 
                onClick={() => {
                  handleItemCellChange(impactConfirm.itemId, impactConfirm.field, String(impactConfirm.oldValue));
                  setImpactConfirm(null);
                }} 
                className="py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition"
              >
                Revert Change
              </button>
              <button 
                onClick={() => setImpactConfirm(null)} 
                className="py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-lg shadow-teal-900/20"
              >
                Confirm Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local Toast */}
      {localToast && (
        <div className={`fixed bottom-6 right-6 font-semibold text-xs py-3 px-5 rounded-xl shadow-2xl tracking-wide z-[300] select-none animate-in slide-in-from-bottom-5 fade-in duration-300
          ${localToast.type === 'error' ? 'bg-[#7f1d1d] border-[#ef4444] text-[#fee2e2] border' : 
            localToast.type === 'success' ? 'bg-[#064e3b] border-[#10b981] text-[#ecfdf5] border' : 
            localToast.type === 'warn' ? 'bg-[#78350f] border-[#f59e0b] text-[#fef3c7] border' :
            'bg-slate-900 border border-slate-800 text-slate-50'}`}
        >
          {localToast.message}
        </div>
      )}
    </div>
  );
}