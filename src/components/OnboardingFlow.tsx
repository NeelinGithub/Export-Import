import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Building, CheckCircle2 } from 'lucide-react';
import { saveLicenceDetails, updateMembershipSubCompanies } from '../services/db';
import { LicenceDetails } from '../services/db';

interface OnboardingFlowProps {
  userId: string;
  licenceMetadata: LicenceDetails;
  onComplete: () => void;
}

const INDUSTRIES = [
  { id: 'grain', name: 'Grain & Agriculture' },
  { id: 'tiles', name: 'Ceramics & Tiles' },
  { id: 'spices', name: 'Spices & Herbs' },
  { id: 'chemicals', name: 'Chemicals' },
  { id: 'salts', name: 'Salts & Minerals' },
  { id: 'vegetables_fruits', name: 'Fresh Produce (Veg/Fruits)' },
  { id: 'metal', name: 'Metals & Scrap' },
  { id: 'nuts', name: 'Nuts & Seeds' },
  { id: 'pharma', name: 'Pharmaceuticals' },
  { id: 'oil', name: 'Oils & Liquids' },
  { id: 'apparel', name: 'Textiles & Apparel' },
  { id: 'air_cargo', name: 'Air Cargo & General' },
  { id: 'generic', name: 'Generic / Other' }
];

export default function OnboardingFlow({ licenceMetadata, onComplete, userId }: OnboardingFlowProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFinish = async () => {
    if (!licenceMetadata.industrySelected && !selectedIndustry) return;
    setIsSaving(true);
    try {
      if (!licenceMetadata.industrySelected && selectedIndustry) {
        const updatedLicence = {
          ...licenceMetadata,
          industry: selectedIndustry as any,
          industrySelected: true
        };
        await saveLicenceDetails(updatedLicence);
      }
      await updateMembershipSubCompanies(userId, { onboarded: true });
      onComplete();
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {step === 1 ? (
          <div className="bg-slate-900 border border-slate-800 shadow-2xl rounded-3xl overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Welcome to AI Studio Workspace
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Before you begin, please review our terms of service and privacy guidelines. As an exporter using this platform to generate proforma invoices, custom clearance documents, and manage international shipments, you are responsible for the accuracy of your declarations.
              </p>
              
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 max-h-60 overflow-y-auto">
                <h3 className="text-white font-bold">1. Copyright & Intellectual Property</h3>
                <p className="text-xs text-slate-500">The structure, design, logic, and generated templates within this workspace are protected by intellectual property laws. You are granted a limited licence to use these tools for your business operations.</p>
                
                <h3 className="text-white font-bold mt-4">2. Privacy & Data Handling</h3>
                <p className="text-xs text-slate-500">Your shipping data, buyer contacts, and company profiles are encrypted and strictly isolated within your tenant workspace. We do not sell or share your business data with third-party logistics competitors.</p>
                
                <h3 className="text-white font-bold mt-4">3. Compliance & Liability</h3>
                <p className="text-xs text-slate-500">The platform assists in generating documentation but does not replace legal advice. You assume full responsibility for complying with international trade laws, OFAC sanctions, and destination country regulations.</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group p-2 mt-4">
                <div className="relative flex items-center justify-center mt-1">
                  <input 
                    type="checkbox" 
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="w-5 h-5 appearance-none border-2 border-slate-700 rounded-md bg-slate-950 checked:bg-blue-500 checked:border-blue-500 transition-colors"
                  />
                  {acceptedTerms && <CheckCircle2 className="w-3.5 h-3.5 text-white absolute pointer-events-none" />}
                </div>
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  I acknowledge that I have read and agree to the Copyright, Privacy Policy, and Terms of Service.
                </span>
              </label>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={licenceMetadata.industrySelected ? handleFinish : () => setStep(2)}
                  disabled={!acceptedTerms || isSaving}
                  className="bg-blue-500 hover:bg-blue-400 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 px-8 rounded-xl transition flex items-center gap-2"
                >
                  {isSaving ? 'Configuring...' : (licenceMetadata.industrySelected ? 'Launch Workspace' : 'Continue')} {!licenceMetadata.industrySelected && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 shadow-2xl rounded-3xl overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="w-16 h-16 bg-teal-500/10 text-teal-500 rounded-2xl flex items-center justify-center mb-4">
                <Building className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Select Your Industry
              </h1>
              <p className="text-slate-400 text-sm">
                Your industry selection tailors the workspace layout, default commodities, and document templates to match your specific export requirements.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4">
                {INDUSTRIES.map(ind => (
                  <button
                    key={ind.id}
                    onClick={() => setSelectedIndustry(ind.id)}
                    className={`p-4 text-left rounded-2xl border transition-all ${
                      selectedIndustry === ind.id 
                        ? 'bg-teal-500/10 border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.15)]' 
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${selectedIndustry === ind.id ? 'text-teal-400' : 'text-slate-300'}`}>
                        {ind.name}
                      </span>
                      {selectedIndustry === ind.id && <CheckCircle2 className="w-4 h-4 text-teal-500" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-8 flex justify-between items-center border-t border-slate-800 mt-8">
                <button
                  onClick={() => setStep(1)}
                  className="text-slate-400 hover:text-white text-sm font-medium transition"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={!selectedIndustry || isSaving}
                  className="bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black py-3 px-8 rounded-xl transition flex items-center gap-2"
                >
                  {isSaving ? 'Configuring Workspace...' : 'Launch Workspace'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
