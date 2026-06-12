/**
 * VisitaView.js
 * Vista de registros PDV en formato de tarjetas tipo publicación.
 * Cada tarjeta muestra imagen, nombre, código, dirección e inconveniente,
 * con una sección expandible para ver el resto de la información.
 */

class VisitaView extends BaseView {
    constructor() {
        super('visitas-view');
        this.visitas = [];
    }

    // ── Renderizado principal ──────────────────────────────────────────────────

    async render(visitas = null) {
        this.removeAllListeners();

        if (visitas === null) {
            visitas = await visitaModel.getAll();
        }
        this.visitas = visitas;

        // Contador en toolbar
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
                <div style="text-align:center; padding:80px 20px;">
                    <span class="material-icons"
                          style="font-size:72px; display:block; margin-bottom:16px; color:#ddd;">
                        store
                    </span>
                    <p style="font-size:16px; color:#999; margin-bottom:8px;">No hay registros</p>
                    <p style="font-size:13px; color:#bbb;">
                        Importá desde Excel o usá <strong>+ Nuevo Registro</strong>
                    </p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="pdv-card-grid">
                ${visitas.map(v => this._buildCard(v)).join('')}
            </div>`;

        this._attachCardListeners(container);
    }

    // ── Construcción de tarjeta ────────────────────────────────────────────────

    _buildCard(v) {
        const imagenes      = Array.isArray(v.imagenes) ? v.imagenes : [];
        const hasImg        = imagenes.length > 0;
        const inconvFull    = v.inconveniente || '';
        const inconvPreview = this._trunc(inconvFull, 120);

        // ¿Hay algo para expandir?
        const needsToggle = inconvFull.length > 120 || !!v.soluciones || imagenes.length > 1;

        // — Sección imagen —
        const imageHTML = hasImg
            ? `<div class="pdv-card__image">
                   <img src="${imagenes[0]}" alt="${this._esc(v.nombrePDV)}">
                   ${imagenes.length > 1
                       ? `<div class="pdv-card__img-badge">
                              <span class="material-icons" style="font-size:14px;">photo_library</span>
                              ${imagenes.length}
                          </div>`
                       : ''}
               </div>`
            : `<div class="pdv-card__image pdv-card__image--placeholder">
                   <span class="material-icons">store</span>
               </div>`;

        // — Sección expandible (inconveniente completo + soluciones + galería) —
        const expandedHTML = needsToggle ? `
            <div class="pdv-card__expanded" id="exp-${v.id}">

                ${inconvFull.length > 120 ? `
                <div class="pdv-card__detail-block">
                    <span class="pdv-card__detail-label">Inconveniente completo</span>
                    <p>${this._esc(inconvFull)}</p>
                </div>` : ''}

                ${v.soluciones ? `
                <div class="pdv-card__detail-block">
                    <span class="pdv-card__detail-label">Soluciones</span>
                    <p>${this._esc(v.soluciones)}</p>
                </div>` : ''}

                ${imagenes.length > 1 ? `
                <div class="pdv-card__detail-block">
                    <span class="pdv-card__detail-label">
                        Todas las imágenes (${imagenes.length})
                    </span>
                    <div class="pdv-card__mini-gallery">
                        ${imagenes.map(b64 => `
                            <a href="${b64}" target="_blank" title="Ver imagen completa">
                                <img src="${b64}" alt="imagen">
                            </a>`).join('')}
                    </div>
                </div>` : ''}

            </div>` : '';

        const toggleHTML = needsToggle ? `
            <button class="pdv-card__toggle"
                    data-target="exp-${v.id}">
                <span class="material-icons">expand_more</span>
                <span class="toggle-label">Ver más</span>
            </button>` : '';

        // — Tarjeta completa —
        return `
        <div class="pdv-card" data-id="${v.id}">

            ${imageHTML}

            <div class="pdv-card__body">

                <p class="pdv-card__nombre">${this._esc(v.nombrePDV) || '—'}</p>

                <div class="pdv-card__meta">
                    ${v.nroCliente
                        ? `<span class="pdv-card__codigo">#${this._esc(v.nroCliente)}</span>`
                        : ''}
                    ${v.fechaVisita
                        ? `<span class="pdv-card__fecha">${DateUtils.format(v.fechaVisita)}</span>`
                        : ''}
                    <span class="estado-badge estado-badge--${v.estado || 'en_progreso'}">
                        ${v.estado === 'cerrado' ? 'Cerrado' : 'En progreso'}
                    </span>
                </div>

                ${v.direccion ? `
                <div class="pdv-card__direccion">
                    <span class="material-icons">place</span>
                    ${this._esc(v.direccion)}
                </div>` : ''}

                <hr class="pdv-card__divider">

                ${inconvFull
                    ? `<p class="pdv-card__inconv-label">Inconveniente</p>
                       <p class="pdv-card__inconveniente">${this._esc(inconvPreview)}</p>`
                    : `<p class="pdv-card__inconveniente"
                          style="color:#ccc; font-style:italic; font-size:12px;">
                           Sin inconveniente registrado
                       </p>`}

                ${expandedHTML}
                ${toggleHTML}

                <div class="pdv-card__actions">
                    <button class="btn btn-sm btn-secondary btn-edit"
                            data-id="${v.id}"
                            title="Editar">
                        <span class="material-icons">edit</span>
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete"
                            data-id="${v.id}"
                            title="Eliminar">
                        <span class="material-icons">delete</span>
                    </button>
                </div>

            </div>
        </div>`;
    }

    // ── Listeners ──────────────────────────────────────────────────────────────

    _attachCardListeners(container) {

        // Expandir / contraer
        container.querySelectorAll('.pdv-card__toggle').forEach(btn => {
            this.addListener(btn, 'click', () => {
                const targetEl = document.getElementById(btn.dataset.target);
                const label    = btn.querySelector('.toggle-label');
                const isOpen   = btn.classList.toggle('open');

                if (targetEl) targetEl.classList.toggle('open', isOpen);
                if (label)    label.textContent = isOpen ? 'Ver menos' : 'Ver más';
            });
        });

        // Editar — requiere autenticación
        container.querySelectorAll('.btn-edit').forEach(btn => {
            this.addListener(btn, 'click', () => {
                authService.requireAuth('Editar Registro', () => {
                    eventBus.emit('visita:edit', { id: btn.dataset.id });
                });
            });
        });

        // Eliminar
        container.querySelectorAll('.btn-delete').forEach(btn => {
            this.addListener(btn, 'click', () => {
                eventBus.emit('visita:delete', { id: btn.dataset.id });
            });
        });
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

    _trunc(text, max) {
        if (!text) return '';
        const s = String(text).trim();
        return s.length > max ? s.slice(0, max) + '…' : s;
    }
}

const visitaView = new VisitaView();
