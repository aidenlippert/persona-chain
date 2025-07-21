/**
 * Event Emitter Utility
 * Simple event emitter for SDK services
 */

export type EventHandler = (...args: any[]) => void;

export class EventEmitter {
  private events = new Map<string, EventHandler[]>();

  /**
   * Add event listener
   */
  on(event: string, handler: EventHandler): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
  }

  /**
   * Add one-time event listener
   */
  once(event: string, handler: EventHandler): void {
    const onceHandler = (...args: any[]) => {
      handler(...args);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.events.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * Emit event
   */
  emit(event: string, ...args: any[]): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }

    // Also emit to wildcard listeners
    const wildcardHandlers = this.events.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(event, ...args);
        } catch (error) {
          console.error(`Error in wildcard event handler:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get all events
   */
  eventNames(): string[] {
    return Array.from(this.events.keys());
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    const handlers = this.events.get(event);
    return handlers ? handlers.length : 0;
  }
}