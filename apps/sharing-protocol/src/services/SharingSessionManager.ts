import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import {
  SharingSession,
  ProofShareRequest,
  ProofShareResponse,
  SharingSessionSchema,
  SessionError,
  ConsentRecord,
  SharingAnalytics,
} from '../types/sharing.js';

export interface SharingSessionManagerConfig {
  defaultSessionTTL: number; // milliseconds
  maxActiveSessions: number;
  cleanupInterval: number; // milliseconds
  persistencePath?: string;
  enableAnalytics: boolean;
}

export class SharingSessionManager extends EventEmitter {
  private sessions: Map<string, SharingSession> = new Map();
  private config: SharingSessionManagerConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private analytics: SharingAnalytics;

  constructor(config: Partial<SharingSessionManagerConfig> = {}) {
    super();
    
    this.config = {
      defaultSessionTTL: 30 * 60 * 1000, // 30 minutes
      maxActiveSessions: 1000,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      enableAnalytics: true,
      ...config,
    };

    this.analytics = {
      totalShares: 0,
      sharesByDomain: {},
      sharesByUseCase: {},
      averageResponseTime: 0,
      successRate: 0,
      topRequesters: [],
      consentWithdrawalRate: 0,
      recentActivity: [],
    };

    this.startCleanupTimer();
    console.log('🔄 PersonaPass Sharing Session Manager initialized');
  }

  /**
   * Create a new sharing session with a proof request
   */
  async createSession(
    request: ProofShareRequest,
    type: 'qr' | 'did' | 'direct' | 'api' = 'qr',
    ttl?: number
  ): Promise<SharingSession> {
    if (this.sessions.size >= this.config.maxActiveSessions) {
      throw new SessionError(
        'Maximum active sessions reached',
        { maxSessions: this.config.maxActiveSessions }
      );
    }

    const sessionId = nanoid(16);
    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + (ttl || this.config.defaultSessionTTL)
    ).toISOString();

    const session: SharingSession = {
      id: sessionId,
      type,
      status: 'pending',
      participants: {
        requester: request.requester.did,
      },
      request,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      metadata: {
        requestedDomains: request.requestedProofs.map(p => p.domain),
        purpose: request.purpose,
        requiredProofs: request.requestedProofs.length,
      },
    };

    this.sessions.set(sessionId, session);
    this.emit('sessionCreated', session);

    console.log(`🔗 Created sharing session ${sessionId} for ${request.requester.name}`);
    console.log(`   Type: ${type}, Expires: ${expiresAt}`);
    console.log(`   Requested proofs: ${request.requestedProofs.length}`);

    this.updateAnalytics('sessionCreated', { session, request });
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SharingSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session has expired
    if (new Date() > new Date(session.expiresAt)) {
      this.expireSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update session with holder's response
   */
  async respondToSession(
    sessionId: string,
    holderDid: string,
    response: ProofShareResponse
  ): Promise<SharingSession> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new SessionError('Session not found or expired', { sessionId });
    }

    if (session.status !== 'pending' && session.status !== 'active') {
      throw new SessionError(
        'Session is not in a state to accept responses',
        { sessionId, status: session.status }
      );
    }

    // Validate response matches request
    this.validateResponse(session.request!, response);

    const updatedSession: SharingSession = {
      ...session,
      status: 'completed',
      participants: {
        ...session.participants,
        holder: holderDid,
      },
      response,
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, updatedSession);
    this.emit('sessionCompleted', updatedSession);

    console.log(`✅ Session ${sessionId} completed by ${holderDid}`);
    console.log(`   Shared proofs: ${response.sharedProofs.length}`);
    console.log(`   Consent given: ${response.consentGiven}`);

    this.updateAnalytics('sessionCompleted', { session: updatedSession, response });
    return updatedSession;
  }

  /**
   * Activate a session (e.g., when QR code is scanned)
   */
  async activateSession(sessionId: string, holderDid?: string): Promise<SharingSession> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new SessionError('Session not found or expired', { sessionId });
    }

    if (session.status !== 'pending') {
      throw new SessionError(
        'Session is not pending',
        { sessionId, status: session.status }
      );
    }

    const updatedSession: SharingSession = {
      ...session,
      status: 'active',
      participants: {
        ...session.participants,
        holder: holderDid,
      },
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, updatedSession);
    this.emit('sessionActivated', updatedSession);

    console.log(`🔓 Session ${sessionId} activated`);
    if (holderDid) {
      console.log(`   Holder: ${holderDid}`);
    }

    return updatedSession;
  }

  /**
   * Revoke a session
   */
  async revokeSession(sessionId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionError('Session not found', { sessionId });
    }

    const updatedSession: SharingSession = {
      ...session,
      status: 'revoked',
      updatedAt: new Date().toISOString(),
      metadata: {
        ...session.metadata,
        revocationReason: reason,
      },
    };

    this.sessions.set(sessionId, updatedSession);
    this.emit('sessionRevoked', updatedSession);

    console.log(`🚫 Session ${sessionId} revoked: ${reason || 'No reason provided'}`);
    this.updateAnalytics('sessionRevoked', { session: updatedSession, reason });
  }

  /**
   * List sessions with optional filtering
   */
  listSessions(filter?: {
    status?: SharingSession['status'];
    requesterDid?: string;
    holderDid?: string;
    domain?: string;
    limit?: number;
  }): SharingSession[] {
    let sessions = Array.from(this.sessions.values());

    if (filter) {
      if (filter.status) {
        sessions = sessions.filter(s => s.status === filter.status);
      }
      if (filter.requesterDid) {
        sessions = sessions.filter(s => s.participants.requester === filter.requesterDid);
      }
      if (filter.holderDid) {
        sessions = sessions.filter(s => s.participants.holder === filter.holderDid);
      }
      if (filter.domain) {
        sessions = sessions.filter(s => 
          s.request?.requestedProofs.some(p => p.domain === filter.domain)
        );
      }
      if (filter.limit) {
        sessions = sessions.slice(0, filter.limit);
      }
    }

    // Sort by creation date (newest first)
    return sessions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get analytics data
   */
  getAnalytics(): SharingAnalytics {
    return { ...this.analytics };
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    total: number;
    active: number;
    completed: number;
    expired: number;
    revoked: number;
    byType: Record<string, number>;
  } {
    const sessions = Array.from(this.sessions.values());
    
    return {
      total: sessions.length,
      active: sessions.filter(s => s.status === 'active').length,
      completed: sessions.filter(s => s.status === 'completed').length,
      expired: sessions.filter(s => s.status === 'expired').length,
      revoked: sessions.filter(s => s.status === 'revoked').length,
      byType: sessions.reduce((acc, session) => {
        acc[session.type] = (acc[session.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Clean up expired sessions
   */
  private cleanup(): void {
    const now = new Date();
    let expiredCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > new Date(session.expiresAt)) {
        this.expireSession(sessionId);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`🧹 Cleaned up ${expiredCount} expired sessions`);
    }
  }

  /**
   * Expire a specific session
   */
  private expireSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.status !== 'expired') {
      const expiredSession: SharingSession = {
        ...session,
        status: 'expired',
        updatedAt: new Date().toISOString(),
      };
      
      this.sessions.set(sessionId, expiredSession);
      this.emit('sessionExpired', expiredSession);
    }
  }

  /**
   * Validate that response matches the request
   */
  private validateResponse(request: ProofShareRequest, response: ProofShareResponse): void {
    if (response.requestId !== request.id) {
      throw new SessionError('Response does not match request ID');
    }

    // Check that all required proofs are provided
    const requiredProofs = request.requestedProofs.filter(p => p.required);
    const providedDomains = response.sharedProofs.map(p => p.domain);

    for (const requiredProof of requiredProofs) {
      if (!providedDomains.includes(requiredProof.domain)) {
        throw new SessionError(
          `Required proof missing: ${requiredProof.domain}`,
          { missingDomain: requiredProof.domain }
        );
      }
    }
  }

  /**
   * Update analytics based on events
   */
  private updateAnalytics(event: string, data: any): void {
    if (!this.config.enableAnalytics) return;

    this.analytics.recentActivity.unshift({
      action: event,
      timestamp: new Date().toISOString(),
      details: data,
    });

    // Keep only last 100 activities
    if (this.analytics.recentActivity.length > 100) {
      this.analytics.recentActivity = this.analytics.recentActivity.slice(0, 100);
    }

    switch (event) {
      case 'sessionCompleted':
        this.analytics.totalShares++;
        if (data.response?.sharedProofs) {
          for (const proof of data.response.sharedProofs) {
            this.analytics.sharesByDomain[proof.domain] = 
              (this.analytics.sharesByDomain[proof.domain] || 0) + 1;
          }
        }
        break;
    }
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop the cleanup timer and clean up resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.sessions.clear();
    this.removeAllListeners();
    console.log('🔄 Sharing Session Manager destroyed');
  }
}