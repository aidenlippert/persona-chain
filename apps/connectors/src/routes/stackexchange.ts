import express from 'express';
import { Redis } from 'ioredis';

export const stackexchangeRouter = (redis: Redis) => {
  const router = express.Router();

  // All routes return coming soon
  router.all('*', (req, res) => {
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Stack Exchange connector is coming soon!',
      platform: 'stackexchange',
      status: 'coming_soon',
      plannedFeatures: [
        'Stack Overflow reputation',
        'Technical expertise verification',
        'Community contributions',
        'Badge achievements'
      ]
    });
  });

  return router;
};