const { Snaptrade } = require("snaptrade-typescript-sdk")

const snaptrade = new Snaptrade({
    auth: {
        mode: "commercialApiKey",
        clientId: process.env.SNAPTRADE_CLIENT_ID,
        consumerKey: process.env.SNAPTRADE_CONSUMER_KEY
    }
})

module.exports = snaptrade
