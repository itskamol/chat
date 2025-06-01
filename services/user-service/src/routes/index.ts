import express from 'express';

const router = express.Router();
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';

router.use('/contacts', userRoutes);
router.use('/', authRoutes);

export default router;