/**
 * EventBus.js
 * Sistema de pub/sub para comunicación entre componentes
 * Desacoplamiento de vistas, controladores y servicios
 */

class EventBus {
    constructor() {
        this.events = {};
        this.maxListeners = 100;
    }

    /**
     * Suscribirse a un evento
     */
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }

        if (this.events[eventName].length >= this.maxListeners) {
            logger.warn(`Máximo de listeners alcanzado para ${eventName}`);
        }

        const subscription = {
            id: `${eventName}_${Date.now()}_${Math.random()}`,
            callback
        };

        this.events[eventName].push(subscription);

        // Retornar función para desuscribirse
        return () => {
            this.off(eventName, subscription.id);
        };
    }

    /**
     * Suscribirse a un evento una sola vez
     */
    once(eventName, callback) {
        const unsubscribe = this.on(eventName, (...args) => {
            callback(...args);
            unsubscribe();
        });

        return unsubscribe;
    }

    /**
     * Desuscribirse
     */
    off(eventName, subscriptionId) {
        if (!this.events[eventName]) return;

        this.events[eventName] = this.events[eventName].filter(
            sub => sub.id !== subscriptionId
        );

        if (this.events[eventName].length === 0) {
            delete this.events[eventName];
        }
    }

    /**
     * Emitir evento
     */
    emit(eventName, data = null) {
        if (!this.events[eventName]) return;

        logger.debug(`Evento emitido: ${eventName}`, data);

        this.events[eventName].forEach(subscription => {
            try {
                subscription.callback(data);
            } catch (error) {
                logger.error(`Error en listener de ${eventName}:`, error);
            }
        });
    }

    /**
     * Emitir evento de forma asincrónica
     */
    async emitAsync(eventName, data = null) {
        if (!this.events[eventName]) return;

        logger.debug(`Evento emitido (async): ${eventName}`, data);

        const promises = this.events[eventName].map(subscription => {
            return Promise.resolve()
                .then(() => subscription.callback(data))
                .catch(error => {
                    logger.error(`Error en listener de ${eventName}:`, error);
                });
        });

        await Promise.all(promises);
    }

    /**
     * Limpiar todos los listeners de un evento
     */
    clear(eventName) {
        if (eventName) {
            delete this.events[eventName];
        } else {
            this.events = {};
        }
    }

    /**
     * Obtener número de listeners
     */
    getListenerCount(eventName) {
        return this.events[eventName]?.length || 0;
    }

    /**
     * Obtener todos los eventos registrados
     */
    getEvents() {
        return Object.keys(this.events);
    }
}

// Instancia global
const eventBus = new EventBus();

// Eventos estándar de la aplicación
const EVENTS = {
    // PDV
    PDV_CREATED: "pdv:created",
    PDV_UPDATED: "pdv:updated",
    PDV_DELETED: "pdv:deleted",
    PDV_LIST_CHANGED: "pdv:list_changed",

    // Incidentes
    INCIDENT_CREATED: "incident:created",
    INCIDENT_UPDATED: "incident:updated",
    INCIDENT_DELETED: "incident:deleted",
    INCIDENT_LIST_CHANGED: "incident:list_changed",

    // Acciones
    ACTION_CREATED: "action:created",
    ACTION_UPDATED: "action:updated",
    ACTION_DELETED: "action:deleted",

    // Evidencias
    EVIDENCE_ADDED: "evidence:added",
    EVIDENCE_REMOVED: "evidence:removed",

    // UI
    VIEW_CHANGED: "ui:view_changed",
    MODAL_OPENED: "ui:modal_opened",
    MODAL_CLOSED: "ui:modal_closed",
    TOAST_SHOW: "ui:toast_show",
    LOADING_START: "ui:loading_start",
    LOADING_END: "ui:loading_end",

    // Sincronización
    SYNC_START: "sync:start",
    SYNC_SUCCESS: "sync:success",
    SYNC_ERROR: "sync:error",

    // Data
    DATA_IMPORTED: "data:imported",
    DATA_EXPORTED: "data:exported",
    DATA_CLEARED: "data:cleared"
};
