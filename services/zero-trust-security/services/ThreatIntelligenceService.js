/**
 * Threat Intelligence Service
 * Real-time threat intelligence feeds, IoC matching, and threat hunting
 * Integration with multiple threat intelligence sources and automated response
 */

import winston from 'winston';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { DateTime } from 'luxon';
import crypto from 'crypto';
import axios from 'axios';

class ThreatIntelligenceService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
    this.redis = null;
    this.threatFeeds = new Map();
    this.indicators = new Map();
    this.threatActors = new Map();
    this.campaigns = new Map();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'threat-intelligence' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/threat-intelligence.log' })
      ]
    });

    // Threat intelligence sources configuration
    this.threatSources = {
      misp: {
        enabled: true,
        url: process.env.MISP_URL,
        apiKey: process.env.MISP_API_KEY,
        updateInterval: 3600
      },
      otx: {
        enabled: true,
        url: 'https://otx.alienvault.com/api/v1',
        apiKey: process.env.OTX_API_KEY,
        updateInterval: 1800
      },
      virustotal: {
        enabled: true,
        url: 'https://www.virustotal.com/vtapi/v2',
        apiKey: process.env.VT_API_KEY,
        updateInterval: 300
      },
      threatcrowd: {
        enabled: true,
        url: 'https://www.threatcrowd.org/searchApi/v2',
        updateInterval: 1800
      },
      abuseipdb: {
        enabled: true,
        url: 'https://api.abuseipdb.com/api/v2',
        apiKey: process.env.ABUSEIPDB_API_KEY,
        updateInterval: 900
      }
    };

    // Indicator types and their risk weights
    this.indicatorTypes = {
      ip: { weight: 0.8, ttl: 86400 },
      domain: { weight: 0.7, ttl: 172800 },
      url: { weight: 0.9, ttl: 86400 },
      hash: { weight: 1.0, ttl: 604800 },
      email: { weight: 0.6, ttl: 259200 },
      filename: { weight: 0.5, ttl: 172800 },
      registry: { weight: 0.7, ttl: 259200 },
      mutex: { weight: 0.6, ttl: 259200 },
      yara: { weight: 0.9, ttl: 604800 }
    };

    // Threat confidence levels
    this.confidenceLevels = {
      high: { score: 0.9, weight: 1.0 },
      medium: { score: 0.7, weight: 0.8 },
      low: { score: 0.5, weight: 0.6 },
      unknown: { score: 0.3, weight: 0.4 }
    };
  }

  async initialize() {
    try {
      this.logger.info('Initializing Threat Intelligence Service...');

      // Initialize Redis for caching
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.logger.info('Redis connection established for threat intelligence');
      }

      // Initialize threat feeds
      await this.initializeThreatFeeds();

      // Start periodic updates
      this.startPeriodicUpdates();

      this.logger.info('Threat Intelligence Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Threat Intelligence Service:', error);
      throw error;
    }
  }

  async checkIndicators(indicators) {
    try {
      const results = [];
      
      for (const indicator of indicators) {
        const result = await this.checkSingleIndicator(indicator);
        results.push(result);
      }

      return {
        indicators: results,
        overallThreatScore: this.calculateOverallThreatScore(results),
        timestamp: DateTime.now().toISO()
      };

    } catch (error) {
      this.logger.error('Error checking indicators:', error);
      throw new Error(`Failed to check indicators: ${error.message}`);
    }
  }

  async checkSingleIndicator(indicator) {
    try {
      const { type, value } = indicator;
      const cacheKey = `indicator:${type}:${crypto.createHash('sha256').update(value).digest('hex')}`;
      
      // Check cache first
      let result = this.cache.get(cacheKey);
      if (result) {
        result.cached = true;
        return result;
      }

      // Initialize result
      result = {
        type,
        value,
        threatScore: 0,
        confidence: 'unknown',
        sources: [],
        details: {},
        firstSeen: null,
        lastSeen: null,
        cached: false
      };

      // Check against multiple threat intelligence sources
      const checks = await Promise.allSettled([
        this.checkMISP(type, value),
        this.checkOTX(type, value),
        this.checkVirusTotal(type, value),
        this.checkThreatCrowd(type, value),
        this.checkAbuseIPDB(type, value)
      ]);

      // Process results from all sources
      checks.forEach((check, index) => {
        if (check.status === 'fulfilled' && check.value) {
          const sourceNames = ['misp', 'otx', 'virustotal', 'threatcrowd', 'abuseipdb'];
          result.sources.push({
            name: sourceNames[index],
            data: check.value
          });
        }
      });

      // Calculate aggregate threat score
      result.threatScore = this.calculateThreatScore(result.sources, type);
      result.confidence = this.calculateConfidence(result.sources);
      
      // Extract timeline information
      const timeline = this.extractTimeline(result.sources);
      result.firstSeen = timeline.firstSeen;
      result.lastSeen = timeline.lastSeen;

      // Extract additional details
      result.details = this.extractDetails(result.sources, type);

      // Cache result
      const ttl = this.indicatorTypes[type]?.ttl || 3600;
      this.cache.set(cacheKey, result, ttl);

      return result;

    } catch (error) {
      this.logger.error(`Error checking indicator ${indicator.type}:${indicator.value}`, error);
      return {
        type: indicator.type,
        value: indicator.value,
        threatScore: 0,
        confidence: 'unknown',
        sources: [],
        error: error.message
      };
    }
  }

  async checkMISP(type, value) {
    try {
      if (!this.threatSources.misp.enabled || !this.threatSources.misp.apiKey) {
        return null;
      }

      const response = await axios.get(`${this.threatSources.misp.url}/attributes/restSearch`, {
        headers: {
          'Authorization': this.threatSources.misp.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        params: {
          value: value,
          type: type,
          enforceWarninglist: true
        },
        timeout: 10000
      });

      if (response.data && response.data.response && response.data.response.Attribute) {
        const attributes = response.data.response.Attribute;
        return {
          found: true,
          count: attributes.length,
          attributes: attributes.map(attr => ({
            category: attr.category,
            type: attr.type,
            value: attr.value,
            timestamp: attr.timestamp,
            event_id: attr.event_id,
            threat_level: attr.Event?.threat_level_id
          }))
        };
      }

      return { found: false };

    } catch (error) {
      this.logger.warn('MISP check failed:', error.message);
      return null;
    }
  }

  async checkOTX(type, value) {
    try {
      if (!this.threatSources.otx.enabled || !this.threatSources.otx.apiKey) {
        return null;
      }

      let endpoint;
      switch (type) {
        case 'ip':
          endpoint = `IPv4/${value}/general`;
          break;
        case 'domain':
          endpoint = `domain/${value}/general`;
          break;
        case 'hash':
          endpoint = `file/${value}/general`;
          break;
        case 'url':
          endpoint = `url/${encodeURIComponent(value)}/general`;
          break;
        default:
          return null;
      }

      const response = await axios.get(`${this.threatSources.otx.url}/${endpoint}`, {
        headers: {
          'X-OTX-API-KEY': this.threatSources.otx.apiKey
        },
        timeout: 10000
      });

      if (response.data) {
        return {
          found: true,
          pulse_count: response.data.pulse_info?.count || 0,
          reputation: response.data.reputation || 0,
          country: response.data.country,
          asn: response.data.asn,
          pulses: response.data.pulse_info?.pulses?.slice(0, 5) || []
        };
      }

      return { found: false };

    } catch (error) {
      this.logger.warn('OTX check failed:', error.message);
      return null;
    }
  }

  async checkVirusTotal(type, value) {
    try {
      if (!this.threatSources.virustotal.enabled || !this.threatSources.virustotal.apiKey) {
        return null;
      }

      let resource = value;
      let endpoint = 'file/report';

      switch (type) {
        case 'ip':
          endpoint = 'ip-address/report';
          break;
        case 'domain':
          endpoint = 'domain/report';
          break;
        case 'url':
          endpoint = 'url/report';
          resource = Buffer.from(value).toString('base64').replace(/=/g, '');
          break;
      }

      const response = await axios.get(`${this.threatSources.virustotal.url}/${endpoint}`, {
        params: {
          apikey: this.threatSources.virustotal.apiKey,
          resource: resource
        },
        timeout: 10000
      });

      if (response.data && response.data.response_code === 1) {
        return {
          found: true,
          positives: response.data.positives || 0,
          total: response.data.total || 0,
          scan_date: response.data.scan_date,
          permalink: response.data.permalink,
          scans: Object.keys(response.data.scans || {}).length
        };
      }

      return { found: false };

    } catch (error) {
      this.logger.warn('VirusTotal check failed:', error.message);
      return null;
    }
  }

  async checkThreatCrowd(type, value) {
    try {
      if (!this.threatSources.threatcrowd.enabled) {
        return null;
      }

      let endpoint;
      switch (type) {
        case 'ip':
          endpoint = 'ip/report';
          break;
        case 'domain':
          endpoint = 'domain/report';
          break;
        case 'hash':
          endpoint = 'file/report';
          break;
        case 'email':
          endpoint = 'email/report';
          break;
        default:
          return null;
      }

      const response = await axios.get(`${this.threatSources.threatcrowd.url}/${endpoint}`, {
        params: { [type]: value },
        timeout: 10000
      });

      if (response.data && response.data.response_code === '1') {
        return {
          found: true,
          votes: response.data.votes || 0,
          hashes: response.data.hashes?.length || 0,
          domains: response.data.domains?.length || 0,
          references: response.data.references?.length || 0
        };
      }

      return { found: false };

    } catch (error) {
      this.logger.warn('ThreatCrowd check failed:', error.message);
      return null;
    }
  }

  async checkAbuseIPDB(type, value) {
    try {
      if (!this.threatSources.abuseipdb.enabled || !this.threatSources.abuseipdb.apiKey || type !== 'ip') {
        return null;
      }

      const response = await axios.get(`${this.threatSources.abuseipdb.url}/check`, {
        headers: {
          'Key': this.threatSources.abuseipdb.apiKey,
          'Accept': 'application/json'
        },
        params: {
          ipAddress: value,
          maxAgeInDays: 90,
          verbose: true
        },
        timeout: 10000
      });

      if (response.data && response.data.data) {
        const data = response.data.data;
        return {
          found: data.totalReports > 0,
          abuseConfidence: data.abuseConfidencePercentage,
          totalReports: data.totalReports,
          numDistinctUsers: data.numDistinctUsers,
          lastReported: data.lastReportedAt,
          countryCode: data.countryCode,
          usageType: data.usageType
        };
      }

      return { found: false };

    } catch (error) {
      this.logger.warn('AbuseIPDB check failed:', error.message);
      return null;
    }
  }

  calculateThreatScore(sources, type) {
    if (sources.length === 0) return 0;

    let totalScore = 0;
    let totalWeight = 0;
    const typeWeight = this.indicatorTypes[type]?.weight || 0.5;

    sources.forEach(source => {
      let sourceScore = 0;
      let sourceWeight = 0.2; // Base weight

      switch (source.name) {
        case 'misp':
          if (source.data.found) {
            sourceScore = 0.8;
            sourceWeight = 0.3;
          }
          break;
        
        case 'otx':
          if (source.data.found) {
            sourceScore = Math.min(0.9, source.data.pulse_count / 10);
            sourceWeight = 0.25;
          }
          break;
        
        case 'virustotal':
          if (source.data.found && source.data.total > 0) {
            sourceScore = source.data.positives / source.data.total;
            sourceWeight = 0.3;
          }
          break;
        
        case 'threatcrowd':
          if (source.data.found) {
            sourceScore = Math.min(0.7, source.data.votes / 5);
            sourceWeight = 0.2;
          }
          break;
        
        case 'abuseipdb':
          if (source.data.found) {
            sourceScore = source.data.abuseConfidence / 100;
            sourceWeight = 0.25;
          }
          break;
      }

      totalScore += sourceScore * sourceWeight;
      totalWeight += sourceWeight;
    });

    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    return Math.min(1.0, normalizedScore * typeWeight);
  }

  calculateConfidence(sources) {
    const sourceCount = sources.filter(s => s.data?.found).length;
    
    if (sourceCount >= 3) return 'high';
    if (sourceCount >= 2) return 'medium';
    if (sourceCount >= 1) return 'low';
    return 'unknown';
  }

  calculateOverallThreatScore(results) {
    if (results.length === 0) return 0;

    const scores = results.map(r => r.threatScore);
    const maxScore = Math.max(...scores);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Weight towards maximum threat found
    return (maxScore * 0.7) + (avgScore * 0.3);
  }

  extractTimeline(sources) {
    let firstSeen = null;
    let lastSeen = null;

    sources.forEach(source => {
      if (source.data) {
        // Extract timestamps from different sources
        const timestamps = [];
        
        if (source.data.scan_date) timestamps.push(source.data.scan_date);
        if (source.data.lastReported) timestamps.push(source.data.lastReported);
        if (source.data.attributes) {
          source.data.attributes.forEach(attr => {
            if (attr.timestamp) timestamps.push(new Date(attr.timestamp * 1000).toISOString());
          });
        }

        timestamps.forEach(ts => {
          const date = new Date(ts);
          if (!firstSeen || date < new Date(firstSeen)) firstSeen = date.toISOString();
          if (!lastSeen || date > new Date(lastSeen)) lastSeen = date.toISOString();
        });
      }
    });

    return { firstSeen, lastSeen };
  }

  extractDetails(sources, type) {
    const details = {
      categories: new Set(),
      tags: new Set(),
      malwareFamilies: new Set(),
      countries: new Set(),
      references: []
    };

    sources.forEach(source => {
      if (source.data && source.data.found) {
        // Extract categories
        if (source.data.attributes) {
          source.data.attributes.forEach(attr => {
            if (attr.category) details.categories.add(attr.category);
          });
        }

        // Extract countries
        if (source.data.country) details.countries.add(source.data.country);
        if (source.data.countryCode) details.countries.add(source.data.countryCode);

        // Extract references
        if (source.data.references) {
          details.references.push(...source.data.references);
        }
        if (source.data.permalink) {
          details.references.push(source.data.permalink);
        }
      }
    });

    return {
      categories: Array.from(details.categories),
      tags: Array.from(details.tags),
      malwareFamilies: Array.from(details.malwareFamilies),
      countries: Array.from(details.countries),
      references: details.references.slice(0, 10) // Limit references
    };
  }

  async initializeThreatFeeds() {
    // Initialize threat intelligence feeds
    for (const [name, config] of Object.entries(this.threatSources)) {
      if (config.enabled) {
        this.threatFeeds.set(name, {
          name,
          config,
          lastUpdate: null,
          status: 'initialized'
        });
      }
    }
  }

  startPeriodicUpdates() {
    // Update threat feeds periodically
    setInterval(() => {
      this.updateThreatFeeds();
    }, 300000); // Every 5 minutes

    // Clean up old cached indicators
    setInterval(() => {
      this.cleanupCache();
    }, 3600000); // Every hour
  }

  async updateThreatFeeds() {
    try {
      for (const [name, feed] of this.threatFeeds.entries()) {
        const now = DateTime.now();
        const lastUpdate = feed.lastUpdate ? DateTime.fromISO(feed.lastUpdate) : null;
        
        if (!lastUpdate || now.diff(lastUpdate, 'seconds').seconds >= feed.config.updateInterval) {
          await this.updateSingleFeed(name, feed);
        }
      }
    } catch (error) {
      this.logger.error('Error updating threat feeds:', error);
    }
  }

  async updateSingleFeed(name, feed) {
    try {
      this.logger.info(`Updating threat feed: ${name}`);
      
      // Implementation would depend on specific feed format
      // This is a placeholder for feed-specific update logic
      
      feed.lastUpdate = DateTime.now().toISO();
      feed.status = 'updated';
      
    } catch (error) {
      this.logger.error(`Error updating feed ${name}:`, error);
      feed.status = 'error';
    }
  }

  cleanupCache() {
    try {
      const keys = this.cache.keys();
      this.logger.info(`Cleaning up cache, ${keys.length} keys found`);
      
      // Cache cleanup is handled automatically by node-cache TTL
      // This method can be extended for custom cleanup logic
      
    } catch (error) {
      this.logger.error('Error cleaning up cache:', error);
    }
  }

  async healthCheck() {
    try {
      const health = {
        status: 'healthy',
        timestamp: DateTime.now().toISO(),
        cache: {
          keys: this.cache.keys().length,
          stats: this.cache.getStats()
        },
        redis: null,
        threatFeeds: Object.fromEntries(
          Array.from(this.threatFeeds.entries()).map(([name, feed]) => [
            name,
            {
              status: feed.status,
              lastUpdate: feed.lastUpdate,
              enabled: feed.config.enabled
            }
          ])
        ),
        sources: Object.fromEntries(
          Object.entries(this.threatSources).map(([name, config]) => [
            name,
            {
              enabled: config.enabled,
              configured: !!config.apiKey || name === 'threatcrowd'
            }
          ])
        )
      };

      if (this.redis) {
        await this.redis.ping();
        health.redis = { status: 'connected' };
      }

      return health;
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: DateTime.now().toISO()
      };
    }
  }

  async shutdown() {
    try {
      this.logger.info('Shutting down Threat Intelligence Service...');
      
      this.cache.flushAll();
      
      if (this.redis) {
        await this.redis.quit();
      }

      this.threatFeeds.clear();
      this.indicators.clear();
      this.threatActors.clear();
      this.campaigns.clear();

      this.logger.info('Threat Intelligence Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

export default ThreatIntelligenceService;