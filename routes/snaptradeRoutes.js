const express = require("express")
const router = express.Router()
const { connectAlpaca, handleWebhook} = require("../controllers/snaptradeController")
const authMiddleware = require("../middleware/authMiddleware")
const verifySnapTradeWebhook = require("../middleware/verifyWebhookMiddleware")

router.post("/connect-alpaca", authMiddleware, connectAlpaca)

router.post("/webhook", verifySnapTradeWebhook, handleWebhook)

module.exports = router