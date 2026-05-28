import { 
  Commodity, Port, Condition, BagPrices, BagStockItem, 
  DohaImportData, ExpenseItem, SavedQuote, RateRow,
  GrainInventoryItem, InventoryOrder
} from './types';
import { 
  INITIAL_COMMODITIES, INITIAL_PORTS, INITIAL_CONDITIONS, 
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
}

export const loadInitialState = (): AppState => {
  let commodities = loadLS('rems_commodities', INITIAL_COMMODITIES);
  
  // Self-heal: Automatically merge any newly introduced preset commodities (e.g., Spices, Chemicals, Vegetables/Fruits, Tiles)
  // that are not yet in the user's local storage database
  const loadedIds = new Set(commodities.map((c) => c.id));
  const missingPresets = INITIAL_COMMODITIES.filter((item) => !loadedIds.has(item.id));
  if (missingPresets.length > 0) {
    commodities = [...commodities, ...missingPresets];
    saveLS('rems_commodities', commodities);
  }

  const ports = loadLS('rems_ports', INITIAL_PORTS);
  const conditions = loadLS('rems_conditions', INITIAL_CONDITIONS);
  
  let bagPrices = loadLS('rems_bags', INITIAL_BAGS);
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
  // Self-heal: Automatically merge any newly introduced preset packaging inventory that is not yet in the user's local storage database
  const loadedStockIds = new Set(bagStock.map((s) => s.id));
  const missingStockPresets = INITIAL_BAG_STOCK.filter((item) => !loadedStockIds.has(item.id));
  if (missingStockPresets.length > 0) {
    bagStock = [...bagStock, ...missingStockPresets];
    saveLS('rems_bag_stock', bagStock);
  }
  const dohaImport = loadLS('rems_doha_import', INITIAL_DOHA_IMPORT);
  const lineItems = loadLS('rems_line_items', INITIAL_LINE_ITEMS);
  const cfsItems = loadLS('rems_cfs_items', INITIAL_CFS_ITEMS);
  const rateList = loadLS('rems_rates', INITIAL_RATES);
  const savedQuotes = loadLS('rems_saved_quotes_v2', [] as SavedQuote[]);
  
  const companies = loadLS('rems_companies', [] as string[]);
  const buyers = loadLS('rems_buyers', [] as string[]);
  const buyerLocations = loadLS('rems_buyer_locations', [] as string[]);

  const grainInventory = loadLS('rems_grain_inventory', [] as GrainInventoryItem[]);
  const inventoryOrders = loadLS('rems_inventory_orders', [] as InventoryOrder[]);

  return {
    commodities,
    ports,
    conditions,
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
    inventoryOrders
  };
};
