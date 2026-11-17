import { defaultOrchestrator } from '../agent/orchestrator.js';
import { config } from '../config/env.js';

async function testAgentLiveTurn() {
  console.log('====================================================');
  console.log(' Live Agent Orchestrator: "What medications should I take today?" ');
  console.log('====================================================');
  console.log('Using live NVIDIA model:', config.nvidia.model);
  console.log('Mock mode disabled:', !config.nvidia.mockLLM);

  const context = {
    patientId: 'patient_elderly_001',
    user: {
      name: 'Eleanor Vance',
      role: 'patient',
    },
    confirmedActions: [],
  };

  const start = Date.now();
  const response = await defaultOrchestrator.processMessage({
    messages: [
      { role: 'user', content: 'What medications should I take today?' },
    ],
    context,
  });

  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nCompleted turn in ${duration}s.`);
  console.log('\n--- Tool Calls Executed ---');
  console.log(JSON.stringify(response.toolCalls, null, 2));

  console.log('\n--- Final Agent Content ---');
  console.log(response.content);
}

testAgentLiveTurn().catch((err) => {
  console.error('Fatal error during live turn:', err);
  process.exit(1);
});
