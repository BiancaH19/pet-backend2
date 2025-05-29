const express = require('express');
const cors = require('cors');
const Pet = require('./models/pet');
const User = require('./models/user');
const sequelize = require('./config/database');
const { authenticateToken, requireAdmin } = require('./middleware/authMiddleware');
const Log = require('./models/log');
const logAction = require('./utils/logAction');
const startMonitoring = require('./monitorThread');
const MonitoredUser = require('./models/monitoredUser');

Log.sync({ alter: true })  
  .then(() => console.log('The Logs table was created or updated'))
  .catch(err => console.error('Error synchronizing Logs table:', err));

MonitoredUser.sync({ alter: true })
  .then(() => console.log('MonitoredUsers table synced/updated'))
  .catch(err => console.error('Error syncing MonitoredUsers:', err));


const app = express();
const PORT = 3001; 

app.use(cors()); 
app.use(express.json()); 

//PETS
// http://localhost:3001/pets?status=Available
// http://localhost:3001/pets?sort=age
// http://localhost:3001/pets?sort=name
// http://localhost:3001/pets?status=Available&sort=age
// http://localhost:3001/pets?status=Adopted&name=to
// http://localhost:3001/pets?userId=1

const { Op } = require('sequelize');

app.get('/pets', authenticateToken, async (req, res) => {
  try {
    const { status, name, species, age, sort, page = 1, limit = 20 } = req.query;
    const whereClause = {};

    if (status) whereClause.status = status;
    if (name) whereClause.name = { [Op.iLike]: `%${name}%` };
    if (species) whereClause.species = species;
    if (age && !isNaN(parseInt(age))) whereClause.age = parseInt(age);

    if (req.user?.role === 'User') {
      whereClause.userId = req.user.userId;
    }

    const orderClause = [];
    if (sort === 'age') orderClause.push(['age', 'ASC']);
    else if (sort === 'age_desc') orderClause.push(['age', 'DESC']);

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const pets = await Pet.findAll({
      where: whereClause,
      order: orderClause,
      offset,
      limit: parseInt(limit)
    });

    res.json(pets);
  } catch (error) {
    console.error('Error fetching pets:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/*
app.get('/pets', authenticateToken, async (req, res) => {
  try {
    const { status, name, species, age, sort, userId } = req.query;
    
    // const userId = req.query.userId || req.query.userID
    const whereClause = { userId: req.user.userId };
    if (status) whereClause.status = status;
    if (name) whereClause.name = { [require('sequelize').Op.iLike]: `%${name}%` };
    if (species) whereClause.species = species;
    if (age && !isNaN(parseInt(age))) whereClause.age = parseInt(age);
    if (userId && !isNaN(parseInt(userId))) whereClause.userId = parseInt(userId); 

    const orderClause = [];
    if (sort === 'age') orderClause.push(['age', 'ASC']);
    if (sort === 'name') orderClause.push(['name', 'ASC']);
    if (sort === 'userId') orderClause.push(['userId', 'ASC']); 

    const pets = await Pet.findAll({
      where: whereClause,
      order: orderClause
    });

    res.json(pets);
  } catch (error) {
    console.error('Error fetching pets:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
*/
  

// http://localhost:3001/pets/2
app.get('/pets/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pet = await Pet.findByPk(id, {
      include: {
        model: User,
        attributes: ['id', 'name', 'email', 'city'] 
      }
    });

    if (!pet) {
      return res.status(404).json({ error: "Pet not found" });
    }

    res.json(pet);
  } catch (error) {
    console.error('Error fetching pet:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

startMonitoring();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
  
  module.exports = app;
  

function isValidPet(pet) {
    return (
      typeof pet.name === 'string' &&
      typeof pet.species === 'string' &&
      typeof pet.age === 'number' &&
      typeof pet.status === 'string' &&
      typeof pet.image === 'string'
    );
  }
  
  // http://localhost:3001/pets
  /* {
  "name": "Luna",
  "species": "Cat",
  "age": 3,
  "status": "Available",
  "image": "https://example.com/luna.jpg",
  "userId": 1
  } */
  app.post('/pets', authenticateToken, async (req, res) => {
  const newPet = req.body;

  if (
    typeof newPet.name !== 'string' || newPet.name.trim() === '' ||
    typeof newPet.species !== 'string' || !['Dog', 'Cat'].includes(newPet.species.trim()) ||
    typeof newPet.age !== 'number' || newPet.age < 1 || newPet.age > 30 ||
    typeof newPet.status !== 'string' || !['Available', 'Adopted'].includes(newPet.status.trim()) ||
    typeof newPet.image !== 'string' || newPet.image.trim() === ''
  ) {
    return res.status(400).json({ error: 'Invalid pet data' });
  }

  try {
    const createdPet = await Pet.create({ ...newPet, userId: req.user.userId });
    await logAction(req.user.userId, `CREATE_PET ${createdPet.id}`);
    res.status(201).json(createdPet);
  } catch (err) {
    console.error('Error creating pet:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// http://localhost:3001/pets/2
/* {
"status": "Adopted"
} */

app.patch('/pets/:id', authenticateToken, async (req, res) => {
  try {
    const petId = parseInt(req.params.id);
    const updates = req.body;
    const pet = await Pet.findByPk(petId);

    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    if (req.user.role !== 'Admin' && pet.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this pet' });
    }

    await pet.update(updates);
    await logAction(req.user.userId, `UPDATE_PET ${pet.id}`);
    res.json(pet);
  } catch (error) {
    console.error('Error updating pet:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


  

// http://localhost:3001/pets/1
app.delete('/pets/:id', authenticateToken, async (req, res) => {
  try {
    const petId = parseInt(req.params.id);
    const pet = await Pet.findByPk(petId);

    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    if (req.user.role !== 'Admin' && pet.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this pet' });
    }

    await pet.destroy();
    await logAction(req.user.userId, `DELETE_PET ${pet.id}`);
    res.json({ message: 'Pet deleted', pet });
  } catch (error) {
    console.error('Error deleting pet:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




//USERS
// http://localhost:3001/users?city=Cluj&sort=name
app.get('/users', async (req, res) => {
  try {
    const { name, city, age, sort } = req.query;

    const whereClause = {};
    if (name) whereClause.name = { [Op.iLike]: `%${name}%` };
    if (city) whereClause.city = { [Op.iLike]: `%${city}%` };
    if (age && !isNaN(parseInt(age))) whereClause.age = parseInt(age);

    const orderClause = [];
    if (sort === 'age') orderClause.push(['age', 'ASC']);
    if (sort === 'name') orderClause.push(['name', 'ASC']);

    const users = await User.findAll({
      where: whereClause,
      order: orderClause
    });

    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//http://localhost:3001/users/3
app.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(parseInt(req.params.id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//http://localhost:3001/users
/* {
  "name": "Bianca",
  "email": "bianca@mail.com",
  "phone": "0744123456",
  "city": "Cluj",
  "age": 21,
  "password": "parola_temp",
  "role": "User"
} */
app.post('/users', async (req, res) => {
  try {
    const { name, email, phone, city, age } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Invalid name' });
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (!phone || !/^[0-9]{10,15}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    if (!city || typeof city !== 'string' || city.trim() === '') {
      return res.status(400).json({ error: 'Invalid city' });
    }
    const parsedAge = parseInt(age);
    if (isNaN(parsedAge) || parsedAge < 18 || parsedAge > 100) {
      return res.status(400).json({ error: 'Age must be between 18 and 100' });
    }

    const user = await User.create({
      name: name.trim(),
      email,
      phone,
      city: city.trim(),
      age: parsedAge
    });

    res.status(201).json(user);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// http://localhost:3001/users/3
/*{
    "phone": "0744123456"
}*/
app.patch('/users/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, phone, city, age } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Invalid name' });
      }
      user.name = name.trim();
    }

    if (email !== undefined) {
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email' });
      }
      user.email = email;
    }

    if (phone !== undefined) {
      if (!/^[0-9]{10,15}$/.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }
      user.phone = phone;
    }

    if (city !== undefined) {
      if (typeof city !== 'string' || city.trim() === '') {
        return res.status(400).json({ error: 'Invalid city' });
      }
      user.city = city.trim();
    }

    if (age !== undefined) {
      const parsedAge = parseInt(age);
      if (isNaN(parsedAge) || parsedAge < 18 || parsedAge > 100) {
        return res.status(400).json({ error: 'Age must be between 18 and 100' });
      }
      user.age = parsedAge;
    }

    await user.save();
    await logAction(req.user.userId, `UPDATE_USER ${user.id}`);

    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//http://localhost:3001/users/3
app.delete('/users/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(parseInt(req.params.id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.destroy();
    await logAction(req.user.userId, `DELETE_USER ${user.id}`);

    res.json({ message: 'User deleted successfully', user });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// USER-PET 1:N
// GET pets for a specific user
// http://localhost:3001/users/1/pets
app.get('/users/:id/pets', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const pets = await Pet.findAll({ where: { userId } });
    res.json(pets);
  } catch (error) {
    console.error('Error fetching pets for user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// http://localhost:3001/statistics/adopted-by-city
app.get('/statistics/adopted-by-city', async (req, res) => {
  try {
    const results = await Pet.findAll({
      attributes: [
        [sequelize.col('User.city'), 'city'],
        [sequelize.fn('COUNT', sequelize.col('Pet.id')), 'adoptedCount']
      ],
      include: {
        model: User,
        attributes: [],
      },
      where: { status: 'Adopted' },
      group: ['User.city'],
      order: [[sequelize.fn('COUNT', sequelize.col('Pet.id')), 'DESC']]
    });

    res.json(results);
  } catch (error) {
    console.error('Error in statistics query:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



//AUTHENTICATION
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_jwt_secret_key'; // Pentru test local – pune în `.env` la deploy

// REGISTER
//http://localhost:3001/register
/*
{
  "name": "Bianca",
  "email": "biancah@mail.com",
  "phone": "0712345678",
  "city": "Cluj",
  "age": 21,
  "password": "parola123",
  "role": "Admin"
}
*/
app.post('/register', async (req, res) => {
  try {
    const { name, email, phone, city, age, password, role } = req.body;

    if (!name || !email || !password || !phone || !city || !age) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      phone,
      city,
      age,
      password: hashedPassword,
      role: role || 'User'
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// LOGIN
//http://localhost:3001/login
/*
{
  "email": "biancah@mail.com",
  "password": "parola123"
}
*/
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, role: user.role, userId: user.id });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/*
//http://localhost:3001/monitored-users
//HEADERS: key: Authorization; value: Bearer <token>
app.get('/monitored-users', authenticateToken, requireAdmin, async (req, res) => {
  res.json({ message: 'List of monitored users (simulation)' });
});
*/

//http://localhost:3001/monitored-users
//HEADERS: key: Authorization; value: Bearer <token>
app.get('/monitored-users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await MonitoredUser.findAll();
    res.json(users);
  } catch (err) {
    console.error('Error fetching monitored users:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
