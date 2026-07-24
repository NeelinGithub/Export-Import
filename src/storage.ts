import { 
  Commodity, Port, Condition, PaymentTerm, BagPrices, BagStockItem, 
  DohaImportData, ExpenseItem, SavedQuote, RateRow,
  GrainInventoryItem, InventoryOrder, QuoteSequenceConfig
} from './types';
import { 
  INITIAL_COMMODITIES, INITIAL_PORTS, INITIAL_CONDITIONS, INITIAL_PAYMENT_TERMS, 
  INITIAL_BAGS, INITIAL_BAG_STOCK, INITIAL_DOHA_IMPORT, 
  INITIAL_LINE_ITEMS, INITIAL_CFS_ITEMS, INITIAL_RATES 
} from './constants';

export const loadLS = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return fallback;
  }
};

export const saveLS = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error writing localStorage key "${key}":`, error);
  }
};

export interface AppState {
  commodities: Commodity[];
  ports: Port[];
  conditions: Condition[];
  paymentTerms: PaymentTerm[];
  bagPrices: BagPrices;
  bagStock: BagStockItem[];
  dohaImport: DohaImportData;
  lineItems: ExpenseItem[];
  cfsItems: ExpenseItem[];
  rateList: RateRow[];
  savedQuotes: SavedQuote[];
  companies: string[];
  buyers: string[];
  buyerLocations: string[];
  grainInventory: GrainInventoryItem[];
  inventoryOrders: InventoryOrder[];
  quoteConfig?: QuoteSequenceConfig;
}

export const loadInitialState = (): AppState => {
  let commodities = loadLS('rems_commodities', INITIAL_COMMODITIES);
  if (!Array.isArray(commodities)) {
    commodities = INITIAL_COMMODITIES;
  }
  
  // Self-heal: Automatically merge any newly introduced preset commodities (e.g., Spices, Chemicals, Vegetables/Fruits, Tiles)
  // that are not yet in the user's local storage database
  const loadedIds = new Set(commodities.map((c) => c?.id).filter(Boolean));
  const missingPresets = INITIAL_COMMODITIES.filter((item) => item?.id && !loadedIds.has(item.id));
  if (missingPresets.length > 0) {
    commodities = [...commodities, ...missingPresets];
    saveLS('rems_commodities', commodities);
  }

  let ports = loadLS('rems_ports', INITIAL_PORTS);
  if (!Array.isArray(ports)) {
    ports = INITIAL_PORTS;
  }
  
  let conditions = loadLS('rems_conditions', INITIAL_CONDITIONS);
  if (!Array.isArray(conditions)) {
    conditions = INITIAL_CONDITIONS;
  }
  
  // Self-heal: Automatically merge any missing standard Incoterms 2020 rules
  const loadedCondCodes = new Set(conditions.map(c => c?.code).filter(Boolean));
  const missingConds = INITIAL_CONDITIONS.filter(item => item?.code && !loadedCondCodes.has(item.code));
  if (missingConds.length > 0) {
    conditions = [...conditions, ...missingConds];
    saveLS('rems_conditions', conditions);
  }

  let paymentTerms = loadLS('rems_payment_terms', INITIAL_PAYMENT_TERMS);
  if (!Array.isArray(paymentTerms)) {
    paymentTerms = INITIAL_PAYMENT_TERMS;
  }
  
  const loadedPayCodes = new Set(paymentTerms.map(p => p?.code).filter(Boolean));
  const missingPays = INITIAL_PAYMENT_TERMS.filter(item => item?.code && !loadedPayCodes.has(item.code));
  if (missingPays.length > 0) {
    paymentTerms = [...paymentTerms, ...missingPays];
    saveLS('rems_payment_terms', paymentTerms);
  }
  
  let bagPrices = loadLS('rems_bags', INITIAL_BAGS);
  if (!bagPrices || typeof bagPrices !== 'object') {
    bagPrices = INITIAL_BAGS;
  }
  
  // Self-heal: Automatically merge any newly introduced preset packaging categories that are not yet in the user's local storage database
  let updatedBags = { ...INITIAL_BAGS };
  let mergedAnyBags = false;
  Object.keys(INITIAL_BAGS).forEach((cat) => {
    if (bagPrices[cat] !== undefined && Array.isArray(bagPrices[cat]) && bagPrices[cat].length > 0) {
      updatedBags[cat] = bagPrices[cat];
    } else {
      mergedAnyBags = true;
    }
  });
  if (mergedAnyBags) {
    bagPrices = updatedBags;
    saveLS('rems_bags', bagPrices);
  }
  
  let bagStock = loadLS('rems_bag_stock', INITIAL_BAG_STOCK);
  if (!Array.isArray(bagStock)) {
    bagStock = INITIAL_BAG_STOCK;
  }
  
  // Self-heal: Automatically merge any newly introduced preset packaging inventory that is not yet in the user's local storage database
  const loadedStockIds = new Set(bagStock.map((s) => s?.id).filter(Boolean));
  const missingStockPresets = INITIAL_BAG_STOCK.filter((item) => item?.id && !loadedStockIds.has(item.id));
  if (missingStockPresets.length > 0) {
    bagStock = [...bagStock, ...missingStockPresets];
    saveLS('rems_bag_stock', bagStock);
  }
  
  let dohaImport = loadLS('rems_doha_import', INITIAL_DOHA_IMPORT);
  if (!dohaImport || typeof dohaImport !== 'object') {
    dohaImport = INITIAL_DOHA_IMPORT;
  }
  if (!Array.isArray(dohaImport.rows)) {
    dohaImport.rows = INITIAL_DOHA_IMPORT.rows || [];
  }
  
  let lineItems = loadLS('rems_line_items', INITIAL_LINE_ITEMS);
  if (!Array.isArray(lineItems)) {
    lineItems = INITIAL_LINE_ITEMS;
  }
  
  let cfsItems = loadLS('rems_cfs_items', INITIAL_CFS_ITEMS);
  if (!Array.isArray(cfsItems)) {
    cfsItems = INITIAL_CFS_ITEMS;
  }
  
  let rateList = loadLS('rems_rates', INITIAL_RATES);
  if (!Array.isArray(rateList)) {
    rateList = INITIAL_RATES;
  }
  
  let savedQuotes = loadLS('rems_saved_quotes_v2', [] as SavedQuote[]);
  if (!Array.isArray(savedQuotes)) {
    savedQuotes = [];
  }
  
  let companies = loadLS('rems_companies', [] as string[]);
  if (!Array.isArray(companies)) {
    companies = [];
  }
  
  let buyers = loadLS('rems_buyers', [] as string[]);
  if (!Array.isArray(buyers)) {
    buyers = [];
  }
  
  let buyerLocations = loadLS('rems_buyer_locations', [] as string[]);
  if (!Array.isArray(buyerLocations)) {
    buyerLocations = [];
  }
  
  let grainInventory = loadLS('rems_grain_inventory', [] as GrainInventoryItem[]);
  if (!Array.isArray(grainInventory)) {
    grainInventory = [];
  }
  
  let inventoryOrders = loadLS('rems_inventory_orders', [] as InventoryOrder[]);
  if (!Array.isArray(inventoryOrders)) {
    inventoryOrders = [];
  }
  
  let quoteConfig = loadLS('rems_quote_config', { prefix: 'RFQ-', nextNumber: 1000 } as QuoteSequenceConfig);
  if (!quoteConfig || typeof quoteConfig !== 'object') {
    quoteConfig = { prefix: 'RFQ-', nextNumber: 1000 };
  }

  return {
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
    savedQuotes,
    companies,
    buyers,
    buyerLocations,
    grainInventory,
    inventoryOrders,
    quoteConfig
  };
};
