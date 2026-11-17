import '../config/env.js';
import { getNvidiaClient } from '../config/nvidia.js';

async function testVision() {
  const client = getNvidiaClient();
  console.log('Testing NVIDIA Multimodal model: meta/llama-3.2-90b-vision-instruct');

  // A 1x1 transparent GIF in base64 or a small test data URL
  const testBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  try {
    const res = await client.chat.completions.create({
      model: 'meta/llama-3.2-90b-vision-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe what you see in this image in one brief phrase.' },
            { type: 'image_url', image_url: { url: testBase64 } },
          ],
        },
      ],
      max_tokens: 60,
    });

    console.log('Vision response:', res.choices[0]?.message?.content);
    return true;
  } catch (err) {
    console.error('Vision test error:', err.message);
    return false;
  }
}

testVision();
