// BullMQ queue configuration - graceful fallback when Redis is unavailable

let queueAvailable = false;

interface QueueJob {
  id: string;
  name: string;
  data: Record<string, unknown>;
  status: 'pending' | 'active' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  result?: unknown;
  error?: string;
}

// In-memory fallback for when Redis/BullMQ is unavailable
const memoryQueue: Map<string, QueueJob[]> = new Map();

export async function addJob(
  queueName: string,
  jobName: string,
  data: Record<string, unknown>,
  options?: { delay?: number; attempts?: number }
): Promise<string | null> {
  // Try BullMQ first
  try {
    const { Queue } = await import('bullmq');
    const queue = new Queue(queueName, {
      connection: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    const job = await queue.add(jobName, data, {
      delay: options?.delay,
      attempts: options?.attempts || 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    queueAvailable = true;
    return job.id || null;
  } catch {
    // Fallback to in-memory queue
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const jobs = memoryQueue.get(queueName) || [];
    jobs.push({
      id: jobId,
      name: jobName,
      data,
      status: 'pending',
      createdAt: new Date(),
    });
    memoryQueue.set(queueName, jobs);
    return jobId;
  }
}

export async function getQueueStatus(queueName: string) {
  if (queueAvailable) {
    try {
      const { Queue } = await import('bullmq');
      const queue = new Queue(queueName, {
        connection: process.env.REDIS_URL || 'redis://localhost:6379',
      });
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);
      return { waiting, active, completed, failed };
    } catch {
      // fall through
    }
  }
  
  const jobs = memoryQueue.get(queueName) || [];
  return {
    waiting: jobs.filter(j => j.status === 'pending').length,
    active: jobs.filter(j => j.status === 'active').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };
}
