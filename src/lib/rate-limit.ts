import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a rate limiter that allows 5 requests per minute per IP
// Falls back to a no-op if Upstash is not configured
function createRateLimiter() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    // Return a mock rate limiter for development
    console.warn(
      "Upstash Redis not configured. Rate limiting disabled. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
    return {
      limit: async () => ({
        success: true,
        limit: 5,
        remaining: 5,
        reset: Date.now() + 60000,
      }),
    };
  }

  const redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 requests per minute
    analytics: true,
    prefix: "ratelimit:login",
  });
}

export const loginRateLimiter = createRateLimiter();

export async function checkRateLimit(
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const result = await loginRateLimiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
