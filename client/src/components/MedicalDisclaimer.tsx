import React from 'react';
import { ShieldAlert, Info } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export const MedicalDisclaimer: React.FC<Props> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0" />
        <p>
          <strong>Non-Medical Disclaimer:</strong> Blood_Link coordinates voluntary potential donors. Final eligibility, cross-matching, and safety screening are strictly conducted by certified hospital blood centre personnel.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-charcoal-800">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-amber-900">
            Important Regulatory & Clinical Safety Statement
          </h4>
          <p className="mt-1 text-xs text-amber-800 leading-relaxed">
            Blood_Link is a voluntary coordination software system, <strong>not a licensed blood bank or transfusion service</strong>. 
            All matching results represent <em>potential voluntary donors</em> based on declared ABO/Rh information and geographical proximity. 
            A donor&apos;s expression of willingness does not guarantee blood availability, medical suitability, or infectious disease safety. 
            <strong>Only licensed blood centre personnel can conduct medical suitability evaluations and clinical cross-matching before collection or transfusion.</strong>
          </p>
        </div>
      </div>
    </div>
  );
};
