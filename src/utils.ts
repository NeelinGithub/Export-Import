export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return String(d.getDate()).padStart(2, '0') + '-' + MONTHS[d.getMonth()] + '-' + String(d.getFullYear()).slice(-2);
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(dateStr || todayISO());
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function escapeHTML(v: string): string {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch] || ch));
}

export function normalizeName(v: string): string {
  return String(v || '').replace(/\s+/g, ' ').trim();
}

export function getBagSizeKg(sizeText: string): number {
  const m = String(sizeText || '').match(/(\d+(?:\.\d+)?)\s*(?:KG|KGS|LBS)?\b/i);
  return m ? parseFloat(m[1]) : 0;
}

export function isCompleteSavedName(v: string, kind: 'company' | 'buyer' | 'location' = 'buyer'): boolean {
  const name = normalizeName(v);
  if (name.length < 3) return false;
  const words = name.split(/\s+/).filter(Boolean);
  const core = name.replace(/[^A-Za-z0-9]/g, '');
  if (core.length < 3) return false;
  if (words.length && words.every(w => /^[A-Za-z]$/.test(w))) return false;
  
  if (kind === 'location') {
    if (/[\/,|-]/.test(name) && core.length >= 4) return true;
    if (words.length >= 2) return true;
    return name.length >= 4;
  }
  
  if (words.length >= 2) return words.some(w => w.length > 1);
  return /^[A-Z0-9&.-]{4,}$/.test(name) || name.length >= 8;
}

export function cleanNameList(list: string[], kind: 'company' | 'buyer' | 'location'): string[] {
  const seen = new Set<string>();
  const names = (list || []).map(normalizeName).filter(v => isCompleteSavedName(v, kind)).filter(v => {
    const key = v.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  return names.filter(name => {
    const key = name.toLowerCase();
    const hasLongerMatch = names.some(other => {
      const ok = other.toLowerCase();
      return ok !== key && (ok.startsWith(key + ' ') || ok.startsWith(key)) && (ok.length - key.length) >= 1;
    });
    return !hasLongerMatch;
  });
}

export function numberToWordsUSD(amount: number, style: 'intl' | 'lakh' = 'intl'): string {
  if (isNaN(amount) || amount === null || amount === undefined || amount <= 0) return 'USD ZERO ONLY';
  const num = Math.floor(amount);
  const cents = Math.round((amount - num) * 100);
  
  const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", 
                "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
  
  function getTwoDigits(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }
  
  function getThreeDigits(n: number): string {
    if (n === 0) return "";
    const h = Math.floor(n / 100);
    const rem = n % 100;
    return (h ? ones[h] + " HUNDRED" : "") + (h && rem ? " " : "") + getTwoDigits(rem);
  }
  
  let words = "";
  if (style === 'lakh') {
    // 6,25,000 => 6 Lakh 25 Thousand
    let rem = num;
    const crore = Math.floor(rem / 10000000);
    rem = rem % 10000000;
    const lakh = Math.floor(rem / 100000);
    rem = rem % 100000;
    const thousand = Math.floor(rem / 1000);
    rem = rem % 1000;
    
    let parts: string[] = [];
    if (crore) parts.push(getThreeDigits(crore) + " CRORE");
    if (lakh) parts.push(getThreeDigits(lakh) + " LAKH");
    if (thousand) parts.push(getThreeDigits(thousand) + " THOUSAND");
    if (rem) parts.push(getThreeDigits(rem));
    
    words = parts.filter(Boolean).join(" ");
  } else {
    // International standard millions/thousands
    let rem = num;
    const billion = Math.floor(rem / 1000000000);
    rem = rem % 1000000000;
    const million = Math.floor(rem / 1000000);
    rem = rem % 1000000;
    const thousand = Math.floor(rem / 1000);
    rem = rem % 1000;
    
    let parts: string[] = [];
    if (billion) parts.push(getThreeDigits(billion) + " BILLION");
    if (million) parts.push(getThreeDigits(million) + " MILLION");
    if (thousand) parts.push(getThreeDigits(thousand) + " THOUSAND");
    if (rem) parts.push(getThreeDigits(rem));
    
    words = parts.filter(Boolean).join(" ");
  }
  
  if (!words) words = "ZERO";
  
  const centStr = cents > 0 ? ` AND CENTS ${getTwoDigits(cents)}` : '';
  return `USD ${words}${centStr} ONLY`.replace(/\s+/g, ' ');
}

export function getInitials(name: string): string {
  if (!name) return 'N/A';
  let cleaned = name.replace(/^(M\/S|M\/s|MS|ms|Company|Buyer)\.?\s+/i, '');
  cleaned = cleaned.replace(/[^A-Za-z0-9\s]/g, ' ');
  const words = cleaned.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'N/A';
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
}

export const isRunningInIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true; // if cross-origin restriction throws, we are in an iframe
  }
};

export const checkAndNotifyIframeBlock = (feature: string): boolean => {
  if (isRunningInIframe()) {
    alert(`The preview window blocked ${feature}. Please click the "Open application in new tab" icon (↗️) at the top right of this preview to use this feature.`);
    return true; // True means it was blocked
  }
  return false;
};

