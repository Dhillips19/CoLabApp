const dotenv = require('dotenv');
dotenv.config();

// Set up test environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.PORT = '3001';
process.env.NODE_ENV = 'test';

module.exports = {}; 