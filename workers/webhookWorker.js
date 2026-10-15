const { Worker } = require("bullmq");
const redisConnection = require("../config/redis");
const { syncUserAccounts } = require("../controllers/snaptradeController");

const webhookWorker = new Worker("snaptrade-webhook-queue",
    async (job) => {
        console.log(`Job received: ${job.name} (ID: ${job.id})`);
        const { userId } = job.data;

        if (!userId) {
            console.warn(`Job ${job.id} skipped: No userId found.`);
            return;
        }
        await syncUserAccounts(userId);
    },
    {
        connection: redisConnection.duplicate()
    }
);

webhookWorker.on("completed", (job) => {
    console.log(`Job ${job.id} successfully completed!`);
});

webhookWorker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed! Error: ${err.message}`);
    console.log(`BullMQ will automatically retry if attempts are left...`);
});

module.exports = webhookWorker;