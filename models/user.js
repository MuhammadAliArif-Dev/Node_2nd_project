const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.js");
const snaptrade = require("../config/snaptrade.js");

const User = sequelize.define("User", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    first_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    last_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true}
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: true
    }, 
    role: {
        type: DataTypes.ENUM("super_admin", "teacher", "student", "staff_admin"),
        allowNull: false,
        defaultValue: "student"
    },
    resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    resetPasswordExpire: {
        type: DataTypes.DATE,
        allowNull: true
    },
    googleId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true
    },
    snaptradeUserSecret: {
        type: DataTypes.STRING,
        allowNull: true
    }

});

module.exports = User;
