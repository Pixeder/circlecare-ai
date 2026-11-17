import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Eye, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { uploadPrescription } from '../services/api';
import VerificationModal from './VerificationModal';

export default function PrescriptionUpload({ onPrescriptionVerified }) {
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSuccessBanner(null);

    // Create local object URL for instant preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    try {
      const res = await uploadPrescription(file);
      // Preserve the original extractedMedications for the verification modal
      const payload = {
        ...res.data,
        // extractedMedications come from the DB record for compatibility with existing modal
        extractedMedications: res.data._dbRecord?.extractedMedications || [],
        // ensure prescriptionId is available at top level
        prescriptionId: res.data.prescriptionId,
      };
      setExtractedData(payload);
      if (res.data?.imageUrl) setPreviewUrl(res.data.imageUrl);
      setIsModalOpen(true);
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSimulateSample = async () => {
    setUploading(true);
    setSuccessBanner(null);
    try {
      const dummyBlob = new Blob(['sample prescription slip for Eleanor Vance'], { type: 'image/jpeg' });
      const dummyFile = new File([dummyBlob], 'dr_sharma_rx.jpg', { type: 'image/jpeg' });
      const res = await uploadPrescription(dummyFile);
      setExtractedData(res.data);
      setPreviewUrl('https://res.cloudinary.com/carecircle-demo/image/upload/v1/sample_rx_dr_sharma.jpg');
      setIsModalOpen(true);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const navigate = useNavigate();

  const handleVerificationDone = (res) => {
    setSuccessBanner(
      `Prescription #${res.data?.prescriptionId} verified! Added ${res.data?.savedMedicationsCount} medications to active schedule & indexed into Qdrant medical memory.`
    );
    if (onPrescriptionVerified) onPrescriptionVerified();
    // close modal and redirect to dashboard/home
    setIsModalOpen(false);
    navigate('/');
  };


  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
      <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
        <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Prescription Upload & OCR Pipeline</h2>
          <p className="text-xs text-slate-500">NVIDIA Vision Extraction with Human Verification Gate</p>
        </div>
      </div>

      {successBanner && (
        <div className="mt-3 p-3 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium text-xs sm:text-sm">{successBanner}</span>
        </div>
      )}

      <div className="mt-4 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-teal-400 transition bg-slate-50/50">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-800 font-semibold text-sm">Upload Doctor's Prescription Image</p>
        <p className="text-xs text-slate-500 mt-1">Supports PNG, JPG, JPEG, and PDF documents (Cloudinary Secure Storage)</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-medium rounded-xl text-sm shadow-sm transition disabled:opacity-50"
          >
            {uploading ? 'Processing Image...' : 'Browse Image'}
          </button>
          <button
            disabled={uploading}
            onClick={handleSimulateSample}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 font-medium rounded-xl text-sm transition disabled:opacity-50"
          >
            Load Sample Prescription
          </button>
        </div>
      </div>

      {previewUrl && (
        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-semibold text-slate-700">Uploaded Document Attached</span>
          </div>
          {extractedData && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs text-teal-600 hover:text-teal-800 font-semibold inline-flex items-center gap-1 hover:underline"
            >
              <Eye className="w-3.5 h-3.5" /> Re-open Verification Window
            </button>
          )}
        </div>
      )}

      <VerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        prescriptionData={extractedData}
        onVerificationComplete={handleVerificationDone}
      />
    </div>
  );
}
