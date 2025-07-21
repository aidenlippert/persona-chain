// Mock Redis client for demo purposes when Redis is not available
export class MockRedis {
  private store: Map<string, any> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  async ping() {
    return 'PONG';
  }

  async get(key: string) {
    return this.store.get(key) || null;
  }

  async set(key: string, value: any) {
    this.store.set(key, value);
    return 'OK';
  }

  async setex(key: string, seconds: number, value: any) {
    this.store.set(key, value);
    
    // Clear any existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set expiration
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
    }, seconds * 1000);
    
    this.timers.set(key, timer);
    return 'OK';
  }

  async del(key: string) {
    this.store.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    return 1;
  }

  async incr(key: string) {
    const value = parseInt(this.store.get(key) || '0');
    const newValue = value + 1;
    this.store.set(key, newValue.toString());
    return newValue;
  }

  async expire(key: string, seconds: number) {
    if (!this.store.has(key)) {
      return 0;
    }
    
    const value = this.store.get(key);
    return this.setex(key, seconds, value);
  }

  async decr(key: string) {
    const value = parseInt(this.store.get(key) || '0');
    const newValue = value - 1;
    this.store.set(key, newValue.toString());
    return newValue;
  }

  async quit() {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.store.clear();
    return 'OK';
  }

  on(event: string, handler: Function) {
    // Mock event handling
    if (event === 'connect') {
      setTimeout(() => handler(), 10);
    }
  }
}