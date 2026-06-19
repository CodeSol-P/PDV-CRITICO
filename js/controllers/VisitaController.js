/**
 * VisitaController.js
 * CRUD de visitas a Puntos de Venta con soporte de imágenes.
 */

class VisitaController {
    constructor() {
        this._setupEvents();
    }

    _setupEvents() {
        eventBus.on('visita:create',   ()  => this.openCreateModal());
        eventBus.on('visita:edit',     (d) => this.openEditModal(d.id));
        eventBus.on('visita:view',     (d) => this.openDetailModal(d.id));
        eventBus.on('visita:lightbox', (d) => this._openLightbox(d.imagenes, d.startIdx || 0));
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

            <!-- Sección de ubicación -->
            <div class="form-group">
                <label>Ubicación en el mapa</label>
                <p style="font-size:12px; color:#888; margin:-4px 0 10px;">
                    Hacé clic en el mapa para marcar la ubicación exacta del PDV, o ingresá las coordenadas manualmente.
                </p>
                <div id="mini-mapa-picker" style="height:220px; border-radius:8px; border:1.5px solid #ddd; overflow:hidden; margin-bottom:10px;"></div>
                <div style="display:flex; gap:10px;">
                    <div style="flex:1;">
                        <label style="font-size:12px; color:#666; margin-bottom:4px; display:block;">Latitud</label>
                        <input type="number" name="latitud" step="0.000001"
                               value="${v.latitud || ''}"
                               placeholder="-26.808300"
                               style="font-size:13px;">
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:12px; color:#666; margin-bottom:4px; display:block;">Longitud</label>
                        <input type="number" name="longitud" step="0.000001"
                               value="${v.longitud || ''}"
                               placeholder="-65.217600"
                               style="font-size:13px;">
                    </div>
                    <div style="display:flex; align-items:flex-end; padding-bottom:2px;">
                        <button type="button" id="btn-clear-coords" class="btn btn-sm btn-outline"
                                title="Limpiar coordenadas" style="white-space:nowrap;">
                            <span class="material-icons" style="font-size:16px;">clear</span>
                        </button>
                    </div>
                </div>
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
        getImages = this._setupImageUpload(modal, []);
        this._setupMiniMap(modal, null, null);
    }

    async create(data) {
        try {
            visitaView.showLoading();
            const record = {
                ...data,
                imagenes:    data.imagenes || [],
                fechaVisita: data.fechaVisita
                    ? new Date(data.fechaVisita).toISOString()
                    : new Date().toISOString(),
                latitud:  data.latitud  ? parseFloat(data.latitud)  : null,
                longitud: data.longitud ? parseFloat(data.longitud) : null,
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
        this._setupMiniMap(modal, visita.latitud || null, visita.longitud || null);
    }

    async update(id, data) {
        try {
            visitaView.showLoading();
            const record = {
                ...data,
                imagenes:    data.imagenes || [],
                fechaVisita: data.fechaVisita
                    ? new Date(data.fechaVisita).toISOString()
                    : new Date().toISOString(),
                latitud:  data.latitud  ? parseFloat(data.latitud)  : null,
                longitud: data.longitud ? parseFloat(data.longitud) : null,
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

    // ── Mini mapa selector de coordenadas ─────────────────────────────────────

    _setupMiniMap(modal, initLat, initLon) {
        if (typeof L === 'undefined') return;

        const el = modal.getElement('#mini-mapa-picker');
        if (!el) return;

        const center = (initLat && initLon) ? [initLat, initLon] : [-26.8083, -65.2176];
        const zoom   = (initLat && initLon) ? 16 : 13;

        const miniMap = L.map('mini-mapa-picker', { zoomControl: true }).setView(center, zoom);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap © CARTO',
            maxZoom: 19
        }).addTo(miniMap);

        const latInput = modal.getElement('[name="latitud"]');
        const lonInput = modal.getElement('[name="longitud"]');
        let marker     = null;

        const setMarker = (lat, lon) => {
            if (marker) miniMap.removeLayer(marker);
            marker = L.circleMarker([lat, lon], {
                radius: 10, fillColor: '#1976D2', color: '#fff',
                weight: 2.5, fillOpacity: 0.95
            }).addTo(miniMap);
            if (latInput) latInput.value = lat.toFixed(6);
            if (lonInput) lonInput.value = lon.toFixed(6);
        };

        if (initLat && initLon) setMarker(initLat, initLon);

        miniMap.on('click', e => {
            setMarker(e.latlng.lat, e.latlng.lng);
            miniMap.setView([e.latlng.lat, e.latlng.lng]);
        });

        const updateFromInputs = () => {
            const lat = parseFloat(latInput && latInput.value);
            const lon = parseFloat(lonInput && lonInput.value);
            if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
                setMarker(lat, lon);
                miniMap.setView([lat, lon], Math.max(miniMap.getZoom(), 15));
            }
        };

        if (latInput) latInput.addEventListener('blur', updateFromInputs);
        if (lonInput) lonInput.addEventListener('blur', updateFromInputs);

        const clearBtn = modal.getElement('#btn-clear-coords');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (latInput) latInput.value = '';
                if (lonInput) lonInput.value = '';
                if (marker)  { miniMap.removeLayer(marker); marker = null; }
            });
        }

        setTimeout(() => miniMap.invalidateSize(), 250);
    }

    // ── Carga de imágenes ──────────────────────────────────────────────────────

    _setupImageUpload(modal, initialImages = []) {
        let images = [...initialImages];

        const render = () => {
            const grid = modal.getElement('#img-preview-grid');
            if (!grid) return;

            grid.innerHTML = images.map((b64, i) => `
                <div style="position:relative; display:inline-block;">
                    <img src="${b64}" style="
                        width:90px; height:90px; object-fit:cover;
                        border-radius:6px; border:2px solid #ddd; display:block;
                        cursor:zoom-in;"
                        title="Clic para ampliar">
                    <button type="button" data-idx="${i}" class="img-del-btn" style="
                        position:absolute; top:-8px; right:-8px;
                        background:#E53935; color:#fff; border:none;
                        border-radius:50%; width:22px; height:22px;
                        cursor:pointer; font-size:15px; line-height:22px;
                        text-align:center; padding:0; font-weight:bold;">×</button>
                </div>
            `).join('');

            // Ver imagen completa
            grid.querySelectorAll('img[title="Clic para ampliar"]').forEach((img, i) => {
                img.addEventListener('click', () => this._openLightbox(images, i));
            });

            grid.querySelectorAll('.img-del-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    images.splice(parseInt(btn.dataset.idx), 1);
                    render();
                });
            });
        };

        render();

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
                fileInput.value = '';
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

    // ── Panel de detalle moderno ───────────────────────────────────────────────

    async openDetailModal(id) {
        // Cerrar detalle previo si existe
        const existing = document.getElementById('pdv-detail-overlay');
        if (existing) { existing.remove(); document.body.style.overflow = ''; }

        const v = await visitaModel.getById(id);
        if (!v) { visitaView.showToast('Registro no encontrado', 'error'); return; }

        const imagenes  = Array.isArray(v.imagenes) ? v.imagenes : [];
        let currentImg  = 0;

        const overlay = document.createElement('div');
        overlay.id        = 'pdv-detail-overlay';
        overlay.className = 'pdv-detail-overlay';
        overlay.innerHTML = this._buildDetailHTML(v, imagenes);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        requestAnimationFrame(() => overlay.classList.add('visible'));

        // ── Cerrar ──────────────────────────────────────────────────────────────
        const close = () => {
            overlay.classList.remove('visible');
            setTimeout(() => {
                if (overlay.parentNode) overlay.remove();
                document.body.style.overflow = '';
            }, 280);
            document.removeEventListener('keydown', onKey);
        };

        overlay.querySelector('#pdv-det-close').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

        const onKey = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);

        // ── Carrusel ────────────────────────────────────────────────────────────
        if (imagenes.length > 1) {
            const mainImg = overlay.querySelector('#pdv-main-img');
            const counter = overlay.querySelector('#pdv-img-counter');
            const thumbs  = overlay.querySelectorAll('.pdv-thumb');

            const updateCarousel = () => {
                if (mainImg) mainImg.src = imagenes[currentImg];
                if (counter) counter.textContent = `${currentImg + 1} / ${imagenes.length}`;
                thumbs.forEach((t, i) => t.classList.toggle('active', i === currentImg));
            };

            const prev = overlay.querySelector('#pdv-img-prev');
            const next = overlay.querySelector('#pdv-img-next');

            if (prev) prev.addEventListener('click', e => {
                e.stopPropagation();
                currentImg = (currentImg - 1 + imagenes.length) % imagenes.length;
                updateCarousel();
            });

            if (next) next.addEventListener('click', e => {
                e.stopPropagation();
                currentImg = (currentImg + 1) % imagenes.length;
                updateCarousel();
            });

            thumbs.forEach((t, i) => t.addEventListener('click', e => {
                e.stopPropagation();
                currentImg = i;
                updateCarousel();
            }));
        }

        // ── Lightbox al hacer clic en imagen principal ───────────────────────
        if (imagenes.length > 0) {
            const mainImg = overlay.querySelector('#pdv-main-img');
            if (mainImg) mainImg.addEventListener('click', e => {
                e.stopPropagation();
                this._openLightbox(imagenes, currentImg);
            });
        }

        // ── Editar ───────────────────────────────────────────────────────────
        const editBtn = overlay.querySelector('#pdv-det-edit');
        if (editBtn) editBtn.addEventListener('click', () => {
            close();
            setTimeout(() => {
                authService.requireAuth('Editar Registro', () => {
                    eventBus.emit('visita:edit', { id });
                });
            }, 100);
        });

    }

    _buildDetailHTML(v, imagenes) {
        const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const d     = v.fechaVisita ? new Date(v.fechaVisita) : null;
        const fecha = d && !isNaN(d)
            ? `${d.getDate().toString().padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`
            : null;
        const esCerrado = v.estado === 'cerrado';

        // — Galería —
        let galleryHTML = '';
        if (imagenes.length > 0) {
            const navHTML = imagenes.length > 1 ? `
                <button class="pdv-gallery-nav pdv-gallery-prev" id="pdv-img-prev" title="Anterior">
                    <span class="material-icons">chevron_left</span>
                </button>
                <button class="pdv-gallery-nav pdv-gallery-next" id="pdv-img-next" title="Siguiente">
                    <span class="material-icons">chevron_right</span>
                </button>
                <div class="pdv-gallery-counter" id="pdv-img-counter">1 / ${imagenes.length}</div>` : '';

            const thumbsHTML = imagenes.length > 1 ? `
                <div class="pdv-gallery-thumbs">
                    ${imagenes.map((img, i) => `
                        <img src="${img}"
                             class="pdv-thumb${i === 0 ? ' active' : ''}"
                             data-idx="${i}"
                             title="Imagen ${i + 1}" />`).join('')}
                </div>` : '';

            galleryHTML = `
                <div class="pdv-detail-gallery">
                    <div class="pdv-gallery-main">
                        <img id="pdv-main-img" class="pdv-gallery-img"
                             src="${imagenes[0]}" title="Clic para ampliar" />
                        ${navHTML}
                    </div>
                    ${thumbsHTML}
                </div>`;
        } else {
            galleryHTML = `
                <div class="pdv-detail-gallery pdv-detail-gallery--empty">
                    <span class="material-icons">store</span>
                    <p>Sin imágenes cargadas</p>
                </div>`;
        }

        return `
        <div class="pdv-detail-panel">

            <button class="pdv-detail-close" id="pdv-det-close" title="Cerrar (Esc)">
                <span class="material-icons">close</span>
            </button>

            ${galleryHTML}

            <div class="pdv-detail-content">

                <div class="pdv-detail-top">
                    <div class="pdv-detail-titulo">
                        <h2 class="pdv-detail-nombre">${this._esc(v.nombrePDV) || '—'}</h2>
                        ${fecha ? `<span class="pdv-detail-fecha">${fecha}</span>` : ''}
                    </div>
                    <span class="estado-badge estado-badge--${v.estado || 'en_progreso'}">
                        ${esCerrado ? 'Cerrado' : 'En progreso'}
                    </span>
                </div>

                ${v.nroCliente ? `
                <div class="pdv-detail-codigo">
                    <span class="material-icons">tag</span>
                    Cliente #${this._esc(v.nroCliente)}
                </div>` : ''}

                ${v.direccion ? `
                <div class="pdv-detail-direccion">
                    <span class="material-icons">place</span>
                    ${this._esc(v.direccion)}
                </div>` : ''}

                ${v.inconveniente ? `
                <div class="pdv-detail-section">
                    <h4 class="pdv-detail-section-title">
                        <span class="material-icons">warning_amber</span>
                        Inconveniente Ocurrido
                    </h4>
                    <p class="pdv-detail-section-text">${this._esc(v.inconveniente)}</p>
                </div>` : ''}

                ${v.soluciones ? `
                <div class="pdv-detail-section">
                    <h4 class="pdv-detail-section-title">
                        <span class="material-icons">build_circle</span>
                        Acciones Realizadas
                    </h4>
                    <p class="pdv-detail-section-text">${this._esc(v.soluciones)}</p>
                </div>` : ''}

                <div class="pdv-detail-footer-btns">
                    <button class="btn btn-sm btn-outline" id="pdv-det-edit">
                        <span class="material-icons">edit</span> Editar
                    </button>
                </div>

            </div>
        </div>`;
    }

    // ── Lightbox de imagen completa ────────────────────────────────────────────

    _openLightbox(imagenes, startIdx = 0) {
        const existing = document.getElementById('pdv-lightbox');
        if (existing) existing.remove();

        let idx          = Math.max(0, Math.min(startIdx, imagenes.length - 1));
        const hasMulti   = imagenes.length > 1;

        const lb = document.createElement('div');
        lb.id        = 'pdv-lightbox';
        lb.className = 'pdv-lightbox';
        lb.innerHTML = `
            <button class="pdv-lb-close" id="pdv-lb-close" title="Cerrar (Esc)">
                <span class="material-icons">close</span>
            </button>
            ${hasMulti ? `
            <button class="pdv-lb-nav pdv-lb-prev" id="pdv-lb-prev" title="Anterior (←)">
                <span class="material-icons">chevron_left</span>
            </button>` : ''}
            <div class="pdv-lb-img-wrap">
                <img id="pdv-lb-img" class="pdv-lb-img" src="${imagenes[idx]}" />
            </div>
            ${hasMulti ? `
            <button class="pdv-lb-nav pdv-lb-next" id="pdv-lb-next" title="Siguiente (→)">
                <span class="material-icons">chevron_right</span>
            </button>
            <div class="pdv-lb-counter" id="pdv-lb-counter">${idx + 1} / ${imagenes.length}</div>` : ''}
        `;

        document.body.appendChild(lb);
        requestAnimationFrame(() => lb.classList.add('visible'));

        const img     = lb.querySelector('#pdv-lb-img');
        const counter = lb.querySelector('#pdv-lb-counter');

        const updateLb = () => {
            img.src = imagenes[idx];
            if (counter) counter.textContent = `${idx + 1} / ${imagenes.length}`;
        };

        const closeLb = () => {
            lb.classList.remove('visible');
            setTimeout(() => { if (lb.parentNode) lb.remove(); }, 250);
            document.removeEventListener('keydown', onLbKey);
        };

        lb.querySelector('#pdv-lb-close').addEventListener('click', closeLb);
        lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });

        const prevBtn = lb.querySelector('#pdv-lb-prev');
        const nextBtn = lb.querySelector('#pdv-lb-next');

        if (prevBtn) prevBtn.addEventListener('click', e => {
            e.stopPropagation();
            idx = (idx - 1 + imagenes.length) % imagenes.length;
            updateLb();
        });

        if (nextBtn) nextBtn.addEventListener('click', e => {
            e.stopPropagation();
            idx = (idx + 1) % imagenes.length;
            updateLb();
        });

        const onLbKey = (e) => {
            if (e.key === 'Escape')      closeLb();
            if (e.key === 'ArrowLeft'  && hasMulti) { idx = (idx - 1 + imagenes.length) % imagenes.length; updateLb(); }
            if (e.key === 'ArrowRight' && hasMulti) { idx = (idx + 1) % imagenes.length; updateLb(); }
        };
        document.addEventListener('keydown', onLbKey);
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
            .replace(/&/g,  '&amp;')
            .replace(/</g,  '&lt;')
            .replace(/>/g,  '&gt;')
            .replace(/"/g,  '&quot;');
    }
}

const visitaController = new VisitaController();
