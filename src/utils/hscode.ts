import { collection, doc, setDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isQuotaExceeded } from '../firebase';

/**
 * Utility matching engine to automatically resolve high-accuracy HS Codes 
 * for Grain module varieties (Basmati, Sona Masoori, pulses/legumes) and other categories.
 */

export const FIRESTORE_HS_CODES: { [key: string]: string } = {};

export const loadLocalHsCodes = (industry: string) => {
  for (const key of Object.keys(FIRESTORE_HS_CODES)) {
    delete FIRESTORE_HS_CODES[key];
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keys = Object.keys(localStorage);
      const prefix = `rems_hscode_${industry}_`;
      for (const key of keys) {
        if (key.startsWith(prefix)) {
          const cleanName = key.replace(prefix, "");
          const val = localStorage.getItem(key);
          if (val) {
            FIRESTORE_HS_CODES[cleanName] = val;
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to load custom HS codes from localStorage:", e);
  }
};

const getSyncDateForIndustry = (industry: string): number => {
  const dates: { [key: string]: number } = {
    grain: 1,
    rice_merchant: 1,
    petroleum: 2,
    oil: 2,
    agri_multi: 3,
    spices: 4,
    chemicals: 5,
    polymer: 6,
    cardboard_carton: 7,
    packaging: 7,
    pharma: 8,
    air_cargo: 9,
    metal: 10,
    steel: 10,
    timber: 11,
    apparel: 12,
    textiles: 12,
    coffee_tea: 13,
    rcn: 14,
    nuts: 15,
    salts: 16,
    cotton_yarn: 17,
    sugar: 18,
    vegetables_fruits: 19,
    generic: 20
  };
  return dates[industry] || 25; // Default to 25th if not specified
};

// We change this to an async one-time sync function rather than a listener
export const subscribeToHsCodes = (industry: string) => {
  loadLocalHsCodes(industry);

  if (isQuotaExceeded()) {
    // console.warn("Firestore subscription skipped: Quota exceeded");
    return () => {}; // return empty unsubscribe function for backwards compatibility
  }

  const syncMonthly = async () => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      
      const today = new Date();
      const currentDay = today.getDate();
      const targetDay = getSyncDateForIndustry(industry);
      
      const syncKeyMonth = `${today.getFullYear()}_${today.getMonth()}_${industry}`;
      const lastSyncStr = localStorage.getItem(`rems_hssync_${industry}`);
      
      // If already synced this month, skip fetching
      if (lastSyncStr === syncKeyMonth) {
         return;
      }
      
      const hasEverSynced = lastSyncStr !== null;
      
      // Sync only if we've reached or passed the target day for this month, or if it's the first time ever
      if (!hasEverSynced || currentDay >= targetDay) {
        const querySnapshot = await getDocs(collection(db, `hs_codes_${industry}`));
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.itemName && data.hsCode) {
            FIRESTORE_HS_CODES[data.itemName] = data.hsCode;
            try {
              localStorage.setItem(`rems_hscode_${industry}_${data.itemName}`, data.hsCode);
            } catch (e) {}
          }
        });
        
        // Mark as synced for this month
        localStorage.setItem(`rems_hssync_${industry}`, syncKeyMonth);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `hs_codes_${industry}`);
    }
  };

  // Run the sync asynchronously
  syncMonthly();

  return () => {}; // return empty unsubscribe function
};

export const saveCustomHsCode = async (industry: string, itemName: string, hsCode: string) => {
  if (!industry || !itemName || !hsCode) return;
  const cleanName = itemName.toUpperCase().replace(/[^A-Z0-50%+\-\s]/g, '').trim();
  
  // Save locally first
  FIRESTORE_HS_CODES[cleanName] = hsCode;
  try {
    localStorage.setItem(`rems_hscode_${industry}_${cleanName}`, hsCode);
  } catch (e) {}

  if (isQuotaExceeded()) {
    // console.warn");
    return;
  }

  const id = cleanName.replace(/[^a-zA-Z0-9_\-\:]/g, '_');
  try {
    await setDoc(doc(db, `hs_codes_${industry}`, id), {
      itemName: cleanName,
      hsCode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `hs_codes_${industry}/${id}`);
  }
};

export const GRAIN_HS_CODES: { [key: string]: string } = {
  // Rice Categories (Chapter 1006)
  "SONA MASOORI STEAM RICE": "1006.3010",
  "SONA MASOORI PARBOILED RICE": "1006.3010",
  "SONA MASOORI CREAMY SELLA RICE": "1006.3010",
  "IR-64 PARBOILED RICE": "1006.3010",
  "PR-11 STEAM RICE": "1006.3010",
  "PR-11 SELLA RICE": "1006.3010",
  "POONI PARBOILED RICE": "1006.3010",
  "JEERAKASALA RICE": "1006.3010",
  "PUFFED RICE": "1904.1020",
  "1401 STEAM BASMATI RICE": "1006.3020",
  "1401 CREAMY SELLA BASMATI RICE": "1006.3020",
  "1401 GOLDEN SELLA BASMATI RICE": "1006.3020",
  "1509 STEAM BASMATI RICE": "1006.3020",
  "1509 CREAMY SELLA BASMATI RICE": "1006.3020",
  "1509 GOLDEN SELLA BASMATI RICE": "1006.3020",
  "1121 STEAM BASMATI RICE": "1006.3020",
  "1121 CREAMY SELLA BASMATI RICE": "1006.3020",
  "1121 GOLDEN SELLA BASMATI RICE": "1006.3020",
  "1718 STEAM BASMATI RICE": "1006.3020",
  "1718 CREAMY SELLA BASMATI RICE": "1006.3020",
  "INDIAN STEAM BASMATI RICE": "1006.3020",
  "SUGHANDA SELLA RICE": "1006.3020",
  "SUGANDHA CREAMY SELLA BASMATI RICE": "1006.3020",
  "SUGANDHA GOLDEN SELLA BASMATI RICE": "1006.3020",
  "50% 1121 + 50% SUGHANDA SELLA": "1006.3020",
  "BLENDED (MIX) RICE": "1006.3010",

  // Pulses and Beans (Chapter 0713)
  "KABULI CHANA": "0713.2000",
  "CHICKPEAS": "0713.2000",
  "BLACK CHICKPEAS": "0713.2000",
  "BENGAL GRAM": "0713.2000",
  "MASOOR DAL": "0713.4000",
  "RED LENTILS": "0713.4000",
  "LENTILS": "0713.4000",
  "TUR DAL": "0713.6000",
  "ARHAR DAL": "0713.6000",
  "PIGEON PEAS": "0713.6000",
  "MOONG DAL": "0713.3100",
  "MUNG BEANS": "0713.3100",
  "GREEN MOONG": "0713.3100",
  "URAD DAL": "0713.3100",
  "BLACK GRAM": "0713.3100",
  "BLACK MATPE": "0713.3100",
  "MATAR": "0713.1000",
  "GREEN PEAS": "0713.1000",
  "WHITE PEAS": "0713.1000",
  "RAJMA": "0713.3300",
  "KIDNEY BEANS": "0713.3300",
  "COWPEAS": "0713.3500",
  "LOBIA": "0713.3500",
};

export const getHsCodeForCommodity = (name: string): string => {
  if (!name) return "1006.3010";
  const cleanName = name.toUpperCase().replace(/[^A-Z0-50%+\-\s]/g, '').trim();

  // Try dynamic firestore lookup first
  if (FIRESTORE_HS_CODES[cleanName]) {
    return FIRESTORE_HS_CODES[cleanName];
  }

  // Try exact lookup first
  if (GRAIN_HS_CODES[cleanName]) {
    return GRAIN_HS_CODES[cleanName];
  }

  // Fallbacks by matching words
  if (cleanName.includes("BASMATI")) {
    return "1006.3020"; // Basmati Rice
  }
  if (cleanName.includes("SONA MASOORI") || cleanName.includes("SONA MASURI")) {
    return "1006.3010"; // Sona Masoori Rice
  }
  if (cleanName.includes("IR-64") || cleanName.includes("IR64") || cleanName.includes("PR-11") || cleanName.includes("PR11") || cleanName.includes("POONI") || cleanName.includes("JEERAKASALA")) {
    return "1006.3010"; // Typical Non-Basmati
  }
  if (cleanName.includes("RICE") || cleanName.includes("PADDY")) {
    return "1006.3010"; // Default Semi-milled/Milled Rice
  }

  // Pulses falling under Chapter 0713
  if (cleanName.includes("CHANA") || cleanName.includes("CHICKPEA") || cleanName.includes("KABULI") || cleanName.includes("GRAM")) {
    return "0713.2000"; // Chickpeas
  }
  if (cleanName.includes("MASOOR") || cleanName.includes("LENTIL") || cleanName.includes("RED LENTIL")) {
    return "0713.4000"; // Lentils
  }
  if (cleanName.includes("TUR") || cleanName.includes("ARHAR") || cleanName.includes("PIGEON PEA")) {
    return "0713.6000"; // Pigeon Peas
  }
  if (cleanName.includes("MOONG") || cleanName.includes("MUNG")) {
    return "0713.3100"; // Black/mung gram (Moong Dal)
  }
  if (cleanName.includes("URAD") || cleanName.includes("BLACK MATPE")) {
    return "0713.3100"; // Black gram / Urad dal
  }
  if (cleanName.includes("MATAR") || cleanName.includes("PEAS")) {
    return "0713.1000"; // Peas
  }
  if (cleanName.includes("RAJMA") || cleanName.includes("KIDNEY BEAN") || cleanName.includes("KIDNEY")) {
    return "0713.3300"; // Kidney beans
  }
  if (cleanName.includes("COWPEA") || cleanName.includes("LOBIA")) {
    return "0713.3500"; // Cowpeas
  }
  if (cleanName.includes("PULSE")) {
    return "0713.9000"; // Other pulses
  }

  // Spices (Chapter 09)
  if (cleanName.includes("CHILI") || cleanName.includes("CHILLI")) {
    return "0904.2211"; // Red Chili
  }
  if (cleanName.includes("PEPPER")) {
    return "0904.1100"; // Pepper
  }
  if (cleanName.includes("CARDAMOM")) {
    return "0908.3110"; // Cardamom
  }
  if (cleanName.includes("CUMIN") || cleanName.includes("JEERA")) {
    return "0909.3119"; // Cumin seeds (Jeera)
  }
  if (cleanName.includes("CORIANDER")) {
    return "0909.2110"; // Coriander seeds or powder
  }
  if (cleanName.includes("TURMERIC") || cleanName.includes("HALDI")) {
    return "0910.3020"; // Turmeric
  }
  if (cleanName.includes("FENNEL") || cleanName.includes("SAUNF")) {
    return "0909.6139"; // Fennel seeds
  }

  // Salts / Chemicals
  if (cleanName.includes("SALT") || cleanName.includes("SODIUM CHLORIDE")) {
    return "2501.0020"; // Refined common salt
  }
  if (cleanName.includes("SODA") || cleanName.includes("CAUSTIC")) {
    return "2815.1100"; // Caustic soda
  }
  if (cleanName.includes("ACETIC")) {
    return "2915.2100"; // Acetic Acid
  }
  if (cleanName.includes("BENZENE")) {
    return "2902.2000"; // Benzene
  }
  if (cleanName.includes("SILICA")) {
    return "2811.2200"; // Silica
  }
  if (cleanName.includes("PEROXIDE")) {
    return "2847.0000"; // Hydrogen peroxide
  }

  // Vegetables / Fruits (Chapters 07 and 08)
  if (cleanName.includes("BANANA")) {
    return "0803.9010"; // Banana
  }
  if (cleanName.includes("MANGO")) {
    return "0804.5020"; // Mango
  }
  if (cleanName.includes("GRAPE")) {
    return "0806.1000"; // Grape
  }
  if (cleanName.includes("ONION")) {
    return "0703.1010"; // Onion
  }
  if (cleanName.includes("ORANGE")) {
    return "0805.1000"; // Orange
  }
  if (cleanName.includes("POMEGRANATE")) {
    return "0810.9010"; // Pomegranate
  }
  if (cleanName.includes("POTATO")) {
    return "0701.9000"; // Potato
  }

  // Ceramics & Granite (Chapter 69, 68)
  if (cleanName.includes("TILE") || cleanName.includes("PORCELAIN") || cleanName.includes("VITRIFIED")) {
    return "6907.2100"; // Ceramic tiles
  }
  if (cleanName.includes("GRANITE")) {
    return "6802.2300"; // Granite slabs
  }

  return "1006.3010"; // Default safe grain fallback
};
