const { Worker } = require("bullmq");
const redisConnection = require("../config/redis");
const { syncUserAccounts } = require("../controllers/snaptradeController");
const BrokerageAccount = require("../models/brokerageAccount")

const webhookWorker = new Worker("snaptrade-webhook-queue",
    async (job) => {
        console.log(`Job received: ${job.name} (ID: ${job.id})`);
        const { userId, eventType } = job.data;

        if (!userId) {
            console.warn(`Job ${job.id} skipped: No userId found.`);
            return;
        }
        if (job.name === "brokenConnectionJob" || eventType === "CONNECTION_BROKEN") {
            const rawId = userId.startsWith("user_") ? userId.replace("user_", "") : userId;
            const numericUserId = parseInt(rawId, 10);
            
            await BrokerageAccount.update(
                { status: "Broken" },
                { where: { userId: numericUserId } }
            );
            console.log(`Marked accounts as 'Broken' for user ID: ${numericUserId}`);
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