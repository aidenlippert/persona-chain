/**
 * Component Tests for Verification Dashboard
 * Tests UI components and interactions
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VerificationDashboard } from '../../src/components/verification/VerificationDashboard';

// Mock dependencies
vi.mock('../../src/components/identity/StripeIdentityVerification', () => ({
  StripeIdentityVerification: ({ onVerificationComplete, onError }: any) => (
    <div data-testid="stripe-verification">
      <button onClick={() => onVerificationComplete('mock-session-id')}>
        Complete Verification
      </button>
      <button onClick={() => onError('Mock error')}>
        Trigger Error
      </button>
    </div>
  )
}));

vi.mock('../../src/components/financial/PlaidLinkComponent', () => ({
  PlaidLinkComponent: ({ onSuccess, onError }: any) => (
    <div data-testid="plaid-link">
      <button onClick={() => onSuccess({ access_token: 'mock-token' })}>
        Connect Bank
      </button>
      <button onClick={() => onError('Mock error')}>
        Trigger Error
      </button>
    </div>
  )
}));

const mockDidKeyPair = {
  did: 'did:persona:test123',
  publicKey: 'mock-public-key',
  privateKey: 'mock-private-key'
};

describe('VerificationDashboard', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('renders verification dashboard with all verification types', () => {
    render(<VerificationDashboard didKeyPair={mockDidKeyPair} />);

    // Check main heading
    expect(screen.getByText('Identity Verification')).toBeInTheDocument();
    expect(screen.getByText('Complete your identity verification to unlock all features')).toBeInTheDocument();

    // Check verification cards
    expect(screen.getByText('Government ID Verification')).toBeInTheDocument();
    expect(screen.getByText('Bank Account Verification')).toBeInTheDocument();
    expect(screen.getByText('Income Verification')).toBeInTheDocument();
    expect(screen.getByText('Asset Verification')).toBeInTheDocument();
    expect(screen.getByText('Employment Verification')).toBeInTheDocument();
  });

  it('displays correct initial verification status', () => {
    render(<VerificationDashboard didKeyPair={mockDidKeyPair} />);

    // Check progress indicator
    expect(screen.getByText('0/5')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();

    // Check all verifications start as "not_started"
    const startButtons = screen.getAllByText('Start Verification');
    expect(startButtons).toHaveLength(5);
  });

  it('opens verification modal when Start Verification is clicked', async () => {
    render(<VerificationDashboard didKeyPair={mockDidKeyPair} />);

    // Click on first Start Verification button (Government ID)
    const startButtons = screen.getAllByText('Start Verification');
    fireEvent.click(startButtons[0]);

    // Check if modal opens
    await waitFor(() => {
      expect(screen.getByText('Government ID Verification')).toBeInTheDocument();
    });
  });

  it('completes Stripe Identity verification flow', async () => {
    render(<VerificationDashboard didKeyPair={mockDidKeyPair} />);

    // Start Stripe Identity verification
    const startButtons = screen.getAllByText('Start Verification');
    fireEvent.click(startButtons[0]);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByTestId('stripe-verification')).toBeInTheDocument();
    });

    // Complete verification
    const completeButton = screen.getByText('Complete Verification');
    fireEvent.click(completeButton);

    // Check if verification is marked as completed
    await waitFor(() => {
      expect(screen.getByText('✓ Verified')).toBeInTheDocument();
    });
  });

  it('completes Plaid bank verification flow', async () => {
    render(<VerificationDashboard didKeyPair={mockDidKeyPair} />);

    // Start Plaid bank verification (second button)
    const startButtons = screen.getAllByText('Start Verification');
    fireEvent.click(startButtons[1]);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByTestId('plaid-link')).toBeInTheDocument();
    });

    // Complete verification
    const connectButton = screen.getByText('Connect Bank');
    fireEvent.click(connectButton);

    // Check if verification is marked as completed
    await waitFor(() => {
      expect(screen.getByText('✓ Verified')).toBeInTheDocument();
    });
  });

  it('handles verification errors gracefully', async () => {
    render(<VerificationDashboard didKeyPair={mockDidKeyPair} />);

    // Start verification
    const startButtons = screen.getAllByText('Start Verification');
    fireEvent.click(startButtons[0]);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByTestId('stripe-verification')).toBeInTheDocument();
    });

    // Trigger error
    const errorButton = screen.getByText('Trigger Error');
    fireEvent.click(errorButton);

    // Check if verification is marked as failed
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('updates progress when verifications are completed', async () => {
    render(<VerificationDashboard didKeyPair={mockDidKeyPair} />);

    // Complete first verification
    const startButtons = screen.getAllByText('Start Verification');
    fireEvent.click(startButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('stripe-verification')).toBeInTheDocument();
    });

    const completeButton = screen.getByText('Complete Verification');
    fireEvent.click(completeButton);

    // Check progress update
    await waitFor(() => {
      expect(screen.getByText('1/5')).toBeInTheDocument();
    });
  });

  it('persists verification status in localStorage', async () => {
    render(<VerificationDashboard didKeyPair={mockDidKeyPair} />);

    // Complete a verification
    const startButtons = screen.getAllByText('Start Verification');
    fireEvent.click(startButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('stripe-verification')).toBeInTheDocument();
    });

    const completeButton = screen.getByText('Complete Verification');
    fireEvent.click(completeButton);

    // Check localStorage
    await waitFor(() => {
      const storedData = localStorage.getItem(`verifications_${mockDidKeyPair.did}`);
      expect(storedData).toBeTruthy();
      
      if (storedData) {
        const parsed = JSON.parse(storedData);
        expect(parsed.some((v: any) => v.status === 'completed')).toBe(true);
      }
    });
  });

  it('displays verification details modal', async () => {
    // Pre-populate with a completed verification
    const mockVerifications = [
      {
        id: 'stripe_identity',
        type: 'identity',
        name: 'Government ID Verification',
        status: 'completed',
        completedAt: new Date().toISOString(),
        provider: 'Stripe Identity',
        data: { sessionId: 'mock-session' }
      }
    ];

    localStorage.setItem(
      `verifications_${mockDidKeyPair.did}`,
      JSON.stringify(mockVerifications)
    );

    render(<VerificationDashboard didKeyPair={mockDidKeyPair} />);

    // Click View Details button
    await waitFor(() => {
      const viewDetailsButton = screen.getByText('View Details');
      fireEvent.click(viewDetailsButton);
    });

    // Check details modal
    await waitFor(() => {
      expect(screen.getByText('Verification Details')).toBeInTheDocument();
      expect(screen.getByText('Verification Type')).toBeInTheDocument();
      expect(screen.getByText('Provider')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });

  it('displays correct status colors', () => {
    render(<VerificationDashboard didKeyPair={mockDidKeyPair} />);

    // Check statistics cards
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Remaining')).toBeInTheDocument();
  });

  it('closes modal when clicking close button', async () => {
    render(<VerificationDashboard didKeyPair={mockDidKeyPair} />);

    // Open modal
    const startButtons = screen.getAllByText('Start Verification');
    fireEvent.click(startButtons[0]);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByTestId('stripe-verification')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    // Check modal is closed
    await waitFor(() => {
      expect(screen.queryByTestId('stripe-verification')).not.toBeInTheDocument();
    });
  });
});