/**
 * EventEmitter class.
 * 
 * This class provides methods for managing events and their listeners.
 * 
 * @class EventEmitter
 */
'use strict';

class EventEmitter {
  /**
   * Creates an instance of EventEmitter.
   * 
   * Initializes an empty map to store events and their listeners.
   * 
   * @memberof EventEmitter
   */
  constructor() {
    /**
     * A map of events and their listeners.
     * 
     * @type {Map<string, Set<Function>>}
     */
    this.events = new Map();
  }

  /**
   * Adds a listener to an event.
   * 
   * @param {string} event - The name of the event.
   * @param {Function} listener - The listener function.
   * @throws {TypeError} If the listener is not a function.
   * @returns {EventEmitter} This EventEmitter instance.
   * 
   * @memberof EventEmitter
   */
  on(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('The listener must be a function');
    }
    let listeners = this.events.get(event);
    if (!listeners) {
      listeners = new Set();
      this.events.set(event, listeners);
    }
    listeners.add(listener);
    return this;
  }

  /**
   * Removes a listener from an event or clears all listeners.
   * 
   * @param {string} [event] - The name of the event.
   * @param {Function} [listener] - The listener function.
   * @returns {EventEmitter} This EventEmitter instance.
   * 
   * @memberof EventEmitter
   */
  off(event, listener) {
    if (!arguments.length) {
      this.events.clear();
    } else if (arguments.length === 1) {
      this.events.delete(event);
    } else {
      const listeners = this.events.get(event);
      if (listeners) {
        listeners.delete(listener);
      }
    }
    return this;
  }

  /**
   * Emits an event and calls its listeners.
   * 
   * @param {string} event - The name of the event.
   * @param {...*} args - Arguments to pass to the listeners.
   * @returns {EventEmitter} This EventEmitter instance.
   * 
   * @memberof EventEmitter
   */
  emit(event, ...args) {
    const listeners = this.events.get(event);
    if (listeners) {
      for (const listener of listeners) {
        listener.apply(this, args);
      }
    }
    return this;
  }
}

export default EventEmitter;