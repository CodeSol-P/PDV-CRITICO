/**
 * IncidentView.js
 * Vista para gestión de Incidentes
 * Tabla, búsqueda, formulario modal, carga de imágenes
 */

class IncidentView extends BaseView {
    constructor() {
        super("incidents-view");
        this.incidents = [];
        this.currentIncident = null;
    }

    /**
     * Renderizar lista de incidentes
     */
    async render(incidents = null) {
        if (!incidents) {
            incidents = await incidentModel.getAll();
        }

        this.incidents = incidents;
        const container = this.getContainer();

        if (incidents.length === 0) {
            container.querySelector(".table-container").innerHTML = `
                <div class="text-center p-4">
                    <p class="text-muted">No hay incidentes registrados</p>
                </div>
            `;
            return;
        }

        const tableHtml = await this._buildTable(incidents);
        container.querySelector(".table-container").innerHTML = tableHtml;

        // Llenar selectos
        await this._fillFilters();
        this._attachListeners();
    }

    /**
     * Construir tabla de incidentes
     */
    async _buildTable(incidents) {
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>PDV</th>
                        <th>Fecha Detección</th>
                        <th>Descripción</th>
                        <th>Categoría</th>
                        <th>Criticidad</th>
                        <th>Estado</th>
                        <th>Responsable</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const incident of incidents) {
            const pdv = await pdvModel.getById(incident.pdvId);
            const criticalityClass = `criticality-${incident.criticidad.toLowerCase().replace(/á/g, "a")}`;
            const stateIcon = FormatUtils.getStateIcon(incident.estado);
            const stateColor = FormatUtils.getStateColor(incident.estado);

            html += `
                <tr>
                    <td><strong>${pdv?.codigo || "N/A"}</strong></td>
                    <td>${DateUtils.format(incident.fechaDeteccion)}</td>
                    <td>${FormatUtils.truncate(incident.descripcion, 40)}</td>
                    <td>${incident.categoria}</td>
                    <td><span class="${criticalityClass}">${incident.criticidad}</span></td>
                    <td>
                        <span class="badge" style="background-color: ${stateColor}; color: white;">
                            ${incident.estado}
                        </span>
                    </td>
                    <td>${incident.responsable || "-"}</td>
                    <td>
                        <button class="btn btn-sm btn-primary view-incident" data-id="${incident.id}">
                            <span class="material-icons">visibility</span>
                        </button>
                        <button class="btn btn-sm btn-secondary edit-incident" data-id="${incident.id}">
                            <span class="material-icons">edit</span>
                        </button>
                    </td>
                </tr>
            `;
        }

        html += `
                </tbody>
            </table>
        `;

        return html;
    }

    /**
     * Llenar filtros
     */
    async _fillFilters() {
        const pdvSelect = this.getContainer().querySelector("#incident-filter-pdv");
        const pdvs = await pdvModel.getAll();

        if (pdvSelect) {
            pdvSelect.innerHTML = '<option value="">Todos los PDV</option>';
            pdvs.forEach(pdv => {
                const option = document.createElement("option");
                option.value = pdv.id;
                option.textContent = pdv.nombre;
                pdvSelect.appendChild(option);
            });
        }
    }

    /**
     * Adjuntar listeners
     */
    _attachListeners() {
        const container = this.getContainer();

        container.querySelectorAll(".view-incident").forEach(btn => {
            this.addListener(btn, "click", (e) => {
                const id = e.target.closest("button").dataset.id;
                this._showIncidentDetails(id);
            });
        });

        container.querySelectorAll(".edit-incident").forEach(btn => {
            this.addListener(btn, "click", (e) => {
                const id = e.target.closest("button").dataset.id;
                eventBus.emit(EVENTS.INCIDENT_UPDATED, { incidentId: id });
            });
        });

        const btnAdd = container.querySelector("#btn-add-incident");
        if (btnAdd) {
            this.addListener(btnAdd, "click", () => {
                eventBus.emit("incident:create");
            });
        }

        const filterPDV = container.querySelector("#incident-filter-pdv");
        if (filterPDV) {
            this.addListener(filterPDV, "change", (e) => {
                eventBus.emit("incident:filter_pdv", { pdvId: e.target.value });
            });
        }

        const filterState = container.querySelector("#incident-filter-state");
        if (filterState) {
            this.addListener(filterState, "change", (e) => {
                eventBus.emit("incident:filter_state", { state: e.target.value });
            });
        }

        const filterCritical = container.querySelector("#incident-filter-criticality");
        if (filterCritical) {
            this.addListener(filterCritical, "change", (e) => {
                eventBus.emit("incident:filter_criticality", { criticality: e.target.value });
            });
        }
    }

    /**
     * Mostrar detalles del incidente con galería de imágenes
     */
    async _showIncidentDetails(incidentId) {
        try {
            const incident = await incidentModel.getById(incidentId);
            const pdv = await pdvModel.getById(incident.pdvId);
            const actions = await actionModel.getByIncident(incidentId);
            const evidences = await evidenceModel.getByIncidentOrdered(incidentId);

            let html = `
                <div style="padding: 20px;">
                    <h4>Información del Incidente</h4>
                    <table style="width: 100%; font-size: 13px; margin-bottom: 20px;">
                        <tr><td style="font-weight: bold; width: 30%;">PDV:</td><td>${pdv?.nombre}</td></tr>
                        <tr><td style="font-weight: bold;">Fecha Detección:</td><td>${DateUtils.format(incident.fechaDeteccion)}</td></tr>
                        <tr><td style="font-weight: bold;">Descripción:</td><td>${incident.descripcion}</td></tr>
                        <tr><td style="font-weight: bold;">Categoría:</td><td>${incident.categoria}</td></tr>
                        <tr><td style="font-weight: bold;">Criticidad:</td><td><span class="criticality-${incident.criticidad.toLowerCase()}">${incident.criticidad}</span></td></tr>
                        <tr><td style="font-weight: bold;">Estado:</td><td>${incident.estado}</td></tr>
                        <tr><td style="font-weight: bold;">Responsable:</td><td>${incident.responsable || "-"}</td></tr>
                    </table>

                    ${evidences.length > 0 ? `
                        <h4>Evidencias (${evidences.length})</h4>
                        <div class="image-gallery">
                            ${evidences.map(ev => `
                                <div class="image-item">
                                    <img src="${ev.base64Data}" alt="${ev.nombre}" style="cursor: pointer;">
                                    <div class="image-item-info" style="padding: 8px; background: #f5f5f5; font-size: 11px;">
                                        ${ev.descripcion || ev.nombre}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-muted">Sin evidencias</p>'}

                    ${actions.length > 0 ? `
                        <h4 style="margin-top: 20px;">Acciones Implementadas (${actions.length})</h4>
                        <ul style="font-size: 13px;">
                            ${actions.map(act => `
                                <li style="margin-bottom: 10px;">
                                    <strong>${act.descripcion}</strong> - ${act.resultado}
                                    <br><small style="color: #999;">${DateUtils.format(act.fechaImplementacion)} por ${act.responsable}</small>
                                </li>
                            `).join('')}
                        </ul>
                    ` : ''}
                </div>
            `;

            ModalView.openInfo(`Incidente del ${pdv?.nombre}`, html);
        } catch (error) {
            logger.error("Error mostrando detalles:", error);
            this.showToast("Error al cargar detalles", "error");
        }
    }
}

const incidentView = new IncidentView();
