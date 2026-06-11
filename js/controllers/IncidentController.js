/**
 * IncidentController.js
 * Controlador para gestión de Incidentes
 */

class IncidentController {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        eventBus.on("incident:create", () => this.openCreateModal());
        eventBus.on(EVENTS.INCIDENT_UPDATED, (data) => this.openEditModal(data.incidentId));
        eventBus.on("incident:filter_pdv", (data) => this.handleFilterPDV(data.pdvId));
        eventBus.on("incident:filter_state", (data) => this.handleFilterState(data.state));
        eventBus.on("incident:filter_criticality", (data) => this.handleFilterCriticality(data.criticality));
    }

    /**
     * Abrir modal de creación
     */
    async openCreateModal() {
        const pdvs = await pdvModel.getAll();

        const fields = [
            { name: "pdvId", label: "Punto de Venta", type: "select", required: true, 
              options: pdvs.map(p => ({ value: p.id, label: p.nombre })) },
            { name: "descripcion", label: "Descripción del Problema", type: "textarea", required: true },
            { name: "categoria", label: "Categoría", type: "select", required: true,
              options: Object.entries(ENUMS.INCIDENT_CATEGORY).map(([_, v]) => ({ value: v, label: v })) },
            { name: "criticidad", label: "Criticidad", type: "select", required: true,
              options: Object.entries(ENUMS.CRITICALITY).map(([_, v]) => ({ value: v, label: v })) },
            { name: "responsable", label: "Responsable", type: "text" },
            { name: "comentarios", label: "Comentarios", type: "textarea" }
        ];

        const modal = ModalView.openForm("Crear Nuevo Incidente", fields, async (data) => {
            await this.create(data);
        }, "Crear Incidente");
    }

    /**
     * Abrir modal de edición
     */
    async openEditModal(incidentId) {
        const incident = await incidentModel.getById(incidentId);
        if (!incident) {
            incidentView.showToast("Incidente no encontrado", "error");
            return;
        }

        const pdvs = await pdvModel.getAll();
        const modal = new ModalView({
            title: "Editar Incidente",
            size: "700px",
            closeButton: true,
            footer: true,
            buttons: [
                { text: "Cancelar", className: "btn-outline", onClick: () => modal.close() },
                {
                    text: "Guardar Cambios", className: "btn-primary",
                    onClick: async () => {
                        const form = modal.getElement("form");
                        const formData = new FormData(form);
                        const data = Object.fromEntries(formData);
                        await this.update(incidentId, data);
                        modal.close();
                    }
                }
            ]
        });

        let formHtml = '<form class="modal-form">';
        formHtml += `
            <div class="form-group required">
                <label>Punto de Venta</label>
                <select name="pdvId" required>
                    ${pdvs.map(p => `<option value="${p.id}" ${p.id === incident.pdvId ? 'selected' : ''}>${p.nombre}</option>`).join('')}
                </select>
            </div>
            <div class="form-group required">
                <label>Descripción</label>
                <textarea name="descripcion" required>${incident.descripcion}</textarea>
            </div>
            <div class="form-group required">
                <label>Categoría</label>
                <select name="categoria" required>
                    ${Object.values(ENUMS.INCIDENT_CATEGORY).map(c => `<option ${c === incident.categoria ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
            </div>
            <div class="form-group required">
                <label>Criticidad</label>
                <select name="criticidad" required>
                    ${Object.values(ENUMS.CRITICALITY).map(c => `<option ${c === incident.criticidad ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
            </div>
            <div class="form-group required">
                <label>Estado</label>
                <select name="estado" required>
                    ${Object.values(ENUMS.INCIDENT_STATE).map(s => `<option ${s === incident.estado ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Responsable</label>
                <input type="text" name="responsable" value="${incident.responsable || ''}">
            </div>
            <div class="form-group">
                <label>Comentarios</label>
                <textarea name="comentarios">${incident.comentarios || ''}</textarea>
            </div>

            <h4 style="margin-top: 20px;">Cargar Evidencias</h4>
            <div class="form-group">
                <label>Seleccionar Imágenes</label>
                <input type="file" id="image-upload" multiple accept="image/*" style="padding: 10px; border: 2px dashed #ccc; border-radius: 4px; width: 100%; cursor: pointer;">
                <small style="color: #999;">Máximo 5 MB por imagen, hasta ${DEFAULTS.max_images_per_incident} imágenes</small>
            </div>
            <div id="image-preview" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-top: 10px;"></div>
        </form>`;

        modal.open(formHtml);

        // Manejar carga de imágenes
        const imageInput = modal.getElement("#image-upload");
        if (imageInput) {
            imageInput.addEventListener("change", async (e) => {
                const files = e.target.files;
                const preview = modal.getElement("#image-preview");

                for (const file of files) {
                    try {
                        const evidence = await evidenceModel.createFromFile(incidentId, file);
                        const img = document.createElement("img");
                        img.src = evidence.base64Data;
                        img.style.width = "100%";
                        img.style.borderRadius = "4px";
                        preview.appendChild(img);
                    } catch (error) {
                        incidentView.showToast(error.message, "error");
                    }
                }
            });
        }
    }

    /**
     * Crear incidente
     */
    async create(data) {
        try {
            incidentView.showLoading();

            const validation = ValidationUtils.validateForm(data, {
                pdvId: { required: true },
                descripcion: { required: true, minLength: 10 }
            });

            if (!validation.valid) {
                incidentView.showToast("Validación fallida", "error");
                incidentView.hideLoading();
                return;
            }

            const incident = await incidentModel.create({
                ...data,
                estado: ENUMS.INCIDENT_STATE.ABIERTO
            });

            eventBus.emit(EVENTS.INCIDENT_CREATED, incident);
            eventBus.emit(EVENTS.INCIDENT_LIST_CHANGED);

            incidentView.showToast("Incidente creado exitosamente", "success");
            await incidentView.render();
            incidentView.hideLoading();
        } catch (error) {
            logger.error("Error creando incidente:", error);
            incidentView.showToast(error.message || "Error al crear incidente", "error");
            incidentView.hideLoading();
        }
    }

    /**
     * Actualizar incidente
     */
    async update(incidentId, data) {
        try {
            incidentView.showLoading();

            const incident = await incidentModel.update(incidentId, data);

            eventBus.emit(EVENTS.INCIDENT_UPDATED, incident);
            eventBus.emit(EVENTS.INCIDENT_LIST_CHANGED);

            incidentView.showToast("Incidente actualizado exitosamente", "success");
            await incidentView.render();
            incidentView.hideLoading();
        } catch (error) {
            logger.error("Error actualizando incidente:", error);
            incidentView.showToast(error.message || "Error al actualizar", "error");
            incidentView.hideLoading();
        }
    }

    /**
     * Filtros
     */
    async handleFilterPDV(pdvId) {
        let incidents;
        if (pdvId) {
            incidents = await incidentModel.getByPDV(pdvId);
        } else {
            incidents = await incidentModel.getAll();
        }
        await incidentView.render(incidents);
    }

    async handleFilterState(state) {
        let incidents;
        if (!state) {
            incidents = await incidentModel.getAll();
        } else {
            incidents = await incidentModel.filter(i => i.estado === state);
        }
        await incidentView.render(incidents);
    }

    async handleFilterCriticality(criticality) {
        let incidents;
        if (!criticality) {
            incidents = await incidentModel.getAll();
        } else {
            incidents = await incidentModel.filter(i => i.criticidad === criticality);
        }
        await incidentView.render(incidents);
    }
}

const incidentController = new IncidentController();
