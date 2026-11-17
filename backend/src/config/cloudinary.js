import { config } from './env.js';

let cloudinary = null;
try {
  const mod = await import('cloudinary');
  cloudinary = mod.v2;
} catch {
  // Cloudinary not installed or offline
}

let isCloudinaryConfigured = false;

if (cloudinary && config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
  isCloudinaryConfigured = true;
  console.log('[Cloudinary] Configured successfully.');
} else {
  console.warn('[Cloudinary] Running in local simulation mode for prescriptions.');
}

export { cloudinary, isCloudinaryConfigured };
export default cloudinary;
