// S3-compatible object storage - graceful fallback to local storage

export interface StorageUploadResult {
  key: string;
  url: string;
  size: number;
}

export async function uploadFile(
  key: string,
  data: Buffer | Blob,
  contentType: string = 'application/octet-stream'
): Promise<StorageUploadResult> {
  // If S3 is configured, use it; otherwise store locally
  const endpoint = process.env.S3_ENDPOINT;
  
  if (endpoint) {
    return uploadToS3(key, data, contentType);
  }
  
  // Local fallback: store in /tmp/moataz-storage (dev only)
  const fs = await import('fs/promises');
  const path = await import('path');
  const storageDir = '/tmp/moataz-storage';
  await fs.mkdir(storageDir, { recursive: true });
  
  const filePath = path.join(storageDir, key.replace(/\//g, '_'));
  const buffer = data instanceof Blob ? Buffer.from(await data.arrayBuffer()) : data;
  await fs.writeFile(filePath, buffer);
  
  return { key, url: `/api/v1/files/local/${encodeURIComponent(key)}`, size: buffer.length };
}

async function uploadToS3(
  key: string,
  data: Buffer | Blob,
  contentType: string
): Promise<StorageUploadResult> {
  // S3 upload implementation using fetch API
  const endpoint = process.env.S3_ENDPOINT!;
  const bucket = process.env.S3_BUCKET || 'moataz-ai';
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;
  
  if (!accessKey || !secretKey) {
    throw new Error('S3 credentials not configured');
  }
  
  const buffer = data instanceof Blob ? Buffer.from(await data.arrayBuffer()) : data;
  const url = `${endpoint}/${bucket}/${key}`;
  
  // Simplified S3 PUT - in production, use AWS SDK with proper signing
  const response = await fetch(url, {
    method: 'PUT',
    body: buffer,
    headers: { 'Content-Type': contentType },
  });
  
  if (!response.ok) {
    throw new Error(`S3 upload failed: ${response.statusText}`);
  }
  
  return { key, url, size: buffer.length };
}

export async function deleteFile(key: string): Promise<boolean> {
  const endpoint = process.env.S3_ENDPOINT;
  
  if (endpoint) {
    const bucket = process.env.S3_BUCKET || 'moataz-ai';
    const url = `${endpoint}/${bucket}/${key}`;
    const response = await fetch(url, { method: 'DELETE' });
    return response.ok;
  }
  
  // Local fallback
  const fs = await import('fs/promises');
  const path = await import('path');
  const storageDir = '/tmp/moataz-storage';
  const filePath = path.join(storageDir, key.replace(/\//g, '_'));
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
