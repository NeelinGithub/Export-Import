import { 
  db, OperationType, handleFirestoreError 
} from '../firebase';
import { 
  doc, setDoc, getDoc, getDocs, deleteDoc, collection, query, where, DocumentData, onSnapshot 
} from 'firebase/firestore';
import { 
  SavedQuote, Commodity, Port, Condition, BagPrices, BagStockItem, DohaImportData, ExpenseItem, RateRow,
  GrainInventoryItem, InventoryOrder
} from '../types';

export interface UserProfileData {
  commodities: Commodity[];
  ports: Port[];
  conditions: Condition[];
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

function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
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
  role: 'owner' | 'member';
  joinedAt: string;
  companyAName?: string;
  companyATenantId?: string;
  companyAApproved?: boolean;
  companyBName?: string;
  companyBTenantId?: string;
  companyBApproved?: boolean;
}

export interface LicenceDetails {
  tenantId: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: string;
  approved?: boolean;
  otpEnabled?: boolean;
  otpMethod?: 'email' | 'whatsapp' | 'disabled';
  industry?: 'grain' | 'tiles' | 'generic' | 'spices' | 'chemicals' | 'salts' | 'vegetables_fruits';
  allowedModules?: string[];
  planId?: 'standard' | 'organization' | 'enterprise';
  planPriceCustom?: number;
  logoText?: string;
  logoBase64?: string;
  piLimitDay?: number;
  piLimitMonth?: number;
  piLimitYear?: number;
  ciLimitDay?: number;
  ciLimitMonth?: number;
  ciLimitYear?: number;
  plLimitDay?: number;
  plLimitMonth?: number;
  plLimitYear?: number;
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
  docType: 'pi' | 'ci' | 'pl';
  timestamp: string;
  ref: string;
}

const MEMBERSHIPS_COLLECTION = 'user_memberships';
const LICENCES_COLLECTION = 'licences';
const PROFILE_COLLECTION = 'tenant_profiles';
const QUOTES_COLLECTION = 'quotes';

/**
 * Fetch or automatically initialize user membership mapping them to a Tenant ID (Licence)
 */
export async function getOrCreateUserMembership(
  userId: string, 
  userEmail: string | null
): Promise<UserMembership> {
  const path = `${MEMBERSHIPS_COLLECTION}/${userId}`;
  try {
    const docRef = doc(db, MEMBERSHIPS_COLLECTION, userId);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      return snap.data() as UserMembership;
    }

    // Default: Auto-create a custom Personal Licence for the new user
    const defaultTenantId = `LIC-${userId.substring(0, 8).toUpperCase()}`;
    const defaultMembership: UserMembership = {
      userId,
      userEmail: userEmail || '',
      tenantId: defaultTenantId,
      role: 'owner',
      joinedAt: new Date().toISOString()
    };

    // Save membership
    await setDoc(docRef, defaultMembership);

    // Create corresponding default Licence record
    const licenceRef = doc(db, LICENCES_COLLECTION, defaultTenantId);
    const defaultLicence: LicenceDetails = {
      tenantId: defaultTenantId,
      name: 'Personal Space',
      ownerId: userId,
      ownerEmail: userEmail || '',
      createdAt: new Date().toISOString(),
      approved: true,
      otpEnabled: false,
      otpMethod: 'email',
      industry: 'grain',
      allowedModules: ['rate_calc']
    };
    await setDoc(licenceRef, cleanUndefined(defaultLicence), { merge: true });

    return defaultMembership;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    // Fallback if permission or connection error (return in-memory defaults)
    return {
      userId,
      userEmail: userEmail || '',
      tenantId: `LIC-${userId.substring(0, 8).toUpperCase()}`,
      role: 'owner',
      joinedAt: new Date().toISOString()
    };
  }
}

/**
 * Update an existing user's membership (e.g., when they join a shared Licence)
 */
export async function updateUserMembership(
  userId: string, 
  userEmail: string | null,
  tenantId: string, 
  role: 'owner' | 'member'
): Promise<void> {
  const path = `${MEMBERSHIPS_COLLECTION}/${userId}`;
  try {
    const docRef = doc(db, MEMBERSHIPS_COLLECTION, userId);
    const membershipData = {
      userId,
      userEmail: userEmail || '',
      tenantId: tenantId.trim().toUpperCase(),
      role,
      joinedAt: new Date().toISOString()
    };
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
  data: Partial<UserMembership>
): Promise<void> {
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
export async function getLicenceDetails(tenantId: string): Promise<LicenceDetails | null> {
  const path = `${LICENCES_COLLECTION}/${tenantId}`;
  try {
    const docRef = doc(db, LICENCES_COLLECTION, tenantId.trim().toUpperCase());
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as LicenceDetails;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Real-time observer for User Membership details
 */
export function subscribeToUserMembership(
  userId: string,
  callback: (membership: UserMembership | null) => void
): () => void {
  const docRef = doc(db, MEMBERSHIPS_COLLECTION, userId);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as UserMembership);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error in real-time membership listener:", error);
  });
}

/**
 * Real-time observer for Licence details modifications
 */
export function subscribeToLicenceDetails(
  tenantId: string, 
  callback: (licence: LicenceDetails | null) => void
): () => void {
  const docRef = doc(db, LICENCES_COLLECTION, tenantId.trim().toUpperCase());
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as LicenceDetails);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error in real-time licence listener:", error);
  });
}

/**
 * Save / update official License details
 */
export async function saveLicenceDetails(licence: LicenceDetails): Promise<void> {
  const path = `${LICENCES_COLLECTION}/${licence.tenantId}`;
  try {
    const docRef = doc(db, LICENCES_COLLECTION, licence.tenantId.trim().toUpperCase());
    const cleaned = cleanUndefined(licence);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save user profile state consisting of all directories, stocks, and charges at the Tenant level
 */
export async function saveTenantProfile(tenantId: string, data: UserProfileData): Promise<void> {
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
export async function getTenantProfile(tenantId: string): Promise<UserProfileData | null> {
  const path = `${PROFILE_COLLECTION}/${tenantId}`;
  try {
    const docRef = doc(db, PROFILE_COLLECTION, tenantId.trim().toUpperCase());
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfileData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Fetch all compiled export quotes for the Tenant
 */
export async function getTenantQuotes(tenantId: string): Promise<SavedQuote[]> {
  const path = QUOTES_COLLECTION;
  try {
    const q = query(
      collection(db, QUOTES_COLLECTION), 
      where('tenantId', '==', tenantId.trim().toUpperCase())
    );
    const snap = await getDocs(q);
    const quotes: SavedQuote[] = [];
    snap.forEach((d) => {
      const docData = d.data();
      // Exclude mapping field internally to fit standard SavedQuote
      const { tenantId: _, ...savedProps } = docData;
      quotes.push(savedProps as SavedQuote);
    });
    return quotes;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

/**
 * Save single Quote Document synchronized to cloud under a Tenant ID
 */
export async function saveTenantQuote(
  tenantId: string, 
  userId: string,
  quote: SavedQuote
): Promise<void> {
  const docId = `quote_${quote.id}`;
  const path = `${QUOTES_COLLECTION}/${docId}`;
  try {
    const docRef = doc(db, QUOTES_COLLECTION, docId);
    const cleaned = cleanUndefined({
      ...quote,
      tenantId: tenantId.trim().toUpperCase(),
      userId
    });
    await setDoc(docRef, cleaned);

    // Mirror to public tracking index if unauthenticated tracking query is configured
    if (quote.blNo && quote.blNo.trim()) {
      const cleanBl = quote.blNo.trim().toUpperCase();
      const publicRef = doc(db, 'public_tracking', cleanBl);
      const cleanedPublic = cleanUndefined({
        id: quote.id,
        ref: quote.ref,
        blNo: quote.blNo,
        company: quote.company || '',
        buyer: quote.buyer || '',
        buyerLoc: quote.buyerLoc || '',
        dest: quote.dest || '',
        cond: quote.cond || '',
        terms: quote.terms || '',
        valid: quote.valid || '',
        date: quote.date || '',
        items: quote.items || [],
        trackingEmail: quote.trackingEmail || '',
        trackingEta: quote.trackingEta || '',
        trackingUpdates: quote.trackingUpdates || [],
        updatedAt: new Date().toISOString()
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
export async function deleteTenantQuote(quoteId: number, blNo?: string): Promise<void> {
  const docId = `quote_${quoteId}`;
  const path = `${QUOTES_COLLECTION}/${docId}`;
  try {
    const docRef = doc(db, QUOTES_COLLECTION, docId);
    await deleteDoc(docRef);

    // Clean up public tracker index
    if (blNo && blNo.trim()) {
      const cleanBl = blNo.trim().toUpperCase();
      const publicRef = doc(db, 'public_tracking', cleanBl);
      await deleteDoc(publicRef).catch(() => {});
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Public, unauthenticated lookup for direct buyers to track their cargo by B/L ID
 */
export async function getPublicTracking(blNo: string): Promise<SavedQuote | null> {
  if (!blNo) return null;
  const cleanBl = blNo.trim().toUpperCase();
  const path = `public_tracking/${cleanBl}`;
  try {
    const docRef = doc(db, 'public_tracking', cleanBl);
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
  try {
    const snap = await getDocs(collection(db, LICENCES_COLLECTION));
    const list: LicenceDetails[] = [];
    snap.forEach(d => {
      list.push(d.data() as LicenceDetails);
    });
    return list;
  } catch (err) {
    console.error("Error loading licences for admin: ", err);
    return [];
  }
}

/**
 * Fetch all registered memberships for Admin mapping analytics
 */
export async function getAllMemberships(): Promise<UserMembership[]> {
  try {
    const snap = await getDocs(collection(db, MEMBERSHIPS_COLLECTION));
    const list: UserMembership[] = [];
    snap.forEach(d => {
      list.push(d.data() as UserMembership);
    });
    return list;
  } catch (err) {
    console.error("Error loading memberships for admin: ", err);
    return [];
  }
}

/**
 * Log user login event to Firestore
 */
export async function logUserLogin(
  userId: string,
  userEmail: string | null,
  tenantId: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  const rawId = `login_${Date.now()}_${userId.substring(0, 6)}`;
  try {
    const docRef = doc(db, 'user_logins', rawId);
    await setDoc(docRef, {
      id: rawId,
      userId,
      userEmail: userEmail || 'Anonymous',
      tenantId,
      timestamp
    });
  } catch (error) {
    console.warn("Log login error (non-blocking):", error);
  }
}

/**
 * Fetch all login audit records for Admin lookups
 */
export async function getAllLogins(): Promise<LoginAudit[]> {
  try {
    const snap = await getDocs(collection(db, 'user_logins'));
    const list: LoginAudit[] = [];
    snap.forEach(d => {
      list.push(d.data() as LoginAudit);
    });
    return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (err) {
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
  docType: 'pi' | 'ci' | 'pl',
  refUrl: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  const rawId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const docRef = doc(db, 'document_generations', rawId);
    await setDoc(docRef, {
      id: rawId,
      tenantId: tenantId.trim().toUpperCase(),
      userId,
      docType,
      timestamp,
      ref: refUrl
    });
  } catch (error) {
    console.warn("Log generation error (non-blocking):", error);
  }
}

/**
 * Fetch document generations for a specific Tenant Workspace (Licence)
 */
export async function getTenantGenerationLogs(tenantId: string): Promise<DocumentGenerationLog[]> {
  try {
    const q = query(
      collection(db, 'document_generations'),
      where('tenantId', '==', tenantId.trim().toUpperCase())
    );
    const snap = await getDocs(q);
    const list: DocumentGenerationLog[] = [];
    snap.forEach(d => {
      list.push(d.data() as DocumentGenerationLog);
    });
    return list;
  } catch (err) {
    console.error("Error loading document logs for tenant:", err);
    return [];
  }
}

/**
 * Fetch all document generations logs across the workspace (Admin Console)
 */
export async function getAllGenerationLogs(): Promise<DocumentGenerationLog[]> {
  try {
    const snap = await getDocs(collection(db, 'document_generations'));
    const list: DocumentGenerationLog[] = [];
    snap.forEach(d => {
      list.push(d.data() as DocumentGenerationLog);
    });
    return list;
  } catch (err) {
    console.error("Error loading document logs for admin:", err);
    return [];
  }
}
