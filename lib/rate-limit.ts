// lib/rate-limit.ts
// Per-user rate limiting for AI endpoints using Upstash Redis
// Falls back gracefully if Redis is not configured

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // unix timestamp ms
}

// Simple in-memory fallback for local dev (no Redis)
const memoryStore = new Map<string, { count: number; reset: number }>();

async function limitWithMemory(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.reset < now) {
    memoryStore.set(key, { count: 1, reset: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.reset };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, reset: entry.reset };
}

/**
 * Rate limit by key (e.g. `ai:${userId}`)
 * @param key    Unique identifier (userId, IP, etc.)
 * @param limit  Max requests per window
 * @param windowMs  Window size in milliseconds
 */
export async function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // No Redis configured — use memory (dev only)
  if (!redisUrl || !redisToken) {
    return limitWithMemory(key, limit, windowMs);
  }

  try {
    const windowSec = Math.ceil(windowMs / 1000);
    const redisKey = `rl:${key}`;

    // INCR + EXPIRE in a pipeline
    const pipeline = [
      ["INCR", redisKey],
      ["EXPIRE", redisKey, String(windowSec), "NX"],
    ];

    const res = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipeline),
    });

    const data = (await res.json()) as [{ result: number }, unknown];
    const count = data[0].result;

    const remaining = Math.max(limit - count, 0);
    const reset = Date.now() + windowMs;

    return { success: count <= limit, remaining, reset };
  } catch {
    // Redis error — fail open (allow request)
    return { success: true, remaining: limit, reset: Date.now() + windowMs };
  }
}

/**
 * Returns a NextResponse 429 payload
 */
export function rateLimitResponse(reset: number) {
  return {
    error: "Too many requests. Please slow down.",
    retryAfter: Math.ceil((reset - Date.now()) / 1000),
  };
}
