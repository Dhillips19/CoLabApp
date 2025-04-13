import { registerUser, loginUser } from '../../controllers/authController';
import User from '../../DB/models/userModel';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../DB/models/userModel');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('Auth Controller Tests', () => {
  let req;
  let res;
  
  beforeEach(() => {
    req = {
      body: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('registerUser', () => {
    test('should register a new user successfully', async () => {
      // Mock User.findOne to return null (user doesn't exist)
      User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      
      // Mock bcrypt functions
      bcrypt.genSalt.mockResolvedValueOnce('salt');
      bcrypt.hash.mockResolvedValueOnce('hashedPassword');
      
      // Mock User.prototype.save
      const saveMock = jest.fn();
      User.mockImplementationOnce(() => {
        return { save: saveMock };
      });
      saveMock.mockResolvedValueOnce();
      
      await registerUser(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: "User registered successfully" });
      
      // Verify User was created with correct data
      expect(User).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword'
      });
      expect(saveMock).toHaveBeenCalled();
    });
    
    test('should return error if passwords do not match', async () => {
      req.body.confirmPassword = 'differentPassword';
      
      await registerUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Passwords do not match" });
      expect(User.findOne).not.toHaveBeenCalled();
    });
    
    test('should return error if username already exists', async () => {
      // Mock User.findOne to simulate username already exists
      User.findOne.mockResolvedValueOnce({ username: 'testuser' });
      
      await registerUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Account with that username already exists" });
      expect(User.findOne).toHaveBeenCalledWith({ username: 'testuser' });
      expect(User.findOne).toHaveBeenCalledTimes(1); // Only called once, shouldn't check email
    });
    
    test('should return error if email already exists', async () => {
      // Mock User.findOne for username check (not found) and email check (found)
      User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ email: 'test@example.com' });
      
      await registerUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Account with that email already exists" });
      expect(User.findOne).toHaveBeenCalledWith({ username: 'testuser' });
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(User.findOne).toHaveBeenCalledTimes(2);
    });
    
    test('should handle server errors during registration', async () => {
      // Mock User.findOne to throw an error
      User.findOne.mockRejectedValueOnce(new Error('Database connection failed'));
      
      await registerUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Server Error",
        error: "Database connection failed"
      });
    });
    
    test('should handle password hashing errors', async () => {
      // Mock username and email checks to pass
      User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      
      // Mock bcrypt.genSalt to throw an error
      bcrypt.genSalt.mockRejectedValueOnce(new Error('Hashing error'));
      
      await registerUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Server Error",
        error: "Hashing error"
      });
    });
    
    test('should handle user save errors', async () => {
      // Mock User.findOne to return null (user doesn't exist)
      User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      
      // Mock bcrypt functions
      bcrypt.genSalt.mockResolvedValueOnce('salt');
      bcrypt.hash.mockResolvedValueOnce('hashedPassword');
      
      // Mock User.prototype.save to throw an error
      const saveMock = jest.fn().mockRejectedValueOnce(new Error('Save error'));
      User.mockImplementationOnce(() => {
        return { save: saveMock };
      });
      
      await registerUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Server Error",
        error: "Save error"
      });
    });
    
    test('should handle missing required fields', async () => {
      // Test with missing username
      req.body = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      };
      
      await registerUser(req, res);
      
      // Since your controller doesn't explicitly check for required fields,
      // it will likely fail at some point in the process
      // This test verifies how it handles this scenario
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json.mock.calls[0][0]).toHaveProperty('message', 'Server Error');
    });
  });
  
  describe('loginUser', () => {
    test('should login user and return token', async () => {
      const mockUser = {
        _id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword',
        colour: '#ff0000'
      };
      
      // Mock User.findOne to return a user
      User.findOne.mockResolvedValueOnce(mockUser);
      
      // Mock bcrypt.compare to return true (valid password)
      bcrypt.compare.mockResolvedValueOnce(true);
      
      // Mock JWT sign
      jwt.sign.mockReturnValueOnce('test-token');
      
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      await loginUser(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "User login successful",
        token: 'test-token'
      });
      
      // Verify JWT was created with correct data
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: 'user-id',
          username: 'testuser',
          colour: '#ff0000'
        },
        process.env.JWT_SECRET,
        { expiresIn: "3h" }
      );
    });
    
    test('should return error for incorrect email', async () => {
      // Mock User.findOne to return null (user not found)
      User.findOne.mockResolvedValueOnce(null);
      
      req.body = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };
      
      await loginUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Incorrect Email" });
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });
    
    test('should return error for incorrect password', async () => {
      const mockUser = {
        _id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword'
      };
      
      // Mock User.findOne to return a user
      User.findOne.mockResolvedValueOnce(mockUser);
      
      // Mock bcrypt.compare to return false (invalid password)
      bcrypt.compare.mockResolvedValueOnce(false);
      
      req.body = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };
      
      await loginUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Incorrect Password" });
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
      expect(jwt.sign).not.toHaveBeenCalled();
    });
    
    test('should handle server errors during login', async () => {
      // Mock User.findOne to throw an error
      User.findOne.mockRejectedValueOnce(new Error('Database connection failed'));
      
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      await loginUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Server Error",
        error: "Database connection failed"
      });
    });
    
    test('should handle bcrypt compare errors', async () => {
      const mockUser = {
        _id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword'
      };
      
      // Mock User.findOne to return a user
      User.findOne.mockResolvedValueOnce(mockUser);
      
      // Mock bcrypt.compare to throw an error
      bcrypt.compare.mockRejectedValueOnce(new Error('Compare error'));
      
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      await loginUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Server Error",
        error: "Compare error"
      });
    });
    
    test('should handle JWT sign errors', async () => {
      const mockUser = {
        _id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword',
        colour: '#ff0000'
      };
      
      // Mock User.findOne to return a user
      User.findOne.mockResolvedValueOnce(mockUser);
      
      // Mock bcrypt.compare to return true
      bcrypt.compare.mockResolvedValueOnce(true);
      
      // Mock JWT sign to throw an error
      jwt.sign.mockImplementationOnce(() => {
        throw new Error('JWT signing error');
      });
      
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      await loginUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Server Error",
        error: "JWT signing error"
      });
    });
    
    test('should handle missing email or password', async () => {
      // Missing password
      req.body = {
        email: 'test@example.com'
      };
      
      await loginUser(req, res);
      
      // Since your controller doesn't explicitly check for required fields,
      // it will likely fail at some point in the process
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json.mock.calls[0][0]).toHaveProperty('message', 'Server Error');
      
      jest.clearAllMocks();
      
      // Missing email
      req.body = {
        password: 'password123'
      };
      
      await loginUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json.mock.calls[0][0]).toHaveProperty('message', 'Server Error');
    });
  });
});