const express = require("express")
const router = express.Router()
const { getMarketStatus, getTickerDetails, getPreviousClose } = require("../controllers/marketController")
const authMiddleware = require("../middleware/authMiddleware")

router.get("/status",authMiddleware, getMarketStatus);

router.get("/ticker/:symbol",authMiddleware, getTickerDetails);

router.get("/quote/:symbol",authMiddleware, getPreviousClose);

module.exports = router
