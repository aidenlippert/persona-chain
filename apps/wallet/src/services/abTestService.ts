/**
 * Lightweight A/B Testing Service Stub
 * Performance-optimized minimal implementation
 */

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  variants: ABTestVariant[];
  targeting: ABTestTargeting;
  metrics: ABTestMetric[];
  allocation: number;
  startDate: number;
  endDate?: number;
  createdBy: string;
  updatedAt: number;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  weight: number;
  config: Record<string, any>;
  isControl: boolean;
}

export interface ABTestTargeting {
  userSegments?: string[];
  geographicRegions?: string[];
  deviceTypes?: ('mobile' | 'tablet' | 'desktop')[];
  browsers?: string[];
  newUsersOnly?: boolean;
  returningUsersOnly?: boolean;
  minSessionCount?: number;
  customCriteria?: Array<{
    property: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  }>;
}

export interface ABTestMetric {
  id: string;
  name: string;
  type: 'conversion' | 'engagement' | 'revenue' | 'custom';
  goal: 'increase' | 'decrease';
  baseline?: number;
  target?: number;
  significance: number;
}

export interface ABTestResult {
  testId: string;
  variantId: string;
  metrics: Array<{
    metricId: string;
    value: number;
    confidence: number;
    improvement: number;
    significance: number;
    sampleSize: number;
  }>;
  winner?: string;
  recommendation: 'continue' | 'stop' | 'extend' | 'inconclusive';
  updatedAt: number;
}

export interface ABTestParticipation {
  userId: string;
  testId: string;
  variantId: string;
  startTime: number;
  events: Array<{
    metricId: string;
    value: number;
    timestamp: number;
  }>;
  completed: boolean;
}

/**
 * Lightweight A/B testing service stub - no-op implementation for performance
 */
class ABTestService {
  constructor() {
    // No initialization needed for stub
  }

  // No-op methods - maintain API compatibility but do nothing
  async createTest(test: Omit<ABTest, 'id' | 'updatedAt'>): Promise<ABTest> {
    return {
      ...test,
      id: 'stub',
      updatedAt: Date.now(),
    };
  }

  async getUserVariant(userId: string, testId: string): Promise<string | null> {
    return null; // No A/B testing
  }

  async trackConversion(userId: string, testId: string, metricId: string, value: number = 1): Promise<void> {
    // No-op for performance
  }

  getVariantConfig(userId: string, testId: string): Record<string, any> {
    return {}; // Return default config
  }

  isInVariant(userId: string, testId: string, variantId: string): boolean {
    return false; // No variants active
  }

  getTestResults(testId: string): ABTestResult | null {
    return null;
  }

  getActiveTests(): ABTest[] {
    return [];
  }

  async updateTestStatus(testId: string, status: ABTest['status']): Promise<void> {
    // No-op for performance
  }
}

export const abTestService = new ABTestService();