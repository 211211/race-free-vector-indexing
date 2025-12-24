// scripts/setup.ts - Setup Qdrant collection

const COLLECTION_NAME = 'chunks';
const VECTOR_SIZE = 384;
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';

interface QdrantCollectionsResponse {
  result?: {
    collections?: Array<{ name: string }>;
  };
}

interface QdrantCollectionInfoResponse {
  result?: {
    points_count?: number;
  };
}

async function setup() {
  console.log(`Connecting to Qdrant at ${QDRANT_URL}...`);

  const shouldReset = process.argv.includes('--reset');

  try {
    // Check if collection exists
    const res = await fetch(`${QDRANT_URL}/collections`);
    const data = (await res.json()) as QdrantCollectionsResponse;
    const exists = data.result?.collections?.some((c) => c.name === COLLECTION_NAME);

    if (exists) {
      console.log(`Collection '${COLLECTION_NAME}' already exists.`);

      if (shouldReset) {
        console.log('Deleting existing collection...');
        await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, { method: 'DELETE' });
      } else {
        const info = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`);
        const infoData = (await info.json()) as QdrantCollectionInfoResponse;
        console.log(`Points count: ${infoData.result?.points_count || 0}`);
        console.log('Use --reset to recreate collection.');
        return;
      }
    }

    // Create collection
    console.log(`Creating collection '${COLLECTION_NAME}'...`);
    await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        optimizers_config: { default_segment_number: 2 },
      }),
    });

    // Create payload indexes
    console.log('Creating payload indexes...');

    const indexes = ['uuid', 'documentNumber', 'status', 'version'];
    for (const field of indexes) {
      await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/index`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_name: field,
          field_schema: field === 'version' ? 'integer' : 'keyword',
        }),
      });
    }

    console.log('Setup completed!');
    console.log(`- Collection: ${COLLECTION_NAME}`);
    console.log(`- Vector size: ${VECTOR_SIZE}`);
    console.log(`- Distance: Cosine`);

  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setup();
