import assert from 'assert';
import { defaultToolRegistry } from '../agent/registry.js';
import { defaultOrchestrator } from '../agent/orchestrator.js';

async function runMilestone1Audit() {
  console.log('================================================================');
  console.log(' CareCircle AI – Milestone 1 Technical Audit: Agent Verification ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const patientContext = {
    patientId: 'patient_elderly_001',
    user: {
      uid: 'patient_elderly_001',
      name: 'Eleanor Vance',
      role: 'patient',
    },
    confirmedActions: [],
  };

  // -------------------------------------------------------------
  // Test 1: User asks for today's medicines -> Agent calls get_medications
  // -------------------------------------------------------------
  try {
    console.log('[Audit 1] User asks: "What medications should I take today?"');
    const response = await defaultOrchestrator.processMessage({
      messages: [{ role: 'user', content: 'What medications should I take today?' }],
      context: patientContext,
    });

    assert(response, 'Response must exist');
    assert(response.toolCalls.length > 0, 'Agent must invoke a tool');
    const calledTool = response.toolCalls[0].toolName;
    assert.strictEqual(calledTool, 'get_medications', `Expected tool get_medications, got ${calledTool}`);

    const result = response.toolCalls[0].result;
    assert.strictEqual(result.success, true, 'Tool result must be success');
    assert.strictEqual(result.patientId, 'patient_elderly_001', 'Must enforce patient-level authorization');
    assert(Array.isArray(result.medications), 'Medications must be an array');
    assert(result.medications.some((m) => m.name === 'Metformin'), 'Must include Metformin');

    console.log(`  -> PASS: Agent called get_medications with patient isolation. Returned ${result.medications.length} active meds.\n`);
    passed++;
  } catch (err) {
    console.error(`  -> FAIL: Audit 1 failed: ${err.message}\n`);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 2: User requests medication creation -> Consequential Confirmation Gate
  // -------------------------------------------------------------
  try {
    console.log('[Audit 2a] User asks: "Add a new medication Lisinopril 10mg once daily to my schedule." (Unconfirmed)');
    const unconfirmedResp = await defaultOrchestrator.processMessage({
      messages: [{ role: 'user', content: 'Add a new medication Lisinopril 10mg once daily to my schedule.' }],
      context: patientContext, // No confirmedActions
    });

    assert.strictEqual(unconfirmedResp.requiresConfirmation, true, 'Must require confirmation for consequential action');
    assert(unconfirmedResp.pendingAction, 'Must supply pendingAction details');
    assert.strictEqual(unconfirmedResp.pendingAction.toolName, 'create_medication');
    console.log(`  -> PASS: Action blocked awaiting confirmation: "${unconfirmedResp.content}"`);

    console.log('[Audit 2b] User confirms: "Yes, I confirm proceeding with create_medication."');
    const confirmedContext = {
      ...patientContext,
      confirmedActions: ['create_medication'],
    };
    const confirmedResp = await defaultOrchestrator.processMessage({
      messages: [
        { role: 'user', content: 'Add a new medication Lisinopril 10mg once daily to my schedule.' },
        { role: 'assistant', content: unconfirmedResp.content },
        { role: 'user', content: 'Yes, I confirm proceeding with create_medication.' },
      ],
      context: confirmedContext,
    });

    assert(confirmedResp.toolCalls.length > 0, 'Must execute tool after confirmation');
    const createResult = confirmedResp.toolCalls[0].result;
    assert.strictEqual(createResult.success, true, 'create_medication must succeed after confirmation');
    assert(createResult.message.includes('Lisinopril'), 'Must confirm Lisinopril creation');
    console.log(`  -> PASS: Medication created after explicit confirmation: ${createResult.message}\n`);
    passed++;
  } catch (err) {
    console.error(`  -> FAIL: Audit 2 failed: ${err.message}\n`);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 3: User asks about previous prescriptions -> Agent calls search_medical_history
  // -------------------------------------------------------------
  try {
    console.log('[Audit 3] User asks: "Search my previous prescriptions and hypertension records."');
    const response = await defaultOrchestrator.processMessage({
      messages: [{ role: 'user', content: 'Search my previous prescriptions and hypertension records.' }],
      context: patientContext,
    });

    assert(response.toolCalls.length > 0, 'Agent must invoke search_medical_history');
    const searchCall = response.toolCalls[0];
    assert.strictEqual(searchCall.toolName, 'search_medical_history');
    assert.strictEqual(searchCall.result.success, true);
    assert.strictEqual(searchCall.result.patientId, 'patient_elderly_001', 'Must be patient-isolated');
    assert(searchCall.result.records.length > 0, 'Must return medical history records');
    assert(searchCall.result.records[0].sourceReference, 'Must cite source reference');
    console.log(`  -> PASS: Medical history searched with source citations (Source: "${searchCall.result.records[0].sourceReference}").\n`);
    passed++;
  } catch (err) {
    console.error(`  -> FAIL: Audit 3 failed: ${err.message}\n`);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 4: User triggers SOS -> Agent invokes deterministic emergency workflow
  // -------------------------------------------------------------
  try {
    console.log('[Audit 4] User triggers SOS: "Help! I fell down and cannot stand up!"');
    const response = await defaultOrchestrator.processMessage({
      messages: [{ role: 'user', content: 'Help! I fell down and cannot stand up!' }],
      context: patientContext,
    });

    assert(response.toolCalls.length > 0, 'Agent must call emergency tool');
    const sosCall = response.toolCalls[0];
    assert.strictEqual(sosCall.toolName, 'trigger_sos', 'Must call trigger_sos');
    const sosResult = sosCall.result;
    assert.strictEqual(sosResult.success, true);
    assert.strictEqual(sosResult.status, 'EMERGENCY_DISPATCHED');
    assert(sosResult.contactsAlerted.includes('Sarah Vance'), 'Primary contact must be alerted');
    assert(sosResult.actionTaken.includes('Deterministic Emergency Contact Workflow'), 'Must be deterministic workflow');
    console.log(`  -> PASS: Deterministic SOS dispatched: ${sosResult.message}\n`);
    passed++;
  } catch (err) {
    console.error(`  -> FAIL: Audit 4 failed: ${err.message}\n`);
    failed++;
  }

  console.log('================================================================');
  console.log(` Milestone 1 Agent Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runMilestone1Audit().catch((err) => {
  console.error('Audit Runner Error:', err);
  process.exit(1);
});
