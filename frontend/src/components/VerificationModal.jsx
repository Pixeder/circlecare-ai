import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, X, ShieldAlert, Trash2, Plus } from 'lucide-react';
import { verifyPrescription } from '../services/api';

export default function VerificationModal({ isOpen, onClose, prescriptionData, onVerificationComplete }) {
  if (!isOpen || !prescriptionData) return null;

  const [meds, setMeds] = useState(prescriptionData.extractedMedications || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFieldChange = (index, field, value) => {
    const updated = [...meds];
    updated[index] = { ...updated[index], [field]: value };
    // If user edited the uncertain field, clear the uncertain flag
    if (field === 'dosage' || field === 'frequency' || field === 'duration' || field === 'name') {
      updated[index].uncertain = false;
      updated[index].uncertainReason = '';
    }
    setMeds(updated);
  };

  const handleRemoveMed = (index) => {
    if (meds.length <= 1) {
      setError('A prescription must contain at least one medication instruction.');
      return;
    }
    setMeds(meds.filter((_, i) => i !== index));
  };

  const handleAddMed = () => {
    setMeds([
      ...meds,
      {
        name: '',
        dosage: '',
        frequency: 'Once daily',
        duration: '30 days',
        instructions: '',
        confidence: 1.0,
        uncertain: false,
        isVerified: false,
      },
    ]);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    // Validation guardrail: Never invent missing medicine names, strengths, frequencies, or durations
    for (const m of meds) {
      if (!m.name || !m.name.trim()) {
        setError('Please provide a valid medicine name for all entries.');
        setLoading(false);
        return;
      }
      if (!m.dosage || m.dosage === 'Unspecified' || !m.dosage.trim()) {
        setError(`Please clarify dosage for ${m.name} before saving.`);
        setLoading(false);
        return;
      }
      if (!m.frequency || m.frequency === 'Unspecified' || !m.frequency.trim()) {
        setError(`Please specify frequency for ${m.name} before saving.`);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await verifyPrescription(prescriptionData.prescriptionId, meds);
      if (onVerificationComplete) {
        onVerificationComplete(res);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2 text-teal-700">
            <ShieldAlert className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Clinical Human Verification</h2>
              <p className="text-xs text-slate-500">Prescription #{prescriptionData.prescriptionId} • Review & Correct Extracted Medications</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Caregiver Clinical Safety Protocol:</strong> AI detected potential handwriting uncertainty in this prescription. Please review, edit uncertain fields, and confirm exact dosages and frequencies before adding to Eleanor's schedule.
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-4 max-h-[52vh] overflow-y-auto pr-1">
          {meds.map((med, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition ${
                med.uncertain ? 'border-amber-400 bg-amber-50/40' : 'border-slate-200 bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 text-sm">Medication #{idx + 1}</span>
                  {med.uncertain && (
                    <span className="text-xs bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Verification Needed
                    </span>
                  )}
                  {med.confidence && (
                    <span className="text-[11px] text-slate-400">
                      OCR Confidence: {Math.round(med.confidence * 100)}%
                    </span>
                  )}
                </div>

                {meds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMed(idx)}
                    className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-lg transition"
                    title="Remove this medicine"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>

              {med.uncertainReason && (
                <p className="text-xs text-amber-800 font-medium mb-3 bg-amber-100 p-2 rounded-lg">
                  {med.uncertainReason}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Medicine Name</label>
                  <input
                    type="text"
                    value={med.name}
                    onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                    className="w-full text-sm font-medium border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. Metformin"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Dosage / Strength</label>
                  <input
                    type="text"
                    value={med.dosage}
                    onChange={(e) => handleFieldChange(idx, 'dosage', e.target.value)}
                    className="w-full text-sm font-medium border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. 500mg or 5mg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Frequency</label>
                  <input
                    type="text"
                    value={med.frequency}
                    onChange={(e) => handleFieldChange(idx, 'frequency', e.target.value)}
                    className="w-full text-sm font-medium border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. Twice daily with meals"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Duration</label>
                  <input
                    type="text"
                    value={med.duration}
                    onChange={(e) => handleFieldChange(idx, 'duration', e.target.value)}
                    className="w-full text-sm font-medium border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. 30 days or Ongoing"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Clinical Instructions / Notes</label>
                  <input
                    type="text"
                    value={med.instructions || ''}
                    onChange={(e) => handleFieldChange(idx, 'instructions', e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. Take with food to minimize GI distress, take with full glass of water..."
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddMed}
            className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl text-xs font-semibold text-slate-600 hover:text-teal-700 flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> Add Another Medication Manually
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-400">Preserving original Cloudinary asset reference</span>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-100 text-sm transition"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              onClick={handleConfirm}
              className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl shadow-md disabled:opacity-50 text-sm transition"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{loading ? 'Saving to Database...' : 'Confirm & Save Schedule'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
