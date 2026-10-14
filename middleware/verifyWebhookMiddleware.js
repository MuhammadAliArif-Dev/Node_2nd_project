const crypto = require("crypto");

const verifySnapTradeWebhook = (req, res, next) => {
    try {
        const signature = req.headers["signature"];

        if (!signature) {
            console.warn("[Webhook Security] Missing 'Signature' header");
            return res.status(401).json({ error: "Missing signature header" });
        }

        const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;
        if (!consumerKey) {
            console.error("[Webhook Security] SNAPTRADE_CONSUMER_KEY missing in .env");
            return res.status(500).json({ error: "SnapTrade configuration error" });
        }

        const hmac = crypto.createHmac("sha256", consumerKey);
        hmac.update(req.rawBody || "");
        
        const computedSignature = hmac.digest("base64");

        const signatureBuffer = Buffer.from(signature);
        const computedBuffer = Buffer.from(computedSignature);

        if (signatureBuffer.length !== computedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, computedBuffer)) {
            console.warn("[Webhook Security] Invalid webhook signature");
            return res.status(401).json({ error: "Invalid signature" });
        }
        next();

    } catch (error) {
        console.error("[Webhook Security] Verification error:", error);
        return res.status(500).json({ error: "Failed to verify webhook signature" });
    }
};

module.exports = verifySnapTradeWebhook;
