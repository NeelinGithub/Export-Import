import { db, OperationType, handleFirestoreError, isQuotaExceeded, setQuotaExceeded } from "../firebase";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  limit,
  DocumentData,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import {
  SavedQuote,
  Commodity,
  Port,
  Condition,
  PaymentTerm,
  BagPrices,
  BagStockItem,
  DohaImportData,
  ExpenseItem,
  RateRow,
  GrainInventoryItem,
  InventoryOrder,
} from "../types";

export interface UserProfileData {
  commodities: Commodity[];
  ports: Port[];
  conditions: Condition[];
  paymentTerms?: PaymentTerm[];
  bagPrices: BagPrices;
  bagStock: BagStockItem[];
  dohaImport: DohaImportData;
  lineItems: ExpenseItem[];
  cfsItems: ExpenseItem[];
  rateList: RateRow[];
  companies: string[];
  buyers: string[];
  buyerLocations: string[];
  grainInventory?: GrainInventoryItem[];
  inventoryOrders?: InventoryOrder[];
}

// Memory cache for documents to minimize network reads during active sessions
export const memoryCache = new Map<string, any>();

function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        cleaned[key] = cleanUndefined(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

export interface UserMembership {
  userId: string;
  userEmail: string;
  tenantId: string;
  role: "owner" | "member";
  joinedAt: string;
  companyAName?: string;
  companyATenantId?: string;
  companyAApproved?: boolean;
  companyBName?: string;
  companyBTenantId?: string;
  companyBApproved?: boolean;
  loginBlocked?: boolean;
  onboarded?: boolean;
}

export interface LicenceDetails {
  tenantId: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: string;
  approved?: boolean;
  otpEnabled?: boolean;
  otpMethod?: "email" | "whatsapp" | "disabled";
  aiEnabled?: boolean;
  country?: string;
  industry?:
    | "grain"
    | "tiles"
    | "generic"
    | "spices"
    | "chemicals"
    | "salts"
    | "vegetables_fruits"
    | "metal"
    | "nuts"
    | "pharma"
    | "oil"
    | "apparel"
    | "air_cargo";
  allowedModules?: string[];
  planId?: "free" | "pay_per_doc" | "standard" | "organization" | "enterprise" | "annual";
  planPriceCustom?: number;
  freeTierCalcsThisMonth?: number;
  freeTierCalcResetDate?: string;
  freeTierSavedQuoteIds?: string[];
  singleShipmentCredits?: number;
  logoText?: string;
  logoBase64?: string;
  dateFormat?: string;
  industrySelected?: boolean;
  exporterTagline?: string;
  exporterAddress?: string;
  bankDetails?: string;
  loginBlocked?: boolean;
  onboarded?: boolean;
  piLimitDay?: number;
  piLimitMonth?: number;
  piLimitYear?: number;
  ciLimitDay?: number;
  ciLimitMonth?: number;
  ciLimitYear?: number;
  plLimitDay?: number;
  plLimitMonth?: number;
  plLimitYear?: number;
  calcUsageCount?: number;
  calcUsageMonth?: number;
  cfsUsageCount?: number;
  cfsUsageMonth?: number;
}

export interface LoginAudit {
  id: string;
  userId: string;
  userEmail: string;
  tenantId: string;
  timestamp: string;
}

export interface DocumentGenerationLog {
  id: string;
  tenantId: string;
  userId: string;
  docType: "pi" | "ci" | "pl";
  timestamp: string;
  ref: string;
}

const MEMBERSHIPS_COLLECTION = "user_memberships";
const LICENCES_COLLECTION = "licences";
const PROFILE_COLLECTION = "tenant_profiles";
const QUOTES_COLLECTION = "quotes";

export async function preCreateWorkspaceForEmail(email: string): Promise<void> {
  if (isQuotaExceeded()) {
    // // console.warn");
    return;
  }
  const cleanEmail = email.toLowerCase().trim();
  const pendingUserId = `pre_${cleanEmail}`;
  const defaultTenantId = `LIC-PRE-${cleanEmail
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 5)
    .toUpperCase()}-${Date.now().toString().substring(7)}`;

  const existingSnap = await getDoc(
    doc(db, MEMBERSHIPS_COLLECTION, pendingUserId),
  );
  if (existingSnap.exists()) {
    throw new Error("Workspace already pre-created for this email.");
  }

  const defaultMembership: UserMembership = {
    userId: pendingUserId,
    userEmail: cleanEmail,
    tenantId: defaultTenantId,
    role: "owner",
    joinedAt: new Date().toISOString(),
  };

  await setDoc(
    doc(db, MEMBERSHIPS_COLLECTION, pendingUserId),
    defaultMembership,
  );

  const defaultLicence: LicenceDetails = {
    tenantId: defaultTenantId,
    name: `${cleanEmail}'s Workspace`,
    ownerId: pendingUserId,
    ownerEmail: cleanEmail,
    createdAt: new Date().toISOString(),
    approved: true, // Auto-approve
    otpEnabled: false,
    otpMethod: "email",
    industry: "grain",
    allowedModules: [
      "rate_calc",
      "quote_saving",
      "quote_sharing",
      "bag_price_stock",
      "grain_inventory",
    ],
  };

  await setDoc(doc(db, LICENCES_COLLECTION, defaultTenantId), defaultLicence);
}

/**
 * Send an email notification to VNP Admin via server API on new user join
 */
export async function triggerAdminJoinNotification(
  userId: string,
  email: string,
  tenantId: string,
): Promise<void> {
  try {
    let location = "Not Available";
    try {
      const geoRes = await fetch("https://ipapi.co/json/");
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData && geoData.city && geoData.country_name) {
          location = `${geoData.city}, ${geoData.country_name}`;
        }
      }
    } catch (e) {
      try {
        const geoRes = await fetch("https://ipinfo.io/json");
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.city && geoData.country) {
            location = `${geoData.city}, ${geoData.country}`;
          }
        }
      } catch (e2) {}
    }

    await fetch("/api/admin/notify-join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        userEmail: email,
        tenantId,
        location,
        joinedAt: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn("Non-blocking Admin notification failed:", err);
  }
}

/**
 * Fetch or automatically initialize user membership mapping them to a Tenant ID (Licence)
 */
export async function getOrCreateUserMembership(
  userId: string,
  userEmail: string | null,
): Promise<UserMembership> {
  const localKey = `rems_membership_${userId}`;
  const loadLocal = () => {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) return JSON.parse(stored) as UserMembership;
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const cached = memoryCache.get(`membership_${userId}`);
  if (cached) return cached;

  const storedMem = loadLocal();
  if (storedMem) {
    memoryCache.set(`membership_${userId}`, storedMem);
  }

  if (isQuotaExceeded()) {
    if (storedMem) return storedMem;
    const isSuperAdmin = userEmail?.toLowerCase() === 'vnp.viren@gmail.com';
    const fallbackMembership: UserMembership = {
      userId,
      userEmail: userEmail || "",
      tenantId: isSuperAdmin ? "LIC-VIREN2024" : `LIC-${userId.substring(0, 8).toUpperCase()}`,
      role: "owner" as const,
      joinedAt: new Date().toISOString(),
      loginBlocked: false,
    };
    try {
      localStorage.setItem(localKey, JSON.stringify(fallbackMembership));
    } catch (e) {}
    memoryCache.set(`membership_${userId}`, fallbackMembership);
    return fallbackMembership;
  }

  const path = `${MEMBERSHIPS_COLLECTION}/${userId}`;
  try {
    const docRef = doc(db, MEMBERSHIPS_COLLECTION, userId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      let data = snap.data() as UserMembership;
      
      // Auto-upgrade super admin if they are stuck in pending state
      if (userEmail?.toLowerCase() === 'vnp.viren@gmail.com' && (data.tenantId === 'PENDING_APPROVAL' || data.loginBlocked)) {
        data = {
          ...data,
          tenantId: 'LIC-VIREN2024',
          role: 'owner',
          loginBlocked: false
        };
        await setDoc(docRef, data, { merge: true });
      }

      try {
        localStorage.setItem(localKey, JSON.stringify(data));
      } catch (e) {}
      memoryCache.set(`membership_${userId}`, data);
      return data;
    }

    if (userEmail) {
      const cleanEmail = userEmail.toLowerCase().trim();
      const pendingUserId = `pre_${cleanEmail}`;
      const pendingRef = doc(db, MEMBERSHIPS_COLLECTION, pendingUserId);
      const pendingSnap = await getDoc(pendingRef);
      if (pendingSnap.exists()) {
        const pendingMembership = pendingSnap.data() as UserMembership;
        // Delete the pending one
        await deleteDoc(pendingRef);
        // Create the real one
        const realMembership = { ...pendingMembership, userId };
        await setDoc(docRef, realMembership);

        const licRef = doc(db, LICENCES_COLLECTION, realMembership.tenantId);
        const licSnap = await getDoc(licRef);
        if (licSnap.exists()) {
          const licData = licSnap.data() as LicenceDetails;
          if (licData.ownerEmail === cleanEmail) {
            await setDoc(
              licRef,
              { ...licData, ownerId: userId },
              { merge: true },
            );
          }
        }
        try {
          localStorage.setItem(localKey, JSON.stringify(realMembership));
        } catch (e) {}

        // Non-blocking trigger admin notification for pre-approved join
        triggerAdminJoinNotification(userId, userEmail, realMembership.tenantId);

        memoryCache.set(`membership_${userId}`, realMembership);
        return realMembership;
      }
    }

    // Default: Assign personal workspace
    const isSuperAdmin = userEmail?.toLowerCase() === 'vnp.viren@gmail.com';
    const defaultTenantId = isSuperAdmin ? "LIC-VIREN2024" : `LIC-${userId.substring(0, 8).toUpperCase()}`;
    const defaultMembership: UserMembership = {
      userId,
      userEmail: userEmail || "",
      tenantId: defaultTenantId,
      role: "owner" as const,
      joinedAt: new Date().toISOString(),
      loginBlocked: false,
    };

    // Save membership
    await setDoc(docRef, defaultMembership);

    try {
      localStorage.setItem(localKey, JSON.stringify(defaultMembership));
    } catch (e) {}

    // Non-blocking trigger admin notification for new user
    triggerAdminJoinNotification(userId, userEmail || "Anonymous", defaultTenantId);

    memoryCache.set(`membership_${userId}`, defaultMembership);
    return defaultMembership;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    if (storedMem) return storedMem;
    const isSuperAdmin = userEmail?.toLowerCase() === 'vnp.viren@gmail.com';
    const fallbackMembership: UserMembership = {
      userId,
      userEmail: userEmail || "",
      tenantId: isSuperAdmin ? "LIC-VIREN2024" : `LIC-${userId.substring(0, 8).toUpperCase()}`,
      role: "owner" as const,
      joinedAt: new Date().toISOString(),
      loginBlocked: false,
    };
    return fallbackMembership;
  }
}

/**
 * Update an existing user's membership (e.g., when they join a shared Licence)
 */
export async function updateUserMembership(
  userId: string,
  userEmail: string | null,
  tenantId: string,
  role: "owner" | "member",
): Promise<void> {
  const localKey = `rems_membership_${userId}`;
  const membershipData = {
    userId,
    userEmail: userEmail || "",
    tenantId: tenantId.trim().toUpperCase(),
    role,
    joinedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(localKey, JSON.stringify(membershipData));
  } catch (e) {
    console.error("Local storage membership save failed:", e);
  }

  if (isQuotaExceeded()) {
    // // console.warn("Firestore write skipped: Quota exceeded");
    return;
  }
  const path = `${MEMBERSHIPS_COLLECTION}/${userId}`;
  try {
    const docRef = doc(db, MEMBERSHIPS_COLLECTION, userId);
    await setDoc(docRef, membershipData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Update sub companies registration for dual company management
 */
export async function updateMembershipSubCompanies(
  userId: string,
  data: Partial<UserMembership>,
): Promise<void> {
  const localKey = `rems_membership_${userId}`;
  try {
    const stored = localStorage.getItem(localKey);
    if (stored) {
      const existing = JSON.parse(stored) as UserMembership;
      const updated = { ...existing, ...data };
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch (e) {
    console.error("Local storage sub-company update failed:", e);
  }

  if (isQuotaExceeded()) {
    // console.warn("Firestore write skipped: Quota exceeded");
    return;
  }
  const path = `${MEMBERSHIPS_COLLECTION}/${userId}`;
  try {
    const docRef = doc(db, MEMBERSHIPS_COLLECTION, userId);
    await setDoc(docRef, cleanUndefined(data), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch specifications is the Licence details (Name, Owner, etc.)
 */
export async function deleteWorkspaceByAdmin(tenantId: string): Promise<void> {
  if (isQuotaExceeded()) return;
  try {
    const q = query(
      collection(db, MEMBERSHIPS_COLLECTION),
      where("tenantId", "==", tenantId)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    batch.delete(doc(db, LICENCES_COLLECTION, tenantId));
    await batch.commit();
    memoryCache.delete("admin_all_licences");
    memoryCache.delete("admin_all_memberships");
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, null);
    throw e;
  }
}

export async function getLicenceDetails(
  tenantId: string,
): Promise<LicenceDetails | null> {
  const tenantKey = tenantId.trim().toUpperCase();
  const localKey = `rems_licence_${tenantKey}`;

  const loadLocal = () => {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) return JSON.parse(stored) as LicenceDetails;
    } catch (e) {
      console.error("Local storage read failed:", e);
    }
    return null;
  };

  const cached = memoryCache.get(`licence_${tenantKey}`);
  if (cached) return cached;

  const storedLic = loadLocal();
  if (storedLic) {
    memoryCache.set(`licence_${tenantKey}`, storedLic);
  }

  if (isQuotaExceeded()) {
    return loadLocal();
  }

  const path = `${LICENCES_COLLECTION}/${tenantId}`;
  try {
    const docRef = doc(db, LICENCES_COLLECTION, tenantKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as LicenceDetails;
      try {
        localStorage.setItem(localKey, JSON.stringify(data));
      } catch (e) {
        console.error(e);
      }
      memoryCache.set(`licence_${tenantKey}`, data);
      return data;
    }
    // Document was deleted or does not exist. Clear local cache.
    try {
      localStorage.removeItem(localKey);
    } catch (e) {}
    memoryCache.delete(`licence_${tenantKey}`);
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return loadLocal();
  }
}

/**
 * Real-time observer for User Membership details
 */
export function subscribeToUserMembership(
  userId: string,
  callback: (membership: UserMembership | null, isInitial?: boolean) => void,
  onError?: (error: any) => void,
): () => void {
  const loadLocal = (): UserMembership | null => {
    if (typeof window === "undefined" || !window.localStorage) return null;
    try {
      const item = localStorage.getItem(`rems_membership_${userId}`);
      if (item) return JSON.parse(item) as UserMembership;
    } catch (e) {
      console.error("Local storage read failed:", e);
    }
    return null;
  };

  if (isQuotaExceeded()) {
    callback(loadLocal(), true);
    return () => {};
  }

  const docRef = doc(db, MEMBERSHIPS_COLLECTION, userId);
  let isInitial = true;
  return onSnapshot(
    docRef,
    (snap) => {
      const initial = isInitial;
      isInitial = false;
      if (snap.exists()) {
        const data = snap.data() as UserMembership;
        memoryCache.set(`membership_${userId}`, data);
        try {
          localStorage.setItem(`rems_membership_${userId}`, JSON.stringify(data));
        } catch (e) {}
        callback(data, initial);
      } else {
        try {
          localStorage.removeItem(`rems_membership_${userId}`);
        } catch (e) {}
        callback(null, initial);
      }
    },
    (error) => {
      const initial = isInitial;
      isInitial = false;
      const isQuota = error.message && (
        error.message.toLowerCase().includes('quota') ||
        error.message.toLowerCase().includes('resource-exhausted') ||
        error.message.toLowerCase().includes('limit exceeded')
      );
      if (isQuota) {
        setQuotaExceeded(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("firestore-quota-exceeded"));
        }
        callback(loadLocal(), initial);
        return;
      }
      console.error("Error in real-time membership listener:", error);
      if (onError) onError(error);
    },
  );
}

/**
 * Real-time observer for Licence details modifications
 */
export function subscribeToLicenceDetails(
  tenantId: string,
  callback: (licence: LicenceDetails | null) => void,
): () => void {
  const tenantKey = tenantId.trim().toUpperCase();
  const loadLocal = (): LicenceDetails | null => {
    if (typeof window === "undefined" || !window.localStorage) return null;
    try {
      const item = localStorage.getItem(`rems_licence_${tenantKey}`);
      if (item) return JSON.parse(item) as LicenceDetails;
    } catch (e) {
      console.error("Local storage read failed:", e);
    }
    return null;
  };

  if (isQuotaExceeded()) {
    callback(loadLocal());
    return () => {};
  }

  const docRef = doc(db, LICENCES_COLLECTION, tenantKey);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as LicenceDetails;
        memoryCache.set(`licence_${tenantKey}`, data);
        try {
          localStorage.setItem(`rems_licence_${tenantKey}`, JSON.stringify(data));
        } catch (e) {}
        callback(data);
      } else {
        try {
          localStorage.removeItem(`rems_licence_${tenantKey}`);
        } catch (e) {}
        callback(null);
      }
    },
    (error) => {
      const isQuota = error.message && (
        error.message.toLowerCase().includes('quota') ||
        error.message.toLowerCase().includes('resource-exhausted') ||
        error.message.toLowerCase().includes('limit exceeded')
      );
      if (isQuota) {
        setQuotaExceeded(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("firestore-quota-exceeded"));
        }
        callback(loadLocal());
        return;
      }
      console.error("Error in real-time licence listener:", error);
    },
  );
}

/**
 * Save / update official License details
 */
export async function saveLicenceDetails(
  licence: LicenceDetails,
): Promise<void> {
  const tenantKey = licence.tenantId.trim().toUpperCase();
  try {
    localStorage.setItem(`rems_licence_${tenantKey}`, JSON.stringify(licence));
  } catch (e) {
    console.error("Local storage write failed:", e);
  }

  if (isQuotaExceeded()) {
    // console.warn("Firestore write skipped: Quota exceeded");
    return;
  }
  const path = `${LICENCES_COLLECTION}/${licence.tenantId}`;
  try {
    const docRef = doc(
      db,
      LICENCES_COLLECTION,
      licence.tenantId.trim().toUpperCase(),
    );
    const cleaned = cleanUndefined(licence);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save user profile state consisting of all directories, stocks, and charges at the Tenant level
 */
export async function saveTenantProfile(
  tenantId: string,
  data: UserProfileData,
): Promise<void> {
  const tenantKey = tenantId.trim().toUpperCase();
  memoryCache.set(`profile_${tenantKey}`, data);
  try {
    localStorage.setItem(`rems_profile_${tenantKey}`, JSON.stringify(data));
  } catch (e) {
    console.error("Local storage write failed:", e);
  }

  if (isQuotaExceeded()) {
    // console.warn("Firestore write skipped: Quota exceeded");
    return;
  }
  const path = `${PROFILE_COLLECTION}/${tenantId}`;
  try {
    const docRef = doc(db, PROFILE_COLLECTION, tenantId.trim().toUpperCase());
    const cleaned = cleanUndefined(data);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Loading profile specifications for a Tenant
 */
export async function getTenantProfile(
  tenantId: string,
): Promise<UserProfileData | null> {
  const tenantKey = tenantId.trim().toUpperCase();
  const localKey = `rems_profile_${tenantKey}`;

  const loadLocal = () => {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) return JSON.parse(stored) as UserProfileData;
    } catch (e) {
      console.error("Local storage read failed:", e);
    }
    return null;
  };

  const cached = memoryCache.get(`profile_${tenantKey}`);
  if (cached) return cached;

  const storedProf = loadLocal();
  if (storedProf) {
    memoryCache.set(`profile_${tenantKey}`, storedProf);
  }

  if (isQuotaExceeded()) {
    return loadLocal();
  }

  const path = `${PROFILE_COLLECTION}/${tenantId}`;
  try {
    const docRef = doc(db, PROFILE_COLLECTION, tenantKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfileData;
      try {
        localStorage.setItem(localKey, JSON.stringify(data));
      } catch (e) {
        console.error(e);
      }
      memoryCache.set(`profile_${tenantKey}`, data);
      return data;
    }
    return loadLocal();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return loadLocal();
  }
}

/**
 * Subscribe to all compiled export quotes for the Tenant using real-time listener (saves reads via cache)
 */
export function subscribeToTenantQuotes(
  tenantId: string,
  callback: (quotes: SavedQuote[]) => void
): () => void {
  const tenantKey = tenantId.trim().toUpperCase();
  const localKey = `rems_quotes_${tenantKey}`;

  const loadLocal = (): SavedQuote[] => {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) return JSON.parse(stored) as SavedQuote[];
    } catch (e) {
      console.error("Local storage read failed:", e);
    }
    return [];
  };

  if (isQuotaExceeded()) {
    callback(loadLocal());
    return () => {};
  }

  const q = query(
    collection(db, QUOTES_COLLECTION),
    where("tenantId", "==", tenantKey),
  );

  return onSnapshot(
    q,
    (snap) => {
      const quotes: SavedQuote[] = [];
      snap.forEach((d) => {
        const docData = d.data();
        const { tenantId: _, ...savedProps } = docData;
        quotes.push(savedProps as SavedQuote);
      });
      try {
        localStorage.setItem(localKey, JSON.stringify(quotes));
      } catch (e) {}
      callback(quotes);
    },
    (error) => {
      const isQuota = error.message && (
        error.message.toLowerCase().includes('quota') ||
        error.message.toLowerCase().includes('resource-exhausted') ||
        error.message.toLowerCase().includes('limit exceeded')
      );
      if (isQuota) {
        // Suppress console.error for Quota exceeded to avoid distracting user.
        console.warn("Firestore subscription skipped: Quota exceeded");
        setQuotaExceeded(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("firestore-quota-exceeded"));
        }
      } else {
        console.error("Error in real-time quotes listener:", error);
      }
      callback(loadLocal());
    }
  );
}

/**
 * Fetch all compiled export quotes for the Tenant
 */
export async function getTenantQuotes(tenantId: string): Promise<SavedQuote[]> {
  const tenantKey = tenantId.trim().toUpperCase();
  const localKey = `rems_quotes_${tenantKey}`;

  const loadLocal = () => {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) return JSON.parse(stored) as SavedQuote[];
    } catch (e) {
      console.error("Local storage read failed:", e);
    }
    return [];
  };

  const cached = memoryCache.get(`quotes_${tenantKey}`);
  if (cached) return cached;

  const storedQuotes = (() => {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) return JSON.parse(stored) as SavedQuote[];
    } catch (e) {}
    return null;
  })();
  if (storedQuotes) {
    memoryCache.set(`quotes_${tenantKey}`, storedQuotes);
  }

  if (isQuotaExceeded()) {
    return loadLocal();
  }

  const path = QUOTES_COLLECTION;
  try {
    const q = query(
      collection(db, QUOTES_COLLECTION),
      where("tenantId", "==", tenantKey),
    );
    const snap = await getDocs(q);
    const quotes: SavedQuote[] = [];
    snap.forEach((d) => {
      const docData = d.data();
      // Exclude mapping field internally to fit standard SavedQuote
      const { tenantId: _, ...savedProps } = docData;
      quotes.push(savedProps as SavedQuote);
    });
    try {
      localStorage.setItem(localKey, JSON.stringify(quotes));
    } catch (e) {
      console.error(e);
    }
    memoryCache.set(`quotes_${tenantKey}`, quotes);
    return quotes;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return loadLocal();
  }
}

/**
 * Save single Quote Document synchronized to cloud under a Tenant ID
 */
export async function saveTenantQuote(
  tenantId: string,
  userId: string,
  quote: SavedQuote,
): Promise<void> {
  const tenantKey = tenantId.trim().toUpperCase();
  const localKey = `rems_quotes_${tenantKey}`;
  
  memoryCache.delete(`quotes_${tenantKey}`);

  // Update local storage quotes list first
  try {
    const stored = localStorage.getItem(localKey);
    let quotesList: SavedQuote[] = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(quotesList)) quotesList = [];
    const index = quotesList.findIndex((q) => q.id === quote.id);
    if (index >= 0) {
      quotesList[index] = quote;
    } else {
      quotesList.push(quote);
    }
    localStorage.setItem(localKey, JSON.stringify(quotesList));
  } catch (e) {
    console.error("Failed to save quote locally:", e);
  }

  if (isQuotaExceeded()) {
    // console.warn("Firestore write skipped: Quota exceeded");
    return;
  }
  const docId = `quote_${quote.id}`;
  const path = `${QUOTES_COLLECTION}/${docId}`;
  try {
    const docRef = doc(db, QUOTES_COLLECTION, docId);
    const cleaned = cleanUndefined({
      ...quote,
      tenantId: tenantKey,
      userId,
    });
    await setDoc(docRef, cleaned);

    // Mirror to public tracking index if unauthenticated tracking query is configured
    if (quote.blNo && quote.blNo.trim()) {
      const cleanBl = quote.blNo.trim().toUpperCase();
      const publicRef = doc(db, "public_tracking", cleanBl);
      const cleanedPublic = cleanUndefined({
        id: quote.id,
        ref: quote.ref,
        blNo: quote.blNo,
        company: quote.company || "",
        buyer: quote.buyer || "",
        buyerLoc: quote.buyerLoc || "",
        dest: quote.dest || "",
        cond: quote.cond || "",
        terms: quote.terms || "",
        valid: quote.valid || "",
        date: quote.date || "",
        items: quote.items || [],
        trackingEmail: quote.trackingEmail || "",
        trackingEta: quote.trackingEta || "",
        trackingUpdates: quote.trackingUpdates || [],
        updatedAt: new Date().toISOString(),
      });
      await setDoc(publicRef, cleanedPublic);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete individual Quote records from collection
 */
export async function deleteTenantQuote(
  quoteId: number,
  blNo?: string,
): Promise<void> {
  for (const key of memoryCache.keys()) {
    if (key.startsWith("quotes_")) {
      memoryCache.delete(key);
    }
  }

  // Update all localStorage arrays starting with rems_quotes_
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("rems_quotes_")) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const quotes = JSON.parse(stored);
          if (Array.isArray(quotes)) {
            const filtered = quotes.filter((q: any) => q.id !== quoteId);
            if (filtered.length !== quotes.length) {
              localStorage.setItem(key, JSON.stringify(filtered));
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to delete quote locally:", e);
  }

  if (isQuotaExceeded()) {
    // console.warn("Firestore write skipped: Quota exceeded");
    return;
  }
  const docId = `quote_${quoteId}`;
  const path = `${QUOTES_COLLECTION}/${docId}`;
  try {
    const docRef = doc(db, QUOTES_COLLECTION, docId);
    await deleteDoc(docRef);

    // Clean up public tracker index
    if (blNo && blNo.trim()) {
      const cleanBl = blNo.trim().toUpperCase();
      const publicRef = doc(db, "public_tracking", cleanBl);
      await deleteDoc(publicRef).catch(() => {});
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Public, unauthenticated lookup for direct buyers to track their cargo by B/L ID
 */
export async function getPublicTracking(
  blNo: string,
): Promise<SavedQuote | null> {
  if (!blNo) return null;
  const cleanBl = blNo.trim().toUpperCase();
  const path = `public_tracking/${cleanBl}`;
  try {
    const docRef = doc(db, "public_tracking", cleanBl);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SavedQuote;
    }
    return null;
  } catch (error) {
    console.warn("Public lookup issue or restriction: ", error);
    return null;
  }
}

/**
 * Fetch all workspace licences for Admin portal lookups (e.g. VNP Viren)
 */
export async function getAllLicences(): Promise<LicenceDetails[]> {
  const cached = memoryCache.get("admin_all_licences");
  if (cached) return cached;
  if (isQuotaExceeded()) return [];
  try {
    const snap = await getDocs(collection(db, LICENCES_COLLECTION));
    const list: LicenceDetails[] = [];
    snap.forEach((d) => {
      list.push(d.data() as LicenceDetails);
    });
    memoryCache.set("admin_all_licences", list);
    return list;
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("quota")) setQuotaExceeded(true);
    console.error("Error loading licences for admin: ", err);
    return [];
  }
}

/**
 * Fetch all registered memberships for Admin mapping analytics
 */
export async function getAllMemberships(): Promise<UserMembership[]> {
  const cached = memoryCache.get("admin_all_memberships");
  if (cached) return cached;
  if (isQuotaExceeded()) return [];
  try {
    const snap = await getDocs(collection(db, MEMBERSHIPS_COLLECTION));
    const list: UserMembership[] = [];
    snap.forEach((d) => {
      list.push(d.data() as UserMembership);
    });
    memoryCache.set("admin_all_memberships", list);
    return list;
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("quota")) setQuotaExceeded(true);
    console.error("Error loading memberships for admin: ", err);
    return [];
  }
}

/**
 * Remove a user's membership (Revoke Access)
 */
export async function removeUserAccess(userId: string, unblock = false): Promise<void> {
  const localKey = `rems_membership_${userId}`;
  try {
    localStorage.removeItem(localKey);
  } catch (e) {
    // ignore
  }
  
  if (isQuotaExceeded()) return;
  try {
    const docRef = doc(db, MEMBERSHIPS_COLLECTION, userId);
    await setDoc(docRef, { loginBlocked: !unblock }, { merge: true });
    memoryCache.delete(`membership_${userId}`);
    memoryCache.delete("admin_all_memberships");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MEMBERSHIPS_COLLECTION}/${userId}`);
  }
}

/**
 * Log user login event to Firestore
 */
export async function logUserLogin(
  userId: string,
  userEmail: string | null,
  tenantId: string,
): Promise<void> {
  if (isQuotaExceeded()) {
    return;
  }
  
  const todayDate = new Date().toISOString().split('T')[0];
  const storageKey = `rems_last_login_${userId}`;
  
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const lastLogin = localStorage.getItem(storageKey);
      if (lastLogin === todayDate) {
        return; // Already logged today
      }
    }
  } catch(e) {}

  const timestamp = new Date().toISOString();
  
  // Quietly retrieve client's geolocation via non-blocking API
  let location = "Not Available";
  try {
    const geoRes = await fetch("https://ipapi.co/json/");
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData && geoData.city && geoData.country_name) {
        location = `${geoData.city}, ${geoData.country_name}`;
      }
    }
  } catch (err) {
    try {
      const geoRes = await fetch("https://ipinfo.io/json");
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData && geoData.city && geoData.country) {
          location = `${geoData.city}, ${geoData.country}`;
        }
      }
    } catch (e) {}
  }

  try {
    // 1. Write unique historical log document
    const uniqueLogId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const histDocRef = doc(db, "user_logins", uniqueLogId);
    await setDoc(histDocRef, {
      id: uniqueLogId,
      userId,
      userEmail: userEmail || "Anonymous",
      tenantId,
      timestamp,
      location,
      lastLoginDate: todayDate,
    });

    // 2. Write summary doc for getLoginByUserId lookup compatibility
    const docRef = doc(db, "user_logins", userId);
    await setDoc(docRef, {
      id: userId,
      userId,
      userEmail: userEmail || "Anonymous",
      tenantId,
      timestamp,
      location,
      lastLoginDate: todayDate,
    }, { merge: true });
    
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(storageKey, todayDate);
      }
    } catch(e) {}
  } catch (error: any) {
    if (error?.message?.toLowerCase().includes("quota")) setQuotaExceeded(true);
    console.warn("Log login error (non-blocking):", error);
  }
}

/**
 * Fetch all login audit records for Admin lookups
 */
export async function getAllLogins(): Promise<LoginAudit[]> {
  const cached = memoryCache.get("admin_all_logins");
  if (cached) return cached;
  if (isQuotaExceeded()) return [];
  try {
    const snap = await getDocs(query(collection(db, "user_logins"), limit(100)));
    const list: LoginAudit[] = [];
    snap.forEach((d) => {
      list.push(d.data() as LoginAudit);
    });
    const sorted = list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    memoryCache.set("admin_all_logins", sorted);
    return sorted;
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("quota")) setQuotaExceeded(true);
    console.error("Error loading logins for admin:", err);
    return [];
  }
}

/**
 * Log document generation (PI, CI, PL) activity to Firestore
 */
export async function logDocumentGeneration(
  tenantId: string,
  userId: string,
  docType: "pi" | "ci" | "pl",
  refUrl: string,
): Promise<void> {
  if (isQuotaExceeded()) {
    return;
  }
  const timestamp = new Date().toISOString();
  const rawId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const docRef = doc(db, "document_generations", rawId);
    await setDoc(docRef, {
      id: rawId,
      tenantId: tenantId.trim().toUpperCase(),
      userId,
      docType,
      timestamp,
      ref: refUrl,
    });
  } catch (error: any) {
    if (error?.message?.toLowerCase().includes("quota")) setQuotaExceeded(true);
    console.warn("Log generation error (non-blocking):", error);
  }
}

/**
 * Fetch document generations for a specific Tenant Workspace (Licence)
 */
export async function getTenantGenerationLogs(
  tenantId: string,
): Promise<DocumentGenerationLog[]> {
  if (isQuotaExceeded()) return [];
  try {
    const q = query(
      collection(db, "document_generations"),
      where("tenantId", "==", tenantId.trim().toUpperCase()),
    );
    const snap = await getDocs(q);
    const list: DocumentGenerationLog[] = [];
    snap.forEach((d) => {
      list.push(d.data() as DocumentGenerationLog);
    });
    return list;
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("quota")) setQuotaExceeded(true);
    console.error("Error loading document logs for tenant:", err);
    return [];
  }
}

export async function getLoginByUserId(userId: string): Promise<LoginAudit | null> {
  if (isQuotaExceeded()) return null;
  try {
    const docRef = doc(db, "user_logins", userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as LoginAudit;
    }
    return null;
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("quota")) setQuotaExceeded(true);
    console.error("Error loading login for admin:", err);
    return null;
  }
}

export async function getUserGenerationLogs(userId: string): Promise<DocumentGenerationLog[]> {
  if (isQuotaExceeded()) return [];
  try {
    const q = query(
      collection(db, "document_generations"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    const list: DocumentGenerationLog[] = [];
    snap.forEach((d) => {
      list.push(d.data() as DocumentGenerationLog);
    });
    return list;
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("quota")) setQuotaExceeded(true);
    console.error("Error loading document logs for user:", err);
    return [];
  }
}

/**
 * Fetch all document generations logs across the workspace (Admin Console)
 */
export async function getAllGenerationLogs(): Promise<DocumentGenerationLog[]> {
  const cached = memoryCache.get("admin_all_gen_logs");
  if (cached) return cached;
  if (isQuotaExceeded()) return [];
  try {
    const snap = await getDocs(query(collection(db, "document_generations"), limit(100)));
    const list: DocumentGenerationLog[] = [];
    snap.forEach((d) => {
      list.push(d.data() as DocumentGenerationLog);
    });
    memoryCache.set("admin_all_gen_logs", list);
    return list;
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("quota")) setQuotaExceeded(true);
    console.error("Error loading all document logs for admin:", err);
    return [];
  }
}

/**
 * Convert File to Base64 String
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a File in chunks online to Firestore to bypass 1MB document limit
 */
export async function uploadFileInChunks(
  quoteId: number,
  typeKey: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ fileName: string; fileSize: number }> {
  const base64 = await fileToBase64(file);

  const metadata = {
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type || "application/pdf",
    uploadedAt: new Date().toISOString(),
    quoteId,
    typeKey,
  };

  const fileId = `file_${quoteId}_${typeKey}`;

  // Save to local storage as fallback/primary buffer
  try {
    localStorage.setItem(`rems_file_meta_${fileId}`, JSON.stringify(metadata));
    localStorage.setItem(`rems_file_data_${fileId}`, base64);
  } catch (e) {
    console.error("Local storage file save failed:", e);
  }

  if (isQuotaExceeded()) {
    // console.warn...
    if (onProgress) onProgress(100);
    return { fileName: file.name, fileSize: file.size };
  }

  const chunkSize = 600000; // ~600KB base64 chunk size to fit comfortably in Firestore
  const chunks: string[] = [];
  for (let i = 0; i < base64.length; i += chunkSize) {
    chunks.push(base64.substring(i, i + chunkSize));
  }

  const fileRef = doc(db, "uploaded_files", fileId);

  try {
    await setDoc(fileRef, { ...metadata, chunkCount: chunks.length });

    // Upload each chunk progressively
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunkRef = doc(db, "uploaded_files", fileId, "chunks", `chunk_${idx}`);
      await setDoc(chunkRef, {
        index: idx,
        data: chunks[idx],
      });
      if (onProgress) {
        const pct = Math.round(((idx + 1) / chunks.length) * 100);
        onProgress(pct);
      }
    }
  } catch (e) {
    console.warn("Firestore chunk upload error:", e);
  }

  return { fileName: file.name, fileSize: file.size };
}

/**
 * Download a File from Firestore chunks and trigger browser file saver
 */
export async function downloadFileFromChunks(
  quoteId: number,
  typeKey: string
): Promise<void> {
  const fileId = `file_${quoteId}_${typeKey}`;
  
  // Try loading from localStorage first
  try {
    const metaStr = localStorage.getItem(`rems_file_meta_${fileId}`);
    const dataStr = localStorage.getItem(`rems_file_data_${fileId}`);
    if (metaStr && dataStr) {
      const meta = JSON.parse(metaStr);
      const fileName = meta.fileName || "document.pdf";
      const contentType = meta.contentType || "application/pdf";
      const blob = base64ToBlob(dataStr, contentType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
  } catch (e) {
    console.error("Local storage load failed:", e);
  }

  if (!navigator.onLine) {
    throw new Error("You are offline and the file is not available locally.");
  }
  
  if (isQuotaExceeded()) {
    throw new Error("Cannot download from server: Quota Exceeded and file is not stored locally.");
  }

  const fileRef = doc(db, "uploaded_files", fileId);
  const fileSnap = await getDoc(fileRef);

  if (!fileSnap.exists()) {
    throw new Error("No file uploaded for this document yet.");
  }

  const meta = fileSnap.data();
  const chunkCount = meta.chunkCount || 0;
  const fileName = meta.fileName || "document.pdf";
  const contentType = meta.contentType || "application/pdf";

  // Fetch and reconstruct chunks
  const chunks: string[] = [];
  for (let idx = 0; idx < chunkCount; idx++) {
    const chunkRef = doc(db, "uploaded_files", fileId, "chunks", `chunk_${idx}`);
    const chunkSnap = await getDoc(chunkRef);
    if (chunkSnap.exists()) {
      chunks.push(chunkSnap.data().data || "");
    } else {
      throw new Error(`File chunk ${idx} was not found on the server.`);
    }
  }

  const base64Data = chunks.join("");
  
  try {
    localStorage.setItem(`rems_file_meta_${fileId}`, JSON.stringify(meta));
    localStorage.setItem(`rems_file_data_${fileId}`, base64Data);
  } catch (e) {
    console.warn("Could not cache file locally", e);
  }

  const blob = base64ToBlob(base64Data, contentType);

  // Trigger browser-native save as file
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Check if file has been uploaded online in Firestore
 */
export async function checkIfFileExists(
  quoteId: number,
  typeKey: string
): Promise<boolean> {
  const fileId = `file_${quoteId}_${typeKey}`;
  
  try {
    if (localStorage.getItem(`rems_file_meta_${fileId}`)) {
      return true;
    }
  } catch (e) {}

  if (!navigator.onLine) {
    return false;
  }

  if (isQuotaExceeded()) {
    return false;
  }

  try {
    const fileRef = doc(db, "uploaded_files", fileId);
    const snap = await getDoc(fileRef);
    return snap.exists();
  } catch (e) {
    return false;
  }
}

function base64ToBlob(base64: string, type: string): Blob {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}

/**
 * Synchronize local offline changes to Firestore once the quota is lifted.
 */
export async function syncOfflineDataToCloud(): Promise<void> {
  // Disabled to prevent excessive redundant database writes.
  // All necessary updates are already pushed to Firestore dynamically.
}
export async function syncTenantQuotesBatch(
  tenantId: string,
  userId: string,
  saves: SavedQuote[],
  deletes: number[]
): Promise<void> {
  const tenantKey = tenantId.trim().toUpperCase();
  const localKey = `rems_quotes_${tenantKey}`;

  // Update local storage quotes list first
  try {
    const stored = localStorage.getItem(localKey);
    let quotesList: SavedQuote[] = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(quotesList)) quotesList = [];

    // Apply deletes
    deletes.forEach(qId => {
      quotesList = quotesList.filter(q => q.id !== qId);
    });

    // Apply saves
    saves.forEach(quote => {
      const index = quotesList.findIndex((q) => q.id === quote.id);
      if (index >= 0) {
        quotesList[index] = quote;
      } else {
        quotesList.push(quote);
      }
    });

    localStorage.setItem(localKey, JSON.stringify(quotesList));
  } catch (e) {
    console.error("Failed to sync quotes locally:", e);
  }

  if (isQuotaExceeded()) {
    return;
  }

  try {
    // Process in chunks to avoid Firestore 500-operation limit
    // Each save could be up to 2 operations (quote + public tracking)
    // We'll chunk the operations into smaller arrays.
    
    const BATCH_LIMIT = 200; // max ops per batch to be safe
    let currentBatch = writeBatch(db);
    let opCount = 0;
    
    const commitBatchIfFull = async () => {
      if (opCount >= BATCH_LIMIT) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        opCount = 0;
      }
    };

    // Add deletes to batch
    for (const qId of deletes) {
      const docId = `quote_${qId}`;
      const docRef = doc(db, QUOTES_COLLECTION, docId);
      currentBatch.delete(docRef);
      opCount++;
      await commitBatchIfFull();
    }

    // Add saves to batch
    for (const quote of saves) {
      const docId = `quote_${quote.id}`;
      const docRef = doc(db, QUOTES_COLLECTION, docId);
      const cleaned = cleanUndefined({
        ...quote,
        tenantId: tenantKey,
        userId,
      });
      currentBatch.set(docRef, cleaned);
      opCount++;
      await commitBatchIfFull();

      // Mirror to public tracking index
      if (quote.blNo && quote.blNo.trim()) {
        const cleanBl = quote.blNo.trim().toUpperCase();
        const publicRef = doc(db, "public_tracking", cleanBl);
        const cleanedPublic = cleanUndefined({
          id: quote.id,
          ref: quote.ref,
          blNo: quote.blNo,
          company: quote.company || "",
          buyer: quote.buyer || "",
          buyerLoc: quote.buyerLoc || "",
          dest: quote.dest || "",
          cond: quote.cond || "",
          terms: quote.terms || "",
          valid: quote.valid || "",
          items: quote.items || [],
          updatedAt: new Date().toISOString(),
        });
        currentBatch.set(publicRef, cleanedPublic);
        opCount++;
        await commitBatchIfFull();
      }
    }

    if (opCount > 0) {
      await currentBatch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, QUOTES_COLLECTION);
  }
}


export async function getAllUploadedFiles() {
  if (isQuotaExceeded()) return null;
  try {
    const snap = await getDocs(collection(db, "uploaded_files"));
    const list: any[] = [];
    snap.forEach((d) => {
      list.push(d.data());
    });
    return list;
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("quota")) setQuotaExceeded(true);
    console.error("Error loading uploaded files for admin: ", err);
    throw new Error('Storage read failed');
  }
}

/**
 * Fetch counts of all saved quotes grouped by tenant ID (Admin Console lookup)
 */
export async function getAllQuotesCountByTenant(): Promise<Record<string, number>> {
  const cached = memoryCache.get("admin_all_quotes_count");
  if (cached) return cached;
  if (isQuotaExceeded()) return {};
  try {
    const snap = await getDocs(query(collection(db, "quotes"), limit(100)));
    const counts: Record<string, number> = {};
    snap.forEach((d) => {
      const data = d.data();
      const tenantId = data.tenantId ? String(data.tenantId).trim().toUpperCase() : "";
      if (tenantId) {
        counts[tenantId] = (counts[tenantId] || 0) + 1;
      }
    });
    memoryCache.set("admin_all_quotes_count", counts);
    return counts;
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("quota")) setQuotaExceeded(true);
    console.error("Error loading quotes count for admin: ", err);
    return {};
  }
}
