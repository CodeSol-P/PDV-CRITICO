/**
 * IncidentModel.js
 * Modelo para Incidentes
 */

class IncidentModel extends BaseModel {
    constructor() {
        super(APP_CONFIG.stores.incidents);
    }

    /**
     * Validar datos de incidente
     */
    async _validate(data) {
        const errors = [];

        if (!ValidationUtils.isRequired(data.pdvId)) {
            errors.push("PDV es requerido");
        }

        if (!ValidationUtils.isRequired(data.descripcion)) {
            errors.push("Descripción es requerida");
        } else if (!ValidationUtils.minLength(data.descripcion, 10)) {
            errors.push("Descripción mínimo 10 caracteres");
        }

        if (!ValidationUtils.isRequired(data.categoria)) {
            errors.push("Categoría es requerida");
        }

        if (!ValidationUtils.isRequired(data.criticidad)) {
            errors.push("Criticidad es requerida");
        }

        if (errors.length > 0) {
            throw new Error(errors.join(", "));
        }
    }

    /**
     * Crear incidente
     */
    async createDefault(pdvId, descripcion) {
        return await this.create({
            pdvId,
            fechaDeteccion: DateUtils.getNow(),
            descripcion,
            categoria: ENUMS.INCIDENT_CATEGORY.OTRO,
            criticidad: ENUMS.CRITICALITY.MEDIA,
            estado: ENUMS.INCIDENT_STATE.ABIERTO,
            responsable: "",
            comentarios: ""
        });
    }

    /**
     * Obtener incidentes por PDV
     */
    async getByPDV(pdvId) {
        return await this.getByIndex("pdvId", pdvId);
    }

    /**
     * Obtener incidentes abiertos
     */
    async getAbiertos() {
        return await this.filter(i => i.estado === ENUMS.INCIDENT_STATE.ABIERTO);
    }

    /**
     * Obtener incidentes cerrados
     */
    async getCerrados() {
        return await this.filter(i => i.estado === ENUMS.INCIDENT_STATE.CERRADO);
    }

    /**
     * Obtener incidentes en proceso
     */
    async getEnProceso() {
        return await this.filter(i => i.estado === ENUMS.INCIDENT_STATE.EN_PROCESO);
    }

    /**
     * Obtener incidentes críticos
     */
    async getCriticos() {
        return await this.filter(i => i.criticidad === ENUMS.CRITICALITY.ALTA);
    }

    /**
     * Cambiar estado
     */
    async updateState(id, newState) {
        return await this.update(id, { estado: newState });
    }

    /**
     * Cambiar criticidad
     */
    async updateCriticality(id, criticidad) {
        return await this.update(id, { criticidad });
    }

    /**
     * Obtener incidentes por categoría
     */
    async getByCategory(categoria) {
        return await this.filter(i => i.categoria === categoria);
    }

    /**
     * Obtener incidentes por criticidad
     */
    async getByCriticality(criticality) {
        return await this.filter(i => i.criticidad === criticality);
    }

    /**
     * Obtener estadísticas de incidentes
     */
    async getStats() {
        const all = await this.getAll();

        return {
            total: all.length,
            abiertos: all.filter(i => i.estado === ENUMS.INCIDENT_STATE.ABIERTO).length,
            enProceso: all.filter(i => i.estado === ENUMS.INCIDENT_STATE.EN_PROCESO).length,
            cerrados: all.filter(i => i.estado === ENUMS.INCIDENT_STATE.CERRADO).length,
            alta: all.filter(i => i.criticidad === ENUMS.CRITICALITY.ALTA).length,
            media: all.filter(i => i.criticidad === ENUMS.CRITICALITY.MEDIA).length,
            baja: all.filter(i => i.criticidad === ENUMS.CRITICALITY.BAJA).length
        };
    }

    /**
     * Obtener incidentes por rango de fechas
     */
    async getByDateRange(startDate, endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();

        return await this.filter(i => {
            const date = new Date(i.fechaDeteccion).getTime();
            return date >= start && date <= end;
        });
    }

    /**
     * Tiempo promedio de resolución
     */
    async getAverageResolutionTime() {
        const closed = await this.getCerrados();
        
        if (closed.length === 0) return 0;

        const times = closed.map(i => {
            const detection = new Date(i.fechaDeteccion);
            const update = new Date(i.fechaActualizacion);
            return update - detection; // Milisegundos
        });

        const totalTime = times.reduce((a, b) => a + b, 0);
        const averageMs = totalTime / times.length;
        const averageDays = Math.round(averageMs / (1000 * 60 * 60 * 24));

        return averageDays;
    }

    /**
     * PDV con más problemas
     */
    async getTopProblematicPDV(limit = 5) {
        const all = await this.getAll();
        const grouped = {};

        all.forEach(incident => {
            if (!grouped[incident.pdvId]) {
                grouped[incident.pdvId] = 0;
            }
            grouped[incident.pdvId]++;
        });

        return Object.entries(grouped)
            .map(([pdvId, count]) => ({ pdvId, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Exportar incidentes
     */
    async exportList() {
        const incidents = await this.getAll();
        const pdvModel = new PDVModel();

        const exported = [];
        for (const incident of incidents) {
            const pdv = await pdvModel.getById(incident.pdvId);
            exported.push({
                pdvCodigo: pdv?.codigo || "N/A",
                pdvNombre: pdv?.nombre || "N/A",
                fechaDeteccion: DateUtils.format(incident.fechaDeteccion),
                descripcion: incident.descripcion,
                categoria: incident.categoria,
                criticidad: incident.criticidad,
                estado: incident.estado,
                responsable: incident.responsable
            });
        }

        return exported;
    }
}

// Instancia global
const incidentModel = new IncidentModel();
