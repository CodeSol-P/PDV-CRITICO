/**
 * VisitaView.js
 * Vista principal: tabla de visitas a Puntos de Venta
 */

class VisitaView extends BaseView {
    constructor() {
        super('visitas-view');
        this.visitas = [];
    }

    /**
     * Renderizar la tabla completa
     * @param {Array|null} visitas - si es null, carga todos los registros
     */
    async render(visitas = null) {
        // Limpiar listeners anteriores para evitar duplicados
        this.removeAllListeners();

        if (visitas === null) {
            visitas = await visitaModel.getAll();
        }
        this.visitas = visitas;

        // Actualizar contador
        const countEl = document.getElementById('record-count');
        if (countEl) {
            countEl.textContent = visitas.length > 0
                ? `${visitas.length} registro${visitas.length !== 1 ? 's' : ''}`
                : '';
        }

        const container = document.getElementById('visitas-list');
        if (!container) return;

        if (visitas.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:80px 20px; color:#aaa;">
                    <span class="material-icons" style="font-size:72px; display:block; margin-bottom:16px; color:#ddd;">store</span>
                    <p style="font-size:16px; margin-bottom:8px; color:#999;">No hay registros</p>
                    <p style="font-size:13px;">Importá desde Excel o agregá un nuevo registro con el botón <strong>+ Nuevo Registro</strong></p>
                </div>
            `;
            return;
        }

        let html = `
            <table>
                <thead>
                    <tr>
                        <th style="width:110px;">Nro. Cliente</th>
                        <th style="width:160px;">Nombre PDV</th>
                        <th style="width:170px;">Dirección</th>
                        <th>Inconveniente Ocurrido</th>
                        <th>Soluciones</th>
                        <th style="width:95px;">Fecha Visita</th>
                        <th style="width:105px; text-align:center;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const v of visitas) {
            const inconv = this._esc(v.inconveniente);
            const soluc  = this._esc(v.soluciones);

            html += `
                <tr>
                    <td><strong>${this._esc(v.nroCliente) || '-'}</strong></td>
                    <td>${this._esc(v.nombrePDV) || '-'}</td>
                    <td>${this._esc(v.direccion) || '-'}</td>
                    <td>
                        <span title="${inconv}" style="cursor:default;">
                            ${this._trunc(v.inconveniente, 65)}
                        </span>
                    </td>
                    <td>
                        <span title="${soluc}" style="cursor:default;">
                            ${this._trunc(v.soluciones, 65)}
                        </span>
                    </td>
                    <td style="white-space:nowrap; font-size:12px;">
                        ${v.fechaVisita ? DateUtils.format(v.fechaVisita) : '-'}
                    </td>
                    <td style="text-align:center; white-space:nowrap;">
                        ${v.imagenes && v.imagenes.length > 0
                            ? `<span title="${v.imagenes.length} imagen${v.imagenes.length > 1 ? 'es' : ''}"
                                    style="display:inline-flex; align-items:center; gap:2px;
                                           background:#E3F2FD; color:#1565C0; border-radius:10px;
                                           padding:2px 7px; font-size:11px; margin-right:4px; vertical-align:middle;">
                                <span class="material-icons" style="font-size:13px;">photo_camera</span>
                                ${v.imagenes.length}
                               </span>`
                            : ''}
                        <button class="btn btn-sm btn-primary btn-view" data-id="${v.id}" title="Ver detalle completo">
                            <span class="material-icons">visibility</span>
                        </button>
                        <button class="btn btn-sm btn-secondary btn-edit" data-id="${v.id}" title="Editar">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete" data-id="${v.id}" title="Eliminar">
                            <span class="material-icons">delete</span>
                        </button>
                    </td>
                </tr>
            `;
        }

        html += `</tbody></table>`;
        container.innerHTML = html;

        this._attachTableListeners(container);
    }

    _attachTableListeners(container) {
        container.querySelectorAll('.btn-view').forEach(btn => {
            this.addListener(btn, 'click', (e) => {
                eventBus.emit('visita:view', { id: e.target.closest('button').dataset.id });
            });
        });

        container.querySelectorAll('.btn-edit').forEach(btn => {
            this.addListener(btn, 'click', (e) => {
                eventBus.emit('visita:edit', { id: e.target.closest('button').dataset.id });
            });
        });

        container.querySelectorAll('.btn-delete').forEach(btn => {
            this.addListener(btn, 'click', (e) => {
                eventBus.emit('visita:delete', { id: e.target.closest('button').dataset.id });
            });
        });
    }

    // Escapa HTML para evitar XSS
    _esc(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Trunca texto largo con "…"
    _trunc(text, max) {
        if (!text) return '-';
        const s = String(text).trim();
        return s.length > max ? s.slice(0, max) + '…' : s;
    }
}

const visitaView = new VisitaView();
