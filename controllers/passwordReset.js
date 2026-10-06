const User = require("../models/user")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")

const forgetPassword = async (req, res) => {
    const {email} = req.body
    try{
        const cleanemail = email.toLowerCase().trim()
        const user = await User.findOne({where: {email: cleanemail}})
        if(!user) {
            return res.status(404).json({
                message: "User not found"
            })
        }
        const resetToken = crypto.randomBytes(20).toString("hex")
        const expireTime = Date.now() + 5 * 60 * 1000
        user.resetPasswordToken = resetToken
        user.resetPasswordExpire = expireTime
        await user.save()
        return res.status(200).json({
            message: "Password reset Token generated successfully",
            resetToken : resetToken
        })
    }catch (error){
        return res.status(500).json({
            error: error.message
        })
    }
}

const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { new_password } = req.body;

    try {
        if (!new_password) {
            return res.status(400).json({ message: "Please provide a new password" });
        }
        const user = await User.findOne({ where: { resetPasswordToken: token }});

        if (!user) {
            return res.status(400).json({ 
                message: "Invalid or expired reset token" 
            });
        }

        if (new Date() > new Date(user.resetPasswordExpire)) {
            return res.status(400).json({ 
                message: "Reset token has expired. Please request a new one." 
            });
        }
        const hashnewPwd = await bcrypt.hash(new_password, 10);

        user.password = hashnewPwd;
        user.resetPasswordToken = null;
        user.resetPasswordExpire = null;
        await user.save();
        return res.status(200).json({
            message: "Password reset successfully!"
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = { forgetPassword, resetPassword };

