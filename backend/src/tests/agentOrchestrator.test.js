import assert from 'assert';
import { defaultToolRegistry } from '../agent/registry.js';
import { defaultOrchestrator } from '../agent/orchestrator.js';

async function runTests() {
  console.log('====================================================');
  console.log(' CareCircle AI: Agent & Tool Registry Verification ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const testContext = {
    patientId: 'patient_elderly_001',
    user: {
      uid: 'patient_elderly_001',
      name: 'Eleanor Vance',
      role: 'patient',
    },
    confirmedActions: [],
  };

  // Test 1: Tool Registry has all 10 tools loaded
  try {
    const definitions = defaultToolRegistry.getDefinitions();
    console.log(`[Test 1] Checking registered tools count... (found ${definitions.length})`);
    assert.strictEqual(definitions.length, 10, 'Expected 10 registered tools.');

    const expectedTools = [
      'read_prescription',
      'create_medication',
      'get_medications',
      'log_dose',
      'search_medical_history',
      'create_appointment',
      'check_medicine_stock',
      'send_caregiver_alert',
      'generate_doctor_brief',
      'trigger_sos',
    ];

    expectedTools.forEach((toolName) => {
      assert(defaultToolRegistry.hasTool(toolName), `Tool ${toolName} must be registered.`);
    });
    console.log('  -> PASS: All 10 registered tools verified.\n');
    passed++;
  } catch (err) {
    console.error('  -> FAIL: Test 1 failed:', err.message, '\n');
    failed++;
  }

  // Test 2: Tool argument validation guardrails
  try {
    console.log('[Test 2] Testing safety guardrails on missing required tool arguments...');
    const result = await defaultToolRegistry.executeTool('log_dose', {}, testContext);
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Missing required parameter'), 'Should reject missing parameters.');
    console.log(`  -> PASS: Correctly rejected invalid call: "${result.error}"\n`);
    passed++;
  } catch (err) {
    console.error('  -> FAIL: Test 2 failed:', err.message, '\n');
    failed++;
  }

  // Test 3: Tool Execution: get_medications
  try {
    console.log('[Test 3] Executing tool: get_medications for Eleanor Vance...');
    const result = await defaultToolRegistry.executeTool('get_medications', { status: 'active' }, testContext);
    assert.strictEqual(result.success, true);
    assert(Array.isArray(result.medications), 'Medications should be an array.');
    assert(result.medications.length >= 2, 'Should return active medications.');
    console.log(`  -> PASS: Retrieved ${result.medications.length} active medications (${result.medications.map((m) => m.name).join(', ')}).\n`);
    passed++;
  } catch (err) {
    console.error('  -> FAIL: Test 3 failed:', err.message, '\n');
    failed++;
  }

  // Test 4: Tool Execution: log_dose
  try {
    console.log('[Test 4] Executing tool: log_dose for Metformin...');
    const result = await defaultToolRegistry.executeTool(
      'log_dose',
      {
        medicationName: 'Metformin',
        status: 'taken',
        notes: 'Taken with breakfast as instructed',
      },
      testContext
    );
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'taken');
    console.log(`  -> PASS: ${result.message}\n`);
    passed++;
  } catch (err) {
    console.error('  -> FAIL: Test 4 failed:', err.message, '\n');
    failed++;
  }

  // Test 5: Tool Execution: trigger_sos
  try {
    console.log('[Test 5] Executing tool: trigger_sos deterministic emergency workflow...');
    const result = await defaultToolRegistry.executeTool(
      'trigger_sos',
      {
        reason: 'Patient felt dizzy and lost balance',
        urgency: 'critical',
      },
      testContext
    );
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'EMERGENCY_DISPATCHED');
    assert(result.contactsAlerted.includes('Sarah Vance'), 'Primary contact must be alerted.');
    console.log(`  -> PASS: ${result.message}\n`);
    passed++;
  } catch (err) {
    console.error('  -> FAIL: Test 5 failed:', err.message, '\n');
    failed++;
  }

  // Test 6: Agent Orchestrator End-to-End Turn
  try {
    console.log('[Test 6] Testing Healthcare Agent Orchestrator end-to-end turn with tool invocation...');
    const userMessage = {
      role: 'user',
      content: 'What medications should I take today?',
    };

    const response = await defaultOrchestrator.processMessage({
      messages: [userMessage],
      context: testContext,
    });

    assert(response, 'Response should not be null');
    assert(response.toolCalls.length > 0, 'Agent should trigger tool call for medication query.');
    assert(response.toolCalls[0].toolName === 'get_medications', 'Triggered tool must be get_medications.');
    console.log(`  -> PASS: Orchestrator successfully invoked: ${response.toolCalls[0].toolName}`);
    console.log(`  -> Agent Assistant Content: "${response.content}"\n`);
    passed++;
  } catch (err) {
    console.error('  -> FAIL: Test 6 failed:', err.message, '\n');
    failed++;
  }

  console.log('====================================================');
  console.log(` Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled Test Runner Error:', err);
  process.exit(1);
});
