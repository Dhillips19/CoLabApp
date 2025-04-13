import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { PORT, CORS_OPTIONS} from './config.js';
import cors from 'cors';
import connectDB from './DB/connect.js';
import userRouter from './routes/authRoutes.js';
import documentRouter from './routes/documentRoutes.js';
import editorRouter from './routes/editorRoutes.js';
import userSettingsRouter from './routes/userSettingsRoutes.js';
import initialiseSocket from './socketHandler.js'; 

// initialise express app
const app = express();

// set up cors
app.use(cors({CORS_OPTIONS}));

// parse incoming JSON requests
app.use(express.json());

// connect to MongoDB
connectDB();

// register API routes
app.use('/api/auth', userRouter);
app.use('/api/documents', documentRouter);
app.use('/api/editor', editorRouter);
app.use('/api/user-settings', userSettingsRouter);

// start express server
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// initialise websocket server
initialiseSocket(server);