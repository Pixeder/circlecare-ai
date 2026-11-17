import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  FileText,
  Activity,
  CheckCircle,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  BookOpen,
} from 'lucide-react';
import { fetchMedicalRecords, searchMedicalMemory, fetchDoctorBrief } from '../services/api';

export default function MedicalHistorySection() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  // Doctor Brief State
  const [brief, setBrief] = useState(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [focusArea, setFocusArea] = useState('Cardiovascular & Diabetes');

  const loadRecords = async () => {
    try {
      setLoading(true);
      const res = await fetchMedicalRecords();
      setRecords(res.records || []);
    } catch (err) {
      console.warn('Error loading records:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const res = await searchMedicalMemory(searchQuery, 4);
      setSearchResults(res.records || []);
    } catch (err) {
      alert(`Search error: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  const handleGenerateBrief = async () => {
    try {
      setGeneratingBrief(true);
      const res = await fetchDoctorBrief(focusArea);
      setBrief(res);
    } catch (err) {
      alert(`Error generating brief: ${err.message}`);
    } finally {
      setGeneratingBrief(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Doctor Visit Brief Generator */}
      <div className="bg-gradient-to-r from-teal-800 via-cyan-900 to-slate-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-teal-500/30 text-teal-300 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Qdrant Vector RAG
              </span>
              <span className="text-xs text-slate-300">Strict Patient-Level Isolation</span>
            </div>
            <h1 className="text-xl font-bold mt-1">Doctor Visit Clinical Brief</h1>
            <p className="text-teal-100 text-xs sm:text-sm mt-0.5 max-w-2xl">
              Grounded synthesis of 30-day medication adherence, vital trends, and cited prescription source references.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 font-medium"
            >
              <option value="Cardiovascular & Diabetes">Cardiovascular & Diabetes</option>
              <option value="General Geriatric Review">General Geriatric Review</option>
              <option value="Hypertension Trends">Hypertension Trends</option>
            </select>
            <button
              disabled={generatingBrief}
              onClick={handleGenerateBrief}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl font-bold text-xs shadow transition disabled:opacity-50"
            >
              {generatingBrief ? 'Generating...' : 'Generate Brief'}
            </button>
          </div>
        </div>

        {/* Display Generated Brief if available */}
        {brief && (
          <div className="mt-5 p-5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-slate-100 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-teal-300 uppercase tracking-wide">
                Grounded Clinical Synthesis ({brief.focusArea})
              </span>
              <span className="text-xs text-slate-300">Generated: {new Date(brief.generatedAt).toLocaleTimeString()}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-black/20 rounded-lg">
                <strong className="text-teal-300 block mb-1">Active Regimen & 30-Day Adherence:</strong>
                <p className="font-semibold text-emerald-400 text-sm">{brief.adherenceRate} Adherence</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-200">
                  {(brief.activeMedications || []).map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-black/20 rounded-lg">
                <strong className="text-teal-300 block mb-1">Vital Observations & Clinical Flags:</strong>
                <ul className="list-disc list-inside space-y-0.5 text-slate-200">
                  {(brief.vitalFlags || []).map((v, idx) => (
                    <li key={idx}>{v}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="text-xs text-slate-300">
              <strong className="text-teal-300 block mb-1">Authoritative Source Citations:</strong>
              <div className="flex flex-wrap gap-2">
                {(brief.sourcesCited || []).map((s, idx) => (
                  <span key={idx} className="bg-white/10 px-2.5 py-1 rounded-md text-[11px] font-mono text-cyan-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Semantic Memory Search Box */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
          <BookOpen className="w-5 h-5 text-teal-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">Semantic Medical Memory Search</h2>
            <p className="text-xs text-slate-500">Query Eleanor's encrypted Qdrant vector memory collection using natural language.</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='e.g. "What was Eleanor prescribed for hypertension in October?", "Allergies and Metformin"'
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-sm shadow transition disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Search Memory'}
          </button>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
          <span className="text-slate-400">Try queries:</span>
          {[
            'Hypertension and blood pressure trends',
            'Dr. Sharma prescription notes',
            'Metformin morning adherence',
          ].map((pill, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSearchQuery(pill);
              }}
              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Search Results Display */}
        {searchResults && (
          <div className="mt-4 p-4 rounded-xl bg-teal-50/60 border border-teal-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-900">
                Found {searchResults.length} Relevant Vector Memory Snippet(s):
              </span>
              <button
                onClick={() => setSearchResults(null)}
                className="text-xs text-teal-700 hover:text-teal-900 font-semibold"
              >
                Clear
              </button>
            </div>

            {searchResults.map((res, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 text-xs shadow-sm">
                <p className="text-slate-800 font-medium">{res.text || res.content}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                  <span className="font-semibold text-teal-700">{res.sourceRef || res.sourceReference}</span>
                  <span>{new Date(res.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chronological Longitudinal Patient Timeline */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Longitudinal Medical History Timeline</h2>
            <p className="text-xs text-slate-500">Comprehensive medical record history for Eleanor Vance.</p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-full">
            {records.length} Timeline Events
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500 text-sm">Loading longitudinal timeline...</div>
        ) : (
          <div className="mt-6 relative border-l-2 border-teal-200 ml-4 space-y-6">
            {records.map((rec, idx) => (
              <div key={rec.recordId || idx} className="relative pl-6">
                <div className="absolute -left-2 top-1 w-4 h-4 rounded-full bg-teal-600 border-2 border-white shadow"></div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-teal-300 transition">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm">{rec.title}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(rec.date).toLocaleDateString()} • {rec.provider}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium mt-2">{rec.summary}</p>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-teal-700">Facility: {rec.facility}</span>
                    {rec.verified && (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Clinically Grounded & Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
