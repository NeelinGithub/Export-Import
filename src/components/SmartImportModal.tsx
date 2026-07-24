import React, { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { RateRow } from '../types';

interface SmartImportModalProps {
  onClose: () => void;
  onImport: (items: any[]) => void;
  industry: string;
}

export default function SmartImportModal({ onClose, onImport, industry }: SmartImportModalProps) {
  const [text, setText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!text.trim()) {
      setError("Please paste some text first.");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'auto_import',
          payload: { text, industry }
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      let parsed;
      try {
        let jsonStr = data.result;
        // Strip markdown if it returned any by accident
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error("Failed to parse AI response as JSON.");
      }
      
      if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
        throw new Error("No items could be extracted from the text.");
      }
      
      onImport(parsed.items);
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while processing.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Smart Auto-Import</h3>
              <p className="text-xs text-slate-500">Paste requirements from email or chat</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start gap-2 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Paste Requirements</label>
            <textarea
              className="w-full h-48 md:h-64 p-3 border border-slate-300 rounded-xl text-sm outline-none focus:border-blue-500 resize-none font-medium leading-relaxed bg-slate-50 focus:bg-white transition"
              placeholder="e.g. Hello John,\n\nDestination Port - CIF Jebel Ali (UAE)\nSunflower Refined Oil 5 Ltr Bottle x 4 Packing = 20 ft x 40 containers\n..."
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={isProcessing}
            ></textarea>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
            <p>The AI will extract destination ports, commodities, packing sizes, and container quantities and save them to your Rate List Board automatically.</p>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProcess}
            disabled={isProcessing || !text.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Extract & Save Rates
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
