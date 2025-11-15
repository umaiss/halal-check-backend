// server.ts

import express, { Application, Request, Response } from 'express';
import * as dotenv from 'dotenv';
import halalRoutes from './src/routes/halalRoutes';

// Load environment variables
dotenv.config();

// Define App and Port
const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Main Routes
app.use('/api', halalRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('Halal Checker Backend Running!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});