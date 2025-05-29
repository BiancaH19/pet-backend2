const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');

const Pet = sequelize.define('Pet', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  species: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['Dog', 'Cat']]
    }
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 30
    }
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['Available', 'Adopted']]
    }
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isUrl: true
    }
  },
}, {
  indexes: [
    { fields: ['status'] },
    { fields: ['userId'] }
  ]
});

User.hasMany(Pet, { foreignKey: 'userId' });
Pet.belongsTo(User, { foreignKey: 'userId' });

module.exports = Pet;
