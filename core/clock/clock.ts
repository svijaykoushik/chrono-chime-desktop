import { EventEmitter } from 'events';

class Clock extends EventEmitter {
  private static instance: Clock;
  private intervalId?: NodeJS.Timeout;
  private constructor() {
    super();
  }

  static get Instance() {
    if (!Clock.instance) {
      Clock.instance = new Clock();
    }
    return Clock.instance;
  }

  start(tickIntervalMs = 1000) {
    if (this.intervalId) {
      return;
    }
    this.intervalId = setInterval(() => {
      this.emit('tick', new Date());
    }, tickIntervalMs);
  }

  stop() {
    if (!this.intervalId) {
      return;
    }

    clearInterval(this.intervalId);
  }
}

export const clock = Clock.Instance;
