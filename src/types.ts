export interface Commodity {
  id: number;
  name: string;
  exmill: number;
  industry?: string;
}

export interface GrainInventoryItem {
  id: string;
  grainName: string;
  paddyStockTons: number;
  processedRiceTons: number;
  readyBagsCount: number;
  paddySupplierName: string;
  supplierLeadTimeDays: number;
  millingLeadTimeDays: number;
  packingLeadTimeDays: number;
  bagSizeKg: number;
  paddyBagsCount?: number;
  processedRiceBagsCount?: number;
  paddySiloTons?: number;
  processedSiloTons?: number;
  millingProcessType?: 'steam' | 'parboiled' | 'sella_basmati' | 'golden_sella' | 'creamy_sella' | 'other';
}

export interface InventoryOrder {
  id: string;
  grainName: string;
  orderQtyTons: number;
  supplier: string;
  orderDate: string;
  expectedDelivery: string;
  status: 'Pending' | 'In Transit' | 'Received';
  type: 'Paddy' | 'Processed Grain';
}

export type Port = string;

export interface Condition {
  code: string;
  desc: string;
}

export interface BagSizePrice {
  id: string; // unique ID to help with key and updates
  size: number; // in KG
  price: number; // in INR
}

export interface BagPrices {
  [bagType: string]: BagSizePrice[];
}

export interface BagStockItem {
  id: string;
  brand: string;
  pack: string;
  kg: number;
  stock: number;
  supplier: string;
  leadTime: string;
  notes: string;
}

export interface DohaExpenseRow {
  id: string;
  name: string;
  rate: number;
  apply: 'fcl' | 'shipment';
}

export interface DohaImportData {
  fcl: number;
  bagsPerFcl: number;
  dutyPct: number;
  dutyBase: number;
  rows: DohaExpenseRow[];
  bagsManual?: boolean;
  cifRateUsd?: number;
  containerWeightKg?: number;
  bagSizeKg?: number;
  cargoName?: string;
  selectedQuoteRef?: string;
}

export interface ExpenseItem {
  id: string;
  name: string;
  qty: number;
  rate: number;
  gst: number;
  isTransport: boolean;
  apply: 'fcl' | 'bl' | 'shipment';
  receipt?: boolean;
  isCustom?: boolean;
}

export interface PIItem {
  id: number;
  dest: string;
  commodity: string;
  brand: string;
  packed: string;
  size: string;
  master: string;
  crop: string;
  year: string;
  rate: number;
  condition: string;
  paymentTerms: string;
  numFCL: number;
  weightPerContainerKg: number;
  totalWeightKg: number;
  totalBags?: number;

  // Blended Rice specific fields
  blendRice1Name?: string;
  blendRice1Pct?: number;
  blendRice1ExMill?: number;
  blendRice2Name?: string;
  blendRice2Pct?: number;
  blendRice2ExMill?: number;
  blendCookingRemarks?: string;

  // Cost breakdown variables to reconstruct other blends
  bPackaging?: number;
  bTransport?: number;
  bCfsPort?: number;
  bFreight?: number;
  bInsurance?: number;
  dutyPct?: number;
  exrate?: number;
  commission?: number;
}

export interface PIWorkflowStep {
  date: string;
  label: string;
  fileName?: string;
  fileSize?: number;
  fileData?: string; // base64/URL content
}

export interface StageDoc {
  html: string;
  date: string;
  status: string;
  comment: string;
  edited?: boolean;
}

export interface SavedQuote {
  id: number;
  ref: string;
  company: string;
  buyer: string;
  buyerLoc: string;
  dest: string;
  cond: string;
  terms: string;
  valid: string;
  date: string;
  rateIds: number[] | null;
  items: PIItem[];
  html: string;
  piStatus?: string;
  piComment?: string;
  piHtml?: string;
  originalPiHtml?: string;
  piUpdated?: string;
  approvedPiUploaded?: boolean;
  approvedPiFileName?: string;
  workflow?: {
    [stepKey: string]: PIWorkflowStep;
  };
  stageDocs?: {
    [stageKey: string]: StageDoc;
  };
  exporterDetails?: string;
  consigneeDetails?: string;
  notifyParty?: string;
  preCarriageBy?: string;
  placeOfReceipt?: string;
  countryOfOrigin?: string;
  countryOfDestination?: string;
  vesselFlightNo?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  finalDestination?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  contractNo?: string;
  contractDate?: string;
  iecNo?: string;
  gstin?: string;
  shipmentPeriod?: string;
  incoterms?: string;
  paymentTerms?: string;
  bankName?: string;
  bankAcNo?: string;
  bankSwift?: string;
  declarationText?: string;
  authorizedSignatory?: string;
  usdToWordsStyle?: 'intl' | 'lakh';
  amountInWordsManual?: string;
  bagsDetailsList?: Array<{
    containerNo: string;
    sealNo: string;
    lotNo: string;
    packagesCount: number;
    netWt: number;
    grossWt: number;
  }>;
  blNo?: string;
  trackingEmail?: string;
  trackingEta?: string;
  trackingUpdates?: Array<{
    id: string;
    date: string;
    location: string;
    status: string;
    description: string;
    emailSent?: boolean;
    emailRecipient?: string;
  }>;
  buyerPhone?: string;
  containerNo?: string;
  checklistCompleted?: { [key: string]: boolean };
  customChecklistItems?: Array<{ key: string; label: string; desc: string; required: boolean; autoKey?: string; isCustom?: boolean }>;
  itemAttachments?: { [itemKey: string]: Array<{ fileName: string; fileSize: number; dateUploaded: string }> };
  industry?: string;
  documentMakingNotes?: string;
}

export interface RateRow {
  id: number;
  dest: string;
  commodity: string;
  brand: string;
  packed: string;
  size: string;
  master: string;
  crop: 'NEW' | 'OLD';
  year: string;
  rate: number;
  condition: string;
  paymentTerms: string;
  numFCL: number;
  weightPerContainerKg: number;
  totalWeightKg: number;
  date: string;

  buyer?: string;
  buyerLoc?: string;
  consigneeDetails?: string;
  notifyParty?: string;

  // Blended Rice specific fields
  blendRice1Name?: string;
  blendRice1Pct?: number;
  blendRice1ExMill?: number;
  blendRice2Name?: string;
  blendRice2Pct?: number;
  blendRice2ExMill?: number;
  blendCookingRemarks?: string;

  // Cost breakdown variables to reconstruct other blends
  bExMill?: number;
  bPackaging?: number;
  bTransport?: number;
  bCfsPort?: number;
  bFreight?: number;
  bInsurance?: number;
  dutyPct?: number;
  exrate?: number;
  commission?: number;
  transitTime?: string;
}
