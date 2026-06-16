/**
 * SupabaseManager.js
 * Reemplaza IndexedDBManager con la misma API pública.
 * Los nombres de columna en la BD son snake_case; se mapean a camelCase en JS.
 */

class SupabaseManager {
    constructor() {
        this.client        = null;
        this.isInitialized = false;

        // camelCase (JS) ↔ snake_case (DB)
        this._toDbMap = {
            id:                 'id',
            nroCliente:         'nro_cliente',
            nombrePDV:          'nombre_pdv',
            direccion:          'direccion',
            inconveniente:      'inconveniente',
            soluciones:         'soluciones',
            estado:             'estado',
            fechaVisita:        'fecha_visita',
            imagenes:           'imagenes',
            fechaCreacion:      'fecha_creacion',
            fechaActualizacion: 'fecha_actualizacion',
        };

        this._fromDbMap = Object.fromEntries(
            Object.entries(this._toDbMap).map(([js, db]) => [db, js])
        );
    }

    // ── Inicialización ────────────────────────────────────────────────────────

    async init() {
        if (this.isInitialized) return;

        if (typeof supabase === 'undefined') {
            throw new Error('Supabase JS no está cargado. Verificá el CDN en index.html.');
        }
        if (!APP_CONFIG.supabase_url || APP_CONFIG.supabase_url.includes('TU_PROYECTO')) {
            throw new Error('Configurá supabase_url y supabase_anon_key en js/config.js.');
        }

        this.client = supabase.createClient(
            APP_CONFIG.supabase_url,
            APP_CONFIG.supabase_anon_key
        );

        this.isInitialized = true;
        logger.info('Supabase inicializado correctamente');
    }

    // ── Mapeo camelCase ↔ snake_case ─────────────────────────────────────────

    _toDb(obj) {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            out[this._toDbMap[k] || k] = v;
        }
        return out;
    }

    _fromDb(obj) {
        if (!obj) return null;
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            out[this._fromDbMap[k] || k] = v;
        }
        return out;
    }

    _fromDbArr(arr) {
        return (arr || []).map(r => this._fromDb(r));
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    async upsert(storeName, data) {
        const { data: result, error } = await this.client
            .from(storeName)
            .upsert(this._toDb(data), { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            logger.error(`upsert ${storeName}:`, error.message);
            throw new Error(error.message);
        }

        logger.info(`Registro guardado en ${storeName}:`, data.id);
        return this._fromDb(result);
    }

    async getById(storeName, id) {
        const { data, error } = await this.client
            .from(storeName)
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            logger.error(`getById ${storeName}:${id}`, error.message);
            throw new Error(error.message);
        }

        return this._fromDb(data);
    }

    async getAll(storeName) {
        const { data, error } = await this.client
            .from(storeName)
            .select('*')
            .order('fecha_creacion', { ascending: false });

        if (error) {
            logger.error(`getAll ${storeName}:`, error.message);
            throw new Error(error.message);
        }

        return this._fromDbArr(data);
    }

    async getByIndex(storeName, indexName, value) {
        const dbField = this._toDbMap[indexName] || indexName;

        const { data, error } = await this.client
            .from(storeName)
            .select('*')
            .eq(dbField, value);

        if (error) {
            logger.error(`getByIndex ${storeName}.${indexName}:`, error.message);
            throw new Error(error.message);
        }

        return this._fromDbArr(data);
    }

    async getOneByIndex(storeName, indexName, value) {
        const results = await this.getByIndex(storeName, indexName, value);
        return results[0] || null;
    }

    async filter(storeName, predicate) {
        const all = await this.getAll(storeName);
        return all.filter(predicate);
    }

    async search(storeName, searchFields, searchTerm) {
        const all  = await this.getAll(storeName);
        const term = searchTerm.toLowerCase();
        return all.filter(item =>
            searchFields.some(field =>
                String(item[field] || '').toLowerCase().includes(term)
            )
        );
    }

    async delete(storeName, id) {
        const { error } = await this.client
            .from(storeName)
            .delete()
            .eq('id', id);

        if (error) {
            logger.error(`delete ${storeName}:${id}`, error.message);
            throw new Error(error.message);
        }

        logger.info(`Registro eliminado de ${storeName}:`, id);
        return true;
    }

    async deleteAll(storeName) {
        const { error } = await this.client
            .from(storeName)
            .delete()
            .not('id', 'is', null);

        if (error) {
            logger.error(`deleteAll ${storeName}:`, error.message);
            throw new Error(error.message);
        }

        logger.info(`Todos los registros de ${storeName} eliminados`);
        return true;
    }

    async count(storeName) {
        const { count, error } = await this.client
            .from(storeName)
            .select('*', { count: 'exact', head: true });

        if (error) {
            logger.error(`count ${storeName}:`, error.message);
            throw new Error(error.message);
        }

        return count || 0;
    }

    // ── Compatibilidad con métodos extra de IndexedDBManager ─────────────────

    async exportStore(storeName)       { return this.getAll(storeName); }
    async exportDatabase()             {
        const out = {};
        for (const name of Object.values(APP_CONFIG.stores)) out[name] = await this.getAll(name);
        return out;
    }
    async importStore(storeName, data) {
        if (!Array.isArray(data)) throw new Error('Los datos deben ser un array');
        const results = [];
        for (const item of data) {
            try { results.push(await this.upsert(storeName, item)); }
            catch (e) { logger.warn('Error importando item:', e); }
        }
        return results;
    }
    async getStats() {
        const stats = {};
        for (const name of Object.values(APP_CONFIG.stores)) {
            try { stats[name] = await this.count(name); }
            catch (e) { stats[name] = 0; }
        }
        return stats;
    }
    async clearDatabase() {
        for (const name of Object.values(APP_CONFIG.stores)) await this.deleteAll(name);
        logger.info('Base de datos limpiada');
    }
    async mergeData(storeName, externalData) {
        const local  = await this.getAll(storeName);
        const merged = [];
        const seen   = new Set();
        for (const ext of externalData) {
            const loc = local.find(i => i.id === ext.id);
            merged.push(!loc || new Date(ext.fechaActualizacion) > new Date(loc.fechaActualizacion) ? ext : loc);
            seen.add(ext.id);
        }
        for (const loc of local) if (!seen.has(loc.id)) merged.push(loc);
        return merged;
    }

    // No-ops de compatibilidad
    close()                          {}
    async getSize()                  { return null; }
    async requestPersistentStorage() { return true; }
}

// Reemplaza la instancia global `db` que usaba IndexedDBManager
const db = new SupabaseManager();
