import React, { useState, useEffect } from 'react';
import { 
  getLicenceDetails, 
  saveLicenceDetails, 
  updateUserMembership, 
  getAllLicences, 
  getAllMemberships,
  LicenceDetails,
  UserMembership,
  getAllLogins,
  getAllGenerationLogs,
  LoginAudit,
  DocumentGenerationLog,
  updateMembershipSubCompanies
} from '../services/db';
import { 
  Key, Copy, PlusCircle, Users, Check, Lock, ShieldCheck, HelpCircle, RefreshCw, Edit2, Save,
  Sliders, Settings2, ShieldAlert, CheckSquare, Square, Smartphone, ArrowRight, LayoutGrid,
  Upload, DollarSign, Award, Sparkles, AlertCircle, RefreshCcw, Building, FileText, CheckCircle2, Trash2,
  Clock, Activity, ChevronRight
} from 'lucide-react';

interface LicenceManagerProps {
  userId: string;
  userEmail: string | null;
  activeTenantId: string;
  activeTenantName: string;
  tenantRole: 'owner' | 'member';
  onTenantChange: (newTenantId: string, refreshNeeded: boolean) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'warn' | 'error') => void;
  licenceMetadata: LicenceDetails | null;
  onUpdateLicenceMetadata: (meta: LicenceDetails) => void;
  userMembership?: UserMembership | null;
}

export interface SubscriptionPlan {
  id: 'standard' | 'organization' | 'enterprise';
  name: string;
  price: number;
  docsLimit: number;
  usersLimit: number;
  features: string[];
  badge?: string;
}

// Low price static subscription plans inspired by uploaded model
export const PLANS: SubscriptionPlan[] = [
  {
    id: 'standard',
    name: 'STANDARD PLAN',
    price: 29,
    docsLimit: 720,
    usersLimit: 2,
    badge: 'NEW EXPORTERS',
    features: [
      '720 Documents / Year limit',
      '2 Users concurrent access',
      'Profit / Loss margin calculator',
      'Daily PDF report dispatcher',
      'Shipzy Workspace Drive',
      'Smart metrics dashboard',
      'Standard Email support response'
    ]
  },
  {
    id: 'organization',
    name: 'ORGANIZATION PLAN',
    price: 59,
    docsLimit: 2400,
    usersLimit: 5,
    badge: 'MIDSIZE TEAMS',
    features: [
      'Everything in Standard plan +',
      '2400 Documents / Year limit',
      '5 Concurrent team members',
      'Inventory allocation board',
      'Dedicated Cargo Cloud Drive',
      'Custom proforma status notes',
      'Priority chat & email support'
    ]
  },
  {
    id: 'enterprise',
    name: 'ENTERPRISE PLAN',
    price: 119,
    docsLimit: 7200,
    usersLimit: 20,
    badge: 'MOST POPULAR',
    features: [
      'Everything in Organization plan +',
      '7200 Documents / Year limit',
      '20 High-volume active users',
      'Production scheduling logs',
      'Milling yields & weight checkers',
      'Shipping bill scanner API',
      'Software & team boarding assistance',
      'Advanced historical data migration',
      'Premium dedicated 24/7 call line'
    ]
  }
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
  userMembership
}: LicenceManagerProps) {
  const [licenceDetails, setLicenceDetails] = useState<LicenceDetails | null>(licenceMetadata);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Licence renaming editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Form states for creating/joining
  const [joinKey, setJoinKey] = useState('');
  const [newLicenceName, setNewLicenceName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Multi-Company form state
  const [compANameInput, setCompANameInput] = useState(userMembership?.companyAName || '');
  const [compBNameInput, setCompBNameInput] = useState(userMembership?.companyBName || '');
  const [isCompSubmitting, setIsCompSubmitting] = useState(false);

  useEffect(() => {
    if (userMembership) {
      setCompANameInput(userMembership.companyAName || '');
      setCompBNameInput(userMembership.companyBName || '');
    }
  }, [userMembership]);

  // Corporate logo and branding state variables
  const [logoText, setLogoText] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [userIndustry, setUserIndustry] = useState<'grain' | 'tiles' | 'generic' | 'spices' | 'chemicals' | 'salts' | 'vegetables_fruits'>('grain');

  // Admin states
  const isViren = userEmail?.toLowerCase() === 'vnp.viren@gmail.com';
  const [allLicences, setAllLicences] = useState<LicenceDetails[]>([]);
  const [allMemberships, setAllMemberships] = useState<UserMembership[]>([]);
  const [allLogins, setAllLogins] = useState<LoginAudit[]>([]);
  const [allDocLogs, setAllDocLogs] = useState<DocumentGenerationLog[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [selectedLicenceId, setSelectedLicenceId] = useState<string | null>(null);
  const [adminSubTab, setAdminSubTab] = useState<'workspaces' | 'logins' | 'docs' | 'companies'>('workspaces');

  // Editing config state for admin
  const [configApproved, setConfigApproved] = useState(true);
  const [configOtpEnabled, setConfigOtpEnabled] = useState(false);
  const [configOtpMethod, setConfigOtpMethod] = useState<'email' | 'whatsapp' | 'disabled'>('disabled');
  const [configIndustry, setConfigIndustry] = useState<'grain' | 'tiles' | 'generic' | 'spices' | 'chemicals' | 'salts' | 'vegetables_fruits'>('grain');
  const [configModules, setConfigModules] = useState<string[]>([]);
  
  // New document generation limit inputs
  const [configPiLimitDay, setConfigPiLimitDay] = useState<string>('0');
  const [configPiLimitMonth, setConfigPiLimitMonth] = useState<string>('0');
  const [configPiLimitYear, setConfigPiLimitYear] = useState<string>('0');

  const [configCiLimitDay, setConfigCiLimitDay] = useState<string>('0');
  const [configCiLimitMonth, setConfigCiLimitMonth] = useState<string>('0');
  const [configCiLimitYear, setConfigCiLimitYear] = useState<string>('0');

  const [configPlLimitDay, setConfigPlLimitDay] = useState<string>('0');
  const [configPlLimitMonth, setConfigPlLimitMonth] = useState<string>('0');
  const [configPlLimitYear, setConfigPlLimitYear] = useState<string>('0');
  
  // New plan and pricing overrides states for Vnp Viren Admin Panel
  const [configPlanId, setConfigPlanId] = useState<'standard' | 'organization' | 'enterprise'>('standard');
  const [configPlanPriceCustom, setConfigPlanPriceCustom] = useState<string>('');

  // Sync state whenever external metadata changes
  useEffect(() => {
    if (licenceMetadata) {
      setLicenceDetails(licenceMetadata);
      setEditedName(licenceMetadata.name);
      setLogoText(licenceMetadata.logoText || '');
      setLogoBase64(licenceMetadata.logoBase64 || '');
      setUserIndustry(licenceMetadata.industry || 'grain');
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
        setLogoText(details.logoText || '');
        setLogoBase64(details.logoBase64 || '');
        setUserIndustry(details.industry || 'grain');
        onUpdateLicenceMetadata(details);
      } else {
        // Fallback or create display details
        const mockDetails: LicenceDetails = {
          tenantId: activeTenantId,
          name: activeTenantName,
          ownerId: userId,
          ownerEmail: userEmail || 'Active Licensee',
          createdAt: new Date().toISOString(),
          approved: true,
          otpEnabled: false,
          otpMethod: 'disabled',
          industry: 'grain',
          allowedModules: ['rate_calc'],
          planId: 'standard'
        };
        setLicenceDetails(mockDetails);
        setEditedName(activeTenantName);
        setUserIndustry('grain');
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
      const listLic = await getAllLicences();
      const listMem = await getAllMemberships();
      const listLog = await getAllLogins();
      const listDocs = await getAllGenerationLogs();
      setAllLicences(listLic);
      setAllMemberships(listMem);
      setAllLogins(listLog);
      setAllDocLogs(listDocs);
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch administrator records.", "error");
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (activeTenantId) {
      loadLicenceDetails();
    }
  }, [activeTenantId]);

  useEffect(() => {
    if (isViren) {
      loadAdminData();
    }
  }, [isViren]);

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
        ownerEmail: userEmail || '',
        createdAt: new Date().toISOString()
      };

      const updatedDetails: LicenceDetails = {
        ...currentDetails,
        name: editedName.trim()
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
      const generatedCompAId = userMembership?.companyATenantId || `LIC-COA-${userId.substring(0, 5).toUpperCase()}`;
      const generatedCompBId = userMembership?.companyBTenantId || `LIC-COB-${userId.substring(0, 5).toUpperCase()}`;

      // 1. Create LicenceDetails for Company A if requested
      if (compANameInput.trim()) {
        const licA: LicenceDetails = {
          tenantId: generatedCompAId,
          name: compANameInput.trim(),
          ownerId: userId,
          ownerEmail: userEmail || '',
          createdAt: new Date().toISOString(),
          approved: true, // Auto-approved instantly!
          otpEnabled: false,
          otpMethod: 'disabled',
          industry: licenceDetails?.industry || 'grain',
          allowedModules: licenceDetails?.allowedModules || ['rate_calc', 'quote_saving', 'quote_sharing', 'bag_price_stock', 'grain_inventory']
        };
        await saveLicenceDetails(licA);
      }

      // 2. Create LicenceDetails for Company B if requested
      if (compBNameInput.trim()) {
        const licB: LicenceDetails = {
          tenantId: generatedCompBId,
          name: compBNameInput.trim(),
          ownerId: userId,
          ownerEmail: userEmail || '',
          createdAt: new Date().toISOString(),
          approved: true, // Auto-approved instantly!
          otpEnabled: false,
          otpMethod: 'disabled',
          industry: licenceDetails?.industry || 'grain',
          allowedModules: licenceDetails?.allowedModules || ['rate_calc', 'quote_saving', 'quote_sharing', 'bag_price_stock', 'grain_inventory']
        };
        await saveLicenceDetails(licB);
      }

      // 3. Update UserMembership on Firebase
      const updateData: Partial<UserMembership> = {
        companyAName: compANameInput.trim() || undefined,
        companyATenantId: compANameInput.trim() ? generatedCompAId : undefined,
        companyAApproved: compANameInput.trim() ? true : (userMembership?.companyAApproved ?? false),
        companyBName: compBNameInput.trim() || undefined,
        companyBTenantId: compBNameInput.trim() ? generatedCompBId : undefined,
        companyBApproved: compBNameInput.trim() ? true : (userMembership?.companyBApproved ?? false)
      };

      await updateMembershipSubCompanies(userId, updateData);
      showToast("Exporter company configurations updated and approved instantly! You can switch between them in the top-level bar.", "success");
      if (isViren) loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Failed to register dual company layout.", "error");
    } finally {
      setIsCompSubmitting(false);
    }
  };

  const handleApproveDualCompany = async (targetUserId: string, companyToggle: 'A' | 'B', approveState: boolean) => {
    setActionLoading(true);
    try {
      const matchMembership = allMemberships.find(m => m.userId === targetUserId);
      if (!matchMembership) throw new Error("Membership doc not found.");

      const tenantId = companyToggle === 'A' ? matchMembership.companyATenantId : matchMembership.companyBTenantId;
      if (!tenantId) throw new Error(`Company ${companyToggle} Tenant ID not configured.`);

      // 1. Update the Licence details approval state in /licences/
      try {
        const licenceDetailsObj = await getLicenceDetails(tenantId);
        if (licenceDetailsObj) {
          licenceDetailsObj.approved = approveState;
          await saveLicenceDetails(licenceDetailsObj);
        } else {
          // If the licence details document doesn't exist for some reason, create it
          const companyName = companyToggle === 'A' ? matchMembership.companyAName : matchMembership.companyBName;
          const newLic: LicenceDetails = {
            tenantId: tenantId,
            name: companyName || `Company ${companyToggle}`,
            ownerId: targetUserId,
            ownerEmail: matchMembership.userEmail || '',
            createdAt: new Date().toISOString(),
            approved: approveState,
            otpEnabled: false,
            otpMethod: 'disabled',
            industry: 'grain',
            allowedModules: ['rate_calc', 'quote_saving', 'quote_sharing', 'bag_price_stock', 'grain_inventory']
          };
          await saveLicenceDetails(newLic);
        }
      } catch (err) {
        console.warn("Could not save corresponding LicenceDetails doc:", err);
      }

      // 2. Update the UserMembership document's sub-company approval state
      const updatedMembershipData: Partial<UserMembership> = {};
      if (companyToggle === 'A') {
        updatedMembershipData.companyAApproved = approveState;
      } else {
        updatedMembershipData.companyBApproved = approveState;
      }

      await updateMembershipSubCompanies(targetUserId, updatedMembershipData);
      showToast(`Company ${companyToggle} approval set to ${approveState ? "APPROVED" : "PENDING"}!`, "success");
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
        ownerEmail: userEmail || '',
        createdAt: new Date().toISOString(),
        approved: true, // Auto-approved on self creation
        otpEnabled: false,
        otpMethod: 'disabled',
        industry: 'grain',
        allowedModules: ['rate_calc'],
        planId: 'standard'
      };

      await saveLicenceDetails(newLicence);
      await updateUserMembership(userId, userEmail, generatedTenantId, 'owner');
      await onTenantChange(generatedTenantId, true);
      
      setNewLicenceName('');
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
        `Join "${targetDetails.name}" workspace?\n\nThis will synchronize and share your reference parameters, company branding logo, and quotes database with members assigned to Key ${cleanKey}.`
      );
      if (!proceed) {
        setActionLoading(false);
        return;
      }

      await updateUserMembership(userId, userEmail, cleanKey, 'member');
      await onTenantChange(cleanKey, true);
      setJoinKey('');
      showToast(`Connected successfully to "${targetDetails.name}"!`, "success");
      if (isViren) loadAdminData();
    } catch (err) {
      console.error(err);
      showToast("Failed to link and join this licence.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Switch/Self upgrade client plan
  const handleSelectPlanSelf = async (planId: 'standard' | 'organization' | 'enterprise') => {
    if (!licenceDetails) return;
    if (tenantRole !== 'owner') {
      showToast("Only workspace owners are permitted to purchase or modify subscription models.", "warn");
      return;
    }
    
    setActionLoading(true);
    try {
      const updatedDetails: LicenceDetails = {
        ...licenceDetails,
        planId: planId,
        // Standard allows pricing calculator and saved quotes, organization/enterprise unlocks everything
        allowedModules: planId === 'standard' 
          ? ['rate_calc', 'quote_saving', 'quote_sharing', 'bag_price_stock', 'grain_inventory'] 
          : ['rate_calc', 'quote_saving', 'shipping_tracking', 'quote_sharing', 'pi_ci_generation', 'bag_price_stock', 'grain_inventory']
      };
      
      await saveLicenceDetails(updatedDetails);
      setLicenceDetails(updatedDetails);
      onUpdateLicenceMetadata(updatedDetails);
      showToast(`Subscription plan modified to: ${planId.toUpperCase()}!`, "success");
      
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
      showToast("File is too large! Please upload a signature or logo smaller than 700KB to optimize document rendering speeds.", "warn");
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast("Invalid file format. Please upload standard PNG, JPG, JPEG, or WEBP image formats.", "warn");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setLogoBase64(e.target.result as string);
        showToast("Company logo processed successfully! Preview is visible below. Save to commit.", "success");
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

  const handleClearLogoImage = () => {
    setLogoBase64('');
    showToast("Selected logo image has been cleared. Remember to save branding to persist changes.", "success");
  };

  const handleSaveCorporateBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenceDetails) {
      showToast("No active licence workspace to store logo settings.", "error");
      return;
    }
    setIsSavingBranding(true);
    try {
      const updatedDetails: LicenceDetails = {
        ...licenceDetails,
        logoText: logoText.trim(),
        logoBase64: logoBase64,
        industry: userIndustry
      };
      await saveLicenceDetails(updatedDetails);
      setLicenceDetails(updatedDetails);
      onUpdateLicenceMetadata(updatedDetails);
      showToast("Corporate logo, print branding, and industry settings updated successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Could not update branding configurations.", "error");
    } finally {
      setIsSavingBranding(false);
    }
  };

  // ADMIN PORTAL CONTROLLER HANDLERS (VNP VIREN CONTROL)
  const handleSelectLicenceForConfig = (lic: LicenceDetails) => {
    setSelectedLicenceId(lic.tenantId);
    setConfigApproved(lic.approved !== false);
    setConfigOtpEnabled(lic.otpEnabled || false);
    setConfigOtpMethod(lic.otpMethod || 'disabled');
    setConfigIndustry(lic.industry || 'grain');
    setConfigModules(lic.allowedModules || ['rate_calc', 'bag_price_stock', 'grain_inventory']);
    setConfigPlanId(lic.planId || 'standard');
    setConfigPlanPriceCustom(lic.planPriceCustom !== undefined ? lic.planPriceCustom.toString() : '');
    
    // Read limits or default to 0 (Unlimited)
    setConfigPiLimitDay(lic.piLimitDay !== undefined ? lic.piLimitDay.toString() : '0');
    setConfigPiLimitMonth(lic.piLimitMonth !== undefined ? lic.piLimitMonth.toString() : '0');
    setConfigPiLimitYear(lic.piLimitYear !== undefined ? lic.piLimitYear.toString() : '0');

    setConfigCiLimitDay(lic.ciLimitDay !== undefined ? lic.ciLimitDay.toString() : '0');
    setConfigCiLimitMonth(lic.ciLimitMonth !== undefined ? lic.ciLimitMonth.toString() : '0');
    setConfigCiLimitYear(lic.ciLimitYear !== undefined ? lic.ciLimitYear.toString() : '0');

    setConfigPlLimitDay(lic.plLimitDay !== undefined ? lic.plLimitDay.toString() : '0');
    setConfigPlLimitMonth(lic.plLimitMonth !== undefined ? lic.plLimitMonth.toString() : '0');
    setConfigPlLimitYear(lic.plLimitYear !== undefined ? lic.plLimitYear.toString() : '0');
  };

  const handleToggleModuleSelection = (modCode: string) => {
    if (configModules.includes(modCode)) {
      setConfigModules(configModules.filter(m => m !== modCode));
    } else {
      setConfigModules([...configModules, modCode]);
    }
  };

  const handleSaveAdminLicenceConfig = async () => {
    if (!selectedLicenceId) return;
    setActionLoading(true);
    try {
      const match = allLicences.find(l => l.tenantId === selectedLicenceId);
      if (!match) throw new Error("License not found in database.");

      const updatedPrice = configPlanPriceCustom.trim() !== '' ? parseFloat(configPlanPriceCustom) : undefined;

      const updated: LicenceDetails = {
        ...match,
        approved: configApproved,
        otpEnabled: configOtpMethod !== 'disabled',
        otpMethod: configOtpMethod,
        industry: configIndustry,
        allowedModules: configModules,
        planId: configPlanId,
        planPriceCustom: isNaN(updatedPrice as number) ? undefined : updatedPrice,
        
        // Parse and persist new limits (0 or invalid maps to undefined i.e. unlimited)
        piLimitDay: parseInt(configPiLimitDay) > 0 ? parseInt(configPiLimitDay) : undefined,
        piLimitMonth: parseInt(configPiLimitMonth) > 0 ? parseInt(configPiLimitMonth) : undefined,
        piLimitYear: parseInt(configPiLimitYear) > 0 ? parseInt(configPiLimitYear) : undefined,

        ciLimitDay: parseInt(configCiLimitDay) > 0 ? parseInt(configCiLimitDay) : undefined,
        ciLimitMonth: parseInt(configCiLimitMonth) > 0 ? parseInt(configCiLimitMonth) : undefined,
        ciLimitYear: parseInt(configCiLimitYear) > 0 ? parseInt(configCiLimitYear) : undefined,

        plLimitDay: parseInt(configPlLimitDay) > 0 ? parseInt(configPlLimitDay) : undefined,
        plLimitMonth: parseInt(configPlLimitMonth) > 0 ? parseInt(configPlLimitMonth) : undefined,
        plLimitYear: parseInt(configPlLimitYear) > 0 ? parseInt(configPlLimitYear) : undefined,
      };

      await saveLicenceDetails(updated);
      showToast(`Workspace properties persisted successfully for Key: ${selectedLicenceId}!`, "success");
      
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
  const currentPlanId = licenceDetails?.planId || 'standard';
  const currentPlan = PLANS.find(p => p.id === currentPlanId) || PLANS[0];
  const hasCustomPrice = licenceDetails?.planPriceCustom !== undefined;
  const currentPrice = hasCustomPrice ? (licenceDetails?.planPriceCustom ?? 0) : currentPlan.price;

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
            Manage your company profile settings, upload your corporate logo for A4 invoice embedding, inspect client pricing plans, 
            or configure independent secure login credentials.
          </p>
        </div>
      </div>

      {/* ADMIN CONTROL TOWER (Only visible for 'vnp.viren@gmail.com') */}
      {isViren && (
        <section className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-6 shadow-xl space-y-5" id="vnp-master-admin-control-tower">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="text-teal-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                <Settings2 className="w-4 h-4" /> MASTER CLOUD CONSOLE
              </div>
              <h3 className="text-lg font-black text-white mt-1 uppercase font-sans">
                VNP EXPORTER SUITE ADMIN CARD
              </h3>
            </div>
            
            <button
              onClick={loadAdminData}
              disabled={adminLoading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin text-teal-400' : ''}`} />
              <span>Refresh Accounts</span>
            </button>
          </div>

          {/* Admin sub-tabs switcher */}
          <div className="flex border-b border-slate-800 gap-4 pb-1">
            <button
              onClick={() => setAdminSubTab('workspaces')}
              className={`pb-2.5 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 cursor-pointer ${
                adminSubTab === 'workspaces' ? 'border-teal-400 text-teal-400 font-black' : 'border-transparent text-slate-400 hover:text-slate-205'
              }`}
            >
              💼 Client Workspaces ({allLicences.length})
            </button>
            <button
              onClick={() => setAdminSubTab('logins')}
              className={`pb-2.5 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 cursor-pointer ${
                adminSubTab === 'logins' ? 'border-teal-400 text-teal-400 font-black' : 'border-transparent text-slate-400 hover:text-slate-250'
              }`}
            >
              🕒 Exporter Logins ({allLogins.length})
            </button>
            <button
              onClick={() => setAdminSubTab('docs')}
              className={`pb-2.5 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 cursor-pointer ${
                adminSubTab === 'docs' ? 'border-teal-400 text-teal-400 font-black' : 'border-transparent text-slate-400 hover:text-slate-250'
              }`}
            >
              📄 Document Generations ({allDocLogs.length})
            </button>
            <button
              onClick={() => setAdminSubTab('companies')}
              className={`pb-2.5 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 cursor-pointer ${
                adminSubTab === 'companies' ? 'border-teal-400 text-teal-400 font-black' : 'border-transparent text-slate-400 hover:text-slate-250'
              }`}
            >
              🏢 Dual Companies ({allMemberships.filter(m => (m.companyAName && !m.companyAApproved) || (m.companyBName && !m.companyBApproved)).length})
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Manage user workspaces, approve client exporter logins, change active industry modes, authorize module directories, 
            or configure <strong className="text-teal-400">dynamic monthly pricing overrides & document generation limits (caps)</strong> per workspace.
          </p>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-2">
            {adminSubTab === 'workspaces' ? (
              <>
                {/* Active Tenants List (2 columns wide in XL) */}
                <div className="xl:col-span-2 space-y-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Workspace Client Registrations ({allLicences.length})
                  </span>

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                    {adminLoading && allLicences.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500 italic">Querying cloud registry...</div>
                    ) : allLicences.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500 italic">No workspace licenses registered in database.</div>
                    ) : (
                      allLicences.map(lic => {
                        const isEdited = selectedLicenceId === lic.tenantId;
                        const members = allMemberships.filter(m => m.tenantId === lic.tenantId);
                        
                        const licPlanId = lic.planId || 'standard';
                        const licPlan = PLANS.find(p => p.id === licPlanId) || PLANS[0];
                        const customPr = lic.planPriceCustom;
                        
                        return (
                          <div
                            key={lic.tenantId}
                            onClick={() => handleSelectLicenceForConfig(lic)}
                            className={`p-3.5 rounded-2xl border text-left transition duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isEdited 
                                ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md shadow-indigo-500/5' 
                                : 'bg-slate-950/80 hover:bg-slate-850/60 border-slate-800/80'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-xs text-white uppercase font-sans">{lic.name}</span>
                                <span className="font-mono text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                  {lic.tenantId}
                                </span>
                                <span className="text-[9px] bg-teal-950/80 border border-teal-850 text-teal-400 uppercase font-black px-1.5 py-0.2 rounded">
                                  {licPlanId.toUpperCase()}
                                </span>
                                <span className="text-[9px] font-mono font-bold text-amber-405">
                                  ${customPr !== undefined ? customPr : licPlan.price}/mo
                                </span>
                              </div>

                              <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
                                <div>Owner: <span className="text-slate-300 font-bold">{lic.ownerEmail || 'Unknown'}</span></div>
                                <div className="flex gap-2 text-slate-500 mt-1 flex-wrap">
                                  <span>Members: {members.length} active</span>
                                  <span>•</span>
                                  <span className="capitalize text-teal-400">Industry: {lic.industry || 'grain'}</span>
                                  {lic.logoBase64 && (
                                    <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                                      <span>•</span> 🖼️ Logo set
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 sm:self-center shrink-0">
                              {/* Module tags */}
                              <div className="hidden md:flex gap-1">
                                {lic.allowedModules?.map(item => (
                                  <span key={item} className="text-[8px] bg-slate-900 border border-slate-850 px-1 py-0.5 text-slate-505 rounded lowercase">
                                    {item.replace('_', ' ')}
                                  </span>
                                )) || <span className="text-[8px] text-amber-500">all</span>}
                              </div>

                              <div className="flex flex-col items-end gap-1.5">
                                {/* Status and custom check flags */}
                                <div className="flex items-center gap-1.5">
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
                                      showToast(`Switched active workspace session to Key: ${lic.tenantId}!`, "success");
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
                <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4.5 space-y-4 h-fit text-slate-100 max-h-[600px] overflow-y-auto">
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
                        <div className="text-[9px] uppercase text-slate-500 font-bold">Configure Workspace Details</div>
                        <div className="text-xs font-black text-white tracking-wide font-mono break-all">
                          {selectedLicenceId}
                        </div>
                        <div className="text-[10px] text-teal-300 truncate font-semibold">
                          {allLicences.find(l => l.tenantId === selectedLicenceId)?.name}
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
                                ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md' 
                                : 'bg-slate-900 text-slate-400 border-slate-850'
                            }`}
                          >
                            APPROVED
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfigApproved(false)}
                            className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg transition-all border cursor-pointer ${
                              !configApproved 
                                ? 'bg-rose-600 text-white border-rose-500 shadow-md' 
                                : 'bg-slate-900 text-slate-400 border-slate-850'
                            }`}
                          >
                            PENDING
                          </button>
                        </div>
                      </div>

                      {/* 2. Choose Subscription Plan */}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-455 tracking-wider block">
                          Active Subscription Plan
                        </label>
                        <select
                          value={configPlanId}
                          onChange={(e) => {
                            const pid = e.target.value as any;
                            setConfigPlanId(pid);
                            // Auto-assign corresponding modules for convenience
                            if (pid === 'standard') {
                              setConfigModules(['rate_calc', 'quote_saving', 'quote_sharing', 'bag_price_stock']);
                            } else {
                              setConfigModules(['rate_calc', 'quote_saving', 'shipping_tracking', 'quote_sharing', 'pi_ci_generation', 'bag_price_stock']);
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-800 text-white text-xs px-2 py-2 rounded-xl font-bold font-sans tracking-wide outline-none focus:border-teal-500 cursor-pointer"
                        >
                          <option value="standard">Standard Plan ($29/mo)</option>
                          <option value="organization">Organization Plan ($59/mo)</option>
                          <option value="enterprise">Enterprise Plan ($119/mo)</option>
                        </select>
                      </div>

                      {/* 3. Decide Custom Price Overwrite */}
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-[9px] uppercase font-bold text-slate-455 tracking-wider block">
                            Admin custom loyalty price ($)
                          </label>
                          <span className="text-[8px] text-teal-405 font-bold italic">Bypasses standard peg</span>
                        </div>
                        <div className="relative flex items-center">
                          <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-2.5" />
                          <input
                            type="number"
                            placeholder="Default Plan Price"
                            value={configPlanPriceCustom}
                            onChange={(e) => setConfigPlanPriceCustom(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 pl-7 pr-3 py-2 text-xs font-mono font-bold text-white rounded-xl focus:border-teal-505 outline-none"
                          />
                        </div>
                        <span className="text-[8.5px] text-slate-500 leading-normal block">
                          Leave blank to use the standard Loyalty rate of the selected plan.
                        </span>
                      </div>

                      {/* 4. Industry Mode selection */}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
                          Industry Model Preset (Landing Dashboard Category)
                        </label>
                        <select
                          value={configIndustry}
                          onChange={(e) => setConfigIndustry(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 text-white text-xs px-2 py-2 rounded-xl font-bold outline-none font-sans focus:border-teal-500 cursor-pointer"
                        >
                          <option value="grain">🌾 Grain / Rice Export Board</option>
                          <option value="spices">🌶️ Spices Export Board</option>
                          <option value="chemicals">🧪 Chemical & Industrial Board</option>
                          <option value="salts">🧂 Salts & Minerals Board</option>
                          <option value="vegetables_fruits">🥦 Vegetables & Fruits Board</option>
                          <option value="tiles">🧱 Ceramic Tiles Board</option>
                          <option value="generic">📦 Generic Products & Freight</option>
                        </select>
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
                            setConfigOtpEnabled(m !== 'disabled');
                          }}
                          className="w-full bg-slate-900 border border-slate-800 text-white text-xs px-2 py-2 rounded-xl font-bold outline-none font-sans focus:border-teal-500 cursor-pointer"
                        >
                          <option value="disabled">🚫 Standard Login (Disable OTP)</option>
                          <option value="email">📧 Email OTP Security Code</option>
                          <option value="whatsapp">💬 WhatsApp Mobile OTP Code</option>
                        </select>
                      </div>

                      {/* Document Generation Caps Inputs */}
                      <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl space-y-3.5">
                        <div className="text-[10px] uppercase font-bold text-teal-400 tracking-wide flex items-center gap-1 font-sans">
                          <Activity className="w-3.5 h-3.5 text-teal-400" /> Dynamic Generation Limits
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[9px] uppercase text-indigo-300 font-bold block">📄 PROFORMA INVOICES (PI) CAPS</div>
                          <div className="grid grid-cols-3 gap-1.5 font-mono">
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">DAY</label>
                              <input
                                type="number"
                                value={configPiLimitDay}
                                onChange={(e) => setConfigPiLimitDay(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">MONTH</label>
                              <input
                                type="number"
                                value={configPiLimitMonth}
                                onChange={(e) => setConfigPiLimitMonth(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">YEAR</label>
                              <input
                                type="number"
                                value={configPiLimitYear}
                                onChange={(e) => setConfigPiLimitYear(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[9px] uppercase text-indigo-300 font-bold block">💳 COMMERCIAL INVOICES (CI) CAPS</div>
                          <div className="grid grid-cols-3 gap-1.5 font-mono">
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">DAY</label>
                              <input
                                type="number"
                                value={configCiLimitDay}
                                onChange={(e) => setConfigCiLimitDay(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">MONTH</label>
                              <input
                                type="number"
                                value={configCiLimitMonth}
                                onChange={(e) => setConfigCiLimitMonth(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">YEAR</label>
                              <input
                                type="number"
                                value={configCiLimitYear}
                                onChange={(e) => setConfigCiLimitYear(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[9px] uppercase text-indigo-300 font-bold block">📦 PACKING LISTS (PL) CAPS</div>
                          <div className="grid grid-cols-3 gap-1.5 font-mono">
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">DAY</label>
                              <input
                                type="number"
                                value={configPlLimitDay}
                                onChange={(e) => setConfigPlLimitDay(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">MONTH</label>
                              <input
                                type="number"
                                value={configPlLimitMonth}
                                onChange={(e) => setConfigPlLimitMonth(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] uppercase font-extrabold text-slate-500 block">YEAR</label>
                              <input
                                type="number"
                                value={configPlLimitYear}
                                onChange={(e) => setConfigPlLimitYear(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded py-1 px-1.5 text-center text-xs text-white"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                        <span className="text-[8px] text-slate-505 block italic">
                          Type 0 or leave blank to grant unrestricted generation rights for active workspace session.
                        </span>
                      </div>

                      {/* 6. Plan Modules Permissions */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
                          Fitted Feature Modules
                        </label>
                        
                        <div className="space-y-1.5 bg-slate-900 border border-slate-850 p-2.5 rounded-xl max-h-40 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => handleToggleModuleSelection('rate_calc')}
                            className="flex items-center gap-2 text-left w-full text-[11px] text-slate-300 font-bold"
                          >
                            {configModules.includes('rate_calc') ? (
                              <CheckSquare className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                            <span>FCL Rate & Weight Calculator</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleModuleSelection('quote_saving')}
                            className="flex items-center gap-2 text-left w-full text-[11px] text-slate-300 font-bold"
                          >
                            {configModules.includes('quote_saving') ? (
                              <CheckSquare className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                            <span>Quotation History Board</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleModuleSelection('shipping_tracking')}
                            className="flex items-center gap-2 text-left w-full text-[11px] text-slate-300 font-bold"
                          >
                            {configModules.includes('shipping_tracking') ? (
                              <CheckSquare className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                            <span>Location & Maritime BL Tracking</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleModuleSelection('quote_sharing')}
                            className="flex items-center gap-2 text-left w-full text-[11px] text-slate-300 font-bold"
                          >
                            {configModules.includes('quote_sharing') ? (
                              <CheckSquare className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                            <span>Outbound PDF Share Hub</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleModuleSelection('pi_ci_generation')}
                            className="flex items-center gap-2 text-left w-full text-[11px] text-slate-300 font-bold"
                          >
                            {configModules.includes('pi_ci_generation') ? (
                              <CheckSquare className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                            <span>PI & CI Document Editor</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleModuleSelection('bag_price_stock')}
                            className="flex items-center gap-2 text-left w-full text-[11px] text-slate-300 font-bold"
                          >
                            {configModules.includes('bag_price_stock') ? (
                              <CheckSquare className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                            <span>Bag Price & Stock Manager</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleModuleSelection('grain_inventory')}
                            className="flex items-center gap-2 text-left w-full text-[11px] text-slate-300 font-bold"
                          >
                            {configModules.includes('grain_inventory') ? (
                              <CheckSquare className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                            <span>Milling Yields & Grain Inventory</span>
                          </button>
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
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-500 italic px-4 leading-normal">
                      Click on any client's workspace name in the list to configure subscription plans, override monthly prices, or verify module directory limits.
                    </div>
                  )}
                </div>
              </>
            ) : adminSubTab === 'logins' ? (
              <div className="xl:col-span-3 space-y-3.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  SECURITY AUDIT: EXPORTER RECENT LOGIN HISTORY ({allLogins.length} ENTRIES)
                </span>
                <div className="bg-slate-950/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-300 font-sans border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-404 border-b border-slate-800 font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10">
                          <th className="p-4">Login Time Date</th>
                          <th className="p-4">Email Account</th>
                          <th className="p-4">User UID / Identifier</th>
                          <th className="p-4">Lease Workspace Key</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {allLogins.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500 italic">No user logins recorded yet.</td>
                          </tr>
                        ) : (
                          [...allLogins]
                            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map((log) => (
                              <tr key={log.id} className="hover:bg-slate-900/40 transition font-mono">
                                <td className="p-4 text-slate-300 font-sans select-none">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="p-4 text-teal-400 font-extrabold font-sans lowercase select-all">{log.email || 'N/A'}</td>
                                <td className="p-4 text-slate-500 text-[10px] select-all">{log.userId}</td>
                                <td className="p-4 text-sky-400 font-bold select-all">{log.tenantId}</td>
                                <td className="p-4 font-sans font-bold">
                                  <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 rounded-full uppercase">
                                    ● Handshake OK
                                  </span>
                                </td>
                              </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : adminSubTab === 'docs' ? (
              <div className="xl:col-span-3 space-y-3.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  CAPPED USAGE: PI / CI / PL DOCUMENT GENERATION TRACKER ({allDocLogs.length} GENERATIONS)
                </span>
                <div className="bg-slate-950/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-300 font-sans border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-404 border-b border-slate-800 font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10">
                          <th className="p-4">Generation Dispatch Time</th>
                          <th className="p-4">Workspace key</th>
                          <th className="p-4">User uid</th>
                          <th className="p-4">Document type</th>
                          <th className="p-4">Reference Identity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {allDocLogs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500 italic">No document generations recorded yet in this cycle.</td>
                          </tr>
                        ) : (
                          [...allDocLogs]
                            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map((log) => (
                              <tr key={log.id} className="hover:bg-slate-900/40 transition font-mono">
                                <td className="p-4 text-slate-300 font-sans select-none">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="p-4 text-sky-450 font-bold select-all">{log.tenantId}</td>
                                <td className="p-4 text-slate-500 text-[10px] select-all">{log.userId}</td>
                                <td className="p-4 uppercase font-bold">
                                  <span className={`px-2.5 py-0.5 text-[9px] rounded-full uppercase ${
                                    log.docType === 'pi' ? 'bg-blue-950/50 text-blue-400 border border-blue-900' :
                                    log.docType === 'ci' ? 'bg-violet-950/50 text-violet-400 border border-violet-900' :
                                    'bg-emerald-950/50 text-emerald-400 border border-emerald-900'
                                  }`}>
                                    {log.docType}
                                  </span>
                                </td>
                                <td className="p-4 text-teal-400 font-extrabold select-all">{log.ref}</td>
                              </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : adminSubTab === 'companies' ? (
              <div className="xl:col-span-3 space-y-3.5 text-slate-300 font-sans">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  MULTI-COMPANY DUAL EXPORTER REQUEST APPROVAL DESK ({allMemberships.filter(m => m.companyAName || m.companyBName).length} ACCOUNTS CONFIGURED)
                </span>
                <div className="bg-slate-950/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-300 font-sans border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10">
                          <th className="p-4 bg-slate-950">User Account Email</th>
                          <th className="p-4 bg-slate-950">Company Option 1 Name & Tenant ID</th>
                          <th className="p-4 bg-slate-950">Option 1 Status</th>
                          <th className="p-4 bg-slate-950">Company Option 2 Name & Tenant ID</th>
                          <th className="p-4 bg-slate-950">Option 2 Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {allMemberships.filter(m => m.companyAName || m.companyBName).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500 italic">No users have configured sub-companies yet.</td>
                          </tr>
                        ) : (
                          allMemberships.filter(m => m.companyAName || m.companyBName).map((mem) => (
                            <tr key={mem.userId} className="hover:bg-slate-900/40 transition">
                              <td className="p-4 font-semibold text-slate-200 select-all">
                                {mem.userEmail || "Anonymous"}
                                <div className="text-[9px] text-slate-500 mt-0.5 select-all">Uid: {mem.userId}</div>
                              </td>
                              <td className="p-4 font-medium text-slate-300 select-all">
                                {mem.companyAName ? (
                                  <>
                                    <div className="text-white font-bold">{mem.companyAName}</div>
                                    <div className="text-[10px] text-indigo-400 font-mono mt-0.5">{mem.companyATenantId}</div>
                                  </>
                                ) : (
                                  <span className="text-slate-500 italic">Not set</span>
                                )}
                              </td>
                              <td className="p-4">
                                {mem.companyAName && (
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                                      mem.companyAApproved ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-rose-950 text-rose-400 border border-rose-900'
                                    }`}>
                                      {mem.companyAApproved ? "Approved" : "Pending"}
                                    </span>
                                    <button
                                      onClick={() => handleApproveDualCompany(mem.userId, 'A', !mem.companyAApproved)}
                                      className={`px-2 py-1 rounded text-[9.5px] font-bold uppercase transition cursor-pointer ${
                                        mem.companyAApproved ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-teal-550 text-slate-950 hover:bg-teal-400 font-black'
                                      }`}
                                    >
                                      {mem.companyAApproved ? "Revoke" : "Approve"}
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="p-4 font-medium text-slate-300 select-all">
                                {mem.companyBName ? (
                                  <>
                                    <div className="text-white font-bold">{mem.companyBName}</div>
                                    <div className="text-[10px] text-indigo-400 font-mono mt-0.5">{mem.companyBTenantId}</div>
                                  </>
                                ) : (
                                  <span className="text-slate-500 italic">Not set</span>
                                )}
                              </td>
                              <td className="p-4">
                                {mem.companyBName && (
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                                      mem.companyBApproved ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-rose-950 text-rose-400 border border-rose-900'
                                    }`}>
                                      {mem.companyBApproved ? "Approved" : "Pending"}
                                    </span>
                                    <button
                                      onClick={() => handleApproveDualCompany(mem.userId, 'B', !mem.companyBApproved)}
                                      className={`px-2 py-1 rounded text-[9.5px] font-bold uppercase transition cursor-pointer ${
                                        mem.companyBApproved ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-teal-550 text-slate-950 hover:bg-teal-400 font-black'
                                      }`}
                                    >
                                      {mem.companyBApproved ? "Revoke" : "Approve"}
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
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
          <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-xs space-y-6">
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
                className="text-gray-400 hover:text-gray-650 p-2 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                title="Refresh workspace variables"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Licence Info Block */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-450 uppercase tracking-widest block mb-1">
                    Licence / Export Entity Name
                  </label>
                  {isEditingName ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="flex-1 text-sm bg-gray-50 border border-gray-300 focus:border-teal-650 focus:ring-1 focus:ring-teal-650 rounded-xl px-3 py-1.5 font-bold transition outline-hidden"
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
                        onClick={() => { setIsEditingName(false); setEditedName(licenceDetails?.name || ''); }}
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
                      {tenantRole === 'owner' && (
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
                  <label className="text-[10px] font-bold text-gray-450 uppercase tracking-widest block mb-1">
                    Your Workspace Role
                  </label>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-extrabold uppercase rounded-full ${
                    tenantRole === 'owner' 
                      ? 'bg-amber-50 border border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border border-emerald-250 text-emerald-850'
                  }`}>
                    <Users className="w-3 h-3" />
                    <span>{tenantRole}</span>
                  </span>
                </div>
              </div>

              {/* License Key & Share Box */}
              <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 flex flex-col justify-between space-y-2">
                <div>
                  <label className="text-[10px] font-black text-gray-450 uppercase tracking-wider block mb-1">
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
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Key'}</span>
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
                  <span className="text-gray-400 block pb-0.5 uppercase text-[9px] font-bold">Workspace Mode:</span>
                  <span className="text-gray-800 font-bold uppercase block text-xs tracking-wide truncate">
                    🌾 {licenceDetails?.industry || 'grain'} BOARD
                  </span>
                </div>
                <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block pb-0.5 uppercase text-[9px] font-bold">Active Subscribed Plan:</span>
                  <span className="text-indigo-700 font-extrabold block text-xs uppercase truncate">
                    ⭐ {currentPlan.name}
                  </span>
                </div>
                <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block pb-0.5 uppercase text-[9px] font-bold">Billing lease cost:</span>
                  {hasCustomPrice ? (
                    <span className="text-amber-600 font-bold block text-xs">
                      ${currentPrice}/mo <span className="text-[8px] text-slate-400 italic font-medium">(Custom Admin Peak)</span>
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
          <div className="bg-white border border-gray-255 rounded-3xl p-6 shadow-xs space-y-5" id="multi-company-registration-workspace">
            <div>
              <h3 className="text-xs uppercase font-black tracking-wider text-blue-950 flex items-center gap-1.5 font-sans">
                <Building className="w-4.5 h-4.5 text-indigo-650" />
                <span>Dual Exporter Company Configuration</span>
              </h3>
              <p className="text-[11px] text-gray-400 leading-normal mt-1 font-sans">
                Manage multiple companies within your single user workspace account. 
                Enter the names of the two companies you wish to operate. Once approved by the administrator, 
                you will be able to switch between companies instantly from the top-level UI bar.
              </p>
            </div>

            <form onSubmit={handleRegisterSubCompanies} className="space-y-4 font-sans text-xs">
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
                    className="w-full bg-white border border-gray-250 text-gray-800 text-xs px-3 py-2.5 rounded-xl font-medium outline-none focus:border-teal-500"
                  />
                  {userMembership?.companyATenantId && (
                    <div className="text-[9px] font-mono text-gray-400 mt-1">
                      ID: <span className="text-indigo-600 font-semibold">{userMembership.companyATenantId}</span>
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
                    className="w-full bg-white border border-gray-250 text-gray-800 text-xs px-3 py-2.5 rounded-xl font-medium outline-none focus:border-teal-500"
                  />
                  {userMembership?.companyBTenantId && (
                    <div className="text-[9px] font-mono text-gray-400 mt-1">
                      ID: <span className="text-indigo-600 font-semibold">{userMembership.companyBTenantId}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isCompSubmitting}
                  className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isCompSubmitting ? "Submitting..." : "Submit Company Names"}
                </button>
              </div>
            </form>
          </div>

          {/* DRAG AND DROP COMPANY LOGO / CUSTOM PRINT BRAND CARDS - NEW COMPONENT */}
          <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-xs space-y-5" id="corporate-logo-editor-workspace">
            <div>
              <h3 className="text-xs uppercase font-black tracking-wider text-blue-950 flex items-center gap-1.5 font-sans">
                <Building className="w-4.5 h-4.5 text-teal-600" />
                <span>CORPORATE PRINT BRANDING & COMPANY LOGO MANAGER</span>
              </h3>
              <p className="text-[11px] text-gray-400 leading-normal mt-1">
                Configure your official company lettering and upload a high-contrast corporate logo. 
                This branding is securely synchronized across the workspace so <span className="font-bold text-teal-600">all printed documents (Quotes, Proformas, Commercial Invoices, and Packing Lists)</span> will display your logo!
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
                      className="w-full text-xs font-bold bg-gray-50 hover:bg-gray-100/50 border border-gray-250 focus:border-teal-550 rounded-xl px-3 py-2.5 transition outline-hidden"
                    />
                    <span className="text-[9.5px] text-gray-400 leading-tight block mt-1 leading-normal">
                      Used as premium display text top headers when no custom logo image is uploaded.
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Active Workspace Industry Mode
                    </label>
                    <select
                      value={userIndustry}
                      onChange={(e) => setUserIndustry(e.target.value as any)}
                      className="w-full text-xs font-bold bg-gray-50 hover:bg-gray-100/50 border border-gray-250 focus:border-teal-550 rounded-xl px-3 py-2.5 transition outline-none cursor-pointer"
                    >
                      <option value="grain">🌾 Grain & Rice Export Preset</option>
                      <option value="vegetables_fruits">🥦 Vegetables & Fruits Export Preset</option>
                      <option value="spices">🌶️ Spices Export Preset</option>
                      <option value="chemicals">🧪 Chemical & Industrial Preset</option>
                      <option value="salts">🧂 Salts & Minerals Preset</option>
                      <option value="tiles">🧱 Ceramic Tiles Export Preset</option>
                      <option value="generic">📦 Generic Products & Freight</option>
                    </select>
                    <span className="text-[9.5px] text-gray-400 leading-tight block mt-1 leading-normal font-sans">
                      Changes layout configurations, metric parameters, and packaging selections across all modules.
                    </span>
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
                          ? 'border-teal-500 bg-teal-50/50' 
                          : logoBase64 
                            ? 'border-dashed border-emerald-450 bg-emerald-50/10' 
                            : 'border-slate-300 hover:border-teal-450 bg-slate-50/30'
                      }`}
                    >
                      <input
                        type="file"
                        id="brand-logo-file-input"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      
                      <Upload className={`w-8 h-8 mb-2 ${logoBase64 ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                      
                      <div className="text-xs font-bold text-slate-700">
                        {logoBase64 ? 'Change Company Logo' : 'Drag & Drop company image here'}
                      </div>
                      <div className="text-[9.5px] text-slate-400 mt-1">
                        Supports PNG, JPG, or WEBP formats (Max 700 KB)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Document Print Header live mock simulator */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="text-[9.5px] uppercase font-bold text-slate-450 tracking-wider flex items-center justify-between border-b pb-1">
                    <span>A4 Document Brand Header Mock</span>
                    <span className="text-emerald-600 font-extrabold tracking-wide uppercase text-[8.5px]">Live Preview</span>
                  </div>

                  <div className="p-4 bg-white border border-gray-300/80 rounded-xl flex flex-col items-center justify-center min-h-[110px] mt-2 shadow-inner text-center">
                    {logoBase64 ? (
                      <div className="space-y-2 w-full flex flex-col items-center">
                        <img 
                          src={logoBase64} 
                          alt="Company Logo Preview" 
                          referrerPolicy="no-referrer"
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
                        <div className="text-[8px] font-mono text-slate-400">FALLBACK BRAND HEADER TEXT PRINTED</div>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-[9px] text-slate-450 leading-relaxed italic">
                    All exported PDF contracts and matching compliance invoices will directly render the mock headers displayed above. This ensures consistent professional aesthetics.
                  </div>
                </div>

              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSavingBranding || actionLoading}
                  className="px-5 py-2.5 bg-teal-650 hover:bg-teal-700 disabled:bg-slate-350 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isSavingBranding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
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
              To invite associates, exporters, or freight partners to share your active billing workspace and print with the same layout, have them follow this guide:
            </p>

            <div className="space-y-3.5 pt-1">
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-mono">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 uppercase">Share Your Workspace Key</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Copy and share your secret billing key <strong className="text-indigo-700 font-mono select-all bg-white p-0.5 rounded border border-gray-150">{activeTenantId}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-mono">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 uppercase">Input the Tenant Code</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Instruct counterparties to paste this key in their join command box down below.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-mono">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 uppercase">Enjoy Coordinated Printing</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed text-slate-600">
                    All created quotes, Proforma invoices, and logo brand models instantly sync across both laptops!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="bg-indigo-950 text-white/90 p-3.5 rounded-2xl border border-indigo-900 text-[10.5px] leading-relaxed relative overflow-hidden">
                <div className="font-bold uppercase text-[9px] text-teal-400 block mb-1">🛡️ Multi-Tenant Shield</div>
                Your proprietary rate board tables, customer emails, custom container weights, and invoice registers are isolated on hardware silos. Outside groups cannot view or intercept files.
              </div>
            </div>

          </div>

          <div className="border-t border-indigo-100 pt-4 text-[10.5px] text-slate-500 leading-normal">
            <div className="flex items-start gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>Commercial metadata is isolated at firestore rules to assure total compliance.</span>
            </div>
          </div>
        </div>

      </div>

      {/* RENDER DYNAMIC PRICING AND PLANS GRID SECTION - BASED ON SHIPZY MODEL */}
      <section className="bg-white border border-gray-250 rounded-3xl p-6 shadow-xs space-y-6" id="exporter-subscription-plans-grid">
        <div className="text-center max-w-xl mx-auto space-y-1.5 pb-2">
          <div className="text-teal-650 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1">
            <Award className="w-3.5 h-3.5" /> CHOOSE YOUR ACTIVE EXPORT LEASE
          </div>
          <h3 className="text-xl font-black text-blue-950 uppercase tracking-tight font-sans">
            EXPORTER POWER PACK PLANS
          </h3>
          <p className="text-xs text-gray-450 leading-relaxed">
            All prices fall under our fair use and volume policy. Ensure your team selects the model best aligned to your annual freight documents metrics.
          </p>
        </div>

        {/* Dynamic Partner Badge if there is a customized Admin pricing override */}
        {hasCustomPrice && (
          <div className="max-w-md mx-auto bg-amber-50 border border-amber-250 p-4 rounded-2xl flex items-start gap-3 shadow-inner">
            <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="space-y-0.5 text-xs">
              <span className="font-black text-amber-805 uppercase block">Custom Admin Price Verified!</span>
              <p className="text-[11px] text-amber-700 leading-normal">
                VNP Viren has set a custom preferred parner rate for your workspace matching <strong className="text-indigo-900">${licenceDetails?.planPriceCustom}/mo</strong>. 
                Any self-service plan changes will maintain this custom pricing override.
              </p>
            </div>
          </div>
        )}

        {/* Pristine visual pricing grid cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1 max-w-6xl mx-auto">
          {PLANS.map(plan => {
            const isPlanActive = currentPlanId === plan.id;
            
            // Adjust the displayed price based on active custom overrides
            const isThisPlanOverridden = isPlanActive && hasCustomPrice;
            const displayPrice = isThisPlanOverridden ? currentPrice : plan.price;
            
            return (
              <div 
                key={plan.id}
                className={`rounded-2xl border transition duration-300 relative overflow-hidden flex flex-col justify-between ${
                  isPlanActive 
                    ? 'border-indigo-600 bg-gradient-to-b from-indigo-50/20 to-white shadow-lg ring-1 ring-indigo-600 scale-[1.01]' 
                    : 'border-slate-200 bg-white hover:border-slate-350 shadow-xs'
                }`}
              >
                {/* Visual Popular Banner Badge of the selected standard */}
                {plan.id === 'enterprise' && (
                  <div className="bg-indigo-600 text-white font-black text-[9px] uppercase tracking-wider py-1 text-center font-sans tracking-widest">
                    ⭐ RECOMMENDED FOR LARGE MILLS ⭐
                  </div>
                )}
                
                {plan.id !== 'enterprise' && plan.badge && (
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
                        ${displayPrice}
                      </span>
                      <span className="text-xs text-slate-400 font-bold"> / mo</span>
                    </div>

                    <span className="text-[9.5px] text-slate-400 block uppercase font-mono font-medium">Billed month-to-month</span>
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
                    <div className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-850 font-black text-[10px] uppercase tracking-widest rounded-xl text-center flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Active Subscription</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading || tenantRole !== 'owner'}
                      onClick={() => handleSelectPlanSelf(plan.id)}
                      className={`w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-center transition cursor-pointer ${
                        tenantRole !== 'owner'
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                      }`}
                      title={tenantRole !== 'owner' ? "Only workspace owners can alter subscriptions" : `Select ${plan.name}`}
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

      {/* JOIN AND CREATE FORMS CONTAINERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* JOIN AN EXISTING LICENCE CONTAINER */}
        <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-blue-950 font-extrabold text-xs uppercase tracking-wider border-b border-gray-100 pb-3">
            <Users className="w-4 h-4 text-teal-600" />
            <span>Join Existing Corporate Lease</span>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed leading-normal">
            Enter the active code key shared by your manager to link your device parameters. 
            <span className="text-red-500 font-semibold font-sans"> Warning:</span> Connecting will disconnect you from your current workspace.
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
                className="w-full text-xs font-mono font-bold bg-gray-50 hover:bg-gray-100/50 border border-gray-300 focus:border-teal-650 rounded-xl px-3.5 py-3 transition outline-hidden uppercase tracking-widest"
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
        <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-blue-950 font-extrabold text-xs uppercase tracking-wider border-b border-gray-100 pb-3">
            <PlusCircle className="w-4 h-4 text-indigo-500" />
            <span>Register New Independent Licence</span>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed leading-normal">
            Specify your export corporate name to generate an independent business licence key under sandboxed Firestore isolation layers. You acquire owner security clearance.
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
                className="w-full text-xs font-bold bg-gray-50 hover:bg-gray-100/50 border border-gray-300 focus:border-teal-650 rounded-xl px-3.5 py-3 transition outline-hidden uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl transition cursor-pointer shadow-xs text-center flex items-center justify-center gap-2"
            >
              <span>Generate New Independent Key</span>
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
