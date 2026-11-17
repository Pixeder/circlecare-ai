import { getQdrantClient, isQdrantConnected } from '../config/qdrant.js';
import { config } from '../config/env.js';
import crypto from 'crypto';

/**
 * Generate a deterministic embedding vector (size 1024) for local text
 * In production, this can call an NVIDIA NIM embedding model.
 */
function generateEmbedding(text) {
  const vector = new Array(1024).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
    const index = Math.abs(hash) % 1024;
    vector[index] = (vector[index] + 0.1) % 1.0;
  }
  // Normalize vector
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map((v) => v / norm);
}

// In-memory fallback seeded with baseline clinical records for the patient
const inMemoryVectorStore = [
  {
    pointId: 'mem_seed_001',
    patientId: 'patient_elderly_001',
    text: 'Prescription by Dr. S. Sharma, MD. Metformin 500mg twice daily with meals. Amlodipine 5mg once daily for hypertension. Monitor blood pressure weekly.',
    recordType: 'prescription',
    sourceRef: 'Prescription #RX-9942 dated 2026-11-12 (Clinic: Senior Geriatric Care Clinic)',
    metadata: { doctor: 'Dr. S. Sharma', date: '2026-11-12' },
    createdAt: new Date('2026-11-12T09:00:00Z').toISOString(),
  },
  {
    pointId: 'mem_seed_002',
    patientId: 'patient_elderly_001',
    text: 'Cardiology Clinic Consultation: Patient Eleanor Vance reviewed for mild hypertension. Amlodipine 5mg regimen confirmed stable. Advised low-sodium diet and daily walking.',
    recordType: 'clinical_note',
    sourceRef: 'Cardiology EHR Progress Note #CR-2026-4421',
    metadata: { clinic: 'Senior Cardiology Associates', date: '2026-10-15' },
    createdAt: new Date('2026-10-15T14:30:00Z').toISOString(),
  },
];

/**
 * Store a medical record or prescription embedding in Qdrant
 * All records are strictly associated with the authenticated patientId.
 */
export async function storeMedicalMemory({ patientId, text, recordType, sourceRef, metadata = {} }) {
  if (!patientId || !text) {
    throw new Error('patientId and text are required for storing medical memory.');
  }

  const pointId = crypto.randomUUID ? crypto.randomUUID() : `point_${Date.now()}_${Math.random()}`;
  const vector = generateEmbedding(text);
  const payload = {
    pointId,
    patientId,
    text,
    recordType, // 'prescription', 'doctor_brief', 'clinical_note', 'discharge_summary'
    sourceRef, // e.g., 'Prescription #RX-9942 dated 2026-11-10'
    metadata,
    createdAt: new Date().toISOString(),
  };

  const client = getQdrantClient();

  if (client && isQdrantConnected()) {
    try {
      await client.upsert(config.qdrant.collectionName, {
        points: [
          {
            id: pointId,
            vector,
            payload,
          },
        ],
      });
      return { success: true, pointId, source: 'qdrant' };
    } catch (err) {
      console.warn(`[VectorService] Qdrant upsert error: ${err.message}. Using memory store.`);
    }
  }

  // Fallback to in-memory store
  inMemoryVectorStore.push(payload);
  return { success: true, pointId, source: 'in_memory' };
}

/**
 * Search medical history restricted strictly to the authenticated patient
 */
export async function searchMedicalMemory({ patientId, query, limit = 5 }) {
  if (!patientId) {
    throw new Error('Patient authorization required: patientId missing in medical memory search.');
  }

  const queryVector = generateEmbedding(query);
  const client = getQdrantClient();

  if (client && isQdrantConnected()) {
    try {
      const results = await client.search(config.qdrant.collectionName, {
        vector: queryVector,
        limit,
        filter: {
          must: [
            {
              key: 'patientId',
              match: { value: patientId },
            },
          ],
        },
      });

      return results.map((r) => ({
        text: r.payload.text,
        recordType: r.payload.recordType,
        sourceRef: r.payload.sourceRef || 'Medical Record',
        score: r.score,
        date: r.payload.createdAt,
      }));
    } catch (err) {
      console.warn(`[VectorService] Qdrant search error: ${err.message}. Using memory search.`);
    }
  }

  // In-memory fallback filtered strictly by patientId
  const patientRecords = inMemoryVectorStore.filter((r) => r.patientId === patientId);
  const matched = patientRecords.filter((r) => {
    const q = query.toLowerCase();
    const queryTokens = q.split(/\s+/).filter(Boolean);
    const textLower = r.text.toLowerCase();
    const sourceLower = (r.sourceRef || '').toLowerCase();
    return queryTokens.some((token) => textLower.includes(token) || sourceLower.includes(token));
  });

  return (matched.length > 0 ? matched : patientRecords.slice(0, limit)).map((r) => ({
    text: r.text,
    recordType: r.recordType,
    sourceRef: r.sourceRef || 'Medical Record',
    score: 0.95,
    date: r.createdAt,
  }));
}

export default { storeMedicalMemory, searchMedicalMemory };
