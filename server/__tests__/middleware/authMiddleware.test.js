import authenticateUser from '../../middleware/authMiddleware';
import jwt from 'jsonwebtoken';
import User from '../../DB/models/userModel';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../DB/models/userModel');

describe('Auth Middleware Tests', () => {
  let req;
  let res;
  let next;
  
  beforeEach(() => {
    req = {
      header: jest.fn()
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
    
    jest.clearAllMocks();
  });
  
  test('should call next() when token is valid', async () => {
    // Mock token in header
    req.header.mockReturnValue('Bearer valid-token');
    
    // Mock jwt verification
    jwt.verify.mockReturnValue({ id: 'user123' });
    
    // Mock user found in database
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'user123', username: 'testuser' })
    });
    
    await authenticateUser(req, res, next);
    
    // Verify token was verified
    expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
    
    // Verify user was fetched from database
    expect(User.findById).toHaveBeenCalledWith('user123');
    
    // Verify next was called and user attached to request
    expect(req.user).toEqual({ _id: 'user123', username: 'testuser' });
    expect(next).toHaveBeenCalled();
  });
  
  test('should return 401 when no token provided', async () => {
    // Mock no token in header
    req.header.mockReturnValue(undefined);
    
    await authenticateUser(req, res, next);
    
    // Verify error response
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied. No token provided." });
    expect(next).not.toHaveBeenCalled();
  });
  
  // Add more test cases for expired/invalid tokens
});