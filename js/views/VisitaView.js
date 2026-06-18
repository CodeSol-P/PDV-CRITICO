/**
 * VisitaView.js
 * Vista de registros PDV en formato de tarjetas tipo publicación.
 * Hacer clic en la imagen o el nombre de un PDV abre el panel de detalle.
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
                        Usá <strong>+ Nuevo Registro</strong> para comenzar
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

        const needsToggle = inconvFull.length > 120 || !!v.soluciones || imagenes.length > 1;

        const imageHTML = hasImg
            ? `<div class="pdv-card__image" title="Ver detalles">
                   <img src="${imagenes[0]}" alt="${this._esc(v.nombrePDV)}">
                   ${imagenes.length > 1
                       ? `<div class="pdv-card__img-badge">
                              <span class="material-icons" style="font-size:14px;">photo_library</span>
                              ${imagenes.length}
                          </div>`
                       : ''}
               </div>`
            : `<div class="pdv-card__image pdv-card__image--placeholder" title="Ver detalles">
                   <span class="material-icons">store</span>
               </div>`;

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
                            <a class="pdv-card__gallery-link" data-src="${b64}" title="Ver imagen completa">
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

        const estadoClass = v.estado || 'en_progreso';
        const estadoLabel = v.estado === 'cerrado' ? 'Cerrado' : 'En progreso';

        return `
        <div class="pdv-card" data-id="${v.id}">

            ${imageHTML}

            <div class="pdv-card__body">

                <p class="pdv-card__nombre" title="Ver detalles">${this._esc(v.nombrePDV) || '—'}</p>

                <div class="pdv-card__meta">
                    ${v.nroCliente
                        ? `<span class="pdv-card__codigo">#${this._esc(v.nroCliente)}</span>`
                        : ''}
                    ${v.fechaVisita
                        ? `<span class="pdv-card__fecha">${DateUtils.format(v.fechaVisita)}</span>`
                        : ''}
                    <span class="estado-badge estado-badge--${estadoClass}">
                        ${estadoLabel}
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
                </div>

            </div>
        </div>`;
    }

    // ── Listeners ──────────────────────────────────────────────────────────────

    _attachCardListeners(container) {

        // Expandir / contraer
        container.querySelectorAll('.pdv-card__toggle').forEach(btn => {
            this.addListener(btn, 'click', (e) => {
                e.stopPropagation();
                const targetEl = document.getElementById(btn.dataset.target);
                const label    = btn.querySelector('.toggle-label');
                const isOpen   = btn.classList.toggle('open');

                if (targetEl) targetEl.classList.toggle('open', isOpen);
                if (label)    label.textContent = isOpen ? 'Ver menos' : 'Ver más';
            });
        });

        // Clic en imagen → abrir detalle
        container.querySelectorAll('.pdv-card__image').forEach(el => {
            this.addListener(el, 'click', () => {
                const card = el.closest('.pdv-card');
                if (card) eventBus.emit('visita:view', { id: card.dataset.id });
            });
        });

        // Clic en nombre → abrir detalle
        container.querySelectorAll('.pdv-card__nombre').forEach(el => {
            this.addListener(el, 'click', () => {
                const card = el.closest('.pdv-card');
                if (card) eventBus.emit('visita:view', { id: card.dataset.id });
            });
        });

        // Clic en imágenes de mini-galería → lightbox
        container.querySelectorAll('.pdv-card__gallery-link').forEach(link => {
            this.addListener(link, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const src  = link.dataset.src;
                const card = link.closest('.pdv-card');
                if (!card) return;

                const v = this.visitas.find(x => x.id === card.dataset.id);
                if (!v || !Array.isArray(v.imagenes)) return;

                const idx = v.imagenes.indexOf(src);
                eventBus.emit('visita:lightbox', { imagenes: v.imagenes, startIdx: idx >= 0 ? idx : 0 });
            });
        });

        // Editar — requiere autenticación
        container.querySelectorAll('.btn-edit').forEach(btn => {
            this.addListener(btn, 'click', (e) => {
                e.stopPropagation();
                authService.requireAuth('Editar Registro', () => {
                    eventBus.emit('visita:edit', { id: btn.dataset.id });
                });
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
