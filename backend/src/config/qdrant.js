import { config } from "./env.js";

let QdrantClient = null;
try {
  const mod = await import("@qdrant/js-client-rest");
  QdrantClient = mod.QdrantClient;
} catch {
  // Qdrant client not installed or offline
}

let qdrantClientInstance = null;
let isQdrantReady = false;

export function getQdrantClient() {
  if (qdrantClientInstance) return qdrantClientInstance;
  if (!QdrantClient) return null;

  try {
    qdrantClientInstance = new QdrantClient({
      url: config.qdrant.url,
      checkCompatibility: false,
    });
    return qdrantClientInstance;
  } catch (error) {
    console.warn(`[Qdrant] Client initialization warning: ${error.message}`);
    return null;
  }
}

/**
 * Initializes the medical memory collection if not present
 */
export async function initQdrantCollection() {
  const client = getQdrantClient();
  if (!client) {
    console.warn(
      "[Qdrant] Client not available. Running in mock/memory vector store mode.",
    );
    return false;
  }

  try {
    const collections = await client.getCollections();
    const exists = collections.collections?.some(
      (c) => c.name === config.qdrant.collectionName,
    );

    if (!exists) {
      await client.createCollection(config.qdrant.collectionName, {
        vectors: {
          size: 1024,
          distance: "Cosine",
        },
      });
      console.log(
        `[Qdrant] Collection '${config.qdrant.collectionName}' created successfully.`,
      );
    } else {
      console.log(
        `[Qdrant] Collection '${config.qdrant.collectionName}' ready.`,
      );
    }
    isQdrantReady = true;
    return true;
  } catch (error) {
    console.warn(
      `[Qdrant] Collection check failed: ${error.message}. Running in mock/offline vector mode.`,
    );
    isQdrantReady = false;
    return false;
  }
}

export function isQdrantConnected() {
  return isQdrantReady;
}

export default getQdrantClient;
