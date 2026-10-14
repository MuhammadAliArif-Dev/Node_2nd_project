const User = require("../models/user")
const BrokerageAccount = require("../models/brokerageAccount")
const snaptrade = require("../config/snaptrade")

const connectAlpaca = async (req, res) => {
    try {
        const userId = `user_${req.user.id}`;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        let userSecret = user.snaptradeUserSecret;

        if (!userSecret) {
            console.log("Registering new user on SnapTrade...");
            const registerResponse = await snaptrade.authentication.registerSnapTradeUser({
                userId: userId
            });
            userSecret = registerResponse.data.userSecret;

            user.snaptradeUserSecret = userSecret;
            await user.save();
            console.log("UserSecret saved to database successfully!");
        } else {
            console.log("Existing SnapTrade UserSecret found in database, reusing it!");
        }

        const loginResponse = await snaptrade.authentication.loginSnapTradeUser({
            userId: userId,
            userSecret: userSecret
        });

        res.status(200).json({
            message: "Alpaca connection link generated successfully",
            redirectURI: loginResponse.data.redirectURI,
            userId: userId
        });

    } catch (error) {
        console.error("SnapTrade Error:", error);
        res.status(500).json({
            message: "Failed to generate Alpaca connection link",
            error: error.response?.data || error.message
        });
    }
};

const syncUserAccounts = async (userId) => {
    try {
        const rawId = userId.startsWith("user_") ? userId.replace("user_", "") : userId;
        const numericUserId = parseInt(rawId, 10);
        if (isNaN(numericUserId)) {
            console.warn(`Invalid user ID format: '${userId}'`);
            return;
        }
        const user = await User.findByPk(numericUserId);
        if (!user || !user.snaptradeUserSecret) {
            console.warn(`User or secret not found for ID ${numericUserId}`);
            return;
        }
        const accountsResponse = await snaptrade.accountInformation.listUserAccounts({
            userId: userId,
            userSecret: user.snaptradeUserSecret
        });
        const accounts = accountsResponse?.data || [];
        if (!Array.isArray(accounts) || accounts.length === 0) {
            console.log(`No accounts found to sync for user ID ${numericUserId}`);
            return;
        }
        for (const acc of accounts) {
            await BrokerageAccount.upsert({
                userId: user.id,
                connectionId: acc.brokerage_authorization,
                accountId: acc.id,
                brokerageName: acc.institution_name,
                accountNumber: acc.number,
                accountName: acc.name,
                status: "Active"
            });
        }
        console.log(`Successfully synced ${accounts.length} account(s) for user ID ${user.id}`);
    } catch (error) {
        console.error(`Background account sync failed for ${userId}:`, error.message);
    }
};

const handleWebhook = async (req, res) => {
    try {
        const { eventType, userId } = req.body || {};
        if (!eventType) {
            console.warn("Missing 'eventType'");
            return res.status(200).json({ received: true });
        }
        console.log(`Received: ${eventType} | User: ${userId || "None"}`);
        res.status(200).json({ received: true });

        if (eventType === "CONNECTION_ATTEMPT_SUCCESS" || eventType === "ACCOUNT_ADDED") {
            if (userId && typeof userId === "string") {
                setImmediate(() => {
                    syncUserAccounts(userId);
                });
            }
        } else {
            console.log(`Event '${eventType}' acknowledged, no sync needed.`);
        }
    } catch (error) {
        console.error("Ingestion error:", error);
        if (!res.headersSent) {
            return res.status(200).json({ received: true });
        }
    }
};
module.exports = {
    connectAlpaca,
    handleWebhook,
    syncUserAccounts
};
