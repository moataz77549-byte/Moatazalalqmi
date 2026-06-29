// Qdrant client - graceful fallback when Qdrant is unavailable

interface QdrantPoint {
  id: string;
  vector: number[];
  payload?: Record<string, any>;
}

interface SearchResult {
  id: string;
  score: number;
  payload?: Record<string, any>;
}

export async function qdrantSearch(
  collectionName: string,
  queryVector: number[],
  limit: number = 10,
  filter?: Record<string, any>
): Promise<SearchResult[]> {
  const url = process.env.QDRANT_URL || 'http://localhost:6333';
  const apiKey = process.env.QDRANT_API_KEY;
  
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['api-key'] = apiKey;
    
    const response = await fetch(`${url}/collections/${collectionName}/points/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        vector: queryVector,
        limit,
        filter: filter || undefined,
        with_payload: true,
      }),
    });
    
    if (!response.ok) return [];
    const data = await response.json();
    return (data.result || []).map((r: any) => ({
      id: r.id,
      score: r.score,
      payload: r.payload,
    }));
  } catch {
    console.warn('Qdrant not available');
    return [];
  }
}

export async function qdrantUpsert(
  collectionName: string,
  points: QdrantPoint[]
): Promise<boolean> {
  const url = process.env.QDRANT_URL || 'http://localhost:6333';
  const apiKey = process.env.QDRANT_API_KEY;
  
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['api-key'] = apiKey;
    
    const response = await fetch(`${url}/collections/${collectionName}/points`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ points }),
    });
    
    return response.ok;
  } catch {
    console.warn('Qdrant not available');
    return false;
  }
}

export async function qdrantCreateCollection(
  collectionName: string,
  vectorSize: number = 1536
): Promise<boolean> {
  const url = process.env.QDRANT_URL || 'http://localhost:6333';
  const apiKey = process.env.QDRANT_API_KEY;
  
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['api-key'] = apiKey;
    
    const response = await fetch(`${url}/collections/${collectionName}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        vectors: { size: vectorSize, distance: 'Cosine' },
      }),
    });
    
    return response.ok;
  } catch {
    return false;
  }
}
