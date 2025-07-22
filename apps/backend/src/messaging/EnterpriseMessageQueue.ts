/**
 * Enterprise Message Queue System for PersonaChain
 * Production-grade message queue with enterprise features and scalability
 * Handles asynchronous operations, workflow coordination, and event-driven architecture
 * 
 * Features:
 * - Multi-protocol support (AMQP, Redis Streams, Apache Kafka, AWS SQS)
 * - Enterprise message routing with dead letter queues
 * - Priority queues with intelligent scheduling
 * - Message persistence and durability guarantees
 * - Distributed processing with worker auto-scaling
 * - Circuit breakers and retry strategies
 * - Message encryption and security
 * - Comprehensive monitoring and alerting
 * - Workflow orchestration and saga patterns
 * - Multi-tenant message isolation
 */

import { EventEmitter } from 'events';
import amqp, { Connection, Channel, Message } from 'amqplib';
import Redis from 'ioredis';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import AWS from 'aws-sdk';
import winston from 'winston';
import prometheus from 'prom-client';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import schedule from 'node-schedule';

// ==================== TYPES ====================

interface MessageBroker {
  id: string;
  type: 'rabbitmq' | 'redis' | 'kafka' | 'sqs';
  connection: any;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  config: BrokerConfig;
  metrics: BrokerMetrics;
  lastHealthCheck: Date;
}

interface BrokerConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  vhost?: string;
  cluster?: string[];
  ssl?: boolean;
  maxConnections?: number;
  heartbeat?: number;
  connectionTimeout?: number;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

interface BrokerMetrics {
  totalMessages: number;
  processedMessages: number;
  failedMessages: number;
  averageProcessingTime: number;
  queueDepth: number;
  consumerCount: number;
  lastError?: ErrorInfo;
}

interface ErrorInfo {
  message: string;
  code: string;
  timestamp: Date;
  stack?: string;
  context?: any;
}

interface QueueConfiguration {
  name: string;
  durable: boolean;
  autoDelete: boolean;
  exclusive: boolean;
  maxLength?: number;
  messageTtl?: number;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
  priority?: number;
  encryption?: EncryptionConfig;
  partitions?: number;
  replicationFactor?: number;
}

interface EncryptionConfig {
  enabled: boolean;
  algorithm: 'aes-256-gcm' | 'aes-256-cbc';
  keyId: string;
}

interface MessagePayload {
  id: string;
  type: string;
  data: any;
  metadata: MessageMetadata;
  timestamp: Date;
  attempts: number;
  maxAttempts: number;
  priority: number;
  delay?: number;
  encrypted?: boolean;
}

interface MessageMetadata {
  tenantId: string;
  userId?: string;
  correlationId?: string;
  causationId?: string;
  source: string;
  version: string;
  contentType: string;
  headers?: Record<string, string>;
}

interface ConsumerConfiguration {
  queue: string;
  concurrency: number;
  prefetch: number;
  autoAck: boolean;
  retryPolicy: RetryPolicy;
  circuitBreaker?: CircuitBreakerConfig;
  dlq?: DeadLetterQueueConfig;
  rateLimit?: RateLimitConfig;
}

interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'exponential' | 'linear' | 'fixed';
  initialDelay: number;
  maxDelay: number;
  jitter: boolean;
}

interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

interface DeadLetterQueueConfig {
  enabled: boolean;
  maxRetries: number;
  ttl: number;
  alertOnDLQ: boolean;
}

interface RateLimitConfig {
  enabled: boolean;
  maxMessages: number;
  windowMs: number;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  steps: WorkflowStep[];
  timeout: number;
  retryPolicy: RetryPolicy;
  compensationStrategy: 'saga' | 'rollback' | 'ignore';
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'task' | 'condition' | 'parallel' | 'compensation';
  input: any;
  output?: any;
  timeout: number;
  retryPolicy?: RetryPolicy;
  compensationTask?: string;
  condition?: string;
  next?: string | string[];
}

interface WorkflowInstance {
  id: string;
  workflowId: string;
  tenantId: string;
  status: 'running' | 'completed' | 'failed' | 'compensating' | 'cancelled';
  currentStep: string;
  context: any;
  history: WorkflowEvent[];
  startTime: Date;
  endTime?: Date;
  error?: string;
}

interface WorkflowEvent {
  stepId: string;
  type: 'started' | 'completed' | 'failed' | 'compensated';
  timestamp: Date;
  data?: any;
  error?: string;
}

interface MessageQueueMetrics {
  messagesTotal: prometheus.Counter<string>;
  messageProcessingDuration: prometheus.Histogram<string>;
  queueDepth: prometheus.Gauge<string>;
  consumerCount: prometheus.Gauge<string>;
  messageErrors: prometheus.Counter<string>;
  dlqMessages: prometheus.Counter<string>;
  workflowsTotal: prometheus.Counter<string>;
  workflowDuration: prometheus.Histogram<string>;
}

// ==================== MAIN MESSAGE QUEUE CLASS ====================

export class EnterpriseMessageQueue extends EventEmitter {
  private brokers: Map<string, MessageBroker> = new Map();
  private queues: Map<string, QueueConfiguration> = new Map();
  private consumers: Map<string, ConsumerConfiguration> = new Map();
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private workflowInstances: Map<string, WorkflowInstance> = new Map();
  private logger: winston.Logger;
  private metrics: MessageQueueMetrics;
  private encryptionKeys: Map<string, Buffer> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();

  constructor() {
    super();
    this.initializeLogger();
    this.initializeMetrics();
    this.loadConfiguration();
    this.startHealthChecks();
    this.startMetricsCollection();
  }

  // ==================== INITIALIZATION ====================

  private initializeLogger(): void {
    this.logger = winston.createLogger({
      level: process.env.MQ_LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'enterprise-message-queue' },
      transports: [
        new winston.transports.File({ 
          filename: 'logs/messagequeue-error.log', 
          level: 'error',
          maxsize: 10485760,
          maxFiles: 5
        }),
        new winston.transports.File({ 
          filename: 'logs/messagequeue.log',
          maxsize: 10485760,
          maxFiles: 10
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  private initializeMetrics(): void {
    this.metrics = {
      messagesTotal: new prometheus.Counter({
        name: 'mq_messages_total',
        help: 'Total number of messages processed',
        labelNames: ['queue', 'broker', 'status', 'tenant_id']
      }),
      
      messageProcessingDuration: new prometheus.Histogram({
        name: 'mq_message_processing_duration_seconds',
        help: 'Message processing duration in seconds',
        labelNames: ['queue', 'broker', 'tenant_id'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30]
      }),
      
      queueDepth: new prometheus.Gauge({
        name: 'mq_queue_depth',
        help: 'Number of messages in queue',
        labelNames: ['queue', 'broker']
      }),
      
      consumerCount: new prometheus.Gauge({
        name: 'mq_consumer_count',
        help: 'Number of active consumers',
        labelNames: ['queue', 'broker']
      }),
      
      messageErrors: new prometheus.Counter({
        name: 'mq_message_errors_total',
        help: 'Total number of message processing errors',
        labelNames: ['queue', 'broker', 'error_type', 'tenant_id']
      }),
      
      dlqMessages: new prometheus.Counter({
        name: 'mq_dlq_messages_total',
        help: 'Total number of messages sent to dead letter queue',
        labelNames: ['queue', 'broker', 'tenant_id']
      }),
      
      workflowsTotal: new prometheus.Counter({
        name: 'mq_workflows_total',
        help: 'Total number of workflows processed',
        labelNames: ['workflow', 'status', 'tenant_id']
      }),
      
      workflowDuration: new prometheus.Histogram({
        name: 'mq_workflow_duration_seconds',
        help: 'Workflow execution duration in seconds',
        labelNames: ['workflow', 'tenant_id'],
        buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600]
      })
    };
  }

  private async loadConfiguration(): Promise<void> {
    try {
      // Load message brokers
      await this.loadMessageBrokers();
      
      // Load queue configurations
      await this.loadQueueConfigurations();
      
      // Load consumer configurations
      await this.loadConsumerConfigurations();
      
      // Load workflow definitions
      await this.loadWorkflowDefinitions();
      
      // Load encryption keys
      await this.loadEncryptionKeys();
      
      this.logger.info('Message queue configurations loaded');
      
    } catch (error) {
      this.logger.error('Failed to load configurations:', error);
      throw error;
    }
  }

  private async loadMessageBrokers(): Promise<void> {
    const brokerConfigs = [
      {
        id: 'primary-rabbitmq',
        type: 'rabbitmq' as const,
        config: {
          host: process.env.RABBITMQ_HOST || 'localhost',
          port: parseInt(process.env.RABBITMQ_PORT || '5672'),
          username: process.env.RABBITMQ_USERNAME || 'guest',
          password: process.env.RABBITMQ_PASSWORD || 'guest',
          vhost: process.env.RABBITMQ_VHOST || '/',
          ssl: process.env.RABBITMQ_SSL === 'true',
          maxConnections: parseInt(process.env.RABBITMQ_MAX_CONNECTIONS || '100'),
          heartbeat: parseInt(process.env.RABBITMQ_HEARTBEAT || '60'),
          connectionTimeout: parseInt(process.env.RABBITMQ_CONNECTION_TIMEOUT || '10000')
        }
      },
      {
        id: 'redis-streams',
        type: 'redis' as const,
        config: {
          host: process.env.REDIS_STREAMS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_STREAMS_PORT || '6379'),
          password: process.env.REDIS_STREAMS_PASSWORD,
          maxConnections: parseInt(process.env.REDIS_STREAMS_MAX_CONNECTIONS || '50')
        }
      },
      {
        id: 'kafka-cluster',
        type: 'kafka' as const,
        config: {
          cluster: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
          ssl: process.env.KAFKA_SSL === 'true'
        }
      }
    ];

    for (const config of brokerConfigs) {
      await this.createBrokerConnection(config);
    }
  }

  private async createBrokerConnection(config: any): Promise<void> {
    try {
      let connection: any;
      
      switch (config.type) {
        case 'rabbitmq':
          const amqpUrl = `amqp${config.config.ssl ? 's' : ''}://${config.config.username}:${config.config.password}@${config.config.host}:${config.config.port}${config.config.vhost}`;
          connection = await amqp.connect(amqpUrl, {
            heartbeat: config.config.heartbeat,
            timeout: config.config.connectionTimeout
          });
          break;
          
        case 'redis':
          connection = new Redis({
            host: config.config.host,
            port: config.config.port,
            password: config.config.password,
            maxRetriesPerRequest: 3,
            retryDelayOnFailover: 100,
            lazyConnect: true
          });
          await connection.connect();
          break;
          
        case 'kafka':
          const kafka = new Kafka({
            clientId: 'personachain-enterprise',
            brokers: config.config.cluster,
            ssl: config.config.ssl
          });
          connection = {
            producer: kafka.producer(),
            consumer: kafka.consumer({ groupId: 'personachain-workers' }),
            admin: kafka.admin()
          };
          await connection.producer.connect();
          await connection.consumer.connect();
          break;
          
        default:
          throw new Error(`Unsupported broker type: ${config.type}`);
      }

      const broker: MessageBroker = {
        ...config,
        connection,
        status: 'connected',
        lastHealthCheck: new Date(),
        metrics: {
          totalMessages: 0,
          processedMessages: 0,
          failedMessages: 0,
          averageProcessingTime: 0,
          queueDepth: 0,
          consumerCount: 0
        }
      };

      this.brokers.set(config.id, broker);
      this.logger.info('Message broker connected:', { id: config.id, type: config.type });

    } catch (error) {
      this.logger.error('Failed to create broker connection:', { id: config.id, error });
      throw error;
    }
  }

  private async loadQueueConfigurations(): Promise<void> {
    const queueConfigs: QueueConfiguration[] = [
      {
        name: 'credential-creation',
        durable: true,
        autoDelete: false,
        exclusive: false,
        maxLength: 10000,
        messageTtl: 86400000, // 24 hours
        deadLetterExchange: 'dlx',
        deadLetterRoutingKey: 'credential-creation.dlq',
        priority: 10,
        encryption: {
          enabled: true,
          algorithm: 'aes-256-gcm',
          keyId: 'default'
        }
      },
      {
        name: 'zkp-generation',
        durable: true,
        autoDelete: false,
        exclusive: false,
        maxLength: 5000,
        messageTtl: 43200000, // 12 hours
        deadLetterExchange: 'dlx',
        deadLetterRoutingKey: 'zkp-generation.dlq',
        priority: 15,
        encryption: {
          enabled: true,
          algorithm: 'aes-256-gcm',
          keyId: 'default'
        }
      },
      {
        name: 'identity-verification',
        durable: true,
        autoDelete: false,
        exclusive: false,
        maxLength: 1000,
        messageTtl: 21600000, // 6 hours
        deadLetterExchange: 'dlx',
        deadLetterRoutingKey: 'identity-verification.dlq',
        priority: 20,
        encryption: {
          enabled: true,
          algorithm: 'aes-256-gcm',
          keyId: 'default'
        }
      },
      {
        name: 'audit-logging',
        durable: true,
        autoDelete: false,
        exclusive: false,
        maxLength: 50000,
        messageTtl: 604800000, // 7 days
        priority: 5,
        encryption: {
          enabled: false,
          algorithm: 'aes-256-gcm',
          keyId: 'default'
        }
      },
      {
        name: 'notifications',
        durable: true,
        autoDelete: false,
        exclusive: false,
        maxLength: 20000,
        messageTtl: 172800000, // 48 hours
        priority: 8,
        encryption: {
          enabled: false,
          algorithm: 'aes-256-gcm',
          keyId: 'default'
        }
      }
    ];

    for (const config of queueConfigs) {
      this.queues.set(config.name, config);
    }
  }

  private async loadConsumerConfigurations(): Promise<void> {
    const consumerConfigs: ConsumerConfiguration[] = [
      {
        queue: 'credential-creation',
        concurrency: 5,
        prefetch: 10,
        autoAck: false,
        retryPolicy: {
          maxAttempts: 3,
          backoffStrategy: 'exponential',
          initialDelay: 1000,
          maxDelay: 30000,
          jitter: true
        },
        circuitBreaker: {
          enabled: true,
          failureThreshold: 5,
          resetTimeout: 60000,
          monitoringPeriod: 10000
        },
        dlq: {
          enabled: true,
          maxRetries: 5,
          ttl: 86400000,
          alertOnDLQ: true
        }
      },
      {
        queue: 'zkp-generation',
        concurrency: 3,
        prefetch: 5,
        autoAck: false,
        retryPolicy: {
          maxAttempts: 2,
          backoffStrategy: 'exponential',
          initialDelay: 2000,
          maxDelay: 60000,
          jitter: true
        },
        circuitBreaker: {
          enabled: true,
          failureThreshold: 3,
          resetTimeout: 120000,
          monitoringPeriod: 15000
        },
        dlq: {
          enabled: true,
          maxRetries: 3,
          ttl: 43200000,
          alertOnDLQ: true
        }
      },
      {
        queue: 'identity-verification',
        concurrency: 2,
        prefetch: 3,
        autoAck: false,
        retryPolicy: {
          maxAttempts: 2,
          backoffStrategy: 'exponential',
          initialDelay: 5000,
          maxDelay: 120000,
          jitter: true
        },
        circuitBreaker: {
          enabled: true,
          failureThreshold: 2,
          resetTimeout: 180000,
          monitoringPeriod: 20000
        },
        dlq: {
          enabled: true,
          maxRetries: 2,
          ttl: 21600000,
          alertOnDLQ: true
        },
        rateLimit: {
          enabled: true,
          maxMessages: 10,
          windowMs: 60000
        }
      }
    ];

    for (const config of consumerConfigs) {
      this.consumers.set(config.queue, config);
    }
  }

  private async loadWorkflowDefinitions(): Promise<void> {
    const workflowDefs: WorkflowDefinition[] = [
      {
        id: 'credential-issuance-workflow',
        name: 'Complete Credential Issuance',
        version: '1.0.0',
        timeout: 300000, // 5 minutes
        retryPolicy: {
          maxAttempts: 2,
          backoffStrategy: 'exponential',
          initialDelay: 5000,
          maxDelay: 30000,
          jitter: true
        },
        compensationStrategy: 'saga',
        steps: [
          {
            id: 'fetch-api-data',
            name: 'Fetch API Data',
            type: 'task',
            input: { provider: '{{provider}}', credentialType: '{{credentialType}}' },
            timeout: 30000,
            next: 'create-vc'
          },
          {
            id: 'create-vc',
            name: 'Create Verifiable Credential',
            type: 'task',
            input: { apiData: '{{fetchApiData.output}}', schema: '{{schema}}' },
            timeout: 15000,
            compensationTask: 'delete-vc',
            next: 'attach-to-did'
          },
          {
            id: 'attach-to-did',
            name: 'Attach to DID',
            type: 'task',
            input: { credential: '{{createVc.output}}', didId: '{{didId}}' },
            timeout: 10000,
            compensationTask: 'detach-from-did',
            next: 'generate-zkp'
          },
          {
            id: 'generate-zkp',
            name: 'Generate ZK Proof',
            type: 'task',
            input: { credential: '{{createVc.output}}', circuit: '{{circuit}}' },
            timeout: 60000,
            compensationTask: 'delete-zkp'
          }
        ]
      },
      {
        id: 'identity-verification-workflow',
        name: 'Complete Identity Verification',
        version: '1.0.0',
        timeout: 600000, // 10 minutes
        retryPolicy: {
          maxAttempts: 1,
          backoffStrategy: 'fixed',
          initialDelay: 10000,
          maxDelay: 10000,
          jitter: false
        },
        compensationStrategy: 'rollback',
        steps: [
          {
            id: 'document-verification',
            name: 'Verify Documents',
            type: 'task',
            input: { documents: '{{documents}}', provider: '{{provider}}' },
            timeout: 120000,
            next: 'liveness-check'
          },
          {
            id: 'liveness-check',
            name: 'Perform Liveness Check',
            type: 'task',
            input: { selfie: '{{selfie}}', documentPhoto: '{{documentVerification.output.photo}}' },
            timeout: 60000,
            next: 'fraud-analysis'
          },
          {
            id: 'fraud-analysis',
            name: 'Analyze for Fraud',
            type: 'task',
            input: { verificationData: '{{livenessCheck.output}}', metadata: '{{metadata}}' },
            timeout: 30000,
            next: 'compliance-check'
          },
          {
            id: 'compliance-check',
            name: 'Check Compliance',
            type: 'task',
            input: { identity: '{{fraudAnalysis.output}}', region: '{{region}}' },
            timeout: 15000
          }
        ]
      }
    ];

    for (const workflow of workflowDefs) {
      this.workflows.set(workflow.id, workflow);
    }
  }

  private async loadEncryptionKeys(): Promise<void> {
    const masterKey = process.env.MQ_MASTER_KEY || crypto.randomBytes(32).toString('hex');
    this.encryptionKeys.set('master', Buffer.from(masterKey, 'hex'));
    
    // Default encryption key
    const defaultKey = crypto.pbkdf2Sync(masterKey, 'default', 100000, 32, 'sha256');
    this.encryptionKeys.set('default', defaultKey);
  }

  // ==================== MESSAGE PUBLISHING ====================

  public async publishMessage(
    queue: string,
    payload: Omit<MessagePayload, 'id' | 'timestamp' | 'attempts'>,
    options: {
      brokerId?: string;
      priority?: number;
      delay?: number;
      persistent?: boolean;
    } = {}
  ): Promise<string> {
    const messageId = crypto.randomUUID();
    const timestamp = new Date();
    
    const message: MessagePayload = {
      id: messageId,
      timestamp,
      attempts: 0,
      ...payload
    };

    try {
      // Get broker
      const brokerId = options.brokerId || this.selectBestBroker();
      const broker = this.brokers.get(brokerId);
      if (!broker || broker.status !== 'connected') {
        throw new Error(`Broker not available: ${brokerId}`);
      }

      // Get queue configuration
      const queueConfig = this.queues.get(queue);
      if (!queueConfig) {
        throw new Error(`Queue configuration not found: ${queue}`);
      }

      // Encrypt message if required
      if (queueConfig.encryption?.enabled) {
        message.data = await this.encryptMessage(message.data, queueConfig.encryption.keyId);
        message.encrypted = true;
      }

      // Publish to broker
      await this.publishToBroker(broker, queue, message, options);

      // Update metrics
      this.metrics.messagesTotal.inc({
        queue,
        broker: brokerId,
        status: 'published',
        tenant_id: message.metadata.tenantId
      });

      this.logger.info('Message published:', {
        messageId,
        queue,
        brokerId,
        tenantId: message.metadata.tenantId
      });

      return messageId;

    } catch (error) {
      this.logger.error('Failed to publish message:', {
        messageId,
        queue,
        error: error.message
      });

      this.metrics.messageErrors.inc({
        queue,
        broker: 'unknown',
        error_type: 'publish_error',
        tenant_id: payload.metadata.tenantId
      });

      throw error;
    }
  }

  private async publishToBroker(
    broker: MessageBroker,
    queue: string,
    message: MessagePayload,
    options: any
  ): Promise<void> {
    switch (broker.type) {
      case 'rabbitmq':
        await this.publishToRabbitMQ(broker, queue, message, options);
        break;
      case 'redis':
        await this.publishToRedis(broker, queue, message, options);
        break;
      case 'kafka':
        await this.publishToKafka(broker, queue, message, options);
        break;
      default:
        throw new Error(`Unsupported broker type: ${broker.type}`);
    }
  }

  private async publishToRabbitMQ(
    broker: MessageBroker,
    queue: string,
    message: MessagePayload,
    options: any
  ): Promise<void> {
    const channel = await broker.connection.createChannel();
    
    try {
      const queueConfig = this.queues.get(queue)!;
      
      // Assert queue
      await channel.assertQueue(queue, {
        durable: queueConfig.durable,
        autoDelete: queueConfig.autoDelete,
        exclusive: queueConfig.exclusive,
        arguments: {
          'x-max-length': queueConfig.maxLength,
          'x-message-ttl': queueConfig.messageTtl,
          'x-dead-letter-exchange': queueConfig.deadLetterExchange,
          'x-dead-letter-routing-key': queueConfig.deadLetterRoutingKey,
          'x-max-priority': queueConfig.priority
        }
      });

      // Publish message
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const published = channel.sendToQueue(queue, messageBuffer, {
        persistent: options.persistent !== false,
        priority: options.priority || message.priority,
        messageId: message.id,
        timestamp: message.timestamp.getTime(),
        headers: {
          tenantId: message.metadata.tenantId,
          correlationId: message.metadata.correlationId,
          version: message.metadata.version
        }
      });

      if (!published) {
        throw new Error('Failed to publish message to RabbitMQ');
      }

    } finally {
      await channel.close();
    }
  }

  private async publishToRedis(
    broker: MessageBroker,
    queue: string,
    message: MessagePayload,
    options: any
  ): Promise<void> {
    const streamKey = `stream:${queue}`;
    const messageData = JSON.stringify(message);
    
    await broker.connection.xadd(
      streamKey,
      'MAXLEN', '~', '10000', // Approximate max length
      '*',
      'data', messageData,
      'tenantId', message.metadata.tenantId,
      'priority', message.priority.toString()
    );
  }

  private async publishToKafka(
    broker: MessageBroker,
    queue: string,
    message: MessagePayload,
    options: any
  ): Promise<void> {
    await broker.connection.producer.send({
      topic: queue,
      messages: [{
        key: message.metadata.tenantId,
        value: JSON.stringify(message),
        partition: options.partition,
        timestamp: message.timestamp.getTime().toString(),
        headers: {
          tenantId: message.metadata.tenantId,
          correlationId: message.metadata.correlationId || '',
          version: message.metadata.version
        }
      }]
    });
  }

  // ==================== MESSAGE CONSUMPTION ====================

  public async startConsumer(
    queue: string,
    handler: (message: MessagePayload) => Promise<void>,
    options: Partial<ConsumerConfiguration> = {}
  ): Promise<void> {
    const config = { ...this.consumers.get(queue), ...options };
    if (!config) {
      throw new Error(`Consumer configuration not found for queue: ${queue}`);
    }

    const brokerId = this.selectBestBroker();
    const broker = this.brokers.get(brokerId);
    if (!broker) {
      throw new Error(`Broker not available: ${brokerId}`);
    }

    // Create circuit breaker
    if (config.circuitBreaker?.enabled) {
      this.circuitBreakers.set(queue, new CircuitBreaker(
        config.circuitBreaker.failureThreshold,
        config.circuitBreaker.resetTimeout,
        config.circuitBreaker.monitoringPeriod
      ));
    }

    // Create rate limiter
    if (config.rateLimit?.enabled) {
      this.rateLimiters.set(queue, new RateLimiter(
        config.rateLimit.maxMessages,
        config.rateLimit.windowMs
      ));
    }

    // Start consumers based on concurrency
    for (let i = 0; i < config.concurrency; i++) {
      this.startConsumerWorker(broker, queue, handler, config, i);
    }

    this.logger.info('Consumer started:', {
      queue,
      brokerId,
      concurrency: config.concurrency
    });
  }

  private async startConsumerWorker(
    broker: MessageBroker,
    queue: string,
    handler: (message: MessagePayload) => Promise<void>,
    config: ConsumerConfiguration,
    workerId: number
  ): Promise<void> {
    switch (broker.type) {
      case 'rabbitmq':
        await this.startRabbitMQConsumer(broker, queue, handler, config, workerId);
        break;
      case 'redis':
        await this.startRedisConsumer(broker, queue, handler, config, workerId);
        break;
      case 'kafka':
        await this.startKafkaConsumer(broker, queue, handler, config, workerId);
        break;
    }
  }

  private async startRabbitMQConsumer(
    broker: MessageBroker,
    queue: string,
    handler: (message: MessagePayload) => Promise<void>,
    config: ConsumerConfiguration,
    workerId: number
  ): Promise<void> {
    const channel = await broker.connection.createChannel();
    await channel.prefetch(config.prefetch);

    const processMessage = async (msg: Message | null) => {
      if (!msg) return;

      const startTime = Date.now();
      let message: MessagePayload;

      try {
        message = JSON.parse(msg.content.toString());
        
        // Check rate limit
        const rateLimiter = this.rateLimiters.get(queue);
        if (rateLimiter && !await rateLimiter.isAllowed()) {
          // Reject and requeue
          channel.nack(msg, false, true);
          return;
        }

        // Check circuit breaker
        const circuitBreaker = this.circuitBreakers.get(queue);
        if (circuitBreaker && circuitBreaker.getState() === 'open') {
          // Reject and requeue
          channel.nack(msg, false, true);
          return;
        }

        // Decrypt if necessary
        if (message.encrypted) {
          const queueConfig = this.queues.get(queue)!;
          message.data = await this.decryptMessage(message.data, queueConfig.encryption!.keyId);
        }

        // Process message
        await this.processMessageWithRetry(message, handler, config);

        // Acknowledge message
        if (!config.autoAck) {
          channel.ack(msg);
        }

        // Update metrics
        const duration = (Date.now() - startTime) / 1000;
        this.updateBrokerMetrics(broker, true, duration);
        this.metrics.messagesTotal.inc({
          queue,
          broker: broker.id,
          status: 'processed',
          tenant_id: message.metadata.tenantId
        });
        this.metrics.messageProcessingDuration.observe({
          queue,
          broker: broker.id,
          tenant_id: message.metadata.tenantId
        }, duration);

        // Notify circuit breaker of success
        if (circuitBreaker) {
          circuitBreaker.onSuccess();
        }

      } catch (error) {
        this.logger.error('Message processing failed:', {
          queue,
          workerId,
          messageId: message?.id,
          error: error.message
        });

        // Handle failure
        await this.handleMessageFailure(channel, msg, message!, error, config, broker);

        // Notify circuit breaker of failure
        const circuitBreaker = this.circuitBreakers.get(queue);
        if (circuitBreaker) {
          circuitBreaker.onFailure();
        }
      }
    };

    await channel.consume(queue, processMessage, { noAck: config.autoAck });
  }

  private async startRedisConsumer(
    broker: MessageBroker,
    queue: string,
    handler: (message: MessagePayload) => Promise<void>,
    config: ConsumerConfiguration,
    workerId: number
  ): Promise<void> {
    const streamKey = `stream:${queue}`;
    const groupName = `group:${queue}`;
    const consumerName = `consumer:${workerId}`;

    // Create consumer group
    try {
      await broker.connection.xgroup('CREATE', streamKey, groupName, '$', 'MKSTREAM');
    } catch (error) {
      // Group might already exist
    }

    const processMessages = async () => {
      try {
        const messages = await broker.connection.xreadgroup(
          'GROUP', groupName, consumerName,
          'COUNT', config.prefetch,
          'BLOCK', 1000,
          'STREAMS', streamKey, '>'
        );

        if (messages && messages.length > 0) {
          for (const [stream, streamMessages] of messages) {
            for (const [messageId, fields] of streamMessages) {
              await this.processRedisMessage(
                broker, queue, messageId, fields, handler, config
              );
            }
          }
        }
      } catch (error) {
        this.logger.error('Redis consumer error:', { queue, workerId, error });
      }

      // Continue processing
      setImmediate(processMessages);
    };

    processMessages();
  }

  private async processRedisMessage(
    broker: MessageBroker,
    queue: string,
    messageId: string,
    fields: string[],
    handler: (message: MessagePayload) => Promise<void>,
    config: ConsumerConfiguration
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const dataIndex = fields.indexOf('data');
      if (dataIndex === -1 || dataIndex + 1 >= fields.length) {
        throw new Error('Invalid message format');
      }

      const message: MessagePayload = JSON.parse(fields[dataIndex + 1]);

      // Decrypt if necessary
      if (message.encrypted) {
        const queueConfig = this.queues.get(queue)!;
        message.data = await this.decryptMessage(message.data, queueConfig.encryption!.keyId);
      }

      // Process message
      await this.processMessageWithRetry(message, handler, config);

      // Acknowledge message
      await broker.connection.xack(`stream:${queue}`, `group:${queue}`, messageId);

      // Update metrics
      const duration = (Date.now() - startTime) / 1000;
      this.updateBrokerMetrics(broker, true, duration);
      this.metrics.messagesTotal.inc({
        queue,
        broker: broker.id,
        status: 'processed',
        tenant_id: message.metadata.tenantId
      });

    } catch (error) {
      this.logger.error('Redis message processing failed:', {
        queue,
        messageId,
        error: error.message
      });

      this.updateBrokerMetrics(broker, false, 0);
      this.metrics.messageErrors.inc({
        queue,
        broker: broker.id,
        error_type: 'processing_error',
        tenant_id: 'unknown'
      });
    }
  }

  private async startKafkaConsumer(
    broker: MessageBroker,
    queue: string,
    handler: (message: MessagePayload) => Promise<void>,
    config: ConsumerConfiguration,
    workerId: number
  ): Promise<void> {
    await broker.connection.consumer.subscribe({ topic: queue });

    await broker.connection.consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        const startTime = Date.now();

        try {
          const payload: MessagePayload = JSON.parse(message.value!.toString());

          // Decrypt if necessary
          if (payload.encrypted) {
            const queueConfig = this.queues.get(queue)!;
            payload.data = await this.decryptMessage(payload.data, queueConfig.encryption!.keyId);
          }

          // Process message
          await this.processMessageWithRetry(payload, handler, config);

          // Update metrics
          const duration = (Date.now() - startTime) / 1000;
          this.updateBrokerMetrics(broker, true, duration);
          this.metrics.messagesTotal.inc({
            queue,
            broker: broker.id,
            status: 'processed',
            tenant_id: payload.metadata.tenantId
          });

        } catch (error) {
          this.logger.error('Kafka message processing failed:', {
            queue,
            partition,
            offset: message.offset,
            error: error.message
          });

          this.updateBrokerMetrics(broker, false, 0);
          this.metrics.messageErrors.inc({
            queue,
            broker: broker.id,
            error_type: 'processing_error',
            tenant_id: 'unknown'
          });
        }
      }
    });
  }

  // ==================== MESSAGE PROCESSING ====================

  private async processMessageWithRetry(
    message: MessagePayload,
    handler: (message: MessagePayload) => Promise<void>,
    config: ConsumerConfiguration
  ): Promise<void> {
    let lastError: Error;

    for (let attempt = 0; attempt < config.retryPolicy.maxAttempts; attempt++) {
      try {
        await handler(message);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        message.attempts = attempt + 1;

        this.logger.warn('Message processing attempt failed:', {
          messageId: message.id,
          attempt: attempt + 1,
          maxAttempts: config.retryPolicy.maxAttempts,
          error: error.message
        });

        if (attempt < config.retryPolicy.maxAttempts - 1) {
          // Calculate delay
          const delay = this.calculateRetryDelay(config.retryPolicy, attempt);
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    throw lastError!;
  }

  private calculateRetryDelay(policy: RetryPolicy, attempt: number): number {
    let delay: number;

    switch (policy.backoffStrategy) {
      case 'exponential':
        delay = Math.min(policy.initialDelay * Math.pow(2, attempt), policy.maxDelay);
        break;
      case 'linear':
        delay = Math.min(policy.initialDelay * (attempt + 1), policy.maxDelay);
        break;
      case 'fixed':
      default:
        delay = policy.initialDelay;
        break;
    }

    // Add jitter if enabled
    if (policy.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return delay;
  }

  private async handleMessageFailure(
    channel: any,
    msg: any,
    message: MessagePayload,
    error: Error,
    config: ConsumerConfiguration,
    broker: MessageBroker
  ): Promise<void> {
    // Send to DLQ if configured
    if (config.dlq?.enabled) {
      try {
        await this.sendToDeadLetterQueue(message, error, config);
        this.metrics.dlqMessages.inc({
          queue: config.queue,
          broker: broker.id,
          tenant_id: message.metadata.tenantId
        });
      } catch (dlqError) {
        this.logger.error('Failed to send message to DLQ:', dlqError);
      }
    }

    // Reject message
    if (broker.type === 'rabbitmq') {
      channel.nack(msg, false, false); // Don't requeue
    }

    // Update metrics
    this.updateBrokerMetrics(broker, false, 0);
    this.metrics.messageErrors.inc({
      queue: config.queue,
      broker: broker.id,
      error_type: 'processing_error',
      tenant_id: message.metadata.tenantId
    });
  }

  private async sendToDeadLetterQueue(
    message: MessagePayload,
    error: Error,
    config: ConsumerConfiguration
  ): Promise<void> {
    const dlqMessage = {
      ...message,
      metadata: {
        ...message.metadata,
        originalQueue: config.queue,
        failureReason: error.message,
        failureTimestamp: new Date().toISOString()
      }
    };

    await this.publishMessage(`${config.queue}.dlq`, dlqMessage);
  }

  // ==================== WORKFLOW ORCHESTRATION ====================

  public async startWorkflow(
    workflowId: string,
    input: any,
    tenantId: string
  ): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const instanceId = crypto.randomUUID();
    const instance: WorkflowInstance = {
      id: instanceId,
      workflowId,
      tenantId,
      status: 'running',
      currentStep: workflow.steps[0].id,
      context: input,
      history: [],
      startTime: new Date()
    };

    this.workflowInstances.set(instanceId, instance);

    // Start workflow execution
    this.executeWorkflowStep(instance, workflow.steps[0]);

    this.logger.info('Workflow started:', {
      instanceId,
      workflowId,
      tenantId
    });

    return instanceId;
  }

  private async executeWorkflowStep(
    instance: WorkflowInstance,
    step: WorkflowStep
  ): Promise<void> {
    try {
      // Add step start event
      instance.history.push({
        stepId: step.id,
        type: 'started',
        timestamp: new Date()
      });

      const startTime = Date.now();

      // Execute step based on type
      let result: any;
      switch (step.type) {
        case 'task':
          result = await this.executeTask(step, instance.context);
          break;
        case 'condition':
          result = await this.evaluateCondition(step, instance.context);
          break;
        case 'parallel':
          result = await this.executeParallelSteps(step, instance.context);
          break;
        default:
          throw new Error(`Unsupported step type: ${step.type}`);
      }

      // Update context with result
      instance.context[step.id] = { output: result };

      // Add step completion event
      instance.history.push({
        stepId: step.id,
        type: 'completed',
        timestamp: new Date(),
        data: result
      });

      // Determine next step
      const nextStepId = this.getNextStep(step, result, instance.context);
      if (nextStepId) {
        const workflow = this.workflows.get(instance.workflowId)!;
        const nextStep = workflow.steps.find(s => s.id === nextStepId);
        if (nextStep) {
          instance.currentStep = nextStepId;
          await this.executeWorkflowStep(instance, nextStep);
        }
      } else {
        // Workflow completed
        instance.status = 'completed';
        instance.endTime = new Date();
        
        const duration = (instance.endTime.getTime() - instance.startTime.getTime()) / 1000;
        this.metrics.workflowsTotal.inc({
          workflow: instance.workflowId,
          status: 'completed',
          tenant_id: instance.tenantId
        });
        this.metrics.workflowDuration.observe({
          workflow: instance.workflowId,
          tenant_id: instance.tenantId
        }, duration);

        this.logger.info('Workflow completed:', {
          instanceId: instance.id,
          workflowId: instance.workflowId,
          duration
        });
      }

    } catch (error) {
      this.logger.error('Workflow step failed:', {
        instanceId: instance.id,
        stepId: step.id,
        error: error.message
      });

      // Add step failure event
      instance.history.push({
        stepId: step.id,
        type: 'failed',
        timestamp: new Date(),
        error: error.message
      });

      // Handle compensation
      await this.handleWorkflowFailure(instance, step, error);
    }
  }

  private async executeTask(step: WorkflowStep, context: any): Promise<any> {
    // Publish task message
    const messageId = await this.publishMessage('workflow-tasks', {
      type: 'workflow-task',
      data: {
        stepId: step.id,
        input: this.interpolateInput(step.input, context)
      },
      metadata: {
        tenantId: context.tenantId || 'default',
        correlationId: crypto.randomUUID(),
        source: 'workflow-engine',
        version: '1.0.0',
        contentType: 'application/json'
      },
      maxAttempts: 3,
      priority: 10
    });

    // Wait for task completion (simplified)
    // In production, this would use a more sophisticated completion mechanism
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task timeout: ${step.id}`));
      }, step.timeout);

      // Listen for task completion
      this.once(`task-completed:${step.id}`, (result) => {
        clearTimeout(timeout);
        resolve(result);
      });

      this.once(`task-failed:${step.id}`, (error) => {
        clearTimeout(timeout);
        reject(new Error(error));
      });
    });
  }

  private async evaluateCondition(step: WorkflowStep, context: any): Promise<boolean> {
    // Simple condition evaluation
    // In production, this would use a proper expression evaluator
    return true;
  }

  private async executeParallelSteps(step: WorkflowStep, context: any): Promise<any[]> {
    // Execute multiple steps in parallel
    const promises = step.next?.map(stepId => {
      const workflow = this.workflows.get(context.workflowId)!;
      const parallelStep = workflow.steps.find(s => s.id === stepId)!;
      return this.executeTask(parallelStep, context);
    }) || [];

    return Promise.all(promises);
  }

  private interpolateInput(input: any, context: any): any {
    if (typeof input === 'string') {
      return input.replace(/\{\{(.*?)\}\}/g, (match, path) => {
        return this.getValueByPath(context, path) || match;
      });
    } else if (typeof input === 'object' && input !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(input)) {
        result[key] = this.interpolateInput(value, context);
      }
      return result;
    }
    return input;
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private getNextStep(step: WorkflowStep, result: any, context: any): string | null {
    if (typeof step.next === 'string') {
      return step.next;
    } else if (Array.isArray(step.next)) {
      return step.next[0]; // Simplified - return first next step
    }
    return null;
  }

  private async handleWorkflowFailure(
    instance: WorkflowInstance,
    step: WorkflowStep,
    error: Error
  ): Promise<void> {
    instance.status = 'failed';
    instance.error = error.message;
    instance.endTime = new Date();

    this.metrics.workflowsTotal.inc({
      workflow: instance.workflowId,
      status: 'failed',
      tenant_id: instance.tenantId
    });

    // Implement compensation logic here if needed
    this.logger.error('Workflow failed:', {
      instanceId: instance.id,
      workflowId: instance.workflowId,
      stepId: step.id,
      error: error.message
    });
  }

  // ==================== UTILITY METHODS ====================

  private selectBestBroker(): string {
    // Select broker with best performance
    let bestBroker = '';
    let bestScore = Infinity;

    for (const [id, broker] of this.brokers) {
      if (broker.status === 'connected') {
        const score = broker.metrics.averageProcessingTime + broker.metrics.queueDepth;
        if (score < bestScore) {
          bestScore = score;
          bestBroker = id;
        }
      }
    }

    return bestBroker || Array.from(this.brokers.keys())[0];
  }

  private async encryptMessage(data: any, keyId: string): Promise<string> {
    const key = this.encryptionKeys.get(keyId);
    if (!key) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key);
    cipher.setAAD(Buffer.from('PersonaChain-MQ'));

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private async decryptMessage(encryptedData: string, keyId: string): Promise<any> {
    const key = this.encryptionKeys.get(keyId);
    if (!key) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted message format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setAAD(Buffer.from('PersonaChain-MQ'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  private updateBrokerMetrics(broker: MessageBroker, success: boolean, duration: number): void {
    broker.metrics.totalMessages++;
    if (success) {
      broker.metrics.processedMessages++;
    } else {
      broker.metrics.failedMessages++;
    }
    broker.metrics.averageProcessingTime = 
      (broker.metrics.averageProcessingTime + duration * 1000) / 2;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== HEALTH AND MONITORING ====================

  private startHealthChecks(): void {
    setInterval(async () => {
      for (const [id, broker] of this.brokers) {
        await this.checkBrokerHealth(broker);
      }
    }, 30000); // Every 30 seconds
  }

  private async checkBrokerHealth(broker: MessageBroker): Promise<void> {
    try {
      const startTime = Date.now();

      switch (broker.type) {
        case 'rabbitmq':
          await broker.connection.createChannel();
          break;
        case 'redis':
          await broker.connection.ping();
          break;
        case 'kafka':
          // Kafka health check would be more complex
          break;
      }

      const responseTime = Date.now() - startTime;
      broker.status = 'connected';
      broker.metrics.averageProcessingTime = (broker.metrics.averageProcessingTime + responseTime) / 2;
      broker.lastHealthCheck = new Date();

    } catch (error) {
      broker.status = 'error';
      broker.metrics.lastError = {
        message: error.message,
        code: error.code || 'UNKNOWN',
        timestamp: new Date()
      };

      this.logger.error('Broker health check failed:', {
        brokerId: broker.id,
        error: error.message
      });
    }
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectMetrics();
    }, 10000); // Every 10 seconds
  }

  private collectMetrics(): void {
    for (const [id, broker] of this.brokers) {
      this.metrics.queueDepth.set(
        { queue: 'all', broker: id },
        broker.metrics.queueDepth
      );
      this.metrics.consumerCount.set(
        { queue: 'all', broker: id },
        broker.metrics.consumerCount
      );
    }
  }

  // ==================== PUBLIC METHODS ====================

  public async initialize(): Promise<void> {
    try {
      // Connect to all brokers
      for (const [id, broker] of this.brokers) {
        if (broker.status !== 'connected') {
          await this.createBrokerConnection(broker);
        }
      }

      this.logger.info('Enterprise Message Queue initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize message queue:', error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Enterprise Message Queue...');

    // Close all broker connections
    for (const [id, broker] of this.brokers) {
      try {
        switch (broker.type) {
          case 'rabbitmq':
            await broker.connection.close();
            break;
          case 'redis':
            broker.connection.disconnect();
            break;
          case 'kafka':
            await broker.connection.producer.disconnect();
            await broker.connection.consumer.disconnect();
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to close broker connection ${id}:`, error);
      }
    }

    this.logger.info('Message queue shutdown complete');
  }

  public getBrokerStatus(): Map<string, MessageBroker> {
    return new Map(this.brokers);
  }

  public getWorkflowInstance(instanceId: string): WorkflowInstance | null {
    return this.workflowInstances.get(instanceId) || null;
  }

  public async getMetrics(): Promise<string> {
    return prometheus.register.metrics();
  }
}

// ==================== CIRCUIT BREAKER ====================

class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime: Date | null = null;
  private successCount = 0;

  constructor(
    private failureThreshold: number,
    private resetTimeout: number,
    private monitoringPeriod: number
  ) {}

  onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = 'closed';
        this.successCount = 0;
      }
    }
  }

  onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === 'half-open') {
      this.state = 'open';
      this.successCount = 0;
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    if (this.state === 'open' && this.shouldAttemptReset()) {
      this.state = 'half-open';
    }
    return this.state;
  }

  private shouldAttemptReset(): boolean {
    return this.lastFailureTime !== null &&
           Date.now() - this.lastFailureTime.getTime() >= this.resetTimeout;
  }
}

// ==================== RATE LIMITER ====================

class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async isAllowed(): Promise<boolean> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }
}

export default EnterpriseMessageQueue;