import React, { useState, useEffect, useRef } from 'react';
import { loadInitialState, saveLS } from './storage';
import { INITIAL_COMMODITIES, INITIAL_BAGS, INITIAL_BAG_STOCK, INITIAL_RATES, INITIAL_CFS_ITEMS, INITIAL_LINE_ITEMS, INITIAL_DOHA_IMPORT } from './constants';
import { RateRow, BagPrices, BagStockItem, ExpenseItem, DohaImportData, SavedQuote, GrainInventoryItem, InventoryOrder } from './types';

// Firebase Setup & Services
import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  getOrCreateUserMembership, getTenantProfile, saveTenantProfile, 
  getTenantQuotes, saveTenantQuote, deleteTenantQuote, 
  UserProfileData, getLicenceDetails, logUserLogin, subscribeToLicenceDetails,
  updateUserMembership, subscribeToUserMembership, updateMembershipSubCompanies,
  saveLicenceDetails
} from './services/db';

import LicenceManager from './components/LicenceManager';
import OtpSecurityGate from './components/OtpSecurityGate';
import { Lock, Building } from 'lucide-react';

// Components
import Sidebar from './components/Sidebar';
import RateCalculator from './components/RateCalculator';
import RateListBoard from './components/RateListBoard';
import BagPriceAndStock from './components/BagPriceAndStock';
import CfsTransport from './components/CfsTransport';
import DohaImport from './components/DohaImport';
import QuoteSheet from './components/QuoteSheet';
import SavedQuotes from './components/SavedQuotes';
import Settings from './components/Settings';
import DocumentWorkspace from './components/DocumentWorkspace';
import AuthScreen from './components/AuthScreen';
import LandingPage from './components/LandingPage';
import InventoryManager from './components/InventoryManager';
import ContainerTracker from './components/ContainerTracker';
import VesselScheduleExplorer from './components/VesselScheduleExplorer';

export default function App() {
  const state = loadInitialState();

  // Authentication State Managers
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbInitialized, setDbInitialized] = useState(false);
  
  // Public Landing / Client Portal Marketing Site Toggle
  const [showMarketing, setShowMarketing] = useState(true);

  // Tenant / Licence State Managers
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [activeTenantName, setActiveTenantName] = useState<string>('Personal Licence');
  const [tenantRole, setTenantRole] = useState<'owner' | 'member'>('owner');
  const [licenceMetadata, setLicenceMetadata] = useState<any>(null);
  const [userMembership, setUserMembership] = useState<any>(null);
  const [otpVerified, setOtpVerified] = useState<boolean>(false);

  // Active Screen / Tab
  const [activeTab, setActiveTab] = useState('calc');
  const [sidebarPinned, setSidebarPinned] = useState(true);

  // Workspace focus state managers
  const [workspaceActive, setWorkspaceActive] = useState(false);
  const [workspaceQuoteId, setWorkspaceQuoteId] = useState<number | null>(null);
  const [workspaceDocType, setWorkspaceDocType] = useState<'pi' | 'ci' | 'pl'>('pi');
  const [backfillItem, setBackfillItem] = useState<{ quoteId: number; itemIndex: number; data: any } | null>(null);

  // Vessel lookup standalone tab
  const [vesselLookupActive, setVesselLookupActive] = useState(false);
  const [vesselLookupRef, setVesselLookupRef] = useState('');
  const [vesselLookupOrigin, setVesselLookupOrigin] = useState('');
  const [vesselLookupDest, setVesselLookupDest] = useState('');

  // Core Directories States
  const [commodities, setCommodities] = useState(state.commodities);
  const [ports, setPorts] = useState(state.ports);
  const [conditions, setConditions] = useState(state.conditions);

  // Operations state managers
  const [bagPrices, setBagPrices] = useState<BagPrices>(state.bagPrices);
  const [bagStock, setBagStock] = useState<BagStockItem[]>(state.bagStock);
  const [dohaImport, setDohaImport] = useState<DohaImportData>(state.dohaImport);
  const [lineItems, setLineItems] = useState<ExpenseItem[]>(state.lineItems);
  const [cfsItems, setCfsItems] = useState<ExpenseItem[]>(state.cfsItems);
  const [rateList, setRateList] = useState<RateRow[]>(state.rateList);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>(state.savedQuotes);

  const [companies, setCompanies] = useState<string[]>(state.companies);
  const [buyers, setBuyers] = useState<string[]>(state.buyers);
  const [buyerLocations, setBuyerLocations] = useState<string[]>(state.buyerLocations);

  const [grainInventory, setGrainInventory] = useState<GrainInventoryItem[]>(state.grainInventory);
  const [inventoryOrders, setInventoryOrders] = useState<InventoryOrder[]>(state.inventoryOrders);

  // Synchronized CFS values for Rate Calculator
  const [transportCost, setTransportCost] = useState(0);
  const [cfsCost, setCfsCost] = useState(0);
  const [fclCount, setFclCount] = useState(2);
  const [weightPerContainer, setWeightPerContainer] = useState(26000);

  // Selected Rates for the Quotation Sheet
  const [selectedRateIds, setSelectedRateIds] = useState<number[]>([]);

  const [userModulePrefs, setUserModulePrefs] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('rems_user_module_preferences');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('rems_user_module_preferences', JSON.stringify(userModulePrefs));
  }, [userModulePrefs]);

  const prevQuotesRef = useRef<SavedQuote[]>([]);
  const profileSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Alert notifier function (custom micro-toast)
  const showToast = (message: string, type?: 'success' | 'warn' | 'error') => {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      if (type === 'error') {
        toast.style.borderColor = '#ef4444';
        toast.style.backgroundColor = '#7f1d1d';
        toast.style.color = '#fee2e2';
      } else if (type === 'success') {
        toast.style.borderColor = '#10b981';
        toast.style.backgroundColor = '#064e3b';
        toast.style.color = '#ecfdf5';
      } else {
        toast.style.borderColor = '#475569';
        toast.style.backgroundColor = '#0f172a';
        toast.style.color = '#f8fafc';
      }
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
      toast.style.pointerEvents = 'auto';
      setTimeout(() => {
        toast.style.transform = 'translateY(80px)';
        toast.style.opacity = '0';
        toast.style.pointerEvents = 'none';
      }, 3500);
    }
  };

  // Monitor URL params for standalone window editor triggers
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const workspace = params.get('workspace') === 'true';
    const quoteIdStr = params.get('quoteId');
    const typeStr = params.get('type') as 'pi' | 'ci' | 'pl';
    
    // Vessel schedule stand-alone explorer trigger
    const vessels = params.get('vessels') === 'true';
    const refParam = params.get('ref') || '';
    const originParam = params.get('origin') || '';
    const destParam = params.get('dest') || '';

    if (vessels) {
      setVesselLookupRef(refParam);
      setVesselLookupOrigin(originParam);
      setVesselLookupDest(destParam);
      setVesselLookupActive(true);
    } else if (workspace && quoteIdStr) {
      const qid = parseInt(quoteIdStr);
      if (!isNaN(qid)) {
        setWorkspaceQuoteId(qid);
        setWorkspaceDocType(typeStr || 'pi');
        setWorkspaceActive(true);
      }
    }
  }, []);

  // Load state parameters for a specific Tenant Licence Key mapping back to custom commodities, bags, stocks, and profiles
  const loadTenantData = async (uid: string, email: string | null, forceTenantId?: string, forceRefresh = false) => {
    try {
      const membership = await getOrCreateUserMembership(uid, email);
      const tenantId = forceTenantId || membership.tenantId;
      const role = forceTenantId ? (forceTenantId === membership.tenantId ? membership.role : 'member') : membership.role;
      
      setActiveTenantId(tenantId);
      setTenantRole(role);

      // Record a secure user login audit log
      logUserLogin(uid, email, tenantId).catch(console.error);

      // Load specific mill licence info (Name)
      const licence = await getLicenceDetails(tenantId);
      setLicenceMetadata(licence);
      if (licence) {
        setActiveTenantName(licence.name);
      } else {
        setActiveTenantName(tenantId.toUpperCase().includes('LIC-RM') ? 'Registered Licence' : 'Personal Licence');
      }

      // Load directories at Tenant ID configuration
      const profile = await getTenantProfile(tenantId);
      if (profile) {
        // Self-heal/merge preset commodities to make sure vegetables, fruits, spices are fully loaded
        let loadedComms = profile.commodities || [];
        const loadedIds = new Set(loadedComms.map((c: any) => c.id));
        const missingPresets = INITIAL_COMMODITIES.filter((item) => !loadedIds.has(item.id));
        if (missingPresets.length > 0) {
          loadedComms = [...loadedComms, ...missingPresets];
        }
        setCommodities(loadedComms);

        setPorts(profile.ports || []);
        setConditions(profile.conditions || []);

        // Self-heal/merge packaging types
        const loadedBags = profile.bagPrices || INITIAL_BAGS;
        let mergedBags = { ...INITIAL_BAGS };
        Object.keys(INITIAL_BAGS).forEach((cat) => {
          if (loadedBags[cat] !== undefined && Array.isArray(loadedBags[cat]) && loadedBags[cat].length > 0) {
            mergedBags[cat] = loadedBags[cat];
          }
        });
        setBagPrices(mergedBags);

        // Self-heal/merge packaging stocks to ensure multi-workspace presets load
        let loadedStock = profile.bagStock || [];
        if (loadedStock.length === 0) {
          loadedStock = INITIAL_BAG_STOCK;
        } else {
          const loadedStockIds = new Set(loadedStock.map((s: any) => s.id));
          const missingStockPresets = INITIAL_BAG_STOCK.filter((item) => !loadedStockIds.has(item.id));
          if (missingStockPresets.length > 0) {
            loadedStock = [...loadedStock, ...missingStockPresets];
          }
        }
        setBagStock(loadedStock);
        setDohaImport(profile.dohaImport || INITIAL_DOHA_IMPORT);
        setLineItems(profile.lineItems || INITIAL_LINE_ITEMS);
        setCfsItems(profile.cfsItems || INITIAL_CFS_ITEMS);
        setRateList(profile.rateList || []);
        setCompanies(profile.companies || []);
        setBuyers(profile.buyers || []);
        setBuyerLocations(profile.buyerLocations || []);
        setGrainInventory(profile.grainInventory || []);
        setInventoryOrders(profile.inventoryOrders || []);
      } else {
        // First initialization, write active local defaults on cloud
        const backupData: UserProfileData = {
          commodities,
          ports,
          conditions,
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
          inventoryOrders
        };
        await saveTenantProfile(tenantId, backupData);
      }

      // Load all quotes for the specified licence
      const quotesList = await getTenantQuotes(tenantId);
      setSavedQuotes(quotesList);
      prevQuotesRef.current = quotesList;

      setDbInitialized(true);
      if (forceRefresh) {
        showToast(`Workspace connected to: ${licence?.name || tenantId}`, 'success');
      } else {
        showToast(`Cloud workspace synced for ${email}`);
      }
    } catch (err) {
      console.error("loadTenantData error:", err);
      showToast("Failed to fetch cloud records. Running on local fallback.");
    }
  };

  // Switch workspace tenant and update
  const handleTenantChange = async (newTenantId: string, refreshNeeded: boolean) => {
    if (!currentUser) return;
    setAuthLoading(true);
    let role: 'owner' | 'member' = 'member';
    try {
      const membership = await getOrCreateUserMembership(currentUser.uid, currentUser.email);
      if (membership.tenantId.trim().toUpperCase() === newTenantId.trim().toUpperCase()) {
        role = membership.role;
      }
    } catch (e) {
      console.error(e);
    }
    
    // Write new Lease Key permanently on database
    try {
      await updateUserMembership(currentUser.uid, currentUser.email, newTenantId, role);
    } catch (e) {
      console.error("Failed to commit permanent workspace activation:", e);
    }

    await loadTenantData(currentUser.uid, currentUser.email, newTenantId, refreshNeeded);
    setAuthLoading(false);
  };

  // Sync state variables from/to Firebase Authentication & Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setOtpVerified(false); // Reset on login
      } else {
        setCurrentUser(null);
        setActiveTenantId(null);
        setDbInitialized(false);
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time synchronization of the user's active team workspace lease keys
  useEffect(() => {
    if (!currentUser) {
      setActiveTenantId(null);
      setTenantRole('member');
      return;
    }

    setAuthLoading(true);
    let currentTenantId: string | null = null;
    const unsubscribe = subscribeToUserMembership(currentUser.uid, async (membership) => {
      if (membership) {
        setTenantRole(membership.role);
        setUserMembership(membership);
        if (membership.tenantId !== currentTenantId) {
          currentTenantId = membership.tenantId;
          setActiveTenantId(membership.tenantId);
          await loadTenantData(currentUser.uid, currentUser.email, membership.tenantId, false);
        }
      } else {
        // Create initial membership if it does not exist
        const defaultMembership = await getOrCreateUserMembership(currentUser.uid, currentUser.email);
        setTenantRole(defaultMembership.role);
        setUserMembership(defaultMembership);
        if (defaultMembership.tenantId !== currentTenantId) {
          currentTenantId = defaultMembership.tenantId;
          setActiveTenantId(defaultMembership.tenantId);
          await loadTenantData(currentUser.uid, currentUser.email, defaultMembership.tenantId, false);
        }
      }
      setAuthLoading(false);
    });

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
      } else {
        setActiveTenantName(activeTenantId.toUpperCase().includes('LIC-RM') ? 'Registered Licence' : 'Personal Licence');
      }
    });

    return () => unsubscribe();
  }, [activeTenantId]);

  // Sync Saved Quotes to Firebase (Detect additions, updates, deletions) under selected Tenant ID
  useEffect(() => {
    if (!currentUser || !dbInitialized || !activeTenantId) return;
    const prev = prevQuotesRef.current;

    // Detect removed quotes
    const deleted = prev.filter(pq => !savedQuotes.some(q => q.id === pq.id));
    deleted.forEach(q => {
      deleteTenantQuote(q.id).catch(console.error);
    });

    // Detect added or updated quotes
    const updated = savedQuotes.filter(q => {
      const pq = prev.find(x => x.id === q.id);
      return !pq || JSON.stringify(pq) !== JSON.stringify(q);
    });
    updated.forEach(q => {
      saveTenantQuote(activeTenantId, currentUser.uid, q).catch(console.error);
    });

    prevQuotesRef.current = savedQuotes;
  }, [savedQuotes, currentUser, dbInitialized, activeTenantId]);

  // Sync User Directory configuration profiles with 1s debounce
  useEffect(() => {
    if (!currentUser || !dbInitialized || !activeTenantId) return;

    if (profileSyncTimerRef.current) clearTimeout(profileSyncTimerRef.current);
    profileSyncTimerRef.current = setTimeout(() => {
      const profileData: UserProfileData = {
        commodities,
        ports,
        conditions,
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
        inventoryOrders
      };
      saveTenantProfile(activeTenantId, profileData).catch(console.error);
    }, 1000);

    return () => {
      if (profileSyncTimerRef.current) clearTimeout(profileSyncTimerRef.current);
    };
  }, [
    currentUser, dbInitialized, activeTenantId,
    commodities, ports, conditions, bagPrices, bagStock,
    dohaImport, lineItems, cfsItems, rateList,
    companies, buyers, buyerLocations, grainInventory, inventoryOrders
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
    saveLS('rems_commodities', commodities);
  }, [commodities]);

  useEffect(() => {
    saveLS('rems_ports', ports);
  }, [ports]);

  useEffect(() => {
    saveLS('rems_conditions', conditions);
  }, [conditions]);

  useEffect(() => {
    saveLS('rems_bags', bagPrices);
  }, [bagPrices]);

  useEffect(() => {
    saveLS('rems_bag_stock', bagStock);
  }, [bagStock]);

  useEffect(() => {
    saveLS('rems_doha_import', dohaImport);
  }, [dohaImport]);

  useEffect(() => {
    saveLS('rems_line_items', lineItems);
  }, [lineItems]);

  useEffect(() => {
    saveLS('rems_cfs_items', cfsItems);
  }, [cfsItems]);

  useEffect(() => {
    saveLS('rems_rates', rateList);
  }, [rateList]);

  useEffect(() => {
    saveLS('rems_saved_quotes_v2', savedQuotes);
  }, [savedQuotes]);

  useEffect(() => {
    saveLS('rems_companies', companies);
  }, [companies]);

  useEffect(() => {
    saveLS('rems_buyers', buyers);
  }, [buyers]);

  useEffect(() => {
    saveLS('rems_buyer_locations', buyerLocations);
  }, [buyerLocations]);

  useEffect(() => {
    saveLS('rems_grain_inventory', grainInventory);
  }, [grainInventory]);

  useEffect(() => {
    saveLS('rems_inventory_orders', inventoryOrders);
  }, [inventoryOrders]);

  const handleSaveInventory = () => {
    showToast('Mill inventory balances committed successfully!', 'success');
  };

  const handleResetInventory = () => {
    if (commodities.length > 0) {
      const initialInv = commodities.map((c, idx) => ({
        id: 'grain_' + c.id + '_' + idx,
        grainName: c.name,
        paddyStockTons: 35 + (idx * 5),
        processedRiceTons: 12 + idx,
        readyBagsCount: 150 + (idx * 50),
        paddySupplierName: 'Vellore Agri Farm Co.',
        supplierLeadTimeDays: 5 + (idx % 3),
        millingLeadTimeDays: 3 + (idx % 2),
        packingLeadTimeDays: 2,
        bagSizeKg: 20
      }));
      setGrainInventory(initialInv);
    }
    setInventoryOrders([]);
    showToast('Inventory reset to default values.', 'success');
  };

  // Reset and Triggers block
  const handleSavePrices = () => {
    showToast('Bag prices saved successfully!');
  };

  const handleResetPrices = () => {
    if (confirm('Are you sure you want to restore default bag price structures?')) {
      setBagPrices(INITIAL_BAGS);
      showToast('Bag prices reset successfully.');
    }
  };

  const handleResetCommodities = (industryOnly: boolean = false) => {
    const currentInd = licenceMetadata?.industry || 'grain';
    if (industryOnly) {
      if (confirm(`Are you sure you want to restore default varieties for "${currentInd === 'vegetables_fruits' ? 'Vegetables & Fruits' : currentInd.toUpperCase()}"?`)) {
        const filteredOut = commodities.filter(c => (c.industry || 'grain') !== currentInd);
        const presets = INITIAL_COMMODITIES.filter(c => (c.industry || 'grain') === currentInd);
        setCommodities([...filteredOut, ...presets]);
        showToast(`Default varieties restored for ${currentInd === 'vegetables_fruits' ? 'Vegetables & Fruits' : currentInd.toUpperCase()}!`, 'success');
      }
    } else {
      if (confirm('Are you sure you want to restore standard preset varieties/products for ALL workspaces?')) {
        setCommodities(INITIAL_COMMODITIES);
        showToast('All workspace default products populated!', 'success');
      }
    }
  };

  const handleSaveStock = () => {
    showToast('Warehouse stocks updated!');
  };

  const handleResetStock = () => {
    if (confirm('Reset warehouse stock logs to default demo data?')) {
      setBagStock(INITIAL_BAG_STOCK);
      showToast('Inventory logs reset.');
    }
  };

  const handleSaveExpenses = () => {
    showToast('CFS & CHA expenses stored!');
  };

  const handleResetExpenses = () => {
    if (confirm('Restore standard terminal and custom clearance charges?')) {
      setCfsItems(INITIAL_CFS_ITEMS);
      setLineItems(INITIAL_LINE_ITEMS);
      showToast('Terminal charges restored.');
    }
  };

  const handleSaveDoha = () => {
    showToast('Doha clearance parameters updated!');
  };

  const handleResetDoha = () => {
    if (confirm('Restore Doha customs tariffs and legalization defaults?')) {
      setDohaImport(INITIAL_DOHA_IMPORT);
      showToast('Doha metrics restored.');
    }
  };

  const handleSaveRate = (newRate: RateRow, editingQuoteItem?: { quoteId: number; itemIndex: number } | null) => {
    if (editingQuoteItem) {
      const { quoteId, itemIndex } = editingQuoteItem;
      setSavedQuotes(prev => prev.map(q => {
        if (q.id === quoteId) {
          const updatedItems = [...q.items];
          if (updatedItems[itemIndex]) {
            const oldItem = updatedItems[itemIndex];
            
            // Re-calculate derived bags and quantities based on backfilled rate values
            const sizeStr = newRate.size || oldItem.size || 'GRAIN 20 KG';
            const numFcls = newRate.numFCL || oldItem.numFCL || 1;
            const wtPerContainer = newRate.weightPerContainerKg || oldItem.weightPerContainerKg || 26020;
            const totalKg = numFcls * wtPerContainer;
            
            // Extract size numeric value
            const numericSizeValue = parseFloat(sizeStr.replace(/[^\d.]/g, '')) || 20;
            const bagsCount = Math.round(totalKg / numericSizeValue);
            
            updatedItems[itemIndex] = {
              ...oldItem,
              dest: newRate.dest,
              commodity: newRate.commodity,
              brand: newRate.brand,
              packed: newRate.packed,
              size: newRate.size,
              master: newRate.master,
              crop: newRate.crop,
              year: newRate.year || '2025',
              rate: newRate.rate,
              condition: newRate.condition,
              paymentTerms: newRate.paymentTerms,
              numFCL: numFcls,
              weightPerContainerKg: wtPerContainer,
              totalWeightKg: totalKg,
              totalBags: bagsCount,
              
              // cost breakdown updates
              bExMill: (newRate as any).bExMill || 0,
              blendRice1Name: (newRate as any).blendRice1Name || '',
              blendRice1Pct: (newRate as any).blendRice1Pct || 0,
              blendRice1ExMill: (newRate as any).blendRice1ExMill || 0,
              blendRice2Name: (newRate as any).blendRice2Name || '',
              blendRice2Pct: (newRate as any).blendRice2Pct || 0,
              blendRice2ExMill: (newRate as any).blendRice2ExMill || 0,
              blendCookingRemarks: (newRate as any).blendCookingRemarks || '',
              bPackaging: (newRate as any).bPackaging || 0,
              bTransport: (newRate as any).bTransport || 0,
              bCfsPort: (newRate as any).bCfsPort || 0,
              bFreight: (newRate as any).bFreight || 0,
              bInsurance: (newRate as any).bInsurance || 0,
              dutyPct: (newRate as any).dutyPct || 0,
              exrate: (newRate as any).exrate || 91.50,
              commission: (newRate as any).commission || 0
            };
          }
          return {
            ...q,
            items: updatedItems
          };
        }
        return q;
      }));
      setBackfillItem(null);
      showToast('Export Offer Item Overwritten & Recalculated!');
      setActiveTab('savedquotes');
    } else {
      setRateList((prev) => [newRate, ...prev]);
      showToast('Export Price Quote added to Plate Board!');
    }
  };

  const handlePushToCalculator = (transportKg: number, cfsKg: number, currentFcl: number, payloadWt: number) => {
    setTransportCost(transportKg);
    setCfsCost(cfsKg);
    setFclCount(currentFcl);
    setWeightPerContainer(payloadWt);
    setActiveTab('calc');
  };

  const handleTriggerQuoteSheetSetup = (rateIds: number[]) => {
    setSelectedRateIds(rateIds);
    setActiveTab('quote');
  };

  const handleLaunchWorkspace = (quoteId: number, type: 'pi' | 'ci' | 'pl', openInNewTab: boolean = false) => {
    if (openInNewTab) {
      const url = `${window.location.origin}${window.location.pathname}?workspace=true&quoteId=${quoteId}&type=${type}`;
      window.open(url, '_blank');
      showToast(`Redirecting ${type.toUpperCase()} compliance to standard A4 sheet...`);
    } else {
      setWorkspaceQuoteId(quoteId);
      setWorkspaceDocType(type);
      setWorkspaceActive(true);
    }
  };

  const handleClearDatabase = () => {
    if (confirm('CRITICAL FACTORY WARNING:\n\nAre you absolutely sure you want to purge all active states? This deletes everything, including saved quotes, and resets layout values.')) {
      localStorage.clear();
      setCommodities(state.commodities);
      setPorts(state.ports);
      setConditions(state.conditions);
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
      setActiveTab('calc');
      showToast('Purge completed!');
    }
  };

  // Standalone Vessel Schedule Explorer view
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

  // Active Workspace Sheet Context
  if (workspaceActive && workspaceQuoteId !== null) {
    return (
      <DocumentWorkspace 
        quoteId={workspaceQuoteId}
        initialType={workspaceDocType}
        onClose={() => setWorkspaceActive(false)}
        onSaveCallback={(newList) => {
          setSavedQuotes(newList);
          showToast('Operations database customized!');
        }}
        licenceMetadata={licenceMetadata}
        userId={currentUser ? currentUser.uid : ''}
        activeTenantId={activeTenantId || ''}
      />
    );
  }

  // Auth Loading transition layer
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Loading Cloud Workspace...
        </p>
      </div>
    );
  }

  // Not Authenticated Layer
  if (!currentUser) {
    if (showMarketing) {
      return <LandingPage onGoToAuth={() => setShowMarketing(false)} savedQuotes={savedQuotes} />;
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
  const isViren = currentUser?.email?.toLowerCase() === 'vnp.viren@gmail.com';

  // 1. Check approval state
  if (currentUser && licenceMetadata && licenceMetadata.approved === false && !isViren) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 justify-center items-center px-4 py-8 font-sans">
        <div className="max-w-md w-full bg-slate-950 border border-slate-800 p-8 rounded-3xl shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg animate-pulse">
            <Lock className="w-8 h-8 pointer-events-none" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-black text-white uppercase tracking-widest">Workspace Suspended</h2>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              Thank you for registering at VNP Export Manager. Your business workspace keys are locked in pending state.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-2.5 font-mono text-xs text-left text-slate-300">
            <div><span className="text-slate-500 uppercase text-[9px] font-bold">Workspace Key:</span> <span className="font-bold text-blue-400 select-all">{activeTenantId}</span></div>
            <div><span className="text-slate-500 uppercase text-[9px] font-bold">Email registered:</span> <span className="text-slate-200">{currentUser?.email}</span></div>
            <div><span className="text-slate-500 uppercase text-[9px] font-bold">Review Status:</span> <span className="text-rose-455 font-extrabold uppercase animate-pulse">Pending Activation</span></div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Please coordinate with your organization admin or contact support at <strong className="text-sky-400 select-all font-mono">vnp.viren@gmail.com</strong> with your workspace lease key to enable permission access.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => {
                // Refresh status
                setAuthLoading(true);
                loadTenantData(currentUser.uid, currentUser.email, activeTenantId || undefined).then(() => setAuthLoading(false));
              }}
              className="flex-1 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg cursor-pointer"
            >
              Check Status
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Check security OTP verification layout (Completely disabled as per user request so users never see the OTP gate)
  /*
  if (currentUser && licenceMetadata && licenceMetadata.otpEnabled && !otpVerified && !isViren) {
    return (
      <OtpSecurityGate 
        email={currentUser.email}
        otpMethod={licenceMetadata.otpMethod}
        onVerified={() => {
          setOtpVerified(true);
          showToast("Portal security cleared! Access granted.", "success");
        }}
        onLogout={handleLogout}
      />
    );
  }
  */

  const isModuleEnabled = (moduleCode: string) => {
    const defaultModules = ['rate_calc', 'quote_saving', 'quote_sharing', 'bag_price_stock', 'grain_inventory', 'pi_ci_generation', 'shipping_tracking'];
    const assigned = licenceMetadata?.allowedModules || defaultModules;
    // 1. Is the module allowed by the tenant license?
    if (!assigned.includes(moduleCode)) {
      return false;
    }
    // 2. Did the user specifically disable it in settings? (unchecking saves false)
    if (userModulePrefs[moduleCode] === false) {
      return false;
    }
    return true;
  };

  const renderLockedModule = (title: string, description: string) => (
    <div className="p-8 text-center bg-white border border-gray-200 rounded-3xl max-w-xl mx-auto shadow-sm space-y-5 my-8" id="locked_module_notice">
      <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
        <Lock className="w-7 h-7" />
      </div>
      
      <div className="space-y-2 border-b border-gray-100 pb-5">
        <h3 className="font-extrabold text-base text-gray-950 uppercase tracking-wider">{title} Module Locked</h3>
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

        <div className="text-xs font-sans text-slate-650 space-y-2.5 pt-2 border-t border-slate-200/50">
          <p className="flex items-center gap-1.5 justify-center font-bold text-slate-800">
            ⚡ Upgrade your current subscription to a higher plan or contact support to enable.
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

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 text-gray-800 font-sans" id="rice_export_manager_root">
      
      {/* Sidebar navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        rateCount={rateList.length}
        savedQuotesCount={savedQuotes.length}
        sidebarPinned={sidebarPinned}
        setSidebarPinned={setSidebarPinned}
        userEmail={currentUser.email}
        onLogout={handleLogout}
        industry={licenceMetadata?.industry || 'grain'}
        allowedModules={(licenceMetadata?.allowedModules || ['rate_calc', 'quote_saving', 'quote_sharing', 'bag_price_stock', 'grain_inventory', 'pi_ci_generation', 'shipping_tracking']).filter(m => isModuleEnabled(m))}
        activeTenantId={activeTenantId}
      />

      {/* Main Panel views layout */}
      <main className="flex-1 p-4 md:p-6 overflow-x-hidden min-h-0 print:m-0 print:p-0 print:overflow-visible">
        
        {/* DUAL EXPORTER MULTI-COMPANY QUICK SWITCHER TOP-BAR */}
        {currentUser && userMembership && (userMembership.companyAName || userMembership.companyBName) && (
          <div className="bg-white border border-gray-200 rounded-2xl p-3.5 mb-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 animate-in fade-in duration-300 print:hidden" id="multi-company-top-switcher-bar">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-650">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-gray-400 block leading-none mb-0.5">ACTIVE EXPORTER CONTEXT</span>
                <span className="text-sm font-black text-slate-800 font-sans tracking-tight">
                  🏢 {activeTenantName} <span className="font-mono text-xs text-indigo-650 font-bold">({activeTenantId})</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Company A Switch Button */}
              {userMembership.companyAName && (
                <button
                  onClick={async () => {
                    if (userMembership.companyAApproved) {
                      handleTenantChange(userMembership.companyATenantId, true);
                    } else {
                      try {
                        setAuthLoading(true);
                        // Auto approve membership flag
                        await updateMembershipSubCompanies(currentUser.uid, {
                          companyAApproved: true
                        });
                        // Also auto approve LicenceDetails object
                        const licA = await getLicenceDetails(userMembership.companyATenantId);
                        if (licA) {
                          licA.approved = true;
                          await saveLicenceDetails(licA);
                        } else {
                          const newLic = {
                            tenantId: userMembership.companyATenantId,
                            name: userMembership.companyAName,
                            ownerId: currentUser.uid,
                            ownerEmail: currentUser.email || '',
                            createdAt: new Date().toISOString(),
                            approved: true,
                            otpEnabled: false,
                            otpMethod: 'disabled',
                            industry: licenceMetadata?.industry || 'grain',
                            allowedModules: licenceMetadata?.allowedModules || ['rate_calc', 'quote_saving', 'quote_sharing', 'bag_price_stock', 'grain_inventory']
                          };
                          await saveLicenceDetails(newLic as any);
                        }
                        showToast(`"${userMembership.companyAName}" approved and activated successfully!`, "success");
                        handleTenantChange(userMembership.companyATenantId, true);
                      } catch (err) {
                        console.error(err);
                        setAuthLoading(false);
                        showToast("Failed to auto-activate the company profile.", "error");
                      }
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    activeTenantId === userMembership.companyATenantId
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                      : 'bg-white border-gray-250 text-gray-750 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate max-w-[130px]">{userMembership.companyAName}</span>
                  {userMembership.companyAApproved ? (
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                      activeTenantId === userMembership.companyATenantId ? 'bg-indigo-700 text-indigo-100' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {activeTenantId === userMembership.companyATenantId ? 'Active' : 'Unselected'}
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
                      handleTenantChange(userMembership.companyBTenantId, true);
                    } else {
                      try {
                        setAuthLoading(true);
                        // Auto approve membership flag
                        await updateMembershipSubCompanies(currentUser.uid, {
                          companyBApproved: true
                        });
                        // Also auto approve LicenceDetails object
                        const licB = await getLicenceDetails(userMembership.companyBTenantId);
                        if (licB) {
                          licB.approved = true;
                          await saveLicenceDetails(licB);
                        } else {
                          const newLic = {
                            tenantId: userMembership.companyBTenantId,
                            name: userMembership.companyBName,
                            ownerId: currentUser.uid,
                            ownerEmail: currentUser.email || '',
                            createdAt: new Date().toISOString(),
                            approved: true,
                            otpEnabled: false,
                            otpMethod: 'disabled',
                            industry: licenceMetadata?.industry || 'grain',
                            allowedModules: licenceMetadata?.allowedModules || ['rate_calc', 'quote_saving', 'quote_sharing', 'bag_price_stock', 'grain_inventory']
                          };
                          await saveLicenceDetails(newLic as any);
                        }
                        showToast(`"${userMembership.companyBName}" approved and activated successfully!`, "success");
                        handleTenantChange(userMembership.companyBTenantId, true);
                      } catch (err) {
                        console.error(err);
                        setAuthLoading(false);
                        showToast("Failed to auto-activate the company profile.", "error");
                      }
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    activeTenantId === userMembership.companyBTenantId
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                      : 'bg-white border-gray-255 text-gray-705 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate max-w-[130px]">{userMembership.companyBName}</span>
                  {userMembership.companyBApproved ? (
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                      activeTenantId === userMembership.companyBTenantId ? 'bg-indigo-700 text-indigo-100' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {activeTenantId === userMembership.companyBTenantId ? 'Active' : 'Unselected'}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[8px] font-black uppercase animate-pulse w-max">
                      Approve & Select
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* VIEW ROUTER CONTROLLER */}
        {activeTab === 'calc' && (
          isModuleEnabled('rate_calc') ? (
            <RateCalculator 
              commodities={commodities}
              ports={ports}
              conditions={conditions}
              setConditions={setConditions}
              bagPrices={bagPrices}
              bagStock={bagStock}
              transportCost={transportCost}
              cfsCost={cfsCost}
              weightPerContainer={weightPerContainer}
              fclCount={fclCount}
              setFclCount={setFclCount}
              onSaveRate={handleSaveRate}
              industry={licenceMetadata?.industry || 'grain'}
              onNavigateTab={(tab) => setActiveTab(tab)}
              grainInventory={grainInventory}
              backfillItem={backfillItem}
              onClearBackfill={() => setBackfillItem(null)}
              isInventoryEnabled={isModuleEnabled('grain_inventory')}
              isBagStockEnabled={isModuleEnabled('bag_price_stock')}
            />
          ) : (
            renderLockedModule("Rate Calculator", "Detailed FCL container cost simulations, weight projections, and cargo capacity indices are deactivated under your active workspace configuration.")
          )
        )}

        {activeTab === 'rates' && (
          isModuleEnabled('rate_calc') ? (
            <RateListBoard 
              rateList={rateList}
              setRateList={setRateList}
              commodities={commodities}
              ports={ports}
              onTriggerQuoteSheetSetup={handleTriggerQuoteSheetSetup}
              grainInventory={grainInventory}
              isInventoryEnabled={isModuleEnabled('grain_inventory')}
            />
          ) : (
            renderLockedModule("Rate Board Database", "Target sheets, reference price records, and active workspace logs are deactivated under your active workspace configuration.")
          )
        )}

        {activeTab === 'bags' && (
          isModuleEnabled('bag_price_stock') ? (
            <BagPriceAndStock 
              bagPrices={bagPrices}
              setBagPrices={setBagPrices}
              bagStock={bagStock}
              setBagStock={setBagStock}
              onSavePrices={handleSavePrices}
              onResetPrices={handleResetPrices}
              onSaveStock={handleSaveStock}
              onResetStock={handleResetStock}
              industry={licenceMetadata?.industry || 'grain'}
            />
          ) : (
            renderLockedModule("Bag Price & Stock", "Supplier configurations, tare package rates, and active stock volume tallies are deactivated under your active workspace modules.")
          )
        )}

        {activeTab === 'inventory' && (
          isModuleEnabled('grain_inventory') ? (
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
            renderLockedModule("Production & Grain Inventory CONTROL", "Warehouse silo balances, supplier purchase channels, and algorithmic milling/packing lead times calculations are restricted under your active workspace modules.")
          )
        )}

        {activeTab === 'expenses' && (
          <CfsTransport 
            lineItems={lineItems}
            setLineItems={setLineItems}
            cfsItems={cfsItems}
            setCfsItems={setCfsItems}
            fclCount={fclCount}
            setFclCount={setFclCount}
            weightPerContainer={weightPerContainer}
            setWeightPerContainer={setWeightPerContainer}
            onSaveExpenses={handleSaveExpenses}
            onResetExpenses={handleResetExpenses}
            onPushToCalculator={handlePushToCalculator}
          />
        )}

        {activeTab === 'dohaimport' && (currentUser?.email?.toLowerCase() === 'vnp.viren@gmail.com' ? (
          <DohaImport 
            dohaImport={dohaImport}
            setDohaImport={setDohaImport}
            onSaveDoha={handleSaveDoha}
            onResetDoha={handleResetDoha}
            savedQuotes={savedQuotes}
          />
        ) : (
          <div className="p-12 text-center bg-white border border-gray-200 rounded-3xl max-w-lg mx-auto shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto text-lg font-black">
              ⚠
            </div>
            <h3 className="text-base font-black text-gray-900 uppercase">Access Restricted</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              This Doha Import custom reference board is exclusively restricted to the primary system administrator 
              (<strong className="font-bold text-gray-800">VNP.VIREN@gmail.com</strong>) for confidential operational overhead calculations.
            </p>
          </div>
        ))}

        {activeTab === 'quote' && (
          isModuleEnabled('pi_ci_generation') ? (
            <QuoteSheet 
              selectedRateIds={selectedRateIds}
              rateList={rateList}
              savedQuotes={savedQuotes}
              setSavedQuotes={setSavedQuotes}
              companies={companies}
              setCompanies={setCompanies}
              buyers={buyers}
              setBuyers={setBuyers}
              buyerLocations={buyerLocations}
              setBuyerLocations={setBuyerLocations}
              onNavigateToTab={setActiveTab}
              allowedModules={licenceMetadata?.allowedModules || ['rate_calc']}
              industry={licenceMetadata?.industry || 'grain'}
            />
          ) : (
            renderLockedModule("Quotation Sheet & PI/CI Editor", "Commercial itemized pricing grids, proforma headers, packing lists, and company letterhead configs are deactivated under your active workspace configuration.")
          )
        )}

        {activeTab === 'savedquotes' && (
          isModuleEnabled('quote_saving') ? (
            <SavedQuotes 
              savedQuotes={savedQuotes}
              setSavedQuotes={setSavedQuotes}
              onNavigateToTab={setActiveTab}
              setSelectedRateIds={setSelectedRateIds}
              onLaunchWorkspace={handleLaunchWorkspace}
              allowedModules={licenceMetadata?.allowedModules || ['rate_calc']}
              industry={licenceMetadata?.industry || 'grain'}
              licenceMetadata={licenceMetadata}
              grainInventory={grainInventory}
              isInventoryEnabled={isModuleEnabled('grain_inventory')}
              onSendToCalculator={(payload) => {
                setBackfillItem(payload);
                setActiveTab('calc');
                showToast(`Backfilled parameters for item ${payload.itemIndex + 1} (${payload.data.commodity}) into Rate Calculator.`);
              }}
            />
          ) : (
            renderLockedModule("Saved Quotations & Logs", "Historical client offer logs, transaction folders, PDF download registries, and transit tracking maps are deactivated under your active workspace configuration.")
          )
        )}

        {activeTab === 'licence' && currentUser && activeTenantId && (
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
          />
        )}

        {activeTab === 'tracker' && (
          isModuleEnabled('shipping_tracking') ? (
            <ContainerTracker />
          ) : (
            renderLockedModule("Location & Maritime BL Tracking", "Real-time vessel GPS locators, ocean bill of lading records, and live container safety metrics are deactivated under your active workspace modules.")
          )
        )}

        {activeTab === 'saas_preview' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-blue-850 tracking-wider font-mono">
                  Live SaaS Landing Page Preview
                </span>
                <p className="text-xs text-blue-750">
                  This is the exact landing homepage that external visitors and prospective customers see when they land on your domain.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab('calc')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition whitespace-nowrap"
              >
                Back to Dashboard
              </button>
            </div>
            <div className="border border-slate-900 rounded-3xl overflow-hidden shadow-2xl">
              <LandingPage onGoToAuth={() => showToast("In preview mode! Try logging out or incognito window to join real sessions.")} savedQuotes={savedQuotes} />
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <Settings 
            commodities={commodities}
            setCommodities={setCommodities}
            ports={ports}
            setPorts={setPorts}
            onClearDatabase={handleClearDatabase}
            industry={licenceMetadata?.industry || 'grain'}
            onResetCommodities={handleResetCommodities}
            userModulePrefs={userModulePrefs}
            setUserModulePrefs={setUserModulePrefs}
            allowedModules={licenceMetadata?.allowedModules || ['rate_calc', 'quote_saving', 'quote_sharing', 'bag_price_stock', 'grain_inventory', 'pi_ci_generation', 'shipping_tracking']}
          />
        )}

      </main>

      {/* Global active feedback micro-toast popup */}
      <div 
        id="toast" 
        className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white font-semibold text-xs py-3 px-5 rounded-xl shadow-2xl tracking-wide z-50 select-none transition-all duration-300 transform translate-y-20 opacity-0 pointer-events-none"
      >
        Alert Message
      </div>

    </div>
  );
}
