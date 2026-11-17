import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  CheckCircle,
  Clock,
  Eye,
  AlertTriangle,
  Calendar,
  User,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import PrescriptionUpload from './PrescriptionUpload';
import { fetchPrescriptions } from '../services/api';

export default function PrescriptionSection({ onPrescriptionUpdated }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRx, setSelectedRx] = useState(null);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const res = await fetchPrescriptions();
      setPrescriptions(res.prescriptions || []);
    } catch (err) {
      console.warn('Error loading prescriptions:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const handleVerified = () => {
    loadPrescriptions();
    if (onPrescriptionUpdated) onPrescriptionUpdated();
  };

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      <PrescriptionUpload onPrescriptionVerified={handleVerified} />

      {/* Prescription History */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Historical Prescriptions & Clinical Records</h2>
            <p className="text-xs text-slate-500">
              Preserved longitudinal prescription history indexed in Qdrant vector memory.
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-full">
            {prescriptions.length} Records
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading prescription archives...</div>
        ) : prescriptions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">No prescriptions recorded yet.</div>
        ) : (
          <div className="mt-4 space-y-4">
            {prescriptions.map((rx) => (
              <div
                key={rx.prescriptionId}
                className="p-4 rounded-xl border border-slate-200 hover:border-teal-300 bg-slate-50/50 transition flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-base">#{rx.prescriptionId}</span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        rx.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rx.status === 'verified' ? 'Human Verified' : 'Pending Verification'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(rx.prescribedDate || rx.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium mt-1">
                    Physician: <span className="font-bold">{rx.doctorName || 'Attending Physician'}</span> ({rx.clinicName || 'Clinic'})
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(rx.extractedMedications || []).map((med, mIdx) => (
                      <span
                        key={mIdx}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold"
                      >
                        {med.name} {med.dosage}
                      </span>
                    ))}
                  </div>

                  {rx.verifiedBy && (
                    <p className="text-[11px] text-teal-700 flex items-center gap-1 mt-2">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified by {rx.verifiedBy} on{' '}
                      {new Date(rx.verifiedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedRx(rx)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold shadow-sm transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-teal-600" />
                    <span>View Detail</span>
                  </button>
                  {rx.imageUrl && (
                    <a
                      href={rx.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-semibold transition"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Original Image</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-900">Prescription #{selectedRx.prescriptionId}</h3>
              <button
                onClick={() => setSelectedRx(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Doctor</span>
                <p className="font-bold text-slate-900">{selectedRx.doctorName}</p>
                <p className="text-xs text-slate-500">{selectedRx.clinicName}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Prescription Date</span>
                <p className="text-slate-800 font-medium">
                  {new Date(selectedRx.prescribedDate || selectedRx.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Medications Extracted</span>
                <div className="mt-1 space-y-2">
                  {(selectedRx.extractedMedications || []).map((m, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="font-bold text-slate-900">
                        {m.name} {m.dosage}
                      </div>
                      <div className="text-xs text-slate-600">Frequency: {m.frequency}</div>
                      {m.instructions && <div className="text-xs text-slate-500">Notes: {m.instructions}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {selectedRx.rawExtractedText && (
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Extracted Clinical Text</span>
                  <pre className="mt-1 p-2 bg-slate-100 rounded-lg text-xs text-slate-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {selectedRx.rawExtractedText}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setSelectedRx(null)}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
