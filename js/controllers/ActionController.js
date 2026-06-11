/**
 * ActionController.js
 * Controlador para Acciones
 */

class ActionController {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        eventBus.on("action:create", () => this.openCreateModal());
        eventBus.on("action:edit", (data) => this.openEditModal(data.actionId));
        eventBus.on("action:filter_incident", (data) => this.handleFilterIncident(data.incidentId));
        eventBus.on("action:filter_result", (data) => this.handleFilterResult(data.result));
    }

    async openCreateModal() {
        const incidents = await incidentModel.getAll();

        const fields = [
            { name: "incidenteId", label: "Incidente", type: "select", required: true,
              options: incidents.map(i => ({ value: i.id, label: i.descripcion.substring(0, 40) })) },
            { name: "descripcion", label: "Acción Implementada", type: "textarea", required: true },
            { name: "responsable", label: "Responsable", type: "text" },
            { name: "resultado", label: "Resultado", type: "select", required: true,
              options: Object.values(ENUMS.ACTION_RESULT).map(r => ({ value: r, label: r })) },
            { name: "observaciones", label: "Observaciones", type: "textarea" }
        ];

        ModalView.openForm("Registrar Nueva Acción", fields, async (data) => {
            await this.create(data);
        }, "Registrar Acción");
    }

    async openEditModal(actionId) {
        const action = await actionModel.getById(actionId);
        const incidents = await incidentModel.getAll();

        const fields = [
            { name: "incidenteId", label: "Incidente", type: "select", required: true,
              options: incidents.map(i => ({ value: i.id, label: i.descripcion.substring(0, 40) })) },
            { name: "descripcion", label: "Descripción", type: "textarea", required: true },
            { name: "responsable", label: "Responsable", type: "text" },
            { name: "resultado", label: "Resultado", type: "select", required: true,
              options: Object.values(ENUMS.ACTION_RESULT).map(r => ({ value: r, label: r })) },
            { name: "observaciones", label: "Observaciones", type: "textarea" }
        ];

        const modal = ModalView.openForm("Editar Acción", fields, async (data) => {
            await this.update(actionId, data);
            modal.close();
        }, "Guardar Cambios");
    }

    async create(data) {
        try {
            actionView.showLoading();

            const action = await actionModel.create({
                ...data,
                fechaImplementacion: DateUtils.getNow()
            });

            eventBus.emit(EVENTS.ACTION_CREATED, action);

            actionView.showToast("Acción registrada exitosamente", "success");
            await actionView.render();
            actionView.hideLoading();
        } catch (error) {
            logger.error("Error creando acción:", error);
            actionView.showToast(error.message || "Error al registrar acción", "error");
            actionView.hideLoading();
        }
    }

    async update(actionId, data) {
        try {
            actionView.showLoading();

            const action = await actionModel.update(actionId, data);

            eventBus.emit(EVENTS.ACTION_UPDATED, action);

            actionView.showToast("Acción actualizada exitosamente", "success");
            await actionView.render();
            actionView.hideLoading();
        } catch (error) {
            logger.error("Error actualizando acción:", error);
            actionView.showToast(error.message || "Error al actualizar", "error");
            actionView.hideLoading();
        }
    }

    async handleFilterIncident(incidentId) {
        let actions;
        if (incidentId) {
            actions = await actionModel.getByIncident(incidentId);
        } else {
            actions = await actionModel.getAll();
        }
        await actionView.render(actions);
    }

    async handleFilterResult(result) {
        let actions;
        if (result) {
            actions = await actionModel.filter(a => a.resultado === result);
        } else {
            actions = await actionModel.getAll();
        }
        await actionView.render(actions);
    }
}

const actionController = new ActionController();
