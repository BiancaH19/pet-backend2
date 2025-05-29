const sequelize = require('./config/database');
const User = require('./models/user');
const Pet = require('./models/pet');

async function syncDatabase() {
  try {
    await sequelize.sync({ alter: true }); 
    console.log('All models were synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing models:', error);
  } finally {
    await sequelize.close();
  }
}

syncDatabase();
