const express = require("express")
const router = express.Router()
const { connectAlpaca, handleWebhook, listConnections, deleteConnection, placeOrder, reconnectConnection} = require("../controllers/snaptradeController")
const authMiddleware = require("../middleware/authMiddleware")
const verifySnapTradeWebhook = require("../middleware/verifyWebhookMiddleware")

router.post("/connect-alpaca", authMiddleware, connectAlpaca)

router.post("/webhook", verifySnapTradeWebhook, handleWebhook)

router.get("/connections", authMiddleware, listConnections)

router.delete("/connections/:authorizationId", authMiddleware, deleteConnection)

router.post("/place-order", authMiddleware, placeOrder)

router.post("/connections/:connectionId/reconnect", authMiddleware, reconnectConnection)

module.exports = router