/**
 * MapaController.js
 * Mapa interactivo de PDVs — Leaflet + CartoDB (sin API key).
 */

class MapaController {
    constructor() {
        this.map       = null;
        this.markers   = null;
        this._ready    = false;
        this._geoCache = {};
    }

    async renderMapa() {
        const container = document.getElementById('mapa-view');
        if (!container) return;

        if (!this._ready) {
            this._buildShell(container);
            this._initLeaflet();
        } else {
            this.map.invalidateSize();
        }

        await this._reloadMarkers();
    }

    // ── HTML base ─────────────────────────────────────────────────────────────

    _buildShell(container) {
        container.innerHTML = `
        <div style="max-width:1200px; margin:0 auto;">

            <!-- Stats bar -->
            <div id="mapa-stats" style="
                display:flex; gap:12px; margin-bottom:14px; flex-wrap:wrap;">
            </div>

            <!-- Mapa -->
            <div style="border-radius:16px; overflow:hidden;
                        box-shadow:0 4px 20px rgba(0,0,0,.12); margin-bottom:16px;">
                <div id="pdv-mapa" style="height:480px; width:100%;"></div>
            </div>

            <!-- Leyenda + botón centrar -->
            <div style="display:flex; align-items:center; justify-content:space-between;
                        flex-wrap:wrap; gap:10px; margin-bottom:16px; padding:0 4px;">
                <div style="display:flex; gap:20px; flex-wrap:wrap;">
                    <span style="font-size:13px; color:#555; display:flex; align-items:center; gap:7px;">
                        ${this._pinSVG('#FF9800')} En progreso
                    </span>
                    <span style="font-size:13px; color:#555; display:flex; align-items:center; gap:7px;">
                        ${this._pinSVG('#4CAF50')} Cerrado
                    </span>
                </div>
                <button id="btn-fit-mapa" class="btn btn-sm btn-outline" style="gap:4px;">
                    <span class="material-icons" style="font-size:16px;">zoom_out_map</span>
                    Ver todos
                </button>
            </div>

            <!-- Estado geocodificación -->
            <div id="mapa-geo-status" style="display:none; background:#FFF8E1;
                 border:1px solid #FFE082; border-radius:10px; padding:12px 16px;
                 font-size:13px; color:#795548; margin-bottom:16px;
                 display:none; align-items:center; gap:8px;">
                <span class="material-icons" style="font-size:18px; color:#FF9800;">radar</span>
                <span>Geolocalización en proceso — los marcadores aparecen a medida que se procesan…</span>
            </div>

            <!-- PDVs sin ubicación -->
            <div id="mapa-sin-ubicacion"></div>

        </div>`;
    }

    _pinSVG(color) {
        return `<svg width="14" height="18" viewBox="0 0 14 18" fill="none">
            <path d="M7 0C3.13 0 0 3.13 0 7c0 5.25 7 11 7 11s7-5.75 7-11c0-3.87-3.13-7-7-7z"
                  fill="${color}"/>
            <circle cx="7" cy="7" r="2.5" fill="white"/>
        </svg>`;
    }

    // ── Inicializar Leaflet ────────────────────────────────────────────────────

    _initLeaflet() {
        if (typeof L === 'undefined') {
            const el = document.getElementById('pdv-mapa');
            if (el) el.innerHTML = '<p style="padding:60px;text-align:center;color:#999;">Error cargando el mapa. Recargá la página.</p>';
            return;
        }

        this.map = L.map('pdv-mapa', {
            zoomControl: false,
            attributionControl: true
        }).setView([-26.8083, -65.2176], 13);

        // Controles de zoom arriba a la derecha
        L.control.zoom({ position: 'topright' }).addTo(this.map);

        // Tiles CartoDB Positron — limpio y moderno
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        this.markers = L.featureGroup().addTo(this.map);
        this._ready  = true;

        // Botón "ver todos"
        const fitBtn = document.getElementById('btn-fit-mapa');
        if (fitBtn) {
            fitBtn.addEventListener('click', () => {
                if (this.markers && this.markers.getLayers().length > 0) {
                    this.map.fitBounds(this.markers.getBounds().pad(0.15));
                }
            });
        }
    }

    // ── Cargar marcadores ─────────────────────────────────────────────────────

    async _reloadMarkers() {
        if (!this._ready) return;

        this.markers.clearLayers();

        const visitas = await visitaModel.getAll();

        // Stats
        this._renderStats(visitas);

        // Contar registros por nombrePDV para el popup
        const conteo = {};
        visitas.forEach(v => {
            const k = (v.nombrePDV || '').trim().toLowerCase();
            if (k) conteo[k] = (conteo[k] || 0) + 1;
        });

        const sinUbicacion = [];
        const aGeocoder    = [];

        for (const v of visitas) {
            if (v.latitud && v.longitud) {
                this._addMarker(v, conteo);
            } else if (v.direccion && v.direccion.trim()) {
                aGeocoder.push(v);
            } else {
                sinUbicacion.push(v);
            }
        }

        this._renderSinUbicacion(sinUbicacion);

        // Ajustar vista a los marcadores existentes
        setTimeout(() => {
            if (this.markers.getLayers().length > 0) {
                this.map.fitBounds(this.markers.getBounds().pad(0.15));
            }
        }, 300);

        if (aGeocoder.length > 0) this._geocodeQueue(aGeocoder, conteo);
    }

    // ── Stats bar ─────────────────────────────────────────────────────────────

    _renderStats(visitas) {
        const el = document.getElementById('mapa-stats');
        if (!el) return;

        const total      = visitas.length;
        const conCoords  = visitas.filter(v => v.latitud && v.longitud).length;
        const cerrados   = visitas.filter(v => v.estado === 'cerrado').length;
        const enProgreso = total - cerrados;

        const chip = (icon, label, value, color) => `
            <div style="background:#fff; border-radius:12px; padding:10px 16px;
                        box-shadow:0 2px 8px rgba(0,0,0,.08); display:flex;
                        align-items:center; gap:8px; border-left:4px solid ${color};">
                <span class="material-icons" style="font-size:20px; color:${color};">${icon}</span>
                <div>
                    <div style="font-size:18px; font-weight:700; color:#212121;">${value}</div>
                    <div style="font-size:11px; color:#888; text-transform:uppercase; letter-spacing:.5px;">${label}</div>
                </div>
            </div>`;

        el.innerHTML =
            chip('store',        'Total PDVs',   total,      '#1976D2') +
            chip('location_on',  'En el mapa',   conCoords,  '#9C27B0') +
            chip('pending',      'En progreso',  enProgreso, '#FF9800') +
            chip('check_circle', 'Cerrados',     cerrados,   '#4CAF50');
    }

    // ── Geocodificación secuencial ─────────────────────────────────────────────

    async _geocodeQueue(visitas, conteo) {
        const statusEl = document.getElementById('mapa-geo-status');
        if (statusEl) statusEl.style.display = 'flex';

        for (const v of visitas) {
            const key = v.direccion.trim().toLowerCase();
            let coords = this._geoCache[key] || await this._geocode(v.direccion);

            if (coords) {
                this._geoCache[key] = coords;
                try {
                    await visitaModel.update(v.id, { ...v, latitud: coords.lat, longitud: coords.lon });
                    v.latitud  = coords.lat;
                    v.longitud = coords.lon;
                    this._addMarker(v, conteo);
                } catch (e) {
                    logger.warn('Error guardando coordenadas:', e.message);
                }
            }
            await new Promise(r => setTimeout(r, 1200));
        }

        if (statusEl) statusEl.style.display = 'none';
    }

    async _geocode(direccion) {
        try {
            const q   = encodeURIComponent(direccion.trim() + ', Tucumán, Argentina');
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
                { headers: { 'Accept-Language': 'es', 'User-Agent': 'PDVCritico/2.0' } }
            );
            const data = await res.json();
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
            }
        } catch (e) {
            logger.warn('Error geocodificando:', e.message);
        }
        return null;
    }

    // ── Marcador personalizado ────────────────────────────────────────────────

    _addMarker(v, conteo) {
        if (!this.markers) return;

        const esCerrado = v.estado === 'cerrado';
        const color     = esCerrado ? '#4CAF50' : '#FF9800';
        const label     = esCerrado ? 'Cerrado'  : 'En progreso';
        const bgBadge   = esCerrado ? '#E8F5E9'  : '#FFF3E0';
        const total     = conteo[(v.nombrePDV || '').trim().toLowerCase()] || 1;

        const icon = L.divIcon({
            html: `
            <div style="position:relative; width:36px; height:44px;">
                <div style="
                    position:absolute; bottom:0; left:2px;
                    width:32px; height:32px;
                    background:${color};
                    border-radius:50% 50% 50% 0;
                    transform:rotate(-45deg);
                    border:3px solid white;
                    box-shadow:0 4px 12px rgba(0,0,0,.35);
                "></div>
                <span class="material-icons" style="
                    position:absolute; bottom:6px; left:8px;
                    font-size:14px; color:white;
                ">store</span>
            </div>`,
            iconSize:    [36, 44],
            iconAnchor:  [18, 44],
            popupAnchor: [0, -46],
            className:   ''
        });

        const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const d     = v.fechaVisita ? new Date(v.fechaVisita) : null;
        const fecha = d && !isNaN(d)
            ? `${d.getDate().toString().padStart(2,'0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`
            : 'Sin fecha';

        const popup = `
        <div style="font-family:Roboto,sans-serif; min-width:210px; max-width:260px;">
            <div style="margin:-10px -20px 12px; padding:14px 16px;
                        background:${color}; border-radius:4px 4px 0 0;">
                <p style="margin:0; font-size:15px; font-weight:700; color:white;
                           white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${this._esc(v.nombrePDV || '—')}
                </p>
            </div>
            ${v.nroCliente ? `
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
                <span class="material-icons" style="font-size:14px; color:#9E9E9E;">tag</span>
                <span style="font-size:13px; color:#555;">Cliente <strong>#${this._esc(v.nroCliente)}</strong></span>
            </div>` : ''}
            ${v.direccion ? `
            <div style="display:flex; align-items:flex-start; gap:6px; margin-bottom:6px;">
                <span class="material-icons" style="font-size:14px; color:#9E9E9E; margin-top:1px;">place</span>
                <span style="font-size:12px; color:#757575;">${this._esc(v.direccion)}</span>
            </div>` : ''}
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:10px;">
                <span class="material-icons" style="font-size:14px; color:#9E9E9E;">calendar_today</span>
                <span style="font-size:12px; color:#757575;">${fecha}</span>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between;">
                <span style="background:${bgBadge}; color:${color}; padding:3px 10px;
                             border-radius:12px; font-size:11px; font-weight:700;
                             border:1px solid ${color};">
                    ${label}
                </span>
                <span style="font-size:12px; color:#1976D2; font-weight:600;">
                    📊 ${total} registro${total !== 1 ? 's' : ''}
                </span>
            </div>
        </div>`;

        L.marker([v.latitud, v.longitud], { icon })
            .bindPopup(popup, { maxWidth: 280 })
            .addTo(this.markers);
    }

    // ── Lista sin ubicación ───────────────────────────────────────────────────

    _renderSinUbicacion(visitas) {
        const el = document.getElementById('mapa-sin-ubicacion');
        if (!el) return;

        if (visitas.length === 0) { el.innerHTML = ''; return; }

        const filas = visitas.map(v => {
            const esCerrado = v.estado === 'cerrado';
            return `
            <tr style="border-bottom:1px solid #f5f5f5;">
                <td style="padding:10px 12px; font-weight:600; font-size:13px;">${this._esc(v.nombrePDV) || '—'}</td>
                <td style="padding:10px 12px; font-size:13px; color:#666;">${v.nroCliente ? '#' + this._esc(v.nroCliente) : '—'}</td>
                <td style="padding:10px 12px;">
                    <span style="background:${esCerrado ? '#E8F5E9' : '#FFF3E0'};
                                 color:${esCerrado ? '#4CAF50' : '#FF9800'};
                                 padding:2px 10px; border-radius:10px; font-size:11px; font-weight:700;
                                 border:1px solid ${esCerrado ? '#4CAF50' : '#FF9800'};">
                        ${esCerrado ? 'Cerrado' : 'En progreso'}
                    </span>
                </td>
                <td style="padding:10px 12px;">
                    <span style="font-size:12px; color:#F44336; display:flex; align-items:center; gap:4px;">
                        <span class="material-icons" style="font-size:14px;">location_off</span>
                        Sin dirección
                    </span>
                </td>
            </tr>`;
        }).join('');

        el.innerHTML = `
        <div class="card" style="border-top:4px solid #F44336;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <span class="material-icons" style="color:#F44336;">location_off</span>
                <h4 style="margin:0; font-size:15px; color:#333;">
                    PDVs sin geolocalización
                    <span style="background:#FFEBEE; color:#F44336; font-size:12px;
                                 padding:1px 8px; border-radius:10px; margin-left:6px;">
                        ${visitas.length}
                    </span>
                </h4>
            </div>
            <p style="font-size:13px; color:#999; margin-bottom:14px;">
                Editá el registro y agregá la dirección, o ingresá las coordenadas directamente en el formulario.
            </p>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:2px solid #eeeeee;">
                            <th style="padding:8px 12px; text-align:left; font-size:11px; color:#9E9E9E; text-transform:uppercase; letter-spacing:.5px;">PDV</th>
                            <th style="padding:8px 12px; text-align:left; font-size:11px; color:#9E9E9E; text-transform:uppercase; letter-spacing:.5px;">Cliente</th>
                            <th style="padding:8px 12px; text-align:left; font-size:11px; color:#9E9E9E; text-transform:uppercase; letter-spacing:.5px;">Estado</th>
                            <th style="padding:8px 12px; text-align:left; font-size:11px; color:#9E9E9E; text-transform:uppercase; letter-spacing:.5px;">Ubicación</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
        </div>`;
    }

    _esc(t) {
        if (!t) return '';
        return String(t)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}

const mapaController = new MapaController();
