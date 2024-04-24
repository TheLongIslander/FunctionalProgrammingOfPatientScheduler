// publisher.js

class Publisher {
    constructor() {
      this.subscribers = [];
    }
  
    bind(subscriber) {
      this.subscribers.push(subscriber);
    }
  
    publish(data) {
      this.subscribers.forEach(subscriberFunction => subscriberFunction(data));
    }
  }
  
  module.exports = Publisher;
  