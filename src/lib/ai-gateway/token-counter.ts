// Lightweight token counter — uses tiktoken where available, falls back to approximation

let encoder: any = null;

async function getEncoder() {
  if (encoder) return encoder;
  try {
    // Dynamic import — tiktoken may not be installed in all environments
    const { encoding_for_model } = await import('tiktoken');
    encoder = encoding_for_model('gpt-4');
    return encoder;
  } catch {
    return null;
  }
}

export async function countTokens(text: string, model?: string): Promise<number> {
  const enc = await getEncoder();
  if (enc) {
    return enc.encode(text).length;
  }
  // Approximation: ~4 chars per token (industry-standard heuristic)
  return Math.ceil(text.length / 4);
}

export async function countMessageTokens(messages: Array<{ role: string; content: string | any[] }>): Promise<number> {
  let total = 0;
  for (const msg of messages) {
    // Role token overhead (~4 tokens per message)
    total += 4;
    if (typeof msg.content === 'string') {
      total += await countTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === 'text') total += await countTokens(part.text);
        else if (part.type === 'image_url' || part.type === 'image') total += 85; // Image base overhead
        else if (part.type === 'audio') total += 50;
      }
    }
  }
  return total + 2; // Priming tokens
}

export function estimateTokensApprox(text: string): number {
  return Math.ceil(text.length / 4);
}
