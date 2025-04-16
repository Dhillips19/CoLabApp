import request from 'supertest';
import express from 'express';
import userSettingsRouter from '../../routes/userSettingsRoutes';
import { updateUserColour } from '../../controllers/userSettingsController';
import authenticateUser from '../../middleware/authMiddleware';

// Mock dependencies
jest.mock('../../controllers/userSettingsController');
jest.mock('../../middleware/authMiddleware');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/settings', userSettingsRouter);

describe('User Settings Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default middleware mock to call next
    authenticateUser.mockImplementation((req, res, next) => {
      req.user = { id: 'user123', username: 'testuser' };
      next();
    });
  });
  
  describe('PUT /api/settings/update-colour', () => {
    test('should call updateUserColour controller', async () => {
      // Mock the controller implementation
      updateUserColour.mockImplementation((req, res) => {
        res.status(200).json({ 
          message: 'Colour preference updated successfully',
          token: 'updated-token'
        });
      });
      
      // Make the API request
      const response = await request(app)
        .put('/api/settings/update-colour')
        .set('Authorization', 'Bearer test-token')
        .send({ colour: '#FF5733' });
      
      // Verify response
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ 
        message: 'Colour preference updated successfully',
        token: 'updated-token'
      });
      expect(authenticateUser).toHaveBeenCalled();
      expect(updateUserColour).toHaveBeenCalled();
    });
    
    test('should handle authentication failure', async () => {
      // Mock authentication failure
      authenticateUser.mockImplementation((req, res, next) => {
        return res.status(401).json({ error: 'Unauthorized' });
      });
      
      // Make the API request
      const response = await request(app)
        .put('/api/settings/update-colour')
        .send({ colour: '#FF5733' });
      
      // Verify response
      expect(response.statusCode).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      expect(updateUserColour).not.toHaveBeenCalled();
    });
    
    test('should handle missing colour parameter', async () => {
      // Mock the controller to handle missing colour
      updateUserColour.mockImplementation((req, res) => {
        res.status(400).json({ message: 'Colour is required' });
      });
      
      // Make the API request
      const response = await request(app)
        .put('/api/settings/update-colour')
        .set('Authorization', 'Bearer test-token')
        .send({});
      
      // Verify response
      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({ message: 'Colour is required' });
    });
  });
});