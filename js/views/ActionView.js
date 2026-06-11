/**
 * ActionView.js
 * Vista para Acciones Implementadas
 */

class ActionView extends BaseView {
    constructor() {
        super("actions-view");
        this.actions = [];
    }

    async render(actions = null) {
        if (!actions) {
            actions = await actionModel.getAll();
        }

        this.actions = actions;
        const container = this.getContainer();

        if (actions.length === 0) {
            container.querySelector(".table-container").innerHTML = `
                <div class="text-center p-4">
                    <p class="text-muted">No hay acciones registradas</p>
                </div>
            `;
            return;
        }

        const tableHtml = await this._buildTable(actions);
        container.querySelector(".table-container").innerHTML = tableHtml;
        await this._fillFilters();
        this._attachListeners();
    }

    async _buildTable(actions) {
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Incidente</th>
                        <th>Descripción</th>
                        <th>Fecha Implementación</th>
                        <th>Responsable</th>
                        <th>Resultado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const action of actions) {
            const incident = await incidentModel.getById(action.incidenteId);
            const resultColor = FormatUtils.getStateColor(action.resultado);

            html += `
                <tr>
                    <td><strong>${incident?.id.substring(0, 8) || "N/A"}</strong></td>
                    <td>${FormatUtils.truncate(action.descripcion, 35)}</td>
                    <td>${DateUtils.format(action.fechaImplementacion)}</td>
                    <td>${action.responsable || "-"}</td>
                    <td>
                        <span class="badge" style="background-color: ${resultColor}; color: white;">
                            ${action.resultado}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary view-action" data-id="${action.id}">
                            <span class="material-icons">visibility</span>
                        </button>
                        <button class="btn btn-sm btn-secondary edit-action" data-id="${action.id}">
                            <span class="material-icons">edit</span>
                        </button>
                    </td>
                </tr>
            `;
        }

        html += `</tbody></table>`;
        return html;
    }

    async _fillFilters() {
        const incidentSelect = this.getContainer().querySelector("#action-filter-incident");
        const incidents = await incidentModel.getAll();

        if (incidentSelect) {
            incidentSelect.innerHTML = '<option value="">Todos los incidentes</option>';
            incidents.forEach(inc => {
                const option = document.createElement("option");
                option.value = inc.id;
                option.textContent = `${inc.descripcion.substring(0, 30)}...`;
                incidentSelect.appendChild(option);
            });
        }
    }

    _attachListeners() {
        const container = this.getContainer();

        container.querySelectorAll(".view-action").forEach(btn => {
            this.addListener(btn, "click", (e) => {
                const id = e.target.closest("button").dataset.id;
                this._showDetails(id);
            });
        });

        container.querySelectorAll(".edit-action").forEach(btn => {
            this.addListener(btn, "click", (e) => {
                const id = e.target.closest("button").dataset.id;
                eventBus.emit("action:edit", { actionId: id });
            });
        });

        const btnAdd = container.querySelector("#btn-add-action");
        if (btnAdd) {
            this.addListener(btnAdd, "click", () => {
                eventBus.emit("action:create");
            });
        }
    }

    async _showDetails(actionId) {
        const action = await actionModel.getById(actionId);
        const incident = await incidentModel.getById(action.incidenteId);

        const html = `
            <div style="padding: 20px;">
                <table style="width: 100%; font-size: 13px;">
                    <tr><td style="font-weight: bold; width: 30%;">Incidente:</td><td>${incident?.descripcion}</td></tr>
                    <tr><td style="font-weight: bold;">Acción:</td><td>${action.descripcion}</td></tr>
                    <tr><td style="font-weight: bold;">Fecha:</td><td>${DateUtils.format(action.fechaImplementacion)}</td></tr>
                    <tr><td style="font-weight: bold;">Responsable:</td><td>${action.responsable || "-"}</td></tr>
                    <tr><td style="font-weight: bold;">Resultado:</td><td>${action.resultado}</td></tr>
                    <tr><td style="font-weight: bold;">Observaciones:</td><td>${action.observaciones || "-"}</td></tr>
                </table>
            </div>
        `;

        ModalView.openInfo("Detalles de Acción", html);
    }
}

const actionView = new ActionView();
