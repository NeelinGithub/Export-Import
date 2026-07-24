import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface SearchablePortSelectProps {
  value: string;
  onChange: (val: string) => void;
  ports: string[];
  uniqueCountries: string[];
  FREQUENT_PORTS: string[];
}

export function SearchablePortSelect({ value, onChange, ports, uniqueCountries, FREQUENT_PORTS }: SearchablePortSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search to display current value if closed
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedDisplay = value 
    ? (value.includes(" - ") ? value.split(" - ")[1] : value)
    : "";

  // Group and filter
  const filteredGroups = useMemo(() => {
    const lowerQuery = search.toLowerCase();
    const groups: { label: string; options: string[] }[] = [];
    
    uniqueCountries.forEach(country => {
      let countryPorts = ports.filter(p => p.startsWith(country + " - "));
      if (search) {
        countryPorts = countryPorts.filter(p => p.toLowerCase().includes(lowerQuery));
      }
      
      countryPorts.sort((a,b) => {
         const aName = a.split(" - ")[1];
         const bName = b.split(" - ")[1];
         const aFreq = FREQUENT_PORTS.includes(aName.toUpperCase());
         const bFreq = FREQUENT_PORTS.includes(bName.toUpperCase());
         if (aFreq && !bFreq) return -1;
         if (!aFreq && bFreq) return 1;
         return aName.localeCompare(bName);
      });
      
      if (countryPorts.length > 0) {
        groups.push({ label: country, options: countryPorts });
      }
    });
    
    // Other
    let otherPorts = ports.filter(p => !p.includes(" - "));
    if (search) {
      otherPorts = otherPorts.filter(p => p.toLowerCase().includes(lowerQuery));
    }
    otherPorts.sort();
    if (otherPorts.length > 0) {
      groups.push({ label: "Other", options: otherPorts });
    }
    
    return groups;
  }, [ports, uniqueCountries, FREQUENT_PORTS, search]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div 
        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus-within:border-blue-500 cursor-text flex justify-between items-center transition shadow-sm hover:border-slate-400"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <input 
          ref={inputRef}
          type="text"
          placeholder={selectedDisplay || "- Select Port -"}
          value={isOpen ? search : selectedDisplay}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          className="w-full bg-transparent outline-none text-slate-700 placeholder-slate-500"
        />
        <ChevronDown className="w-4 h-4 text-slate-500 cursor-pointer shrink-0" onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl max-h-64 flex flex-col overflow-hidden">
          <div className="overflow-y-auto p-1.5 flex-1">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-3 text-[11px] font-medium text-slate-400">No ports found</div>
            ) : (
              filteredGroups.map(group => (
                <div key={group.label} className="mb-2 last:mb-0">
                  <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    {group.label}
                  </div>
                  <div className="space-y-0.5">
                    {group.options.map(opt => {
                      const portName = opt.includes(" - ") ? opt.split(" - ")[1] : opt;
                      const isFreq = FREQUENT_PORTS.includes(portName.toUpperCase());
                      return (
                        <div 
                          key={opt}
                          className={`px-2 py-1.5 text-xs cursor-pointer rounded-lg hover:bg-blue-50 hover:text-blue-700 transition flex justify-between items-center ${value === opt ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 font-medium'}`}
                          onClick={() => {
                            onChange(opt);
                            setIsOpen(false);
                            setSearch("");
                          }}
                        >
                          <span>{portName} {isFreq ? "🔥" : ""}</span>
                          {value === opt && <span className="text-[10px] text-blue-500 font-black">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
