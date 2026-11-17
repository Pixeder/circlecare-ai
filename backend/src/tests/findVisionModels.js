import '../config/env.js';
import { getNvidiaClient } from '../config/nvidia.js';

async function findVisionModels() {
  const client = getNvidiaClient();
  if (!client) {
    console.error('No client');
    process.exit(1);
  }

  try {
    const models = await client.models.list();
    const all = models.data || [];
    const vision = all.filter((m) => {
      const id = m.id.toLowerCase();
      return id.includes('vision') || id.includes('pixtral') || id.includes('neva') || id.includes('ocr') || id.includes('vl') || id.includes('multimodal');
    });

    console.log('Total vision/multimodal models found:', vision.length);
    vision.forEach((m) => console.log(' -', m.id));
  } catch (err) {
    console.error('Error finding vision models:', err.message);
  }
}

findVisionModels();
