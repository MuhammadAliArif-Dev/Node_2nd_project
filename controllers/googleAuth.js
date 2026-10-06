const jwt = require("jsonwebtoken")

const googleCallback = (req,res)=>{
        const token = jwt.sign({ 
            id: req.user.id,
            email: req.user.email,
            role: req.user.role },
            process.env.JWT_SECRET,
            { expiresIn: "5m" }
        )
        res.status(200).json({
            message: "Google login successful",
            token: token,
            user: {
                id: req.user.id,
                first_name: req.user.first_name,
                last_name: req.user.last_name,
                email: req.user.email,
                role: req.user.role
            }    
        })
}

module.exports = { googleCallback }
