import { getNvidiaClient } from '../config/nvidia.js';
import { config } from '../config/env.js';

async function debugCall() {
  const client = getNvidiaClient();
  const res = await client.chat.completions.create({
    model: config.nvidia.model,
    messages: [
      { role: 'user', content: 'Say hello in 3 words.' },
    ],
    max_tokens: 1024,
  });

  console.log('Finish Reason:', res.choices[0].finish_reason);
  console.log('Reasoning length:', res.choices[0].message?.reasoning_content?.length);
  console.log('Content:', res.choices[0].message?.content);
}

debugCall().catch(console.error);
