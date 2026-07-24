export interface QuoteSequenceConfig {
  prefix: string;
  nextNumber: number;
}

export interface Commodity {
  id: number;
  name: string;
  exmill: number;
  industry?: string;
}

export interface GrainInventoryItem {
  id: string;
  grainName: string;
  industry?: string;
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
  millingProcessType?:
    | "steam"
    | "parboiled"
    | "sella_basmati"
    | "golden_sella"
    | "creamy_sella"
    | "other";
}

export interface InventoryOrder {
  id: string;
  grainName: string;
  industry?: string;
  orderQtyTons: number;
  supplier: string;
  orderDate: string;
  expectedDelivery: string;
  status: "Pending" | "In Transit" | "Received";
  type: "Paddy" | "Processed Grain";
}

export type Port = string;

export interface Condition {
  code: string;
  desc: string;
}

export interface PaymentTerm {
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
  piDeductions?: Record<string, number>; // Maps PI quote ID (e.g. "quote_123") to quantity of bags deducted
}

export interface DohaExpenseRow {
  id: string;
  name: string;
  rate: number;
  apply: "fcl" | "shipment";
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
  bagType?: string;

  // Ex-Mill to CIF Build State
  calcMode?: "direct_cif" | "exmill_build";
  exMillRsPerKg?: number;
  packingRsPerKg?: number;
  inlandRsPerKg?: number;
  usdInrRate?: number;
  freightUsdPerFcl?: number;
}

export interface ExpenseItem {
  id: string;
  name: string;
  qty: number;
  rate: number;
  gst: number;
  isTransport: boolean;
  apply: "fcl" | "bl" | "shipment";
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
  containerSize?: "20ft" | "40ft";
  totalBags?: number;
  marking?: string;
  hsCode?: string;
  prodCode?: string;

  fobRate?: number;
  quantity?: number;

  // Blended Rice specific fields
  blendRice1Name?: string;
  blendRice1Pct?: number;
  blendRice1ExMill?: number;
  blendRice2Name?: string;
  blendRice2Pct?: number;
  blendRice2ExMill?: number;
  blendRice3Name?: string;
  blendRice3Pct?: string | number;
  blendRice3ExMill?: number;
  blendCookingRemarks?: string;

  // RCN properties
  rcnOutturn?: string;
  rcnNutCount?: string;
  rcnMoisture?: string;
  rcnDryingCost?: string;
  rcnQualityInspectionCost?: string;
  rcnImportExportTrackingId?: string;


  // Cost breakdown variables to reconstruct other blends
  bPackaging?: number;
  bTransport?: number;
  bCfsPort?: number;
  bFreight?: number;
  bInsurance?: number;
  dutyPct?: number;
  exrate?: number;
  commission?: number;
  transitTime?: string;
  industry?: string;

  // Oil/Pallet specific fields
  oilPricingMode?: string;
  oilUseBox?: string;
  oilPiecesPerBox?: number;
  oilBoxPrice?: number;
  totalBottlesPerFcl?: number;
  manualBottles?: string;
  totalBoxesPerFcl?: number;
  palletEnabled?: boolean;
  boxesPerPallet?: number;
  palletsPerFcl?: number;
  palletPackingInr?: number;
  ratePerKl?: number;
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

export interface PaymentTrackerData {
  enabled: boolean;
  shippedDate: string;
  paymentDueDate?: string;
  paymentTermsDays: number;
  expectedAmount: number;
  receivedAmount?: number;
  usdRateAtShipment: number;   // e.g. 83.50 INR per USD
  usdRateAtPayment?: number;
  paymentDate?: string;
  status: "pending" | "received" | "overdue" | "on_ship" | "reached_dest" | "payment_pending" | "payment_received" | string;
  bankReference?: string;
  history?: Array<{
    date: string;
    rate: number;
    notes?: string;
  }>;
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
  usdToWordsStyle?: "intl" | "lakh";
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
  paymentTracker?: PaymentTrackerData;
  customChecklistItems?: Array<{
    key: string;
    label: string;
    desc: string;
    required: boolean;
    autoKey?: string;
    isCustom?: boolean;
  }>;
  itemAttachments?: {
    [itemKey: string]: Array<{
      fileName: string;
      fileSize: number;
      dateUploaded: string;
    }>;
  };
  industry?: string;
  documentMakingNotes?: string;
  companyContact?: string;
  documentRemarks?: string;
  signatureImageUrl?: string;
  bankDetails?: string;
  isPaidCredit?: boolean;
}

export interface RateRow {
  id: number;
  industry?: string;
  dest: string;
  commodity: string;
  brand: string;
  packed: string;
  size: string;
  master: string;
  crop: "NEW" | "OLD";
  year: string;
  rate: number;
  condition: string;
  paymentTerms: string;
  numFCL: number;
  weightPerContainerKg: number;
  totalWeightKg: number;
  containerSize?: "20ft" | "40ft";
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
  blendRice3Name?: string;
  blendRice3Pct?: string | number;
  blendRice3ExMill?: number;
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
  baseCurrency?: string;

  // RCN RateRow fields
  rcnOutturn?: string;
  rcnNutCount?: string;
  rcnMoisture?: string;
  rcnImportExportTrackingId?: string;
  isPaidCredit?: boolean;

  // Oil/Pallet specific fields
  oilPricingMode?: string;
  oilUseBox?: string;
  oilPiecesPerBox?: number;
  oilBoxPrice?: number;
  totalBottlesPerFcl?: number;
  manualBottles?: string;
  totalBoxesPerFcl?: number;
  palletEnabled?: boolean;
  boxesPerPallet?: number;
  palletsPerFcl?: number;
  palletPackingInr?: number;
  ratePerKl?: number;
}
