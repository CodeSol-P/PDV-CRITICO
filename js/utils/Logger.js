/**
 * Logger.js
 * Sistema centralizado de logging
 * Facilita debugging y monitoreo de eventos
 */

class Logger {
    constructor() {
        this.logs = [];
        this.max_logs = 1000;
        this.log_level = "info"; // debug, info, warn, error
        this.enable_console = true;
        this.enable_storage = true;
    }

    /**
     * Log de nivel DEBUG
     */
    debug(message, data = null) {
        this._log("debug", message, data, "#00BCD4");
    }

    /**
     * Log de nivel INFO
     */
    info(message, data = null) {
        this._log("info", message, data, "#4CAF50");
    }

    /**
     * Log de nivel WARNING
     */
    warn(message, data = null) {
        this._log("warn", message, data, "#FF9800");
    }

    /**
     * Log de nivel ERROR
     */
    error(message, data = null) {
        this._log("error", message, data, "#F44336");
    }

    /**
     * Log interno
     */
    _log(level, message, data, color) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data,
            id: `${level}_${timestamp}_${Math.random()}`
        };

        // Agregar a array de logs
        this.logs.push(logEntry);
        if (this.logs.length > this.max_logs) {
            this.logs.shift();
        }

        // Imprimir en consola
        if (this.enable_console) {
            const logData = data ? { ...data } : null;
            console.log(
                `%c[${timestamp}] [${level.toUpperCase()}] ${message}`,
                `color: ${color}; font-weight: bold;`,
                logData
            );
        }

        // Guardar en IndexedDB (opcional)
        if (this.enable_storage) {
            this._saveToStorage(logEntry);
        }
    }

    /**
     * Guardar logs en IndexedDB
     */
    async _saveToStorage(logEntry) {
        try {
            // Implementado en IndexedDBManager
            // Por ahora solo se almacenan en memoria
        } catch (error) {
            console.error("Error guardando log:", error);
        }
    }

    /**
     * Obtener todos los logs
     */
    getLogs(filter = null) {
        if (!filter) return this.logs;

        return this.logs.filter(log => {
            if (filter.level && log.level !== filter.level) return false;
            if (filter.message && !log.message.includes(filter.message)) return false;
            return true;
        });
    }

    /**
     * Limpiar logs
     */
    clearLogs() {
        this.logs = [];
    }

    /**
     * Exportar logs como JSON
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Establecer nivel de log
     */
    setLogLevel(level) {
        this.log_level = level;
    }
}

// Instancia global
const logger = new Logger();
