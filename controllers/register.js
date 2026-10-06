const User = require("../models/user")
const bcrypt = require("bcryptjs")

const register = async (req, res) =>{
    const { first_name, last_name, email, password, role } = req.body
    const cleanemail = email.toLowerCase().trim()
    try {
        const user = await User.findOne({where: {email: cleanemail}})
        if(user){
            return res.status(400).json({
                message: "User already exists"
            })
        }
        const hashedpwd = await bcrypt.hash(password, 10)
        const newuser = await User.create({
            first_name,
            last_name,
            email: cleanemail,
            password: hashedpwd,
            role: role || "student"
        })
        return res.status(201).json({
            message: "Registered Successfully",
            data: newuser
        })
    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}

module.exports = {register}