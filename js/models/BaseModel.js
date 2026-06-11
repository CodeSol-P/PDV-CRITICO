/**
 * BaseModel.js
 * Clase padre para todos los modelos
 * Proporciona métodos comunes: CRUD, búsqueda, validación
 */

class BaseModel {
    constructor(storeName) {
        this.storeName = storeName;
    }

    /**
     * Generar ID único
     */
    static generateId() {
        return crypto.randomUUID();
    }

    /**
     * Crear registro
     */
    async create(data) {
        const record = {
            id: BaseModel.generateId(),
            ...data,
            fechaCreacion: DateUtils.getNow(),
            fechaActualizacion: DateUtils.getNow()
        };

        await this._validate(record);
        return await db.upsert(this.storeName, record);
    }

    /**
     * Actualizar registro
     */
    async update(id, data) {
        const existing = await this.getById(id);
        if (!existing) throw new Error(`${this.storeName} no encontrado`);

        const updated = {
            ...existing,
            ...data,
            id, // Preservar ID
            fechaCreacion: existing.fechaCreacion, // Preservar fecha creación
            fechaActualizacion: DateUtils.getNow()
        };

        await this._validate(updated);
        return await db.upsert(this.storeName, updated);
    }

    /**
     * Obtener por ID
     */
    async getById(id) {
        return await db.getById(this.storeName, id);
    }

    /**
     * Obtener todos
     */
    async getAll() {
        return await db.getAll(this.storeName);
    }

    /**
     * Eliminar
     */
    async delete(id) {
        return await db.delete(this.storeName, id);
    }

    /**
     * Contar
     */
    async count() {
        return await db.count(this.storeName);
    }

    /**
     * Filtrar
     */
    async filter(predicate) {
        return await db.filter(this.storeName, predicate);
    }

    /**
     * Buscar
     */
    async search(fields, term) {
        return await db.search(this.storeName, fields, term);
    }

    /**
     * Obtener por índice
     */
    async getByIndex(indexName, value) {
        return await db.getByIndex(this.storeName, indexName, value);
    }

    /**
     * Método de validación (override en subclases)
     */
    async _validate(data) {
        // Implementar en subclases
    }

    /**
     * Convertir a JSON
     */
    toJSON() {
        return JSON.stringify(this);
    }
}
