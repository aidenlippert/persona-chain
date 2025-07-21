/**
 * Observable utilities for reactive programming with zen-observable-ts
 * Provides stream-based event handling for Persona wallet
 */

import { Observable, Subscription } from "zen-observable-ts";

// Event types for wallet operations
export interface WalletEvent {
  type:
    | "credential_added"
    | "credential_removed"
    | "proof_requested"
    | "auth_changed"
    | "connection_status";
  payload: any;
  timestamp: number;
}

export interface CredentialEvent {
  type: "issued" | "presented" | "revoked" | "expired" | "removed";
  credentialId: string;
  metadata: any;
  timestamp: number;
}

export interface ProofEvent {
  type: "requested" | "generated" | "verified" | "failed";
  proofId: string;
  verifier: string;
  timestamp: number;
}

/**
 * Wallet Event Stream
 * Central observable for all wallet events
 */
export class WalletEventStream {
  private subject = new Observable<WalletEvent>((observer) => {
    this.observer = observer;
    return () => {
      this.observer = null;
    };
  });

  private observer: any = null;
  private subscriptions: Map<string, Subscription> = new Map();

  // Emit event to all subscribers
  emit(event: WalletEvent): void {
    if (this.observer) {
      this.observer.next({
        ...event,
        timestamp: Date.now(),
      });
    }
  }

  // Subscribe to specific event types
  on(
    eventType: WalletEvent["type"],
    handler: (event: WalletEvent) => void,
  ): () => void {
    const subscription = this.subject.subscribe((event) => {
      if (event.type === eventType) {
        handler(event);
      }
    });

    const subscriptionId = Math.random().toString(36);
    this.subscriptions.set(subscriptionId, subscription);

    return () => {
      const sub = this.subscriptions.get(subscriptionId);
      if (sub) {
        sub.unsubscribe();
        this.subscriptions.delete(subscriptionId);
      }
    };
  }

  // Subscribe to all events
  subscribe(handler: (event: WalletEvent) => void): () => void {
    const subscription = this.subject.subscribe(handler);
    const subscriptionId = Math.random().toString(36);
    this.subscriptions.set(subscriptionId, subscription);

    return () => {
      const sub = this.subscriptions.get(subscriptionId);
      if (sub) {
        sub.unsubscribe();
        this.subscriptions.delete(subscriptionId);
      }
    };
  }

  // Clean up all subscriptions
  destroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
  }
}

/**
 * Credential Stream
 * Observable for credential lifecycle events
 */
export class CredentialStream {
  private stream: Observable<CredentialEvent>;

  constructor() {
    this.stream = new Observable<CredentialEvent>((observer) => {
      // Listen for credential events from storage
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key?.startsWith("credential:")) {
          const credentialId = event.key.replace("credential:", "");
          observer.next({
            type: event.newValue ? "issued" : "removed",
            credentialId,
            metadata: event.newValue ? JSON.parse(event.newValue) : null,
            timestamp: Date.now(),
          });
        }
      };

      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    });
  }

  // Subscribe to credential events
  subscribe(handler: (event: CredentialEvent) => void): () => void {
    const subscription = this.stream.subscribe(handler);
    return () => subscription.unsubscribe();
  }

  // Filter by credential type
  filterByType(type: string): Observable<CredentialEvent> {
    return new Observable<CredentialEvent>((observer) => {
      const subscription = this.stream.subscribe((event) => {
        if (event.metadata?.type === type) {
          observer.next(event);
        }
      });

      return () => subscription.unsubscribe();
    });
  }
}

/**
 * Proof Stream
 * Observable for proof generation and verification events
 */
export class ProofStream {
  private stream: Observable<ProofEvent>;

  constructor() {
    this.stream = new Observable<ProofEvent>((observer) => {
      // Custom proof event handling
      const handleProofEvent = (event: CustomEvent<ProofEvent>) => {
        observer.next(event.detail);
      };

      window.addEventListener("proof-event", handleProofEvent as EventListener);
      return () =>
        window.removeEventListener(
          "proof-event",
          handleProofEvent as EventListener,
        );
    });
  }

  // Subscribe to proof events
  subscribe(handler: (event: ProofEvent) => void): () => void {
    const subscription = this.stream.subscribe(handler);
    return () => subscription.unsubscribe();
  }

  // Emit proof event
  static emit(event: Omit<ProofEvent, "timestamp">): void {
    window.dispatchEvent(
      new CustomEvent("proof-event", {
        detail: {
          ...event,
          timestamp: Date.now(),
        },
      }),
    );
  }
}

/**
 * Connection Status Stream
 * Observable for network and connection status
 */
export class ConnectionStream {
  private stream: Observable<{ online: boolean; timestamp: number }>;

  constructor() {
    this.stream = new Observable((observer) => {
      const emit = () =>
        observer.next({
          online: navigator.onLine,
          timestamp: Date.now(),
        });

      // Initial emission
      emit();

      // Listen for connection changes
      window.addEventListener("online", emit);
      window.addEventListener("offline", emit);

      return () => {
        window.removeEventListener("online", emit);
        window.removeEventListener("offline", emit);
      };
    });
  }

  // Subscribe to connection status
  subscribe(
    handler: (status: { online: boolean; timestamp: number }) => void,
  ): () => void {
    const subscription = this.stream.subscribe(handler);
    return () => subscription.unsubscribe();
  }
}

/**
 * Reactive utilities for combining streams
 */
export class StreamUtils {
  // Merge multiple observables
  static merge<T>(...streams: Observable<T>[]): Observable<T> {
    return new Observable<T>((observer) => {
      const subscriptions = streams.map((stream) =>
        stream.subscribe((value) => observer.next(value)),
      );

      return () => {
        subscriptions.forEach((sub) => sub.unsubscribe());
      };
    });
  }

  // Debounce an observable
  static debounce<T>(stream: Observable<T>, delay: number): Observable<T> {
    return new Observable<T>((observer) => {
      let timeoutId: NodeJS.Timeout;

      const subscription = stream.subscribe((value) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => observer.next(value), delay);
      });

      return () => {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
      };
    });
  }

  // Throttle an observable
  static throttle<T>(stream: Observable<T>, delay: number): Observable<T> {
    return new Observable<T>((observer) => {
      let lastEmission = 0;

      const subscription = stream.subscribe((value) => {
        const now = Date.now();
        if (now - lastEmission >= delay) {
          observer.next(value);
          lastEmission = now;
        }
      });

      return () => subscription.unsubscribe();
    });
  }
}

// Helper function to add filter operator (removed as not needed with simplified implementation)

// Global wallet event stream instance
export const walletEventStream = new WalletEventStream();
export const credentialStream = new CredentialStream();
export const proofStream = new ProofStream();
export const connectionStream = new ConnectionStream();
