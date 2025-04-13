import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.js';
import authenticateUser from '../middleware/authMiddleware.js';

const userRouter = express.Router();

// register user route
userRouter.post('/register', registerUser);

// login user route
userRouter.post('/login', loginUser);

// verify user token route
// verifies the user token on application load
userRouter.get('/verify', authenticateUser, (req, res) => {
    res.status(200).json({ valid: true });
  });
  
export default userRouter;