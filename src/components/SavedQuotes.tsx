import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { jsPDF } from "jspdf";
import {
  SavedQuote,
  PIItem,
  PIWorkflowStep,
  GrainInventoryItem,
} from '../types';
import { getHsCodeForCommodity } from "../utils/hscode";
import {
  fmtDate,
  todayISO,
  getInitials,
  numberToWordsUSD,
  checkAndNotifyIframeBlock,
} from "../utils";
import {
  BookmarkCheck,
  Trash2,
  Calendar,
  FileText,
  FileClock,
  MapPin,
  CheckCircle,
  Upload,
  Search,
  Download,
  ExternalLink,
  Clock,
  CheckSquare,
  X,
  Play,
  BadgeCheck,
  FileSpreadsheet,
  Check,
  Coins,
  Lock,
  Ship,
  Mail,
  Anchor,
  Truck,
  Share2,
  Smartphone,
  MessageSquare,
  MessageCircle,
  FileBadge,
  ScrollText,
  BugOff,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Paperclip,
  Plus,
  Calculator,
  ArrowLeft,
  Edit3,
  FolderOpen,
  Sparkles,
  Printer,
  DollarSign,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { uploadFileInChunks, downloadFileFromChunks } from "../services/db";

interface SavedQuotesProps {
  savedQuotes: SavedQuote[];
  setSavedQuotes: (
    quotes: SavedQuote[] | ((prev: SavedQuote[]) => SavedQuote[]),
  ) => void;
  onNavigateToTab: (tab: string) => void;
  setSelectedRateIds: (ids: number[]) => void;
  onSendToCalculator?: (
    backfill: { quoteId: number; itemIndex: number; data: any } | null,
  ) => void;
  onLaunchWorkspace?: (
    quoteId: number,
    type: "pi" | "ci" | "pl",
    openInNewTab?: boolean,
  ) => void;
  allowedModules?: string[];
  industry?: string;
  licenceMetadata?: any;
  grainInventory?: GrainInventoryItem[];
  isInventoryEnabled?: boolean;
  isStandaloneCompliance?: boolean;
  standaloneQuoteId?: number;
  initialQuoteId?: number | null;
  isViren?: boolean;
  isTrialMode?: boolean;
}

const STAGES = [
  { key: "offer", label: "RFQ Quotation", color: "blue" },
  { key: "pi", label: "Proforma Invoice", color: "indigo" },
  { key: "signed", label: "Signed Contract", color: "purple" },
  { key: "payment", label: "Swift Deposit", color: "amber" },
  { key: "milling", label: "Milling & Pack", color: "orange" },
  { key: "inspection", label: "Phyto & SGS", color: "teal" },
  { key: "bl", label: "OBL Release", color: "emerald" },
  { key: "done", label: "Customs Passed", color: "green" },
];

export const COUNTRY_DOCS: Record<
  string,
  Array<{
    key: string;
    label: string;
    desc: string;
    required: boolean;
    autoKey?: string;
  }>
> = {
  IN: [
    {
      key: "e_brc",
      label: "e-BRC (Bank Realisation Certificate)",
      desc: "Mandatory RBI proof of foreign inward remittance.",
      required: true,
    },
    {
      key: "shipping_bill",
      label: "Let Export Order / Shipping Bill",
      desc: "Indian Customs ICEGATE clearance document.",
      required: true,
    },
  ],
  US: [
    {
      key: "aes",
      label: "AES/ITN Filing",
      desc: "Automated Export System Internal Transaction Number.",
      required: true,
    },
    {
      key: "fda",
      label: "FDA Prior Notice",
      desc: "Mandatory FDA notification for food & pharma shipments.",
      required: false,
    },
  ],
  CN: [
    {
      key: "ciq",
      label: "CIQ Certificate",
      desc: "China Inspection and Quarantine clearance.",
      required: true,
    },
    {
      key: "export_licence",
      label: "Export Licence",
      desc: "MOFCOM approved export quota verification.",
      required: true,
    },
  ],
  AE: [
    {
      key: "chamber_attest",
      label: "Chamber Attestation",
      desc: "Dubai Chamber of Commerce verified invoice.",
      required: true,
    },
    {
      key: "mofa_attest",
      label: "MOFA Attestation",
      desc: "Ministry of Foreign Affairs document stamp.",
      required: true,
    },
  ],
};

export const getDocumentsRequired = (
  industryKey: string,
  countryCode?: string,
) => {
  const baseDocs =
    SPECIALIZED_CHECKLISTS[industryKey] || SPECIALIZED_CHECKLISTS["generic"];
  if (!countryCode) return baseDocs;

  const additionalDocs = COUNTRY_DOCS[countryCode];
  if (!additionalDocs) return baseDocs;

  return [...baseDocs, ...additionalDocs];
};

export const SPECIALIZED_CHECKLISTS: Record<
  string,
  Array<{
    key: string;
    label: string;
    desc: string;
    required: boolean;
    autoKey?: string;
  }>
> = {
  grain: [
    {
      key: "pi",
      label: "Proforma Invoice (PI)",
      desc: "Contract terms and customer-specific ex-mill rate validation.",
      required: true,
      autoKey: "pi",
    },
    {
      key: "ci",
      label: "Commercial Invoice (CI)",
      desc: "Final financial calculations, bag details, and bank swift tags.",
      required: true,
      autoKey: "ci",
    },
    {
      key: "pl",
      label: "Packing List (PL)",
      desc: "Stuffing weight summaries and lot seal tracking IDs.",
      required: true,
      autoKey: "pl",
    },
    {
      key: "phyto",
      label: "Phytosanitary Certificate",
      desc: "Mandatory plant health quarantine clearance for agricultural grain.",
      required: true,
      autoKey: "phyto",
    },
    {
      key: "sgs",
      label: "SGS / Quality Inspection Certificate",
      desc: "Moisture quotient analysis & premium length grading report.",
      required: true,
    },
    {
      key: "fumigation",
      label: "Container Fumigation Certificate",
      desc: "Pest prevention certification matching standard carrier locks.",
      required: true,
    },
    {
      key: "bl",
      label: "Bill of Lading (OBL)",
      desc: "Carrier dispatch release matching real-time location logs.",
      required: true,
      autoKey: "shipping_invoice",
    },
  ],
  spices: [
    {
      key: "pi",
      label: "Proforma Invoice (PI)",
      desc: "Contract terms and customer-specific ex-mill rate validation.",
      required: true,
      autoKey: "pi",
    },
    {
      key: "ci",
      label: "Commercial Invoice (CI)",
      desc: "Final export pricing invoice matching Spices HS codes.",
      required: true,
      autoKey: "ci",
    },
    {
      key: "pl",
      label: "Packing List (PL)",
      desc: "Dry spices bag stuffing list, total gross & net weight.",
      required: true,
      autoKey: "pl",
    },
    {
      key: "phyto",
      label: "Phytosanitary Certificate",
      desc: "Mandatory plant quarantine health verification for dry spices.",
      required: true,
      autoKey: "phyto",
    },
    {
      key: "spices_board",
      label: "Spices Board Quality Certificate",
      desc: "Authorized export rating certificate by Board of Spices.",
      required: true,
    },
    {
      key: "sterilization",
      label: "Microbiological Sterilization Certificate",
      desc: "Verifies steam/heat sterilization logs.",
      required: false,
    },
    {
      key: "bl",
      label: "Bill of Lading (OBL)",
      desc: "Carrier dispatch release matching Spices container seal.",
      required: true,
      autoKey: "shipping_invoice",
    },
  ],
  chemicals: [
    {
      key: "pi",
      label: "Proforma Invoice (PI)",
      desc: "Contract terms and chemical product specifications.",
      required: true,
      autoKey: "pi",
    },
    {
      key: "ci",
      label: "Commercial Invoice (CI)",
      desc: "Billing record with CAS / UN classifications clearly noted.",
      required: true,
      autoKey: "ci",
    },
    {
      key: "pl",
      label: "Packing List (PL)",
      desc: "Details on chemical drums, IBC totes, or pellet weights.",
      required: true,
      autoKey: "pl",
    },
    {
      key: "msds",
      label: "Material Safety Data Sheet (MSDS)",
      desc: "Extremely critical hazardous handling & transport safety declaration.",
      required: true,
    },
    {
      key: "coa",
      label: "Certificate of Analysis (CoA)",
      desc: "Batch chemical purity spectrum matching grade standards.",
      required: true,
    },
    {
      key: "dg",
      label: "Dangerous Goods Declaration",
      desc: "Critical maritime hazard classification approval sheets.",
      required: false,
    },
    {
      key: "bl",
      label: "Bill of Lading (OBL)",
      desc: "Hazmat-coded vessel release sheets.",
      required: true,
      autoKey: "shipping_invoice",
    },
  ],
  salts: [
    {
      key: "pi",
      label: "Proforma Invoice (PI)",
      desc: "Contract terms and salt grade specifications.",
      required: true,
      autoKey: "pi",
    },
    {
      key: "ci",
      label: "Commercial Invoice (CI)",
      desc: "Final industrial / table salt billing weights and rates.",
      required: true,
      autoKey: "ci",
    },
    {
      key: "pl",
      label: "Packing List (PL)",
      desc: "Bag stuffing and moisture weight shrink margin records.",
      required: true,
      autoKey: "pl",
    },
    {
      key: "coa",
      label: "Certificate of Analysis (NaCl %)",
      desc: "Purity report validating sodium chloride concentration.",
      required: true,
    },
    {
      key: "non_haz",
      label: "Non-Hazardous Substance Sheet",
      desc: "Declaration for customs validating safe industrial salts.",
      required: true,
    },
    {
      key: "origin",
      label: "Certificate of Origin",
      desc: "Proves crystalline rock salt origin.",
      required: false,
    },
    {
      key: "bl",
      label: "Bill of Lading (OBL)",
      desc: "Carrier maritime dispatch and bulk container locks.",
      required: true,
      autoKey: "shipping_invoice",
    },
  ],
  sugar: [
    {
      key: "pi",
      label: "Proforma Invoice (PI)",
      desc: "Contract terms and sugar grade specifications.",
      required: true,
      autoKey: "pi",
    },
    {
      key: "ci",
      label: "Commercial Invoice (CI)",
      desc: "Final sugar billing weights and rates.",
      required: true,
      autoKey: "ci",
    },
    {
      key: "pl",
      label: "Packing List (PL)",
      desc: "Bag stuffing and container weight records.",
      required: true,
      autoKey: "pl",
    },
    {
      key: "coa",
      label: "Certificate of Analysis (ICUMSA)",
      desc: "Purity and polarization report validating sugar grade.",
      required: true,
    },
    {
      key: "phyto",
      label: "Phytosanitary Certificate",
      desc: "Plant quarantine health verification for sugar.",
      required: true,
      autoKey: "phyto",
    },
    {
      key: "health",
      label: "Health Certificate",
      desc: "Validates sugar is fit for human consumption.",
      required: true,
    },
    {
      key: "origin",
      label: "Certificate of Origin",
      desc: "Proves sugar origin for customs.",
      required: false,
    },
    {
      key: "bl",
      label: "Bill of Lading (OBL)",
      desc: "Carrier maritime dispatch and bulk container locks.",
      required: true,
      autoKey: "shipping_invoice",
    },
  ],
  vegetables_fruits: [
    {
      key: "pi",
      label: "Proforma Invoice (PI)",
      desc: "Contract terms and fresh produce ex-mill values.",
      required: true,
      autoKey: "pi",
    },
    {
      key: "ci",
      label: "Commercial Invoice (CI)",
      desc: "Detailed billing with fresh fruit crate carton counts.",
      required: true,
      autoKey: "ci",
    },
    {
      key: "pl",
      label: "Packing List (PL)",
      desc: "Sorting weight notes, pre-cooling logs, and crate count.",
      required: true,
      autoKey: "pl",
    },
    {
      key: "phyto",
      label: "Phytosanitary Certificate",
      desc: "Strict agricultural quarantine certification matching physical inspection.",
      required: true,
      autoKey: "phyto",
    },
    {
      key: "cold_chain",
      label: "Cold Chain Temp Logger Report",
      desc: "Continuous sensor logs for fresh temperature preservation (humidity levels).",
      required: true,
    },
    {
      key: "apeda",
      label: "APEDA Fresh Produce Certificate",
      desc: "Official compliance registry validation for exports of fresh agricultural items.",
      required: false,
    },
    {
      key: "bl",
      label: "Bill of Lading / Air Waybill",
      desc: "Carrier direct dispatch sheets (mandatory cooling container specs).",
      required: true,
      autoKey: "shipping_invoice",
    },
  ],
  tiles: [
    {
      key: "pi",
      label: "Proforma Invoice (PI)",
      desc: "Contract terms, specifications, and square-meter rates.",
      required: true,
      autoKey: "pi",
    },
    {
      key: "ci",
      label: "Commercial Invoice (CI)",
      desc: "Final surface dimensions value metrics and pallet weights.",
      required: true,
      autoKey: "ci",
    },
    {
      key: "pl",
      label: "Packing List (PL)",
      desc: "Pallets weight, wood crate packing specs, and breakability labels.",
      required: true,
      autoKey: "pl",
    },
    {
      key: "test_report",
      label: "Water Absorption & Load Test Report",
      desc: "Certified tiles testing report details.",
      required: true,
    },
    {
      key: "origin",
      label: "Certificate of Origin",
      desc: "Form-A trade agreements origin documentation.",
      required: true,
    },
    {
      key: "ispm15",
      label: "ISPM-15 Wood Pallet Fumigation",
      desc: "Mandatory regulatory heat seal on wooden crates for international ports.",
      required: true,
    },
    {
      key: "bl",
      label: "Bill of Lading (OBL)",
      desc: "Carrier maritime transport document.",
      required: true,
      autoKey: "shipping_invoice",
    },
  ],
  oil: [
    {
      key: "pi",
      label: "Proforma Invoice (PI)",
      desc: "Contract terms, pipeline/vessel rates, and grade validation.",
      required: true,
      autoKey: "pi",
    },
    {
      key: "ci",
      label: "Commercial Invoice (CI)",
      desc: "Final financial settlements, density matching, and routing fees.",
      required: true,
      autoKey: "ci",
    },
    {
      key: "pl",
      label: "Packing & Delivery List (PL)",
      desc: "Barrel density, flexi-tank capacity, and manifest summary.",
      required: true,
      autoKey: "pl",
    },
    {
      key: "quality_cert",
      label: "Quality & Purity Certificate",
      desc: "SGS or surveyor oil purity/FFA percentage tests.",
      required: true,
    },
    {
      key: "health_cert",
      label: "Health Risk / Food Safe Certificate",
      desc: "Phyto or food authority safety documentation for edible oils.",
      required: true,
    },
    {
      key: "bl",
      label: "Bill of Lading (OBL)",
      desc: "Vessel routing for liquid bulk manifest.",
      required: true,
      autoKey: "shipping_invoice",
    },
  ],
  pharma: [
    {
      key: "pi",
      label: "Proforma Invoice (PI)",
      desc: "Contract terms, batch validation, and active ingredient compliance.",
      required: true,
      autoKey: "pi",
    },
    {
      key: "ci",
      label: "Commercial Invoice (CI)",
      desc: "Financial settlement and medical procurement clearance.",
      required: true,
      autoKey: "ci",
    },
    {
      key: "pl",
      label: "Packing List (PL)",
      desc: "Pallet layout, cold-chain markers, and unit box serialization.",
      required: true,
      autoKey: "pl",
    },
    {
      key: "copp",
      label: "COPP (Certificate of Pharmaceutical Product)",
      desc: "WHO-format certificate from domestic health authority.",
      required: true,
    },
    {
      key: "fsc",
      label: "Free Sale Certificate (FSC)",
      desc: "Documentation allowing immediate marketplace distribution.",
      required: true,
    },
    {
      key: "gmp",
      label: "GMP Certificate",
      desc: "Good Manufacturing Practice authorization for supplier.",
      required: true,
    },
    {
      key: "bl",
      label: "Air Waybill / OBL",
      desc: "Priority transport document, usually temperature-controlled flight.",
      required: true,
      autoKey: "shipping_invoice",
    },
  ],
  generic: [
    {
      key: "pi",
      label: "Proforma Invoice (PI)",
      desc: "Contract terms and general pricing parameters.",
      required: true,
      autoKey: "pi",
    },
    {
      key: "ci",
      label: "Commercial Invoice (CI)",
      desc: "Final transaction invoicing matching HS codes.",
      required: true,
      autoKey: "ci",
    },
    {
      key: "pl",
      label: "Packing List (PL)",
      desc: "Cargo bundle descriptions, total weight & size logs.",
      required: true,
      autoKey: "pl",
    },
    {
      key: "origin",
      label: "Certificate of Origin",
      desc: "Validates country-source trade tariff clearances.",
      required: false,
    },
    {
      key: "bl",
      label: "Bill of Lading (OBL)",
      desc: "Carrier maritime transport release.",
      required: true,
      autoKey: "shipping_invoice",
    },
  ],
};

export default function SavedQuotes({
  savedQuotes = [],
  setSavedQuotes = () => {},
  onNavigateToTab,
  setSelectedRateIds,
  onSendToCalculator,
  onLaunchWorkspace,
  allowedModules,
  industry = "grain",
  licenceMetadata,
  grainInventory = [],
  isInventoryEnabled = true,
  isStandaloneCompliance = false,
  standaloneQuoteId,
  initialQuoteId,
  isViren = false,
  isTrialMode = false,
}: SavedQuotesProps) {
  const [search, setSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<
    "all" | "quote" | "pi" | "ci" | "pl" | "bl"
  >("all");
  const [activeQuoteId, setActiveQuoteId] = useState<number | null>(
    initialQuoteId || standaloneQuoteId || null,
  );
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<number[]>([]);
  const [previewMode, setPreviewMode] = useState<"pi" | "ci" | "pl" | "batch_merged" | null>(null);
  const [dateSortOrder, setDateSortOrder] = useState<"desc" | "asc">("desc");
  const [isDashboardExpanded, setIsDashboardExpanded] = useState(false);
  const [isRoadmapExpanded, setIsRoadmapExpanded] = useState(false);
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  const [broadcasterMobile, setBroadcasterMobile] =
    useState("+971 50 123 4567");
  const [broadcasterEmail, setBroadcasterEmail] = useState(
    "ops@vnpexporthub.com",
  );
  const [activeOutboundMail, setActiveOutboundMail] = useState<string | null>(
    null,
  );

  const [docScanProgress, setDocScanProgress] = useState(0);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [showAddCustomForm, setShowAddCustomForm] = useState(false);
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [newCustomDesc, setNewCustomDesc] = useState("");
  const [newCustomRequired, setNewCustomRequired] = useState(false);
  const [editorMetadata, setEditorMetadata] = useState<Partial<SavedQuote>>({});
  const [editorItems, setEditorItems] = useState<PIItem[]>([]);
  const [excludedCombinedDocs, setExcludedCombinedDocs] = useState<
    Record<string, boolean>
  >({});
  const [quoteToDelete, setQuoteToDelete] = useState<number | null>(null);
  const [paymentQuoteToConfirm, setPaymentQuoteToConfirm] = useState<SavedQuote | null>(null);
  const [paymentConfirmStep, setPaymentConfirmStep] = useState<1 | 2 | 3>(1);
  const [viewMode, setViewMode] = useState<"docs" | "payments">("docs");
  const [fileUploadProgress, setFileUploadProgress] = useState<Record<string, number>>({});
  const [fileDownloading, setFileDownloading] = useState<Record<string, boolean>>({});

  const isFreeTier = isTrialMode || licenceMetadata?.planId === "free" || licenceMetadata?.approved === false;

  const isQuoteArchived = (quoteId: number) => {
    if (!isFreeTier) return false;
    const q = savedQuotes.find(sq => sq.id === quoteId);
    if (q?.isPaidCredit) return false;
    
    // Sort savedQuotes newest first (id descending)
    const quotesToUse = Array.isArray(savedQuotes) ? savedQuotes : [];
    const sorted = [...quotesToUse].sort((a, b) => Number(b.id) - Number(a.id));
    
    // Filter down to non-credit quotes
    const nonCreditSorted = sorted.filter(sq => !sq.isPaidCredit);
    const index = nonCreditSorted.findIndex(sq => sq.id === quoteId);
    
    // Newest 2 remain active. Index >= 2 are archived.
    return index >= 2;
  };

  const activeQuote =
    (Array.isArray(savedQuotes) ? savedQuotes : []).find((q) => Number(q.id) === Number(activeQuoteId)) || null;

  useEffect(() => {
    if (activeQuoteId !== null && !activeQuote) {
      setActiveQuoteId(null);
    }
  }, [activeQuoteId, activeQuote]);

  useEffect(() => {
    if (activeQuote) {
      setEditorItems(activeQuote.items || []);
      setEditorMetadata({
        ref: activeQuote.ref || "",
        company: activeQuote.company || "",
        exporterDetails: activeQuote.exporterDetails || "",
        buyer: activeQuote.buyer || "",
        buyerLoc: activeQuote.buyerLoc || "",
        consigneeDetails: activeQuote.consigneeDetails || "",
        dest: activeQuote.dest || "",
        terms: activeQuote.terms || "",
        cond: activeQuote.cond || "",
        valid: activeQuote.valid || "",
      });
    } else {
      setEditorItems([]);
      setEditorMetadata({});
    }
  }, [activeQuoteId, savedQuotes]);

  // debug: console.log("standalone", isStandaloneCompliance, standaloneQuoteId, activeQuoteId, savedQuotes.length);

  const handleIncomingFile = async (file: File, typeKey: string) => {
    if (!activeQuoteId) return;
    const progressKey = `${activeQuoteId}_${typeKey}`;
    try {
      setFileUploadProgress((prev) => ({ ...prev, [progressKey]: 1 }));
      const result = await uploadFileInChunks(activeQuoteId, typeKey, file, (percent) => {
        setFileUploadProgress((prev) => ({ ...prev, [progressKey]: percent }));
      });
      applyVerifiedFileSave(activeQuoteId, typeKey, result.fileName, result.fileSize);
      setTimeout(() => {
        setFileUploadProgress((prev) => {
          const updated = { ...prev };
          delete updated[progressKey];
          return updated;
        });
      }, 1500);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file online. Please check network/permissions and try again.");
      setFileUploadProgress((prev) => {
        const updated = { ...prev };
        delete updated[progressKey];
        return updated;
      });
    }
  };

  const applyVerifiedFileSave = (
    qId: number,
    typeKey: string,
    fileName: string,
    fileSize: number = 0,
  ) => {
    setSavedQuotes((prev) =>
      prev.map((q) => {
        if (q.id === qId) {
          const updatedWf = {
            ...(q.workflow || {}),
            [typeKey]: {
              label: typeKey,
              fileName,
              fileSize,
              date: new Date().toISOString(),
            },
          };
          return {
            ...q,
            workflow: updatedWf,
            // For back-compatibility with older fields
            ...(typeKey === "pi" ? { approvedPiUploaded: true, approvedPiFileName: fileName } : {}),
          };
        }
        return q;
      }),
    );
  };

  const handleDownloadFile = async (quoteId: number, typeKey: string) => {
    const downloadKey = `${quoteId}_${typeKey}`;
    try {
      setFileDownloading((prev) => ({ ...prev, [downloadKey]: true }));
      await downloadFileFromChunks(quoteId, typeKey);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert(error instanceof Error ? error.message : "Failed to download file. Please verify upload exists.");
    } finally {
      setFileDownloading((prev) => ({ ...prev, [downloadKey]: false }));
    }
  };

  const renderFileControls = (typeKey: string) => {
    if (!activeQuote) return null;
    const progressKey = `${activeQuote.id}_${typeKey}`;
    const percent = fileUploadProgress[progressKey];
    const isUploading = percent !== undefined;
    const fileMeta = activeQuote.workflow?.[typeKey];
    const isDownloaded = !!fileMeta?.fileName;
    const isDownloading = fileDownloading[progressKey];

    return (
      <div className="space-y-1 w-full mt-1.5">
        {isUploading && (
          <div className="w-full bg-slate-50 border border-indigo-100 rounded-lg p-2 animate-pulse">
            <div className="flex justify-between text-[10px] text-indigo-700 font-extrabold leading-none mb-1">
              <span className="text-indigo-600 font-bold">Uploading to Cloud Store...</span>
              <span className="text-indigo-600 font-black">{percent}%</span>
            </div>
            <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {isDownloaded && !isUploading && (
          <div className="flex items-center gap-1.5 mt-1">
            <button
              onClick={() => handleDownloadFile(activeQuote.id, typeKey)}
              disabled={isDownloading}
              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:bg-indigo-200 border border-indigo-200 rounded-md text-[10px] font-bold transition"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3 text-indigo-500" />
                  <span>Download Original ({fileMeta.fileSize ? `${Math.round(fileMeta.fileSize / 1024)} KB` : "Stored Online"})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  const getStageIndex = (statusKey?: string) => {
    return 0; // simple mock for now
  };

  const handleDeleteQuote = (e: React.MouseEvent, quoteId: number) => {
    e.stopPropagation();
    setQuoteToDelete(quoteId);
  };

  const confirmDeleteQuote = () => {
    if (quoteToDelete !== null) {
      setSavedQuotes((prev) => prev.filter((q) => q.id !== quoteToDelete));
      if (activeQuoteId === quoteToDelete) {
        setActiveQuoteId(null);
      }
      setQuoteToDelete(null);
    }
  };

  const cancelDeleteQuote = () => {
    setQuoteToDelete(null);
  };

  const handleItemEditorChange = (
    index: number,
    key: keyof PIItem,
    val: any,
  ) => {
    const arr = [...editorItems];
    let updatedItem = { ...arr[index], [key]: val } as PIItem;

    if (["numFCL", "weightPerContainerKg", "rate"].includes(key as string)) {
      (updatedItem as any)[key] = Number(val) || 0;
    }

    if (key === "numFCL" || key === "weightPerContainerKg" || key === "size") {
      const fcl =
        key === "numFCL" ? Number(val) || 0 : Number(updatedItem.numFCL) || 0;
      const weight =
        key === "weightPerContainerKg"
          ? Number(val) || 0
          : Number(updatedItem.weightPerContainerKg) || 0;
      updatedItem.totalWeightKg = fcl * weight;

      const sizeStr = String(key === "size" ? val : updatedItem.size || "");
      const bagSizeMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*KG/i);
      const bagSize = bagSizeMatch ? parseFloat(bagSizeMatch[1]) : 0;
      if (bagSize > 0) {
        updatedItem.totalBags = Math.round(updatedItem.totalWeightKg / bagSize);
      }
    }

    arr[index] = updatedItem;
    setEditorItems(arr);
  };

  const handleSaveEditorChanges = () => {
    if (activeQuoteId !== null) {
      setSavedQuotes((prev) =>
        prev.map((q) => {
          if (q.id === activeQuoteId) {
            const ht = (q as any).trackingHistory || [];
            return {
              ...q,
              ...editorMetadata,
              items: editorItems,
              trackingHistory: [
                {
                  timestamp: new Date().toISOString(),
                  status: `Quote definitions & metadata overridden in Document Editor. Reason: ${revisionNote || "No specific reason provided"}`,
                },
                ...ht,
              ],
            } as any;
          }
          return q;
        }),
      );
    }
    setRevisionNote("");
    setShowConfirmModal(false);
    alert(
      "Document data & items have been successfully overridden and updated in all document drafts!",
    );
  };

  const addCustomChecklistItem = (
    quoteId: number,
    label: string,
    desc: string,
    required: boolean,
  ) => {};

  let quoteIndustry = "grain";
  let combinedChecklistItems: any[] = [];
  let itemsWithStatus: any[] = [];
  let progressPct = 0;
  let completedCount = 0;
  let industryLabel = "Grain / Rice";

  if (activeQuote) {
    quoteIndustry = activeQuote.industry || industry || "grain";
    const targetCountry = licenceMetadata?.country || "";
    const defaultItems = getDocumentsRequired(quoteIndustry, targetCountry);
    const customItems = activeQuote.customChecklistItems || [];
    combinedChecklistItems = [...defaultItems, ...customItems];

    itemsWithStatus = combinedChecklistItems.map((item) => {
      let isDone = false;
      let autoMatched = false;

      if (item.autoKey) {
        if (item.autoKey === "pi") {
          isDone =
            activeQuote.approvedPiUploaded ||
            !!(
              activeQuote.workflow?.pi?.fileName ||
              activeQuote.workflow?.signed?.fileName
            );
          autoMatched = isDone;
        } else if (item.autoKey === "ci") {
          isDone = !!activeQuote.workflow?.ci?.fileName;
          autoMatched = isDone;
        } else if (item.autoKey === "pl") {
          isDone = !!activeQuote.workflow?.pl?.fileName;
          autoMatched = isDone;
        } else if (item.autoKey === "phyto") {
          isDone = !!activeQuote.workflow?.phyto?.fileName;
          autoMatched = isDone;
        } else if (item.autoKey === "shipping_invoice") {
          isDone =
            !!activeQuote.workflow?.shipping_invoice?.fileName ||
            !!activeQuote.blNo;
          autoMatched = isDone;
        }
      }

      if (!autoMatched) {
        isDone = !!activeQuote.checklistCompleted?.[item.key];
      }

      const attachmentsList = activeQuote.itemAttachments?.[item.key] || [];
      if (attachmentsList.length > 0) {
        isDone = true;
      }

      if (isDone) completedCount++;
      return { ...item, isDone, autoMatched };
    });

    progressPct =
      combinedChecklistItems.length > 0
        ? Math.round((completedCount / combinedChecklistItems.length) * 100)
        : 0;

    industryLabel =
      quoteIndustry === "grain"
        ? "Grain / Rice"
        : quoteIndustry === "spices"
          ? "Exotic Spices"
          : quoteIndustry === "chemicals"
            ? "Industrial Chemicals"
            : quoteIndustry === "salts"
              ? "Crystalline Salts"
              : quoteIndustry === "vegetables_fruits"
                ? "Fresh Vegetables & Fruits"
                : quoteIndustry === "tiles"
                  ? "Ceramic Tiles & Surfaces"
                  : quoteIndustry === "sugar"
                    ? "Refined Sugar"
                    : quoteIndustry === "nuts"
                      ? "Nuts & Cashews"
                      : quoteIndustry === "metal"
                        ? "Metals & Ingots"
                        : quoteIndustry === "oil"
                          ? "Palm & Edible Oil"
                          : quoteIndustry === "pharma"
                            ? "Pharmaceuticals"
                            : "Generic Trade";
  }

  const handleCreateBlankRecord = () => {
    const newId = Date.now();
    const newRef = `MANUAL-${newId.toString().slice(-4)}`;
    const blankQuote: SavedQuote = {
      id: newId,
      ref: newRef,
      company: "YOUR COMPANY NAME",
      buyer: "UNKNOWN BUYER",
      buyerLoc: "",
      dest: "",
      cond: "",
      terms: "",
      valid: new Date().toISOString().split("T")[0],
      date: new Date().toISOString().split("T")[0],
      rateIds: null,
      industry: industry,
      items: [
        {
          id: 1,
          commodity: "Sample Commodity",
          rate: 500,
          totalBags: 1000,
          brand: "Generic",
          size: "50 KG",
          packed: "PP Bags",
          numFCL: 4,
          weightPerContainerKg: 25000,
          totalWeightKg: 100000,
        } as unknown as PIItem,
      ],
      html: "",
      piStatus: "offer",
    };
    setSavedQuotes((prev) => [blankQuote, ...prev]);
    setActiveQuoteId(newId);
    // Expand editor by default for blank records
    setIsEditorExpanded(true);
  };

  const handleSeedDemoShipments = () => {
    const grainId = 1717900000000;
    const spicesId = 1717900000001;
    const tilesId = 1717900000002;

    const demoQuotes: SavedQuote[] = [
      {
        id: grainId,
        ref: "EXP-GRAIN-2026A",
        company: "VISHNU PRASAD & SONS MILLING CO.",
        buyer: "AL-MEERA CONSUMER GOODS CO. (Q.P.S.C)",
        buyerLoc: "AL-MEERA HQ, BEIRUT STREET, DADA AREA, DOHA, QATAR",
        dest: "HAMAD PORT, QATAR",
        cond: "CIF HAMAD PORT, QATAR",
        terms: "30% ADVANCE, balance against scanned OBL copy",
        valid: "2026-12-31",
        date: "2026-06-01",
        rateIds: null,
        items: [
          {
            id: 1,
            commodity: "SONA MASOORI STEAM RICE",
            brand: "ROYAL MEERA PREMIUM",
            size: "25 KG",
            packed: "BOPP Multicolor Laminated Bags",
            bagsCount: 4000,
            qtyTons: 100,
            ratePerTonUsd: 820,
            totalUsd: 82000,
            fobTotalUsd: 74000,
            customsCode: "1006.3010",
            crop: "1006.3010",
          } as unknown as PIItem,
        ],
        html: "",
        piStatus: "pi",
        industry: "grain",
        consigneeDetails: "AL-MEERA TRADING CORP\nDOHA, QATAR",
        notifyParty: "AL-MEERA LOGISTICS TEAM\nTEL: +974 4400 9000",
        preCarriageBy: "By Road Courier",
        placeOfReceipt: "Kakinada Port Yards",
        countryOfOrigin: "INDIA",
        countryOfDestination: "QATAR",
        vesselFlightNo: "MAERSK SPINDRIFT V-102",
        portOfLoading: "NHAVA SHEVA, INDIA",
        portOfDischarge: "HAMAD PORT, QATAR",
        finalDestination: "AL-MEERA CENTRAL WAREHOUSE, DOHA",
        invoiceNo: "REMS-INV-2026-101",
        invoiceDate: "2026-06-02",
        contractNo: "SM-CON-908",
        contractDate: "2026-05-28",
        iecNo: "0510002490",
        gstin: "37AAFFV9048E1Z9",
        authorizedSignatory: "V. N. PRASAD (MANAGING DIRECTOR)",
        blNo: "MSK-NHV-HAM-79401",
        containerNo: "MSKU-892405-2",
        trackingEmail: "buyer@al-meera.qa",
        trackingEta: "2026-06-25",
        workflow: {},
        checklistCompleted: {},
      },
      {
        id: spicesId,
        ref: "EXP-SPICES-779B",
        company: "MALABAR GOLD & SPICES TRADERS",
        buyer: "EMIRATES CATERING SERVICES LLC",
        buyerLoc: "P.O. BOX 112004, AL QUOZ INDUSTRIAL AREA, DUBAI, UAE",
        dest: "JEBEL ALI PORT, DUBAI",
        cond: "FOB NHAVA SHEVA, INDIA",
        terms: "CAD THROUGH BANK OF BARODA",
        valid: "2026-10-31",
        date: "2026-06-03",
        rateIds: null,
        items: [
          {
            id: 2,
            commodity: "SPICES - BLACK PEPPER GL 550",
            brand: "MALABAR SELECT",
            size: "50 KG",
            packed: "Single New Jute Bags",
            bagsCount: 400,
            qtyTons: 20,
            ratePerTonUsd: 6500,
            totalUsd: 130000,
            fobTotalUsd: 130000,
            customsCode: "0904.1110",
            crop: "0904.1110",
          } as unknown as PIItem,
        ],
        html: "",
        piStatus: "pi",
        industry: "spices",
        consigneeDetails: "EMIRATES TRADING HOUSE\nDUBAI, UAE",
        notifyParty: "LOGISTICS COORDINATOR\nEMAIL: uae@emiratescatering.ae",
        placeOfReceipt: "Nhava Sheva CFS",
        countryOfOrigin: "INDIA",
        countryOfDestination: "UNITED ARAB EMIRATES",
        vesselFlightNo: "CMA CGM ANTARES V-509",
        portOfLoading: "NHAVA SHEVA, INDIA",
        portOfDischarge: "JEBEL ALI, DUBAI",
        invoiceNo: "MALABAR-PEP-099",
        invoiceDate: "2026-06-04",
        authorizedSignatory: "S. K. PILLAI (EXPORT HEAD)",
        blNo: "CCM-9024095-IND",
        containerNo: "CMAU-402941-8",
        trackingEmail: "logistics@emiratescatering.ae",
        trackingEta: "2026-06-20",
        workflow: {},
        checklistCompleted: {},
      },
      {
        id: tilesId,
        ref: "EXP-TILES-2026",
        company: "MORBI GLOSSY VITRIFIED CERAMICS",
        buyer: "SAUDI BUILDING MATERIALS DEPOT",
        buyerLoc: "EXIT 5, AL KHOBAR HIGHWAY, RIYADH, KSA",
        dest: "DAMMAM PORT, KSA",
        cond: "CFR DAMMAM PORT, KSA",
        terms: "100% CONFIRMED LC AT SIGHT",
        valid: "2026-11-30",
        date: "2026-06-05",
        rateIds: null,
        items: [
          {
            id: 3,
            commodity: "CERAMIC GLAZED TILES 600X600",
            brand: "MORBI ROYAL CALACATTA",
            size: "4 BOX / PALLET",
            packed: "Corrugated boxes on fumigated pallets",
            bagsCount: 1400,
            qtyTons: 27,
            ratePerTonUsd: 380,
            totalUsd: 10260,
            fobTotalUsd: 8200,
            customsCode: "6907.2100",
            crop: "6907.2100",
          } as unknown as PIItem,
        ],
        html: "",
        piStatus: "pi",
        industry: "tiles",
        countryOfOrigin: "INDIA",
        countryOfDestination: "SAUDI ARABIA",
        vesselFlightNo: "COSCO ZEPHYR V-22",
        portOfLoading: "MUNDRA PORT, INDIA",
        portOfDischarge: "DAMMAM, SAUDI ARABIA",
        invoiceNo: "MORBI-TILES-881",
        invoiceDate: "2026-06-06",
        blNo: "COSU-10940523",
        containerNo: "TGBU-902405-6",
        workflow: {},
        checklistCompleted: {},
      },
    ];

    setSavedQuotes((prev) => [...demoQuotes, ...prev]);
    setActiveQuoteId(grainId);
  };

  const industryFilteredQuotes = savedQuotes.filter(
    (q) => (q.industry || "grain") === industry,
  );

  const sortedFilteredQuotes = [...industryFilteredQuotes]
    .filter((q) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !q.id.toString().includes(s) &&
          !(q.ref && q.ref.toLowerCase().includes(s)) &&
          !(q.buyer && q.buyer.toLowerCase().includes(s)) &&
          !(q.company && q.company.toLowerCase().includes(s)) &&
          !(q.dest && q.dest.toLowerCase().includes(s))
        ) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (dateSortOrder === "desc")
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  const displayQuotes = sortedFilteredQuotes.filter((q) => {
    if (docTypeFilter === "all") return true;
    if (docTypeFilter === "quote") return q.piStatus === "offer" || !q.piStatus;
    if (docTypeFilter === "pi")
      return q.piStatus === "pi" || q.piStatus === "signed";
    if (docTypeFilter === "ci" || docTypeFilter === "pl")
      return (
        q.piStatus === "payment" ||
        q.piStatus === "milling" ||
        q.piStatus === "inspection" ||
        q.piStatus === "bl" ||
        q.piStatus === "done"
      );
    if (docTypeFilter === "bl")
      return q.piStatus === "bl" || q.piStatus === "done";
    return true;
  });

  const handleUpdateQuoteField = (field: string, val: any) => {
    setSavedQuotes((prev) =>
      prev.map((q) => {
        if (q.id === activeQuoteId) {
          return { ...q, [field]: val };
        }
        return q;
      }),
    );
  };

  const handleDownloadCombinedPDF = (q: any, keys: string[]) => {
    console.log("Combine PDF mock", q, keys);
    alert("Downloading combined PDF");
  };

  const handleSimulateTransitDrift = (quoteId: number) => {
    setSavedQuotes((prev) =>
      prev.map((q) => {
        if (q.id === quoteId) {
          const ht = (q as any).trackingHistory || [];
          return {
            ...q,
            trackingHistory: [
              {
                timestamp: new Date().toISOString(),
                status: "Vessel delayed by congestion (-2 days)",
              },
              ...ht,
            ],
          } as any;
        }
        return q;
      }),
    );
  };

  const handleDeclareDelivered = (quoteId: number) => {
    setSavedQuotes((prev) =>
      prev.map((q) => {
        if (q.id === quoteId) {
          const ht = (q as any).trackingHistory || [];
          
          let paymentTracker = q.paymentTracker;
          if (paymentTracker) {
            paymentTracker = { ...paymentTracker, status: 'reached_dest' };
          }
          
          return {
            ...q,
            piStatus: "done",
            paymentTracker,
            trackingHistory: [
              {
                timestamp: new Date().toISOString(),
                status: "Cargo arriving safely at Dest. Port",
              },
              ...ht,
            ],
          } as any;
        }
        return q;
      }),
    );
  };

  const handleClearTrackingHistory = (quoteId: number) => {
    if (window.confirm("Are you sure you want to clear tracking history?")) {
      setSavedQuotes((prev) =>
        prev.map((q) => {
          if (q.id === quoteId) {
            return { ...q, trackingUpdates: [] } as any;
          }
          return q;
        }),
      );
    }
  };

  useEffect(() => {
    if (isStandaloneCompliance && standaloneQuoteId) {
      setActiveQuoteId(standaloneQuoteId);
    }
  }, [isStandaloneCompliance, standaloneQuoteId]);

  const toggleChecklistItem = (quoteId: number, itemKey: string) => {
    setSavedQuotes((prev) =>
      prev.map((q) => {
        if (q.id === quoteId) {
          const completed = q.checklistCompleted || {};
          return {
            ...q,
            checklistCompleted: {
              ...completed,
              [itemKey]: !completed[itemKey],
            },
          };
        }
        return q;
      }),
    );
  };

  const renderComplianceRoadmap = () => {
    return (
      <div className="mt-4 border-t border-gray-100 pt-4 animate-in slide-in-from-top-2 duration-300">
        {(() => {
          // Determine if signed/approved PI exists
          const isPiApproved =
            activeQuote.approvedPiUploaded ||
            !!(
              activeQuote.workflow?.pi?.fileName ||
              activeQuote.workflow?.signed?.fileName
            );

          // Determine if signed CI and PL are on record
          const isCiSigned = !!activeQuote.workflow?.ci?.fileName;
          const isPlSigned = !!activeQuote.workflow?.pl?.fileName;

          return (
            <>
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
                    <span className="bg-blue-50/60 border border-blue-100 text-blue-900 text-xs font-extrabold px-2.5 py-1 rounded uppercase flex items-center gap-1">
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
                      <span className="block text-[9px] uppercase text-emerald-500 font-sans tracking-wider leading-none mb-0.5">
                        Step 1
                      </span>
                      <span>RFQ Prepared</span>
                    </div>
                  </div>

                  {/* Pipeline Node 2: Proforma Invoice Issued */}
                  <div className="p-2 border rounded-xl bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-2 text-xs font-bold shadow-xs">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="block text-[9px] uppercase text-emerald-500 font-sans tracking-wider leading-none mb-0.5">
                        Step 2
                      </span>
                      <span>Proforma Issued</span>
                    </div>
                  </div>

                  {/* Pipeline Node 3: Signed Approved PI Received */}
                  <div
                    className={`p-2 border rounded-xl flex items-center gap-2 text-xs font-bold transition ${
                      isPiApproved
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-900 border-amber-200 animate-pulse"
                    }`}
                  >
                    {isPiApproved ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <span
                        className={`block text-[9px] uppercase font-sans tracking-wider leading-none mb-0.5 ${isPiApproved ? "text-emerald-500" : "text-amber-500"}`}
                      >
                        Step 3
                      </span>
                      <span>PI Signed Back</span>
                    </div>
                  </div>

                  {/* Pipeline Node 4: Commercial Invoice issued */}
                  <div
                    className={`p-2 border rounded-xl flex items-center gap-2 text-xs font-bold transition ${
                      isCiSigned
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : isPiApproved
                          ? "bg-indigo-50 text-indigo-900 border-indigo-200"
                          : "bg-gray-50 text-gray-400 border-gray-200"
                    }`}
                  >
                    {isCiSigned ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 border border-gray-300 rounded-full block shrink-0" />
                    )}
                    <div>
                      <span className="block text-[9px] uppercase font-sans tracking-wider text-gray-400 leading-none mb-0.5">
                        Step 4
                      </span>
                      <span>CI Completed</span>
                    </div>
                  </div>

                  {/* Pipeline Node 5: Cargo Packing List filed */}
                  <div
                    className={`p-2 border rounded-xl flex items-center gap-2 text-xs font-bold transition ${
                      isPlSigned
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : isPiApproved
                          ? "bg-emerald-50/10 text-emerald-700 border-emerald-100"
                          : "bg-gray-50 text-gray-400 border-gray-200"
                    }`}
                  >
                    {isPlSigned ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 border border-gray-300 rounded-full block shrink-0" />
                    )}
                    <div>
                      <span className="block text-[9px] uppercase font-sans tracking-wider text-gray-400 leading-none mb-0.5">
                        Step 5
                      </span>
                      <span>Pack List Locked</span>
                    </div>
                  </div>
                </div>

                {/* INTEGRATED DOCK COMPILER SHEET OVERVIEW */}
                {(() => {
                  const isCiLoaded = !!activeQuote.workflow?.ci?.fileName;
                  const isPlLoaded = !!activeQuote.workflow?.pl?.fileName;
                  const isBlLoaded =
                    !!activeQuote.workflow?.shipping_invoice?.fileName ||
                    !!activeQuote.blNo;
                  const isCooLoaded =
                    !!activeQuote.workflow?.shipping_bill?.fileName;
                  const isPhytoLoaded = !!activeQuote.workflow?.phyto?.fileName;

                  const isDocSelected = (key: string) => {
                    const isLoaded =
                      key === "ci"
                        ? isCiLoaded
                        : key === "pl"
                          ? isPlLoaded
                          : key === "bl"
                            ? isBlLoaded
                            : key === "coo"
                              ? isCooLoaded
                              : key === "phyto"
                                ? isPhytoLoaded
                                : false;

                    if (excludedCombinedDocs[key] !== undefined) {
                      return excludedCombinedDocs[key];
                    }
                    return isLoaded;
                  };

                  const toggleDocSelection = (key: string) => {
                    setExcludedCombinedDocs((prev) => ({
                      ...prev,
                      [key]: !isDocSelected(key),
                    }));
                  };

                  const selectedKeys = [
                    "ci",
                    "pl",
                    "bl",
                    "coo",
                    "phyto",
                  ].filter((k) => isDocSelected(k));

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
                              Generates a unified high-resolution export pack in
                              sequential order with document title on each page.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Checklist cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                        {[
                          {
                            key: "ci",
                            name: "Commercial Invoice (CI)",
                            loaded: isCiLoaded,
                            stepLabel: "S1",
                          },
                          {
                            key: "pl",
                            name: "Packing List (PL)",
                            loaded: isPlLoaded,
                            stepLabel: "S2",
                          },
                          {
                            key: "bl",
                            name: "Bill of Lading (OBL/BL)",
                            loaded: isBlLoaded,
                            stepLabel: "S3",
                          },
                          {
                            key: "coo",
                            name: "Certificate of Origin (COO)",
                            loaded: isCooLoaded,
                            stepLabel: "S4",
                          },
                          {
                            key: "phyto",
                            name: "Phytosanitary (PHYTO)",
                            loaded: isPhytoLoaded,
                            stepLabel: "S5",
                          },
                        ].map((doc) => {
                          const selected = isDocSelected(doc.key);
                          return (
                            <div
                              key={doc.key}
                              onClick={() => toggleDocSelection(doc.key)}
                              className={`cursor-pointer p-3 border rounded-xl flex flex-col justify-between h-[96px] text-left transition select-none ${
                                selected
                                  ? doc.loaded
                                    ? "bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-3xs"
                                    : "bg-indigo-50/50 border-indigo-200 text-indigo-950 shadow-3xs"
                                  : "bg-slate-50/40 border-slate-200 text-slate-400 hover:bg-slate-50"
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
                                  <span className="inline-flex items-center gap-1 text-[8px] text-emerald-600 bg-emerald-100/50 px-1.5 py-0.5 rounded font-bold uppercase">
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
                            Selected Pages to Compile:{" "}
                            <strong className="text-indigo-600 font-bold">
                              {selectedKeys.length} page(s)
                            </strong>
                          </span>
                          <span className="text-[10px] uppercase font-mono text-slate-400 block tracking-wide font-extrabold mt-0.5">
                            ORDER: CI → PL → BL → COO → PHYTO
                          </span>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          {selectedKeys.length === 0 ? (
                            <button
                              disabled
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-200 text-slate-400 text-xs font-bold font-sans rounded-xl cursor-not-allowed border border-slate-300"
                            >
                              <Download className="w-4 h-4 shrink-0" />
                              Select Docs to Compile
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadCombinedPDF(
                                  activeQuote,
                                  selectedKeys,
                                );
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
            </>
          );
        })()}
      </div>
    );
  };

  if (isStandaloneCompliance && standaloneQuoteId) {
    if (!activeQuote) {
      return (
        <div className="p-12 text-center text-gray-500 font-bold bg-slate-50 min-h-screen">
          Quote Data loading or not found... (ID: {activeQuoteId}, Quotes
          Loaded: {savedQuotes.length})
          <br />
          {savedQuotes.length > 0
            ? "This quote ID does not exist in your current workspace."
            : "Fetching workspace data..."}
          <br />
          Available IDs: {savedQuotes.map((q) => String(q.id)).join(", ")}
        </div>
      );
    }
    return (
      <div
        className="bg-slate-50 min-h-screen p-4 sm:p-8 lg:p-12"
        id="standalone-compliance-roadmap"
      >
        <div className="max-w-6xl mx-auto">{renderComplianceRoadmap()}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="saved-quotes-archive-page">
      {quoteToDelete !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 text-red-600 mb-2">
              <Trash2 className="w-6 h-6" />
              <h3 className="font-extrabold text-lg">Delete Record?</h3>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this quote record permanently?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-4">
              <button
                onClick={cancelDeleteQuote}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteQuote}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {paymentQuoteToConfirm !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
          >
            {paymentConfirmStep === 3 ? (
              <div className="flex flex-col items-center justify-center p-4 space-y-3 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-extrabold text-lg text-emerald-800">Tracking Added!</h3>
                <p className="text-sm text-gray-500">
                  This shipment is now active in the Payment Tracker.
                </p>
                <button
                  onClick={() => {
                    setPaymentQuoteToConfirm(null);
                    setPaymentConfirmStep(1);
                  }}
                  className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors text-sm w-full"
                >
                  OK
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 text-indigo-600 mb-2">
                  <DollarSign className="w-6 h-6" />
                  <h3 className="font-extrabold text-lg">
                    {paymentConfirmStep === 1 ? "Step 1" : "Step 2"}
                  </h3>
                </div>
                <p className="text-sm font-semibold text-gray-800 bg-indigo-50 p-4 border border-indigo-100 rounded-lg">
                  {paymentConfirmStep === 1 
                    ? "1. Shipped to consignee?" 
                    : "2. Has reached the port and customer has received the goods?"}
                </p>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setPaymentQuoteToConfirm(null);
                      setPaymentConfirmStep(1);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (paymentConfirmStep === 1) {
                        setPaymentConfirmStep(2);
                      } else {
                        const q = paymentQuoteToConfirm;
                        const updatedQuote = { ...q };
                        updatedQuote.paymentTracker = {
                          enabled: true,
                          shippedDate: q.workflow?.shipping_invoice?.fileName ? new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                          paymentTermsDays: 30,
                          expectedAmount: (updatedQuote.items || []).reduce((sum, item) => sum + (item.fobRate || item.rate || 0) * (item.quantity || (item.numFCL * item.weightPerContainerKg) || 0), 0) || 0,
                          usdRateAtShipment: updatedQuote.items && updatedQuote.items[0]?.exrate ? updatedQuote.items[0].exrate : 83.50,
                          status: "on_ship"
                        };
                        const filtered = savedQuotes.map(sq => sq.id === q.id ? updatedQuote : sq);
                        setSavedQuotes(filtered);
                        setPaymentConfirmStep(3);
                      }
                    }}
                    className="flex-[1.5] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors text-sm"
                  >
                    {paymentConfirmStep === 1 ? "Yes, Proceed" : "Start Tracking"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {!!activeQuoteId && (
        <motion.div
          drag
          dragMomentum={false}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{ animation: "fade-in 0.3s ease-out" }}
        >
          <button
            onClick={() => setActiveQuoteId(null)}
            className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-white px-3.5 py-2 rounded-full shadow-2xl hover:bg-slate-800/90 hover:border-slate-600 transition-all font-bold text-[10px] uppercase tracking-wide opacity-85 hover:opacity-100"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to All Quotes
          </button>
        </motion.div>
      )}
      {docScanProgress && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 shadow-2xl p-6 space-y-5 overflow-hidden"
            id="pdf-scanner-modal"
          >
            {/* Header portion */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl animate-pulse">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 tracking-tight flex items-center gap-1.5">
                    <span>Export Compliance Scanner</span>
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase rounded">
                      v1.4 Smart Scan
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 font-medium font-sans truncate max-w-[280px]">
                    Checking:{" "}
                    <span className="font-mono text-gray-700 font-bold">
                      {docScanProgress.fileName}
                    </span>
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
                    <div className="bg-emerald-100 text-emerald-700 p-0.5 rounded-full">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : docScanProgress.step === "size-exceeded" ? (
                    <div className="bg-rose-100 text-rose-700 p-0.5 rounded-full">
                      <X className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="bg-gray-100 text-gray-500 p-0.5 rounded-full animate-spin">
                      <Loader2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-bold text-gray-800 block">
                    File Size Verification (&le; 10 MB PDF)
                  </span>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Your file size:{" "}
                    <span className="font-mono text-gray-700 font-bold">
                      {(docScanProgress.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    {docScanProgress.fileSize <= 10 * 1024 * 1024
                      ? " • Size complies with customs guidelines."
                      : " • Error: Exceeds 10 MB threshold."}
                  </p>
                </div>
              </div>

              {/* Step B: Binary Magic Header Check (%PDF- magic number) */}
              <div className="flex items-start gap-3 text-xs bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/60">
                <div className="mt-0.5">
                  {[
                    "checked-bytes",
                    "keywords",
                    "matched",
                    "mismatch",
                    "unknown-content",
                  ].includes(docScanProgress.step) ? (
                    <div className="bg-emerald-100 text-emerald-700 p-0.5 rounded-full">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : docScanProgress.step === "invalid-format" ? (
                    <div className="bg-rose-100 text-rose-700 p-0.5 rounded-full">
                      <X className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="bg-indigo-100 text-gray-500 p-0.5 rounded-full">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-bold text-gray-800 block">
                    PDF Structure & Format Integrity Check
                  </span>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Verifying MIME format type & secure{" "}
                    <span className="font-mono bg-gray-100 px-1 py-0.5 text-gray-700 rounded">
                      %PDF-
                    </span>{" "}
                    byte structures.
                  </p>
                </div>
              </div>

              {/* Step C: Scanning content and matching categories */}
              <div className="flex items-start gap-3 text-xs bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/60">
                <div className="mt-0.5">
                  {["matched"].includes(docScanProgress.step) ? (
                    <div className="bg-emerald-100 text-emerald-700 p-0.5 rounded-full">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : ["mismatch", "unknown-content"].includes(
                      docScanProgress.step,
                    ) ? (
                    <div className="bg-amber-100 text-amber-700 p-0.5 rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                  ) : docScanProgress.step === "keywords" ? (
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
                  <span className="font-bold text-gray-800 block">
                    Export Content Keyword Verification
                  </span>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Parsing ASCII streams to ensure file is structurally
                    matching:{" "}
                    <span className="font-extrabold text-blue-700">
                      {docScanProgress.expectedTypeLabel}
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic scanning display panels depending on current validation state */}
            <div className="border border-gray-100 bg-gray-50/75 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2">
              {docScanProgress.step === "analyzing" && (
                <>
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                    Analyzing File Sizing Codes
                  </span>
                  <p className="text-[10.5px] text-gray-500 max-w-xs font-sans">
                    Reading file size values and extension structures to verify
                    if compliant with 10MB limits.
                  </p>
                </>
              )}
              {docScanProgress.step === "checked-bytes" && (
                <>
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                    Reading %PDF Magic Byte Channels
                  </span>
                  <p className="text-[10.5px] text-gray-500 max-w-xs font-sans">
                    Decompressing file header streams to verify cryptographic
                    validity against doctype indicators.
                  </p>
                </>
              )}
              {docScanProgress.step === "keywords" && (
                <>
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                    Scanning ASCII Text Streams
                  </span>
                  <p className="text-[10.5px] text-gray-500 max-w-xs font-sans">
                    Searching for proforma, commercial, packing, and
                    agricultural health declaration tags.
                  </p>
                </>
              )}
              {docScanProgress.step === "size-exceeded" && (
                <>
                  <ShieldAlert className="w-10 h-10 text-rose-600" />
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-widest block">
                    Upload Blocked: File Size Exceeded
                  </span>
                  <p className="text-[11px] text-slice-600 max-w-xs leading-relaxed font-sans">
                    This file is{" "}
                    <span className="font-extrabold text-gray-800">
                      {(docScanProgress.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    . To ensure optimal document rendering, uploads must be
                    strictly restricted to{" "}
                    <span className="font-extrabold">10 MB PDF only</span>.
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
              {docScanProgress.step === "invalid-format" && (
                <>
                  <ShieldAlert className="w-10 h-10 text-rose-600" />
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-widest block font-sans">
                    File Format Blocked: PDF Only
                  </span>
                  <p className="text-[11px] text-slate-600 max-w-xs leading-relaxed font-sans">
                    {docScanProgress.confidenceDetails ||
                      "Export records and compliance drafts are strictly limited to official PDF (.pdf) documents only for regulatory integrity."}
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
              {docScanProgress.step === "matched" && (
                <>
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-pulse" />
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-widest block font-sans">
                    Compliance Verification Successful!
                  </span>
                  <p className="text-[11px] text-slate-600 max-w-xs leading-relaxed font-sans font-medium">
                    {docScanProgress.confidenceDetails} Save locked correctly.
                  </p>
                  <span className="text-[9.5px] font-mono text-emerald-500 italic">
                    Centralized registry database updated live.
                  </span>
                </>
              )}
              {docScanProgress.step === "mismatch" && (
                <>
                  <ShieldAlert className="w-10 h-10 text-amber-500" />
                  <span className="text-xs font-black text-amber-700 uppercase tracking-widest block font-sans">
                    Document Verification Conflicting!
                  </span>
                  <p className="text-[11px] text-slate-600 max-w-sm leading-normal font-medium font-sans">
                    You uploaded a file into the{" "}
                    <span className="font-extrabold text-blue-700">
                      {docScanProgress.expectedTypeLabel}
                    </span>{" "}
                    archive slot, but keyword scan identified this document as a{" "}
                    <span className="font-extrabold text-amber-700">
                      {docScanProgress.matchedLabel}
                    </span>
                    .
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
                            applyVerifiedFileSave(
                              docScanProgress.expectedTypeKey,
                              docScanProgress.tempFileToSave.name,
                              docScanProgress.tempFileToSave.size,
                            );
                            setDocScanProgress((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    step: "matched",
                                    confidenceDetails:
                                      "Bypassed verification warnings. Document forced back into the records.",
                                  }
                                : null,
                            );
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
              {docScanProgress.step === "unknown-content" && (
                <>
                  <AlertTriangle className="w-10 h-10 text-amber-500" />
                  <span className="text-xs font-black text-amber-700 uppercase tracking-widest block font-sans">
                    Unverified Document Keywords
                  </span>
                  <p className="text-[11px] text-slate-600 max-w-sm leading-tight font-sans">
                    We scanned the PDF but could not detect standard keyword
                    markers for{" "}
                    <span className="font-bold text-indigo-700">
                      {docScanProgress.expectedTypeLabel}
                    </span>
                    . This could be due to dynamic invoice headers.
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
                            applyVerifiedFileSave(
                              docScanProgress.expectedTypeKey,
                              docScanProgress.tempFileToSave.name,
                              docScanProgress.tempFileToSave.size,
                            );
                            setDocScanProgress((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    step: "matched",
                                    confidenceDetails:
                                      "Unverified document has been filed successfully on trust.",
                                  }
                                : null,
                            );
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
              🔒 Standard Security Sandboxing • All files processed strictly
              locally in your browser
            </p>
          </div>
        </div>
      )}
      <div className="page-header no-print flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="breadcrumb">📦 Operations Directory</div>
          <h2 className="text-xl font-extrabold tracking-tight">
            SHIP DOCS & SAVED QUOTES
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Monitor your workflow stages, file signed crop contracts, manage
            customs documents, and track loading logs offline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isViren && (
            <>
              <button
                onClick={handleSeedDemoShipments}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4" /> Seed 3 Sample Shipments (Grain,
                Spices, Tiles)
              </button>
              <button
                onClick={handleCreateBlankRecord}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" /> Create Blank Document Record
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Search & Operations Filter Board */}
      <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-gray-200 border-t-4 border-t-indigo-500 shadow-sm space-y-4 mb-4 no-print flex flex-col lg:flex-row lg:flex-wrap gap-5 items-stretch lg:items-center justify-between">
        {/* Search Panel */}
        <div className="w-full lg:flex-1 space-y-2">
          <span className="text-[10px] uppercase font-black text-indigo-800 tracking-widest block">
            Interactive Search Lookup
          </span>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-indigo-500" />
            <input
              type="text"
              placeholder="Search by ID, Ref, Buyer, Bill of Lading, Container seal, Destination, Port, Commodity brand, custom files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-2 text-xs font-semibold text-gray-800 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            />
          </div>
          {search && (
            <div className="text-[10px] text-indigo-600 font-extrabold flex items-center gap-1 animate-in fade-in duration-100">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />{" "}
              Found {sortedFilteredQuotes.length} matching files & logs out of{" "}
              {savedQuotes.length} records.
            </div>
          )}
        </div>

        {/* Date Sorting Controls */}
        <div className="w-full lg:w-auto space-y-2 min-w-0">
          <span className="text-[10px] uppercase font-black text-indigo-800 tracking-widest block">
            Sort by Quote Date
          </span>
          <div className="flex gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 w-fit">
            <button
              type="button"
              onClick={() => setDateSortOrder("desc")}
              className={`px-3 py-1.5 text-[9.5px] font-black uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                dateSortOrder === "desc"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200 hover:text-slate-800"
              }`}
              title="Sort latest first (descending)"
            >
              <span>Latest ▽</span>
            </button>
            <button
              type="button"
              onClick={() => setDateSortOrder("asc")}
              className={`px-3 py-1.5 text-[9.5px] font-black uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                dateSortOrder === "asc"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200 hover:text-slate-800"
              }`}
              title="Sort oldest first (ascending)"
            >
              <span>Oldest △</span>
            </button>
          </div>
        </div>

        {/* Fast Action Document Filters */}
        <div className="w-full lg:w-auto space-y-2 min-w-0">
          <span className="text-[10px] uppercase font-black text-indigo-800 tracking-widest block">
            Fast Document Type Filter
          </span>
          <div className="flex flex-wrap gap-1">
            {[
              {
                key: "all",
                label: "All Docs",
                count: industryFilteredQuotes.length,
              },
              {
                key: "quote",
                label: "Quotes",
                count: industryFilteredQuotes.filter(
                  (q) => q.piStatus === "offer" || !q.piStatus,
                ).length,
              },
              {
                key: "pi",
                label: "Proformas (PI)",
                count: industryFilteredQuotes.filter(
                  (q) => q.piStatus === "pi" || q.piStatus === "signed",
                ).length,
              },
              {
                key: "ci",
                label: "Invoices (CI)",
                count: industryFilteredQuotes.filter(
                  (q) =>
                    q.piStatus === "payment" ||
                    q.piStatus === "milling" ||
                    q.piStatus === "inspection" ||
                    q.piStatus === "bl" ||
                    q.piStatus === "done",
                ).length,
              },
              {
                key: "pl",
                label: "Pack List (PL)",
                count: industryFilteredQuotes.filter(
                  (q) =>
                    q.piStatus === "milling" ||
                    q.piStatus === "inspection" ||
                    q.piStatus === "bl" ||
                    q.piStatus === "done",
                ).length,
              },
              {
                key: "bl",
                label: "B/L Release",
                count: industryFilteredQuotes.filter(
                  (q) => q.piStatus === "bl" || q.piStatus === "done",
                ).length,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setDocTypeFilter(tab.key as any)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 ${
                  docTypeFilter === tab.key
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200/80 hover:text-gray-800"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[8.5px] tracking-normal font-bold font-mono ${
                    docTypeFilter === tab.key
                      ? "bg-indigo-800 text-indigo-100 shadow-inner"
                      : "bg-gray-200/80 text-gray-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* CSV Export Button */}
        <div className="w-full lg:w-auto space-y-2 min-w-0">
          <span className="text-[10px] uppercase font-black text-indigo-800 tracking-widest block">
            Offline Export
          </span>
          <button
            onClick={() => {
              const headers = ["Quote ID", "Ref", "Date", "Company", "Buyer", "Destination", "Incoterm", "Rate", "Total FCLs", "Total Weight (MT)", "Commodities"];
              const rows = sortedFilteredQuotes.map(q => {
                const fcls = q.items?.reduce((s, i) => s + (Number(i.numFCL) || 0), 0) || 0;
                const weight = q.items?.reduce((s, i) => s + (Number(i.totalWeightKg) || 0), 0) || 0;
                const rate = q.items?.[0]?.rate || 0;
                const commodities = Array.from(new Set(q.items?.map(i => i.commodity) || [])).join(" + ");
                return [
                  q.id,
                  `"${q.ref?.replace(/"/g, '""') || ''}"`,
                  `"${q.date?.replace(/"/g, '""') || ''}"`,
                  `"${q.company?.replace(/"/g, '""') || ''}"`,
                  `"${q.buyer?.replace(/"/g, '""') || ''}"`,
                  `"${q.dest?.replace(/"/g, '""') || ''}"`,
                  `"${q.cond?.replace(/"/g, '""') || ''}"`,
                  rate,
                  fcls,
                  (weight / 1000).toFixed(2),
                  `"${commodities.replace(/"/g, '""')}"`
                ].join(",");
              });
              const csvString = [headers.join(","), ...rows].join("\n");
              const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement("a");
              if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `SavedQuotes_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }}
            className="px-4 py-1.5 text-[9.5px] font-black uppercase rounded-lg transition-all cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm border border-emerald-700 h-[28px]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {selectedQuoteIds.length > 0 && !activeQuoteId && (
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl mb-4 no-print flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              {selectedQuoteIds.length}
            </span>
            <span className="text-indigo-900 font-bold text-sm">
              Documents Selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedQuoteIds([])}
              className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 rounded-lg transition tracking-wide uppercase"
            >
              Clear
            </button>
            <button
              onClick={() => setPreviewMode("batch_merged" as any)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition shadow-sm uppercase tracking-wide"
            >
              <Printer className="w-4 h-4" /> Merge & Print PDFs
            </button>
          </div>
        </div>
      )}

      <div
        className={`grid grid-cols-1 ${activeQuoteId ? "lg:grid-cols-3" : "lg:grid-cols-3"} gap-6 items-start no-print transition-all duration-300`}
      >
        {/* LEFT COLUMN: ACTIVE ARCHIVES LIST */}
        <div
          className={`card bg-white p-4 border border-gray-200 rounded-xl shadow-xs space-y-4 lg:col-span-1 transition-all ${activeQuoteId ? "bg-slate-50/50" : ""}`}
        >
          <div className="flex items-center justify-between border-b pb-2 mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
              Offer Archives
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {!activeQuoteId && displayQuotes.length > 0 && (
                <button
                  type="button"
                  className="text-[9px] uppercase font-bold text-gray-500 hover:text-indigo-600 transition tracking-wider"
                  onClick={() => {
                    if (selectedQuoteIds.length === displayQuotes.length) {
                      setSelectedQuoteIds([]);
                    } else {
                      setSelectedQuoteIds(displayQuotes.map(q => q.id));
                    }
                  }}
                >
                  {selectedQuoteIds.length === displayQuotes.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
              <span className="text-[10.5px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                {sortedFilteredQuotes.length} Total
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {displayQuotes.length === 0 ? (
              <div className="text-center py-8 px-4 space-y-3">
                <p className="text-gray-400 text-xs italic">
                  {savedQuotes.length === 0
                    ? "You haven't saved any offers yet."
                    : "No results matching your query."}
                </p>
                {savedQuotes.length === 0 && isViren && (
                  <button
                    onClick={handleSeedDemoShipments}
                    className="w-full justify-center bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Click to
                    Seed 3 Sample Shipments
                  </button>
                )}
              </div>
            ) : (
              displayQuotes.map((q) => {
                const stepIdx = getStageIndex(q.piStatus);
                const percent = Math.round(
                  ((stepIdx + 1) / STAGES.length) * 100,
                );
                const isActive = activeQuoteId === q.id;

                if (!!activeQuoteId && activeQuoteId !== 0 && !isActive)
                  return null;

                const isPi =
                  q.approvedPiUploaded ||
                  !!(q.workflow?.pi?.fileName || q.workflow?.signed?.fileName);
                const isCi = !!q.workflow?.ci?.fileName;
                const isPl = !!q.workflow?.pl?.fileName;
                const isBl =
                  !!q.workflow?.shipping_invoice?.fileName ||
                  !!q.workflow?.bl?.fileName;

                if (isActive) {
                  return (
                    <div
                      key={q.id}
                      onClick={() => setActiveQuoteId(null)}
                      className="p-3 border rounded-xl cursor-pointer bg-blue-50/70 border-blue-400 transition-all text-xs relative shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-3 border-b border-blue-200/60 pb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-black text-blue-900 text-[13px]">
                            {q.ref}
                          </span>
                          {isQuoteArchived(q.id) && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-black uppercase tracking-wider select-none">
                              Archived (Free Limit)
                            </span>
                          )}
                          {q.isPaidCredit && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-black uppercase tracking-wider select-none">
                              Single Credit Applied
                            </span>
                          )}
                        </div>
                        <span
                          className="text-[9px] text-blue-700 font-extrabold uppercase flex items-center gap-0.5 hover:text-blue-900 bg-blue-100 rounded px-1.5 py-0.5"
                          title="Close and return to list"
                        >
                          <X className="w-3 h-3" /> Back
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-6 h-6 rounded bg-indigo-100 border border-indigo-200 text-indigo-800 text-[9.5px] font-black uppercase flex items-center justify-center shrink-0"
                          title="Buyer Initials"
                        >
                          {getInitials(q.buyer)}
                        </div>
                        <div className="font-bold text-gray-900 uppercase truncate flex-1 leading-snug">
                          {q.buyer}
                        </div>
                      </div>

                      {/* Display small status boxes for the active item */}
                      <div className="grid grid-cols-5 gap-1.5">
                        <div
                          className={`flex flex-col items-center justify-center py-2 rounded-lg border ${isPi ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs" : "bg-white border-gray-200 text-gray-400"}`}
                        >
                          <span className="text-[9px] font-black uppercase mb-0.5 tracking-wider">
                            PI
                          </span>
                          {isPi ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </div>
                        <div
                          className={`flex flex-col items-center justify-center py-2 rounded-lg border ${isCi ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs" : "bg-white border-gray-200 text-gray-400"}`}
                        >
                          <span className="text-[9px] font-black uppercase mb-0.5 tracking-wider">
                            CI
                          </span>
                          {isCi ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </div>
                        <div
                          className={`flex flex-col items-center justify-center py-2 rounded-lg border ${isPl ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs" : "bg-white border-gray-200 text-gray-400"}`}
                        >
                          <span className="text-[9px] font-black uppercase mb-0.5 tracking-wider">
                            PL
                          </span>
                          {isPl ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </div>
                        <div
                          className={`flex flex-col items-center justify-center py-2 rounded-lg border ${isBl ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs" : "bg-white border-gray-200 text-gray-400"}`}
                        >
                          <span className="text-[9px] font-black uppercase mb-0.5 tracking-wider">
                            BL
                          </span>
                          {isBl ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!q.paymentTracker?.enabled) {
                              setPaymentQuoteToConfirm(q);
                              setPaymentConfirmStep(1);
                            } else {
                              const updatedQuote = { ...q };
                              updatedQuote.paymentTracker.enabled = false;
                              const filtered = savedQuotes.map(sq => sq.id === q.id ? updatedQuote : sq);
                              setSavedQuotes(filtered);
                            }
                          }}
                          className={`flex flex-col items-center justify-center py-2 rounded-lg border cursor-pointer hover:bg-opacity-80 transition ${q.paymentTracker?.enabled ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                          title="Toggle Payment Tracking"
                        >
                          <span className="text-[8px] font-black uppercase mb-0.5 tracking-wider text-center leading-tight">
                            TRACK<br/>PAY
                          </span>
                          {q.paymentTracker?.enabled ? (
                            <DollarSign className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />
                          ) : (
                            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={q.id}
                    onClick={() => setActiveQuoteId(isActive ? null : q.id)}
                    className={`p-3 border rounded-xl cursor-pointer group hover:border-blue-400 transition-all text-xs relative border-gray-200 ${selectedQuoteIds.includes(q.id) ? "bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300" : "bg-gray-50/50"}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <input
                          type="checkbox"
                          checked={selectedQuoteIds.includes(q.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedQuoteIds((prev) => [...prev, q.id]);
                            else setSelectedQuoteIds((prev) => prev.filter((id) => id !== q.id));
                          }}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600/50 cursor-pointer"
                        />
                        <span className="font-mono font-black text-gray-950 block text-[12px] group-hover:text-blue-700 transition animate-in fade-in duration-100">
                          {q.ref}
                        </span>
                        {isQuoteArchived(q.id) && (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-black uppercase tracking-wider select-none">
                            Archived (Free Limit)
                          </span>
                        )}
                        {q.isPaidCredit && (
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-black uppercase tracking-wider select-none">
                            Single Credit Applied
                          </span>
                        )}

                        {/* Option A: Standalone popup trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const portOrigin =
                              q.portOfLoading ||
                              q.placeOfReceipt ||
                              "Mundra Port, India";
                            const portDest = q.dest || "Qatar";
                            const url = `${window.location.origin}${window.location.pathname}?vessels=true&ref=${encodeURIComponent(q.ref)}&origin=${encodeURIComponent(portOrigin)}&dest=${encodeURIComponent(portDest)}`;
                            window.open(url, "_blank");
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
                          handleDeleteQuote(e, q.id);
                        }}
                        className="text-gray-400 hover:text-red-500 rounded p-1"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <div
                        className="w-6 h-6 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase flex items-center justify-center shrink-0 select-none"
                        title="Buyer Initials"
                      >
                        {getInitials(q.buyer)}
                      </div>
                      <div className="font-black text-gray-900 uppercase truncate flex-1 leading-snug">
                        {q.buyer}
                      </div>
                    </div>
                    <div className="text-[10.5px] text-gray-500 uppercase truncate mt-1 pl-8 flex items-center gap-1">
                      <span
                        className="font-bold bg-slate-100 border border-slate-200 text-slate-700 text-[8.5px] px-1 py-0.2 rounded"
                        title="Company Initials"
                      >
                        CO: {getInitials(q.company)}
                      </span>
                      <span>
                        {q.company} • {q.dest}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-200/60 text-[10px] font-semibold text-gray-500">
                      <span className="text-gray-400 font-mono font-bold flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" /> {fmtDate(q.date)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wide bg-white border ${
                          q.piStatus === "done"
                            ? "text-green-700 border-green-200"
                            : q.piStatus === "offer"
                              ? "text-blue-700 border-blue-200"
                              : "text-indigo-700 border-indigo-200"
                        }`}
                      >
                        Stage {stepIdx + 1}/{STAGES.length}:{" "}
                        {STAGES[stepIdx]?.label}
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

          {activeQuote && isQuoteArchived(activeQuote.id) && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mt-4 text-left space-y-1 select-none animate-in fade-in duration-200">
              <span className="font-extrabold text-amber-800 uppercase text-[10px] tracking-wider block">
                ⚠ Archived Quotation (Free Limit Cap)
              </span>
              <p className="text-xs text-amber-700 leading-normal font-sans">
                This quotation folder exceeds your Free Tier allowance of 2 concurrent saved folders. You can view all compiled document grids, but editing is disabled. Delete older folders, apply a Single-Shipment Credit, or upgrade to a premium plan to restore full editing capabilities.
              </p>
            </div>
          )}

          {/* Compliance Roadmap Toggle Button  */}
          {activeQuote && (
            <div className="pt-3 border-t border-gray-200 mt-4 flex flex-col sm:flex-row justify-center gap-3 w-full flex-wrap">
              <button
                onClick={() => setIsRoadmapExpanded(!isRoadmapExpanded)}
                className="text-[10px] font-extrabold uppercase text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-indigo-200"
              >
                {isRoadmapExpanded ? (
                  <>
                    <span>Hide Compliance Lifecycle Roadmap</span>
                    <span>△</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Compliance Lifecycle Roadmap</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsChecklistOpen(true)}
                className="text-[10px] font-extrabold uppercase text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-blue-200"
                title="Open Shipment Document Audit Checklist"
              >
                <span>📋 Audit Checklist</span>
                <span className="bg-blue-600 text-blue-700 rounded-full text-[9px] px-1.5 py-0.2 ml-1 font-extrabold">
                  {progressPct}%
                </span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    "/?compliance=true&quoteId=" + activeQuote.id,
                    "_blank",
                  );
                }}
                className="text-[10px] font-extrabold uppercase text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-indigo-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Roadmap in New Tab</span>
              </button>

              {onLaunchWorkspace && !isQuoteArchived(activeQuote.id) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditorExpanded(!isEditorExpanded);
                  }}
                  className="text-[10px] font-extrabold uppercase text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-teal-700 w-full sm:w-auto"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>
                    {isEditorExpanded
                      ? "Hide Inline Editor"
                      : "Open in-screen to Edit"}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* COMPLIANCE ROADMAP MODAL */}
          {isRoadmapExpanded && activeQuote && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-900/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsRoadmapExpanded(false)}
            >
              <div
                className="bg-slate-50 border border-slate-700 shadow-2xl rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Simulated Browser Window Header */}
                <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5 mr-4 lg:mr-8 px-2 py-1 items-center">
                      <div
                        className="w-3 h-3 rounded-full bg-red-500/80 cursor-pointer hover:bg-red-500"
                        onClick={() => setIsRoadmapExpanded(false)}
                        title="Close"
                      ></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500/80 lg:hidden xl:block"></div>
                    </div>
                    <div className="bg-slate-950 rounded-lg border border-slate-800/80 px-4 py-1.5 text-[10px] sm:text-xs text-slate-400 font-mono font-medium flex items-center gap-2 min-w-[200px] sm:min-w-[300px] overflow-hidden truncate">
                      <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                      <span className="truncate">
                        secure-compliance-portal://quote-
                        {activeQuote.ref.toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsRoadmapExpanded(false)}
                    className="p-1.5 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition-colors shrink-0"
                    title="Close Roadmap"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body - Scrollable */}
                <div className="overflow-y-auto w-full p-4 sm:p-8 lg:p-12 bg-slate-50 flex-1 relative">
                  <div className="max-w-6xl mx-auto">
                    {renderComplianceRoadmap()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN 2-PANELS: STAGE TRACKER & FILE BINDINGS */}
        <div className={`lg:col-span-2 space-y-4 transition-all duration-300`}>
          {activeQuote ? (
            <>
              {(() => {
                // Determine if signed/approved PI exists
                const isPiApproved =
                  activeQuote.approvedPiUploaded ||
                  !!(
                    activeQuote.workflow?.pi?.fileName ||
                    activeQuote.workflow?.signed?.fileName
                  );

                // Determine if signed CI and PL are on record
                const isCiSigned = !!activeQuote.workflow?.ci?.fileName;
                const isPlSigned = !!activeQuote.workflow?.pl?.fileName;

                // Handle direct file binding simulation helper
                const attachDocumentRecord = (
                  typeKey: "pi" | "ci" | "pl",
                  name: string,
                ) => {
                  setSavedQuotes((prev) =>
                    prev.map((q) => {
                      if (q.id === activeQuote.id) {
                        const wf = q.workflow || {};
                        const freshStep: PIWorkflowStep = {
                          date: todayISO(),
                          label: `Signed ${typeKey.toUpperCase()} uploaded & locked`,
                          fileName: name,
                          fileSize: 450000 + Math.floor(Math.random() * 150000),
                        };

                        let docAttrs: Partial<SavedQuote> = {};
                        if (typeKey === "pi") {
                          docAttrs.approvedPiUploaded = true;
                          docAttrs.approvedPiFileName = name;
                          docAttrs.piStatus = "signed"; // advance stage in list
                        } else if (typeKey === "ci") {
                          docAttrs.piStatus = "milling";
                        } else if (typeKey === "pl") {
                          docAttrs.piStatus = "inspection";
                        }

                        return {
                          ...q,
                          ...docAttrs,
                          workflow: {
                            ...wf,
                            [typeKey]: freshStep,
                          },
                        };
                      }
                      return q;
                    }),
                  );
                  alert(
                    `Successfully attached signed record "${name}" under centralized quote reference ${activeQuote.ref}!`,
                  );
                };

                return (
                  <div className="space-y-4">
                    {/* ACTIVE SHIPMENT DATA & PROFORMA EDITOR (IN THAT SPACE) */}
                    {isEditorExpanded && (
                      <>
                        <div
                          className="card bg-white p-5 border border-indigo-200/50 rounded-xl shadow-xs space-y-4 text-left"
                          id="document-making-editor-card"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                            <div>
                              <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2.5 py-1 rounded-sm font-mono font-bold tracking-wider uppercase">
                                ACTIVE SHIPMENT DATA & PROFORMA EDITOR
                              </span>
                              <h3 className="font-extrabold text-sm text-gray-900 uppercase mt-1">
                                Fast-Track Live Data Revisions & Overrides
                              </h3>
                            </div>
                          </div>

                          <p className="text-xs text-gray-500 leading-relaxed font-sans">
                            Modify container loads, bag size specifications, and
                            landed values below. These overrides will seamlessly
                            propagate to all generated **A4 Proforma (PI)** and
                            **Commercial Invoice (CI)** output sheets instantly.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border border-indigo-100 bg-indigo-50/30 p-4 rounded-xl text-left">
                            <div className="col-span-full mb-1">
                              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest border-b border-indigo-200 block pb-1">
                                Document Information & Consignee
                              </span>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                Buyer Name
                              </label>
                              <input
                                type="text"
                                className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono"
                                value={editorMetadata.buyer || ""}
                                onChange={(e) =>
                                  setEditorMetadata({
                                    ...editorMetadata,
                                    buyer: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                Destination
                              </label>
                              <input
                                type="text"
                                className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono"
                                value={editorMetadata.dest || ""}
                                onChange={(e) =>
                                  setEditorMetadata({
                                    ...editorMetadata,
                                    dest: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                Validity (Date)
                              </label>
                              <input
                                type="date"
                                className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono"
                                value={editorMetadata.valid || ""}
                                onChange={(e) =>
                                  setEditorMetadata({
                                    ...editorMetadata,
                                    valid: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                Payment Terms
                              </label>
                              <input
                                type="text"
                                className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono"
                                value={editorMetadata.terms || ""}
                                onChange={(e) =>
                                  setEditorMetadata({
                                    ...editorMetadata,
                                    terms: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                Company (Exporter Name)
                              </label>
                              <input
                                type="text"
                                className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono"
                                value={editorMetadata.company || ""}
                                onChange={(e) =>
                                  setEditorMetadata({
                                    ...editorMetadata,
                                    company: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="sm:col-span-2 md:col-span-3">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                Full Exporter Details (For PI/CI/PL)
                              </label>
                              <textarea
                                placeholder="Leave blank to use default. Enter multi-line name & address..."
                                className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono min-h-[40px]"
                                value={editorMetadata.exporterDetails || ""}
                                onChange={(e) =>
                                  setEditorMetadata({
                                    ...editorMetadata,
                                    exporterDetails: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="sm:col-span-2 md:col-span-3">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                Buyer Location / Address
                              </label>
                              <textarea
                                className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono min-h-[40px]"
                                value={editorMetadata.buyerLoc || ""}
                                onChange={(e) =>
                                  setEditorMetadata({
                                    ...editorMetadata,
                                    buyerLoc: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="sm:col-span-2 md:col-span-3">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                Full Consignee Details (For PI/CI/PL)
                              </label>
                              <textarea
                                placeholder="Leave blank to use default. Enter multi-line name & address..."
                                className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono min-h-[40px]"
                                value={editorMetadata.consigneeDetails || ""}
                                onChange={(e) =>
                                  setEditorMetadata({
                                    ...editorMetadata,
                                    consigneeDetails: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>

                          {/* Active items inputs table or list layout */}
                          <div className="space-y-4">
                            {editorItems.map((row, idx) => {
                              return (
                                <div
                                  key={row.id || idx}
                                  className="p-4 border border-slate-100 bg-slate-50/45 rounded-xl space-y-3 text-left"
                                >
                                  {idx === 0 && (
                                    <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border border-blue-100 p-2.5 rounded-lg flex flex-wrap items-center justify-between gap-2 mb-1">
                                      <div className="flex flex-wrap items-center gap-1.5 leading-none">
                                        <span className="bg-blue-600 text-white font-mono font-black text-[9px] px-2 py-0.5 rounded tracking-wide">
                                          QUOTE: #{activeQuote.ref}
                                        </span>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-[10px] font-black text-blue-950 uppercase">
                                          👤 BUYER: {activeQuote.buyer}
                                        </span>
                                      </div>
                                      <span className="text-[8.5px] text-blue-600 font-mono font-extrabold uppercase bg-white border border-blue-100 px-1.5 py-0.2 rounded shadow-2xs">
                                        ACTIVE DOCUMENT DRAFT
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-200">
                                    <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-tight">
                                      Item #{idx + 1}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] uppercase font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                        Original Rate: $
                                        {activeQuote.items[idx]?.rate ||
                                          row.rate}
                                        /MT
                                      </span>
                                      {editorItems.length > 1 && (
                                        <button
                                          onClick={() =>
                                            setEditorItems((prev) =>
                                              prev.filter((_, i) => i !== idx),
                                            )
                                          }
                                          className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1 rounded"
                                          title="Remove Item"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                    {/* Commodity Name */}
                                    <div className="col-span-1 sm:col-span-2 md:col-span-3">
                                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                        Commodity Name (e.g., Rice, Spice)
                                      </label>
                                      <input
                                        type="text"
                                        value={row.commodity || ""}
                                        onChange={(e) =>
                                          handleItemEditorChange(
                                            idx,
                                            "commodity",
                                            e.target.value,
                                          )
                                        }
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                      />
                                    </div>

                                    {/* 1. Commodity Brand */}
                                    <div>
                                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                        Commodity Brand
                                      </label>
                                      <input
                                        type="text"
                                        value={row.brand || ""}
                                        onChange={(e) =>
                                          handleItemEditorChange(
                                            idx,
                                            "brand",
                                            e.target.value,
                                          )
                                        }
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
                                        onChange={(e) =>
                                          handleItemEditorChange(
                                            idx,
                                            "numFCL",
                                            e.target.value,
                                          )
                                        }
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
                                        onChange={(e) =>
                                          handleItemEditorChange(
                                            idx,
                                            "weightPerContainerKg",
                                            e.target.value,
                                          )
                                        }
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
                                        onChange={(e) =>
                                          handleItemEditorChange(
                                            idx,
                                            "rate",
                                            e.target.value,
                                          )
                                        }
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
                                        value={row.packed || ""}
                                        onChange={(e) =>
                                          handleItemEditorChange(
                                            idx,
                                            "packed",
                                            e.target.value,
                                          )
                                        }
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
                                        value={row.size || ""}
                                        onChange={(e) =>
                                          handleItemEditorChange(
                                            idx,
                                            "size",
                                            e.target.value,
                                          )
                                        }
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                      />
                                    </div>
                                  </div>

                                  {/* Show Live Computed Totals */}
                                  <div className="bg-indigo-50/50 rounded-xl p-3 flex items-center justify-between text-indigo-950 mt-1.5 border border-indigo-100 text-xs">
                                    <div>
                                      <span className="block text-[9px] uppercase font-bold text-indigo-400 font-sans">
                                        Total Cargo Load MT
                                      </span>
                                      <span className="text-xs font-black font-mono">
                                        {(
                                          (row.totalWeightKg || 0) / 1000
                                        ).toFixed(3)}{" "}
                                        Metric Tons
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="block text-[9px] uppercase font-bold text-indigo-400 font-sans">
                                        Total Target Packing
                                      </span>
                                      <span className="text-xs font-black font-mono">
                                        {(row.totalBags || 0).toLocaleString()}{" "}
                                        Bags
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <button
                            onClick={() => {
                              const blankItem: PIItem = {
                                id: Date.now(),
                                commodity: "Sample Commodity",
                                rate: 500,
                                totalBags: 1000,
                                brand: "Generic",
                                size: "50 KG",
                                packed: "PP Bags",
                                numFCL: 4,
                                weightPerContainerKg: 25000,
                                totalWeightKg: 100000,
                              } as unknown as PIItem;
                              setEditorItems((prev) => [...prev, blankItem]);
                            }}
                            className="w-full bg-indigo-50 border border-indigo-200 border-dashed text-indigo-700 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add New Commodity Item
                          </button>

                          {/* Revision note section */}
                          <div className="pt-2 text-left">
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1 tracking-wider">
                              📝 Document Making Notes & Revision Remarks
                              (Auto-timestamps updates)
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
                              <CheckCircle2 className="w-4 h-4 text-indigo-100" />
                              <span>
                                Save & Overwrite Active PI/CI Document Data
                              </span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* BEAUTIFUL POPUP COMPLIANCE CHECKLIST MODAL */}
                    {isChecklistOpen && (
                      <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-opacity"
                        onClick={() => setIsChecklistOpen(false)}
                      >
                        <div
                          className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col scale-100 transition-transform"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Modal Header */}
                          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
                            <div>
                              <span className="bg-blue-100 text-blue-800 text-[10px] px-2.5 py-1 rounded-md font-mono font-bold tracking-wider uppercase">
                                Compliance Checklist Popup
                              </span>
                              <h3 className="font-extrabold text-sm text-gray-900 uppercase mt-0.5 flex items-center gap-1.5">
                                <span>{industryLabel} Module</span>
                                <span className="text-gray-300 font-light">
                                  •
                                </span>
                                <span className="text-gray-500 font-sans tracking-wide">
                                  Shipment Document Audit Checklist
                                </span>
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
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider font-sans text-left block">
                                  Overall Checklist Progress
                                </span>
                                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mt-1 max-w-[250px]">
                                  <div
                                    className={`h-full transition-all duration-300 ${progressPct === 100 ? "bg-emerald-600" : "bg-blue-600"}`}
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono text-gray-950 font-extrabold text-xs tracking-tight">
                                  {completedCount} of{" "}
                                  {combinedChecklistItems.length} Docs Checked (
                                  {progressPct}%)
                                </span>
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
                                        toggleChecklistItem(
                                          activeQuote.id,
                                          item.key,
                                        );
                                      }
                                    }}
                                    className={`py-3 flex flex-col gap-1.5 group select-none cursor-pointer hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition ${item.isDone ? "bg-emerald-50/20 hover:bg-emerald-50/40" : ""}`}
                                  >
                                    <div className="flex items-start gap-3.5">
                                      <div
                                        className="mt-0.5 shrink-0"
                                        onClick={(e) => {
                                          if (item.autoMatched) {
                                            e.stopPropagation();
                                          }
                                        }}
                                      >
                                        {item.isDone ? (
                                          <div
                                            className={`p-0.5 rounded-md border flex items-center justify-center transition-all ${
                                              item.autoMatched
                                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                                : "bg-emerald-600 text-white border-emerald-700"
                                            }`}
                                          >
                                            <Check className="w-4.5 h-4.5 text-current stroke-[3]" />
                                          </div>
                                        ) : (
                                          <div className="w-5 h-5 rounded-md border border-gray-300 bg-white group-hover:border-blue-400 transition" />
                                        )}
                                      </div>

                                      <div className="flex-1 min-w-0 space-y-0.5 text-left">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span
                                            className={`font-extrabold text-xs tracking-tight ${item.isDone ? "text-emerald-700 font-bold" : "text-gray-800"}`}
                                          >
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
                                            <span className="bg-red-50 text-red-600 border border-red-100 text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded">
                                              Mandatory
                                            </span>
                                          ) : (
                                            <span className="bg-gray-100 text-gray-500 border border-gray-200 text-[8.5px] font-bold uppercase px-1.5 py-0.2 rounded">
                                              Optional
                                            </span>
                                          )}
                                        </div>
                                        <p
                                          className={`text-[11px] leading-snug font-medium ${item.isDone ? "text-emerald-600/90" : "text-gray-500"}`}
                                        >
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
                                  <span>
                                    Add Custom Compliance / Document Task
                                  </span>
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
                                        setNewCustomLabel("");
                                        setNewCustomDesc("");
                                      }}
                                      className="text-gray-400 hover:text-gray-700 font-bold cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div>
                                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                                        Task / Document Name
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="e.g. Health Certificate"
                                        value={newCustomLabel}
                                        onChange={(e) =>
                                          setNewCustomLabel(e.target.value)
                                        }
                                        className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs text-gray-800"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                                        Task Description / Criteria
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="e.g. Formally stamped by Ministry"
                                        value={newCustomDesc}
                                        onChange={(e) =>
                                          setNewCustomDesc(e.target.value)
                                        }
                                        className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs text-gray-800"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 justify-between text-xs pt-1">
                                    <label className="flex items-center gap-1.5 font-bold text-gray-700 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={newCustomRequired}
                                        onChange={(e) =>
                                          setNewCustomRequired(e.target.checked)
                                        }
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span>This task is Mandatory</span>
                                    </label>

                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowAddCustomForm(false);
                                          setNewCustomLabel("");
                                          setNewCustomDesc("");
                                        }}
                                        className="px-2.5 py-1 text-gray-500 hover:bg-gray-100 rounded text-xs font-semibold cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (newCustomLabel.trim()) {
                                            addCustomChecklistItem(
                                              activeQuote.id,
                                              newCustomLabel,
                                              newCustomDesc,
                                              newCustomRequired,
                                            );
                                            setNewCustomLabel("");
                                            setNewCustomDesc("");
                                            setNewCustomRequired(true);
                                            setShowAddCustomForm(false);
                                          } else {
                                            alert(
                                              "Please specify a Task Name.",
                                            );
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
                            <p className="text-xs text-gray-500 leading-relaxed max-w-[320px] mx-auto font-medium">
                              Are you sure you want to save and lock these final
                              modifications? This will irreversibly rewrite
                              active Proforma & Commercial invoice totals and
                              log the date-stamped note to reports.
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

                    {/* DYNAMIC DOCUMENTS GENERATOR PLATFORM */}
                    <div className="card bg-white p-5 border border-gray-200 rounded-xl shadow-xs space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-[10.5px] font-black text-gray-500 uppercase tracking-widest block">
                          Export Compliance Document Workspaces
                        </span>
                        <span className="text-[9.5px] italic text-slate-400">
                          A4 Portrait Grid Calibration
                        </span>
                      </div>

                      <div className="space-y-4">
                        {/* DOCUMENT BLOCK 1: PROFORMA INVOICE */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/25 flex flex-wrap items-center justify-between gap-4 w-full">
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
                                  Generate initial export agreements, lock down
                                  rates, and custom bank codes.
                                </p>
                              </div>
                            </div>

                            {/* Record display */}
                            <div className="pt-2 text-[11px] flex gap-2">
                              <span className="text-gray-400 font-semibold font-mono">
                                Status:
                              </span>
                              {isPiApproved ? (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  {activeQuote.approvedPiFileName ||
                                    activeQuote.workflow?.pi?.fileName ||
                                    activeQuote.workflow?.signed?.fileName ||
                                    "Signed PI Record is verified & saved"}
                                </span>
                              ) : (
                                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold flex items-center gap-1 animate-pulse">
                                  ⚠ Draft Created. Waiting for approved signed
                                  copy upload.
                                </span>
                              )}
                            </div>
                            {renderFileControls("pi")}
                          </div>

                          <div className="flex flex-wrap gap-2 items-center">
                            {/* Print Actions */}
                            <button
                              onClick={() => setPreviewMode("pi")}
                              className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-black flex items-center gap-1 transition"
                            >
                              <Search className="w-3.5 h-3.5" /> Preview PDF
                            </button>
                            <button
                              onClick={() =>
                                onLaunchWorkspace?.(activeQuote.id, "pi", false)
                              }
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black transition-all"
                            >
                              ✏️ Edit A4 PI (Inline)
                            </button>
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}${window.location.pathname}?workspace=true&quoteId=${activeQuote.id}&type=pi`;
                                window.open(url, "_blank");
                              }}
                              className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-black flex items-center gap-1 transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Open Tab
                            </button>

                            {/* Simulated Upload signed version */}
                            <label className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer rounded-lg text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1">
                              <Upload className="w-3.5 h-3.5" /> File Signed
                              copy
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleIncomingFile(file, "pi");
                                }}
                              />
                            </label>

                            {!isPiApproved && (
                              <button
                                onClick={() =>
                                  applyVerifiedFileSave(
                                    activeQuote.id,
                                    "pi",
                                    `SIGNED_CONTRACT_PI-${activeQuote.ref}.pdf`,
                                    380000,
                                  )
                                }
                                className="px-2 py-1 bg-gray-100 hover:bg-emerald-600 text-gray-700 hover:text-white rounded text-[10px] font-bold transition"
                                title="Fast-Track Approval automatically"
                              >
                                Auto Approve
                              </button>
                            )}
                          </div>
                        </div>

                        {/* DOCUMENT BLOCK 1.5: CUSTOMER SPECIFICATION (OPTIONAL) */}
                        <div className="border border-dashed border-indigo-300 rounded-xl p-4 bg-indigo-50/10 flex flex-wrap items-center justify-between gap-4 w-full">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl block">
                                <Paperclip className="w-5 h-5 text-indigo-600" />
                              </span>
                              <div>
                                <h4 className="font-extrabold text-xs text-gray-900 uppercase flex items-center gap-1.5">
                                  <span>Customer Specifications</span>
                                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[8px] font-black uppercase rounded">
                                    Optional
                                  </span>
                                </h4>
                                <p className="text-[11px] text-gray-500 leading-none">
                                  Attach customer requirements, standards, or specifications (PDF or Image).
                                </p>
                              </div>
                            </div>

                            {/* Record display */}
                            <div className="pt-2 text-[11px] flex gap-2">
                              <span className="text-gray-400 font-semibold font-mono">
                                Spec Status:
                              </span>
                              {activeQuote.workflow?.customer_spec?.fileName ? (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  {activeQuote.workflow.customer_spec.fileName}
                                </span>
                              ) : (
                                <span className="text-gray-500 bg-gray-50 px-2 py-0.5 rounded font-medium">
                                  No spec attached (Using standard industry specs)
                                </span>
                              )}
                            </div>
                            {renderFileControls("customer_spec")}
                          </div>

                          <div className="flex flex-wrap gap-2 items-center">
                            {/* Upload customer specifications */}
                            <label className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-pointer rounded-lg text-xs font-bold hover:bg-indigo-100 transition flex items-center gap-1">
                              <Upload className="w-3.5 h-3.5" /> 
                              <span>Upload Customer Spec</span>
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleIncomingFile(file, "customer_spec");
                                }}
                              />
                            </label>

                            {activeQuote.workflow?.customer_spec?.fileName && (
                              <button
                                onClick={() => {
                                  setSavedQuotes((prev) =>
                                    prev.map((q) => {
                                      if (q.id === activeQuote.id) {
                                        const wf = { ...(q.workflow || {}) };
                                        delete wf.customer_spec;
                                        return {
                                          ...q,
                                          workflow: wf,
                                        };
                                      }
                                      return q;
                                    })
                                  );
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition"
                                title="Remove customer specification file"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                        {/* DOCUMENT BLOCK 2: COMMERCIAL INVOICE */}
                        <div
                          className={`border rounded-xl p-4 transition-all relative ${
                            isPiApproved
                              ? "border-gray-200 bg-gray-50/25"
                              : "border-gray-200/60 bg-gray-100/30 opacity-70 select-none"
                          }`}
                        >
                          {!isPiApproved && (
                            <div className="absolute inset-0 bg-white/40 z-10 rounded-xl flex items-center justify-center p-4 text-center">
                              <div className="bg-gray-900 text-white rounded-xl py-1.5 px-3 flex items-center gap-2 text-[10px] font-bold shadow-lg">
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                                <span>
                                  CI Workspace Unlocks when Signed Approved PI
                                  copy is uploaded back for records
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-4 w-full">
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
                                    Calculates financial settlements, dynamic
                                    Indian lakhs word amounts, and carriage
                                    logs.
                                  </p>
                                </div>
                              </div>

                              <div className="pt-2 text-[11px] flex gap-2">
                                <span className="text-gray-400 font-semibold font-mono">
                                  Status:
                                </span>
                                {isCiSigned ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5 shrink-0" />
                                    {activeQuote.workflow?.ci?.fileName ||
                                      "Signed Commercial Invoice file verified & on record"}
                                  </span>
                                ) : (
                                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                    ⚠ Pending custom stamp uploading. Edit page
                                    to generate A4 sheet.
                                  </span>
                                )}
                              </div>
                              {renderFileControls("ci")}
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                              <button
                                disabled={!isPiApproved}
                                onClick={() => setPreviewMode("ci")}
                                className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-black flex items-center gap-1 transition disabled:opacity-50"
                              >
                                <Search className="w-3.5 h-3.5" /> Preview PDF
                              </button>
                              <button
                                disabled={!isPiApproved}
                                onClick={() =>
                                  onLaunchWorkspace?.(
                                    activeQuote.id,
                                    "ci",
                                    false,
                                  )
                                }
                                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-black transition-all disabled:pointer-events-none"
                              >
                                ✏️ Edit A4 CI (Inline)
                              </button>
                              <button
                                disabled={!isPiApproved}
                                onClick={() => {
                                  const url = `${window.location.origin}${window.location.pathname}?workspace=true&quoteId=${activeQuote.id}&type=ci`;
                                  window.open(url, "_blank");
                                }}
                                className="px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 rounded-lg text-xs font-black flex items-center gap-1 transition disabled:pointer-events-none"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Open
                                Tab
                              </button>

                              <label className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer rounded-lg text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1">
                                <Upload className="w-3.5 h-3.5" /> File Signed
                                copy
                                <input
                                  type="file"
                                  className="hidden"
                                  disabled={!isPiApproved}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleIncomingFile(file, "ci");
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* DOCUMENT BLOCK 3: PACKING LIST */}
                        <div
                          className={`border rounded-xl p-4 transition-all relative ${
                            isPiApproved
                              ? "border-gray-200 bg-gray-50/25"
                              : "border-gray-200/60 bg-gray-100/30 opacity-70 select-none"
                          }`}
                        >
                          {!isPiApproved && (
                            <div className="absolute inset-0 bg-white/40 z-10 rounded-xl flex items-center justify-center p-4 text-center">
                              <div className="bg-gray-900 text-white rounded-xl py-1.5 px-3 flex items-center gap-2 text-[10px] font-bold shadow-lg">
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                                <span>
                                  PL Workspace Unlocks when Signed Approved PI
                                  copy is uploaded back for records
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-4 w-full">
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
                                    Configure cargo stuffing lists, container
                                    lot seals, gross/net weights, and packaging.
                                  </p>
                                </div>
                              </div>

                              <div className="pt-2 text-[11px] flex gap-2">
                                <span className="text-gray-400 font-semibold font-mono">
                                  Status:
                                </span>
                                {isPlSigned ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5 shrink-0" />
                                    {activeQuote.workflow?.pl?.fileName ||
                                      "Signed Packing Specifications verified & locks verified"}
                                  </span>
                                ) : (
                                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                    ⚠ Pending custom stamp uploading. Edit page
                                    to generate A4 sheet.
                                  </span>
                                )}
                              </div>
                              {renderFileControls("pl")}
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                              <button
                                disabled={!isPiApproved}
                                onClick={() => setPreviewMode("pl")}
                                className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-black flex items-center gap-1 transition disabled:opacity-50"
                              >
                                <Search className="w-3.5 h-3.5" /> Preview PDF
                              </button>
                              <button
                                disabled={!isPiApproved}
                                onClick={() =>
                                  onLaunchWorkspace?.(
                                    activeQuote.id,
                                    "pl",
                                    false,
                                  )
                                }
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-all disabled:pointer-events-none"
                              >
                                ✏️ Edit A4 PL (Inline)
                              </button>
                              <button
                                disabled={!isPiApproved}
                                onClick={() => {
                                  const url = `${window.location.origin}${window.location.pathname}?workspace=true&quoteId=${activeQuote.id}&type=pl`;
                                  window.open(url, "_blank");
                                }}
                                className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-black flex items-center gap-1 transition disabled:pointer-events-none"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Open
                                Tab
                              </button>

                              <label className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer rounded-lg text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1">
                                <Upload className="w-3.5 h-3.5" /> File Signed
                                copy
                                <input
                                  type="file"
                                  className="hidden"
                                  disabled={!isPiApproved}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleIncomingFile(file, "pl");
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
                          Upload Shipping Bill, Phyto, COO, APEDA & Fumigation
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Verify and upload regulatory compliance certificates
                          to finalize port dispatch. All team members see
                          updates instantly.
                        </p>
                      </div>

                      {/* Notification Banner when CI & PL are ready */}
                      {!!activeQuote.workflow?.ci?.fileName &&
                        !!activeQuote.workflow?.pl?.fileName && (
                          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 w-full">
                            <div>
                              <h5 className="text-[11px] font-black text-indigo-900 uppercase flex items-center gap-1">
                                <BadgeCheck className="w-4 h-4 text-emerald-600" />
                                Documents Ready for Clearance
                              </h5>
                              <p className="text-[10.5px] mt-1 text-indigo-700 leading-tight">
                                CI and PL are finalized. Send document
                                generation requests for Phyto, COO, APEDA, and
                                Fumigation to your shippers/CHA immediately.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const subject = encodeURIComponent(
                                    `Action Required: Generate Phyto, COO, APEDA & Fumigation - Ref #RFQ-${activeQuote.id}`,
                                  );
                                  const body = encodeURIComponent(
                                    `Dear CHA / Shipping Partner,\n\nPlease find attached the finalized Commercial Invoice (CI) and Packing List (PL) for reference.\n\nKindly proceed to generate and share the following certificates at your earliest convenience:\n- Phytosanitary Certificate\n- Certificate of Origin (COO)\n- Fumigation Certificate\n- APEDA\n\nThanks,\nDispatches Team`,
                                  );
                                  window.open(
                                    `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`,
                                    "_blank",
                                  );
                                }}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <Mail className="w-3.5 h-3.5" /> Gmail Draft
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const subject = encodeURIComponent(
                                    `Action Required: Generate Phyto, COO, APEDA & Fumigation - Ref #RFQ-${activeQuote.id}`,
                                  );
                                  const body = encodeURIComponent(
                                    `Dear CHA / Shipping Partner,\n\nPlease find attached the finalized Commercial Invoice (CI) and Packing List (PL) for reference.\n\nKindly proceed to generate and share the following certificates at your earliest convenience:\n- Phytosanitary Certificate\n- Certificate of Origin (COO)\n- Fumigation Certificate\n- APEDA\n\nThanks,\nDispatches Team`,
                                  );
                                  window.open(
                                    `https://outlook.live.com/mail/0/deeplink/compose?subject=${subject}&body=${body}`,
                                    "_blank",
                                  );
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <Mail className="w-3.5 h-3.5" /> Outlook Draft
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const text = encodeURIComponent(
                                    `*Action Required:* Generate Phyto, COO, APEDA & Fumigation for Ref #RFQ-${activeQuote.id}\n\nPlease proceed to generate and share the Phytosanitary, COO, Fumigation and APEDA. Attached CI and PL for reference.`,
                                  );
                                  window.open(
                                    `https://wa.me/?text=${text}`,
                                    "_blank",
                                  );
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <MessageCircle className="w-3.5 h-3.5" /> WA
                                Request
                              </button>
                            </div>
                          </div>
                        )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                        {/* 1. SHIPPING BILL */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800 uppercase">
                              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                              <span>Shipping Bill (SB)</span>
                            </div>
                            <p className="text-[10.5px] text-gray-500 leading-tight">
                              Export Customs clearance bill filed at port
                              terminals.
                            </p>

                            <div className="pt-2 text-[10.5px]">
                              {activeQuote.workflow?.shipping_bill?.fileName ? (
                                <div className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">
                                    {
                                      activeQuote.workflow.shipping_bill
                                        .fileName
                                    }
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-700 font-medium italic bg-amber-50 px-2 py-0.5 rounded block text-center">
                                  ⚠ Pending Upload
                                </span>
                              )}
                            </div>
                            {renderFileControls("shipping_bill")}
                          </div>

                          <label className="w-full py-2 bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer rounded-lg text-[11px] font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1">
                            <Upload className="w-3.5 h-3.5" /> Upload SB PDF
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file)
                                  handleIncomingFile(file, "shipping_bill");
                              }}
                            />
                          </label>
                        </div>

                        {/* 2. PHYTO CERTIFICATE */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800 uppercase">
                              <BadgeCheck className="w-4 h-4 text-emerald-600" />
                              <span>Phyto Certificate</span>
                            </div>
                            <p className="text-[10.5px] text-gray-500 leading-tight">
                              Official food-grade phytosanitary health
                              clearance.
                            </p>

                            <div className="pt-2 text-[10.5px]">
                              {activeQuote.workflow?.phyto?.fileName ? (
                                <div className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">
                                    {activeQuote.workflow.phyto.fileName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-700 font-medium italic bg-amber-50 px-2 py-0.5 rounded block text-center">
                                  ⚠ Pending Upload
                                </span>
                              )}
                            </div>
                            {renderFileControls("phyto")}
                          </div>

                          <label className="w-full py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer rounded-lg text-[11px] font-bold hover:bg-emerald-100 transition flex items-center justify-center gap-1">
                            <Upload className="w-3.5 h-3.5" /> Upload Phyto PDF
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleIncomingFile(file, "phyto");
                              }}
                            />
                          </label>
                        </div>

                        {/* 3. SHIPPING INVOICE */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800 uppercase">
                              <Coins className="w-4 h-4 text-violet-600" />
                              <span>Shipping Invoice</span>
                            </div>
                            <p className="text-[10.5px] text-gray-500 leading-tight">
                              Final commercial dispatch invoice with vessel
                              codes.
                            </p>

                            <div className="pt-2 text-[10.5px]">
                              {activeQuote.workflow?.shipping_invoice
                                ?.fileName ? (
                                <div className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">
                                    {
                                      activeQuote.workflow.shipping_invoice
                                        .fileName
                                    }
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-700 font-medium italic bg-amber-50 px-2 py-0.5 rounded block text-center">
                                  ⚠ Pending Upload
                                </span>
                              )}
                            </div>
                            {renderFileControls("shipping_invoice")}
                          </div>

                          <label className="w-full py-2 bg-violet-50 text-violet-700 border border-violet-200 cursor-pointer rounded-lg text-[11px] font-bold hover:bg-violet-100 transition flex items-center justify-center gap-1">
                            <Upload className="w-3.5 h-3.5" /> Upload Invoice
                            PDF
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file)
                                  handleIncomingFile(file, "shipping_invoice");
                              }}
                            />
                          </label>
                        </div>

                        {/* 4. CERTIFICATE OF ORIGIN */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800 uppercase">
                              <FileBadge className="w-4 h-4 text-orange-600" />
                              <span>Certificate of Origin</span>
                            </div>
                            <p className="text-[10.5px] text-gray-500 leading-tight">
                              Chamber of Commerce approved origin certificate.
                            </p>

                            <div className="pt-2 text-[10.5px]">
                              {activeQuote.workflow?.coo?.fileName ? (
                                <div className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">
                                    {activeQuote.workflow.coo.fileName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-700 font-medium italic bg-amber-50 px-2 py-0.5 rounded block text-center">
                                  ⚠ Pending Upload
                                </span>
                              )}
                            </div>
                            {renderFileControls("coo")}
                          </div>

                          <label className="w-full py-2 bg-orange-50 text-orange-700 border border-orange-200 cursor-pointer rounded-lg text-[11px] font-bold hover:bg-orange-100 transition flex items-center justify-center gap-1">
                            <Upload className="w-3.5 h-3.5" /> Upload COO PDF
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleIncomingFile(file, "coo");
                              }}
                            />
                          </label>
                        </div>

                        {/* 5. APEDA CERTIFICATE */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800 uppercase">
                              <ScrollText className="w-4 h-4 text-rose-600" />
                              <span>APEDA / RCAC</span>
                            </div>
                            <p className="text-[10.5px] text-gray-500 leading-tight">
                              Export registration certificates and RCAC.
                            </p>

                            <div className="pt-2 text-[10.5px]">
                              {activeQuote.workflow?.apeda?.fileName ? (
                                <div className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">
                                    {activeQuote.workflow.apeda.fileName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-700 font-medium italic bg-amber-50 px-2 py-0.5 rounded block text-center">
                                  ⚠ Pending Upload
                                </span>
                              )}
                            </div>
                            {renderFileControls("apeda")}
                          </div>

                          <label className="w-full py-2 bg-rose-50 text-rose-700 border border-rose-200 cursor-pointer rounded-lg text-[11px] font-bold hover:bg-rose-100 transition flex items-center justify-center gap-1">
                            <Upload className="w-3.5 h-3.5" /> Upload APEDA PDF
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleIncomingFile(file, "apeda");
                              }}
                            />
                          </label>
                        </div>

                        {/* 6. FUMIGATION CERTIFICATE */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800 uppercase">
                              <BugOff className="w-4 h-4 text-cyan-600" />
                              <span>Fumigation</span>
                            </div>
                            <p className="text-[10.5px] text-gray-500 leading-tight">
                              Pest control fumigation treatment certificate.
                            </p>

                            <div className="pt-2 text-[10.5px]">
                              {activeQuote.workflow?.fumigation?.fileName ? (
                                <div className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">
                                    {activeQuote.workflow.fumigation.fileName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-700 font-medium italic bg-amber-50 px-2 py-0.5 rounded block text-center">
                                  ⚠ Pending Upload
                                </span>
                              )}
                            </div>
                            {renderFileControls("fumigation")}
                          </div>

                          <label className="w-full py-2 bg-cyan-50 text-cyan-700 border border-cyan-200 cursor-pointer rounded-lg text-[11px] font-bold hover:bg-cyan-100 transition flex items-center justify-center gap-1">
                            <Upload className="w-3.5 h-3.5" /> Upload Fumigation
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file)
                                  handleIncomingFile(file, "fumigation");
                              }}
                            />
                          </label>
                        </div>

                        {/* 7. LAB REPORT */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800 uppercase">
                              <svg
                                className="w-4 h-4 text-emerald-600"
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="m10 2 1.34 2h5.32L18 2" />
                                <path d="M14 2v2" />
                                <path d="m15 22 2-2 2 2" />
                                <path d="m19 22-2-2-2 2" />
                                <path d="m5 22 2-2 2 2" />
                                <path d="m9 22-2-2-2 2" />
                                <path d="M14 18V6H6v12Z" />
                              </svg>
                              <span>Lab Report</span>
                            </div>
                            <p className="text-[10.5px] text-gray-500 leading-tight">
                              Independent laboratory testing and analysis
                              report.
                            </p>

                            <div className="pt-2 text-[10.5px]">
                              {activeQuote.workflow?.lab_report?.fileName ? (
                                <div className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">
                                    {activeQuote.workflow.lab_report.fileName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-700 font-medium italic bg-amber-50 px-2 py-0.5 rounded block text-center">
                                  ⚠ Pending Upload
                                </span>
                              )}
                            </div>
                            {renderFileControls("lab_report")}
                          </div>

                          <label className="w-full py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer rounded-lg text-[11px] font-bold hover:bg-emerald-100 transition flex items-center justify-center gap-1">
                            <Upload className="w-3.5 h-3.5" /> Upload Lab Report
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file)
                                  handleIncomingFile(file, "lab_report");
                              }}
                            />
                          </label>
                        </div>

                        {/* 8. OTHER DOCUMENT */}
                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800 uppercase">
                              <FolderOpen className="w-4 h-4 text-slate-600" />
                              <span>Other Document</span>
                            </div>
                            <p className="text-[10.5px] text-gray-500 leading-tight">
                              Any miscellaneous supplementary or custom
                              compliance file.
                            </p>

                            <div className="pt-2 text-[10.5px]">
                              {activeQuote.workflow?.other_doc?.fileName ? (
                                <div className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">
                                    {activeQuote.workflow.other_doc.fileName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-700 font-medium italic bg-amber-50 px-2 py-0.5 rounded block text-center">
                                  ⚠ Pending Upload
                                </span>
                              )}
                            </div>
                            {renderFileControls("other_doc")}
                          </div>

                          <label className="w-full py-2 bg-slate-50 text-slate-700 border border-slate-200 cursor-pointer rounded-lg text-[11px] font-bold hover:bg-slate-100 transition flex items-center justify-center gap-1">
                            <Upload className="w-3.5 h-3.5" /> Upload Document
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleIncomingFile(file, "other_doc");
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* AUTO-TEST SUITE FOR DEVELOPMENT ONLY */}
                    {isViren && (
                      <div className="flex justify-end p-2">
                        <button
                          onClick={() => {
                            const keys = [
                              "pi",
                              "ci",
                              "pl",
                              "shipping_bill",
                              "phyto",
                              "shipping_invoice",
                              "coo",
                              "apeda",
                              "fumigation",
                              "lab_report",
                              "other_doc",
                            ];
                            keys.forEach((k) => {
                              setTimeout(() => {
                                applyVerifiedFileSave(
                                  activeQuote.id,
                                  k,
                                  `test_${k}_document_v1.pdf`,
                                  1024500,
                                );
                              }, 100);
                            });
                          }}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded"
                        >
                          🛠 TEST: Auto-Upload All Documents
                        </button>
                      </div>
                    )}

                    {/* B/L SHIPMENT TRACKING & CONTROL TOWER */}
                    <div className="card bg-slate-900 text-white p-5 sm:p-6 border border-slate-800 rounded-2xl shadow-xl space-y-5">
                      <div className="border-b border-slate-800 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-widest block">
                            Direct Dispatch & API Control Tower
                          </span>
                          <h4 className="font-extrabold text-sm text-white uppercase mt-1 flex items-center gap-1.5">
                            <Ship className="w-4 h-4 text-sky-400 animate-pulse" />
                            <span>
                              B/L Location & Client Auto-Email Tracker
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Manage container location drift, dispatch automated
                            status logs, and simulate real-time vessel email
                            notifications to buyers based on B/L and container
                            numbers.
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0 pt-1 md:pt-0">
                          <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-md">
                            Portal API Enabled
                          </span>
                        </div>
                      </div>

                      {/* Control Panel Parameters form */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">
                            Bill of Lading (B/L) ID
                          </label>
                          <input
                            type="text"
                            value={activeQuote.blNo || ""}
                            onChange={(e) =>
                              handleUpdateQuoteField("blNo", e.target.value)
                            }
                            placeholder="e.g. BL-MUNDRA-109"
                            className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 text-xs rounded-lg p-2 focus:outline-hidden text-white font-mono placeholder-slate-600"
                          />
                          <span className="text-[9px] text-slate-500 block">
                            Unique ID shared with client for public lookups.
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">
                            Container Number
                          </label>
                          <input
                            type="text"
                            value={activeQuote.containerNo || ""}
                            onChange={(e) =>
                              handleUpdateQuoteField(
                                "containerNo",
                                e.target.value,
                              )
                            }
                            placeholder="e.g. DPW-MU-79450-IND"
                            className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 text-xs rounded-lg p-2 focus:outline-hidden text-white font-mono placeholder-slate-600"
                          />
                          <span className="text-[9px] text-slate-500 block">
                            Unique physical steel box ID.
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">
                            Client Notify Email
                          </label>
                          <input
                            type="email"
                            value={activeQuote.trackingEmail || ""}
                            onChange={(e) =>
                              handleUpdateQuoteField(
                                "trackingEmail",
                                e.target.value,
                              )
                            }
                            placeholder="e.g. logistics@al-meera.qa"
                            className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 text-xs rounded-lg p-2 focus:outline-hidden text-white font-mono placeholder-slate-600"
                          />
                          <span className="text-[9px] text-slate-500 block">
                            Outbound address for automatic dispatch
                            notifications.
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">
                            Vessel Expected ETA
                          </label>
                          <input
                            type="date"
                            value={activeQuote.trackingEta || ""}
                            onChange={(e) =>
                              handleUpdateQuoteField(
                                "trackingEta",
                                e.target.value,
                              )
                            }
                            className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 text-xs rounded-lg p-2 focus:outline-hidden text-white font-mono"
                          />
                          <span className="text-[9px] text-slate-500 block">
                            Target arrival date displayed to buyer.
                          </span>
                        </div>
                      </div>

                      {/* Location transition drivers */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
                        <div className="space-y-1 text-center sm:text-left">
                          <span className="text-[10px] font-mono uppercase text-slate-500 block">
                            GPS Automation Drivers
                          </span>
                          <div className="flex items-center justify-center sm:justify-start gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                            <p className="text-xs text-slate-300 font-bold">
                              Current Milestones Logged:{" "}
                              <strong className="font-mono text-sky-400">
                                {activeQuote.trackingUpdates?.length || 0}{" "}
                                Checkpoints
                              </strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!activeQuote.paymentTracker?.enabled) {
                                setPaymentQuoteToConfirm(activeQuote);
                                setPaymentConfirmStep(1);
                              } else {
                                const updatedQuote = { ...activeQuote };
                                updatedQuote.paymentTracker.enabled = false;
                                const filtered = savedQuotes.map(q => q.id === activeQuote.id ? updatedQuote : q);
                                setSavedQuotes(filtered);
                              }
                            }}
                            className={`px-4 py-2 ${activeQuote.paymentTracker?.enabled ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'} rounded-lg text-xs font-black transition flex items-center gap-1 shadow-md`}
                          >
                            <DollarSign className="w-3.5 h-3.5 shrink-0" />
                            {activeQuote.paymentTracker?.enabled ? 'Payment Tracking Active' : 'Start Payment Tracking'}
                          </button>

                          <button
                            type="button"
                            onClick={handleSimulateTransitDrift}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-black transition flex items-center gap-1 shadow-md shadow-blue-500/10"
                          >
                            <Clock className="w-3.5 h-3.5 shrink-0" />⏳
                            Simulate 2-3 Day Transit Shift
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
                              onClick={() =>
                                handleClearTrackingHistory(activeQuote.id)
                              }
                              className="px-3 py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 rounded-lg text-xs font-semibold transition flex items-center"
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
                          const logsCount =
                            activeQuote.trackingUpdates?.length || 0;
                          let progressWidth = "0%";
                          if (logsCount === 1) progressWidth = "33%";
                          else if (logsCount === 2) progressWidth = "66%";
                          else if (logsCount >= 3) progressWidth = "100%";
                          return (
                            <div
                              className="absolute top-1/2 left-0 h-0.5 bg-sky-500 -translate-y-1/2 z-0 transition-all duration-500"
                              style={{ width: progressWidth }}
                            />
                          );
                        })()}

                        <div className="relative z-10 flex justify-between">
                          <div className="flex flex-col items-center">
                            <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-black">
                              1
                            </div>
                            <span className="text-[9px] font-bold uppercase text-slate-300 mt-1">
                              Ready
                            </span>
                          </div>

                          <div className="flex flex-col items-center">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition ${
                                (activeQuote.trackingUpdates?.length || 0) >= 1
                                  ? "bg-sky-600 text-white"
                                  : "bg-slate-800 text-slate-500"
                              }`}
                            >
                              2
                            </div>
                            <span
                              className={`text-[9px] font-bold uppercase mt-1 ${
                                (activeQuote.trackingUpdates?.length || 0) >= 1
                                  ? "text-slate-200 animate-pulse"
                                  : "text-slate-500"
                              }`}
                            >
                              Clear Port
                            </span>
                          </div>

                          <div className="flex flex-col items-center">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition ${
                                (activeQuote.trackingUpdates?.length || 0) >= 2
                                  ? "bg-sky-700 text-white"
                                  : "bg-slate-800 text-slate-500"
                              }`}
                            >
                              3
                            </div>
                            <span
                              className={`text-[9px] font-bold uppercase mt-1 ${
                                (activeQuote.trackingUpdates?.length || 0) >= 2
                                  ? "text-slate-200"
                                  : "text-slate-500"
                              }`}
                            >
                              Crossing
                            </span>
                          </div>

                          <div className="flex flex-col items-center">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition ${
                                (activeQuote.trackingUpdates?.length || 0) >=
                                  4 || activeQuote.piStatus === "done"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-800 text-slate-500"
                              }`}
                            >
                              4
                            </div>
                            <span
                              className={`text-[9px] font-bold uppercase mt-1 ${
                                (activeQuote.trackingUpdates?.length || 0) >=
                                  4 || activeQuote.piStatus === "done"
                                  ? "text-emerald-400"
                                  : "text-slate-500"
                              }`}
                            >
                              Delivered
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Location Checkpoints history feed stack */}
                      <div className="space-y-3">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                          Vessel GPS & Checkpoint Log Records
                        </span>

                        {activeQuote.trackingUpdates &&
                        activeQuote.trackingUpdates.length > 0 ? (
                          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                            {activeQuote.trackingUpdates
                              .slice()
                              .reverse()
                              .map((log, index) => (
                                <div
                                  key={log.id || index}
                                  className={`p-3.5 rounded-xl border flex gap-3 text-left ${
                                    index === 0
                                      ? "bg-sky-950/15 border-sky-900/40 text-white"
                                      : "bg-slate-950/50 border-slate-900/60 text-slate-300"
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
                                      <span
                                        className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded font-mono uppercase tracking-wider ${
                                          log.status.includes("Delivered")
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                            : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                        }`}
                                      >
                                        {log.status}
                                      </span>
                                      {log.emailSent && (
                                        <span className="text-[9.5px] text-slate-500 italic block">
                                          ✉ Live SMTP notified:{" "}
                                          <strong className="font-mono">
                                            {log.emailRecipient ||
                                              activeQuote.trackingEmail ||
                                              "Buyer"}
                                          </strong>
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
                          <div className="p-8 border border-dashed border-slate-800 bg-slate-950/30 rounded-xl text-center text-slate-500 font-mono text-xs">
                            No vessel GPS checkpoints recorded yet. Change or
                            enter a B/L ID above, set recipient email, and click
                            "Simulate Transit Shift" to initialize coordinate
                            updates.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CENTRAL FILES DIRECTORY SHOWROOM */}
                    <div className="card bg-white p-5 border border-gray-200 rounded-xl shadow-xs space-y-4">
                      <div className="border-b pb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                          Cargo Paperwork Record Room
                        </span>
                        <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          Secure offline folder
                        </span>
                      </div>

                      <div className="space-y-2">
                        {(() => {
                          const records = Object.entries(
                            activeQuote.workflow || {},
                          ).filter(([_, val]) => val.fileName);
                          if (records.length === 0) {
                            return (
                              <p className="text-gray-400 text-xs italic py-4 text-center">
                                No signed PDF documents filed for this shipment
                                yet. Generate A4 screens and upload signed
                                compliance records above.
                              </p>
                            );
                          }
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {records.map(([key, item]) => {
                                const sizeKb = item.fileSize
                                  ? Math.round(item.fileSize / 1024) || 1
                                  : "TBD";
                                return (
                                  <div
                                    key={key}
                                    className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-lg p-3"
                                  >
                                    <div className="space-y-1">
                                      <span className="font-extrabold text-indigo-700 uppercase block text-[9px] tracking-wider leading-none">
                                        FILED STAMP: {key.toUpperCase()}
                                      </span>
                                      <span className="font-sans font-bold text-gray-800 break-all block">
                                        {item.fileName}
                                      </span>
                                      <span className="text-[10px] text-gray-400 font-mono">
                                        Date locked: {fmtDate(item.date)} (
                                        {sizeKb} KB)
                                      </span>
                                    </div>
                                    <button
                                      onClick={() =>
                                        alert(
                                          `This was secure-saved locally inside the browser. Ready for physical printing or export!`,
                                        )
                                      }
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
                    {!(allowedModules || ["rate_calc"]).includes(
                      "quote_sharing",
                    ) ? (
                      <div className="card bg-slate-900 border border-slate-800 text-slate-400 p-5 rounded-xl text-center space-y-2">
                        <Lock className="w-7 h-7 text-slate-500 mx-auto" />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest block">
                          Outbound Broadcast Matrix Locked
                        </span>
                        <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
                          WhatsApp and Cloud SMTP mail direct transmissions are
                          disabled for this account membership level.
                        </p>
                      </div>
                    ) : (
                      <div className="card bg-gradient-to-r from-slate-900 to-indigo-950/95 border border-sky-900/30 text-white p-5 rounded-xl shadow-md space-y-4">
                        <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-sky-400">
                            <Share2 className="w-4 h-4 text-sky-400" />
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                              Outbound Client Transmission Console
                            </span>
                          </div>
                          <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded font-mono font-bold">
                            MODULE: QUOTE_SHARING
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                          Frictionless outbound transmission. Dispatch custom
                          PDF links and live GPS terminal tracking widgets
                          directly to customers on demand.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          {/* Mobile Number for WhatsApp */}
                          <div className="space-y-1.5 text-left">
                            <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">
                              WhatsApp Customer Phone
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">
                                +
                              </span>
                              <input
                                type="tel"
                                value={broadcasterMobile}
                                onChange={(e) =>
                                  setBroadcasterMobile(e.target.value)
                                }
                                placeholder="e.g. 91987541258"
                                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 text-xs rounded-lg p-2 pl-5 focus:outline-none text-white font-mono placeholder-slate-600"
                              />
                            </div>
                            <span className="text-[9px] text-slate-500 block text-slate-500">
                              Include country code (e.g., 91 for India).
                            </span>
                          </div>

                          {/* Customer Email */}
                          <div className="space-y-1.5 text-left">
                            <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">
                              Customer Email Address
                            </label>
                            <input
                              type="email"
                              value={broadcasterEmail}
                              onChange={(e) =>
                                setBroadcasterEmail(e.target.value)
                              }
                              placeholder="e.g. buyer@dubaitrading.com"
                              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 text-xs rounded-lg p-2 focus:outline-none text-white font-mono placeholder-slate-600"
                            />
                            <span className="text-[9px] text-slate-500 block text-slate-500">
                              Syncs back to client tracking profile.
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!broadcasterMobile.trim()) {
                                alert(
                                  "Please specify customer mobile phone before launching chat.",
                                );
                                return;
                              }

                              // Save phone locally back to active quote to preserve data entry
                              handleUpdateQuoteField(
                                "buyerPhone",
                                broadcasterMobile.trim(),
                              );

                              const firstItem = activeQuote.items?.[0] || null;
                              const tCommodity =
                                firstItem?.commodity || "Cargo";
                              const tRate = firstItem?.rate || 0;
                              const tCondition =
                                firstItem?.condition ||
                                activeQuote.cond ||
                                "FOB";

                              const msg = `*VNP Export Hub Update*%0A%0A*Quotation ID:* ${activeQuote.id}%0A*Commodity:* ${tCommodity}%0A*Dest:* ${activeQuote.dest}%0A*Buying Rate:* $${tRate} / Unit%0A*Incoterm:* ${tCondition}%0A%0ALive shipment tracker link: %0A${window.location.origin}/?lookup=${activeQuote.id}%0A%0AHave an exceptional day!`;
                              const cleanPh = broadcasterMobile.replace(
                                /\D/g,
                                "",
                              );
                              window.open(
                                `https://api.whatsapp.com/send?phone=${cleanPh}&text=${msg}`,
                                "_blank",
                              );
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
                                alert(
                                  "Please fill customer email before dispatching SMTP.",
                                );
                                return;
                              }

                              // Save email in db
                              handleUpdateQuoteField(
                                "trackingEmail",
                                broadcasterEmail.trim(),
                              );

                              const firstItem = activeQuote.items?.[0] || null;
                              const tCommodity =
                                firstItem?.commodity || "Cargo";
                              const tRate = firstItem?.rate || 0;
                              const tCondition =
                                firstItem?.condition ||
                                activeQuote.cond ||
                                "FOB";
                              const tNumFCL = firstItem?.numFCL || 1;
                              const tTotalWeightKg =
                                activeQuote.items?.reduce(
                                  (acc, x) => acc + (x.totalWeightKg || 0),
                                  0,
                                ) || 0;

                              const subject = `OFFICIAL COMPLIANCE QUOTE SHEET: RECORD ${activeQuote.id}`;
                              const body = `Dear Exporter Partner,\n\nThis is VNP SaaS Portal automatic dispatching service. Your transaction sheet has been synchronized inside our system workspace:\n\n===========================================\nQUOTE REGISTER CODE: ${activeQuote.id}\nCOMMODITY PRODUCT:   ${tCommodity}\nTOTAL CARGO VOLUME:  ${tNumFCL} FCL (Weight: ${(tTotalWeightKg / 1000).toFixed(1)} MT)\nfinal LANDED COST:   $ ${tRate} / Unit (${tCondition})\n===========================================\n\nClick below link to lookup logs, GPS coordinates, real-time ETA progress, and download Proforma invoices in PDF formats:\n${window.location.origin}/?lookup=${activeQuote.id}\n\nWe appreciate our ongoing basmati and tiles export cooperation.\n\nWarm regards,\nVNP Cloud Operations`;

                              window.open(
                                `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(broadcasterEmail.trim())}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
                                "_blank",
                              );
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 rounded-lg transition text-center flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Mail className="w-4 h-4 text-red-100 shrink-0" />
                            <span>Gmail Draft</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (!broadcasterEmail.trim()) {
                                alert(
                                  "Please fill customer email before dispatching SMTP.",
                                );
                                return;
                              }

                              // Save email in db
                              handleUpdateQuoteField(
                                "trackingEmail",
                                broadcasterEmail.trim(),
                              );

                              const firstItem = activeQuote.items?.[0] || null;
                              const tCommodity =
                                firstItem?.commodity || "Cargo";
                              const tRate = firstItem?.rate || 0;
                              const tCondition =
                                firstItem?.condition ||
                                activeQuote.cond ||
                                "FOB";
                              const tNumFCL = firstItem?.numFCL || 1;
                              const tTotalWeightKg =
                                activeQuote.items?.reduce(
                                  (acc, x) => acc + (x.totalWeightKg || 0),
                                  0,
                                ) || 0;

                              const subject = `OFFICIAL COMPLIANCE QUOTE SHEET: RECORD ${activeQuote.id}`;
                              const body = `Dear Exporter Partner,\n\nThis is VNP SaaS Portal automatic dispatching service. Your transaction sheet has been synchronized inside our system workspace:\n\n===========================================\nQUOTE REGISTER CODE: ${activeQuote.id}\nCOMMODITY PRODUCT:   ${tCommodity}\nTOTAL CARGO VOLUME:  ${tNumFCL} FCL (Weight: ${(tTotalWeightKg / 1000).toFixed(1)} MT)\nfinal LANDED COST:   $ ${tRate} / Unit (${tCondition})\n===========================================\n\nClick below link to lookup logs, GPS coordinates, real-time ETA progress, and download Proforma invoices in PDF formats:\n${window.location.origin}/?lookup=${activeQuote.id}\n\nWe appreciate our ongoing basmati and tiles export cooperation.\n\nWarm regards,\nVNP Cloud Operations`;

                              window.open(
                                `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(broadcasterEmail.trim())}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
                                "_blank",
                              );
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 rounded-lg transition text-center flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Mail className="w-4 h-4 text-blue-100 shrink-0" />
                            <span>Outlook Draft</span>
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
              👈 Click any quotation card on the left panel to trigger active
              workflow audits, attach bills of lading, and generate printable
              invoices.
            </div>
          )}
        </div>
      </div>

      {/* simulated SMTP mail popover */}
      {activeOutboundMail && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <Mail className="w-5 h-5 font-bold" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  Outbound SaaS SMTP Relay
                </span>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
                ✓ SIMULATED DISPATCH SUCCESS
              </span>
            </div>

            <div className="space-y-2 text-xs text-left">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono block">
                  Recipient (Consignee)
                </span>
                <span className="font-bold text-slate-200 font-mono">
                  {activeOutboundMail.recipient}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono block">
                  Subject Line
                </span>
                <span className="font-black text-white">
                  {activeOutboundMail.subject}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 max-h-[220px] overflow-y-auto text-left">
              <pre className="text-[11px] text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
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
          <div className="text-center pb-4 border-b relative">
            <div className="absolute right-0 top-0 flex flex-col items-end gap-1">
              <QRCodeSVG value={`${window.location.origin}/verify/${activeQuote.ref || activeQuote.id}`} size={42} level="L" />
              <span className="text-[7.5px] text-gray-400 font-mono font-bold uppercase tracking-widest">VERIFY DOC</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-2">
              {licenceMetadata?.logoBase64 && (
                <img
                  src={licenceMetadata.logoBase64}
                  alt="Corporate Logo"
                  referrerPolicy="no-referrer"
                  className="max-h-12 max-w-[200px] object-contain block"
                />
              )}
              <h1 className="text-xl font-black font-sans uppercase">
                {licenceMetadata?.logoText ||
                  licenceMetadata?.name ||
                  activeQuote.company}
              </h1>
            </div>
            <p className="text-[10px] font-sans uppercase text-gray-500 tracking-wider">
              OFFICIAL PROFORMA INVOICE (CONTRACT COPY)
            </p>
            <p className="text-[9px] font-sans text-gray-400 font-medium">
              Registered Customs Exporters • Port Mundra Terminal • India
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 my-5 text-xs font-sans text-gray-800">
            <div>
              <span className="font-bold text-indigo-800 block uppercase text-[10px] mb-1">
                PROFORMA CONSIGNED TO:
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-black px-1.5 py-0.2 rounded uppercase shrink-0"
                  title="Buyer Initials"
                >
                  {getInitials(activeQuote.buyer)}
                </span>
                <div className="font-black text-gray-900 uppercase">
                  {activeQuote.buyer}
                </div>
              </div>
              {activeQuote.buyerLoc && (
                <div className="uppercase mt-0.5 text-gray-500 font-semibold">
                  {activeQuote.buyerLoc}
                </div>
              )}
            </div>

            <div className="text-right">
              <div>
                <span className="text-gray-400 uppercase font-semibold">
                  PI REFERENCE:
                </span>{" "}
                <span className="font-mono font-bold text-gray-950">
                  {activeQuote.ref || "TBD"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 uppercase font-semibold">
                  PI DATE:
                </span>{" "}
                <span className="font-mono">{fmtDate(activeQuote.date)}</span>
              </div>
              <div>
                <span className="text-gray-500 uppercase font-semibold">
                  VALID LIMIT:
                </span>{" "}
                <span className="font-mono">{fmtDate(activeQuote.valid)}</span>
              </div>
              <div>
                <span className="text-gray-500 uppercase font-semibold">
                  INCOTERM CONDITIONS:
                </span>{" "}
                <span className="font-bold text-blue-700 uppercase">
                  {activeQuote.cond}
                </span>
              </div>
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
                  const hasBlendDetails =
                    row.commodity === "BLENDED (MIX) RICE" ||
                    (row.blendRice1Name && row.blendRice2Name);

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
                  ) => {
                    const blendExMill =
                      (r1ExMill * rice1Pct + r2ExMill * rice2Pct) / 100;
                    const baseCostInrKg =
                      blendExMill +
                      rPackaging +
                      rTransport +
                      rCfsPort +
                      rFreight +
                      rInsurance;
                    const dutyAmt =
                      rDutyPct > 0 ? baseCostInrKg * (rDutyPct / 100) : 0;
                    const totalInrKg = baseCostInrKg + dutyAmt;
                    const baseUsdMt =
                      rExrate > 0 ? (totalInrKg / rExrate) * 1000 : 0;
                    return baseUsdMt + rCommission;
                  };

                  return (
                    <React.Fragment key={row.id}>
                      <tr>
                        <td className="p-2 text-gray-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold uppercase text-gray-900">
                              {row.commodity}
                            </span>
                            <span className="inline-flex items-center text-[8px] font-mono font-black text-blue-800 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">
                              HS {getHsCodeForCommodity(row.commodity)}
                            </span>
                          </div>
                          {hasBlendDetails && (
                            <div className="text-[10px] text-blue-800 font-bold uppercase mt-0.5">
                              Spec Ratio: {row.blendRice1Pct || 70}%{" "}
                              {row.blendRice1Name || "Type 1"} &amp;{" "}
                              {row.blendRice2Pct || 30}%{" "}
                              {row.blendRice2Name || "Type 2"}
                            </div>
                          )}
                          <div className="text-[10px] text-gray-400 uppercase mb-1">
                            DEST: {row.dest}
                            {row.transitTime && (
                              <span className="ml-2 font-black text-teal-600 bg-teal-50 px-1 py-0.5 rounded border border-teal-100">
                                ⏱ TRANSIT: {row.transitTime}
                              </span>
                            )}
                          </div>
                          {(() => {
                            const requiredTons =
                              (row.totalWeightKg ||
                                (row.numFCL || 1) *
                                  (row.weightPerContainerKg || 26055)) / 1000;
                            const match = grainInventory.find(
                              (item) =>
                                item.grainName.toLowerCase().trim() ===
                                row.commodity.toLowerCase().trim(),
                            );
                            if (!isInventoryEnabled || !match) return null;

                            const processedAvailable =
                              match.processedRiceTons || 0;
                            const paddyAvailable = match.paddyStockTons || 0;
                            const shortfall = Math.max(
                              0,
                              requiredTons - processedAvailable,
                            );
                            const paddyNeeded = shortfall / 0.65;

                            if (processedAvailable >= requiredTons) {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider"
                                  title={`Sufficient processed stock is available. ${processedAvailable.toFixed(1)} MT in stock.`}
                                >
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  Stock Active ({processedAvailable.toFixed(0)}{" "}
                                  MT)
                                </span>
                              );
                            } else if (paddyAvailable >= paddyNeeded) {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-pulse"
                                  title={`Short processed stock by ${shortfall.toFixed(1)} MT. Silo has ${paddyAvailable.toFixed(1)} MT Paddy. Custom milling required.`}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600 font-bold" />
                                  Milling Needed (Short {shortfall.toFixed(1)}{" "}
                                  MT)
                                </span>
                              );
                            } else {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-pulse font-bold"
                                  title={`Critical shortfall by ${shortfall.toFixed(1)} MT. Silo Raw Paddy too low (${paddyAvailable.toFixed(1)} MT). Order more paddy.`}
                                >
                                  <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                                  Stock N/A (Order Paddy)
                                </span>
                              );
                            }
                          })()}
                        </td>
                        <td className="p-2 uppercase font-mono">{row.brand}</td>
                        <td className="p-2">
                          <span>{row.packed}</span> (
                          <span className="font-mono text-[10px] font-bold">
                            {row.size}
                          </span>
                          )
                        </td>
                        <td className="p-2 text-center font-mono">
                          {row.numFCL} FCL x {row.weightPerContainerKg / 1000}{" "}
                          MT
                        </td>
                        <td className="p-2 text-right font-mono font-black text-blue-800">
                          ${" "}
                          {(row.rate || 0).toLocaleString([], {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          / MT
                        </td>
                        <td className="p-2 text-center no-print">
                          <button
                            type="button"
                            onClick={() => {
                              if (onSendToCalculator) {
                                onSendToCalculator({
                                  quoteId: activeQuote.id,
                                  itemIndex: idx,
                                  data: row,
                                });
                              }
                            }}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded font-bold text-[9px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1 mx-auto"
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
                                    Remarks: &quot;{row.blendCookingRemarks}
                                    &quot;
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                                {(() => {
                                  const r1Name =
                                    row.blendRice1Name ||
                                    "1509 STEAM BASMATI RICE";
                                  const r2Name =
                                    row.blendRice2Name || "PR-11 STEAM RICE";
                                  const r1Price =
                                    row.blendRice1ExMill !== undefined
                                      ? row.blendRice1ExMill
                                      : 78;
                                  const r2Price =
                                    row.blendRice2ExMill !== undefined
                                      ? row.blendRice2ExMill
                                      : 44;

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

                                  const ratios = [
                                    { r1: 90, r2: 10 },
                                    { r1: 80, r2: 20 },
                                    { r1: 70, r2: 30 },
                                    { r1: 60, r2: 40 },
                                    { r1: 50, r2: 50 },
                                  ];

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
                                      );

                                    const isRowActiveSelection =
                                      (row.blendRice1Pct === ratio.r1 &&
                                        row.blendRice2Pct === ratio.r2) ||
                                      (!row.blendRice1Pct && ratio.r1 === 70);

                                    return (
                                      <div
                                        key={`${ratio.r1}-${ratio.r2}`}
                                        className={`px-2 py-1.5 rounded border flex flex-col justify-center ${
                                          isRowActiveSelection
                                            ? "bg-blue-50/70 border-blue-300 font-bold"
                                            : "bg-white border-gray-100"
                                        }`}
                                      >
                                        <div className="text-[9px] font-extrabold text-slate-800 flex justify-between">
                                          <span>
                                            {ratio.r1}% / {ratio.r2}%
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-baseline mt-0.5 pt-0.5 border-t border-slate-100 font-mono text-[8px]">
                                          <span className="text-gray-400">
                                            ₹
                                            {(
                                              (r1Price * ratio.r1 +
                                                r2Price * ratio.r2) /
                                              100
                                            ).toFixed(1)}
                                          </span>
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
              <span className="text-slate-400 block text-[9px] uppercase font-bold">
                PI PAYMENT TERMS CONTRACT:
              </span>
              <p className="font-bold uppercase text-slate-800 leading-snug">
                {activeQuote.terms}
              </p>
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
            STAMP APPROVED DOCUMENT GENERATED DIGITALLY LOCAL OFFICE EXPORTER
            DIRECTORY.
          </div>

          {/* ExportProDoc Watermark */}
          {isFreeTier && !activeQuote.isPaidCredit && (
            <div className="border-t border-dashed border-gray-200 mt-4 pt-3 text-center font-mono text-[10px] text-gray-400 tracking-widest uppercase">
              ExportProDoc
            </div>
          )}
        </div>
      )}

      {/* PDF PREVIEW MODAL */}
      {previewMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 no-print">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-500" />
                {previewMode === "batch_merged" ? "BATCH MERGED (PROFORMAS)" : previewMode.toUpperCase()} Document Preview
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const originalTitle = document.title;
                    document.title = previewMode === "batch_merged" ? `Export_Batch_Proformas_Preview` : `Export_${previewMode.toUpperCase()}_Preview`;
                    window.print();
                    setTimeout(() => { document.title = originalTitle; }, 1000);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition"
                >
                  <Printer className="w-4 h-4" /> Print Document
                </button>
                <button
                  onClick={() => setPreviewMode(null)}
                  className="p-2 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-gray-200/50 p-4 sm:p-8 flex flex-col items-center justify-start gap-8 print:block print:p-0 print:bg-white">
              {(previewMode === "batch_merged" ? savedQuotes.filter(q => selectedQuoteIds.includes(q.id)) : activeQuote ? [activeQuote] : []).map(q => {
                const docType = previewMode === "batch_merged" ? "pi" : previewMode;
                return (
                  <div key={q.id} className="bg-white shadow-sm ring-1 ring-gray-900/5 min-h-[1056px] w-[816px] max-w-full origin-top transform sm:scale-100 scale-75 border print:border-none print:shadow-none print:ring-0 print:transform-none print:w-full print:break-after-page">
                    <div className="p-8 leading-relaxed font-serif text-gray-900">
                      <div className="text-center pb-4 border-b border-gray-200 relative">
                        <div className="absolute right-0 top-0 flex flex-col items-end gap-1">
                          <QRCodeSVG value={`${window.location.origin}/verify/${q.ref || q.id}`} size={42} level="L" />
                          <span className="text-[7.5px] text-gray-400 font-mono font-bold uppercase tracking-widest">VERIFY DOC</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 mb-2">
                          {licenceMetadata?.logoBase64 && (
                            <img
                              src={licenceMetadata.logoBase64}
                              alt="Company Logo"
                              className="h-16 object-contain"
                            />
                          )}
                          <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
                            {licenceMetadata?.name || "EXPORT TRADING COMPANY"}
                          </h1>
                          <p className="text-xs text-gray-500 font-sans uppercase">
                            {licenceMetadata?.tagline || "Global Export Partners"}
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs items-end font-sans">
                          <div className="text-left font-bold space-y-0.5">
                            <div>
                              DATE: <span className="text-gray-800">{fmtDate(q.date)}</span>
                            </div>
                            <div>
                              {docType?.toUpperCase()} REF: <span className="text-indigo-700 bg-indigo-50 px-1.5 rounded">{q.ref}</span>
                            </div>
                            <div>
                              VALID TILL: <span className="text-gray-800">{q.valid}</span>
                            </div>
                          </div>
                          <div className="text-right max-w-[200px] text-gray-600 leading-tight">
                            {q.company}
                          </div>
                        </div>
                      </div>

                      <div className="py-6 border-b border-gray-200 font-sans text-sm">
                        <h4 className="font-extrabold text-blue-900 uppercase text-[10px] tracking-wider mb-2">To Consignee / Buyer:</h4>
                        <p className="font-bold text-gray-900 uppercase whitespace-pre-wrap">{q.consigneeDetails || `${q.buyer}\n${q.buyerLoc}`}</p>
                      </div>

                      {docType === "pi" && q?.piHtml && (
                        <div dangerouslySetInnerHTML={{ __html: q.piHtml }} className="mt-6" />
                      )}
                      
                      {docType === "ci" && q?.stageDocs?.["ci"]?.html && (
                        <div dangerouslySetInnerHTML={{ __html: q.stageDocs["ci"].html }} className="mt-6" />
                      )}
                      
                      {docType === "pl" && q?.stageDocs?.["pl"]?.html && (
                        <div dangerouslySetInnerHTML={{ __html: q.stageDocs["pl"].html }} className="mt-6" />
                      )}

                      {(!q?.piHtml && docType === "pi") && (
                        <div className="py-20 text-center text-gray-400 italic">
                          No customized PI HTML found for this quote. Falling back to default layout. Please use "Open Tab" to generate it.
                        </div>
                      )}

                      {/* ExportProDoc Watermark */}
                      {isFreeTier && !q.isPaidCredit && (
                        <div className="border-t border-dashed border-gray-200 mt-6 pt-3 text-center font-mono text-[10px] text-gray-400 tracking-widest uppercase">
                          ExportProDoc
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
