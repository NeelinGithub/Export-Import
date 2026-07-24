import React, { useState, useEffect } from "react";
import {
  getLicenceDetails,
  deleteWorkspaceByAdmin,
  saveLicenceDetails,
  updateUserMembership,
  getAllLicences,
  getAllMemberships,
  removeUserAccess,
  LicenceDetails,
  UserMembership,
  getLoginByUserId,
  getUserGenerationLogs,
  getAllLogins,
  getAllGenerationLogs,
  LoginAudit,
  DocumentGenerationLog,
  updateMembershipSubCompanies,
  preCreateWorkspaceForEmail,
  getAllQuotesCountByTenant,
} from "../services/db";
import { useIsIndianLocation } from "../utils/location";

import {
  Key,
  Copy,
  PlusCircle,
  Users,
  Check,
  Lock,
  ShieldCheck,
  HelpCircle,
  RefreshCw,
  Edit2,
  Save,
  Sliders,
  Settings2,
  ShieldAlert,
  CheckSquare,
  Square,
  Smartphone,
  ArrowRight,
  LayoutGrid,
  Upload,
  DollarSign,
  Award,
  Sparkles,
  AlertCircle,
  RefreshCcw,
  Building,
  FileText,
  CheckCircle2,
  Trash2,
  Clock,
  Activity,
  Download,
  ChevronRight,
  Cloud,
  Database,
  Search,
  Zap,
  Coins,
} from "lucide-react";

export const ALL_MODULES = [
  { id: "rate_calc", name: "FCL Rate & Weight Calculator" },
  { id: "quote_saving", name: "Quotation History Board" },
  { id: "quote_sharing", name: "Outbound PDF Share Hub" },
  { id: "bag_price_stock", name: "Bag Price & Stock Manager" },
  { id: "grain_inventory", name: "Milling Yields & Grain Inventory" },
  { id: "pi_ci_generation", name: "PI & CI Document Editor" },
  { id: "shipping_tracking", name: "Location & Maritime BL Tracking" },
  { id: "drive_storage", name: "EXPORTPRODOCS Drive & Storage" },
  { id: "custom_fields", name: "Custom Fields" },
  { id: "locations_branches", name: "Locations & Branches" },
  { id: "email_templates", name: "Email Templates" },
  { id: "multi_currency", name: "Multi-currency Handling" },
  { id: "service_po", name: "Service PO" },
  { id: "purchase_order", name: "Purchase Order" },
  { id: "inward_payment", name: "Inward Payment" },
  { id: "outward_payment", name: "Outward Payment" },
  { id: "expense_management", name: "Expense Management" },
  { id: "reports", name: "System Reports" },
  { id: "social_rate_list", name: "Social Rate List" },
  { id: "profit_loss", name: "Profit & Loss Metrics" },
  { id: "activity_timeline", name: "Activity Timeline" },
  { id: "import_po", name: "Import PO" },
  { id: "data_backup", name: "Data Backup" },
  { id: "zapier_integration", name: "Zapier Integration" },
  { id: "api_access", name: "API Access" },
  { id: "support", name: "Dedicated Support" },
  { id: "trade_intelligence", name: "Trade Intelligence (EXIM Data)" },
  { id: "ai_smart_hscode", name: "AI HS Code & Commodity Intelligence", desc: "Auto-suggests harmonized system codes and duty implications based on commodity descriptions." },
  { id: "ai_smart_routing", name: "AI Ocean Freight Routing Assistant", desc: "Analyzes transit times and rates to suggest the most cost-effective vessel routing." },
  { id: "ai_doc_generator", name: "AI Automated Document Clauses & Conditions", desc: "Generates strict legal conditions and trade clauses for commercial invoices." },
  { id: "ai_data_extractor", name: "AI Unstructured Data to Quote Extraction", desc: "Extracts container data, rates, and terms from unstructured supplier emails or PDFs." },
  { id: "ai_email_drafting", name: "AI Outbound Email Draft Generator", desc: "Drafts highly contextualized, professional outward emails to buyers based on active quote data." },
  { id: "payment_tracker", name: "Payment & Fluctuation Tracker" },
];

interface LicenceManagerProps {
  userId: string;
  userEmail: string | null;
  activeTenantId: string;
  activeTenantName: string;
  tenantRole: "owner" | "member";
  onTenantChange: (
    newTenantId: string,
    refreshNeeded: boolean,
  ) => Promise<void>;
  showToast: (msg: string, type?: "success" | "warn" | "error") => void;
  licenceMetadata: LicenceDetails | null;
  onUpdateLicenceMetadata: (meta: LicenceDetails) => void;
  userMembership?: UserMembership | null;
  commodities?: any[];
  setCommodities?: (c: any[]) => void;
  savedQuotes?: any[];
}

export interface SubscriptionPlan {
  id: "free" | "pay_per_doc" | "standard" | "organization" | "enterprise" | "annual";
  name: string;
  price: number;
  priceINR?: number;
  docsLimit: number;
  usersLimit: number;
  features: string[];
  badge?: string;
  calcLimit?: number;
  cfsUpdateLimit?: number;
}

// Low price static subscription plans inspired by uploaded model
export const PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "FREE PLAN",
    price: 0,
    priceINR: 0,
    docsLimit: 4,
    usersLimit: 1,
    badge: "FREE TIER",
    calcLimit: 4,
    features: [
      "4 Quote rate calculations / Month",
      "Up to 2 saved quotations folder cap",
      "Export Pro Docs preparer & printing",
      "No document storage & tracking features",
    ],
  },
  {
    id: "pay_per_doc",
    name: "PAY PER DOCUMENT SET",
    price: 5.99,
    priceINR: 399,
    docsLimit: 1, // 1 document per month
    usersLimit: 1,
    badge: "PAY AS YOU GO",
    calcLimit: 2,
    cfsUpdateLimit: 1,
    features: [
      "1 Document set (PI/CI/PL) / Month",
      "Quote rate calculations: Max 2",
      "CFS & Transport updates: Max 1",
      "1 User basic access",
    ],
  },
  {
    id: "standard",
    name: "STANDARD PLAN",
    price: 29,
    priceINR: 2399,
    docsLimit: 720,
    usersLimit: 2,
    badge: "NEW EXPORTERS",
    features: [
      "720 Documents / Year limit",
      "2 Users concurrent access",
      "Profit / Loss margin calculator",
      "Daily PDF report dispatcher",
      "EXPORTPRODOCS Workspace Drive",
      "Smart metrics dashboard",
      "Standard Email support response",
    ],
  },
  {
    id: "organization",
    name: "ORGANIZATION PLAN",
    price: 59,
    priceINR: 4899,
    docsLimit: 2400,
    usersLimit: 5,
    badge: "MIDSIZE TEAMS",
    features: [
      "Everything in Standard plan +",
      "2400 Documents / Year limit",
      "5 Concurrent team members",
      "Inventory allocation board",
      "Dedicated Cargo Cloud Drive",
      "Custom proforma status notes",
      "Priority chat & email support",
    ],
  },
  {
    id: "enterprise",
    name: "ENTERPRISE PLAN",
    price: 119,
    priceINR: 9899,
    docsLimit: 7200,
    usersLimit: 20,
    badge: "MOST POPULAR",
    features: [
      "Everything in Organization plan +",
      "7200 Documents / Year limit",
      "20 High-volume active users",
      "Production scheduling logs",
      "Milling yields & weight checkers",
      "Shipping bill scanner API",
      "Software & team boarding assistance",
      "Advanced historical data migration",
      "Premium dedicated 24/7 call line",
    ],
  },
  {
    id: "annual",
    name: "ANNUAL PLAN",
    price: 599,
    priceINR: 44000,
    docsLimit: 12000,
    usersLimit: 50,
    badge: "BEST VALUE",
    features: [
      "Everything in Enterprise plan +",
      "Billed Annually",
      "12000 Documents limit",
      "50 Team members",
      "Executive Priority Support"
    ],
  },
];

export default function LicenceManager({
  userId,
  userEmail,
  activeTenantId,
  activeTenantName,
  tenantRole,
  onTenantChange,
  showToast,
  licenceMetadata,
  onUpdateLicenceMetadata,
  userMembership,
  commodities,
  setCommodities,
}: LicenceManagerProps) {
  const isIndian = useIsIndianLocation();
  const [licenceDetails, setLicenceDetails] = useState<LicenceDetails | null>(
    licenceMetadata,
  );
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Licence renaming editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  // Form states for creating/joining
  const [joinKey, setJoinKey] = useState("");
  const [newLicenceName, setNewLicenceName] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Multi-Company form state
  const [compANameInput, setCompANameInput] = useState(
    userMembership?.companyAName || "",
  );
  const [compBNameInput, setCompBNameInput] = useState(
    userMembership?.companyBName || "",
  );
  const [isCompSubmitting, setIsCompSubmitting] = useState(false);

  useEffect(() => {
    if (userMembership) {
      setCompANameInput(userMembership.companyAName || "");
      setCompBNameInput(userMembership.companyBName || "");
    }
  }, [userMembership]);

  // Corporate logo and branding state variables
  const [logoText, setLogoText] = useState("");
  const [logoBase64, setLogoBase64] = useState("");
  const [configDateFormat, setConfigDateFormat] = useState("DD-MMM-YY");
  const [exporterTagline, setExporterTagline] = useState("");
  const [exporterAddress, setExporterAddress] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [userIndustry, setUserIndustry] = useState<string>("grain");
  const [userCountry, setUserCountry] = useState<string>("");

  // Admin states
  const isViren = userEmail?.toLowerCase().trim() === "vnp.viren@gmail.com";
  const [allLicences, setAllLicences] = useState<LicenceDetails[]>([]);
  const [allMemberships, setAllMemberships] = useState<UserMembership[]>([]);
  const [allLogins, setAllLogins] = useState<LoginAudit[]>([]);
  const [allDocLogs, setAllDocLogs] = useState<DocumentGenerationLog[]>([]);
  const [tenantQuoteCounts, setTenantQuoteCounts] = useState<Record<string, number>>({});
  const [adminLoading, setAdminLoading] = useState(false);
  const [selectedLicenceId, setSelectedLicenceId] = useState<string | null>(
    null,
  );
  const [adminSubTab, setAdminSubTab] = useState<
    "workspaces" | "users" | "logins" | "docs" | "companies" | "database"
  >("workspaces");

  const [newPreApprovedEmail, setNewPreApprovedEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loginSearchQuery, setLoginSearchQuery] = useState("");
  const [isSearchingLogins, setIsSearchingLogins] = useState(false);
  const [addingPreApproved, setAddingPreApproved] = useState(false);

  const handleSearchLogins = async () => {
    if (!loginSearchQuery.trim()) {
      showToast("Please enter an email or identifier to search.", "warn");
      return;
    }
    setIsSearchingLogins(true);
    try {
      // Find the user membership by email (case-insensitive) or by user ID
      const query = loginSearchQuery.toLowerCase().trim();
      const matchedMembers = allMemberships.filter(m => 
        m.userEmail?.toLowerCase().includes(query) || 
        m.userId?.toLowerCase().includes(query)
      );

      if (matchedMembers.length === 0) {
        showToast("No user found with that email or identifier.", "warn");
        setAllLogins([]);
        setAllDocLogs([]);
        return;
      }

      // We might have multiple members matching the query. Fetch logins and logs for all.
      const fetchedLogins: LoginAudit[] = [];
      const fetchedDocLogs: DocumentGenerationLog[] = [];

      for (const member of matchedMembers) {
        const loginDoc = await getLoginByUserId(member.userId);
        if (loginDoc) fetchedLogins.push(loginDoc);

        const logs = await getUserGenerationLogs(member.userId);
        fetchedDocLogs.push(...logs);
      }

      setAllLogins(fetchedLogins.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      setAllDocLogs(fetchedDocLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      showToast(`Found records for ${fetchedLogins.length} users.`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to search user records.", "error");
    } finally {
      setIsSearchingLogins(false);
    }
  };

  // Editing config state for admin
  const [configApproved, setConfigApproved] = useState(true);
  const [configLoginBlocked, setConfigLoginBlocked] = useState(false);
  const [configOtpEnabled, setConfigOtpEnabled] = useState(false);
  const [configOtpMethod, setConfigOtpMethod] = useState<
    "email" | "whatsapp" | "disabled"
  >("disabled");
  const [configAiEnabled, setConfigAiEnabled] = useState(false);
  const [configCountry, setConfigCountry] = useState<string>("");
  const [configIndustry, setConfigIndustry] = useState<string>("grain");
  const [configModules, setConfigModules] = useState<string[]>([]);

  // New document generation limit inputs
  const [configPiLimitDay, setConfigPiLimitDay] = useState<string>("0");
  const [configPiLimitMonth, setConfigPiLimitMonth] = useState<string>("0");
  const [configPiLimitYear, setConfigPiLimitYear] = useState<string>("0");

  const [configCiLimitDay, setConfigCiLimitDay] = useState<string>("0");
  const [configCiLimitMonth, setConfigCiLimitMonth] = useState<string>("0");
  const [configCiLimitYear, setConfigCiLimitYear] = useState<string>("0");

  const [configPlLimitDay, setConfigPlLimitDay] = useState<string>("0");
  const [configPlLimitMonth, setConfigPlLimitMonth] = useState<string>("0");
  const [configPlLimitYear, setConfigPlLimitYear] = useState<string>("0");

  // New plan and pricing overrides states for Vnp Viren Admin Panel
  const [configPlanId, setConfigPlanId] = useState<
    "pay_per_doc" | "standard" | "organization" | "enterprise" | "annual"
  >("standard");
  const [configPlanPriceCustom, setConfigPlanPriceCustom] =
    useState<string>("");

  // Sync state whenever external metadata changes
  useEffect(() => {
    if (licenceMetadata) {
      setLicenceDetails(licenceMetadata);
      setEditedName(licenceMetadata.name);
      setLogoText(licenceMetadata.logoText || "");
      setLogoBase64(licenceMetadata.logoBase64 || "");
      setConfigDateFormat(licenceMetadata.dateFormat || "DD-MMM-YY");
      setExporterTagline(licenceMetadata.exporterTagline || "");
      setExporterAddress(licenceMetadata.exporterAddress || "");
      setBankDetails(licenceMetadata.bankDetails || "");
      setUserIndustry(licenceMetadata.industry || "grain");
      setUserCountry(licenceMetadata.country || "");
    }
  }, [licenceMetadata]);

  // Load details of the current licence
  const loadLicenceDetails = async () => {
    setLoading(true);
    try {
      const details = await getLicenceDetails(activeTenantId);
      if (details) {
        setLicenceDetails(details);
        setEditedName(details.name);
        setLogoText(details.logoText || "");
        setLogoBase64(details.logoBase64 || "");
        setConfigDateFormat(details.dateFormat || "DD-MMM-YY");
        setExporterTagline(details.exporterTagline || "");
        setExporterAddress(details.exporterAddress || "");
        setBankDetails(details.bankDetails || "");
        setUserIndustry(details.industry || "grain");
        setUserCountry(details.country || "");
        onUpdateLicenceMetadata(details);
      } else {
        // Fallback or create display details
        const mockDetails: LicenceDetails = {
          tenantId: activeTenantId,
          name: activeTenantName,
          ownerId: userId,
          ownerEmail: userEmail || "Active Licensee",
          createdAt: new Date().toISOString(),
          approved: true, // Auto-approve
          otpEnabled: false,
          otpMethod: "disabled",
          industry: "grain",
          country: "",
          allowedModules: ["rate_calc"],
          planId: "standard",
          dateFormat: "DD-MMM-YY",
        };
        setLicenceDetails(mockDetails);
        setEditedName(activeTenantName);
        setUserIndustry("grain");
        setUserCountry("");
        setConfigDateFormat("DD-MMM-YY");
        setExporterTagline("");
        setExporterAddress("");
        setBankDetails("");
        onUpdateLicenceMetadata(mockDetails);
      }
    } catch (err) {
      console.error(err);
      showToast("Could not retrieve workspace information.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Load master Admin lists
  const loadAdminData = async () => {
    if (!isViren) return;
    setAdminLoading(true);
    try {
      const [listLic, listMem, listLogins, listDocLogs, counts] = await Promise.all([
        getAllLicences(),
        getAllMemberships(),
        getAllLogins(),
        getAllGenerationLogs(),
        getAllQuotesCountByTenant()
      ]);

      listLic.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      );
      
      setAllLicences(listLic);
      setAllMemberships(listMem);
      setAllLogins(listLogins || []);
      setAllDocLogs(listDocLogs || []);
      setTenantQuoteCounts(counts || {});
    } catch (err) {
      console.error(err);
      showToast(`Failed to fetch administrator records: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      setAdminLoading(false);
    }
  };

  const exportUsersToCSV = () => {
    try {
      let csv = "User Email,Tenant ID,Licence Name,Industry,Allowed Modules,Admin Role\n";
      const licenceMap = allLicences.reduce((acc, lic) => {
        acc[lic.tenantId] = lic;
        return acc;
      }, {} as Record<string, LicenceDetails>);

      allMemberships.forEach(m => {
        const lic = licenceMap[m.tenantId] || {} as any;
        const ind = lic.industry || 'N/A';
        const mods = (lic.allowedModules || []).join(";");
        csv += `"${m.userEmail || ''}","${m.tenantId}","${lic.name || 'N/A'}","${ind}","${mods}","${m.role || 'N/A'}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `VNP_Users_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Exported users to CSV!", "success");
    } catch (err) {
      console.error("Export error:", err);
      showToast("Failed to export CSV.", "error");
    }
  };

  const handleToggleBlockUser = async (userId: string, isBlocked: boolean) => {
    if (!window.confirm(`Are you sure you want to ${isBlocked ? 'unblock' : 'block'} this user? ${isBlocked ? 'They will regain access.' : 'They will lose access to the app entirely.'}`)) return;
    try {
      await removeUserAccess(userId, isBlocked); // pass unblock = isBlocked
      setAllMemberships((prev) => prev.map((m) => m.userId === userId ? { ...m, loginBlocked: !isBlocked } : m));
      showToast(`User access ${isBlocked ? 'unblocked' : 'blocked'} successfully.`, "success");
    } catch (err) {
      console.error(err);
      showToast(`Failed to ${isBlocked ? 'unblock' : 'block'} user access.`, "error");
    }
  };

  const handleSetToFreeTier = async (tenantId: string) => {
    if (!window.confirm(`Are you sure you want to demote Workspace ${tenantId} to the Free Tier?`)) return;
    setAdminLoading(true);
    try {
      const lic = allLicences.find(l => l.tenantId === tenantId);
      if (!lic) {
        showToast("Licence details not found.", "error");
        return;
      }
      const updated: LicenceDetails = {
        ...lic,
        planId: "free",
        planPriceCustom: 0,
        allowedModules: ["rate_calc", "quote_saving", "pi_ci_generation"]
      };
      await saveLicenceDetails(updated);
      showToast(`Workspace ${tenantId} demoted to Free Tier successfully.`, "success");
      await loadAdminData();
    } catch (err) {
      console.error("Failed to downgrade workspace:", err);
      showToast("Error downgrading workspace to free tier.", "error");
    } finally {
      setAdminLoading(false);
    }
  };

  const exportAnalyticsToCSV = async () => {
    try {
      showToast("Generating analytics export...", "success");
      const [allLogins, allGenLogs] = await Promise.all([
        getAllLogins(),
        getAllGenerationLogs()
      ]);

      let csv = "Type,User Email,Timestamp,Details\n";

      allLogins.forEach(log => {
        csv += `"Login","${log.userEmail}","${new Date(log.timestamp).toISOString()}",""\n`;
      });

      const userMap = allMemberships.reduce((acc, mem) => {
        acc[mem.userId] = mem.userEmail || mem.userId;
        return acc;
      }, {} as Record<string, string>);

      allGenLogs.forEach(log => {
        const email = userMap[log.userId] || log.userId;
        csv += `"Document Generation","${email}","${new Date(log.timestamp).toISOString()}","Generated ${log.docType || 'document'} ref: ${log.ref || ''}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `VNP_Analytics_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Exported analytics to CSV!", "success");
    } catch (err) {
      console.error("Export error:", err);
      showToast(`Failed to export analytics: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  };

  useEffect(() => {
    if (activeTenantId) {
      loadLicenceDetails();
    }
  }, [activeTenantId]);

  useEffect(() => {
    // Disabled auto-load to prevent massive database reads on every mount.
    // Admin must manually click the refresh button to load global data.
  }, [isViren]);

  const handleAddPreApproved = async () => {
    if (!newPreApprovedEmail.trim() || !newPreApprovedEmail.includes("@")) {
      showToast("Please enter a valid email address.", "error");
      return;
    }
    setAddingPreApproved(true);
    try {
      await preCreateWorkspaceForEmail(newPreApprovedEmail);
      showToast(
        `Workspace instantiated for ${newPreApprovedEmail}. You can configure it now!`,
        "success",
      );
      setNewPreApprovedEmail("");
      loadAdminData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to pre-create workspace.", "error");
    } finally {
      setAddingPreApproved(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(activeTenantId);
    setCopied(true);
    showToast("Licence key copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRenameLicence = async () => {
    if (!editedName.trim()) {
      showToast("Licence name cannot be empty.", "warn");
      return;
    }
    setActionLoading(true);
    try {
      const currentDetails = licenceDetails || {
        tenantId: activeTenantId,
        ownerId: userId,
        ownerEmail: userEmail || "",
        createdAt: new Date().toISOString(),
      };

      const updatedDetails: LicenceDetails = {
        ...currentDetails,
        name: editedName.trim(),
      };
      await saveLicenceDetails(updatedDetails);
      setLicenceDetails(updatedDetails);
      setIsEditingName(false);
      onUpdateLicenceMetadata(updatedDetails);

      // Update state in App.tsx
      await onTenantChange(activeTenantId, false);
      showToast("Licence renamed successfully!", "success");
      if (isViren) loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Failed to rename licence workspace.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegisterSubCompanies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compANameInput.trim() && !compBNameInput.trim()) {
      showToast("Please enter at least one company name.", "warn");
      return;
    }
    setIsCompSubmitting(true);
    try {
      const generatedCompAId =
        userMembership?.companyATenantId ||
        `LIC-COA-${userId.substring(0, 5).toUpperCase()}`;
      const generatedCompBId =
        userMembership?.companyBTenantId ||
        `LIC-COB-${userId.substring(0, 5).toUpperCase()}`;

      // 1. Create LicenceDetails for Company A if requested
      if (compANameInput.trim()) {
        const licA: LicenceDetails = {
          tenantId: generatedCompAId,
          name: compANameInput.trim(),
          ownerId: userId,
          ownerEmail: userEmail || "",
          createdAt: new Date().toISOString(),
          approved: true, // Default to approved
          otpEnabled: false,
          otpMethod: "disabled",
          industry: licenceDetails?.industry || "grain",
          allowedModules: licenceDetails?.allowedModules || [
            "rate_calc",
            "quote_saving",
            "quote_sharing",
            "bag_price_stock",
            "grain_inventory",
          ],
        };
        await saveLicenceDetails(licA);
      }

      // 2. Create LicenceDetails for Company B if requested
      if (compBNameInput.trim()) {
        const licB: LicenceDetails = {
          tenantId: generatedCompBId,
          name: compBNameInput.trim(),
          ownerId: userId,
          ownerEmail: userEmail || "",
          createdAt: new Date().toISOString(),
          approved: true, // Default to approved
          otpEnabled: false,
          otpMethod: "disabled",
          industry: licenceDetails?.industry || "grain",
          allowedModules: licenceDetails?.allowedModules || [
            "rate_calc",
            "quote_saving",
            "quote_sharing",
            "bag_price_stock",
            "grain_inventory",
          ],
        };
        await saveLicenceDetails(licB);
      }

      // 3. Update UserMembership on Firebase
      const updateData: Partial<UserMembership> = {
        companyAName: compANameInput.trim() || undefined,
        companyATenantId: compANameInput.trim() ? generatedCompAId : undefined,
        companyAApproved: compANameInput.trim()
          ? true
          : (userMembership?.companyAApproved ?? false),
        companyBName: compBNameInput.trim() || undefined,
        companyBTenantId: compBNameInput.trim() ? generatedCompBId : undefined,
        companyBApproved: compBNameInput.trim()
          ? true
          : (userMembership?.companyBApproved ?? false),
      };

      await updateMembershipSubCompanies(userId, updateData);
      showToast(
        "Exporter company configurations updated and approved instantly! You can switch between them in the top-level bar.",
        "success",
      );
      if (isViren) loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Failed to register dual company layout.", "error");
    } finally {
      setIsCompSubmitting(false);
    }
  };

  const handleApproveDualCompany = async (
    targetUserId: string,
    companyToggle: "A" | "B",
    approveState: boolean,
  ) => {
    setActionLoading(true);
    try {
      const matchMembership = allMemberships.find(
        (m) => m.userId === targetUserId,
      );
      if (!matchMembership) throw new Error("Membership doc not found.");

      const tenantId =
        companyToggle === "A"
          ? matchMembership.companyATenantId
          : matchMembership.companyBTenantId;
      if (!tenantId)
        throw new Error(`Company ${companyToggle} Tenant ID not configured.`);

      // 1. Update the Licence details approval state in /licences/
      try {
        const licenceDetailsObj = await getLicenceDetails(tenantId);
        if (licenceDetailsObj) {
          licenceDetailsObj.approved = approveState;
          await saveLicenceDetails(licenceDetailsObj);
        } else {
          // If the licence details document doesn't exist for some reason, create it
          const companyName =
            companyToggle === "A"
              ? matchMembership.companyAName
              : matchMembership.companyBName;
          const newLic: LicenceDetails = {
            tenantId: tenantId,
            name: companyName || `Company ${companyToggle}`,
            ownerId: targetUserId,
            ownerEmail: matchMembership.userEmail || "",
            createdAt: new Date().toISOString(),
            approved: approveState,
            otpEnabled: false,
            otpMethod: "disabled",
            industry: "grain",
            allowedModules: [
              "rate_calc",
              "quote_saving",
              "quote_sharing",
              "bag_price_stock",
              "grain_inventory",
            ],
          };
          await saveLicenceDetails(newLic);
        }
      } catch (err) {
        console.warn("Could not save corresponding LicenceDetails doc:", err);
      }

      // 2. Update the UserMembership document's sub-company approval state
      const updatedMembershipData: Partial<UserMembership> = {};
      if (companyToggle === "A") {
        updatedMembershipData.companyAApproved = approveState;
      } else {
        updatedMembershipData.companyBApproved = approveState;
      }

      await updateMembershipSubCompanies(targetUserId, updatedMembershipData);
      showToast(
        `Company ${companyToggle} approval set to ${approveState ? "APPROVED" : "PENDING"}!`,
        "success",
      );
      await loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Failed to approve sub company registration.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateNewLicence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLicenceName.trim()) {
      showToast("Please enter a name.", "warn");
      return;
    }
    setActionLoading(true);
    try {
      const randHex = Math.random().toString(36).substring(2, 8).toUpperCase();
      const generatedTenantId = `LIC-RM-${randHex}`;

      const newLicence: LicenceDetails = {
        tenantId: generatedTenantId,
        name: newLicenceName.trim(),
        ownerId: userId,
        ownerEmail: userEmail || "",
        createdAt: new Date().toISOString(),
        approved: true, // Auto-approved on self creation
        otpEnabled: false,
        otpMethod: "disabled",
        industry: "grain",
        allowedModules: ["rate_calc"],
        planId: "standard",
      };

      await saveLicenceDetails(newLicence);
      await updateUserMembership(userId, userEmail, generatedTenantId, "owner");
      await onTenantChange(generatedTenantId, true);

      setNewLicenceName("");
      showToast(`Successfully registered "${newLicence.name}"!`, "success");
      if (isViren) loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Could not register new licence.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinLicence = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = joinKey.trim().toUpperCase();
    if (!cleanKey) {
      showToast("Please enter a valid Licence Key.", "warn");
      return;
    }

    if (cleanKey === activeTenantId) {
      showToast("You are already active in this licence workspace.", "warn");
      return;
    }

    setActionLoading(true);
    try {
      const targetDetails = await getLicenceDetails(cleanKey);
      if (!targetDetails) {
        showToast("No active Mill Licence found matching that key.", "error");
        setActionLoading(false);
        return;
      }

      const proceed = window.confirm(
        `Join "${targetDetails.name}" workspace?

This will synchronize and share your reference parameters, company branding logo, and quotes database with members assigned to Key ${cleanKey}.`,
      );
      if (!proceed) {
        setActionLoading(false);
        return;
      }

      await updateUserMembership(userId, userEmail, cleanKey, "member");
      await onTenantChange(cleanKey, true);
      setJoinKey("");
      showToast(
        `Connected successfully to "${targetDetails.name}"!`,
        "success",
      );
      if (isViren) loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Failed to link and join this licence.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Switch/Self upgrade client plan
  const handleSelectPlanSelf = async (
    planId: "free" | "pay_per_doc" | "standard" | "organization" | "enterprise" | "annual",
  ) => {
    if (!licenceDetails) return;
    if (tenantRole !== "owner") {
      showToast(
        "Only workspace owners are permitted to purchase or modify subscription models.",
        "warn",
      );
      return;
    }

    setActionLoading(true);
    try {
      const updatedDetails: LicenceDetails = {
        ...licenceDetails,
        planId: planId,
        // Standard allows pricing calculator and saved quotes, organization/enterprise unlocks everything
        allowedModules:
          planId === "free"
            ? ["rate_calc", "quote_saving", "pi_ci_generation"]
            : planId === "standard"
            ? [
                "rate_calc",
                "quote_saving",
                "quote_sharing",
                "bag_price_stock",
                "grain_inventory",
              ]
            : planId === "pay_per_doc"
            ? [
                "rate_calc",
                "quote_saving",
                "quote_sharing",
                "bag_price_stock",
                "grain_inventory",
                "pi_ci_generation",
              ]
            : [
                "rate_calc",
                "quote_saving",
                "shipping_tracking",
                "quote_sharing",
                "pi_ci_generation",
                "bag_price_stock",
                "grain_inventory",
              ],
      };

      await saveLicenceDetails(updatedDetails);
      setLicenceDetails(updatedDetails);
      onUpdateLicenceMetadata(updatedDetails);
      showToast(
        `Subscription plan modified to: ${planId.toUpperCase()}!`,
        "success",
      );

      if (isViren) await loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Could not modify workspace subscription plan.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Corporate logo drag & drop and manual file conversions
  const processLogoFile = (file: File) => {
    if (!file) return;
    if (file.size > 700 * 1024) {
      showToast(
        "File is too large! Please upload a signature or logo smaller than 700KB to optimize document rendering speeds.",
        "warn",
      );
      return;
    }
    if (!file.type.startsWith("image/")) {
      showToast(
        "Invalid file format. Please upload standard PNG, JPG, JPEG, or WEBP image formats.",
        "warn",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const base64Str = e.target.result as string;
        setLogoBase64(base64Str);
        if (licenceDetails) {
          setIsSavingBranding(true);
          try {
            const updatedDetails = {
              ...licenceDetails,
              logoText: logoText.trim(),
              logoBase64: base64Str,
              industry: userIndustry,
              country: userCountry,
              dateFormat: configDateFormat,
              exporterTagline: exporterTagline.trim(),
              exporterAddress: exporterAddress.trim(),
              bankDetails: bankDetails.trim(),
            };
            await saveLicenceDetails(updatedDetails);
            setLicenceDetails(updatedDetails);
            onUpdateLicenceMetadata(updatedDetails);
            showToast(
              "Company logo processed and synchronized automatically!",
              "success",
            );
          } catch (err) {
            showToast("Could not save branding configuration.", "error");
          } finally {
            setIsSavingBranding(false);
          }
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setLogoDragActive(true);
    } else if (e.type === "dragleave") {
      setLogoDragActive(false);
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLogoDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processLogoFile(e.dataTransfer.files[0]);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processLogoFile(e.target.files[0]);
    }
  };

  const handleClearLogoImage = async () => {
    setLogoBase64("");
    if (licenceDetails) {
      setIsSavingBranding(true);
      try {
        const isFree = licenceDetails.planId === "free" || licenceDetails.approved === false;
        const updatedDetails = {
          ...licenceDetails,
          logoText: logoText.trim(),
          logoBase64: "",
          industry: (isFree ? userIndustry.split(",")[0] : userIndustry) as any,
          industrySelected: isFree ? true : licenceDetails.industrySelected,
          allowedModules: isFree ? [
            "rate_calc",
            "quote_saving",
            "quote_sharing",
            "bag_price_stock",
            "grain_inventory",
          ] : licenceDetails.allowedModules,
          country: userCountry,
          dateFormat: configDateFormat,
          exporterTagline: exporterTagline.trim(),
          exporterAddress: exporterAddress.trim(),
          bankDetails: bankDetails.trim(),
        };
        await saveLicenceDetails(updatedDetails);
        setLicenceDetails(updatedDetails);
        onUpdateLicenceMetadata(updatedDetails);
        showToast(
          "Logo has been cleared and synchronized automatically.",
          "success",
        );
      } catch (err) {
        showToast("Could not clear branding configurations.", "error");
      } finally {
        setIsSavingBranding(false);
      }
    }
  };

  const handleSaveCorporateBranding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!licenceDetails) {
      showToast("No active licence workspace to store logo settings.", "error");
      return;
    }
    setIsSavingBranding(true);
    try {
      const isFree = licenceDetails.planId === "free" || licenceDetails.approved === false;
      const updatedDetails: LicenceDetails = {
        ...licenceDetails,
        logoText: logoText.trim(),
        logoBase64: logoBase64,
        industry: (isFree ? userIndustry.split(",")[0] : userIndustry) as any,
        industrySelected: isFree ? true : licenceDetails.industrySelected,
        allowedModules: isFree ? [
          "rate_calc",
          "quote_saving",
          "quote_sharing",
          "bag_price_stock",
          "grain_inventory",
        ] : licenceDetails.allowedModules,
        country: userCountry,
        dateFormat: configDateFormat,
        exporterTagline: exporterTagline.trim(),
        exporterAddress: exporterAddress.trim(),
        bankDetails: bankDetails.trim(),
      };
      await saveLicenceDetails(updatedDetails);
      setLicenceDetails(updatedDetails);
      onUpdateLicenceMetadata(updatedDetails);
      showToast(
        "Corporate logo, print branding, and industry settings updated successfully!",
        "success",
      );
    } catch (err) {
      console.error(err);
      showToast("Could not update branding configurations.", "error");
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleAWSExport = async () => {
    try {
      showToast(
        "Compiling commercial workspace for AWS migration...",
        "success",
      );
      const payload = {
        metadata: {
          app: "REMS Export Console",
          exportDate: new Date().toISOString(),
          targetPlatform: "AWS DynamoDB / RDS JSON",
        },
        tenantData: licenceDetails || {},
        localState: JSON.parse(
          localStorage.getItem("RemsQuoteTrackerState") || "{}",
        ),
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aws-migration-export-${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(
        "JSON payload structured & downloaded successfully for AWS DynamoDB.",
        "success",
      );
    } catch (e) {
      showToast("Error packing JSON schema map.", "error");
    }
  };

  // ADMIN PORTAL CONTROLLER HANDLERS (VNP VIREN CONTROL)
  const handleSelectLicenceForConfig = (lic: LicenceDetails) => {
    setSelectedLicenceId(lic.tenantId);
    setConfigApproved(lic.approved !== false);
    setConfigLoginBlocked(lic.loginBlocked || false);
    setConfigOtpEnabled(lic.otpEnabled || false);
    setConfigOtpMethod(lic.otpMethod || "disabled");
    setConfigAiEnabled(lic.aiEnabled || false);
    setConfigIndustry(lic.industry || "grain");
    setConfigCountry(lic.country || "");
    setConfigModules(
      lic.allowedModules || ["rate_calc", "bag_price_stock", "grain_inventory"],
    );
    setConfigPlanId(lic.planId || "standard");
    setConfigPlanPriceCustom(
      lic.planPriceCustom !== undefined ? lic.planPriceCustom.toString() : "",
    );

    // Read limits or default to 0 (Unlimited)
    setConfigPiLimitDay(
      lic.piLimitDay !== undefined ? lic.piLimitDay.toString() : "0",
    );
    setConfigPiLimitMonth(
      lic.piLimitMonth !== undefined ? lic.piLimitMonth.toString() : "0",
    );
    setConfigPiLimitYear(
      lic.piLimitYear !== undefined ? lic.piLimitYear.toString() : "0",
    );

    setConfigCiLimitDay(
      lic.ciLimitDay !== undefined ? lic.ciLimitDay.toString() : "0",
    );
    setConfigCiLimitMonth(
      lic.ciLimitMonth !== undefined ? lic.ciLimitMonth.toString() : "0",
    );
    setConfigCiLimitYear(
      lic.ciLimitYear !== undefined ? lic.ciLimitYear.toString() : "0",
    );

    setConfigPlLimitDay(
      lic.plLimitDay !== undefined ? lic.plLimitDay.toString() : "0",
    );
    setConfigPlLimitMonth(
      lic.plLimitMonth !== undefined ? lic.plLimitMonth.toString() : "0",
    );
    setConfigPlLimitYear(
      lic.plLimitYear !== undefined ? lic.plLimitYear.toString() : "0",
    );
  };

  const handleToggleModuleSelection = (modCode: string) => {
    if (configModules.includes(modCode)) {
      setConfigModules(configModules.filter((m) => m !== modCode));
    } else {
      setConfigModules([...configModules, modCode]);
    }
  };

  const handleSaveAdminLicenceConfig = async () => {
    if (!selectedLicenceId) return;
    setActionLoading(true);
    try {
      const match = allLicences.find((l) => l.tenantId === selectedLicenceId);
      if (!match) throw new Error("License not found in database.");

      const updatedPrice =
        configPlanPriceCustom.trim() !== ""
          ? parseFloat(configPlanPriceCustom)
          : undefined;

      const updated: LicenceDetails = {
        ...match,
        approved: configApproved,
        loginBlocked: configLoginBlocked,
        otpEnabled: configOtpMethod !== "disabled",
        otpMethod: configOtpMethod,
        aiEnabled: configAiEnabled,
        industry: configIndustry,
        country: configCountry,
        allowedModules: configModules,
        planId: configPlanId,
        planPriceCustom: isNaN(updatedPrice as number)
          ? undefined
          : updatedPrice,

        // Parse and persist new limits (0 or invalid maps to undefined i.e. unlimited)
        piLimitDay:
          parseInt(configPiLimitDay) > 0
            ? parseInt(configPiLimitDay)
            : undefined,
        piLimitMonth:
          parseInt(configPiLimitMonth) > 0
            ? parseInt(configPiLimitMonth)
            : undefined,
        piLimitYear:
          parseInt(configPiLimitYear) > 0
            ? parseInt(configPiLimitYear)
            : undefined,

        ciLimitDay:
          parseInt(configCiLimitDay) > 0
            ? parseInt(configCiLimitDay)
            : undefined,
        ciLimitMonth:
          parseInt(configCiLimitMonth) > 0
            ? parseInt(configCiLimitMonth)
            : undefined,
        ciLimitYear:
          parseInt(configCiLimitYear) > 0
            ? parseInt(configCiLimitYear)
            : undefined,

        plLimitDay:
          parseInt(configPlLimitDay) > 0
            ? parseInt(configPlLimitDay)
            : undefined,
        plLimitMonth:
          parseInt(configPlLimitMonth) > 0
            ? parseInt(configPlLimitMonth)
            : undefined,
        plLimitYear:
          parseInt(configPlLimitYear) > 0
            ? parseInt(configPlLimitYear)
            : undefined,
      };

      await saveLicenceDetails(updated);
      showToast(
        `Workspace properties persisted successfully for Key: ${selectedLicenceId}!`,
        "success",
      );

      // Refresh current active view if modified itself to prevent local staling
      if (selectedLicenceId === activeTenantId) {
        setLicenceDetails(updated);
        onUpdateLicenceMetadata(updated);
        await onTenantChange(activeTenantId, false);
      }

      await loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Failed to update active workspace configurations.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Retrieve current active plan pricing or custom overridden values
  const currentPlanId = licenceDetails?.planId || "standard";
  const currentPlan = PLANS.find((p) => p.id === currentPlanId) || PLANS[0];
  const handleDeleteAdminWorkspace = async () => {
    if (!selectedLicenceId) return;
    if (!confirm("Are you sure you want to completely delete this workspace? This will remove all memberships and the licence from the database. This action is irreversible.")) return;
    setActionLoading(true);
    try {
      await deleteWorkspaceByAdmin(selectedLicenceId);
      showToast(`Workspace ${selectedLicenceId} deleted successfully.`, "success");
      if (selectedLicenceId === activeTenantId) {
        window.location.reload();
      }
      setSelectedLicenceId(null);
      await loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Failed to delete workspace.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleImportCommodities = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showToast(`Batch update process started for ${file.name}...`, "success");
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let parsedData: any[] = [];

        if (file.name.endsWith(".json")) {
          parsedData = JSON.parse(text);
        } else if (file.name.endsWith(".csv")) {
          // Simple CSV parser for demonstration
          const lines = text.split("\\n").filter(Boolean);
          if (lines.length > 1) {
            const headers = lines[0].split(",").map((h) => h.trim());
            parsedData = lines.slice(1).map((line) => {
              const values = line.split(",").map((v) => v.trim());
              const obj: any = {};
              headers.forEach((h, i) => {
                obj[h] = values[i];
              });
              return obj;
            });
          }
        } else {
          showToast("Only JSON or CSV files are supported.", "error");
          return;
        }

        if (Array.isArray(parsedData) && parsedData.length > 0) {
          if (setCommodities && commodities) {
            // Basic validation
            const mappedArray = parsedData.map((item, index) => ({
              id: item.id || `imported_${Date.now()}_${index}`,
              name: item.name || "Unknown Product",
              industry: item.industry || "generic",
              group: item.group || "Imported",
            }));
            const merged = [...commodities, ...mappedArray];
            // Remove duplicates by ID natively
            const unique = Array.from(
              new Map(merged.map((item) => [item.id, item])).values(),
            );
            setCommodities(unique);
            showToast(
              `Successfully imported ${mappedArray.length} items from ${file.name} during batch update.`,
              "success",
            );
          } else {
            showToast("Commodities hook not available.", "error");
          }
        } else {
          showToast("No valid array found in file.", "error");
        }
      } catch (err) {
        console.error("Import processing error", err);
        showToast("Error processing file format or schema.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset value so it can be picked again
  };

  const hasCustomPrice = licenceDetails?.planPriceCustom !== undefined;
  const currentPrice = hasCustomPrice
    ? (licenceDetails?.planPriceCustom ?? 0)
    : currentPlan.price;

  return (
    <div className="space-y-6" id="rice_mill_licence_manager">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-teal-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 opacity-10">
          <Key className="w-56 h-56" />
        </div>

        <div className="max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wide uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>COMMERCIAL BRANDING & LOW COST SUBSCRIPTION PLANS</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight font-sans">
            Workspace Configuration Console
          </h2>
          <p className="text-xs text-teal-100/90 leading-relaxed font-medium">
            Manage your company profile settings, upload your corporate logo for
            A4 invoice embedding, inspect client pricing plans, or configure
            independent secure login credentials.
          </p>
        </div>
      </div>

      {/* ADMIN CONTROL TOWER (Only visible for 'vnp.viren@gmail.com') */}
      {isViren && (
        <section
          className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-6 shadow-xl space-y-5"
          id="vnp-master-admin-control-tower"
        >
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="text-teal-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                <Settings2 className="w-4 h-4" /> MASTER CLOUD CONSOLE
              </div>
              <h3 className="text-lg font-black text-white mt-1 uppercase font-sans">
                VNP EXPORTER SUITE ADMIN CARD
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportAnalyticsToCSV}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Activity className="w-4 h-4" /> Export Analytics
              </button>
              <button
                onClick={exportUsersToCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button
                onClick={loadAdminData}
                disabled={adminLoading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${adminLoading ? "animate-spin text-teal-400" : ""}`}
                />
                <span>Refresh Accounts</span>
              </button>
            </div>
          </div>

          {/* Admin sub-tabs switcher */}
          <div className="flex border-b border-slate-800 gap-4 pb-1">
            <button
              onClick={() => setAdminSubTab("workspaces")}
              className={`pb-2.5 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 cursor-pointer ${
                adminSubTab === "workspaces"
                  ? "border-teal-400 text-teal-400 font-black"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              💼 Client Workspaces ({allLicences.length})
            </button>
            <button
              onClick={() => setAdminSubTab("users")}
              className={`pb-2.5 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 cursor-pointer ${
                adminSubTab === "users"
                  ? "border-teal-400 text-teal-400 font-black"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              👥 All Users ({allMemberships.length})
            </button>
            <button
              onClick={() => setAdminSubTab("logins")}
              className={`pb-2.5 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 cursor-pointer ${
                adminSubTab === "logins"
                  ? "border-teal-400 text-teal-400 font-black"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              🕒 Exporter Logins ({allLogins.length})
            </button>
            <button
              onClick={() => setAdminSubTab("docs")}
              className={`pb-2.5 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 cursor-pointer ${
                adminSubTab === "docs"
                  ? "border-teal-400 text-teal-400 font-black"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              📄 Document Generations ({allDocLogs.length})
            </button>
            <button
              onClick={() => setAdminSubTab("companies")}
              className={`pb-2.5 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 cursor-pointer ${
                adminSubTab === "companies"
                  ? "border-teal-400 text-teal-400 font-black"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              🏢 Dual Companies (
              {
                allMemberships.filter(
                  (m) =>
                    (m.companyAName && !m.companyAApproved) ||
                    (m.companyBName && !m.companyBApproved),
                ).length
              }
              )
            </button>
            <button
              onClick={() => setAdminSubTab("database")}
              className={`pb-2.5 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 cursor-pointer ${
                adminSubTab === "database"
                  ? "border-teal-400 text-teal-400 font-black"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              🗄️ Database
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Manage user workspaces, approve client exporter logins, change
            active industry modes, authorize module directories, or configure{" "}
            <strong className="text-teal-400">
              dynamic monthly pricing overrides & document generation limits
              (caps)
            </strong>{" "}
            per workspace.
          </p>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-2">
            {adminSubTab === "workspaces" ? (
              <>
                {/* Active Tenants List (2 columns wide in XL) */}
                <div className="xl:col-span-2 space-y-3.5">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-5 mb-4 shadow-xl">
                    <h4 className="text-sm text-teal-400 font-bold mb-3 uppercase">
                      Create Workspace For New User
                    </h4>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2 font-mono text-sm focus:border-teal-500 focus:outline-none"
                        placeholder="e.g. valid.user@gmail.com"
                        value={newPreApprovedEmail}
                        onChange={(e) => setNewPreApprovedEmail(e.target.value)}
                      />
                      <button
                        onClick={handleAddPreApproved}
                        disabled={addingPreApproved}
                        className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold uppercase transition disabled:opacity-50"
                      >
                        {addingPreApproved
                          ? "Creating..."
                          : "Create & Add to List"}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">
                      Instantly generates a workspace for this user. You can
                      click on their workspace in the list below to configure
                      industries/modules before they even log in.
                    </p>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Workspace Client Registrations ({allLicences.length})
                    </span>
                    <input
                      type="text"
                      placeholder="Search users or emails..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-lg px-3 py-1 font-mono text-xs focus:border-teal-500 focus:outline-none w-1/3"
                    />
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                    {adminLoading && allLicences.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500 italic">
                        Querying cloud registry...
                      </div>
                    ) : allLicences.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500 italic">
                        No workspace licenses registered in database.
                      </div>
                    ) : (
                      allLicences
                        .filter((lic) => {
                          if (!searchQuery.trim()) return true;
                          const query = searchQuery.toLowerCase();
                          if (lic.name.toLowerCase().includes(query))
                            return true;
                          // Search in members for this tenant
                          const members = allMemberships.filter(
                            (m) => m.tenantId === lic.tenantId,
                          );
                          return members.some((m) =>
                            m.userEmail?.toLowerCase().includes(query),
                          );
                        })
                        .map((lic) => {
                          const isEdited = selectedLicenceId === lic.tenantId;
                          const members = allMemberships.filter(
                            (m) => m.tenantId === lic.tenantId,
                          );

                          const licPlanId = lic.planId || "standard";
                          const licPlan =
                            PLANS.find((p) => p.id === licPlanId) || PLANS[0];
                          const customPr = lic.planPriceCustom;

                          return (
                            <div
                              key={lic.tenantId}
                              onClick={() => handleSelectLicenceForConfig(lic)}
                              className={`p-3.5 rounded-2xl border text-left transition duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                isEdited
                                  ? "bg-indigo-950/40 border-indigo-500/80 shadow-md shadow-indigo-500/5"
                                  : "bg-slate-950/80 hover:bg-slate-800/60 border-slate-800/80"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-extrabold text-xs text-white uppercase font-sans">
                                    {lic.name}
                                  </span>
                                  <span className="font-mono text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                    {lic.tenantId}
                                  </span>
                                  <span className="text-[9px] bg-teal-950/80 border border-teal-800 text-teal-400 uppercase font-black px-1.5 py-0.2 rounded">
                                    {licPlanId.toUpperCase()}
                                  </span>
                                  <span className="text-[9px] font-mono font-bold text-amber-400">
                                    $
                                    {customPr !== undefined
                                      ? customPr
                                      : licPlan.price}
                                    /mo
                                  </span>
                                </div>

                                <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
                                  <div>
                                    Owner:{" "}
                                    <span className="text-slate-300 font-bold">
                                      {lic.ownerEmail || "Unknown"}
                                    </span>
                                  </div>
                                  <div className="flex gap-2 text-slate-500 mt-1 flex-wrap">
                                    <span>
                                      Members: {members.length} active
                                    </span>
                                    <span>•</span>
                                    <span className="capitalize text-teal-400">
                                      Industry: {lic.industry || "grain"}
                                    </span>
                                    {lic.logoBase64 && (
                                      <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                                        <span>•</span> 🖼️ Logo set
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2.5 sm:self-center shrink-0 w-full sm:w-auto">
                                {/* Module tags */}
                                <div className="hidden md:flex flex-wrap justify-end gap-1 max-w-[800px]">
                                  {ALL_MODULES.map((mod) => {
                                    const isAllowed =
                                      !lic.allowedModules ||
                                      lic.allowedModules.includes(mod.id);
                                    return (
                                      <span
                                        key={mod.id}
                                        className={`text-[8px] border px-1 py-0.5 rounded lowercase ${isAllowed ? "bg-emerald-950/50 border-emerald-800/50 text-emerald-400" : "bg-slate-900 border-slate-700 text-slate-500 opacity-50"}`}
                                      >
                                        {mod.id.replace(/_/g, " ")}
                                      </span>
                                    );
                                  })}
                                </div>

                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                  {/* Status and custom check flags */}
                                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                    {lic.aiEnabled ? (
                                      <span className="px-2 py-0.5 bg-yellow-950/80 border border-yellow-800 text-yellow-400 text-[8px] uppercase tracking-widest font-black rounded-full flex items-center gap-1">
                                        <Zap className="w-2.5 h-2.5" /> AI ON
                                      </span>
                                    ) : null}
                                    {lic.approved !== false ? (
                                      <span className="px-2 py-0.5 bg-teal-950/80 border border-teal-800 text-teal-400 text-[8px] uppercase tracking-widest font-black rounded-full">
                                        APPROVED
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-rose-950/85 border border-rose-800 text-rose-400 text-[8px] uppercase tracking-widest font-black rounded-full">
                                        PENDING
                                      </span>
                                    )}
                                  </div>
                                  {lic.tenantId === activeTenantId ? (
                                    <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-400 text-[8px] uppercase tracking-wider font-extrabold rounded-md flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                      Active Session
                                    </span>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onTenantChange(lic.tenantId, true);
                                        showToast(
                                          `Switched active workspace session to Key: ${lic.tenantId}!`,
                                          "success",
                                        );
                                      }}
                                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[8px] uppercase tracking-wider font-extrabold rounded-md transition cursor-pointer"
                                    >
                                      Activate Session
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* Config & Permissions Edit Panel (1 column) */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4.5 space-y-4 h-fit text-slate-100 max-h-[600px] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider block font-sans">
                      Licence Settings Editor
                    </span>
                    {selectedLicenceId && (
                      <button
                        onClick={handleSaveAdminLicenceConfig}
                        disabled={actionLoading}
                        className="px-3 py-1 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-md shadow-teal-500/10 active:scale-95"
                        title="Persist editing workspace parameters"
                      >
                        {actionLoading ? "Saving..." : "Save Config"}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {selectedLicenceId ? (
                    <div className="space-y-4 text-xs font-sans">
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                        <div className="text-[9px] uppercase text-slate-500 font-bold">
                          Configure Workspace Details
                        </div>
                        <div className="text-xs font-black text-white tracking-wide font-mono break-all">
                          {selectedLicenceId}
                        </div>
                        <div className="text-[10px] text-teal-300 truncate font-semibold">
                          {
                            allLicences.find(
                              (l) => l.tenantId === selectedLicenceId,
                            )?.name
                          }
                        </div>
                      </div>

                      {/* 1. Approval Toggle */}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
                          Exporter Approval State
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setConfigApproved(true)}
                            className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg transition-all border cursor-pointer ${
                              configApproved
                                ? "bg-teal-500 text-slate-950 border-teal-400 shadow-md"
                                : "bg-slate-900 text-slate-400 border-slate-800"
                            }`}
                          >
                            APPROVED
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfigApproved(false)}
                            className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg transition-all border cursor-pointer ${
                              !configApproved
                                ? "bg-rose-600 text-white border-rose-500 shadow-md"
                                : "bg-slate-900 text-slate-400 border-slate-800"
                            }`}
                          >
                            PENDING
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">
                          Login Access Status
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setConfigLoginBlocked(false)}
                            className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg transition-all border cursor-pointer ${
                              !configLoginBlocked
                                ? "bg-teal-500 text-slate-950 border-teal-400 shadow-md"
                                : "bg-slate-900 text-slate-400 border-slate-800"
                            }`}
                          >
                            ALLOWED
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfigLoginBlocked(true)}
                            className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg transition-all border cursor-pointer ${
                              configLoginBlocked
                                ? "bg-rose-600 text-white border-rose-500 shadow-md"
                                : "bg-slate-900 text-slate-400 border-slate-800"
                            }`}
                          >
                            REVOKED
                          </button>
                        </div>
                      </div>


                      {/* 2. Choose Subscription Plan */}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">
                          Active Subscription Plan
                        </label>
                        <select
                          value={configPlanId}
                          onChange={(e) => {
                            const pid = e.target.value as any;
                            setConfigPlanId(pid);
                            // Auto-assign corresponding modules for convenience
                            if (pid === "standard") {
                              setConfigModules([
                                "rate_calc",
                                "quote_saving",
                                "quote_sharing",
                                "bag_price_stock",
                              ]);
                            } else if (pid === "pay_per_doc") {
                              setConfigModules([
                                "rate_calc",
                                "quote_saving",
                                "quote_sharing",
                                "pi_ci_generation",
                                "bag_price_stock",
                              ]);
                            } else {
                              setConfigModules([
                                "rate_calc",
                                "quote_saving",
                                "shipping_tracking",
                                "quote_sharing",
                                "pi_ci_generation",
                                "bag_price_stock",
                              ]);
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-800 text-white text-xs px-2 py-2 rounded-xl font-bold font-sans tracking-wide outline-none focus:border-teal-500 cursor-pointer"
                        >
                          <option value="pay_per_doc">
                            Pay Per Document
                          </option>
                          <option value="standard">
                            Standard Plan ($29/mo)
                          </option>
                          <option value="organization">
                            Organization Plan ($59/mo)
                          </option>
                          <option value="enterprise">
                            Enterprise Plan ($119/mo)
                          </option>
                          <option value="annual">
                            Annual Plan ($599/yr)
                          </option>
                        </select>
                      </div>

                      {/* 3. Decide Custom Price Overwrite */}
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">
                            Admin custom loyalty price ($)
                          </label>
                          <span className="text-[8px] text-teal-400 font-bold italic">
                            Bypasses standard peg
                          </span>
                        </div>
                        <div className="relative flex items-center">
                          <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-2.5" />
                          <input
                            type="number"
                            placeholder="Default Plan Price"
                            value={configPlanPriceCustom}
                            onChange={(e) =>
                              setConfigPlanPriceCustom(e.target.value)
                            }
                            className="w-full bg-slate-900 border border-slate-800 pl-7 pr-3 py-2 text-xs font-mono font-bold text-white rounded-xl focus:border-teal-500 outline-none"
                          />
                        </div>
                        <span className="text-[8.5px] text-slate-500 leading-normal block">
                          Leave blank to use the standard Loyalty rate of the
                          selected plan.
                        </span>
                      </div>

                      {/* Country Mode selection */}
                      <div className="space-y-1 mb-4">
                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                          Default Exporting Country
                        </label>
                        <select
                          value={configCountry}
                          onChange={(e) => setConfigCountry(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 px-3 py-2 text-xs font-bold text-white rounded-xl focus:border-teal-500 outline-none"
                        >
                          <option value="">Global / Unspecified</option>
                          <option value="IN">India (IN)</option>
                          <option value="US">United States (US)</option>
                          <option value="UK">United Kingdom (UK)</option>
                          <option value="AE">United Arab Emirates (AE)</option>
                          <option value="SG">Singapore (SG)</option>
                          <option value="CN">China (CN)</option>
                          <option value="MY">Malaysia (MY)</option>
                          <option value="VN">Vietnam (VN)</option>
                          <option value="TH">Thailand (TH)</option>
                          <option value="BR">Brazil (BR)</option>
                        </select>
                      </div>

                      {/* 4. Industry Mode selection */}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                          Industry / Commodities Active Workspaces
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "grain", label: "🌾 Grain / Rice" },
                            { id: "agri_multi", label: "🌽 Multi-Agri (Oil/Sugar/Grain)" },
                            { id: "petroleum", label: "🛢️ Petroleum Products" },
                            { id: "spices", label: "🌶️ Spices" },
                            { id: "chemicals", label: "🧪 Chemicals" },
                            { id: "salts", label: "🧂 Salts" },
                            {
                              id: "vegetables_fruits",
                              label: "🥦 Veg & Fruits",
                            },
                            { id: "tiles", label: "🧱 Ceramic Tiles" },
                            { id: "sugar", label: "🍬 Sugar" },
                            { id: "nuts", label: "🌰 Nuts & Almonds" },
                            { id: "rcn", label: "🥜 Raw Cashew Nut (RCN)" },
                            { id: "coffee_tea", label: "☕ Coffee & Tea" },
                            { id: "cotton_yarn", label: "🧵 Cotton & Yarn" },
                            { id: "timber", label: "🪵 Timber & Wood" },
                            { id: "generic", label: "📦 Generic Cargo" },
                            { id: "metal", label: "⚙️ Metals & Ingots" },
                            { id: "steel", label: "🏗️ Steel & Coils" },
                            { id: "oil", label: "🛢️ Palm & Edible Oil" },
                            { id: "pharma", label: "💊 Pharmaceuticals" },
                            { id: "apparel", label: "👕 Apparel & Textiles" },
                            { id: "air_cargo", label: "✈️ Air Cargo / Perishables" },
                            { id: "packaging", label: "📦 BOPP & Jumbo Bags" },
                          ].map((ind) => {
                            const activeSet = configIndustry
                              ? configIndustry.split(",").map((s) => s.trim())
                              : [];
                            const isActive = activeSet.includes(ind.id);
                            return (
                              <button
                                key={ind.id}
                                type="button"
                                onClick={() => {
                                  if (isActive) {
                                    const next = activeSet.filter(
                                      (x) => x !== ind.id,
                                    );
                                    setConfigIndustry(
                                      next.length ? next.join(",") : "grain",
                                    );
                                  } else {
                                    setConfigIndustry(
                                      [...activeSet, ind.id].join(","),
                                    );
                                  }
                                }}
                                className={`flex items-center gap-1.5 text-[10px] font-bold p-2 text-left rounded-lg transition-colors border ${isActive ? "bg-teal-500/20 text-teal-300 border-teal-500/40" : "bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800"}`}
                              >
                                <div
                                  className={`w-3 h-3 rounded flex items-center justify-center border ${isActive ? "border-teal-500 bg-teal-500 text-slate-900" : "border-slate-700"}`}
                                >
                                  {isActive && "✓"}
                                </div>
                                {ind.label}
                              </button>
                            );
                          })}
                        </div>
                        <span className="text-[9px] text-slate-500 leading-tight block mt-1.5 font-bold">
                          Select multiple industries to give this tenant a
                          multi-commodity workspace dropdown.
                        </span>
                      </div>

                      {/* 5. Secure OTP option */}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
                          Secure OTP Verification Code
                        </label>
                        <select
                          value={configOtpMethod}
                          onChange={(e) => {
                            const m = e.target.value as any;
                            setConfigOtpMethod(m);
                            setConfigOtpEnabled(m !== "disabled");
                          }}
                          className="w-full bg-slate-900 border border-slate-800 text-white text-xs px-2 py-2 rounded-xl font-bold outline-none font-sans focus:border-teal-500 cursor-pointer"
                        >
                          <option value="disabled">
                            🚫 Standard Login (Disable OTP)
                          </option>
                          <option value="email">
                            📧 Email OTP Security Code
                          </option>
                          <option value="whatsapp">
                            💬 WhatsApp Mobile OTP Code
                          </option>
                        </select>
                      </div>

                      {/* AI Feature Option */}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                          <Zap className="w-3 h-3 text-yellow-400" /> AI Features API Access
                        </label>
                        <select
                          value={configAiEnabled ? "enabled" : "disabled"}
                          onChange={(e) => setConfigAiEnabled(e.target.value === "enabled")}
                          className="w-full bg-slate-900 border border-slate-800 text-white text-xs px-2 py-2 rounded-xl font-bold outline-none font-sans focus:border-teal-500 cursor-pointer"
                        >
                          <option value="disabled">🚫 AI API Disabled (Saves Costs)</option>
                          <option value="enabled">✨ AI Features Enabled</option>
                        </select>
                        <p className="text-[9px] text-slate-500 font-sans mt-0.5">
                          Turn off to restrict Google Gemini AI API calls for this specific workspace.
                        </p>
                      </div>

                      {/* Document Generation Caps Inputs */}
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-3.5">
                        <div className="text-[10px] uppercase font-bold text-teal-400 tracking-wide flex items-center gap-1 font-sans">
                          <Activity className="w-3.5 h-3.5 text-teal-400" />{" "}
                          Dynamic Generation Limits
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[9px] uppercase text-indigo-300 font-bold block">
                            📄 PROFORMA INVOICES (PI) CAPS
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 font-mono">
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">
                                DAY
                              </label>
                              <input
                                type="number"
                                value={configPiLimitDay}
                                onChange={(e) =>
                                  setConfigPiLimitDay(e.target.value)
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">
                                MONTH
                              </label>
                              <input
                                type="number"
                                value={configPiLimitMonth}
                                onChange={(e) =>
                                  setConfigPiLimitMonth(e.target.value)
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">
                                YEAR
                              </label>
                              <input
                                type="number"
                                value={configPiLimitYear}
                                onChange={(e) =>
                                  setConfigPiLimitYear(e.target.value)
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[9px] uppercase text-indigo-300 font-bold block">
                            💳 COMMERCIAL INVOICES (CI) CAPS
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 font-mono">
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">
                                DAY
                              </label>
                              <input
                                type="number"
                                value={configCiLimitDay}
                                onChange={(e) =>
                                  setConfigCiLimitDay(e.target.value)
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">
                                MONTH
                              </label>
                              <input
                                type="number"
                                value={configCiLimitMonth}
                                onChange={(e) =>
                                  setConfigCiLimitMonth(e.target.value)
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">
                                YEAR
                              </label>
                              <input
                                type="number"
                                value={configCiLimitYear}
                                onChange={(e) =>
                                  setConfigCiLimitYear(e.target.value)
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[9px] uppercase text-indigo-300 font-bold block">
                            📦 PACKING LISTS (PL) CAPS
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 font-mono">
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">
                                DAY
                              </label>
                              <input
                                type="number"
                                value={configPlLimitDay}
                                onChange={(e) =>
                                  setConfigPlLimitDay(e.target.value)
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">
                                MONTH
                              </label>
                              <input
                                type="number"
                                value={configPlLimitMonth}
                                onChange={(e) =>
                                  setConfigPlLimitMonth(e.target.value)
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">
                                YEAR
                              </label>
                              <input
                                type="number"
                                value={configPlLimitYear}
                                onChange={(e) =>
                                  setConfigPlLimitYear(e.target.value)
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                        <span className="text-[8px] text-slate-500 block italic">
                          Type 0 or leave blank to grant unrestricted generation
                          rights for active workspace session.
                        </span>
                      </div>

                      {/* 6. Plan Modules Permissions */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
                          Fitted Feature Modules
                        </label>

                        <div className="space-y-1.5 bg-slate-900 border border-slate-800 p-2.5 rounded-xl max-h-60 overflow-y-auto">
                          {ALL_MODULES.map((mod) => (
                            <button
                              key={mod.id}
                              type="button"
                              onClick={() =>
                                handleToggleModuleSelection(mod.id)
                              }
                              className="w-full text-left bg-slate-800/50 hover:bg-slate-800 p-2 rounded-lg border border-slate-700/50 transition cursor-pointer"
                            >
                              <div className="flex items-start gap-2">
                                <div className="mt-0.5 shrink-0">
                                  {configModules.includes(mod.id) ? (
                                    <CheckSquare className="w-4 h-4 text-teal-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-600" />
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[11px] text-slate-200 font-bold leading-tight flex items-center gap-1.5">
                                    {mod.id.startsWith("ai_") && (
                                      <Sparkles className="w-3 h-3 text-indigo-400" />
                                    )}
                                    {mod.name}
                                  </span>
                                  {mod.desc && (
                                    <span className="text-[9px] text-slate-400 mt-0.5 leading-snug">
                                      {mod.desc}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handleSaveAdminLicenceConfig}
                        disabled={actionLoading}
                        className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Commit Workspace Config</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleDeleteAdminWorkspace}
                        disabled={actionLoading}
                        className="w-full py-2.5 mt-2 bg-rose-950 border border-rose-800 hover:bg-rose-900 text-rose-400 hover:text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Delete Workspace (Revoke & Reset)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-500 italic px-4 leading-normal">
                      Click on any client's workspace name in the list to
                      configure subscription plans, override monthly prices, or
                      verify module directory limits.
                    </div>
                  )}
                </div>
              </>
            ) : adminSubTab === "users" ? (
              <div className="xl:col-span-3 space-y-3.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    GLOBAL USER DIRECTORY ({allMemberships.length} PROFILES)
                  </span>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl max-h-[600px] flex flex-col">
                  <div className="overflow-auto flex-1 p-0 custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead>
                        <tr className="bg-slate-900/90 border-b border-slate-800 text-[10px] uppercase font-black text-slate-400 tracking-wider sticky top-0 z-10 shadow-sm">
                          <th className="py-4 px-5">User Email</th>
                          <th className="py-4 px-5">Tenant ID</th>
                          <th className="py-4 px-5">Role</th>
                          <th className="py-4 px-5">Tier</th>
                          <th className="py-4 px-5">Industry</th>
                          <th className="py-4 px-5">Quotes</th>
                          <th className="py-4 px-5">Logins</th>
                          <th className="py-4 px-5">Location</th>
                          <th className="py-4 px-5">Joined At</th>
                          <th className="py-4 px-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-slate-300">
                        {allMemberships.map((m, idx) => {
                          const mLicence = allLicences.find((l) => l.tenantId === m.tenantId);
                          const planName = mLicence?.planId ? mLicence.planId.toUpperCase() : "PERSONAL";
                          const industry = mLicence?.industry ? mLicence.industry.toUpperCase() : "GRAIN";
                          const quotesCount = tenantQuoteCounts[m.tenantId] || 0;
                          const userLoginsList = allLogins.filter((l) => l.userId === m.userId);
                          const loginsCount = userLoginsList.length;
                          const latestLogin = [...userLoginsList].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                          const locationStr = latestLogin?.location || "N/A";

                          return (
                            <tr
                              key={`${m.userId}-${idx}`}
                              className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="py-3.5 px-5 font-bold text-white">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span>{m.userEmail}</span>
                                    {m.loginBlocked && <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase">Blocked</span>}
                                  </div>
                                  <span className="text-[9px] text-slate-500 font-mono">{m.userId}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-5 font-mono text-teal-400 text-[10px]">{m.tenantId}</td>
                              <td className="py-3.5 px-5 uppercase text-[10px] font-black">{m.role}</td>
                              <td className="py-3.5 px-5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  planName === "FREE" ? "bg-slate-800 text-slate-400 border border-slate-700" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                }`}>
                                  {planName}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-slate-300 font-semibold">{industry}</td>
                              <td className="py-3.5 px-5">
                                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                                  {quotesCount} Saved
                                </span>
                              </td>
                              <td className="py-3.5 px-5 font-mono text-slate-300 text-[10px]">
                                {loginsCount} times
                              </td>
                              <td className="py-3.5 px-5">
                                <span className={`text-[11px] ${locationStr !== "N/A" ? "text-amber-400 font-semibold" : "text-slate-500"}`}>
                                  {locationStr}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-slate-400">{new Date(m.joinedAt).toLocaleString()}</td>
                              <td className="py-3.5 px-5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {planName !== "FREE" && (
                                    <button
                                      onClick={() => handleSetToFreeTier(m.tenantId)}
                                      className="text-teal-400 hover:text-teal-300 bg-teal-400/10 hover:bg-teal-400/20 px-2.5 py-1.5 rounded flex items-center gap-1 text-[10px] font-bold uppercase transition-colors"
                                      title="Turn to Free Tier"
                                    >
                                      Set Free Tier
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleToggleBlockUser(m.userId, !!m.loginBlocked)}
                                    className={`${m.loginBlocked ? 'text-blue-400 hover:text-blue-300 bg-blue-400/10 hover:bg-blue-400/20' : 'text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20'} px-2.5 py-1.5 rounded flex items-center gap-1 text-[10px] font-bold uppercase transition-colors`}
                                    title={m.loginBlocked ? "Unblock User Access" : "Block User Access"}
                                  >
                                    {m.loginBlocked ? 'UNBLOCK' : 'BLOCK'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : adminSubTab === "logins" ? (
              <div className="xl:col-span-3 space-y-3.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    SECURITY AUDIT: EXPORTER RECENT LOGIN HISTORY (
                    {allLogins.length} ENTRIES)
                  </span>
                  <div className="w-full sm:w-auto flex gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search user email..."
                        value={loginSearchQuery}
                        onChange={(e) => setLoginSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearchLogins()}
                        className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <button
                      onClick={handleSearchLogins}
                      disabled={isSearchingLogins}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {isSearchingLogins ? "Searching..." : "Search"}
                    </button>
                  </div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-300 font-sans border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10">
                          <th className="p-4">Login Time Date</th>
                          <th className="p-4">Email Account</th>
                          <th className="p-4">User UID / Identifier</th>
                          <th className="p-4">Lease Workspace Key</th>
                          <th className="p-4">Location</th>
                          <th className="p-4">Subscription</th>
                          <th className="p-4">Membership Role</th>
                          <th className="p-4">Member Since</th>
                          <th className="p-4 text-center">Docs MTD</th>
                          <th className="p-4 text-center">Docs YTD</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {allLogins.length === 0 ? (
                          <tr>
                            <td
                              colSpan={11}
                              className="p-8 text-center text-slate-500 italic"
                            >
                              No user logins recorded yet.
                            </td>
                          </tr>
                        ) : (
                          [...allLogins]
                            .sort(
                              (a, b) =>
                                new Date(b.timestamp).getTime() -
                                new Date(a.timestamp).getTime(),
                            )
                            .map((log) => {
                              const loginDate = new Date(log.timestamp);
                              const currentMonth = loginDate.getMonth();
                              const currentYear = loginDate.getFullYear();
                              
                              const userDocs = allDocLogs.filter(d => d.userId === log.userId && d.tenantId === log.tenantId);
                              
                              const docsMTD = userDocs.filter(d => {
                                const dDate = new Date(d.timestamp);
                                return dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear;
                              }).length;

                              const docsYTD = userDocs.filter(d => {
                                const dDate = new Date(d.timestamp);
                                return dDate.getFullYear() === currentYear;
                              }).length;

                              const licence = allLicences.find(l => l.tenantId === log.tenantId);
                              const membership = allMemberships.find(m => m.userId === log.userId && m.tenantId === log.tenantId);
                              
                              const planLabel = licence?.planId 
                                ? PLANS.find(p => p.id === licence.planId)?.name || licence.planId
                                : "Standard (Legacy)";

                              const joinedDate = membership?.joinedAt ? new Date(membership.joinedAt).toLocaleDateString() : "N/A";

                              return (
                              <tr
                                key={log.id}
                                className="hover:bg-slate-900/40 transition font-mono"
                              >
                                <td className="p-4 text-slate-300 font-sans select-none">
                                  {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="p-4 text-teal-400 font-extrabold font-sans lowercase select-all">
                                  {log.userEmail || "N/A"}
                                </td>
                                <td className="p-4 text-slate-500 text-[10px] select-all">
                                  {log.userId}
                                </td>
                                <td className="p-4 text-sky-400 font-bold select-all">
                                  {log.tenantId}
                                </td>
                                <td className="p-4 text-amber-400 font-sans text-xs">
                                  {log.location || "N/A"}
                                </td>
                                <td className="p-4 font-sans font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                                  {planLabel}
                                </td>
                                <td className="p-4 font-sans text-slate-400 text-xs capitalize">
                                  {membership?.role || "N/A"}
                                </td>
                                <td className="p-4 font-sans text-slate-400 text-xs">
                                  {joinedDate}
                                </td>
                                <td className="p-4 text-blue-400 font-bold text-center font-sans">
                                  <span className="bg-blue-950/40 text-blue-300 py-1 px-3 rounded-full border border-blue-900/50">
                                    {docsMTD}
                                  </span>
                                </td>
                                <td className="p-4 text-indigo-400 font-bold text-center font-sans">
                                  <span className="bg-indigo-950/40 text-indigo-300 py-1 px-3 rounded-full border border-indigo-900/50">
                                    {docsYTD}
                                  </span>
                                </td>
                                <td className="p-4 font-sans font-bold">
                                  <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 rounded-full uppercase">
                                    ● Handshake OK
                                  </span>
                                </td>
                              </tr>
                            )})
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : adminSubTab === "docs" ? (
              <div className="xl:col-span-3 space-y-3.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    CAPPED USAGE: PI / CI / PL DOCUMENT GENERATION TRACKER (
                    {allDocLogs.length} GENERATIONS)
                  </span>
                  <div className="w-full sm:w-auto flex gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search user email..."
                        value={loginSearchQuery}
                        onChange={(e) => setLoginSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearchLogins()}
                        className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <button
                      onClick={handleSearchLogins}
                      disabled={isSearchingLogins}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {isSearchingLogins ? "Searching..." : "Search"}
                    </button>
                  </div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-300 font-sans border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10">
                          <th className="p-4">Time</th>
                          <th className="p-4">User Details</th>
                          <th className="p-4">Workspace & Region</th>
                          <th className="p-4">Subscription</th>
                          <th className="p-4">Document Type</th>
                          <th className="p-4">Reference</th>
                          <th className="p-4">Saved Quotes</th>
                          <th className="p-4">PI/CI/PL Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {allDocLogs.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="p-8 text-center text-slate-500 italic"
                            >
                              No document generations recorded yet in this
                              cycle.
                            </td>
                          </tr>
                        ) : (
                          [...allDocLogs]
                            .sort(
                              (a, b) =>
                                new Date(b.timestamp).getTime() -
                                new Date(a.timestamp).getTime(),
                            )
                            .map((log) => {
                              const email = allLogins.find(l => l.userId === log.userId)?.userEmail || allMemberships.find(m => m.userId === log.userId)?.userEmail || "Unknown";
                              const licence = allLicences.find(l => l.tenantId === log.tenantId);
                              const planLabel = licence?.planId 
                                ? PLANS.find(p => p.id === licence.planId)?.name || licence.planId
                                : "Standard";
                              const customPrice = licence?.planPriceCustom !== undefined ? licence.planPriceCustom : (PLANS.find(p => p.id === licence?.planId)?.price || 0);
                              
                              const userLogs = allDocLogs.filter(l => l.tenantId === log.tenantId);
                              const piCount = userLogs.filter(l => l.docType === "pi").length;
                              const ciCount = userLogs.filter(l => l.docType === "ci").length;
                              const plCount = userLogs.filter(l => l.docType === "pl").length;

                              return (
                              <tr
                                key={log.id}
                                className="hover:bg-slate-900/40 transition font-mono"
                              >
                                <td className="p-4 text-slate-300 font-sans select-none">
                                  {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="p-4 font-sans text-xs">
                                  <div className="font-bold text-slate-200 select-all">{email}</div>
                                  <div className="text-[10px] text-slate-500 select-all">UID: {log.userId}</div>
                                </td>
                                <td className="p-4 font-sans text-xs">
                                  <div className="text-sky-400 font-bold select-all">{log.tenantId}</div>
                                  <div className="text-[10px] text-slate-400 capitalize">{licence?.country || "Global"} • {licence?.industry || "Generic"}</div>
                                </td>
                                <td className="p-4 font-sans text-xs">
                                  <div className="text-teal-400 font-bold uppercase text-[10px]">{planLabel}</div>
                                  <div className="text-[10px] text-slate-500">${customPrice}/mo</div>
                                </td>
                                <td className="p-4 uppercase font-bold">
                                  <span
                                    className={`px-2.5 py-0.5 text-[9px] rounded-full uppercase ${
                                      log.docType === "pi"
                                        ? "bg-blue-950/50 text-blue-400 border border-blue-900"
                                        : log.docType === "ci"
                                          ? "bg-violet-950/50 text-violet-400 border border-violet-900"
                                          : "bg-emerald-950/50 text-emerald-400 border border-emerald-900"
                                    }`}
                                  >
                                    {log.docType}
                                  </span>
                                </td>
                                <td className="p-4 text-teal-400 font-extrabold select-all">
                                  {log.ref}
                                </td>
                                <td className="p-4 font-sans text-center">
                                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                                    {userLogs.length} Saves
                                  </span>
                                </td>
                                <td className="p-4 font-sans text-[10px] flex gap-1 justify-center mt-1">
                                  <span className={`px-1.5 py-0.5 rounded ${piCount > 0 ? 'bg-blue-900 text-blue-200' : 'bg-slate-800 text-slate-500'}`}>PI: {piCount}</span>
                                  <span className={`px-1.5 py-0.5 rounded ${ciCount > 0 ? 'bg-violet-900 text-violet-200' : 'bg-slate-800 text-slate-500'}`}>CI: {ciCount}</span>
                                  <span className={`px-1.5 py-0.5 rounded ${plCount > 0 ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-800 text-slate-500'}`}>PL: {plCount}</span>
                                </td>
                              </tr>
                            )})
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : adminSubTab === "companies" ? (
              <div className="xl:col-span-3 space-y-3.5 text-slate-300 font-sans">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  MULTI-COMPANY DUAL EXPORTER REQUEST APPROVAL DESK (
                  {
                    allMemberships.filter(
                      (m) => m.companyAName || m.companyBName,
                    ).length
                  }{" "}
                  ACCOUNTS CONFIGURED)
                </span>
                <div className="bg-slate-950/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-300 font-sans border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10">
                          <th className="p-4 bg-slate-950">
                            User Account Email
                          </th>
                          <th className="p-4 bg-slate-950">Subscription & Status</th>
                          <th className="p-4 bg-slate-950">
                            Company Option 1 Name & Tenant ID
                          </th>
                          <th className="p-4 bg-slate-950">Option 1 Status</th>
                          <th className="p-4 bg-slate-950">
                            Company Option 2 Name & Tenant ID
                          </th>
                          <th className="p-4 bg-slate-950">Option 2 Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {allMemberships.filter(
                          (m) => m.companyAName || m.companyBName,
                        ).length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="p-8 text-center text-slate-500 italic"
                            >
                              No users have configured sub-companies yet.
                            </td>
                          </tr>
                        ) : (
                          allMemberships
                            .filter((m) => m.companyAName || m.companyBName)
                            .map((mem) => {
                              const licence = allLicences.find(l => l.tenantId === mem.tenantId);
                              const planLabel = licence?.planId 
                                ? PLANS.find(p => p.id === licence.planId)?.name || licence.planId
                                : "Standard";
                              const isApproved = licence?.approved !== false;
                              return (
                              <tr
                                key={mem.userId}
                                className="hover:bg-slate-900/40 transition"
                              >
                                <td className="p-4 font-semibold text-slate-200 select-all">
                                  {mem.userEmail || "Anonymous"}
                                  <div className="text-[9px] text-slate-500 mt-0.5 select-all">
                                    Uid: {mem.userId}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="text-[10px] uppercase font-bold text-teal-400">{planLabel} Plan</div>
                                  <div className={`mt-0.5 text-[9px] font-black uppercase tracking-wider ${isApproved ? 'text-emerald-400' : 'text-amber-400'}`}>{isApproved ? 'Active' : 'Pending'}</div>
                                </td>
                                <td className="p-4 font-medium text-slate-300 select-all">
                                  {mem.companyAName ? (
                                    <>
                                      <div className="text-white font-bold">
                                        {mem.companyAName}
                                      </div>
                                      <div className="text-[10px] text-indigo-400 font-mono mt-0.5">
                                        {mem.companyATenantId}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-slate-500 italic">
                                      Not set
                                    </span>
                                  )}
                                </td>
                                <td className="p-4">
                                  {mem.companyAName && (
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                                          mem.companyAApproved
                                            ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                                            : "bg-rose-950 text-rose-400 border border-rose-900"
                                        }`}
                                      >
                                        {mem.companyAApproved
                                          ? "Approved"
                                          : "Pending"}
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleApproveDualCompany(
                                            mem.userId,
                                            "A",
                                            !mem.companyAApproved,
                                          )
                                        }
                                        className={`px-2 py-1 rounded text-[9.5px] font-bold uppercase transition cursor-pointer ${
                                          mem.companyAApproved
                                            ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                            : "bg-teal-500 text-slate-950 hover:bg-teal-400 font-black"
                                        }`}
                                      >
                                        {mem.companyAApproved
                                          ? "Revoke"
                                          : "Approve"}
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td className="p-4 font-medium text-slate-300 select-all">
                                  {mem.companyBName ? (
                                    <>
                                      <div className="text-white font-bold">
                                        {mem.companyBName}
                                      </div>
                                      <div className="text-[10px] text-indigo-400 font-mono mt-0.5">
                                        {mem.companyBTenantId}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-slate-500 italic">
                                      Not set
                                    </span>
                                  )}
                                </td>
                                <td className="p-4">
                                  {mem.companyBName && (
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                                          mem.companyBApproved
                                            ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                                            : "bg-rose-950 text-rose-400 border border-rose-900"
                                        }`}
                                      >
                                        {mem.companyBApproved
                                          ? "Approved"
                                          : "Pending"}
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleApproveDualCompany(
                                            mem.userId,
                                            "B",
                                            !mem.companyBApproved,
                                          )
                                        }
                                        className={`px-2 py-1 rounded text-[9.5px] font-bold uppercase transition cursor-pointer ${
                                          mem.companyBApproved
                                            ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                            : "bg-teal-500 text-slate-950 hover:bg-teal-400 font-black"
                                        }`}
                                      >
                                        {mem.companyBApproved
                                          ? "Revoke"
                                          : "Approve"}
                                      </button>
                                    </div>
                                  )}
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
            ) : adminSubTab === "database" ? (
              <div className="xl:col-span-3 space-y-3.5 text-slate-300 font-sans">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  SYSTEM DATABASE SEEDING
                </span>
                <div className="bg-slate-950/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-base text-white uppercase flex items-center gap-2">
                      <Upload className="w-5 h-5 text-teal-400" />
                      Import Industry Products/Varieties Check
                    </h4>
                    <p className="text-sm text-slate-400">
                      Upload a CSV or JSON file mapped with the proper headers
                      to globally seed new product varieties for any newly
                      connected tenant industries. The system will merge new
                      records safely by ID.
                    </p>

                    <div className="mt-4 p-4 border border-dashed border-slate-700 bg-slate-900 rounded-xl">
                      <label className="flex flex-col items-center justify-center p-6 cursor-pointer">
                        <Upload className="w-8 h-8 text-teal-500 mb-2" />
                        <span className="text-teal-400 font-bold tracking-wide uppercase text-xs">
                          Select CSV or JSON File
                        </span>
                        <span className="text-xs text-slate-500 mt-1">
                          Requires `id`, `name`, `industry`, `group` headers.
                        </span>
                        <input
                          type="file"
                          accept=".csv,.json"
                          onChange={handleImportCommodities}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* CORE EXPORTER PROFILE PORTAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Licence Details Column (2 Cols Wide) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-blue-950 uppercase tracking-tight font-sans">
                  WORKSPACE REGISTRATION CARD
                </h3>
                <p className="text-xs text-gray-400">
                  Currently connected workspace lease parameters
                </p>
              </div>
              <button
                type="button"
                onClick={loadLicenceDetails}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                title="Refresh workspace variables"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin text-teal-600" : ""}`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Licence Info Block */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Licence / Export Entity Name
                  </label>
                  {isEditingName ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="flex-1 text-sm bg-gray-50 border border-gray-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-xl px-3 py-1.5 font-bold transition outline-hidden"
                        placeholder="E.g., Maharaja Exports Inc."
                        disabled={actionLoading}
                      />
                      <button
                        type="button"
                        onClick={handleRenameLicence}
                        disabled={actionLoading}
                        className="bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingName(false);
                          setEditedName(licenceDetails?.name || "");
                        }}
                        className="text-gray-400 hover:text-gray-600 px-2 py-1.5 text-xs font-bold hover:bg-gray-100 rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-base font-black text-gray-900 font-sans uppercase">
                        {licenceDetails?.name || activeTenantName}
                      </span>
                      {tenantRole === "owner" && (
                        <button
                          type="button"
                          onClick={() => setIsEditingName(true)}
                          className="text-gray-400 hover:text-teal-600 p-1 rounded-lg hover:bg-teal-50 transition cursor-pointer"
                          title="Rename Licence Header"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Your Workspace Role
                  </label>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-extrabold uppercase rounded-full ${
                      tenantRole === "owner"
                        ? "bg-amber-50 border border-amber-200 text-amber-800"
                        : "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    <span>{tenantRole}</span>
                  </span>
                </div>
              </div>

              {/* License Key & Share Box */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-between space-y-2">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                    Your Shareable Licence Key
                  </label>
                  <span className="font-mono text-xs font-black text-indigo-700 tracking-wider select-all block bg-white border border-gray-200 px-3 py-1.5 rounded-xl max-w-fit">
                    {activeTenantId}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[9.5px] text-gray-400 leading-normal">
                    Invite counterparties or assistants to collaborate.
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer shadow-xs"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? "Copied" : "Copy Key"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick overview directories */}
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-teal-600" />
                <span>ACTIVE PROFILE VARIABLES</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-[10.5px] text-gray-500">
                <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block pb-0.5 uppercase text-[9px] font-bold">
                    Workspace Mode:
                  </span>
                  <span className="text-gray-800 font-bold uppercase block text-xs tracking-wide truncate">
                    🌾 {licenceDetails?.industry || "grain"} BOARD
                  </span>
                </div>
                <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block pb-0.5 uppercase text-[9px] font-bold">
                    Active Subscribed Plan:
                  </span>
                  <span className="text-indigo-700 font-extrabold block text-xs uppercase truncate">
                    ⭐ {currentPlan.name}
                  </span>
                </div>
                <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block pb-0.5 uppercase text-[9px] font-bold">
                    Billing lease cost:
                  </span>
                  {hasCustomPrice ? (
                    <span className="text-amber-600 font-bold block text-xs">
                      ${currentPrice}/mo{" "}
                      <span className="text-[8px] text-slate-400 italic font-medium">
                        (Custom Admin Peak)
                      </span>
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold block text-xs">
                      ${currentPrice}/mo
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* DUAL EXPORTER MULTI-COMPANY REGISTRATION MODULE */}
          <div
            className="bg-white border border-gray-300 rounded-3xl p-6 shadow-xs space-y-5"
            id="multi-company-registration-workspace"
          >
            <div>
              <h3 className="text-xs uppercase font-black tracking-wider text-blue-950 flex items-center gap-1.5 font-sans">
                <Building className="w-4.5 h-4.5 text-indigo-600" />
                <span>Dual Exporter Company Configuration</span>
              </h3>
              <p className="text-[11px] text-gray-400 leading-normal mt-1 font-sans">
                Manage multiple companies within your single user workspace
                account. Enter the names of the two companies you wish to
                operate. Once approved by the administrator, you will be able to
                switch between companies instantly from the top-level UI bar.
              </p>
            </div>

            <form
              onSubmit={handleRegisterSubCompanies}
              className="space-y-4 font-sans text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company A Field */}
                <div className="space-y-1.5 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Company Option 1
                    </label>
                    {userMembership?.companyAName ? (
                      userMembership.companyAApproved ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold uppercase rounded-md text-[8.5px] border border-emerald-100">
                          Approved
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-extrabold uppercase rounded-md text-[8.5px] border border-amber-100 animate-pulse">
                          Awaiting Approval
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-50 text-gray-400 font-extrabold uppercase rounded-md text-[8.5px] border border-gray-100">
                        Unconfigured
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={compANameInput}
                    onChange={(e) => setCompANameInput(e.target.value)}
                    placeholder="Enter Company 1 Name"
                    className="w-full bg-white border border-gray-200 text-gray-800 text-xs px-3 py-2.5 rounded-xl font-medium outline-none focus:border-teal-500"
                  />
                  {userMembership?.companyATenantId && (
                    <div className="text-[9px] font-mono text-gray-400 mt-1">
                      ID:{" "}
                      <span className="text-indigo-600 font-semibold">
                        {userMembership.companyATenantId}
                      </span>
                    </div>
                  )}
                </div>

                {/* Company B Field */}
                <div className="space-y-1.5 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Company Option 2
                    </label>
                    {userMembership?.companyBName ? (
                      userMembership.companyBApproved ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold uppercase rounded-md text-[8.5px] border border-emerald-100">
                          Approved
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-extrabold uppercase rounded-md text-[8.5px] border border-amber-100 animate-pulse">
                          Awaiting Approval
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-50 text-gray-400 font-extrabold uppercase rounded-md text-[8.5px] border border-gray-100">
                        Unconfigured
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={compBNameInput}
                    onChange={(e) => setCompBNameInput(e.target.value)}
                    placeholder="Enter Company 2 Name"
                    className="w-full bg-white border border-gray-200 text-gray-800 text-xs px-3 py-2.5 rounded-xl font-medium outline-none focus:border-teal-500"
                  />
                  {userMembership?.companyBTenantId && (
                    <div className="text-[9px] font-mono text-gray-400 mt-1">
                      ID:{" "}
                      <span className="text-indigo-600 font-semibold">
                        {userMembership.companyBTenantId}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isCompSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isCompSubmitting ? "Submitting..." : "Submit Company Names"}
                </button>
              </div>
            </form>
          </div>

          {/* DRAG AND DROP COMPANY LOGO / CUSTOM PRINT BRAND CARDS - NEW COMPONENT */}
          <div
            className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-5"
            id="corporate-logo-editor-workspace"
          >
            <div>
              <h3 className="text-xs uppercase font-black tracking-wider text-blue-950 flex items-center gap-1.5 font-sans">
                <Building className="w-4.5 h-4.5 text-teal-600" />
                <span>CORPORATE PRINT BRANDING & COMPANY LOGO MANAGER</span>
              </h3>
              <p className="text-[11px] text-gray-400 leading-normal mt-1">
                Configure your official company lettering and upload a
                high-contrast corporate logo. This branding is securely
                synchronized across the workspace so{" "}
                <span className="font-bold text-teal-600">
                  all printed documents (Quotes, Proformas, Commercial Invoices,
                  and Packing Lists)
                </span>{" "}
                will display your logo!
              </p>
            </div>

            <form onSubmit={handleSaveCorporateBranding} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Logo textual configurations */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Official Exporter Name (Logo Fallback Text)
                    </label>
                    <input
                      type="text"
                      value={logoText}
                      onChange={(e) => setLogoText(e.target.value)}
                      placeholder="Maharaja Basmati Exports Ltd."
                      className="w-full text-xs font-bold bg-gray-50 hover:bg-gray-100/50 border border-gray-200 focus:border-teal-500 rounded-xl px-3 py-2.5 transition outline-hidden"
                    />
                    <span className="text-[9.5px] text-gray-400 leading-tight block mt-1 leading-normal">
                      Used as premium display text top headers when no custom
                      logo image is uploaded.
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Default Exporting Country
                    </label>
                    <select
                      value={userCountry}
                      onChange={(e) => setUserCountry(e.target.value)}
                      className="w-full text-xs font-bold bg-gray-50 hover:bg-gray-100/50 border border-gray-200 focus:border-teal-500 rounded-xl px-3 py-2.5 transition outline-hidden"
                    >
                      <option value="">Global / Unspecified</option>
                      <option value="IN">India (IN)</option>
                      <option value="US">United States (US)</option>
                      <option value="UK">United Kingdom (UK)</option>
                      <option value="AE">United Arab Emirates (AE)</option>
                      <option value="SG">Singapore (SG)</option>
                      <option value="CN">China (CN)</option>
                      <option value="MY">Malaysia (MY)</option>
                      <option value="VN">Vietnam (VN)</option>
                      <option value="TH">Thailand (TH)</option>
                      <option value="BR">Brazil (BR)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Active Workspace Industry Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "grain", label: "🌾 Grain / Rice" },
                        { id: "rice_merchant", label: "🏢 Rice Merchant / M. Exporter" },
                        { id: "agri_multi", label: "🌽 Multi-Agri (Oil/Sugar/Grain)" },
                        { id: "petroleum", label: "🛢️ Petroleum Products" },
                        { id: "polymer", label: "🛢️ Polymer" },
                        { id: "cardboard_carton", label: "📦 Cardboard" },
                        { id: "spices", label: "🌶️ Spices" },
                        { id: "chemicals", label: "🧪 Chemicals" },
                        { id: "salts", label: "🧂 Salts" },
                        { id: "vegetables_fruits", label: "🥦 Veg & Fruits" },
                        { id: "tiles", label: "🧱 Ceramic Tiles" },
                        { id: "sugar", label: "🍬 Sugar" },
                        { id: "nuts", label: "🌰 Nuts & Almonds" },
                            { id: "rcn", label: "🥜 Raw Cashew Nut (RCN)" },
                        { id: "coffee_tea", label: "☕ Coffee & Tea" },
                        { id: "cotton_yarn", label: "🧵 Cotton & Yarn" },
                        { id: "timber", label: "🪵 Timber & Wood" },
                        { id: "generic", label: "📦 Generic Cargo" },
                        { id: "metal", label: "⚙️ Metals & Ingots" },
                        { id: "steel", label: "🏗️ Steel & Coils" },
                        { id: "oil", label: "🛢️ Palm & Edible Oil" },
                        { id: "pharma", label: "💊 Pharmaceuticals" },
                        { id: "apparel", label: "👕 Apparel & Textiles" },
                        { id: "air_cargo", label: "✈️ Air Cargo / Perishables" },
                        { id: "packaging", label: "📦 BOPP & Jumbo Bags" },
                      ].map((ind) => {
                        const isFree = licenceDetails?.planId === "free" || licenceDetails?.approved === false;
                        const activeSet = userIndustry
                          ? userIndustry.split(",").map((s) => s.trim())
                          : [];
                        const isActive = isFree 
                          ? userIndustry === ind.id 
                          : activeSet.includes(ind.id);
                        return (
                          <button
                            key={ind.id}
                            type="button"
                            onClick={() => {
                              if (isFree) {
                                setUserIndustry(ind.id);
                              } else {
                                if (isActive) {
                                  const next = activeSet.filter(
                                    (x) => x !== ind.id,
                                  );
                                  setUserIndustry(
                                    next.length ? next.join(",") : "grain",
                                  );
                                } else {
                                  setUserIndustry(
                                    [...activeSet, ind.id].join(","),
                                  );
                                }
                              }
                            }}
                            className={`flex items-center gap-1.5 text-[10px] font-bold p-2 text-left rounded-lg transition-colors border ${isActive ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                          >
                            <div
                              className={`w-3 h-3 rounded flex items-center justify-center border ${isActive ? "border-indigo-400 bg-indigo-400 text-white" : "border-gray-300"}`}
                            >
                              {isActive && "✓"}
                            </div>
                            {ind.label}
                          </button>
                        );
                      })}
                    </div>
                    {licenceDetails?.planId === "free" || licenceDetails?.approved === false ? (
                      <span className="text-[10px] text-amber-600 font-extrabold leading-tight block mt-1 bg-amber-50 border border-amber-100 rounded-lg p-2 font-sans">
                        ⚠️ Free Tier Constraint: You can select exactly ONE preferred industry. To work with multiple industries concurrently, upgrade to a Premium plan.
                      </span>
                    ) : (
                      <span className="text-[9.5px] text-gray-400 leading-tight block mt-1 leading-normal font-sans">
                        Select multiple industries to unlock the multi-commodity
                        workspace dropdown. Changes layout configurations, metric
                        parameters, and packaging selections.
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Global Date Format Preferences
                    </label>
                    <select
                      value={configDateFormat}
                      onChange={(e) => setConfigDateFormat(e.target.value)}
                      className="w-full text-xs font-bold bg-gray-50 hover:bg-gray-100/50 border border-gray-200 focus:border-teal-500 rounded-xl px-3 py-2.5 transition outline-hidden appearance-none"
                    >
                      <option value="DD-MMM-YY">
                        DD-MMM-YY (e.g. 01-Jan-25)
                      </option>
                      <option value="DD-MMM-YYYY">
                        DD-MMM-YYYY (e.g. 01-Jan-2025)
                      </option>
                      <option value="DD-MM-YYYY">
                        DD-MM-YYYY (e.g. 01-01-2025)
                      </option>
                      <option value="DD/MM/YYYY">
                        DD/MM/YYYY (e.g. 01/01/2025)
                      </option>
                      <option value="MM-DD-YYYY">
                        MM-DD-YYYY (e.g. 12-31-2025)
                      </option>
                      <option value="MM/DD/YYYY">
                        MM/DD/YYYY (e.g. 12/31/2025)
                      </option>
                      <option value="YYYY-MM-DD">
                        YYYY-MM-DD (e.g. 2025-01-31)
                      </option>
                      <option value="DD-MM-YY">DD-MM-YY (e.g. 31-01-25)</option>
                      <option value="DD/MM/YY">DD/MM/YY (e.g. 31/01/25)</option>
                    </select>
                    <span className="text-[9.5px] text-gray-400 leading-tight block mt-1 leading-normal font-sans mb-5">
                      This date format will apply to all PI, CI, PL, and Quotes
                      across modules.
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Exporter Tagline / Sub-Heading
                    </label>
                    <input
                      type="text"
                      value={exporterTagline}
                      onChange={(e) => setExporterTagline(e.target.value)}
                      placeholder="Premium Quality Rice Merchant Exporters"
                      className="w-full text-xs font-bold bg-gray-50 hover:bg-gray-100/50 border border-gray-200 focus:border-teal-500 rounded-xl px-3 py-2.5 transition outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Exporter Address & Contact Line
                    </label>
                    <input
                      type="text"
                      value={exporterAddress}
                      onChange={(e) => setExporterAddress(e.target.value)}
                      placeholder="Office Block C-4, India | Email: exports@saenterprises.co"
                      className="w-full text-xs font-bold bg-gray-50 hover:bg-gray-100/50 border border-gray-200 focus:border-teal-500 rounded-xl px-3 py-2.5 transition outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Default Bank Details (For CI/PI)
                    </label>
                    <textarea
                      value={bankDetails}
                      onChange={(e) => setBankDetails(e.target.value)}
                      placeholder="Bank Name: HSBC&#10;Account No: 1234567890&#10;SWIFT: HSBCINBB"
                      rows={4}
                      className="w-full text-xs font-bold bg-gray-50 hover:bg-gray-100/50 border border-gray-200 focus:border-teal-500 rounded-xl px-3 py-2.5 transition outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                      Logo Upload Zone
                    </label>

                    {/* Drag and Drop Zone UI */}
                    <div
                      onDragEnter={handleLogoDrag}
                      onDragOver={handleLogoDrag}
                      onDragLeave={handleLogoDrag}
                      onDrop={handleLogoDrop}
                      className={`relative border-2 border-dashed rounded-2xl p-4 text-center transition flex flex-col items-center justify-center cursor-pointer ${
                        logoDragActive
                          ? "border-teal-500 bg-teal-50/50"
                          : logoBase64
                            ? "border-dashed border-emerald-400 bg-emerald-50/10"
                            : "border-slate-300 hover:border-teal-400 bg-slate-50/30"
                      }`}
                    >
                      <input
                        type="file"
                        id="brand-logo-file-input"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />

                      <Upload
                        className={`w-8 h-8 mb-2 ${logoBase64 ? "text-emerald-500 animate-pulse" : "text-slate-400"}`}
                      />

                      <div className="text-xs font-bold text-slate-700">
                        {logoBase64
                          ? "Change Company Logo"
                          : "Drag & Drop company image here"}
                      </div>
                      <div className="text-[9.5px] text-slate-400 mt-1">
                        Supports PNG, JPG, or WEBP formats (Max 700 KB)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Document Print Header live mock simulator */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between border-b pb-1">
                    <span>A4 Document Brand Header Mock</span>
                    <span className="text-emerald-600 font-extrabold tracking-wide uppercase text-[8.5px]">
                      Live Preview
                    </span>
                  </div>

                  <div className="p-4 bg-white border border-gray-300/80 rounded-xl flex flex-col items-center justify-center min-h-[110px] mt-2 shadow-inner text-center">
                    {logoBase64 ? (
                      <div className="space-y-2 w-full flex flex-col items-center">
                        <img
                          src={logoBase64}
                          alt="Company Logo Preview"
                          className="max-h-12 max-w-[200px] object-contain block"
                        />
                        <button
                          type="button"
                          onClick={handleClearLogoImage}
                          className="px-2 py-0.5 text-rose-500 hover:bg-rose-50 text-[9px] font-black uppercase rounded flex items-center gap-0.5 border border-rose-100 transition"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Delete Logo</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-sm font-extrabold uppercase text-slate-800 tracking-wider font-sans">
                          {logoText || licenceDetails?.name || activeTenantName}
                        </div>
                        <div className="text-[8px] font-mono text-slate-400">
                          FALLBACK BRAND HEADER TEXT PRINTED
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-[9px] text-slate-400 leading-relaxed italic">
                    All exported PDF contracts and matching compliance invoices
                    will directly render the mock headers displayed above. This
                    ensures consistent professional aesthetics.
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSavingBranding || actionLoading}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isSavingBranding ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save & Synchronize Branding</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Informative Side Card Column */}
        <div className="bg-indigo-50/40 border border-blue-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 text-blue-900">
              <HelpCircle className="w-4.5 h-4.5 text-blue-600 shrink-0" />
              <h3 className="text-xs font-black uppercase tracking-wider font-sans">
                COLLABORATOR TUTORIAL
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed leading-normal">
              To invite associates, exporters, or freight partners to share your
              active billing workspace and print with the same layout, have them
              follow this guide:
            </p>

            <div className="space-y-3.5 pt-1">
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-mono">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 uppercase">
                    Share Your Workspace Key
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Copy and share your secret billing key{" "}
                    <strong className="text-indigo-700 font-mono select-all bg-white p-0.5 rounded border border-gray-100">
                      {activeTenantId}
                    </strong>
                    .
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-mono">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 uppercase">
                    Input the Tenant Code
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Instruct counterparties to paste this key in their join
                    command box down below.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-mono">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 uppercase">
                    Enjoy Coordinated Printing
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed text-slate-600">
                    All created quotes, Proforma invoices, and logo brand models
                    instantly sync across both laptops!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="bg-indigo-950 text-white/90 p-3.5 rounded-2xl border border-indigo-900 text-[10.5px] leading-relaxed relative overflow-hidden">
                <div className="font-bold uppercase text-[9px] text-teal-400 block mb-1">
                  🛡️ Multi-Tenant Shield
                </div>
                Your proprietary rate board tables, customer emails, custom
                container weights, and invoice registers are isolated on
                hardware silos. Outside groups cannot view or intercept files.
              </div>
            </div>
          </div>

          <div className="border-t border-indigo-100 pt-4 text-[10.5px] text-slate-500 leading-normal">
            <div className="flex items-start gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Commercial metadata is isolated at firestore rules to assure
                total compliance.
              </span>
            </div>
          </div>
        </div>
      </div>

      {isViren && (
        <div
          className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-5"
          id="aws-migration-portability-workspace"
        >
          <div>
            <h3 className="text-xs uppercase font-black tracking-wider text-blue-950 flex items-center gap-1.5 font-sans">
              <Cloud className="w-4.5 h-4.5 text-indigo-600" />
              <span>AWS DATA EXPORT & MULTI-CLOUD PORTABILITY</span>
            </h3>
            <p className="text-[11px] text-gray-500 font-medium leading-relaxed mt-1.5 max-w-4xl">
              Prepare your commercial schema models (Quotes, Invoices, Company
              Metadata) for a potential migration out of Google Cloud ecosystem.
              This tool generates a NoSQL-friendly JSON compilation ready for
              import into{" "}
              <span className="font-bold text-slate-700">AWS DynamoDB</span> or{" "}
              <span className="font-bold text-slate-700">
                Amazon Relational Database Service (RDS)
              </span>{" "}
              PostgreSQL/MySQL schemas.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  Export Raw JSON Workspace
                </h4>
                <p className="text-[10px] text-slate-500 max-w-xl mt-1">
                  This will compute your active workspace's schema, encompassing
                  commercial quotes, print artifacts, user profiles, and
                  commodity catalogs into a `.json` schema package.
                </p>
              </div>
              <button
                onClick={handleAWSExport}
                className="bg-indigo-600 hover:bg-teal-600 text-white text-[11px] px-5 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all disabled:opacity-50 whitespace-nowrap shadow-lg shadow-indigo-600/20"
              >
                Download AWS Ready JSON
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 p-3.5 rounded-xl font-mono leading-relaxed relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <Database className="w-16 h-16" />
            </div>
            <span className="text-teal-400 font-bold block mb-1">
              AWS MIGRATION ADVISORY:{" "}
            </span>
            Your React-Vite front-end is fully portable to <b>AWS Amplify</b> or{" "}
            <b>Amazon S3 + CloudFront</b>. Upload standard build artifacts
            generated by <code>npm run build</code> into your CI/CD pipeline
            directly. You face absolute zero UI technology lock-in.
          </div>
        </div>
      )}

      {/* RENDER DYNAMIC PRICING AND PLANS GRID SECTION - BASED ON SHIPZY MODEL */}
      {isViren && (
        <section
          className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6"
          id="exporter-subscription-plans-grid"
        >
          <div className="text-center max-w-xl mx-auto space-y-1.5 pb-2">
            <div className="text-teal-600 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1">
              <Award className="w-3.5 h-3.5" /> CHOOSE YOUR ACTIVE EXPORT LEASE
            </div>
            <h3 className="text-xl font-black text-blue-950 uppercase tracking-tight font-sans">
              EXPORTER POWER PACK PLANS
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              All prices fall under our fair use and volume policy. Ensure your
              team selects the model best aligned to your annual freight
              documents metrics.
            </p>
          </div>

          {/* FREE TIER & SINGLE SHIPMENT CREDITS STATUS */}
          <div className="max-w-4xl mx-auto bg-slate-50 border border-gray-200 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                <Coins className="w-6 h-6" />
              </div>
              <div className="space-y-0.5 text-xs text-left">
                <span className="font-black text-gray-800 uppercase block tracking-wide">
                  Single-Shipment Credits System
                </span>
                <p className="text-[11px] text-gray-500 leading-normal">
                  Each credit lifts both the calculation and saved quote caps for one specific shipment/quotation folder.
                </p>
                <p className="text-xs font-semibold text-indigo-900 mt-1 flex items-center gap-2">
                  <span>Available Credits:</span>
                  <span className="font-black font-mono text-[13px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-100">{licenceDetails?.singleShipmentCredits || 0} Credits</span>
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={async () => {
                if (!licenceDetails) return;
                const updated: LicenceDetails = {
                  ...licenceDetails,
                  singleShipmentCredits: (licenceDetails.singleShipmentCredits || 0) + 1
                };
                await saveLicenceDetails(updated);
                setLicenceDetails(updated);
                onUpdateLicenceMetadata(updated);
                showToast("Mock Payment Successful! 1 Single-Shipment Credit added to your workspace.", "success");
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs shrink-0"
            >
              <Coins className="w-4 h-4 text-indigo-200" />
              <span>Buy Single Credit ($1.99)</span>
            </button>
          </div>

          {/* Dynamic Partner Badge if there is a customized Admin pricing override */}
          {hasCustomPrice && (
            <div className="max-w-md mx-auto bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-0.5 text-xs">
                <span className="font-black text-amber-800 uppercase block">
                  Custom Admin Price Verified!
                </span>
                <p className="text-[11px] text-amber-700 leading-normal">
                  VNP Viren has set a custom preferred parner rate for your
                  workspace matching{" "}
                  <strong className="text-indigo-900">
                    ${licenceDetails?.planPriceCustom}/mo
                  </strong>
                  . Any self-service plan changes will maintain this custom
                  pricing override.
                </p>
              </div>
            </div>
          )}

          {/* Pristine visual pricing grid cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 pt-1 max-w-[1400px] mx-auto">
            {PLANS.map((plan) => {
              const isPlanActive = currentPlanId === plan.id;

              // Adjust the displayed price based on active custom overrides
              const baseDisplayPrice = isIndian && plan.priceINR ? plan.priceINR : plan.price;
              const currencySymbol = isIndian && plan.priceINR ? "₹" : "$";
              
              const isThisPlanOverridden = isPlanActive && hasCustomPrice;
              const displayPrice = isThisPlanOverridden
                ? currentPrice
                : baseDisplayPrice;

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border transition duration-300 relative overflow-hidden flex flex-col justify-between ${
                    isPlanActive
                      ? "border-indigo-600 bg-gradient-to-b from-indigo-50/20 to-white shadow-lg ring-1 ring-indigo-600 scale-[1.01]"
                      : "border-slate-200 bg-white hover:border-slate-300 shadow-xs"
                  }`}
                >
                  {/* Visual Popular Banner Badge of the selected standard */}
                  {plan.id === "enterprise" && (
                    <div className="bg-indigo-600 text-white font-black text-[9px] uppercase tracking-wider py-1 text-center font-sans tracking-widest">
                      ⭐ RECOMMENDED FOR LARGE MILLS ⭐
                    </div>
                  )}

                  {plan.id !== "enterprise" && plan.badge && (
                    <div className="bg-slate-100 text-slate-600 font-bold text-[8.5px] uppercase tracking-wider py-1 text-center font-sans">
                      {plan.badge}
                    </div>
                  )}

                  <div className="p-5.5 space-y-4">
                    {/* Title and price metrics */}
                    <div className="text-center space-y-1">
                      <h4 className="font-sans font-black text-[13px] tracking-tight uppercase text-slate-800">
                        {plan.name}
                      </h4>

                      <div className="py-2">
                        <span className="text-3xl font-black text-slate-900 font-sans tracking-tight">
                          {currencySymbol}{displayPrice}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">
                          {" "}
                          / mo
                        </span>
                      </div>

                      <span className="text-[9.5px] text-slate-400 block uppercase font-mono font-medium">
                        Billed month-to-month
                      </span>
                    </div>

                    {/* List plan features with nice checks */}
                    <ul className="space-y-2 pt-3 border-t border-slate-100 text-[11px] text-slate-600 font-medium">
                      {plan.features.map((feat, fidx) => (
                        <li key={fidx} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Card Button footer controllers */}
                  <div className="p-5 border-t border-slate-100 bg-slate-50/40">
                    {isPlanActive ? (
                      <div className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-[10px] uppercase tracking-widest rounded-xl text-center flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Active Subscription</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={actionLoading || tenantRole !== "owner"}
                        onClick={() => handleSelectPlanSelf(plan.id)}
                        className={`w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-center transition cursor-pointer ${
                          tenantRole !== "owner"
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                        }`}
                        title={
                          tenantRole !== "owner"
                            ? "Only workspace owners can alter subscriptions"
                            : `Select ${plan.name}`
                        }
                      >
                        <span>Upgrade to {plan.id}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* JOIN AND CREATE FORMS CONTAINERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* JOIN AN EXISTING LICENCE CONTAINER */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-blue-950 font-extrabold text-xs uppercase tracking-wider border-b border-gray-100 pb-3">
            <Users className="w-4 h-4 text-teal-600" />
            <span>Join Existing Corporate Lease</span>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed leading-normal">
            Enter the active code key shared by your manager to link your device
            parameters.
            <span className="text-red-500 font-semibold font-sans">
              {" "}
              Warning:
            </span>{" "}
            Connecting will disconnect you from your current workspace.
          </p>

          <form onSubmit={handleJoinLicence} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                Workspace Tenant Code Key
              </label>
              <input
                type="text"
                value={joinKey}
                onChange={(e) => setJoinKey(e.target.value)}
                placeholder="LIC-RM-XXXXXX"
                disabled={actionLoading}
                className="w-full text-xs font-mono font-bold bg-gray-50 hover:bg-gray-100/50 border border-gray-300 focus:border-teal-600 rounded-xl px-3.5 py-3 transition outline-hidden uppercase tracking-widest"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl transition cursor-pointer shadow-xs text-center flex items-center justify-center gap-2"
            >
              <span>Connect Tenant Key</span>
            </button>
          </form>
        </div>

        {/* REGISTER A SEPARATE COMMERCIAL LICENCE CONTAINER */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-blue-950 font-extrabold text-xs uppercase tracking-wider border-b border-gray-100 pb-3">
            <PlusCircle className="w-4 h-4 text-indigo-500" />
            <span>Register New Independent Licence</span>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed leading-normal">
            Specify your export corporate name to generate an independent
            business licence key under sandboxed Firestore isolation layers. You
            acquire owner security clearance.
          </p>

          <form onSubmit={handleCreateNewLicence} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                New Independent Company Name
              </label>
              <input
                type="text"
                value={newLicenceName}
                onChange={(e) => setNewLicenceName(e.target.value)}
                placeholder="E.g., Star Ceramic Exports Ltd."
                disabled={actionLoading}
                className="w-full text-xs font-bold bg-gray-50 hover:bg-gray-100/50 border border-gray-300 focus:border-teal-600 rounded-xl px-3.5 py-3 transition outline-hidden uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl transition cursor-pointer shadow-xs text-center flex items-center justify-center gap-2"
            >
              <span>Generate New Independent Key</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
