import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../backend/.env');

if (!fs.existsSync(envPath)) {
  console.log('.env file not found at:', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split(/\r?\n/);
console.log('=== Backend .env Configuration Audit ===');
lines.forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    const isPlaceholder = !val || val.includes('placeholder') || val.includes('your_') || val === '""';
    console.log(`${key}: ${isPlaceholder ? 'NOT_CONFIGURED (placeholder or empty)' : `CONFIGURED (len: ${val.length})`}`);
  }
});
