// frontend/src/js/utils/events.js
export const events = {
    subscribers: {},

    subscribe(event, callback) {
        if (!this.subscribers[event]) {
            this.subscribers[event] = [];
        }
        this.subscribers[event].push(callback);
    },

    unsubscribe(event, callback) {
        if (!this.subscribers[event]) return;
        this.subscribers[event] = this.subscribers[event]
            .filter(cb => cb !== callback);
    },

    emit(event, data) {
        if (!this.subscribers[event]) return;
        this.subscribers[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }
};