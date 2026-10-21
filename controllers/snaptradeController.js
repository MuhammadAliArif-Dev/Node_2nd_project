const User = require("../models/user")
const BrokerageAccount = require("../models/brokerageAccount")
const snaptrade = require("../config/snaptrade")
const webhookQueue = require("../queues/webhookQueue")

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
            userSecret: userSecret,
            connectionType: "trade"
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

        if (eventType === "CONNECTION_ADDED" || 
            eventType === "ACCOUNT_ADDED" || 
            eventType === "CONNECTION_ATTEMPT_SUCCESS" || 
            eventType === "NEW_ACCOUNT_AVAILABLE" || 
            eventType === "CONNECTION_FIXED" || 
            eventType === "CONNECTION_UPDATED") {
            if (userId && typeof userId === "string") {
                await webhookQueue.add("syncAccountJob", {
                    userId: userId,
                    eventType: eventType
                })
                console.log(`Sync job successfully added to Redis for: ${userId}`)
            }
        } else if(eventType === 'CONNECTION_BROKEN') {
            if (userId && typeof userId === "string") {
                await webhookQueue.add("brokenConnectionJob", {
                    userId: userId,
                    eventType: eventType
                })
                console.log(`Broken connection job successfully added to Redis for : ${userId}`)
            }
        } 
        else {
            console.log(`Event '${eventType}' acknowledged, no sync needed.`);
        }
        return res.status(200).json({ received: true})

    } catch (error) {
        console.error("Ingestion error:", error);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Failed to queue webhook event" });
        }
    }
};

const listConnections = async (req, res) => {
    try {
        const userId = `user_${req.user.id}`;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.snaptradeUserSecret) {
            return res.status(200).json({
                message: "No connections found",
                count: 0,
                connections: []
            });
        }

        const response = await snaptrade.connections.listBrokerageAuthorizations({
            userId: userId,
            userSecret: user.snaptradeUserSecret
        });

        const localAccounts = await BrokerageAccount.findAll({
            where: { userId: user.id }
        });

        const formattedConnections = (response.data || []).map((auth) => {
            const linkedAccounts = localAccounts.filter(acc => acc.connectionId === auth.id);
            return {
                id: auth.id,
                brokerageName: auth.brokerage?.name || auth.name,
                status: auth.disabled ? "Disabled" : "Active",
                connectedAt: auth.created_date,
                accounts: linkedAccounts.map(acc => ({
                    accountId: acc.accountId,
                    accountName: acc.accountName,
                    accountNumber: acc.accountNumber,
                    status: acc.status
                }))
            };
        });
        return res.status(200).json({
            message: "Connections fetched successfully",
            count: formattedConnections.length,
            connections: formattedConnections
        });


    } catch (error) {
        console.error("Error listing connections:", error);
        return res.status(500).json({
            message: "Failed to list connections",
            error: error.response?.data || error.message
        });
    }
};

const deleteConnection = async (req, res) => {
    try {
        const { authorizationId } = req.params;
        const userId = `user_${req.user.id}`;

        if (!authorizationId) {
            return res.status(400).json({ message: "Authorization ID is required" });
        }

        const user = await User.findByPk(req.user.id);
        if (!user || !user.snaptradeUserSecret) {
            return res.status(404).json({ message: "User or SnapTrade credentials not found" });
        }

        await snaptrade.connections.deleteConnection({
            connectionId: authorizationId,
            userId: userId,
            userSecret: user.snaptradeUserSecret
        });


        await BrokerageAccount.update(
            { status: "Disabled" },
            { where: { connectionId: authorizationId, userId: user.id } }
        );

        console.log(`Connection ${authorizationId} removed for user ${user.id}`);
        return res.status(200).json({
            message: "Brokerage connection removed successfully",
            authorizationId: authorizationId
        });

    } catch (error) {
        console.error("Error removing connection:", error);
        return res.status(500).json({
            message: "Failed to remove connection",
            error: error.response?.data || error.message
        });
    }
};

const placeOrder = async (req, res) => {
    try {
        const { accountId, symbol, action, units, orderType, price, timeInForce } = req.body;
        const userId = `user_${req.user.id}`;

        if (!accountId || !symbol || !action || !units) {
            return res.status(400).json({
                message: "accountId, symbol, action (BUY/SELL), and units are required"
            });
        }

        const normalizedAction = action.toUpperCase();
        if (normalizedAction !== "BUY" && normalizedAction !== "SELL") {
            return res.status(400).json({ message: "Action must be either 'BUY' or 'SELL'" });
        }

        if (Number(units) <= 0) {
            return res.status(400).json({ message: "Units must be greater than 0" });
        }

        const normalizedOrderType = orderType ? (orderType.charAt(0).toUpperCase() + orderType.slice(1).toLowerCase()) : "Market";
        if (normalizedOrderType === "Limit" && (!price || Number(price) <= 0)) {
            return res.status(400).json({ message: "Price is required and must be greater than 0 for Limit orders" });
        }

        const user = await User.findByPk(req.user.id);
        if (!user || !user.snaptradeUserSecret) {
            return res.status(404).json({ message: "User or SnapTrade credentials not found" });
        }

        const account = await BrokerageAccount.findOne({
            where: {
                accountId: accountId,
                userId: user.id
            }
        });
        if (!account) {
            return res.status(403).json({
                message: "Unauthorized: You do not own this brokerage account"
            });
        }
        if (account.status === "Disabled") {
            return res.status(400).json({
                message: "Cannot place order: This brokerage connection is disabled"
            });
        }

        // Place Order via SnapTrade API
        const tradePayload = {
            userId: userId,
            userSecret: user.snaptradeUserSecret,
            account_id: accountId,
            action: normalizedAction,
            symbol: symbol.toUpperCase().trim(),
            order_type: normalizedOrderType,
            time_in_force: timeInForce || "Day",
            units: Number(units),
            price: normalizedOrderType === "Limit" ? Number(price) : null
        };
        console.log(`[Trading] Placing ${normalizedAction} order for ${units} shares of ${symbol}...`);

        const orderResponse = await snaptrade.trading.placeForceOrder(tradePayload);
        const orderData = orderResponse.data;

        return res.status(200).json({
            message: "Order placed successfully",
            order: {
                brokerageOrderId: orderData.brokerage_order_id || orderData.id,
                status: orderData.status,
                symbol: symbol.toUpperCase(),
                action: normalizedAction,
                units: Number(units),
                orderType: normalizedOrderType,
                timeInForce: timeInForce || "Day",
                placedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("Order placement failed:", error);
        return res.status(500).json({
            message: "Failed to place order",
            error: error.response?.data || error.message
        });
    }
};

const reconnectConnection = async (req, res) => {
    try {
        const { connectionId } = req.params
        const userId = `user_${req.user.id}`
        
        if(!connectionId) {
            return res.status(400).json({ message: "Connection ID is required"})
        }

        const user = await User.findByPk(req.user.id)
        if(!user || !user.snaptradeUserSecret) {
            return res.status(400).json({ message: "User or SnapTrade credentials not found"})
        }

        const account = await BrokerageAccount.findOne({
            where: {
                connectionId: connectionId,
                userId: user.id
            }
        })
        if(!account) {
            return res.status(403).json({
                message: "Unauthorized: You do not own this brokerage connection"
            })
        }

        console.log(`Generating reconnect link for connection: ${connectionId}....`)
        const loginResponse = await snaptrade.authentication.loginSnapTradeUser({
            userId: userId,
            userSecret: user.snaptradeUserSecret,
            reconnect: connectionId,
            connectionType: "trade"
        })
        return res.status(200).json({
            message: "Reconnecetion link generated successfully",
            redirectURI: loginResponse.data.redirectURI,
            connectionId: connectionId
        })
    } catch (error) {
        console.error("Failed to generate reconnect link:", error);
        return res.status(500).json({
            message: "Failed to generate reconnect link",
            error: error.response?.data || error.message
        });
    }
}

module.exports = {
    connectAlpaca,
    handleWebhook,
    syncUserAccounts,
    listConnections,
    deleteConnection,
    placeOrder,
    reconnectConnection
};


// 3b04ce8d-c400-4eb3-a4ce-bb7629501c8c
// f9b8f66e-6a85-41ad-b45c-8232ed522294