require("dotenv").config()
const express = require("express")
const app = express()
const passport = require("./config/passport")
const sequelize = require("./config/database")
const User = require("./models/user")
const BrokerageAccount = require("./models/brokerageAccount")
const authRoutes = require("./routes/authRoutes")
const snaptradeRoutes = require("./routes/snaptradeRoutes")
const worker = require("./workers/webhookWorker")
const PORT = process.env.PORT || 3500
//middleware
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf
    }
}))
app.use(passport.initialize())

app.use("/api/auth", authRoutes)
app.use("/api/snaptrade", snaptradeRoutes)

// app.get("/", (req, res) => {
//     res.send("hello world")
// }) 

sequelize.authenticate().then(() => {
    console.log("database connected")
}).catch((err) => {
    console.log("DB Error")
})

sequelize.sync({
    alter: true
}).then()

app.listen(PORT, () => console.log(`server is running on port ${PORT}`))