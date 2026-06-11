/**
 * EvidenceModel.js
 * Modelo para Evidencias (Imágenes)
 */

class EvidenceModel extends BaseModel {
    constructor() {
        super(APP_CONFIG.stores.evidences);
    }

    /**
     * Validar datos de evidencia
     */
    async _validate(data) {
        const errors = [];

        if (!ValidationUtils.isRequired(data.incidenteId)) {
            errors.push("Incidente es requerido");
        }

        if (!ValidationUtils.isRequired(data.nombre)) {
            errors.push("Nombre de archivo es requerido");
        }

        if (!ValidationUtils.isRequired(data.base64Data)) {
            errors.push("Datos de imagen son requeridos");
        }

        if (errors.length > 0) {
            throw new Error(errors.join(", "));
        }
    }

    /**
     * Crear evidencia (imagen)
     */
    async createFromFile(incidenteId, file) {
        // Validar archivo
        const validation = FileUtils.validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Convertir a Base64
        const base64Data = await FileUtils.fileToBase64(file);

        // Obtener dimensiones
        const dimensions = await FileUtils.getImageDimensions(base64Data);

        return await this.create({
            incidenteId,
            nombre: file.name,
            base64Data,
            descripcion: "",
            fechaCarga: DateUtils.getNow(),
            orden: await this._getNextOrder(incidenteId),
            size: file.size,
            width: dimensions.width,
            height: dimensions.height
        });
    }

    /**
     * Crear evidencia desde Base64
     */
    async createFromBase64(incidenteId, base64Data, fileName = "image.jpg") {
        return await this.create({
            incidenteId,
            nombre: fileName,
            base64Data,
            descripcion: "",
            fechaCarga: DateUtils.getNow(),
            orden: await this._getNextOrder(incidenteId)
        });
    }

    /**
     * Obtener siguiente número de orden
     */
    async _getNextOrder(incidenteId) {
        const images = await this.getByIncident(incidenteId);
        return images.length + 1;
    }

    /**
     * Obtener evidencias por incidente
     */
    async getByIncident(incidenteId) {
        return await this.getByIndex("incidenteId", incidenteId);
    }

    /**
     * Obtener evidencia por ID
     */
    async getEvidenceById(id) {
        return await this.getById(id);
    }

    /**
     * Actualizar descripción
     */
    async updateDescription(id, descripcion) {
        return await this.update(id, { descripcion });
    }

    /**
     * Reordenar evidencias
     */
    async reorder(incidenteId, order) {
        // order es array de IDs en nuevo orden
        const updated = [];

        for (let i = 0; i < order.length; i++) {
            const id = order[i];
            const result = await this.update(id, { orden: i + 1 });
            updated.push(result);
        }

        return updated;
    }

    /**
     * Obtener evidencias ordenadas
     */
    async getByIncidentOrdered(incidenteId) {
        const evidences = await this.getByIncident(incidenteId);
        return evidences.sort((a, b) => a.orden - b.orden);
    }

    /**
     * Contar evidencias por incidente
     */
    async countByIncident(incidenteId) {
        const evidences = await this.getByIncident(incidenteId);
        return evidences.length;
    }

    /**
     * Verificar límite de imágenes
     */
    async canAddMore(incidenteId) {
        const count = await this.countByIncident(incidenteId);
        return count < DEFAULTS.max_images_per_incident;
    }

    /**
     * Eliminar todas las evidencias de un incidente
     */
    async deleteByIncident(incidenteId) {
        const evidences = await this.getByIncident(incidenteId);
        
        for (const evidence of evidences) {
            await this.delete(evidence.id);
        }

        return true;
    }

    /**
     * Obtener tamaño total de imágenes
     */
    async getTotalSize() {
        const all = await this.getAll();
        return all.reduce((total, evidence) => {
            // Estimar tamaño de Base64
            const sizeEstimate = (evidence.base64Data.length * 3) / 4;
            return total + sizeEstimate;
        }, 0);
    }

    /**
     * Obtener tamaño por incidente
     */
    async getTotalSizeByIncident(incidenteId) {
        const evidences = await this.getByIncident(incidenteId);
        return evidences.reduce((total, evidence) => {
            const sizeEstimate = (evidence.base64Data.length * 3) / 4;
            return total + sizeEstimate;
        }, 0);
    }

    /**
     * Exportar lista de evidencias
     */
    async exportList() {
        const evidences = await this.getAll();
        return evidences.map(evidence => ({
            incidenteId: evidence.incidenteId,
            nombre: evidence.nombre,
            descripcion: evidence.descripcion,
            fechaCarga: DateUtils.format(evidence.fechaCarga),
            tamaño: FileUtils._formatFileSize(evidence.base64Data.length),
            orden: evidence.orden
        }));
    }
}

// Instancia global
const evidenceModel = new EvidenceModel();
