import request from 'supertest';
import express from 'express';
import userRouter from '../../routes/authRoutes';
import { registerUser, loginUser } from '../../controllers/authController';
import authenticateUser from '../../middleware/authMiddleware';

// Mock dependencies
jest.mock('../../controllers/authController');
jest.mock('../../middleware/authMiddleware');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', userRouter);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('POST /api/auth/register', () => {
    test('should call registerUser controller', async () => {
      // Mock the controller implementation
      registerUser.mockImplementation((req, res) => {
        res.status(201).json({ message: 'User registered successfully' });
      });
      
      // Make the API request
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123'
        });
      
      // Verify response
      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual({ message: 'User registered successfully' });
      expect(registerUser).toHaveBeenCalled();
    });
  });
  
  describe('POST /api/auth/login', () => {
    test('should call loginUser controller', async () => {
      // Mock the controller implementation
      loginUser.mockImplementation((req, res) => {
        res.status(200).json({ message: 'User login successful', token: 'test-token' });
      });
      
      // Make the API request
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      // Verify response
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ 
        message: 'User login successful',
        token: 'test-token'
      });
      expect(loginUser).toHaveBeenCalled();
    });
  });
});