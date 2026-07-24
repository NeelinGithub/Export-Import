import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface SearchableSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { label: string; options: string[] }[];
  placeholder?: string;
}

export function SearchableSelect({ value, onChange, options, placeholder = "-- Choose --" }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedDisplay = value || placeholder;

  const filteredGroups = options.map(group => {
    const filteredOptions = group.options.filter(opt => 
      opt.toLowerCase().includes(search.toLowerCase())
    );
    return { ...group, options: filteredOptions };
  }).filter(group => group.options.length > 0);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div 
        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-bold outline-none focus-within:border-blue-500 shadow-sm cursor-pointer flex justify-between items-center"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch("");
        }}
      >
        <span className="truncate">{selectedDisplay}</span>
        <ChevronDown className="w-4 h-4 text-slate-500" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <Search className="w-3 h-3 text-slate-400" />
            <input 
              type="text"
              autoFocus
              placeholder="Search ports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-[11px] outline-none"
            />
          </div>
          <div className="overflow-y-auto p-1">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-2 text-[10px] text-slate-400">No ports found</div>
            ) : (
              filteredGroups.map(group => (
                <div key={group.label} className="mb-1">
                  <div className="px-2 py-1 text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-50">
                    {group.label}
                  </div>
                  {group.options.map(opt => (
                    <div 
                      key={opt}
                      className={`px-2 py-1.5 text-xs cursor-pointer rounded hover:bg-blue-50 hover:text-blue-700 transition ${value === opt ? 'bg-blue-100 text-blue-800 font-bold' : 'text-slate-700'}`}
                      onClick={() => {
                        onChange(opt);
                        setIsOpen(false);
                      }}
                    >
                      {opt.includes(" - ") ? opt.split(" - ")[1] : opt}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
