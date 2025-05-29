const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      is: /^[0-9]{10,15}$/ 
    }
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 18,
      max: 100
    }
  },


  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('Regular', 'Admin'), defaultValue: 'Regular' },
}, {
  indexes: [
    { fields: ['city'] },
    { fields: ['email'], unique: true }
  ]
});

module.exports = User;
