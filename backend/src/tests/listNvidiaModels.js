import { getNvidiaClient } from '../config/nvidia.js';

async function listModels() {
  const client = getNvidiaClient();
  if (!client) {
    console.error('No client');
    process.exit(1);
  }

  try {
    const models = await client.models.list();
    console.log('Total models available:', models.data?.length);
    const mistralModels = models.data?.filter((m) => m.id.toLowerCase().includes('mistral'));
    console.log('Mistral models:', mistralModels.map((m) => m.id));
  } catch (err) {
    console.error('List models error:', err.message);
  }
}

listModels();
