const express = require("express")
const router = express.Router()
const { connectAlpaca, handleWebhook} = require("../controllers/snaptradeController")
const authMiddleware = require("../middleware/authMiddleware")

router.post("/connect-alpaca",authMiddleware, connectAlpaca)

router.post("/webhook", handleWebhook)

module.exports = router