const User = require("../models/user")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")

const login = async (req, res) => {
    const { email, password } = req.body
    const cleanemail = email.toLowerCase().trim()
    try {
        const user = await User.findOne({ where: { email: cleanemail } })
        if (!user) {
            return res.status(401).json({
                message: "Invalid Credentails"
            })
        }
        const MatchPwd = await bcrypt.compare(password, user.password)
        if (!MatchPwd) {
            return res.status(401).json({
                message: "Invalid Credentails"
            })
        }
        const token = jwt.sign({
            id: user.id,
            email: user.email,
            role: user.role
        },
            process.env.JWT_SECRET,
            { expiresIn: "5m" }
        )
        res.status(200).json({
            message: "Login Successful",
            token: token
        })
    } catch (err) {
        res.status(500).json({
            error: err.message
        })
    }
}

module.exports = { login }