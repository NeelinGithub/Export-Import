import React, {
  useState,
  useEffect,
  useRef,
  Component,
  ErrorInfo,
  ReactNode,
} from "react";
import { loadInitialState, saveLS } from "./storage";

class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null };
  constructor(props: any) {
    super(props);
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }
  render() {
    // @ts-ignore
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 20,
            color: "red",
            background: "white",
            minHeight: "100vh",
            width: "100vw",
            zIndex: 9999,
            position: "relative",
          }}
        >
          <h2>Something went wrong in the component.</h2>
          {/* @ts-ignore */}
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {this.state.error?.toString()}
          </pre>
          {/* @ts-ignore */}
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 10 }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}

import {
  INITIAL_COMMODITIES,
  INITIAL_BAGS,
  INITIAL_BAG_STOCK,
  INITIAL_RATES,
  INITIAL_CFS_ITEMS,
  INITIAL_LINE_ITEMS,
  INITIAL_DOHA_IMPORT,
  INITIAL_CONDITIONS,
  INITIAL_PAYMENT_TERMS,
} from "./constants";
import {
  RateRow,
  BagPrices,
  BagStockItem,
  ExpenseItem,
  DohaImportData,
  SavedQuote,
  GrainInventoryItem,
  InventoryOrder,
  PaymentTerm,
} from "./types";

// Firebase Setup & Services
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  getOrCreateUserMembership,
  getTenantProfile,
  saveTenantProfile,
  subscribeToTenantQuotes,
  saveTenantQuote,
  deleteTenantQuote,
  syncTenantQuotesBatch,
  UserProfileData,
  getLicenceDetails,
  logUserLogin,
  subscribeToLicenceDetails,
  updateUserMembership,
  subscribeToUserMembership,
  updateMembershipSubCompanies,
  saveLicenceDetails,
  syncOfflineDataToCloud,
} from "./services/db";

import { subscribeToHsCodes } from "./utils/hscode";

import LicenceManager, { ALL_MODULES, PLANS } from "./components/LicenceManager";
import OtpSecurityGate from "./components/OtpSecurityGate";
import {
  Lock,
  Clock,
  Building,
  Info,
  AlertCircle,
  Zap,
  CheckCircle2,
  Settings as SettingsIcon,
  Check,
  X
} from "lucide-react";

const ALL_ONBOARDING_INDUSTRIES = [
  { id: "grain", label: "Grain & Rice", icon: "🌾", desc: "For rice exporters, pulse traders, and grain millers." },
  { id: "spices", label: "Spices", icon: "🌶️", desc: "For whole spices, spice powders, and seed exporters." },
  { id: "chemicals", label: "Chemicals", icon: "🧪", desc: "For industrial chemical processors and fertilizer shipments." },
  { id: "salts", label: "Salts", icon: "🧂", desc: "For edible, industrial, and rock salt exporters." },
  { id: "vegetables_fruits", label: "Veg & Fruits", icon: "🥦", desc: "For fresh agro-produce and cold-chain shipments." },
  { id: "tiles", label: "Ceramic Tiles", icon: "🧱", desc: "For ceramic floor tiles, vitrified, and sanitaryware." },
  { id: "sugar", label: "Sugar", icon: "🍬", desc: "For refined sugar, raw sugar, and confectionery exports." },
  { id: "nuts", label: "Nuts & Cashews", icon: "🌰", desc: "For processed cashew kernels, almonds, and walnuts." },
  { id: "rcn", label: "Raw Cashew Nut (RCN)", icon: "🥜", desc: "For raw cashew nut importing, warehousing and trading." },
  { id: "coffee_tea", label: "Coffee & Tea", icon: "☕", desc: "For premium tea leaves, coffee beans, and custom blends." },
  { id: "cotton_yarn", label: "Cotton & Yarn", icon: "🧵", desc: "For cotton bales, carded yarn, and spinning products." },
  { id: "timber", label: "Timber & Wood", icon: "🪵", desc: "For sawn timber, round logs, and wooden handicrafts." },
  { id: "generic", label: "Generic Cargo", icon: "📦", desc: "Standard general cargo container shipments." },
  { id: "metal", label: "Metals & Ingots", icon: "⚙️", desc: "For aluminum ingots, steel coils, and metal scraps." },
  { id: "oil", label: "Palm & Edible Oil", icon: "🛢️", desc: "For crude palm oil, sunflower oil, and liquid tankers." },
  { id: "pharma", label: "Pharmaceuticals", icon: "💊", desc: "For APIs, active formulation drugs, and medical supplies." },
  { id: "apparel", label: "Apparel & Textiles", icon: "👕", desc: "For ready-made garments, home textiles, and fashion." },
  { id: "air_cargo", label: "Air Cargo", icon: "✈️", desc: "For high-value, time-sensitive premium air freight." },
  { id: "packaging", label: "BOPP & Jumbo Bags", icon: "📦", desc: "For plastic packaging, woven bags, and PP sacks." }
];

// Components
import Sidebar from "./components/Sidebar";
import BackupReminder from "./components/BackupReminder";
import { getRateCalculator, getCfsTransport, getBagPriceAndStock, getQuoteSheet } from './ModuleLoader';

import RateListBoard from "./components/RateListBoard";
import SocialRateBoard from "./components/SocialRateBoard";
import BagPriceAndStock from "./components/BagPriceAndStock";
import PaymentTracker from "./components/PaymentTracker";
import CfsTransport from "./components/CfsTransport";
import QuoteSheet from "./components/QuoteSheet";
import RateCalculator from "./components/RateCalculator";
import DohaImport from "./components/DohaImport";
import SavedQuotes from "./components/SavedQuotes";
import Settings from "./components/Settings";
import DocumentWorkspace from "./components/DocumentWorkspace";
import AuthScreen from "./components/AuthScreen";
import OnboardingFlow from "./components/OnboardingFlow";
import LandingPage from "./components/LandingPage";
import MarketingMaterials from "./components/MarketingMaterials";
import InventoryManager from "./components/InventoryManager";
import ContainerTracker from "./components/ContainerTracker";
import VesselScheduleExplorer from "./components/VesselScheduleExplorer";
import DocumentDrive from "./components/DocumentDrive";
import TradeIntelligence from "./components/TradeIntelligence";
import DashboardView from "./components/DashboardView";
import ProfitLossMetrics from "./components/ProfitLossMetrics";











export default function App() {
  const state = loadInitialState();

  // Authentication State Managers
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authLoadingSlow, setAuthLoadingSlow] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (authLoading) {
      timeout = setTimeout(() => {
        setAuthLoadingSlow(true);
      }, 10000);
    } else {
      setAuthLoadingSlow(false);
    }
    return () => clearTimeout(timeout);
  }, [authLoading]);

  // Public Landing / Client Portal Marketing Site Toggle
  const [showMarketing, setShowMarketing] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !(
      params.get("compliance") === "true" ||
      params.get("workspace") === "true" ||
      params.get("vessels") === "true"
    );
  });

  // Tenant / Licence State Managers
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [activeTenantName, setActiveTenantName] =
    useState<string>("Personal Licence");
  const [tenantRole, setTenantRole] = useState<"owner" | "member">("owner");
  const [licenceMetadata, setLicenceMetadata] = useState<any>(null);
  const [userMembership, setUserMembership] = useState<any>(null);
  const [otpVerified, setOtpVerified] = useState<boolean>(false);

  const [forceTrialMode, setForceTrialMode] = useState(false);

  // Fetch public branding if not authenticated
  const [publicLicence, setPublicLicence] = useState<any>(null);

  useEffect(() => {

    if (!currentUser) {
      getLicenceDetails("LIC-VIREN2024")
        .then((res) => {
          if (res) setPublicLicence(res);
        })
        .catch(() => {});
    }
  }, [currentUser]);

  const [activeTab, setActiveTab] = useState("calc");
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [showModuleConfig, setShowModuleConfig] = useState(false);

  // Workspace focus state managers
  const [workspaceActive, setWorkspaceActive] = useState(false);
  const [workspaceQuoteId, setWorkspaceQuoteId] = useState<number | null>(null);
  const [workspaceDocType, setWorkspaceDocType] = useState<"pi" | "ci" | "pl">(
    "pi",
  );
  const [backfillItem, setBackfillItem] = useState<{
    quoteId: number;
    itemIndex: number;
    data: any;
  } | null>(null);

  // Compliance roadmap standalone tab
  const [complianceActive, setComplianceActive] = useState(false);
  const [complianceQuoteId, setComplianceQuoteId] = useState<number | null>(
    null,
  );

  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [onboardingSelectedIndustry, setOnboardingSelectedIndustry] = useState<string>("grain");
  const [isActivatingOnboarding, setIsActivatingOnboarding] = useState<boolean>(false);

  const handleActivateFreeTierOnboarding = async () => {
    if (!licenceMetadata) return;
    setIsActivatingOnboarding(true);
    try {
      const updatedMeta = {
        ...licenceMetadata,
        industry: onboardingSelectedIndustry,
        industrySelected: true,
        allowedModules: [
          "rate_calc",
          "quote_saving",
          "quote_sharing",
          "bag_price_stock",
          "grain_inventory",
          "pi_ci_generation"
        ]
      };
      await saveLicenceDetails(updatedMeta);
      setLicenceMetadata(updatedMeta);
      setSelectedIndustry(onboardingSelectedIndustry);
      showToast(`Success! ${ALL_ONBOARDING_INDUSTRIES.find(x => x.id === onboardingSelectedIndustry)?.label} workspace activated.`, "success");
    } catch (e) {
      console.error(e);
      showToast("Could not activate selected industry workspace.", "error");
    } finally {
      setIsActivatingOnboarding(false);
    }
  };

  useEffect(() => {
    if (licenceMetadata?.industry) {
      const parts = licenceMetadata.industry
        .split(",")
        .map((s: string) => s.trim().toLowerCase())
        .filter(Boolean);
      if (parts.length > 0 && !parts.includes(selectedIndustry)) {
        setSelectedIndustry(parts[0]);
      }
    }
  }, [licenceMetadata?.industry]);

  const activeIndustryContext =
    selectedIndustry ||
    licenceMetadata?.industry?.split(",")[0]?.trim()?.toLowerCase() ||
    "grain";

  // Vessel lookup standalone tab
  const [vesselLookupActive, setVesselLookupActive] = useState(false);
  const [vesselLookupRef, setVesselLookupRef] = useState("");
  const [vesselLookupOrigin, setVesselLookupOrigin] = useState("");
  const [vesselLookupDest, setVesselLookupDest] = useState("");

  // Core Directories States
  const [commodities, setCommodities] = useState(state.commodities);
  const [ports, setPorts] = useState(state.ports);
  const [conditions, setConditions] = useState(state.conditions);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>(
    state.paymentTerms || INITIAL_PAYMENT_TERMS,
  );

  // Operations state managers
  const [bagPrices, setBagPrices] = useState<BagPrices>(state.bagPrices);
  const [bagStock, setBagStock] = useState<BagStockItem[]>(state.bagStock);
  const [dohaImport, setDohaImport] = useState<DohaImportData>(
    state.dohaImport,
  );
  const [lineItems, setLineItems] = useState<ExpenseItem[]>(state.lineItems);
  const [cfsItems, setCfsItems] = useState<ExpenseItem[]>(state.cfsItems);
  const [rateList, setRateList] = useState<RateRow[]>(state.rateList);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>(
    state.savedQuotes,
  );
  const [quoteConfig, setQuoteConfig] = useState(
    state.quoteConfig || { prefix: "RFQ-", nextNumber: 1000 },
  );

  const [companies, setCompanies] = useState<string[]>(state.companies);
  const [buyers, setBuyers] = useState<string[]>(state.buyers);
  const [buyerLocations, setBuyerLocations] = useState<string[]>(
    state.buyerLocations,
  );

  const [grainInventory, setGrainInventory] = useState<GrainInventoryItem[]>(
    state.grainInventory,
  );
  const [inventoryOrders, setInventoryOrders] = useState<InventoryOrder[]>(
    state.inventoryOrders,
  );

  // Synchronized CFS values for Rate Calculator
  const [transportCost, setTransportCost] = useState(0);
  const [cfsCost, setCfsCost] = useState(0);
  const [fclCount, setFclCount] = useState(2);
  const [weightPerContainer, setWeightPerContainer] = useState(26000);

  // Selected Rates for the Quotation Sheet
  const [selectedRateIds, setSelectedRateIds] = useState<number[]>([]);

  const [userModulePrefs, setUserModulePrefs] = useState<
    Record<string, boolean>
  >(() => {
    try {
      const stored = localStorage.getItem("rems_user_module_preferences");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(
      "rems_user_module_preferences",
      JSON.stringify(userModulePrefs),
    );
  }, [userModulePrefs]);

  const prevQuotesRef = useRef<SavedQuote[]>([]);
  const profileSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedProfileJsonRef = useRef<string>("");
  const pendingQuotesSaveRef = useRef<Record<string, SavedQuote>>({});
  const pendingQuotesDeleteRef = useRef<Record<string, boolean>>({});
  const quotesSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Alert notifier function (custom micro-toast)
  const showToast = (message: string, type?: "success" | "warn" | "error") => {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className =
        "fixed bottom-6 right-6 font-semibold text-xs py-3 px-5 rounded-xl shadow-2xl tracking-wide z-[9999] select-none transition-all duration-300 transform translate-y-20 opacity-0 pointer-events-none";
      document.body.appendChild(toast);
    }
    if (toast) {
      toast.textContent = message;
      if (type === "error") {
        toast.style.borderColor = "#ef4444";
        toast.style.backgroundColor = "#7f1d1d";
        toast.style.color = "#fee2e2";
        toast.style.borderWidth = "1px";
      } else if (type === "success") {
        toast.style.borderColor = "#10b981";
        toast.style.backgroundColor = "#064e3b";
        toast.style.color = "#ecfdf5";
        toast.style.borderWidth = "1px";
      } else if (type === "warn") {
        toast.style.borderColor = "#f59e0b";
        toast.style.backgroundColor = "#78350f";
        toast.style.color = "#fef3c7";
        toast.style.borderWidth = "1px";
      } else {
        toast.style.borderColor = "#475569";
        toast.style.backgroundColor = "#0f172a";
        toast.style.color = "#f8fafc";
        toast.style.borderWidth = "1px";
      }
      toast.style.transform = "translateY(0)";
      toast.style.opacity = "1";
      toast.style.pointerEvents = "auto";
      setTimeout(() => {
        if (toast) {
          toast.style.transform = "translateY(80px)";
          toast.style.opacity = "0";
          toast.style.pointerEvents = "none";
        }
      }, 5000);
    }
  };

  // Listen for Firestore Quota Exceeded event to notify user
  useEffect(() => {
    const handleQuotaExceeded = () => {
      showToast(
        "Cloud sync paused: Firestore write quota exceeded. Local storage backup is active & completely secure!",
        "warn"
      );
    };
    window.addEventListener("firestore-quota-exceeded", handleQuotaExceeded);
    return () => {
      window.removeEventListener("firestore-quota-exceeded", handleQuotaExceeded);
    };
  }, []);

  // Monitor URL params for standalone window editor triggers
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const workspace = params.get("workspace") === "true";
    const quoteIdStr = params.get("quoteId");
    const typeStr = params.get("type") as "pi" | "ci" | "pl";

    // Vessel schedule stand-alone explorer trigger
    const vessels = params.get("vessels") === "true";
    const refParam = params.get("ref") || "";
    const originParam = params.get("origin") || "";
    const destParam = params.get("dest") || "";

    const compliance = params.get("compliance") === "true";

    if (compliance && quoteIdStr) {
      const qid = parseInt(quoteIdStr);
      if (!isNaN(qid)) {
        setComplianceQuoteId(qid);
        setComplianceActive(true);
      }
    } else if (vessels) {
      setVesselLookupRef(refParam);
      setVesselLookupOrigin(originParam);
      setVesselLookupDest(destParam);
      setVesselLookupActive(true);
    } else if (workspace && quoteIdStr) {
      const qid = parseInt(quoteIdStr);
      if (!isNaN(qid)) {
        setWorkspaceQuoteId(qid);
        setWorkspaceDocType(typeStr || "pi");
        setWorkspaceActive(true);
      }
    }
  }, []);

  // Load state parameters for a specific Tenant Licence Key mapping back to custom commodities, bags, stocks, and profiles
  const loadTenantData = async (
    uid: string,
    email: string | null,
    forceTenantId?: string,
    forceRefresh = false,
  ) => {
    try {
      const membership = await getOrCreateUserMembership(uid, email);
      const tenantId = forceTenantId || membership.tenantId;
      const role = forceTenantId
        ? forceTenantId === membership.tenantId
          ? membership.role
          : "member"
        : membership.role;

      setActiveTenantId(tenantId);
      setTenantRole(role);

      // Synchronize any offline data first if quota allows
      await syncOfflineDataToCloud();

      // Record a secure user login audit log
      logUserLogin(uid, email, tenantId).catch(console.error);

      // Perform all high-latency network calls in parallel for radical performance boost
      const [licence, profile] = await Promise.all([
        getLicenceDetails(tenantId),
        getTenantProfile(tenantId)
      ]);

      setLicenceMetadata(licence);
      if (licence) {
        setActiveTenantName(licence.name);
        localStorage.setItem(
          "rems_date_format",
          licence.dateFormat || "DD-MMM-YY",
        );
      } else {
        setActiveTenantName(
          tenantId.toUpperCase().includes("LIC-RM")
            ? "Registered Licence"
            : "Personal Licence",
        );
      }

      // Load directories at Tenant ID configuration
      if (profile) {
        // Self-heal/merge preset commodities to make sure vegetables, fruits, spices are fully loaded
        let loadedComms = Array.isArray(profile.commodities) ? profile.commodities : [];
        const loadedIds = new Set(loadedComms.map((c: any) => c?.id).filter(Boolean));
        const missingPresets = INITIAL_COMMODITIES.filter(
          (item) => item?.id && !loadedIds.has(item.id),
        );
        if (missingPresets.length > 0) {
          loadedComms = [...loadedComms, ...missingPresets];
        }
        setCommodities(loadedComms);

        setPorts(Array.isArray(profile.ports) ? profile.ports : []);

        // Self-heal/merge preset Incoterms to make sure all 11 standard rules are loaded
        let loadedConds = Array.isArray(profile.conditions) ? profile.conditions : [];
        const loadedCondCodes = new Set(loadedConds.map((c: any) => c?.code).filter(Boolean));
        const missingConds = INITIAL_CONDITIONS.filter(
          (item) => item?.code && !loadedCondCodes.has(item.code),
        );
        if (missingConds.length > 0) {
          loadedConds = [...loadedConds, ...missingConds];
        }
        setConditions(loadedConds);

        // Self-heal/merge payment terms to make sure all standard ones are loaded
        let loadedPays = Array.isArray(profile.paymentTerms) ? profile.paymentTerms : [];
        const loadedPayCodes = new Set(loadedPays.map((p: any) => p?.code).filter(Boolean));
        const missingPays = INITIAL_PAYMENT_TERMS.filter(
          (item) => item?.code && !loadedPayCodes.has(item.code),
        );
        if (missingPays.length > 0) {
          loadedPays = [...loadedPays, ...missingPays];
        }
        setPaymentTerms(loadedPays);

        // Self-heal/merge packaging types
        const loadedBags = (profile.bagPrices && typeof profile.bagPrices === 'object') ? profile.bagPrices : INITIAL_BAGS;
        let mergedBags = { ...INITIAL_BAGS };
        Object.keys(INITIAL_BAGS).forEach((cat) => {
          if (
            loadedBags[cat] !== undefined &&
            Array.isArray(loadedBags[cat]) &&
            loadedBags[cat].length > 0
          ) {
            mergedBags[cat] = loadedBags[cat];
          }
        });
        setBagPrices(mergedBags);

        // Self-heal/merge packaging stocks to ensure multi-workspace presets load
        let loadedStock = Array.isArray(profile.bagStock) ? profile.bagStock : [];
        if (loadedStock.length === 0) {
          loadedStock = INITIAL_BAG_STOCK;
        } else {
          const loadedStockIds = new Set(loadedStock.map((s: any) => s?.id).filter(Boolean));
          const missingStockPresets = INITIAL_BAG_STOCK.filter(
            (item) => item?.id && !loadedStockIds.has(item.id),
          );
          if (missingStockPresets.length > 0) {
            loadedStock = [...loadedStock, ...missingStockPresets];
          }
        }
        setBagStock(loadedStock);

        let sanitizedDoha = (profile.dohaImport && typeof profile.dohaImport === 'object') ? profile.dohaImport : INITIAL_DOHA_IMPORT;
        if (!Array.isArray(sanitizedDoha.rows)) {
          sanitizedDoha.rows = INITIAL_DOHA_IMPORT.rows || [];
        }
        setDohaImport(sanitizedDoha);

        setLineItems(Array.isArray(profile.lineItems) ? profile.lineItems : INITIAL_LINE_ITEMS);
        setCfsItems(Array.isArray(profile.cfsItems) ? profile.cfsItems : INITIAL_CFS_ITEMS);
        setRateList(Array.isArray(profile.rateList) ? profile.rateList : []);
        setCompanies(Array.isArray(profile.companies) ? profile.companies : []);
        setBuyers(Array.isArray(profile.buyers) ? profile.buyers : []);
        setBuyerLocations(Array.isArray(profile.buyerLocations) ? profile.buyerLocations : []);
        setGrainInventory(Array.isArray(profile.grainInventory) ? profile.grainInventory : []);
        setInventoryOrders(Array.isArray(profile.inventoryOrders) ? profile.inventoryOrders : []);

        const healedProfileData: UserProfileData = {
          commodities: loadedComms,
          ports: Array.isArray(profile.ports) ? profile.ports : [],
          conditions: loadedConds,
          paymentTerms: loadedPays,
          bagPrices: mergedBags,
          bagStock: loadedStock,
          dohaImport: sanitizedDoha,
          lineItems: Array.isArray(profile.lineItems) ? profile.lineItems : INITIAL_LINE_ITEMS,
          cfsItems: Array.isArray(profile.cfsItems) ? profile.cfsItems : INITIAL_CFS_ITEMS,
          rateList: Array.isArray(profile.rateList) ? profile.rateList : [],
          companies: Array.isArray(profile.companies) ? profile.companies : [],
          buyers: Array.isArray(profile.buyers) ? profile.buyers : [],
          buyerLocations: Array.isArray(profile.buyerLocations) ? profile.buyerLocations : [],
          grainInventory: Array.isArray(profile.grainInventory) ? profile.grainInventory : [],
          inventoryOrders: Array.isArray(profile.inventoryOrders) ? profile.inventoryOrders : [],
        };
        lastSavedProfileJsonRef.current = JSON.stringify(healedProfileData);
      } else {
        // First initialization, write active local defaults on cloud
        const backupData: UserProfileData = {
          commodities,
          ports,
          conditions,
          paymentTerms,
          bagPrices,
          bagStock,
          dohaImport,
          lineItems,
          cfsItems,
          rateList,
          companies,
          buyers,
          buyerLocations,
          grainInventory,
          inventoryOrders,
        };
        await saveTenantProfile(tenantId, backupData);
        lastSavedProfileJsonRef.current = JSON.stringify(backupData);
      }

      setDbInitialized(true);
      if (forceRefresh) {
        showToast(
          `Workspace connected to: ${licence?.name || tenantId}`,
          "success",
        );
      } else {
        showToast(`Cloud workspace synced for ${email}`);
      }
    } catch (err) {
      console.error("loadTenantData error:", err);
      showToast("Failed to fetch cloud records. Running on local fallback.");
    }
  };

  // Switch workspace tenant and update
  const handleTenantChange = async (
    newTenantId: string,
    refreshNeeded: boolean,
  ) => {
    if (!currentUser) return;
    setAuthLoading(true);
    let role: "owner" | "member" = "member";
    try {
      const membership = await getOrCreateUserMembership(
        currentUser.uid,
        currentUser.email,
      );
      if (
        membership.tenantId.trim().toUpperCase() ===
        newTenantId.trim().toUpperCase()
      ) {
        role = membership.role;
      }
    } catch (e) {
      console.error(e);
    }

    // Write new Lease Key permanently on database without blocking the UI load
    const updatePromise = updateUserMembership(
      currentUser.uid,
      currentUser.email,
      newTenantId,
      role,
    ).catch((e) => console.error("Failed to commit permanent workspace activation:", e));

    await loadTenantData(
      currentUser.uid,
      currentUser.email,
      newTenantId,
      refreshNeeded,
    );
    // Ensure membership update finished before resolving
    await updatePromise;
    setAuthLoading(false);
  };

  // Sync state variables from/to Firebase Authentication & Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Strict verification check: ensure user exists in the database
        const justAuthenticated = sessionStorage.getItem('justAuthenticated') === 'true';
        if (justAuthenticated) {
          sessionStorage.removeItem('justAuthenticated');
        } else {
          try {
            const docRef = doc(db, "user_memberships", user.uid);
            const snap = await getDoc(docRef);
            if (!snap.exists() || snap.data()?.loginBlocked) {
              console.warn("Strict Verification: User record missing or blocked. Signing out.");
              localStorage.removeItem(`rems_membership_${user.uid}`);
              await signOut(auth);
              setCurrentUser(null);
              setActiveTenantId(null);
              setDbInitialized(false);
              setAuthLoading(false);
              return;
            }
          } catch (error: any) {
            const errMsg = error instanceof Error ? error.message : String(error);
            console.warn("Strict Verification Error:", errMsg);
            
            const isQuota = errMsg.toLowerCase().includes('resource-exhausted') || 
              errMsg.toLowerCase().includes('quota') || 
              errMsg.toLowerCase().includes('limit exceeded');
              
            if (isQuota) {
              console.warn("Quota exceeded during strict verification. Bypassing check to allow offline/cached access.");
            } else {
              // If we cannot verify the user due to other network/permission errors, securely sign them out
              console.warn("Could not verify user record. Signing out for security.");
              localStorage.removeItem(`rems_membership_${user.uid}`);
              await signOut(auth);
              setCurrentUser(null);
              setActiveTenantId(null);
              setDbInitialized(false);
              setAuthLoading(false);
              return;
            }
          }
        }

        setCurrentUser(user);
        setOtpVerified(false); // Reset on login
      } else {
        setCurrentUser(null);
        setActiveTenantId(null);
        setDbInitialized(false);
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Subscribe to HS codes when industry is known
  useEffect(() => {
    let hsUnsubscribe: (() => void) | undefined;
    if (licenceMetadata?.industry) {
      hsUnsubscribe = subscribeToHsCodes(licenceMetadata.industry);
    }
    return () => {
      if (hsUnsubscribe) hsUnsubscribe();
    };
  }, [licenceMetadata?.industry]);

  // Real-time synchronization of the user's active team workspace lease keys
  useEffect(() => {
    if (!currentUser) {
      setActiveTenantId(null);
      setTenantRole("member");
      return;
    }

    setAuthLoading(true);
    let currentTenantId: string | null = null;
    const unsubscribe = subscribeToUserMembership(
      currentUser.uid,
      async (membership, isInitial) => {
        try {
          if (membership) {
            if (membership.loginBlocked) {
              console.warn("User blocked dynamically.");
              await auth.signOut();
              return;
            }
            setTenantRole(membership.role);
            setUserMembership(membership);
            if (membership.tenantId !== currentTenantId) {
              currentTenantId = membership.tenantId;
              setActiveTenantId(membership.tenantId);
              await loadTenantData(
                currentUser.uid,
                currentUser.email,
                membership.tenantId,
                false,
              );
            }
          } else {
            if (!isInitial) {
              // User membership was deleted while they were using the app
              await auth.signOut();
              return;
            }

            const justAuthenticated = sessionStorage.getItem('justAuthenticated') === 'true';
            sessionStorage.removeItem('justAuthenticated');
            if (!justAuthenticated) {
              // Not a fresh login via AuthScreen. They must have been auto-logged in,
              // but their membership is missing (deleted user returning). Force sign out.
              await auth.signOut();
              return;
            }

            // Create initial membership if it does not exist
            const defaultMembership = await getOrCreateUserMembership(
              currentUser.uid,
              currentUser.email,
            );
            setTenantRole(defaultMembership.role);
            setUserMembership(defaultMembership);
            if (defaultMembership.tenantId !== currentTenantId) {
              currentTenantId = defaultMembership.tenantId;
              setActiveTenantId(defaultMembership.tenantId);
              await loadTenantData(
                currentUser.uid,
                currentUser.email,
                defaultMembership.tenantId,
                false,
              );
            }
          }
        } catch (err) {
          console.error("Error in membership subscription callback:", err);
        } finally {
          setAuthLoading(false);
        }
      },
      (error) => {
        setAuthLoading(false);
        showToast(
          "Access check failed. Are you sure you have permission to access this?",
          "error",
        );
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Real-time synchronization of Licence metadata permissions & approval levels
  useEffect(() => {
    if (!activeTenantId) {
      setLicenceMetadata(null);
      return;
    }

    const unsubscribe = subscribeToLicenceDetails(activeTenantId, (licence) => {
      setLicenceMetadata(licence);
      if (licence) {
        setActiveTenantName(licence.name);
        localStorage.setItem(
          "rems_date_format",
          licence.dateFormat || "DD-MMM-YY",
        );
      } else {
        setActiveTenantName(
          activeTenantId.toUpperCase().includes("LIC-RM")
            ? "Registered Licence"
            : "Personal Licence",
        );
      }
    });

    return () => unsubscribe();
  }, [activeTenantId]);

  // Real-time synchronization of Quotes (saves huge database reads by using local cache + diffs)
  useEffect(() => {
    if (!activeTenantId) {
      setSavedQuotes([]);
      return;
    }

    const unsubscribe = subscribeToTenantQuotes(activeTenantId, (quotes) => {
      // Very Important: Update the ref immediately BEFORE setting state to prevent our sync
      // engine from detecting these incoming cloud changes as local modifications that need saving!
      prevQuotesRef.current = quotes;
      setSavedQuotes(quotes);
    });

    return () => unsubscribe();
  }, [activeTenantId]);

  // Sync Saved Quotes to Firebase (Detect additions, updates, deletions) under selected Tenant ID
  useEffect(() => {
    if (!currentUser || !dbInitialized || !activeTenantId) return;
    const prev = prevQuotesRef.current;

    // Detect removed quotes
    const deleted = prev.filter(
      (pq) => !savedQuotes.some((q) => q.id === pq.id),
    );
    let changed = false;

    deleted.forEach((q) => {
      const qKey = String(q.id);
      pendingQuotesDeleteRef.current[qKey] = true;
      delete pendingQuotesSaveRef.current[qKey];
      changed = true;
    });

    // Detect added or updated quotes
    const updated = savedQuotes.filter((q) => {
      const pq = prev.find((x) => x.id === q.id);
      return !pq || JSON.stringify(pq) !== JSON.stringify(q);
    });

    updated.forEach((q) => {
      const qKey = String(q.id);
      pendingQuotesSaveRef.current[qKey] = q;
      delete pendingQuotesDeleteRef.current[qKey];
      changed = true;
    });

    // Update the ref immediately to prevent redundant detection on next render
    prevQuotesRef.current = savedQuotes;

    if (changed) {
      if (quotesSyncTimerRef.current) clearTimeout(quotesSyncTimerRef.current);
      quotesSyncTimerRef.current = setTimeout(() => {
        const saves = { ...pendingQuotesSaveRef.current };
        const deletes = { ...pendingQuotesDeleteRef.current };

        // Clear the pending objects
        pendingQuotesSaveRef.current = {};
        pendingQuotesDeleteRef.current = {};

        const savesList = Object.values(saves) as SavedQuote[];
        const deletesList = Object.keys(deletes).map(Number);
        
        if (savesList.length > 0 || deletesList.length > 0) {
          syncTenantQuotesBatch(activeTenantId, currentUser.uid, savesList, deletesList).catch(err => {
            console.error("Error in debounced syncTenantQuotesBatch:", err);
          });
        }
      }, 8000); // 8 second debounce to highly optimize quota usage
    }

    return () => {
      if (quotesSyncTimerRef.current) clearTimeout(quotesSyncTimerRef.current);
    };
  }, [savedQuotes, currentUser, dbInitialized, activeTenantId]);

  // Sync User Directory configuration profiles with 1s debounce
  useEffect(() => {
    if (!currentUser || !dbInitialized || !activeTenantId) return;

    const profileData: UserProfileData = {
      commodities,
      ports,
      conditions,
      paymentTerms,
      bagPrices,
      bagStock,
      dohaImport,
      lineItems,
      cfsItems,
      rateList,
      companies,
      buyers,
      buyerLocations,
      grainInventory,
      inventoryOrders,
    };

    const currentJson = JSON.stringify(profileData);
    if (!lastSavedProfileJsonRef.current) {
      lastSavedProfileJsonRef.current = currentJson;
      return;
    }
    if (currentJson === lastSavedProfileJsonRef.current) {
      return;
    }

    if (profileSyncTimerRef.current) clearTimeout(profileSyncTimerRef.current);
    profileSyncTimerRef.current = setTimeout(() => {
      saveTenantProfile(activeTenantId, profileData)
        .then(() => {
          lastSavedProfileJsonRef.current = currentJson;
        })
        .catch(console.error);
    }, 8000);

    return () => {
      if (profileSyncTimerRef.current)
        clearTimeout(profileSyncTimerRef.current);
    };
  }, [
    currentUser,
    dbInitialized,
    activeTenantId,
    commodities,
    ports,
    conditions,
    paymentTerms,
    bagPrices,
    bagStock,
    dohaImport,
    lineItems,
    cfsItems,
    rateList,
    companies,
    buyers,
    buyerLocations,
    grainInventory,
    inventoryOrders,
  ]);

  // Logout clean up triggered from sidebar
  const handleLogout = async () => {
    if (confirm("Disconnect and secure your cloud export records?")) {
      try {
        await signOut(auth);
        setDbInitialized(false);
        showToast("Signed out successfully.");
      } catch (err) {
        console.error("Error signing out:", err);
        showToast("Could not complete sign-out.");
      }
    }
  };

  // Local backups for safety (Localstorage duplicates)
  useEffect(() => {
    saveLS("rems_commodities", commodities);
  }, [commodities]);

  useEffect(() => {
    saveLS("rems_ports", ports);
  }, [ports]);

  useEffect(() => {
    saveLS("rems_conditions", conditions);
  }, [conditions]);

  useEffect(() => {
    saveLS("rems_payment_terms", paymentTerms);
  }, [paymentTerms]);

  useEffect(() => {
    saveLS("rems_bags", bagPrices);
  }, [bagPrices]);

  useEffect(() => {
    saveLS("rems_bag_stock", bagStock);
  }, [bagStock]);

  useEffect(() => {
    saveLS("rems_doha_import", dohaImport);
  }, [dohaImport]);

  useEffect(() => {
    saveLS("rems_line_items", lineItems);
  }, [lineItems]);

  useEffect(() => {
    saveLS("rems_cfs_items", cfsItems);
  }, [cfsItems]);

  useEffect(() => {
    saveLS("rems_rates", rateList);
  }, [rateList]);

  useEffect(() => {
    saveLS("rems_saved_quotes_v2", savedQuotes);
  }, [savedQuotes]);

  useEffect(() => {
    saveLS("rems_quote_config", quoteConfig);
  }, [quoteConfig]);

  useEffect(() => {
    saveLS("rems_companies", companies);
  }, [companies]);

  useEffect(() => {
    saveLS("rems_buyers", buyers);
  }, [buyers]);

  useEffect(() => {
    saveLS("rems_buyer_locations", buyerLocations);
  }, [buyerLocations]);

  useEffect(() => {
    saveLS("rems_grain_inventory", grainInventory);
  }, [grainInventory]);

  useEffect(() => {
    saveLS("rems_inventory_orders", inventoryOrders);
  }, [inventoryOrders]);

  const handleSaveInventory = () => {
    showToast("Mill inventory balances committed successfully!", "success");
  };

  const handleResetInventory = () => {
    if (commodities.length > 0) {
      const initialInv = commodities.map((c, idx) => ({
        id: "grain_" + c.id + "_" + idx,
        grainName: c.name,
        paddyStockTons: 35 + idx * 5,
        processedRiceTons: 12 + idx,
        readyBagsCount: 150 + idx * 50,
        paddySupplierName: "Vellore Agri Farm Co.",
        supplierLeadTimeDays: 5 + (idx % 3),
        millingLeadTimeDays: 3 + (idx % 2),
        packingLeadTimeDays: 2,
        bagSizeKg: 20,
      }));
      setGrainInventory(initialInv);
    }
    setInventoryOrders([]);
    showToast("Inventory reset to default values.", "success");
  };

  // Reset and Triggers block
  const handleSavePrices = () => {
    showToast("Bag prices saved successfully!");
  };

  const handleResetPrices = () => {
    if (
      confirm("Are you sure you want to restore default bag price structures?")
    ) {
      setBagPrices(INITIAL_BAGS);
      showToast("Bag prices reset successfully.");
    }
  };

  const handleResetCommodities = (industryOnly: boolean = false) => {
    const currentInd = licenceMetadata?.industry || "grain";
    if (industryOnly) {
      if (
        confirm(
          `Are you sure you want to restore default varieties for "${currentInd === "vegetables_fruits" ? "Vegetables & Fruits" : currentInd.toUpperCase()}"?`,
        )
      ) {
        const filteredOut = commodities.filter(
          (c) => (c.industry || "grain") !== currentInd,
        );
        const presets = INITIAL_COMMODITIES.filter(
          (c) => (c.industry || "grain") === currentInd,
        );
        setCommodities([...filteredOut, ...presets]);
        showToast(
          `Default varieties restored for ${currentInd === "vegetables_fruits" ? "Vegetables & Fruits" : currentInd.toUpperCase()}!`,
          "success",
        );
      }
    } else {
      if (
        confirm(
          "Are you sure you want to restore standard preset varieties/products for ALL workspaces?",
        )
      ) {
        setCommodities(INITIAL_COMMODITIES);
        showToast("All workspace default products populated!", "success");
      }
    }
  };

  const handleSaveStock = () => {
    showToast("Warehouse stocks updated!");
  };

  const handleResetStock = () => {
    if (confirm("Reset warehouse stock logs to default demo data?")) {
      setBagStock(INITIAL_BAG_STOCK);
      showToast("Inventory logs reset.");
    }
  };

  const handleSetCfsItems = (newItems: ExpenseItem[]) => {
    if (licenceMetadata && licenceMetadata.planId) {
       const plan = PLANS.find(p => p.id === licenceMetadata.planId);
       if (plan && plan.cfsUpdateLimit !== undefined && !isViren) {
         const currentMonth = new Date().getMonth();
         let { cfsUsageCount = 0, cfsUsageMonth = -1 } = licenceMetadata;
         if (cfsUsageMonth !== currentMonth) {
           cfsUsageCount = 0;
         }
         
         // We consider an update as any state change for simplicity in this prototype
         if (cfsUsageCount >= plan.cfsUpdateLimit) {
            alert(`Your plan limits CFS and Transport updates to ${plan.cfsUpdateLimit} per month. Please upgrade your plan.`);
            return;
         }
       }
    }
    setCfsItems(newItems);
  };

  const handleSaveExpenses = () => {
    if (licenceMetadata && licenceMetadata.planId) {
       const plan = PLANS.find(p => p.id === licenceMetadata.planId);
       if (plan && plan.cfsUpdateLimit !== undefined && !isViren) {
         const currentMonth = new Date().getMonth();
         let { cfsUsageCount = 0, cfsUsageMonth = -1 } = licenceMetadata;
         if (cfsUsageMonth !== currentMonth) {
           cfsUsageCount = 0;
         }
         
         const newMeta = {
          ...licenceMetadata,
          cfsUsageCount: cfsUsageCount + 1,
          cfsUsageMonth: currentMonth
         };
         setLicenceMetadata(newMeta);
         if (activeTenantId) {
           saveLicenceDetails(newMeta).catch(console.error);
         }
       }
    }
    showToast("CFS & CHA expenses stored!");
  };

  const handleResetExpenses = () => {
    if (confirm("Restore standard terminal and custom clearance charges?")) {
      setCfsItems(INITIAL_CFS_ITEMS);
      setLineItems(INITIAL_LINE_ITEMS);
      showToast("Terminal charges restored.");
    }
  };

  const handleSaveDoha = () => {
    showToast("Doha clearance parameters updated!");
  };

  const handleResetDoha = () => {
    if (confirm("Restore Doha customs tariffs and legalization defaults?")) {
      setDohaImport(INITIAL_DOHA_IMPORT);
      showToast("Doha metrics restored.");
    }
  };

  const getNextResetDateStr = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  };

  const handleSetSavedQuotes = (
    update: SavedQuote[] | ((prev: SavedQuote[]) => SavedQuote[])
  ) => {
    setSavedQuotes((prevQuotes) => {
      const nextQuotes = typeof update === "function" ? update(prevQuotes) : update;
      
      if (nextQuotes.length > prevQuotes.length) {
        const isFreeTier = !isViren && (!licenceMetadata || licenceMetadata.planId === "free" || licenceMetadata.approved === false);
        
        if (isFreeTier) {
          const prevIds = prevQuotes.map(q => q.id);
          const newQuotesAdded = nextQuotes.filter(q => !prevIds.includes(q.id));
          
          if (newQuotesAdded.length > 0) {
            const addedQuote = newQuotesAdded[0];
            
            if (addedQuote.isPaidCredit) {
              return nextQuotes;
            }
            
            const hasSingleShipmentCredits = licenceMetadata && (licenceMetadata.singleShipmentCredits || 0) > 0;
            const activeNonCreditQuotes = prevQuotes.filter(q => !q.isPaidCredit);
            
            // 1. Check 2 saved quotes limit
            if (activeNonCreditQuotes.length >= 2) {
              if (hasSingleShipmentCredits) {
                addedQuote.isPaidCredit = true;
                const updatedMeta = {
                  ...licenceMetadata!,
                  singleShipmentCredits: licenceMetadata!.singleShipmentCredits! - 1
                };
                setLicenceMetadata(updatedMeta);
                if (activeTenantId) {
                  saveLicenceDetails(updatedMeta).catch(console.error);
                }
                showToast("Bypassed cap! Used 1 Single-Shipment Credit (saved successfully).", "success");
                return nextQuotes;
              } else {
                showToast("Free tier allows a maximum of 2 saved quotations. Please delete an older folder to save this, or upgrade to a premium plan.", "error");
                return prevQuotes;
              }
            }
            
            // 2. Check 4 calculations per month limit
            const now = new Date();
            const currentMonthFirst = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
            
            let calcsThisMonth = licenceMetadata?.freeTierCalcsThisMonth || 0;
            let nextResetDate = licenceMetadata?.freeTierCalcResetDate || currentMonthFirst;
            
            if (licenceMetadata?.freeTierCalcResetDate !== currentMonthFirst) {
              calcsThisMonth = 0;
              nextResetDate = currentMonthFirst;
            }
            
            if (calcsThisMonth >= 4) {
              if (hasSingleShipmentCredits) {
                addedQuote.isPaidCredit = true;
                const updatedMeta = {
                  ...licenceMetadata!,
                  singleShipmentCredits: licenceMetadata!.singleShipmentCredits! - 1,
                  freeTierCalcsThisMonth: calcsThisMonth,
                  freeTierCalcResetDate: nextResetDate
                };
                setLicenceMetadata(updatedMeta);
                if (activeTenantId) {
                  saveLicenceDetails(updatedMeta).catch(console.error);
                }
                showToast("Bypassed cap! Used 1 Single-Shipment Credit (saved successfully).", "success");
                return nextQuotes;
              } else {
                showToast(`You've used all 4 free calculations this month. Upgrade to continue, or your limit resets on ${getNextResetDateStr()}.`, "error");
                return prevQuotes;
              }
            }
            
            const updatedMeta = {
              ...licenceMetadata!,
              freeTierCalcsThisMonth: calcsThisMonth + 1,
              freeTierCalcResetDate: nextResetDate
            };
            setLicenceMetadata(updatedMeta);
            if (activeTenantId) {
              saveLicenceDetails(updatedMeta).catch(console.error);
            }
          }
        }
      }
      
      return nextQuotes;
    });
  };

  const handleSaveRate = async (
    newRate: RateRow,
    editingQuoteItem?: { quoteId: number; itemIndex: number } | null,
  ) => {
    const isFreeTier = !isViren && (!licenceMetadata || licenceMetadata.planId === "free" || licenceMetadata.approved === false);
    
    if (isFreeTier && !editingQuoteItem) {
      const now = new Date();
      const currentMonthFirst = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      
      let calcsThisMonth = licenceMetadata?.freeTierCalcsThisMonth || 0;
      let nextResetDate = licenceMetadata?.freeTierCalcResetDate || currentMonthFirst;
      
      if (licenceMetadata?.freeTierCalcResetDate !== currentMonthFirst) {
        calcsThisMonth = 0;
        nextResetDate = currentMonthFirst;
      }
      
      const hasSingleShipmentCredits = licenceMetadata && (licenceMetadata.singleShipmentCredits || 0) > 0;
      
      if (calcsThisMonth >= 4) {
        if (hasSingleShipmentCredits) {
          const updatedMeta = {
            ...licenceMetadata!,
            singleShipmentCredits: licenceMetadata!.singleShipmentCredits! - 1,
            freeTierCalcsThisMonth: calcsThisMonth,
            freeTierCalcResetDate: nextResetDate
          };
          setLicenceMetadata(updatedMeta);
          if (activeTenantId) {
            saveLicenceDetails(updatedMeta).catch(console.error);
          }
          showToast("Bypassed cap! Used 1 Single-Shipment Credit.", "success");
          (newRate as any).isPaidCredit = true;
        } else {
          showToast(`You've used all 4 free calculations this month. Upgrade to continue, or your limit resets on ${getNextResetDateStr()}.`, "error");
          return;
        }
      } else {
        const updatedMeta = {
          ...licenceMetadata!,
          freeTierCalcsThisMonth: calcsThisMonth + 1,
          freeTierCalcResetDate: nextResetDate
        };
        setLicenceMetadata(updatedMeta);
        if (activeTenantId) {
          saveLicenceDetails(updatedMeta).catch(console.error);
        }
      }
    }

    if (licenceMetadata && licenceMetadata.planId) {
      const plan = PLANS.find(p => p.id === licenceMetadata.planId);
      if (plan && plan.calcLimit !== undefined && !isViren) {
        const currentMonth = new Date().getMonth();
        let { calcUsageCount = 0, calcUsageMonth = -1 } = licenceMetadata;
        
        // Reset counter if it's a new month
        if (calcUsageMonth !== currentMonth) {
          calcUsageCount = 0;
        }

        if (calcUsageCount >= plan.calcLimit) {
           alert(`Your plan (${plan.name}) restricts you to ${plan.calcLimit} quote rate calculations per month. Please contact your administrator to upgrade your plan.`);
           return;
        }

        const newMeta = {
          ...licenceMetadata,
          calcUsageCount: calcUsageCount + 1,
          calcUsageMonth: currentMonth
        };
        setLicenceMetadata(newMeta);
        if (activeTenantId) {
           saveLicenceDetails(newMeta).catch(console.error);
        }
      }
    }

    if (editingQuoteItem) {
      const { quoteId, itemIndex } = editingQuoteItem;
      setSavedQuotes((prev) =>
        prev.map((q) => {
          if (q.id === quoteId) {
            const updatedItems = [...q.items];
            if (updatedItems[itemIndex]) {
              const oldItem = updatedItems[itemIndex];

              // Re-calculate derived bags and quantities based on backfilled rate values
              const sizeStr = newRate.size || oldItem.size || "GRAIN 20 KG";
              const numFcls = newRate.numFCL || oldItem.numFCL || 1;
              const wtPerContainer =
                newRate.weightPerContainerKg ||
                oldItem.weightPerContainerKg ||
                26020;
              const totalKg = numFcls * wtPerContainer;

              // Extract size numeric value
              const numericSizeValue =
                parseFloat(sizeStr.replace(/[^\d.]/g, "")) || 20;
              const bagsCount = Math.round(totalKg / numericSizeValue);

              updatedItems[itemIndex] = {
                ...oldItem,
                ...newRate,
                dest: newRate.dest,
                commodity: newRate.commodity,
                brand: newRate.brand,
                packed: newRate.packed,
                size: newRate.size,
                master: newRate.master,
                crop: newRate.crop,
                year: newRate.year || "2025",
                rate: newRate.rate,
                condition: newRate.condition,
                paymentTerms: newRate.paymentTerms,
                numFCL: numFcls,
                weightPerContainerKg: wtPerContainer,
                totalWeightKg: totalKg,
                totalBags: bagsCount,

                // cost breakdown updates
                bExMill: (newRate as any).bExMill || 0,
                blendRice1Name: (newRate as any).blendRice1Name || "",
                blendRice1Pct: (newRate as any).blendRice1Pct || 0,
                blendRice1ExMill: (newRate as any).blendRice1ExMill || 0,
                blendRice2Name: (newRate as any).blendRice2Name || "",
                blendRice2Pct: (newRate as any).blendRice2Pct || 0,
                blendRice2ExMill: (newRate as any).blendRice2ExMill || 0,
                blendCookingRemarks: (newRate as any).blendCookingRemarks || "",
                bPackaging: (newRate as any).bPackaging || 0,
                bTransport: (newRate as any).bTransport || 0,
                bCfsPort: (newRate as any).bCfsPort || 0,
                bFreight: (newRate as any).bFreight || 0,
                bInsurance: (newRate as any).bInsurance || 0,
                dutyPct: (newRate as any).dutyPct || 0,
                exrate: (newRate as any).exrate || 91.5,
                commission: (newRate as any).commission || 0,
              };
            }
            return {
              ...q,
              items: updatedItems,
            };
          }
          return q;
        }),
      );
      setBackfillItem(null);
      showToast("Export Offer Item Overwritten & Recalculated!");
      setActiveTab("savedquotes");
    } else {
      setRateList((prev) => [newRate, ...prev]);
      showToast("Export Price Quote added to Plate Board!");
    }
  };

  const handlePushToCalculator = (
    transportKg: number,
    cfsKg: number,
    currentFcl: number,
    payloadWt: number,
  ) => {
    setTransportCost(transportKg);
    setCfsCost(cfsKg);
    setFclCount(currentFcl);
    setWeightPerContainer(payloadWt);
    setActiveTab("calc");
  };

  const handleTriggerQuoteSheetSetup = (rateIds: number[]) => {
    setSelectedRateIds(rateIds);
    setActiveTab("quote");
  };

  const handleLaunchWorkspace = (
    quoteId: number,
    type: "pi" | "ci" | "pl",
    openInNewTab: boolean = false,
  ) => {
    if (openInNewTab) {
      const url = `${window.location.origin}${window.location.pathname}?workspace=true&quoteId=${quoteId}&type=${type}`;
      window.open(url, "_blank");
      showToast(
        `Redirecting ${type.toUpperCase()} compliance to standard A4 sheet...`,
      );
    } else {
      setWorkspaceQuoteId(quoteId);
      setWorkspaceDocType(type);
      setWorkspaceActive(true);
    }
  };

  const handleClearDatabase = () => {
    if (
      confirm(
        "CRITICAL FACTORY WARNING:\n\nAre you absolutely sure you want to purge all active states? This deletes everything, including saved quotes, and resets layout values.",
      )
    ) {
      localStorage.clear();
      setCommodities(state.commodities);
      setPorts(state.ports);
      setConditions(state.conditions);
      setPaymentTerms(INITIAL_PAYMENT_TERMS);
      setBagPrices(INITIAL_BAGS);
      setBagStock(INITIAL_BAG_STOCK);
      setDohaImport(INITIAL_DOHA_IMPORT);
      setCfsItems(INITIAL_CFS_ITEMS);
      setLineItems(INITIAL_LINE_ITEMS);
      setRateList(INITIAL_RATES);
      setSavedQuotes([]);
      setCompanies([]);
      setBuyers([]);
      setBuyerLocations([]);
      setSelectedRateIds([]);
      setActiveTab("calc");
      showToast("Purge completed!");
    }
  };

  // Auth Loading transition layer
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans p-6 text-center">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Loading Cloud Workspace...
        </p>

        {authLoadingSlow && (
          <div className="mt-8 max-w-sm bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-lg animate-in fade-in zoom-in duration-300">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-left">
                <h4 className="text-sm font-bold text-white mb-1">
                  Loading takes longer than usual
                </h4>
                <p className="text-xs text-slate-300">
                  Firebase is taking a moment to connect. Your domain is
                  properly authorized, so you can continue waiting, or click the
                  button below to use the app immediately in offline mode.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setAuthLoading(false);
                setAuthLoadingSlow(false);
              }}
              className="mt-2 w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition"
            >
              Force Enter Offline Mode
            </button>
          </div>
        )}
      </div>
    );
  }

  // Not Authenticated Layer
  const isSuperAdminEmail = currentUser?.email?.toLowerCase() === 'vnp.viren@gmail.com';
  if (currentUser && !isSuperAdminEmail && (licenceMetadata?.loginBlocked || userMembership?.loginBlocked)) {
    const isPending = userMembership?.tenantId === 'PENDING_APPROVAL';
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className={`${isPending ? 'bg-slate-900 border-blue-500/20 shadow-blue-900/20' : 'bg-slate-900 border-rose-500/20 shadow-rose-900/20'} border shadow-2xl max-w-md w-full p-8 rounded-3xl text-center space-y-6`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${isPending ? 'bg-blue-500/10 text-blue-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {isPending ? (
              <Clock className="w-8 h-8" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            )}
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            {isPending ? "Pending Admin Approval" : "Account Access Revoked"}
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            {isPending
              ? "Your account has been created successfully but requires administrator approval to join a workspace. Please contact your system administrator to assign your account to a tenant."
              : "Your login access has been suspended by the platform administrator. Please contact support or your system administrator to reinstate your access."}
          </p>
          <button
            onClick={() => auth.signOut()}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors border border-slate-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }


  if (!currentUser) {
    if (showMarketing) {
      return (
        <LandingPage
          onGoToAuth={() => setShowMarketing(false)}
          savedQuotes={savedQuotes}
          licenceMetadata={licenceMetadata || publicLicence}
        />
      );
    }
    return (
      <div className="relative">
        <button
          onClick={() => setShowMarketing(true)}
          className="absolute top-4 left-4 z-50 text-[10px] font-mono font-bold text-slate-400 hover:text-white bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl transition shadow-xl"
        >
          ← Return to Marketing Homepage
        </button>
        <AuthScreen onSuccess={() => {}} />
      </div>
    );
  }

  // Admin bypasses billing approval and OTP verification to handle system setups
  const SUPER_ADMINS = ["vnp.viren@gmail.com", "admin@example.com"];
  const isViren = currentUser?.email
    ? SUPER_ADMINS.includes(currentUser.email.toLowerCase())
    : false;

  if (currentUser && licenceMetadata && (!licenceMetadata.industrySelected || !userMembership?.onboarded)) {
    return <OnboardingFlow userId={currentUser.uid} licenceMetadata={licenceMetadata} onComplete={() => {
      setLicenceMetadata({ ...licenceMetadata, industrySelected: true });
      setUserMembership(prev => prev ? { ...prev, onboarded: true } : prev);
    }} />;
  }


  // 1. Check approval state for Trial Mode
  const isTrialMode =
    forceTrialMode ||
    Boolean(
      currentUser &&
      licenceMetadata &&
      licenceMetadata.approved === false &&
      !isViren,
    );

  // Standalone Vessel Schedule Explorer
  if (vesselLookupActive) {
    return (
      <VesselScheduleExplorer
        refId={vesselLookupRef}
        initialOrigin={vesselLookupOrigin}
        initialDest={vesselLookupDest}
        savedQuotes={savedQuotes}
        onSaveQuotes={(newList) => setSavedQuotes(newList)}
        onClose={() => setVesselLookupActive(false)}
      />
    );
  }

  // Standalone Compliance Roadmap
  if (complianceActive && complianceQuoteId !== null) {
    return (
      <SavedQuotes
        savedQuotes={savedQuotes}
        setSavedQuotes={handleSetSavedQuotes}
        onNavigateToTab={setActiveTab}
        setSelectedRateIds={setSelectedRateIds}
        isStandaloneCompliance={true}
        standaloneQuoteId={complianceQuoteId}
        isViren={isViren}
      />
    );
  }

  const IndustryRateCalculator = getRateCalculator(activeIndustryContext);
const IndustryBagPriceAndStock = getBagPriceAndStock(activeIndustryContext);
const IndustryCfsTransport = getCfsTransport(activeIndustryContext);
const IndustryQuoteSheet = getQuoteSheet(activeIndustryContext);

  let derivedAllowedModules = isViren
    ? ALL_MODULES.map((m) => m.id)
    : licenceMetadata?.allowedModules || ALL_MODULES.map((m) => m.id);

  // Fallback: Ensure free tier users always have PI/CI generation even if their metadata was created before the feature was added to the free tier default.
  if (!isViren && derivedAllowedModules && !derivedAllowedModules.includes("pi_ci_generation")) {
    if (!licenceMetadata || !licenceMetadata.planId || licenceMetadata.planId === "free") {
      derivedAllowedModules = [...derivedAllowedModules, "pi_ci_generation"];
    }
  }

  const isModuleEnabled = (moduleCode: string) => {
    if (isViren) return true;
    // 1. Is the module allowed by the tenant license or viren override?
    if (!derivedAllowedModules.includes(moduleCode)) {
      return false;
    }
    // 2. Did the user specifically disable it in settings? (unchecking saves false)
    if (userModulePrefs[moduleCode] === false) {
      return false;
    }
    return true;
  };

  // Active Workspace Sheet Context
  if (workspaceActive && workspaceQuoteId !== null) {
    return (
      <ErrorBoundary>
        <DocumentWorkspace
          quoteId={workspaceQuoteId}
          initialType={workspaceDocType}
          showToast={showToast}
          onClose={() => setWorkspaceActive(false)}
          onSaveCallback={(newList) => {
            setSavedQuotes(newList);
            showToast("Operations database customized!");
          }}
          licenceMetadata={licenceMetadata}
          userId={currentUser ? currentUser.uid : ""}
          activeTenantId={activeTenantId || ""}
          bagStock={bagStock}
          setBagStock={setBagStock}
          allowedModules={(derivedAllowedModules || []).filter(isModuleEnabled)}
          isViren={isViren}
        />
      </ErrorBoundary>
    );
  }

  // 2. Check security OTP verification layout (Completely disabled as per user request so users never see the OTP gate)
  /*
  if (currentUser && licenceMetadata && licenceMetadata.otpEnabled && !otpVerified && !isViren) {
  }
  */

  const renderLockedModule = (title: string, description: string) => (
    <div
      className="p-8 text-center bg-white border border-gray-200 rounded-3xl max-w-xl mx-auto shadow-sm space-y-5 my-8"
      id="locked_module_notice"
    >
      <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
        <Lock className="w-7 h-7" />
      </div>

      <div className="space-y-2 border-b border-gray-100 pb-5">
        <h3 className="font-extrabold text-base text-gray-950 uppercase tracking-wider">
          {title} Module Locked
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed max-w-md mx-auto font-sans">
          {description}
        </p>
      </div>

      <div className="py-4 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-left space-y-3.5">
        <div className="space-y-1 text-center">
          <p className="text-sm font-black text-rose-600 uppercase tracking-wider">
            Access Restricted
          </p>
          <p className="text-xs font-semibold text-slate-800">
            You don't have access to this module.
          </p>
        </div>

        <div className="text-xs font-sans text-slate-600 space-y-2.5 pt-2 border-t border-slate-200/50">
          <p className="flex items-center gap-1.5 justify-center font-bold text-slate-800">
            ⚡ Upgrade your current subscription to a higher plan or contact
            support to enable.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-1">
            <a
              href="tel:+919508503112"
              className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-teal-500 rounded-xl text-[11px] font-bold text-slate-700 hover:text-teal-600 transition flex items-center gap-1 shadow-2xs"
            >
              📞 Call Helpline: +91 95085 03112
            </a>
            <a
              href="mailto:support@vnp-export.com?subject=Module%20Access%20Request"
              className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-indigo-500 rounded-xl text-[11px] font-bold text-slate-700 hover:text-indigo-600 transition flex items-center gap-1 shadow-2xs"
            >
              ✉️ Email Support Desk
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  const handleSetTab = (tab: string) => {
    setActiveTab(tab);
    if (isTrialMode && tab !== "licence") {
      showToast(
        "You are in trial mode. Connect with Admin to activate full app.",
        "warn",
      );
    }
  };

  const isFreeTierUser = currentUser && !isViren && (
    !licenceMetadata || 
    !licenceMetadata.planId ||
    licenceMetadata.planId === "free" || 
    licenceMetadata.approved === false
  );
  
  const showOnboarding = !!(licenceMetadata && isFreeTierUser && (!licenceMetadata.industrySelected || !userMembership?.onboarded));

  return (
    <>
    <BackupReminder />
    {showOnboarding && (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-6 md:p-8 max-h-[92vh] overflow-y-auto border border-gray-100 flex flex-col space-y-6 animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-full">
              <Building className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
              Welcome! Select Your Industry Workspace
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto leading-normal font-sans">
              On the <span className="font-semibold text-indigo-600">Free Tier</span>, you can activate exactly <span className="font-semibold text-indigo-600">one dedicated industry workspace</span>. Choose your trade sector below to get started.
            </p>
          </div>

          {/* Feature list box */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 font-sans">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              🎁 Activated Free Tier Modules For Your Selected Industry:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <Check className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">Rate & Weight Calculator</span>
                  <p className="text-[10px] text-slate-400">Perform standard FCL rate conversions.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">Quotation History Board</span>
                  <p className="text-[10px] text-slate-400">Securely view ship docs and saved quotes.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">Outbound PDF Share Hub</span>
                  <p className="text-[10px] text-slate-400">Export and share beautiful quote letters.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">Bag Price & Stock Manager</span>
                  <p className="text-[10px] text-slate-400">Configure packaging configurations & items.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 col-span-1 md:col-span-2 lg:col-span-1">
                <Check className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">Grain & Stock Yields</span>
                  <p className="text-[10px] text-slate-400">Track raw grain inventory and process yields.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Industry Selection Grid */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">
              Select Your Industry Segment:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-sans">
              {ALL_ONBOARDING_INDUSTRIES.map((ind) => {
                const isSelected = onboardingSelectedIndustry === ind.id;
                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => setOnboardingSelectedIndustry(ind.id)}
                    className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all ${isSelected ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xl">{ind.icon}</span>
                      <span className="font-bold text-slate-800 text-xs">{ind.label}</span>
                    </div>
                    <p className="text-[10.5px] text-slate-400 leading-normal line-clamp-2">
                      {ind.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Button Section */}
          <div className="border-t border-slate-100 pt-5 flex items-center justify-between font-sans">
            <span className="text-[10.5px] text-slate-400">
              * Note: You can change your selection later from workspace settings.
            </span>
            <button
              onClick={handleActivateFreeTierOnboarding}
              disabled={isActivatingOnboarding}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md shadow-indigo-600/10 flex items-center gap-1.5"
            >
              {isActivatingOnboarding ? (
                <span>Activating...</span>
              ) : (
                <>
                  <span>Activate Workspace</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    <div
      className="flex flex-col md:flex-row min-h-screen bg-gray-50 text-gray-800 font-sans"
      id="rice_export_manager_root"
    >
      {/* Sidebar navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSetTab}
        rateCount={rateList.length}
        savedQuotesCount={savedQuotes.length}
        sidebarPinned={sidebarPinned}
        setSidebarPinned={setSidebarPinned}
        userEmail={currentUser.email}
        onLogout={handleLogout}
        industry={activeIndustryContext}
        activeIndustries={licenceMetadata?.industry ? licenceMetadata.industry.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean) : [activeIndustryContext]}
        setActiveIndustry={setSelectedIndustry}
        allowedModules={[...derivedAllowedModules, "drive_storage"].filter(
          (m) => isModuleEnabled(m),
        )}
        activeTenantId={activeTenantId}
        licenceMetadata={licenceMetadata}
      />

      {/* Main Panel views layout */}
      <main
        className="flex-1 p-4 md:p-6 overflow-x-hidden min-h-0 print:m-0 print:p-0 print:overflow-visible relative"
      >
        <div>
          {/* EXPORTER & WORKSPACE CONTEXT TOP-BAR */}
          {((currentUser &&
            userMembership &&
            (userMembership.companyAName || userMembership.companyBName)) ||
            (licenceMetadata?.industry &&
              licenceMetadata.industry.split(",").length > 0)) && (
            <div
              className="bg-white border border-gray-200 rounded-2xl p-3.5 mb-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 animate-in fade-in duration-300 print:hidden"
              id="multi-company-top-switcher-bar"
            >
              <div className="flex items-center gap-2">
                {licenceMetadata?.logoBase64 ? (
                  <div className="h-8 max-w-[60px] flex items-center justify-center bg-white border border-gray-100 rounded px-1 shrink-0">
                    <img
                      src={licenceMetadata.logoBase64}
                      alt="Company Logo"
                      className="max-h-[26px] w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Building className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-gray-400 block leading-none mb-0.5">
                    ACTIVE EXPORTER CONTEXT
                  </span>
                  <span className="text-sm font-black text-slate-800 font-sans tracking-tight flex items-center">
                    🏢 {activeTenantName}
                    <span className="font-mono text-xs text-indigo-600 font-bold ml-1 mr-2">
                      ({activeTenantId})
                    </span>
                    {licenceMetadata?.industry &&
                    licenceMetadata.industry.split(",").length > 1 ? (
                      <select
                        value={selectedIndustry}
                        onChange={(e) => setSelectedIndustry(e.target.value)}
                        className="ml-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded px-2 py-1 outline-none cursor-pointer uppercase tracking-wider"
                        title="Switch active industry workspace"
                      >
                        {licenceMetadata.industry
                          .split(",")
                          .map((s: string) => {
                            const val = s.trim().toLowerCase();
                            // Map internal keys to friendly names
                            const label =
                              val === "grain"
                                ? "Grain / Rice"
                                : val === "rice_merchant"
                                  ? "Rice Merchant"
                                  : val === "polymer"
                                    ? "Polymer & Plastics"
                                    : val === "cardboard_carton"
                                      ? "Cardboard & Cartons"
                                  : val === "vegetables_fruits"
                                    ? "Vegetables & Fruits"
                                    : val.charAt(0).toUpperCase() + val.slice(1);
                            return (
                              <option key={val} value={val}>
                                {label}
                              </option>
                            );
                          })}
                      </select>
                    ) : (
                      <span
                        className="ml-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                        title="Active Module Workspace Context"
                      >
                        {activeIndustryContext === "grain"
                          ? "Grain / Rice"
                          : activeIndustryContext === "rice_merchant"
                            ? "Rice Merchant"
                            : activeIndustryContext === "polymer"
                              ? "Polymer & Plastics"
                              : activeIndustryContext === "cardboard_carton"
                                ? "Cardboard & Cartons"
                            : activeIndustryContext === "vegetables_fruits"
                              ? "Vegetables & Fruits"
                            : activeIndustryContext}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowModuleConfig(true);
                      }}
                      className="min-w-32 ml-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded shadow-sm transition flex items-center justify-center gap-1.5"
                      title="Manage Interface Modules"
                    >
                      <SettingsIcon className="w-3.5 h-3.5" />
                      Modules Config
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          const modules = derivedAllowedModules;
                          const mStr =
                            modules
                              .map((m: string) => m.replace(/_/g, " "))
                              .join(", ") || "No active modules";
                          showToast(`Activated Modules Workspace: ${mStr}`);
                        } catch (err) {
                          console.error("Toast error:", err);
                        }
                      }}
                      className="ml-2 text-indigo-400 hover:text-indigo-700 transition flex items-center justify-center p-1 rounded-full hover:bg-indigo-50"
                      title="View Workspace Modules"
                    >
                      <Info className="w-4 h-4 pointer-events-none" />
                    </button>
                  </span>
                </div>
              </div>

              {currentUser &&
                userMembership &&
                (userMembership.companyAName ||
                  userMembership.companyBName) && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Company A Switch Button */}
                    {userMembership.companyAName && (
                      <button
                        onClick={async () => {
                          if (userMembership.companyAApproved) {
                            handleTenantChange(
                              userMembership.companyATenantId,
                              true,
                            );
                          } else {
                            try {
                              setAuthLoading(true);
                              // Auto approve membership flag
                              await updateMembershipSubCompanies(
                                currentUser.uid,
                                {
                                  companyAApproved: true,
                                },
                              );
                              // Also auto approve LicenceDetails object
                              const licA = await getLicenceDetails(
                                userMembership.companyATenantId,
                              );
                              if (licA) {
                                licA.approved = true;
                                await saveLicenceDetails(licA);
                              } else {
                                const newLic = {
                                  tenantId: userMembership.companyATenantId,
                                  name: userMembership.companyAName,
                                  ownerId: currentUser.uid,
                                  ownerEmail: currentUser.email || "",
                                  createdAt: new Date().toISOString(),
                                  approved: true,
                                  otpEnabled: false,
                                  otpMethod: "disabled",
                                  industry:
                                    licenceMetadata?.industry || "grain",
                                  allowedModules:
                                    licenceMetadata?.allowedModules || [
                                      "rate_calc",
                                      "quote_saving",
                                      "quote_sharing",
                                      "bag_price_stock",
                                      "grain_inventory",
                                      "pi_ci_generation",
                                    ],
                                };
                                await saveLicenceDetails(newLic as any);
                              }
                              showToast(
                                `"${userMembership.companyAName}" approved and activated successfully!`,
                                "success",
                              );
                              handleTenantChange(
                                userMembership.companyATenantId,
                                true,
                              );
                            } catch (err) {
                              console.error(err);
                              setAuthLoading(false);
                              showToast(
                                "Failed to auto-activate the company profile.",
                                "error",
                              );
                            }
                          }
                        }}
                        className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                          activeTenantId === userMembership.companyATenantId
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-xs"
                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span className="truncate max-w-[130px]">
                          {userMembership.companyAName}
                        </span>
                        {userMembership.companyAApproved ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                              activeTenantId === userMembership.companyATenantId
                                ? "bg-indigo-700 text-indigo-100"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {activeTenantId === userMembership.companyATenantId
                              ? "Active"
                              : "Unselected"}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[8px] font-black uppercase animate-pulse w-max">
                            Approve & Select
                          </span>
                        )}
                      </button>
                    )}

                    {/* Company B Switch Button */}
                    {userMembership.companyBName && (
                      <button
                        onClick={async () => {
                          if (userMembership.companyBApproved) {
                            handleTenantChange(
                              userMembership.companyBTenantId,
                              true,
                            );
                          } else {
                            try {
                              setAuthLoading(true);
                              // Auto approve membership flag
                              await updateMembershipSubCompanies(
                                currentUser.uid,
                                {
                                  companyBApproved: true,
                                },
                              );
                              // Also auto approve LicenceDetails object
                              const licB = await getLicenceDetails(
                                userMembership.companyBTenantId,
                              );
                              if (licB) {
                                licB.approved = true;
                                await saveLicenceDetails(licB);
                              } else {
                                const newLic = {
                                  tenantId: userMembership.companyBTenantId,
                                  name: userMembership.companyBName,
                                  ownerId: currentUser.uid,
                                  ownerEmail: currentUser.email || "",
                                  createdAt: new Date().toISOString(),
                                  approved: true,
                                  otpEnabled: false,
                                  otpMethod: "disabled",
                                  industry:
                                    licenceMetadata?.industry || "grain",
                                  allowedModules:
                                    licenceMetadata?.allowedModules || [
                                      "rate_calc",
                                      "quote_saving",
                                      "quote_sharing",
                                      "bag_price_stock",
                                      "grain_inventory",
                                      "pi_ci_generation",
                                    ],
                                };
                                await saveLicenceDetails(newLic as any);
                              }
                              showToast(
                                `"${userMembership.companyBName}" approved and activated successfully!`,
                                "success",
                              );
                              handleTenantChange(
                                userMembership.companyBTenantId,
                                true,
                              );
                            } catch (err) {
                              console.error(err);
                              setAuthLoading(false);
                              showToast(
                                "Failed to auto-activate the company profile.",
                                "error",
                              );
                            }
                          }
                        }}
                        className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                          activeTenantId === userMembership.companyBTenantId
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-xs"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span className="truncate max-w-[130px]">
                          {userMembership.companyBName}
                        </span>
                        {userMembership.companyBApproved ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                              activeTenantId === userMembership.companyBTenantId
                                ? "bg-indigo-700 text-indigo-100"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {activeTenantId === userMembership.companyBTenantId
                              ? "Active"
                              : "Unselected"}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[8px] font-black uppercase animate-pulse w-max">
                            Approve & Select
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                )}
            </div>
          )}

          {/* VIEW ROUTER CONTROLLER */}
          {activeTab === "dashboard" &&
            currentUser?.email?.toLowerCase() === "vnp.viren@gmail.com" && (
              <DashboardView savedQuotes={savedQuotes} />
            )}

          {activeTab === "calc" &&
            (isModuleEnabled("rate_calc") ? (
                      <IndustryRateCalculator
                commodities={commodities}
                ports={ports}
                setPorts={setPorts}
                conditions={conditions}
                setConditions={setConditions}
                paymentTerms={paymentTerms}
                setPaymentTerms={setPaymentTerms}
                bagPrices={bagPrices}
                bagStock={bagStock}
                transportCost={transportCost}
                cfsCost={cfsCost}
                weightPerContainer={weightPerContainer}
                fclCount={fclCount}
                setFclCount={setFclCount}
                onSaveRate={handleSaveRate}
                industry={activeIndustryContext}
                onNavigateTab={(tab) => setActiveTab(tab)}
                grainInventory={grainInventory}
                backfillItem={backfillItem}
                onClearBackfill={() => setBackfillItem(null)}
                isInventoryEnabled={isModuleEnabled("grain_inventory")}
                isBagStockEnabled={isModuleEnabled("bag_price_stock")}
                availableIndustries={
                  licenceMetadata?.industry
                    ? licenceMetadata.industry
                        .split(",")
                        .map((s: string) => s.trim().toLowerCase())
                    : ["grain"]
                }
                onIndustryChange={setSelectedIndustry}
                licenceMetadata={licenceMetadata}
                isTrialMode={isTrialMode}
                rateListLength={rateList.length}
              />
            ) : (
              renderLockedModule(
                "Rate Calculator",
                "Detailed FCL container cost simulations, weight projections, and cargo capacity indices are deactivated under your active workspace configuration.",
              )
            ))}

          {activeTab === "rates" &&
            (isModuleEnabled("rate_calc") ? (
              <RateListBoard
                rateList={rateList}
                setRateList={setRateList}
                commodities={commodities}
                ports={ports}
                onTriggerQuoteSheetSetup={handleTriggerQuoteSheetSetup}
                grainInventory={grainInventory}
                isInventoryEnabled={isModuleEnabled("grain_inventory")}
                conditions={conditions}
                isTrialMode={isTrialMode}
                industry={activeIndustryContext}
              />
            ) : (
              renderLockedModule(
                "Rate Board Database",
                "Target sheets, reference price records, and active workspace logs are deactivated under your active workspace configuration.",
              )
            ))}

          {activeTab === "social_board" &&
            (isModuleEnabled("social_rate_list") ? (
              <SocialRateBoard commodities={commodities} licenceMetadata={licenceMetadata} industry={activeIndustryContext} />
            ) : (
              renderLockedModule(
                "Social Rate Board",
                "Social media rate publishing and clipboard features are deactivated under your active workspace configuration. Please request access from the system administrator."
              )
            ))}

          {activeTab === "bags" &&
            (isModuleEnabled("bag_price_stock") ? (
              <IndustryBagPriceAndStock
                bagPrices={bagPrices}
                setBagPrices={setBagPrices}
                bagStock={bagStock}
                setBagStock={setBagStock}
                onSavePrices={handleSavePrices}
                onResetPrices={handleResetPrices}
                onSaveStock={handleSaveStock}
                onResetStock={handleResetStock}
                industry={activeIndustryContext}
                licenceMetadata={licenceMetadata}
              />
            ) : (
              renderLockedModule(
                activeIndustryContext === "metal"
                  ? "Strapping & Pack Ref"
                  : activeIndustryContext === "tiles"
                    ? "Pallet & Box Reference"
                    : activeIndustryContext === "pharma"
                      ? "Packaging & Consumables Ref"
                      : activeIndustryContext === "oil"
                        ? "Packaging & Tanks Ref"
                        : "Bag Price & Stock",
                "Supplier configurations, tare package rates, and active stock volume tallies are deactivated under your active workspace modules.",
              )
            ))}

          {activeTab === "inventory" &&
            (isModuleEnabled("grain_inventory") ? (
              <InventoryManager
                commodities={commodities}
                grainInventory={grainInventory}
                setGrainInventory={setGrainInventory}
                inventoryOrders={inventoryOrders}
                setInventoryOrders={setInventoryOrders}
                savedQuotes={savedQuotes}
                onSaveInventory={handleSaveInventory}
                onResetInventory={handleResetInventory}
                showToast={showToast}
              />
            ) : (
              renderLockedModule(
                "Production & Grain Inventory CONTROL",
                "Warehouse silo balances, supplier purchase channels, and algorithmic milling/packing lead times calculations are restricted under your active workspace modules.",
              )
            ))}

          {activeTab === "trade_intel" &&
            (isModuleEnabled("trade_intelligence") ? (
              <TradeIntelligence
                industry={activeIndustryContext}
                allowedModules={(derivedAllowedModules || []).filter(isModuleEnabled)}
              />
            ) : (
              renderLockedModule(
                "Trade Intelligence (EXIM Data)",
                "Global shipping data, buyer pipelines, and port import intelligence feeds are deactivated under your active workspace configuration.",
              )
            ))}

          {activeTab === "expenses" && (
            <IndustryCfsTransport
              lineItems={lineItems}
              setLineItems={setLineItems}
              cfsItems={cfsItems}
              setCfsItems={handleSetCfsItems}
              fclCount={fclCount}
              setFclCount={setFclCount}
              weightPerContainer={weightPerContainer}
              setWeightPerContainer={setWeightPerContainer}
              onSaveExpenses={handleSaveExpenses}
              onResetExpenses={handleResetExpenses}
              onPushToCalculator={handlePushToCalculator}
            />
          )}

          {activeTab === "dohaimport" &&
            (currentUser?.email?.toLowerCase() === "vnp.viren@gmail.com" ? (
              <DohaImport
                dohaImport={dohaImport}
                setDohaImport={setDohaImport}
                onSaveDoha={handleSaveDoha}
                onResetDoha={handleResetDoha}
                savedQuotes={savedQuotes}
                lineItems={lineItems}
                cfsItems={cfsItems}
                appFclWeight={weightPerContainer}
                bagPrices={bagPrices}
              />
            ) : (
              <div className="p-12 text-center bg-white border border-gray-200 rounded-3xl max-w-lg mx-auto shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto text-lg font-black">
                  ⚠
                </div>
                <h3 className="text-base font-black text-gray-900 uppercase">
                  Access Restricted
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  This Doha Import custom reference board is exclusively
                  restricted to the primary system administrator (
                  <strong className="font-bold text-gray-800">
                    VNP.VIREN@gmail.com
                  </strong>
                  ) for confidential operational overhead calculations.
                </p>
              </div>
            ))}

          {activeTab === "profit_loss" && <ProfitLossMetrics savedQuotes={savedQuotes} />}

          {activeTab === "master_admin" &&
            (currentUser?.email?.toLowerCase() === "vnp.viren@gmail.com" ? (
              <div className="space-y-16 animate-in fade-in zoom-in-95 duration-500 pb-20">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-6 py-4">
                    <h2 className="text-xl font-black tracking-tight">
                      1. RATE CALCULATOR SETTINGS
                    </h2>
                    <p className="text-blue-100 text-sm">
                      Configure commodities, ports, and terms.
                    </p>
                  </div>
                  <div className="p-6">
                    <Settings
                      commodities={commodities}
                      setCommodities={setCommodities}
                      ports={ports}
                      setPorts={setPorts}
                      onClearDatabase={handleClearDatabase}
                      industry={activeIndustryContext}
                      onResetCommodities={handleResetCommodities}
                      userModulePrefs={userModulePrefs}
                      setUserModulePrefs={setUserModulePrefs}
                      allowedModules={derivedAllowedModules}
                      quoteConfig={quoteConfig}
                      setQuoteConfig={setQuoteConfig}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-700 to-indigo-800 text-white px-6 py-4">
                    <h2 className="text-xl font-black tracking-tight">
                      2. PACKAGING SUPPLIERS & STOCK
                    </h2>
                    <p className="text-indigo-100 text-sm">
                      Manage tare pricing and inventory levels.
                    </p>
                  </div>
                  <div className="p-0">
                    <IndustryBagPriceAndStock
                      bagPrices={bagPrices}
                      setBagPrices={setBagPrices}
                      bagStock={bagStock}
                      setBagStock={setBagStock}
                      onSavePrices={handleSavePrices}
                      onResetPrices={handleResetPrices}
                      onSaveStock={handleSaveStock}
                      onResetStock={handleResetStock}
                      industry={activeIndustryContext}
                      licenceMetadata={licenceMetadata}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white px-6 py-4">
                    <h2 className="text-xl font-black tracking-tight">
                      3. CFS & TRANSPORT OVERHEADS
                    </h2>
                    <p className="text-teal-100 text-sm">
                      Line items and container station overheads.
                    </p>
                  </div>
                  <div className="p-0">
                    <IndustryCfsTransport
                      lineItems={lineItems}
                      setLineItems={setLineItems}
                      cfsItems={cfsItems}
                      setCfsItems={handleSetCfsItems}
                      fclCount={fclCount}
                      setFclCount={setFclCount}
                      weightPerContainer={weightPerContainer}
                      setWeightPerContainer={setWeightPerContainer}
                      onSaveExpenses={handleSaveExpenses}
                      onResetExpenses={handleResetExpenses}
                      onPushToCalculator={handlePushToCalculator}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-rose-700 to-rose-800 text-white px-6 py-4">
                    <h2 className="text-xl font-black tracking-tight">
                      4. DOHA CUSTOMS & IMPORT OVERHEADS
                    </h2>
                    <p className="text-rose-100 text-sm">
                      Destination port custom fees and clearance.
                    </p>
                  </div>
                  <div className="p-0">
                    <DohaImport
                      dohaImport={dohaImport}
                      setDohaImport={setDohaImport}
                      onSaveDoha={handleSaveDoha}
                      onResetDoha={handleResetDoha}
                      savedQuotes={savedQuotes}
                      lineItems={lineItems}
                      cfsItems={cfsItems}
                      appFclWeight={weightPerContainer}
                      bagPrices={bagPrices}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-white border border-gray-200 rounded-3xl max-w-lg mx-auto shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto text-lg font-black">
                  ⚠
                </div>
                <h3 className="text-base font-black text-gray-900 uppercase">
                  Access Restricted
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  This Master Configuration page is exclusively restricted to
                  the primary system administrator.
                </p>
              </div>
            ))}

          {activeTab === "quote" &&
            (isModuleEnabled("pi_ci_generation") ? (
              <IndustryQuoteSheet
                selectedRateIds={selectedRateIds}
                rateList={rateList}
                savedQuotes={savedQuotes}
                setSavedQuotes={handleSetSavedQuotes}
                companies={companies}
                setCompanies={setCompanies}
                buyers={buyers}
                setBuyers={setBuyers}
                buyerLocations={buyerLocations}
                setBuyerLocations={setBuyerLocations}
                onNavigateToTab={setActiveTab}
                allowedModules={(derivedAllowedModules || []).filter(isModuleEnabled)}
                industry={activeIndustryContext}
                licenceMetadata={licenceMetadata}
                isTrialMode={isTrialMode}
                quoteConfig={quoteConfig}
                setQuoteConfig={setQuoteConfig}
              />
            ) : (
              renderLockedModule(
                "Quotation Sheet & PI/CI Editor",
                "Commercial itemized pricing grids, proforma headers, packing lists, and company letterhead configs are deactivated under your active workspace configuration.",
              )
            ))}

          {activeTab === "marketing" && <MarketingMaterials />}

          {activeTab === "savedquotes" &&
            (isModuleEnabled("quote_saving") ? (
              <SavedQuotes
                savedQuotes={savedQuotes}
                setSavedQuotes={handleSetSavedQuotes}
                onNavigateToTab={setActiveTab}
                setSelectedRateIds={setSelectedRateIds}
                onLaunchWorkspace={handleLaunchWorkspace}
                allowedModules={(derivedAllowedModules || []).filter(isModuleEnabled)}
                industry={activeIndustryContext}
                licenceMetadata={licenceMetadata}
                grainInventory={grainInventory}
                isInventoryEnabled={isModuleEnabled("grain_inventory")}
                initialQuoteId={workspaceQuoteId}
                onSendToCalculator={(payload) => {
                  setBackfillItem(payload);
                  setActiveTab("calc");
                  showToast(
                    `Backfilled parameters for item ${payload.itemIndex + 1} (${payload.data.commodity}) into Rate Calculator.`,
                  );
                }}
                isViren={isViren}
                isTrialMode={isTrialMode}
              />
            ) : (
              renderLockedModule(
                "Saved Quotations & Logs",
                "Historical client offer logs, transaction folders, PDF download registries, and transit tracking maps are deactivated under your active workspace configuration.",
              )
            ))}

          {activeTab === "licence" && currentUser && activeTenantId && (
            <LicenceManager
              userId={currentUser.uid}
              userEmail={currentUser.email}
              activeTenantId={activeTenantId}
              activeTenantName={activeTenantName}
              tenantRole={tenantRole}
              onTenantChange={handleTenantChange}
              showToast={showToast}
              licenceMetadata={licenceMetadata}
              onUpdateLicenceMetadata={setLicenceMetadata}
              commodities={commodities}
              setCommodities={setCommodities}
              savedQuotes={savedQuotes}
            />
          )}

          {activeTab === "tracker" &&
            (isModuleEnabled("shipping_tracking") ? (
              <ContainerTracker />
            ) : (
              renderLockedModule(
                "Location & Maritime BL Tracking",
                "Real-time vessel GPS locators, ocean bill of lading records, and live container safety metrics are deactivated under your active workspace modules.",
              )
            ))}

          {activeTab === "training" && (
            <div className="p-8 text-center bg-white border border-gray-200 rounded-3xl max-w-xl mx-auto shadow-sm space-y-5 my-8">
              <h2 className="text-xl font-black text-gray-900">
                Training & Setup Knowledge Base
              </h2>
              <p className="text-sm text-gray-500">
                I have prepared a conceptual outline for your training video.
              </p>
              <div className="text-left bg-blue-50 p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-blue-900">
                  Recommended Video Outline:
                </h3>
                <ul className="list-disc list-inside text-sm text-blue-800 space-y-2">
                  <li>
                    <strong>0:00 - Rate Calculator:</strong> Show selecting
                    commodity, container type, adding transport/freight, and
                    generating margin.
                  </li>
                  <li>
                    <strong>1:30 - Rate List Board:</strong> Demonstrate saving
                    rates to the board, generating a quote, and comparing
                    prices.
                  </li>
                  <li>
                    <strong>3:00 - Inventory & Transport:</strong> Switch
                    between bag prices, adjusting port CFS costs, and updating
                    settings.
                  </li>
                  <li>
                    <strong>
                      4:30 - Quotations & Printing (Crucial Step):
                    </strong>{" "}
                    Show opening a PI workspace, entering invoice numbers, and
                    hitting Print.{" "}
                    <em>
                      (Note: Emphasize that users MUST 'Open app in external
                      full tab', otherwise browsers will use the iframe title
                      when saving PDF).
                    </em>
                  </li>
                </ul>
              </div>
              <p className="text-xs text-gray-400">
                Because I am a conversational AI, I cannot generate actual MP4
                video files, but this tab can be used to host your embedded
                YouTube or Loom training links for your users.
              </p>
            </div>
          )}

          {activeTab === "docs_drive" &&
            (isModuleEnabled("drive_storage") ? (
              <DocumentDrive isAdmin={isViren} />
            ) : (
              renderLockedModule(
                "EXPORTPRODOCS Drive",
                "The secure cloud storage drive for saving structural PDF files and certificates is deactivated under your active workspace configuration.",
              )
            ))}

          {activeTab === "saas_preview" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider font-mono">
                    Live SaaS Landing Page Preview
                  </span>
                  <p className="text-xs text-blue-700">
                    This is the exact landing homepage that external visitors
                    and prospective customers see when they land on your domain.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("calc")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition whitespace-nowrap"
                >
                  Back to Dashboard
                </button>
              </div>
              <div className="border border-slate-900 rounded-3xl overflow-hidden shadow-2xl">
                <LandingPage
                  onGoToAuth={() =>
                    showToast(
                      "In preview mode! Try logging out or incognito window to join real sessions.",
                    )
                  }
                  savedQuotes={savedQuotes}
                  licenceMetadata={licenceMetadata}
                />
              </div>
            </div>
          )}

          {activeTab === "payment_tracker" && (
            <PaymentTracker 
              savedQuotes={savedQuotes}
              setSavedQuotes={handleSetSavedQuotes}
            />
          )}

          {activeTab === "settings" && (
            <Settings
              commodities={commodities}
              setCommodities={setCommodities}
              ports={ports}
              setPorts={setPorts}
              onClearDatabase={handleClearDatabase}
              industry={activeIndustryContext}
              onResetCommodities={handleResetCommodities}
              userModulePrefs={userModulePrefs}
              setUserModulePrefs={setUserModulePrefs}
              allowedModules={derivedAllowedModules}
              quoteConfig={quoteConfig}
              setQuoteConfig={setQuoteConfig}
            />
          )}
        </div>
      </main>

            {/* Module Configurator Modal */}
      {showModuleConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-800">Your App Interface Modules</h2>
                <p className="text-sm text-slate-500">Toggle the modules you want to see on your dashboard.</p>
              </div>
              <button onClick={() => setShowModuleConfig(false)} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full focus:outline-none transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-3 flex-1 mb-6">
              {[
                { code: "rate_calc", title: "Landed Rate Calculator", desc: "Ex-mill pricing, CFS charges, freight factors and landing rate calculations." },
                { code: "quote_saving", title: "RFQ & Saved Quotes Base", desc: "Store draft rates, save history logs, and filter RFQ quotation registers." },
                { code: "quote_sharing", title: "Quotation Link Share", desc: "Encrypt and export printable quotes to public, viewable buyer worksheets." },
                { code: "bag_price_stock", title: "Sack Pack Pricing & stock", desc: "Brand bags unit price manager and physical packaging stock records." },
                { code: "grain_inventory", title: "Warehouse & Grain Inventory", desc: "Silo tracker for raw paddy, processing queues and finished product stocks." },
                { code: "pi_ci_generation", title: "Commercial Document Workspace", desc: "Generate, edit, and print Proforma Invoices, Commercial Invoices & Packing Lists." },
                { code: "shipping_tracking", title: "Vessel Tracking & Logistics", desc: "Ocean carrier progress charts, vessel positions and BOL tracking logs." },
              ]
                .filter((mod) => derivedAllowedModules.includes(mod.code))
                .map((mod) => {
                  const isChecked = userModulePrefs[mod.code] !== false;
                  return (
                    <div
                      key={mod.code}
                      onClick={() => {
                        setUserModulePrefs((prev) => ({
                          ...prev,
                          [mod.code]: !isChecked,
                        }));
                        showToast(isChecked ? `Disabled ${mod.title}` : `Enabled ${mod.title}`);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex items-start gap-4 ${
                        isChecked
                          ? "bg-indigo-50/50 border-indigo-500 hover:bg-indigo-100/50"
                          : "bg-white border-slate-200 hover:border-slate-300 opacity-70"
                      }`}
                    >
                      <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isChecked ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-transparent'}`}>
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className={`font-bold ${isChecked ? 'text-indigo-900' : 'text-slate-600'}`}>{mod.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-snug">{mod.desc}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowModuleConfig(false)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 transition-all w-full sm:w-auto"
              >
                Apply Layout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global active feedback micro-toast popup */}
      <div
        id="toast"
        className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white font-semibold text-xs py-3 px-5 rounded-xl shadow-2xl tracking-wide z-50 select-none transition-all duration-300 transform translate-y-20 opacity-0 pointer-events-none"
      >
        Alert Message
      </div>

      {isViren && (
        <button
          onClick={() => setForceTrialMode(!forceTrialMode)}
          className="fixed bottom-2 left-2 z-[999] bg-rose-600 hover:bg-rose-700 text-white font-bold text-[8px] px-2 py-1 rounded shadow-sm uppercase tracking-wider transition-all opacity-30 hover:opacity-100"
        >
          {forceTrialMode ? "Admin" : "Trial"}
        </button>
      )}
    </div>
    </>
  );
}
