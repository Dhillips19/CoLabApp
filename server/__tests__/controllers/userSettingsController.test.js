import { updateUserColour } from '../../controllers/userSettingsController';
import User from '../../DB/models/userModel';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../DB/models/userModel');
jest.mock('jsonwebtoken');

// Silence console logs during tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

describe('User Settings Controller Tests', () => {
  let req;
  let res;
  
  beforeEach(() => {
    req = {
      user: {
        id: 'user123'
      },
      body: {
        colour: '#FF5733'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up User model mock
    User.findById = jest.fn();
    
    // Mock jwt sign
    jwt.sign = jest.fn().mockReturnValue('mocked-jwt-token');
  });
  
  describe('updateUserColour', () => {
    test('should update user colour successfully', async () => {
      // Mock user
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        colour: '#000000',
        save: jest.fn().mockResolvedValue(true)
      };
      
      // Mock successful user find
      User.findById.mockResolvedValue(mockUser);
      
      await updateUserColour(req, res);
      
      // Check user was found
      expect(User.findById).toHaveBeenCalledWith('user123');
      
      // Check user colour was updated
      expect(mockUser.colour).toBe('#FF5733');
      expect(mockUser.save).toHaveBeenCalled();
      
      // Check JWT was generated
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: 'user123',
          username: 'testuser',
          colour: '#FF5733'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Check response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Colour preference updated successfully',
        token: 'mocked-jwt-token'
      });
    });
    
    test('should return error if colour is missing', async () => {
      // Remove colour from request
      req.body = {};
      
      await updateUserColour(req, res);
      
      // Check response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Colour is required' });
      
      // User find should not be called
      expect(User.findById).not.toHaveBeenCalled();
    });
    
    test('should return error if user is not found', async () => {
      // Mock user not found
      User.findById.mockResolvedValue(null);
      
      await updateUserColour(req, res);
      
      // Check response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
      
      // JWT should not be generated
      expect(jwt.sign).not.toHaveBeenCalled();
    });
    
    test('should handle database error when finding user', async () => {
      // Mock database error
      User.findById.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await updateUserColour(req, res);
      
      // Check response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server Error',
        error: 'Database error'
      });
    });
    
    test('should handle error when saving user', async () => {
      // Mock user
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        colour: '#000000',
        save: jest.fn().mockImplementation(() => {
          throw new Error('Save error');
        })
      };
      
      // Mock successful user find
      User.findById.mockResolvedValue(mockUser);
      
      await updateUserColour(req, res);
      
      // Check user was found
      expect(User.findById).toHaveBeenCalledWith('user123');
      
      // Check user colour was updated but save failed
      expect(mockUser.colour).toBe('#FF5733');
      expect(mockUser.save).toHaveBeenCalled();
      
      // Check response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server Error',
        error: 'Save error'
      });
      
      // JWT should not be generated
      expect(jwt.sign).not.toHaveBeenCalled();
    });
    
    test('should handle JWT signing error', async () => {
      // Mock user
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        colour: '#000000',
        save: jest.fn().mockResolvedValue(true)
      };
      
      // Mock successful user find
      User.findById.mockResolvedValue(mockUser);
      
      // Mock JWT error
      jwt.sign.mockImplementation(() => {
        throw new Error('JWT error');
      });
      
      await updateUserColour(req, res);
      
      // Check user was found and saved
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockUser.colour).toBe('#FF5733');
      expect(mockUser.save).toHaveBeenCalled();
      
      // Check response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server Error',
        error: 'JWT error'
      });
    });
  });
});