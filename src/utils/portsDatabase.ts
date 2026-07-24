/**
 * Pre-defined, ready-made database of major commercial seaports by country.
 * Perfect for international grain and rice trade logistics.
 * Can be synced and updated periodically.
 */
export const READY_MADE_PORTS: Record<string, string[]> = {
  "INDIA": [
    "MUNDRA",
    "NHAVA SHEVA (JNPT)",
    "HAZIRA",
    "KANDLA",
    "CHENNAI",
    "KAKINADA",
    "KOLKATA",
    "COCHIN",
    "TUTICORIN",
    "PIPAVAV",
    "VISAKHAPATNAM",
    "MANGALORE",
    "MORMUGAO"
  ],
  "UAE": [
    "JEBEL ALI",
    "SHARJAH",
    "KHOR FAKKAN",
    "PORT KHALID",
    "FUJAIRAH",
    "ABU DHABI (KHALIFA)",
    "AJMAN"
  ],
  "OMAN": [
    "SOHAR",
    "SALALAH",
    "MUSCAT (PORT SULTAN QABOOS)",
    "DUQM"
  ],
  "QATAR": [
    "HAMAD",
    "DOHA",
    "MESAIEED",
    "RAS LAFFAN"
  ],
  "SAUDI ARABIA": [
    "DAMMAM",
    "JEDDAH (ISLAMIC PORT)",
    "RIYADH (DRY PORT)",
    "JUBAIL",
    "YANBU",
    "KING ABDULLAH PORT"
  ],
  "BAHRAIN": [
    "MANAMA (KHALIFA BIN SALMAN)"
  ],
  "KUWAIT": [
    "SHUWAIKH",
    "SHUAIBA"
  ],
  "CHINA": [
    "SHANGHAI",
    "NINGBO-ZHOUSHAN",
    "SHENZHEN",
    "GUANGZHOU",
    "QINGDAO",
    "TIANJIN",
    "XIAMEN",
    "DALIAN"
  ],
  "USA": [
    "NEWARK",
    "NEW YORK",
    "HOUSTON",
    "LOS ANGELES",
    "LONG BEACH",
    "SAVANNAH",
    "SEATTLE",
    "MIAMI"
  ],
  "VIETNAM": [
    "HO CHI MINH (CAT LAI)",
    "HAI PHONG",
    "DA NANG",
    "CAI MEP"
  ],
  "NETHERLANDS": [
    "ROTTERDAM",
    "AMSTERDAM"
  ],
  "GERMANY": [
    "HAMBURG",
    "BREMERHAVEN",
    "WILHELMSHAVEN"
  ],
  "UK": [
    "LONDON",
    "FELIXSTOWE",
    "SOUTHAMPTON",
    "LIVERPOOL"
  ],
  "CANADA": [
    "VANCOUVER",
    "TORONTO",
    "MONTREAL",
    "HALIFAX"
  ],
  "SINGAPORE": [
    "SINGAPORE HUB"
  ],
  "SOUTH AFRICA": [
    "DURBAN",
    "CAPE TOWN",
    "PORT ELIZABETH",
    "RICHARDS BAY"
  ],
  "KENYA": [
    "MOMBASA"
  ],
  "EGYPT": [
    "ALEXANDRIA",
    "PORT SAID",
    "DAMIETTA",
    "SUEZ"
  ],
  "SPAIN": [
    "VALENCIA",
    "BARCELONA",
    "ALGECIRAS",
    "BILBAO"
  ],
  "ITALY": [
    "GENOA",
    "TRIESTE",
    "GIOIA TAURO",
    "VENICE"
  ],
  "BELGIUM": [
    "ANTWERP",
    "ZEEBRUGGE"
  ],
  "THAILAND": [
    "LAEM CHABANG",
    "BANGKOK"
  ],
  "MALAYSIA": [
    "PORT KLANG",
    "TANJUNG PELEPAS",
    "PENANG"
  ],
  "INDONESIA": [
    "JAKARTA (TANJUNG PRIOK)",
    "SURABAYA",
    "MEDAN"
  ],
  "BANGLADESH": [
    "CHITTAGONG",
    "MONGLA",
    "PAYRA"
  ],
  "SRI LANKA": [
    "COLOMBO",
    "HAMBANTOTA",
    "TRINCOMALEE"
  ],
  "PHILIPPINES": [
    "MANILA",
    "CEBU",
    "DAVAO"
  ],
  "NIGERIA": [
    "LAGOS (APAPA)",
    "TIN CAN ISLAND",
    "ONNE"
  ],
  "GHANA": [
    "TEMA",
    "TAKORADI"
  ],
  "SENEGAL": [
    "DAKAR"
  ],
  "TOGO": [
    "LOME"
  ]
};

/**
 * Returns a list of all countries in the ready-made database
 */
export function getReadyMadeCountries(): string[] {
  return Object.keys(READY_MADE_PORTS).sort();
}

/**
 * Returns the list of sea ports for a given country
 */
export function getReadyMadePortsForCountry(country: string): string[] {
  return READY_MADE_PORTS[country.toUpperCase()] || [];
}
