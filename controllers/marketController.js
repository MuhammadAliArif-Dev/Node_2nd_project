const massiveApi = require("../config/massiveApi");

const getMarketStatus = async (req, res) => {
    try {
        const response = await massiveApi.get("/v1/marketstatus/now");
        const data = response.data;

        return res.status(200).json({
            status: data.market,
            serverTime: data.serverTime,
            exchanges: {
                nasdaq: data.exchanges?.nasdaq,
                nyse: data.exchanges?.nyse
            }
        });
    } catch (error) {
        console.error("Error fetching market status:", error.message);
        if (error.response?.status === 429) {
            return res.status(429).json({ message: "Rate limit reached(5 req/min). Please wait a moment." });
        }
        return res.status(error.response?.status || 500).json({
            message: "Failed to fetch market status",
            error: error.response?.data || error.message
        });
    }
};

const getTickerDetails = async (req, res) => {
    try {
        const { symbol } = req.params;
        if (!symbol) {
            return res.status(400).json({ message: "Stock symbol is required" });
        }

        const upperSymbol = symbol.toUpperCase().trim();
        const response = await massiveApi.get(`/v3/reference/tickers/${upperSymbol}`);
        const results = response.data?.results;

        if (!results) {
            return res.status(404).json({ message: `Ticker '${upperSymbol}' not found` });
        }

        return res.status(200).json({
            symbol: results.ticker,
            name: results.name,
            market: results.market,
            locale: results.locale,
            exchange: results.primary_exchange,
            currency: results.currency_name,
            description: results.description,
            homepageUrl: results.homepage_url
        });
    } catch (error) {
        console.error(`Error fetching ticker details for ${req.params.symbol}:`, error.message);
        if (error.response?.status === 429) {
            return res.status(429).json({ message: "Rate limit reached(5 req/min). Please wait a moment." });
        }
        return res.status(error.response?.status || 500).json({
            message: "Failed to fetch ticker details",
            error: error.response?.data || error.message
        });
    }
};

const getPreviousClose = async (req, res) => {
    try {
        const { symbol } = req.params;
        if (!symbol) {
            return res.status(400).json({ message: "Stock symbol is required" });
        }

        const upperSymbol = symbol.toUpperCase().trim();
        const response = await massiveApi.get(`/v2/aggs/ticker/${upperSymbol}/prev`);
        const results = response.data?.results;

        if (!results || results.length === 0) {
            return res.status(404).json({ message: `No price data found for '${upperSymbol}'` });
        }

        const bar = results[0];
        return res.status(200).json({
            symbol: upperSymbol,
            close: bar.c,
            high: bar.h,
            low: bar.l,
            open: bar.o,
            volume: bar.v,
            volumeWeightedAveragePrice: bar.vw,
            tradingDate: new Date(bar.t).toISOString().split("T")[0]
        });
    } catch (error) {
        console.error(`Error fetching previous close for ${req.params.symbol}:`, error.message);
        if (error.response?.status === 429) {
            return res.status(429).json({ message: "Rate limit reached (5 req/min). Please wait a moment." });
        }
        return res.status(error.response?.status || 500).json({
            message: "Failed to fetch quote data",
            error: error.response?.data || error.message
        });
    }
};

module.exports = {
    getMarketStatus,
    getTickerDetails,
    getPreviousClose
};
