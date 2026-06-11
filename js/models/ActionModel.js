/**
 * ActionModel.js
 * Modelo para Acciones Correctivas
 */

class ActionModel extends BaseModel {
    constructor() {
        super(APP_CONFIG.stores.actions);
    }

    /**
     * Validar datos de acción
     */
    async _validate(data) {
        const errors = [];

        if (!ValidationUtils.isRequired(data.incidenteId)) {
            errors.push("Incidente es requerido");
        }

        if (!ValidationUtils.isRequired(data.descripcion)) {
            errors.push("Descripción es requerida");
        } else if (!ValidationUtils.minLength(data.descripcion, 5)) {
            errors.push("Descripción mínimo 5 caracteres");
        }

        if (errors.length > 0) {
            throw new Error(errors.join(", "));
        }
    }

    /**
     * Crear acción
     */
    async createDefault(incidenteId, descripcion) {
        return await this.create({
            incidenteId,
            descripcion,
            fechaImplementacion: DateUtils.getNow(),
            responsable: "",
            resultado: ENUMS.ACTION_RESULT.EXITOSA,
            observaciones: ""
        });
    }

    /**
     * Obtener acciones por incidente
     */
    async getByIncident(incidenteId) {
        return await this.getByIndex("incidenteId", incidenteId);
    }

    /**
     * Obtener acciones exitosas
     */
    async getExitosas() {
        return await this.filter(a => a.resultado === ENUMS.ACTION_RESULT.EXITOSA);
    }

    /**
     * Obtener acciones parciales
     */
    async getParciales() {
        return await this.filter(a => a.resultado === ENUMS.ACTION_RESULT.PARCIAL);
    }

    /**
     * Obtener acciones fallidas
     */
    async getFallidas() {
        return await this.filter(a => a.resultado === ENUMS.ACTION_RESULT.FALLIDA);
    }

    /**
     * Obtener acciones por resultado
     */
    async getByResult(resultado) {
        return await this.filter(a => a.resultado === resultado);
    }

    /**
     * Obtener estadísticas
     */
    async getStats() {
        const all = await this.getAll();

        return {
            total: all.length,
            exitosas: all.filter(a => a.resultado === ENUMS.ACTION_RESULT.EXITOSA).length,
            parciales: all.filter(a => a.resultado === ENUMS.ACTION_RESULT.PARCIAL).length,
            fallidas: all.filter(a => a.resultado === ENUMS.ACTION_RESULT.FALLIDA).length,
            successRate: all.length > 0 
                ? Math.round((all.filter(a => a.resultado === ENUMS.ACTION_RESULT.EXITOSA).length / all.length) * 100)
                : 0
        };
    }

    /**
     * Obtener historial de acciones por incidente
     */
    async getIncidentHistory(incidenteId) {
        const actions = await this.getByIncident(incidenteId);
        return actions.sort((a, b) => {
            return new Date(a.fechaImplementacion) - new Date(b.fechaImplementacion);
        });
    }

    /**
     * Exportar acciones
     */
    async exportList() {
        const actions = await this.getAll();
        return actions.map(action => ({
            incidenteId: action.incidenteId,
            descripcion: action.descripcion,
            fechaImplementacion: DateUtils.format(action.fechaImplementacion),
            responsable: action.responsable,
            resultado: action.resultado,
            observaciones: action.observaciones
        }));
    }
}

// Instancia global
const actionModel = new ActionModel();
