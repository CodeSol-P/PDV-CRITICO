/**
 * VisitaController.js
 * Controlador CRUD para visitas a Puntos de Venta
 */

class VisitaController {
    constructor() {
        this._setupEvents();
    }

    _setupEvents() {
        eventBus.on('visita:create', ()  => this.openCreateModal());
        eventBus.on('visita:edit',   (d) => this.openEditModal(d.id));
        eventBus.on('visita:delete', (d) => this.requestDelete(d.id));
        eventBus.on('visita:view',   (d) => this.openDetailModal(d.id));
    }

    // ── Campos del formulario ──────────────────────────────────────────────────

    _fields() {
        return [
            {
                name: 'nroCliente',
                label: 'Nro. Cliente',
                type: 'text',
                placeholder: 'Ej: 12345'
            },
            {
                name: 'nombrePDV',
                label: 'Nombre del PDV',
                type: 'text',
                required: true,
                placeholder: 'Ej: PDV Tucumán Centro'
            },
            {
                name: 'direccion',
                label: 'Dirección',
                type: 'text',
                placeholder: 'Ej: Av. Principal 123, Tucumán'
            },
            {
                name: 'fechaVisita',
                label: 'Fecha de Visita',
                type: 'date',
                required: true
            },
            {
                name: 'inconveniente',
                label: 'Inconveniente Ocurrido',
                type: 'textarea',
                placeholder: 'Describí el problema o inconveniente registrado...'
            },
            {
                name: 'soluciones',
                label: 'Soluciones',
                type: 'textarea',
                placeholder: 'Describí las acciones realizadas para resolver el inconveniente...'
            },
        ];
    }

    // ── Crear ──────────────────────────────────────────────────────────────────

    openCreateModal() {
        const modal = ModalView.openForm(
            'Nuevo Registro de Visita',
            this._fields(),
            async (data) => { await this.create(data); },
            'Guardar Registro'
        );

        // Fecha de hoy por defecto
        setTimeout(() => {
            const dateInput = modal.getElement('[name="fechaVisita"]');
            if (dateInput) {
                dateInput.value = new Date().toISOString().slice(0, 10);
            }
        }, 50);
    }

    async create(data) {
        try {
            visitaView.showLoading();
            const record = {
                ...data,
                fechaVisita: data.fechaVisita
                    ? new Date(data.fechaVisita).toISOString()
                    : new Date().toISOString()
            };
            await visitaModel.create(record);
            visitaView.showToast('Registro creado exitosamente', 'success');
            await visitaView.render();
        } catch (error) {
            logger.error('Error creando visita:', error);
            visitaView.showToast(error.message || 'Error al crear el registro', 'error');
        } finally {
            visitaView.hideLoading();
        }
    }

    // ── Editar ─────────────────────────────────────────────────────────────────

    async openEditModal(id) {
        const visita = await visitaModel.getById(id);
        if (!visita) {
            visitaView.showToast('Registro no encontrado', 'error');
            return;
        }

        const modal = ModalView.openForm(
            'Editar Registro',
            this._fields(),
            async (data) => {
                await this.update(id, data);
                modal.close();
            },
            'Guardar Cambios'
        );

        setTimeout(() => {
            const fechaStr = visita.fechaVisita
                ? new Date(visita.fechaVisita).toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10);

            const values = { ...visita, fechaVisita: fechaStr };
            Object.entries(values).forEach(([key, val]) => {
                const input = modal.getElement(`[name="${key}"]`);
                if (input) input.value = val || '';
            });
        }, 50);
    }

    async update(id, data) {
        try {
            visitaView.showLoading();
            const record = {
                ...data,
                fechaVisita: data.fechaVisita
                    ? new Date(data.fechaVisita).toISOString()
                    : new Date().toISOString()
            };
            await visitaModel.update(id, record);
            visitaView.showToast('Registro actualizado', 'success');
            await visitaView.render();
        } catch (error) {
            logger.error('Error actualizando visita:', error);
            visitaView.showToast(error.message || 'Error al actualizar', 'error');
        } finally {
            visitaView.hideLoading();
        }
    }

    // ── Ver detalle ────────────────────────────────────────────────────────────

    async openDetailModal(id) {
        const v = await visitaModel.getById(id);
        if (!v) {
            visitaView.showToast('Registro no encontrado', 'error');
            return;
        }

        const row = (label, value) => `
            <tr>
                <td style="font-weight:600; padding:10px 16px 10px 0; width:35%;
                           vertical-align:top; border-bottom:1px solid #f0f0f0;
                           color:#555; font-size:13px;">
                    ${label}
                </td>
                <td style="padding:10px 0; border-bottom:1px solid #f0f0f0;
                           font-size:13px; white-space:pre-wrap; word-break:break-word;">
                    ${this._esc(value) || '<span style="color:#bbb;">—</span>'}
                </td>
            </tr>
        `;

        const html = `
            <div style="padding: 24px;">
                <table style="width:100%; border-collapse:collapse;">
                    ${row('Nro. Cliente',           v.nroCliente)}
                    ${row('Nombre PDV',             v.nombrePDV)}
                    ${row('Dirección',              v.direccion)}
                    ${row('Fecha de Visita',        v.fechaVisita ? DateUtils.format(v.fechaVisita) : '')}
                    ${row('Inconveniente Ocurrido', v.inconveniente)}
                    ${row('Soluciones',             v.soluciones)}
                </table>
            </div>
        `;

        const modal = new ModalView({
            title:       `${v.nombrePDV || 'Detalle'} — ${v.fechaVisita ? DateUtils.format(v.fechaVisita) : ''}`,
            size:        '680px',
            closeButton: true,
            footer:      true,
            buttons: [
                {
                    text:      'Cerrar',
                    className: 'btn-outline',
                    onClick:   () => modal.close()
                }
            ]
        });
        modal.open(html);
    }

    // ── Eliminar ───────────────────────────────────────────────────────────────

    requestDelete(id) {
        ModalView.openConfirm(
            'Eliminar Registro',
            '¿Estás seguro de que querés eliminar este registro? Esta acción no se puede deshacer.',
            async () => {
                try {
                    await visitaModel.delete(id);
                    visitaView.showToast('Registro eliminado', 'success');
                    await visitaView.render();
                } catch (error) {
                    visitaView.showToast('Error al eliminar', 'error');
                }
            }
        );
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    _esc(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g,  '&amp;')
            .replace(/</g,  '&lt;')
            .replace(/>/g,  '&gt;')
            .replace(/"/g,  '&quot;');
    }
}

const visitaController = new VisitaController();
