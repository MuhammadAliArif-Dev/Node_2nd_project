const axios = require("axios")

const massiveApi = axios.create({
    baseURL: process.env.MASSIVE_BASE_URL || "https://api.polygon.io",
    timeout: 5000,
    headers: {
        Authorization: `Bearer ${process.env.MASSIVE_API_KEY}`
    } 
})

module.exports = massiveApi
