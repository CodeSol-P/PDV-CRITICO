/**
 * IndexedDBManager.js
 * Gestor centralizado de base de datos IndexedDB
 * CRUD, consultas, índices, transacciones
 */

class IndexedDBManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    /**
     * Inicializar la base de datos
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(APP_CONFIG.db_name, APP_CONFIG.db_version);

            request.onerror = () => {
                const error = new Error("Error abriendo IndexedDB");
                logger.error("IndexedDB error:", request.error);
                reject(error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                logger.info("IndexedDB inicializado correctamente");
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Crear stores
                const stores = APP_CONFIG.stores;
                const indexes = APP_CONFIG.indexes;

                Object.entries(stores).forEach(([storeName]) => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { keyPath: "id" });

                        // Crear índices
                        if (indexes[storeName]) {
                            indexes[storeName].forEach(indexConfig => {
                                try {
                                    store.createIndex(
                                        indexConfig.name,
                                        indexConfig.path,
                                        { unique: indexConfig.unique || false }
                                    );
                                } catch (error) {
                                    logger.warn(`Error creando índice ${indexConfig.name}:`, error);
                                }
                            });
                        }

                        logger.info(`Store '${storeName}' creado`);
                    }
                });
            };
        });
    }

    /**
     * Crear o actualizar un registro
     */
    async upsert(storeName, data) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);

            // Agregar fecha de actualización
            data.fechaActualizacion = DateUtils.getNow();

            const request = store.put(data);

            request.onsuccess = () => {
                logger.info(`Registro insertado/actualizado en ${storeName}:`, data.id);
                resolve(data);
            };

            request.onerror = () => {
                logger.error(`Error en upsert ${storeName}:`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Obtener un registro por ID
     */
    async getById(storeName, id) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                logger.error(`Error obteniendo ${storeName}:${id}`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Obtener todos los registros de un store
     */
    async getAll(storeName) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                logger.error(`Error obteniendo todos en ${storeName}:`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Obtener por índice
     */
    async getByIndex(storeName, indexName, value) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                logger.error(`Error obteniendo por índice ${indexName}:`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Obtener un registro por índice (primero)
     */
    async getOneByIndex(storeName, indexName, value) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.get(value);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                logger.error(`Error obteniendo por índice ${indexName}:`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Filtrar registros
     */
    async filter(storeName, predicate) {
        const all = await this.getAll(storeName);
        return all.filter(predicate);
    }

    /**
     * Buscar registros
     */
    async search(storeName, searchFields, searchTerm) {
        const all = await this.getAll(storeName);
        const term = searchTerm.toLowerCase();

        return all.filter(item => {
            return searchFields.some(field => {
                const value = String(item[field] || "").toLowerCase();
                return value.includes(term);
            });
        });
    }

    /**
     * Eliminar un registro
     */
    async delete(storeName, id) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                logger.info(`Registro eliminado de ${storeName}:`, id);
                resolve(true);
            };

            request.onerror = () => {
                logger.error(`Error eliminando de ${storeName}:`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Eliminar todos los registros de un store
     */
    async deleteAll(storeName) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                logger.info(`Todos los registros de ${storeName} eliminados`);
                resolve(true);
            };

            request.onerror = () => {
                logger.error(`Error limpiando ${storeName}:`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Contar registros
     */
    async count(storeName) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.count();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                logger.error(`Error contando en ${storeName}:`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Exportar todos los datos de un store como JSON
     */
    async exportStore(storeName) {
        const data = await this.getAll(storeName);
        return data;
    }

    /**
     * Exportar toda la base de datos
     */
    async exportDatabase() {
        const result = {};

        for (const storeName of Object.values(APP_CONFIG.stores)) {
            result[storeName] = await this.exportStore(storeName);
        }

        return result;
    }

    /**
     * Importar datos a un store
     */
    async importStore(storeName, data) {
        if (!Array.isArray(data)) {
            throw new Error("Los datos a importar deben ser un array");
        }

        const results = [];

        for (const item of data) {
            try {
                const result = await this.upsert(storeName, item);
                results.push(result);
            } catch (error) {
                logger.warn(`Error importando item en ${storeName}:`, error);
            }
        }

        logger.info(`${results.length} registros importados a ${storeName}`);
        return results;
    }

    /**
     * Importar toda la base de datos
     */
    async importDatabase(data) {
        const results = {};

        for (const [storeName, storeData] of Object.entries(data)) {
            if (APP_CONFIG.stores[storeName]) {
                results[storeName] = await this.importStore(storeName, storeData);
            }
        }

        return results;
    }

    /**
     * Sincronización: merge inteligente
     */
    async mergeData(storeName, externalData) {
        const localData = await this.getAll(storeName);
        const merged = [];
        const seen = new Set();

        // Procesar datos externos
        for (const ext of externalData) {
            const local = localData.find(item => item.id === ext.id);

            if (!local) {
                // Registro nuevo en externos
                merged.push(ext);
            } else {
                // Comparar por timestamp
                const extTime = new Date(ext.fechaActualizacion).getTime();
                const localTime = new Date(local.fechaActualizacion).getTime();

                merged.push(extTime > localTime ? ext : local);
            }

            seen.add(ext.id);
        }

        // Agregar registros locales no en externos
        for (const local of localData) {
            if (!seen.has(local.id)) {
                merged.push(local);
            }
        }

        return merged;
    }

    /**
     * Obtener estadísticas de la BD
     */
    async getStats() {
        const stats = {};

        for (const [key, storeName] of Object.entries(APP_CONFIG.stores)) {
            try {
                const count = await this.count(storeName);
                stats[storeName] = count;
            } catch (error) {
                stats[storeName] = 0;
            }
        }

        return stats;
    }

    /**
     * Limpiar base de datos
     */
    async clearDatabase() {
        for (const storeName of Object.values(APP_CONFIG.stores)) {
            await this.deleteAll(storeName);
        }

        logger.info("Base de datos limpiada");
    }

    /**
     * Cerrar conexión
     */
    close() {
        if (this.db) {
            this.db.close();
            this.isInitialized = false;
            logger.info("IndexedDB cerrado");
        }
    }

    /**
     * Obtener tamaño aproximado de la BD
     */
    async getSize() {
        if (!navigator.storage || !navigator.storage.estimate) {
            return null;
        }

        const estimate = await navigator.storage.estimate();
        return {
            used: estimate.usage,
            quota: estimate.quota,
            percentUsed: Math.round((estimate.usage / estimate.quota) * 100)
        };
    }

    /**
     * Solicitar almacenamiento persistente
     */
    async requestPersistentStorage() {
        if (!navigator.storage || !navigator.storage.persist) {
            return false;
        }

        return await navigator.storage.persist();
    }
}

// Instancia global
const db = new IndexedDBManager();
