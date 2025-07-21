import express from 'express';
import { Redis } from 'ioredis';

export const orcidRouter = (redis: Redis) => {
  const router = express.Router();

  // All routes return coming soon
  router.all('*', (req, res) => {
    res.status(501).json({
      error: 'Not Implemented',
      message: 'ORCID connector is coming soon!',
      platform: 'orcid',
      status: 'coming_soon',
      plannedFeatures: [
        'Academic identity verification',
        'Research publications',
        'Academic affiliations',
        'Research grants and funding'
      ]
    });
  });

  return router;
};