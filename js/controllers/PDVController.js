/**
 * PDVController.js
 * Controlador para gestión de Puntos de Venta
 * CRUD y eventos
 */

class PDVController {
    constructor() {
        this.setupEventListeners();
    }

    /**
     * Configurar listeners
     */
    setupEventListeners() {
        // PDV events
        eventBus.on("pdv:create", () => this.openCreatePDVModal());
        eventBus.on("pdv:edit", (data) => this.openEditPDVModal(data.pdvId));
        eventBus.on("pdv:delete", (data) => this.requestDeletePDV(data.pdvId));
        eventBus.on("pdv:search", (data) => this.handleSearchPDV(data.query));
        eventBus.on("pdv:filter_state", (data) => this.handleFilterPDVState(data.state));

        // Incident events (from within PDV detail)
        eventBus.on("incident:create", (data) => this.openCreateIncidentModal(data.pdvId));
        eventBus.on("incident:edit", (data) => this.openEditIncidentModal(data.incidentId));

        // Action events (from within Incident detail)
        eventBus.on("action:create", (data) => this.openCreateActionModal(data.incidentId));
        eventBus.on("action:edit", (data) => this.openEditActionModal(data.actionId));
    }

    /**
     * Crear PDV modal
     */
    async openCreatePDVModal() {
        const fields = [
            { name: "codigo", label: "Código PDV", type: "text", required: true, placeholder: "Ej: PDV-001" },
            { name: "nombre", label: "Nombre", type: "text", required: true, placeholder: "Ej: PDV Tucumán Centro" },
            { name: "direccion", label: "Dirección", type: "text", placeholder: "Dirección completa" },
            { name: "responsable", label: "Responsable", type: "text", placeholder: "Nombre del responsable" },
            { name: "email", label: "Email", type: "email", placeholder: "correo@empresa.com" },
            { name: "telefono", label: "Teléfono", type: "tel", placeholder: "+54 381 123 4567" }
        ];

        ModalView.openForm("Crear Nuevo PDV", fields, async (data) => {
            await this.createPDV(data);
        });
    }

    /**
     * Editar PDV modal
     */
    async openEditPDVModal(pdvId) {
        const pdv = await pdvModel.getById(pdvId);
        if (!pdv) {
            pdvView.showToast("PDV no encontrado", "error");
            return;
        }

        const fields = [
            { name: "codigo", label: "Código PDV", type: "text", required: true },
            { name: "nombre", label: "Nombre", type: "text", required: true },
            { name: "direccion", label: "Dirección", type: "text" },
            { name: "responsable", label: "Responsable", type: "text" },
            { name: "email", label: "Email", type: "email" },
            { name: "telefono", label: "Teléfono", type: "tel" },
            { name: "estado", label: "Estado", type: "select", required: true,
              options: [{ value: "Activo", label: "Activo" }, { value: "Inactivo", label: "Inactivo" }] }
        ];

        const modal = ModalView.openForm("Editar PDV", fields, async (data) => {
            await this.updatePDV(pdvId, data);
            modal.close();
        }, "Guardar Cambios");

        setTimeout(() => {
            Object.entries(pdv).forEach(([key, value]) => {
                const input = modal.getElement(`[name="${key}"]`);
                if (input) input.value = value;
            });
        }, 100);
    }

    /**
     * Crear incidente desde PDV
     */
    async openCreateIncidentModal(pdvId) {
        const fields = [
            { name: "descripcion", label: "Descripción del Problema", type: "textarea", required: true },
            { name: "categoria", label: "Categoría", type: "select", required: true,
              options: Object.values(ENUMS.INCIDENT_CATEGORY).map(c => ({ value: c, label: c })) },
            { name: "criticidad", label: "Criticidad", type: "select", required: true,
              options: Object.values(ENUMS.CRITICALITY).map(c => ({ value: c, label: c })) },
            { name: "responsable", label: "Responsable", type: "text" }
        ];

        ModalView.openForm("Crear Nuevo Incidente", fields, async (data) => {
            await this.createIncident(pdvId, data);
        }, "Crear Incidente");
    }

    /**
     * Editar incidente
     */
    async openEditIncidentModal(incidentId) {
        const incident = await incidentModel.getById(incidentId);
        if (!incident) return;

        const fields = [
            { name: "descripcion", label: "Descripción", type: "textarea", required: true },
            { name: "categoria", label: "Categoría", type: "select", required: true,
              options: Object.values(ENUMS.INCIDENT_CATEGORY).map(c => ({ value: c, label: c })) },
            { name: "criticidad", label: "Criticidad", type: "select", required: true,
              options: Object.values(ENUMS.CRITICALITY).map(c => ({ value: c, label: c })) },
            { name: "estado", label: "Estado", type: "select", required: true,
              options: Object.values(ENUMS.INCIDENT_STATE).map(s => ({ value: s, label: s })) },
            { name: "responsable", label: "Responsable", type: "text" },
            { name: "comentarios", label: "Comentarios", type: "textarea" }
        ];

        const modal = ModalView.openForm("Editar Incidente", fields, async (data) => {
            await this.updateIncident(incidentId, data);
            modal.close();
        }, "Guardar Cambios");

        setTimeout(() => {
            Object.entries(incident).forEach(([key, value]) => {
                const input = modal.getElement(`[name="${key}"]`);
                if (input) input.value = value;
            });
        }, 100);
    }

    /**
     * Crear acción desde incidente
     */
    async openCreateActionModal(incidentId) {
        const fields = [
            { name: "descripcion", label: "Acción Implementada", type: "textarea", required: true },
            { name: "responsable", label: "Responsable", type: "text" },
            { name: "resultado", label: "Resultado", type: "select", required: true,
              options: Object.values(ENUMS.ACTION_RESULT).map(r => ({ value: r, label: r })) },
            { name: "observaciones", label: "Observaciones", type: "textarea" }
        ];

        ModalView.openForm("Registrar Nueva Acción", fields, async (data) => {
            await this.createAction(incidentId, data);
        }, "Registrar Acción");
    }

    /**
     * Editar acción
     */
    async openEditActionModal(actionId) {
        const action = await actionModel.getById(actionId);
        if (!action) return;

        const fields = [
            { name: "descripcion", label: "Descripción", type: "textarea", required: true },
            { name: "responsable", label: "Responsable", type: "text" },
            { name: "resultado", label: "Resultado", type: "select", required: true,
              options: Object.values(ENUMS.ACTION_RESULT).map(r => ({ value: r, label: r })) },
            { name: "observaciones", label: "Observaciones", type: "textarea" }
        ];

        const modal = ModalView.openForm("Editar Acción", fields, async (data) => {
            await this.updateAction(actionId, data);
            modal.close();
        }, "Guardar Cambios");

        setTimeout(() => {
            Object.entries(action).forEach(([key, value]) => {
                const input = modal.getElement(`[name="${key}"]`);
                if (input) input.value = value;
            });
        }, 100);
    }
    /**
     * CRUD Operations - PDV
     */

    async createPDV(data) {
        try {
            pdvView.showLoading();
            const pdv = await pdvModel.create(data);
            eventBus.emit(EVENTS.PDV_CREATED, pdv);
            eventBus.emit(EVENTS.PDV_LIST_CHANGED);
            pdvView.showToast("PDV creado exitosamente", "success");
            await pdvView.render();
            pdvView.hideLoading();
        } catch (error) {
            logger.error("Error creando PDV:", error);
            pdvView.showToast(error.message || "Error al crear PDV", "error");
            pdvView.hideLoading();
        }
    }

    async updatePDV(pdvId, data) {
        try {
            pdvView.showLoading();
            const pdv = await pdvModel.update(pdvId, data);
            eventBus.emit(EVENTS.PDV_UPDATED, pdv);
            eventBus.emit(EVENTS.PDV_LIST_CHANGED);
            pdvView.showToast("PDV actualizado exitosamente", "success");
            await pdvView.render();
            pdvView.hideLoading();
        } catch (error) {
            logger.error("Error actualizando PDV:", error);
            pdvView.showToast(error.message || "Error al actualizar", "error");
            pdvView.hideLoading();
        }
    }

    async requestDeletePDV(pdvId) {
        ModalView.openConfirm(
            "Eliminar PDV",
            "¿Estás seguro de que deseas eliminar este PDV?",
            async () => {
                try {
                    await pdvModel.delete(pdvId);
                    eventBus.emit(EVENTS.PDV_DELETED);
                    eventBus.emit(EVENTS.PDV_LIST_CHANGED);
                    pdvView.showToast("PDV eliminado exitosamente", "success");
                    await pdvView.render();
                } catch (error) {
                    pdvView.showToast(error.message || "Error al eliminar", "error");
                }
            }
        );
    }

    /**
     * CRUD Operations - Incident
     */

    async createIncident(pdvId, data) {
        try {
            pdvView.showLoading();
            const incident = await incidentModel.create({
                ...data,
                pdvId,
                estado: ENUMS.INCIDENT_STATE.ABIERTO
            });
            eventBus.emit(EVENTS.INCIDENT_CREATED, incident);
            eventBus.emit(EVENTS.INCIDENT_LIST_CHANGED);
            pdvView.showToast("Incidente creado exitosamente", "success");
            await pdvView.render();
            pdvView.hideLoading();
        } catch (error) {
            logger.error("Error creando incidente:", error);
            pdvView.showToast(error.message || "Error al crear incidente", "error");
            pdvView.hideLoading();
        }
    }

    async updateIncident(incidentId, data) {
        try {
            pdvView.showLoading();
            const incident = await incidentModel.update(incidentId, data);
            eventBus.emit(EVENTS.INCIDENT_UPDATED, incident);
            eventBus.emit(EVENTS.INCIDENT_LIST_CHANGED);
            pdvView.showToast("Incidente actualizado exitosamente", "success");
            await pdvView.render();
            pdvView.hideLoading();
        } catch (error) {
            logger.error("Error actualizando incidente:", error);
            pdvView.showToast(error.message || "Error al actualizar", "error");
            pdvView.hideLoading();
        }
    }

    /**
     * CRUD Operations - Action
     */

    async createAction(incidentId, data) {
        try {
            pdvView.showLoading();
            const action = await actionModel.create({
                ...data,
                incidenteId: incidentId,
                fechaImplementacion: new Date().toISOString()
            });
            eventBus.emit(EVENTS.ACTION_CREATED, action);
            eventBus.emit(EVENTS.INCIDENT_LIST_CHANGED);
            pdvView.showToast("Acción registrada exitosamente", "success");
            await pdvView.render();
            pdvView.hideLoading();
        } catch (error) {
            logger.error("Error creando acción:", error);
            pdvView.showToast(error.message || "Error al registrar acción", "error");
            pdvView.hideLoading();
        }
    }

    async updateAction(actionId, data) {
        try {
            pdvView.showLoading();
            const action = await actionModel.update(actionId, data);
            eventBus.emit(EVENTS.ACTION_UPDATED, action);
            eventBus.emit(EVENTS.INCIDENT_LIST_CHANGED);
            pdvView.showToast("Acción actualizada exitosamente", "success");
            await pdvView.render();
            pdvView.hideLoading();
        } catch (error) {
            logger.error("Error actualizando acción:", error);
            pdvView.showToast(error.message || "Error al actualizar", "error");
            pdvView.hideLoading();
        }
    }

    /**
     * Filter and Search
     */

    async handleSearchPDV(query) {
        let pdvs;
        if (query) {
            pdvs = await pdvModel.filter(p => 
                p.codigo.toLowerCase().includes(query.toLowerCase()) ||
                p.nombre.toLowerCase().includes(query.toLowerCase())
            );
        } else {
            pdvs = await pdvModel.getAll();
        }
        await pdvView.render(pdvs);
    }

    async handleFilterPDVState(state) {
        let pdvs;
        if (state) {
            pdvs = await pdvModel.filter(p => p.estado === state);
        } else {
            pdvs = await pdvModel.getAll();
        }
        await pdvView.render(pdvs);
    }
}

const pdvController = new PDVController();
