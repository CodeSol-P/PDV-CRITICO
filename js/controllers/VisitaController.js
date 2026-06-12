/**
 * VisitaController.js
 * CRUD de visitas a Puntos de Venta con soporte de imágenes.
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

    // ── HTML del formulario ────────────────────────────────────────────────────

    _buildFormHTML(v = {}) {
        const today    = new Date().toISOString().slice(0, 10);
        const fechaISO = v.fechaVisita
            ? new Date(v.fechaVisita).toISOString().slice(0, 10)
            : today;

        return `
        <form id="visita-form" class="modal-form" style="padding:16px 0;">

            <div class="form-group">
                <label>Nro. Cliente</label>
                <input type="text" name="nroCliente"
                       value="${this._esc(v.nroCliente || '')}"
                       placeholder="Ej: 12345">
            </div>

            <div class="form-group required">
                <label>Nombre del PDV</label>
                <input type="text" name="nombrePDV" required
                       value="${this._esc(v.nombrePDV || '')}"
                       placeholder="Ej: PDV Tucumán Centro">
            </div>

            <div class="form-group">
                <label>Dirección</label>
                <input type="text" name="direccion"
                       value="${this._esc(v.direccion || '')}"
                       placeholder="Ej: Av. Principal 123, Tucumán">
            </div>

            <div class="form-group required">
                <label>Fecha de Visita</label>
                <input type="date" name="fechaVisita" required value="${fechaISO}">
            </div>

            <div class="form-group">
                <label>Inconveniente Ocurrido</label>
                <textarea name="inconveniente" rows="3"
                    placeholder="Describí el problema o inconveniente...">${this._esc(v.inconveniente || '')}</textarea>
            </div>

            <div class="form-group">
                <label>Soluciones</label>
                <textarea name="soluciones" rows="3"
                    placeholder="Describí las acciones realizadas para resolver...">${this._esc(v.soluciones || '')}</textarea>
            </div>

            <div class="form-group required">
                <label>Estado de la Acción</label>
                <select name="estado">
                    <option value="en_progreso" ${(!v.estado || v.estado === 'en_progreso') ? 'selected' : ''}>En progreso</option>
                    <option value="cerrado" ${v.estado === 'cerrado' ? 'selected' : ''}>Cerrado</option>
                </select>
            </div>

            <!-- Sección de imágenes -->
            <div class="form-group">
                <label>Imágenes</label>
                <label id="img-dropzone" style="
                    display:flex; align-items:center; justify-content:center;
                    gap:8px; border:2px dashed #1976D2; border-radius:8px;
                    padding:16px; background:#E3F2FD; cursor:pointer;
                    color:#1565C0; font-size:14px; margin-bottom:10px;">
                    <input type="file" id="img-file-input"
                           accept="image/*" multiple style="display:none;">
                    <span class="material-icons">add_photo_alternate</span>
                    Tocá para agregar imágenes (PNG, JPG…)
                </label>
                <div id="img-preview-grid"
                     style="display:flex; flex-wrap:wrap; gap:10px;"></div>
            </div>

        </form>`;
    }

    // ── Crear ──────────────────────────────────────────────────────────────────

    openCreateModal() {
        let getImages = () => [];

        const modal = new ModalView({
            title:       'Nuevo Registro de Visita',
            size:        '640px',
            closeButton: true,
            footer:      true,
            buttons: [
                {
                    text:      'Cancelar',
                    className: 'btn-outline',
                    onClick:   () => modal.close()
                },
                {
                    text:      'Guardar Registro',
                    className: 'btn-primary',
                    onClick:   () => {
                        const form = modal.getElement('#visita-form');
                        if (!form.checkValidity()) { form.reportValidity(); return; }

                        const data = Object.fromEntries(new FormData(form));
                        data.imagenes = getImages();
                        modal.close();
                        this.create(data);
                    }
                }
            ]
        });

        modal.open(this._buildFormHTML());
        // Inicializar upload DESPUÉS de abrir (DOM listo)
        getImages = this._setupImageUpload(modal, []);
    }

    async create(data) {
        try {
            visitaView.showLoading();
            const record = {
                ...data,
                imagenes:   data.imagenes || [],
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
        if (!visita) { visitaView.showToast('Registro no encontrado', 'error'); return; }

        let getImages = () => [];

        const modal = new ModalView({
            title:       'Editar Registro',
            size:        '640px',
            closeButton: true,
            footer:      true,
            buttons: [
                {
                    text:      'Cancelar',
                    className: 'btn-outline',
                    onClick:   () => modal.close()
                },
                {
                    text:      'Guardar Cambios',
                    className: 'btn-primary',
                    onClick:   () => {
                        const form = modal.getElement('#visita-form');
                        if (!form.checkValidity()) { form.reportValidity(); return; }

                        const data = Object.fromEntries(new FormData(form));
                        data.imagenes = getImages();
                        modal.close();
                        this.update(id, data);
                    }
                }
            ]
        });

        modal.open(this._buildFormHTML(visita));
        getImages = this._setupImageUpload(modal, visita.imagenes || []);
    }

    async update(id, data) {
        try {
            visitaView.showLoading();
            const record = {
                ...data,
                imagenes:   data.imagenes || [],
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

    // ── Carga de imágenes ──────────────────────────────────────────────────────

    /**
     * Inicializa el upload de imágenes en el modal.
     * Retorna una función getImages() que devuelve el array de base64 actuales.
     */
    _setupImageUpload(modal, initialImages = []) {
        let images = [...initialImages];

        const render = () => {
            const grid = modal.getElement('#img-preview-grid');
            if (!grid) return;

            grid.innerHTML = images.map((b64, i) => `
                <div style="position:relative; display:inline-block;">
                    <img src="${b64}" style="
                        width:90px; height:90px; object-fit:cover;
                        border-radius:6px; border:2px solid #ddd; display:block;">
                    <button type="button" data-idx="${i}" class="img-del-btn" style="
                        position:absolute; top:-8px; right:-8px;
                        background:#E53935; color:#fff; border:none;
                        border-radius:50%; width:22px; height:22px;
                        cursor:pointer; font-size:15px; line-height:22px;
                        text-align:center; padding:0; font-weight:bold;">×</button>
                </div>
            `).join('');

            grid.querySelectorAll('.img-del-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    images.splice(parseInt(btn.dataset.idx), 1);
                    render();
                });
            });
        };

        render(); // Mostrar imágenes existentes (edición)

        const fileInput = modal.getElement('#img-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                for (const file of Array.from(e.target.files)) {
                    if (!file.type.startsWith('image/')) continue;
                    try {
                        const b64 = await this._toBase64(file);
                        images.push(b64);
                    } catch (err) {
                        logger.warn('Error procesando imagen:', err);
                        visitaView.showToast(`No se pudo cargar "${file.name}"`, 'warning');
                    }
                }
                render();
                fileInput.value = ''; // Permite volver a seleccionar el mismo archivo
            });
        }

        return () => images;
    }

    _toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = (e) => resolve(e.target.result);
            reader.onerror = ()  => reject(new Error(`Error leyendo ${file.name}`));
            reader.readAsDataURL(file);
        });
    }

    // ── Ver detalle ────────────────────────────────────────────────────────────

    async openDetailModal(id) {
        const v = await visitaModel.getById(id);
        if (!v) { visitaView.showToast('Registro no encontrado', 'error'); return; }

        const fila = (label, value) => `
            <tr>
                <td style="font-weight:600; padding:10px 16px 10px 0; width:35%;
                           vertical-align:top; border-bottom:1px solid #f0f0f0;
                           color:#555; font-size:13px;">${label}</td>
                <td style="padding:10px 0; border-bottom:1px solid #f0f0f0;
                           font-size:13px; white-space:pre-wrap; word-break:break-word;">
                    ${this._esc(value) || '<span style="color:#ccc;">—</span>'}
                </td>
            </tr>`;

        const galeriaHTML = (v.imagenes && v.imagenes.length > 0) ? `
            <div style="margin-top:20px;">
                <p style="font-weight:600; font-size:13px; color:#555; margin-bottom:10px;">
                    Imágenes adjuntas (${v.imagenes.length})
                </p>
                <div style="display:flex; flex-wrap:wrap; gap:10px;">
                    ${v.imagenes.map((b64, i) => `
                        <a href="${b64}" target="_blank" title="Ver imagen ${i + 1}">
                            <img src="${b64}" style="
                                width:120px; height:120px; object-fit:cover;
                                border-radius:8px; border:2px solid #ddd;
                                cursor:zoom-in; transition:transform .15s;"
                                onmouseover="this.style.transform='scale(1.06)'"
                                onmouseout="this.style.transform='scale(1)'">
                        </a>`).join('')}
                </div>
            </div>` : '';

        const html = `
            <div style="padding:24px;">
                <table style="width:100%; border-collapse:collapse;">
                    ${fila('Nro. Cliente',           v.nroCliente)}
                    ${fila('Nombre PDV',             v.nombrePDV)}
                    ${fila('Dirección',              v.direccion)}
                    ${fila('Fecha de Visita',        v.fechaVisita ? DateUtils.format(v.fechaVisita) : '')}
                    ${fila('Inconveniente Ocurrido', v.inconveniente)}
                    ${fila('Soluciones',             v.soluciones)}
                    ${fila('Estado',                 v.estado === 'cerrado' ? 'Cerrado' : 'En progreso')}
                </table>
                ${galeriaHTML}
            </div>`;

        const modal = new ModalView({
            title:       `${this._esc(v.nombrePDV) || 'Detalle'} — ${v.fechaVisita ? DateUtils.format(v.fechaVisita) : ''}`,
            size:        '700px',
            closeButton: true,
            footer:      true,
            buttons: [{
                text: 'Cerrar', className: 'btn-outline', onClick: () => modal.close()
            }]
        });
        modal.open(html);
    }

    // ── Eliminar ───────────────────────────────────────────────────────────────

    requestDelete(id) {
        ModalView.openConfirm(
            'Eliminar Registro',
            '¿Estás seguro de que querés eliminar este registro? No se puede deshacer.',
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

    // ── Helper ─────────────────────────────────────────────────────────────────

    _esc(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

const visitaController = new VisitaController();
