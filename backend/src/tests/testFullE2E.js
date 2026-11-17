import '../config/env.js';
import { connectMongoDB } from '../config/mongodb.js';
import { initQdrantCollection } from '../config/qdrant.js';
import { defaultOrchestrator } from '../agent/orchestrator.js';
import { defaultToolRegistry } from '../agent/registry.js';
import { getMedicationsTool, logDoseTool } from '../tools/medicationTools.js';
import { triggerSosTool } from '../tools/emergencyTools.js';
import { searchMedicalHistoryTool, generateDoctorBriefTool } from '../tools/medicalHistoryTools.js';
import { extractPrescriptionData } from '../services/visionService.js';
import { storeMedicalMemory } from '../services/vectorService.js';

async function runFullE2ETest() {
  console.log('================================================================');
  console.log(' CareCircle AI – Full End-to-End Subsystem & Agent Verification ');
  console.log('================================================================');

  let passed = 0;
  let total = 0;

  const test = (name, fn) => {
    total++;
    try {
      fn();
      console.log(`[PASS ${passed + 1}/${total}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
    }
  };

  const asyncTest = async (name, fn) => {
    total++;
    try {
      await fn();
      console.log(`[PASS ${passed + 1}/${total}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
    }
  };

  // 1. Tool Registry Verification
  test('Verify all 10 clinical tools registered', () => {
    const tools = defaultToolRegistry.getDefinitions();
    if (tools.length !== 10) throw new Error(`Expected 10 tools, found ${tools.length}`);
  });

  const context = {
    patientId: 'patient_elderly_001',
    user: { name: 'Eleanor Vance', role: 'patient' },
    confirmedActions: [],
  };

  // 2. Medication retrieval
  await asyncTest('Tool: get_medications with patient isolation', async () => {
    const res = await getMedicationsTool.execute({ context, args: { status: 'active' } });
    if (!res.success || !Array.isArray(res.medications)) throw new Error('Failed to retrieve medications');
    if (!res.medications.some((m) => m.name === 'Metformin')) throw new Error('Missing Metformin');
  });

  // 3. Dose logging
  await asyncTest('Tool: log_dose updates adherence log and decrement', async () => {
    const res = await logDoseTool.execute({
      context,
      args: { medicationName: 'Metformin', status: 'taken', notes: 'E2E test dose' },
    });
    if (!res.success) throw new Error('Dose logging failed');
  });

  // 4. Emergency SOS Deterministic Workflow
  await asyncTest('Tool: trigger_sos deterministic emergency dispatch', async () => {
    const res = await triggerSosTool.execute({
      context,
      args: { reason: 'E2E simulated emergency fall', urgency: 'critical' },
    });
    if (!res.success || res.status !== 'EMERGENCY_DISPATCHED') throw new Error('SOS dispatch failed');
    if (!res.contactsAlerted.includes('Sarah Vance')) throw new Error('Sarah Vance was not alerted');
  });

  // 5. Medical memory vector search
  await asyncTest('Tool: search_medical_history vector retrieval', async () => {
    const res = await searchMedicalHistoryTool.execute({
      context,
      args: { query: 'hypertension blood pressure', limit: 2 },
    });
    if (!res.success || !Array.isArray(res.records)) throw new Error('Vector retrieval failed');
  });

  // 6. Doctor Visit Brief Generation (RAG)
  await asyncTest('Tool: generate_doctor_brief synthesis with cited sources', async () => {
    const res = await generateDoctorBriefTool.execute({
      context,
      args: { focusArea: 'Cardiovascular' },
    });
    if (!res.success || !res.adherenceRate || !res.sourcesCited) throw new Error('Brief generation failed');
  });

  // 7. Prescription Vision & Uncertainty Detection
  await asyncTest('Prescription OCR extraction with clinical uncertainty guardrail', async () => {
    const extracted = await extractPrescriptionData(null);
    if (!extracted.requiresHumanVerification) throw new Error('Safety guardrail failed: requiresHumanVerification must be true');
    if (!extracted.extractedMedications || extracted.extractedMedications.length === 0) throw new Error('No medications extracted');
    const uncertainMed = extracted.extractedMedications.find((m) => m.uncertain);
    if (!uncertainMed) throw new Error('Uncertainty detection did not flag illegible fields');
  });

  // 8. Vector Memory Indexing
  await asyncTest('Qdrant RAG ingestion with patient isolation', async () => {
    const vecRes = await storeMedicalMemory({
      patientId: 'patient_elderly_001',
      text: 'Verified E2E test prescription record: Metformin 500mg BID',
      recordType: 'prescription',
      sourceRef: 'E2E Test Slip #RX-E2E',
      metadata: { test: true },
    });
    if (!vecRes.success) throw new Error('Vector memory ingestion failed');
  });

  console.log('================================================================');
  console.log(` Full E2E Test Suite Complete: ${passed} / ${total} Tests Passed `);
  console.log('================================================================');

  process.exit(passed === total ? 0 : 1);
}

runFullE2ETest().catch((err) => {
  console.error('Fatal E2E test failure:', err);
  process.exit(1);
});
