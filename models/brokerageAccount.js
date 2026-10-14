const sequelize = require("../config/database.js")
const { DataTypes } = require("sequelize");
const User = require("./user");

const BrokerageAccount = sequelize.define("BrokerageAccount", {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "id"
        }
    },
    connectionId: {
        type: DataTypes.STRING
    },
    accountId: {
        type: DataTypes.STRING,
        unique: true
    },
    brokerageName: {
        type: DataTypes.STRING
    },
    accountName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    accountNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: "Active"
    }

})

User.hasMany(BrokerageAccount, {
    foreignKey: "userId", 
    as: "brokerageAccounts"
})

BrokerageAccount.belongsTo(User, {
    foreignKey: "userId",
    as: "user"
})

module.exports = BrokerageAccount