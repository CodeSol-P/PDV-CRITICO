/**
 * PDVView.js
 * Vista jerárquica: PDV List → PDV Details + Incidents → Incident Details + Actions
 */

class PDVView extends BaseView {
    constructor() {
        super("pdv-view");
        this.pdvs = [];
        this.currentPDV = null;
        this.currentIncident = null;
    }

    /**
     * Renderizar lista inicial de PDV
     */
    async render(pdvs = null) {
        if (!pdvs) {
            pdvs = await pdvModel.getAll();
        }

        this.pdvs = pdvs;
        const container = this.getContainer().querySelector("#pdv-list-section");

        if (pdvs.length === 0) {
            container.innerHTML = `
                <div class="text-center p-4">
                    <p class="text-muted">No hay PDV registrados</p>
                </div>
            `;
            return;
        }

        const tableHtml = await this._buildPDVTable(pdvs);
        container.innerHTML = tableHtml;
        this._attachListenersToTable();
    }

    /**
     * Construir tabla de PDV
     */
    async _buildPDVTable(pdvs) {
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Dirección</th>
                        <th>Responsable</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const pdv of pdvs) {
            const stateColor = FormatUtils.getStateColor(pdv.estado);

            html += `
                <tr>
                    <td><strong>${pdv.codigo}</strong></td>
                    <td>${pdv.nombre}</td>
                    <td>${FormatUtils.truncate(pdv.direccion || "", 30)}</td>
                    <td>${pdv.responsable || "-"}</td>
                    <td>
                        <span class="badge" style="background-color: ${stateColor}; color: white;">
                            ${pdv.estado}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary view-pdv-detail" data-id="${pdv.id}">
                            <span class="material-icons">visibility</span>
                        </button>
                        <button class="btn btn-sm btn-secondary edit-pdv" data-id="${pdv.id}">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="btn btn-sm btn-danger delete-pdv" data-id="${pdv.id}">
                            <span class="material-icons">delete</span>
                        </button>
                    </td>
                </tr>
            `;
        }

        html += `</tbody></table>`;
        return html;
    }

    /**
     * Adjuntar listeners a tabla de PDV
     */
    _attachListenersToTable() {
        const container = this.getContainer();

        container.querySelectorAll(".view-pdv-detail").forEach(btn => {
            this.addListener(btn, "click", (e) => {
                const id = e.target.closest("button").dataset.id;
                this._showPDVDetail(id);
            });
        });

        container.querySelectorAll(".edit-pdv").forEach(btn => {
            this.addListener(btn, "click", (e) => {
                const id = e.target.closest("button").dataset.id;
                eventBus.emit("pdv:edit", { pdvId: id });
            });
        });

        container.querySelectorAll(".delete-pdv").forEach(btn => {
            this.addListener(btn, "click", (e) => {
                const id = e.target.closest("button").dataset.id;
                eventBus.emit("pdv:delete", { pdvId: id });
            });
        });

        // Búsqueda
        const searchInput = container.querySelector("#pdv-search");
        if (searchInput) {
            this.addListener(searchInput, "input", (e) => {
                eventBus.emit("pdv:search", { query: e.target.value });
            });
        }

        // Filtro por estado
        const filterState = container.querySelector("#pdv-filter-state");
        if (filterState) {
            this.addListener(filterState, "change", (e) => {
                eventBus.emit("pdv:filter_state", { state: e.target.value });
            });
        }
    }

    /**
     * Mostrar detalles de PDV con incidentes
     */
    async _showPDVDetail(pdvId) {
        const pdv = await pdvModel.getById(pdvId);
        if (!pdv) return;

        this.currentPDV = pdv;
        this.currentIncident = null;

        // Ocultar lista y mostrar detalle
        const container = this.getContainer();
        container.querySelector("#pdv-list-section").style.display = "none";
        container.querySelector("#incident-detail-section").style.display = "none";
        container.querySelector("#pdv-detail-section").style.display = "block";
        container.querySelector("#btn-back-pdv-list").style.display = "inline-block";

        // Llenar datos del PDV
        container.querySelector("#pdv-detail-name").textContent = pdv.nombre;
        container.querySelector("#pdv-detail-codigo").textContent = pdv.codigo;
        container.querySelector("#pdv-detail-direccion").textContent = pdv.direccion || "-";
        container.querySelector("#pdv-detail-responsable").textContent = pdv.responsable || "-";
        container.querySelector("#pdv-detail-email").textContent = pdv.email || "-";
        container.querySelector("#pdv-detail-telefono").textContent = pdv.telefono || "-";

        // Cargar incidentes de este PDV
        await this._renderIncidentsOfPDV(pdvId);

        // Setup listeners
        this._attachPDVDetailListeners();
    }

    /**
     * Renderizar incidentes de un PDV
     */
    async _renderIncidentsOfPDV(pdvId) {
        const incidents = await incidentModel.getByPDV(pdvId);
        const container = this.getContainer().querySelector("#incidents-of-pdv");

        if (incidents.length === 0) {
            container.innerHTML = `
                <div class="text-center p-4">
                    <p class="text-muted">No hay incidentes registrados para este PDV</p>
                </div>
            `;
            return;
        }

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Descripción</th>
                        <th>Categoría</th>
                        <th>Criticidad</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const incident of incidents) {
            const critColor = FormatUtils.getStateColor(incident.criticidad);
            const stateColor = FormatUtils.getStateColor(incident.estado);

            html += `
                <tr>
                    <td>${DateUtils.format(incident.fechaDeteccion)}</td>
                    <td>${FormatUtils.truncate(incident.descripcion, 40)}</td>
                    <td>${incident.categoria}</td>
                    <td>
                        <span class="badge" style="background-color: ${critColor}; color: white;">
                            ${incident.criticidad}
                        </span>
                    </td>
                    <td>
                        <span class="badge" style="background-color: ${stateColor}; color: white;">
                            ${incident.estado}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary view-incident-detail" data-id="${incident.id}">
                            <span class="material-icons">visibility</span>
                        </button>
                        <button class="btn btn-sm btn-secondary edit-incident" data-id="${incident.id}">
                            <span class="material-icons">edit</span>
                        </button>
                    </td>
                </tr>
            `;
        }

        html += `</tbody></table>`;
        container.innerHTML = html;

        // Listeners para incidentes
        container.querySelectorAll(".view-incident-detail").forEach(btn => {
            this.addListener(btn, "click", (e) => {
                const id = e.target.closest("button").dataset.id;
                this._showIncidentDetail(id);
            });
        });

        container.querySelectorAll(".edit-incident").forEach(btn => {
            this.addListener(btn, "click", (e) => {
                const id = e.target.closest("button").dataset.id;
                eventBus.emit("incident:edit", { incidentId: id });
            });
        });
    }

    /**
     * Mostrar detalles de incidente con acciones
     */
    async _showIncidentDetail(incidentId) {
        const incident = await incidentModel.getById(incidentId);
        if (!incident) return;

        this.currentIncident = incident;

        const container = this.getContainer();
        container.querySelector("#pdv-detail-section").style.display = "none";
        container.querySelector("#incident-detail-section").style.display = "block";

        // Llenar datos del incidente
        container.querySelector("#incident-detail-fecha").textContent = DateUtils.format(incident.fechaDeteccion);
        container.querySelector("#incident-detail-descripcion").textContent = incident.descripcion;
        container.querySelector("#incident-detail-categoria").textContent = incident.categoria;
        container.querySelector("#incident-detail-criticidad").innerHTML = `
            <span class="badge" style="background-color: ${FormatUtils.getStateColor(incident.criticidad)}; color: white;">
                ${incident.criticidad}
            </span>
        `;
        container.querySelector("#incident-detail-estado").innerHTML = `
            <span class="badge" style="background-color: ${FormatUtils.getStateColor(incident.estado)}; color: white;">
                ${incident.estado}
            </span>
        `;

        // Cargar evidencias
        await this._renderEvidences(incidentId);

        // Cargar acciones
        await this._renderActionsOfIncident(incidentId);

        // Setup listeners
        this._attachIncidentDetailListeners();
    }

    /**
     * Renderizar evidencias
     */
    async _renderEvidences(incidentId) {
        const evidences = await evidenceModel.getByIncidentOrdered(incidentId);
        const container = this.getContainer().querySelector("#incident-evidences");

        if (evidences.length === 0) {
            container.innerHTML = '<p class="text-muted">Sin evidencias</p>';
            return;
        }

        let html = '';
        for (const ev of evidences) {
            html += `
                <div class="image-item">
                    <img src="${ev.base64Data}" alt="${ev.nombre}" style="cursor: pointer;">
                    <div class="image-item-info" style="padding: 8px; background: #f5f5f5; font-size: 11px;">
                        ${ev.descripcion || ev.nombre}
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    /**
     * Renderizar acciones de un incidente
     */
    async _renderActionsOfIncident(incidentId) {
        const actions = await actionModel.getByIncident(incidentId);
        const container = this.getContainer().querySelector("#actions-of-incident");

        if (actions.length === 0) {
            container.innerHTML = `
                <div class="text-center p-4">
                    <p class="text-muted">No hay acciones registradas para este incidente</p>
                </div>
            `;
            return;
        }

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Descripción</th>
                        <th>Fecha</th>
                        <th>Responsable</th>
                        <th>Resultado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const action of actions) {
            const resultColor = FormatUtils.getStateColor(action.resultado);

            html += `
                <tr>
                    <td>${FormatUtils.truncate(action.descripcion, 40)}</td>
                    <td>${DateUtils.format(action.fechaImplementacion)}</td>
                    <td>${action.responsable || "-"}</td>
                    <td>
                        <span class="badge" style="background-color: ${resultColor}; color: white;">
                            ${action.resultado}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-secondary edit-action" data-id="${action.id}">
                            <span class="material-icons">edit</span>
                        </button>
                    </td>
                </tr>
            `;
        }

        html += `</tbody></table>`;
        container.innerHTML = html;

        // Listeners para acciones
        container.querySelectorAll(".edit-action").forEach(btn => {
            this.addListener(btn, "click", (e) => {
                const id = e.target.closest("button").dataset.id;
                eventBus.emit("action:edit", { actionId: id });
            });
        });
    }

    /**
     * Adjuntar listeners del detalle de PDV
     */
    _attachPDVDetailListeners() {
        const container = this.getContainer();

        const btnAddIncident = container.querySelector("#btn-add-incident");
        if (btnAddIncident) {
            this.addListener(btnAddIncident, "click", () => {
                eventBus.emit("incident:create", { pdvId: this.currentPDV.id });
            });
        }

        const btnBack = container.querySelector("#btn-back-pdv-list");
        if (btnBack) {
            this.addListener(btnBack, "click", () => {
                this._backToPDVList();
            });
        }
    }

    /**
     * Adjuntar listeners del detalle de incidente
     */
    _attachIncidentDetailListeners() {
        const container = this.getContainer();

        const btnAddAction = container.querySelector("#btn-add-action");
        if (btnAddAction) {
            this.addListener(btnAddAction, "click", () => {
                eventBus.emit("action:create", { incidentId: this.currentIncident.id });
            });
        }

        const btnBack = container.querySelector("#btn-back-pdv-list");
        if (btnBack) {
            this.addListener(btnBack, "click", () => {
                if (this.currentPDV) {
                    this._showPDVDetail(this.currentPDV.id);
                }
            });
        }
    }

    /**
     * Volver a la lista de PDV
     */
    _backToPDVList() {
        const container = this.getContainer();
        container.querySelector("#pdv-list-section").style.display = "block";
        container.querySelector("#pdv-detail-section").style.display = "none";
        container.querySelector("#incident-detail-section").style.display = "none";
        container.querySelector("#btn-back-pdv-list").style.display = "none";
        this.currentPDV = null;
        this.currentIncident = null;
    }
}

const pdvView = new PDVView();
