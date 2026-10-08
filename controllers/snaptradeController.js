const User = require("../models/user")
const { json } = require("sequelize")
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


const handleWebhook = async (req, res) => {
    try {
        console.log("SNAPTRADE WEBHOOK RECEIVED")
        console.log("Header:",req.headers)
        console.log("Payload / Data:", JSON.stringify(req.body, null, 2))
        const { eventType, userId} = req.body

        switch (eventType) {
            case "CONNECTION_ATTEMPT_SUCCESS":
                console.log(`User ${userId} successfully connected to their brokerage (Alpaca)!`)
                break

            case "ACCOUNT_ADDED":
                console.log(`New Account added for User ${userId}`)
                break
            default:
                console.log(`Event Received: ${eventType}`)
        }
        return res.status(200).json({
            received: true,
            message: "Webhook received successfully"
        })
    } catch (error) {
        console.error("Webhook processing error:", error)
        return res.status(500).json({
            error: "Webhook error"
        })
    }
}

module.exports = {
    connectAlpaca,
    handleWebhook
}
