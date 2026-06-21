import Redis from "ioredis"

import { env } from "@/env.mjs"

const globalForRedis = globalThis as unknown as {
  redisPublisher?: Redis
}

export function getRedisPublisher() {
  if (!globalForRedis.redisPublisher) {
    globalForRedis.redisPublisher = new Redis(env.REDIS_URL)
  }

  return globalForRedis.redisPublisher
}

export function createRedisSubscriber() {
  return new Redis(env.REDIS_URL)
}
