/**
 * PDVModel.js
 * Modelo para Puntos de Venta
 */

class PDVModel extends BaseModel {
    constructor() {
        super(APP_CONFIG.stores.pdv);
    }

    /**
     * Validar datos de PDV
     */
    async _validate(data) {
        const errors = [];

        if (!ValidationUtils.isRequired(data.codigo)) {
            errors.push("Código es requerido");
        } else if (!ValidationUtils.minLength(data.codigo, 3)) {
            errors.push("Código mínimo 3 caracteres");
        }

        if (!ValidationUtils.isRequired(data.nombre)) {
            errors.push("Nombre es requerido");
        } else if (!ValidationUtils.minLength(data.nombre, 5)) {
            errors.push("Nombre mínimo 5 caracteres");
        }

        if (data.email && !ValidationUtils.isValidEmail(data.email)) {
            errors.push("Email inválido");
        }

        if (data.telefono && !ValidationUtils.isValidPhone(data.telefono)) {
            errors.push("Teléfono inválido");
        }

        if (errors.length > 0) {
            throw new Error(errors.join(", "));
        }
    }

    /**
     * Crear PDV con datos por defecto
     */
    async createDefault(codigo, nombre) {
        return await this.create({
            codigo,
            nombre,
            direccion: "",
            responsable: "",
            email: "",
            telefono: "",
            estado: ENUMS.PDV_STATE.ACTIVO
        });
    }

    /**
     * Obtener PDV activos
     */
    async getActivos() {
        return await this.filter(pdv => pdv.estado === ENUMS.PDV_STATE.ACTIVO);
    }

    /**
     * Obtener PDV inactivos
     */
    async getInactivos() {
        return await this.filter(pdv => pdv.estado === ENUMS.PDV_STATE.INACTIVO);
    }

    /**
     * Cambiar estado
     */
    async toggleState(id) {
        const pdv = await this.getById(id);
        if (!pdv) throw new Error("PDV no encontrado");

        const newState = pdv.estado === ENUMS.PDV_STATE.ACTIVO 
            ? ENUMS.PDV_STATE.INACTIVO 
            : ENUMS.PDV_STATE.ACTIVO;

        return await this.update(id, { estado: newState });
    }

    /**
     * Obtener estadísticas del PDV
     */
    async getStats(pdvId) {
        const incidentModel = new IncidentModel();
        
        const allIncidents = await incidentModel.getByPDV(pdvId);
        const openIncidents = allIncidents.filter(i => i.estado === ENUMS.INCIDENT_STATE.ABIERTO);
        const closedIncidents = allIncidents.filter(i => i.estado === ENUMS.INCIDENT_STATE.CERRADO);
        
        const highCritical = allIncidents.filter(i => i.criticidad === ENUMS.CRITICALITY.ALTA);

        return {
            totalIncidents: allIncidents.length,
            openIncidents: openIncidents.length,
            closedIncidents: closedIncidents.length,
            highCritical: highCritical.length,
            resolutionRate: allIncidents.length > 0 
                ? Math.round((closedIncidents.length / allIncidents.length) * 100)
                : 0
        };
    }

    /**
     * Exportar lista de PDV
     */
    async exportList() {
        const pdvs = await this.getAll();
        return pdvs.map(pdv => ({
            codigo: pdv.codigo,
            nombre: pdv.nombre,
            direccion: pdv.direccion,
            responsable: pdv.responsable,
            email: pdv.email,
            telefono: pdv.telefono,
            estado: pdv.estado,
            fechaCreacion: DateUtils.format(pdv.fechaCreacion)
        }));
    }
}

// Instancia global
const pdvModel = new PDVModel();
