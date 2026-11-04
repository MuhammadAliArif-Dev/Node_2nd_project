const IORedis = require("ioredis")

const redisConnection = process.env.REDIS_URL 
    ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
    : new IORedis({
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
        maxRetriesPerRequest: null
    });

redisConnection.on("connect", () => {
    console.log("Redis connected successfully ")
})

redisConnection.on("error",(err)=>{
    console.log("Redis connection error", err.message)
})

module.exports = redisConnection