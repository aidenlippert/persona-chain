import express from 'express';
import { Redis } from 'ioredis';

export const twitterRouter = (redis: Redis) => {
  const router = express.Router();

  // All routes return coming soon
  router.all('*', (req, res) => {
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Twitter connector is coming soon!',
      platform: 'twitter',
      status: 'coming_soon',
      plannedFeatures: [
        'Twitter account verification',
        'Blue checkmark status',
        'Follower count attestation',
        'Account age verification'
      ]
    });
  });

  return router;
};