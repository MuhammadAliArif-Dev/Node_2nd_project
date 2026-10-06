const express = require("express")
const router = express.Router()
const { register } = require("../controllers/register")
const User = require("../models/user")
const passport = require("passport")
const { login } = require("../controllers/login")
const authMiddleware = require("../middleware/authMiddleware")
const { forgetPassword, resetPassword} = require("../controllers/passwordReset")
const { googleCallback } = require("../controllers/googleAuth")


router.post("/register", register)

router.post("/forget-pwd", forgetPassword)

router.post("/reset-pwd/:token", resetPassword)

router.post("/login", login)

router.get("/google", passport.authenticate("google", { scope:
    ["profile", "email"],
    session: false
}))

router.get("/google/callback", passport.authenticate("google", { failureRedirect: "/api/auth/login", session: false }),googleCallback)

router.get("/users", async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ["password"] }
        })
        res.json(users)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.get("/profile", authMiddleware, (req, res) => {
    res.json({
        message: "You have access to protected route",
        currentUser: req.user
    })
})

module.exports = router
