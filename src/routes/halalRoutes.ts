// src/routes/halalRoutes.ts

import express from 'express';
import { checkHalalStatus } from '../controllers/halalController';

const router = express.Router();

// POST /api/check-halal
router.post('/check-halal', checkHalalStatus);

export default router;