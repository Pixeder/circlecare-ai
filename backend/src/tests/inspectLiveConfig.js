import { config } from '../config/env.js';

console.log('=== Config Object Values (Non-Sensitive) ===');
console.log('NVIDIA Base URL:', config.nvidia.baseURL);
console.log('NVIDIA Model:', config.nvidia.model);
console.log('NVIDIA Mock LLM setting:', config.nvidia.mockLLM);
console.log('NVIDIA API Key exists:', Boolean(config.nvidia.apiKey && config.nvidia.apiKey.startsWith('nvapi-')));
console.log('MongoDB URI protocol:', config.mongodb.uri ? config.mongodb.uri.split('://')[0] + '://' : 'none');
console.log('MongoDB Host domain:', config.mongodb.uri ? config.mongodb.uri.split('@')[1]?.split('/')[0] || 'localhost' : 'none');
console.log('Qdrant URL:', config.qdrant.url);
console.log('Qdrant Collection Name:', config.qdrant.collectionName);
console.log('Cloudinary Cloud Name configured:', Boolean(config.cloudinary.cloudName && !config.cloudinary.cloudName.includes('placeholder')));
console.log('Firebase Project ID:', config.firebase.projectId);
console.log('Firebase Client Email configured:', Boolean(config.firebase.clientEmail && !config.firebase.clientEmail.includes('placeholder')));
console.log('Firebase Private Key configured:', Boolean(config.firebase.privateKey && config.firebase.privateKey.includes('BEGIN PRIVATE KEY')));
console.log('Firebase Dev Bypass Auth:', config.firebase.devBypassAuth);
