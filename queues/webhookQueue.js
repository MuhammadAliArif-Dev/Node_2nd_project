const { Queue } = require("bullmq")
const redisConnection = require("../config/redis")

const webhookQueue = new Queue("snaptrade-webhook-queue", {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
})

module.exports = webhookQueue