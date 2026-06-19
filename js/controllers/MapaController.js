/**
 * MapaController.js
 * Mapa interactivo de PDVs usando Leaflet + OpenStreetMap (sin API key).
 * Geocodifica direcciones con Nominatim y guarda coordenadas en Supabase.
 */

class MapaController {
    constructor() {
        this.map        = null;
        this.markers    = null; // L.layerGroup
        this._mapReady  = false;
        this._geoCache  = {}; // dirección → { lat, lon }
    }

    // ── Punto de entrada ──────────────────────────────────────────────────────

    async renderMapa() {
        const container = document.getElementById('mapa-view');
        if (!container) return;

        if (!this._mapReady) {
            this._buildShell(container);
            this._initLeaflet();
        } else {
            // Mapa ya existe: invalidar tamaño por si la pestaña cambió
            this.map.invalidateSize();
        }

        await this._reloadMarkers();
    }

    // ── HTML base ─────────────────────────────────────────────────────────────

    _buildShell(container) {
        container.innerHTML = `
        <div style="max-width:1200px; margin:0 auto;">

            <div class="card" style="padding:0; overflow:hidden; margin-bottom:20px;">
                <div id="pdv-mapa" style="height:460px; width:100%;"></div>
            </div>

            <div id="mapa-geo-status" style="display:none; text-align:center;
                 padding:10px; color:#666; font-size:13px; background:#FFF8E1;
                 border-radius:8px; margin-bottom:16px;">
                <span class="material-icons"
                      style="font-size:16px; vertical-align:middle; margin-right:4px;">
                    radar
                </span>
                Geolocalización en proceso — los marcadores aparecen a medida que se procesan…
            </div>

            <div id="mapa-leyenda" style="display:flex; gap:16px; margin-bottom:16px;
                 flex-wrap:wrap; align-items:center; padding:0 4px;">
                <span style="font-size:13px; color:#555; display:flex; align-items:center; gap:6px;">
                    <span style="display:inline-block; width:14px; height:14px;
                                 background:#FF9800; border-radius:50%; border:2px solid #fff;
                                 box-shadow:0 1px 3px rgba(0,0,0,.3);"></span>
                    En progreso
                </span>
                <span style="font-size:13px; color:#555; display:flex; align-items:center; gap:6px;">
                    <span style="display:inline-block; width:14px; height:14px;
                                 background:#4CAF50; border-radius:50%; border:2px solid #fff;
                                 box-shadow:0 1px 3px rgba(0,0,0,.3);"></span>
                    Cerrado
                </span>
            </div>

            <div id="mapa-sin-ubicacion"></div>

        </div>`;
    }

    // ── Inicializar Leaflet ────────────────────────────────────────────────────

    _initLeaflet() {
        if (typeof L === 'undefined') {
            document.getElementById('pdv-mapa').innerHTML =
                '<p style="padding:40px; text-align:center; color:#999;">Error cargando el mapa. Recargá la página.</p>';
            return;
        }

        // Centro: Tucumán capital
        this.map = L.map('pdv-mapa', { zoomControl: true }).setView([-26.8083, -65.2176], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(this.map);

        this.markers = L.layerGroup().addTo(this.map);
        this._mapReady = true;
    }

    // ── Cargar marcadores ─────────────────────────────────────────────────────

    async _reloadMarkers() {
        if (!this._mapReady) return;

        this.markers.clearLayers();

        const visitas = await visitaModel.getAll();

        // Contar registros por PDV para el popup
        const conteoPDV = {};
        visitas.forEach(v => {
            const k = (v.nombrePDV || '').trim().toLowerCase();
            if (k) conteoPDV[k] = (conteoPDV[k] || 0) + 1;
        });

        const sinUbicacion = [];
        const aGeocoder   = [];

        for (const v of visitas) {
            if (v.latitud && v.longitud) {
                this._addMarker(v, conteoPDV);
            } else if (v.direccion && v.direccion.trim()) {
                aGeocoder.push(v);
            } else {
                sinUbicacion.push(v);
            }
        }

        this._renderSinUbicacion(sinUbicacion);

        if (aGeocoder.length > 0) {
            this._geocodeQueue(aGeocoder, conteoPDV);
        }
    }

    // ── Geocodificación secuencial (1 req/seg — límite de Nominatim) ─────────

    async _geocodeQueue(visitas, conteoPDV) {
        const statusEl = document.getElementById('mapa-geo-status');
        if (statusEl) statusEl.style.display = 'block';

        for (const v of visitas) {
            const cacheKey = v.direccion.trim().toLowerCase();

            let coords = this._geoCache[cacheKey] || null;

            if (!coords) {
                coords = await this._geocode(v.direccion);
                if (coords) this._geoCache[cacheKey] = coords;
            }

            if (coords) {
                // Guardar en Supabase para no repetir geocodificación
                try {
                    await visitaModel.update(v.id, {
                        ...v,
                        latitud:  coords.lat,
                        longitud: coords.lon
                    });
                    v.latitud  = coords.lat;
                    v.longitud = coords.lon;
                    this._addMarker(v, conteoPDV);
                } catch (e) {
                    logger.warn('No se pudieron guardar coordenadas:', e.message);
                }
            }

            // Respetamos el límite de 1 solicitud por segundo de Nominatim
            await new Promise(r => setTimeout(r, 1200));
        }

        if (statusEl) statusEl.style.display = 'none';
    }

    async _geocode(direccion) {
        try {
            const query = encodeURIComponent(direccion.trim() + ', Tucumán, Argentina');
            const url   = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
            const res   = await fetch(url, {
                headers: { 'Accept-Language': 'es', 'User-Agent': 'PDVCritico/2.0' }
            });
            const data = await res.json();
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
            }
        } catch (e) {
            logger.warn('Error geocodificando "' + direccion + '":', e.message);
        }
        return null;
    }

    // ── Agregar marcador al mapa ───────────────────────────────────────────────

    _addMarker(v, conteoPDV) {
        if (!this.markers) return;

        const esCerrado = v.estado === 'cerrado';
        const color     = esCerrado ? '#4CAF50' : '#FF9800';
        const label     = esCerrado ? 'Cerrado'  : 'En progreso';
        const total     = conteoPDV[(v.nombrePDV || '').trim().toLowerCase()] || 1;

        const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const d     = v.fechaVisita ? new Date(v.fechaVisita) : null;
        const fecha = d && !isNaN(d)
            ? `${d.getDate().toString().padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`
            : 'Sin fecha';

        const popup = `
        <div style="font-family:Roboto,sans-serif; min-width:200px; max-width:260px;">
            <p style="margin:0 0 6px; font-size:15px; font-weight:700; color:#212121;">
                ${this._esc(v.nombrePDV || '—')}
            </p>
            ${v.nroCliente ? `
            <p style="margin:0 0 4px; font-size:12px; color:#555;">
                🏷️ Cliente&nbsp;<strong>#${this._esc(v.nroCliente)}</strong>
            </p>` : ''}
            ${v.direccion ? `
            <p style="margin:0 0 4px; font-size:12px; color:#757575;">
                📍 ${this._esc(v.direccion)}
            </p>` : ''}
            <p style="margin:0 0 8px; font-size:12px; color:#757575;">
                📅 ${fecha}
            </p>
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px;">
                <span style="background:${color}; color:#fff; padding:3px 10px;
                             border-radius:12px; font-size:11px; font-weight:700;">
                    ${label}
                </span>
                <span style="font-size:12px; color:#1976D2; font-weight:600;">
                    📊 ${total} registro${total !== 1 ? 's' : ''}
                </span>
            </div>
        </div>`;

        L.circleMarker([v.latitud, v.longitud], {
            radius:      11,
            fillColor:   color,
            color:       '#fff',
            weight:      2.5,
            fillOpacity: 0.92
        })
        .bindPopup(popup, { maxWidth: 280 })
        .addTo(this.markers);
    }

    // ── Lista de PDVs sin geolocalización ─────────────────────────────────────

    _renderSinUbicacion(visitas) {
        const el = document.getElementById('mapa-sin-ubicacion');
        if (!el) return;

        if (visitas.length === 0) { el.innerHTML = ''; return; }

        const filas = visitas.map(v => {
            const esCerrado = v.estado === 'cerrado';
            return `
            <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:10px 12px; font-weight:600; font-size:13px;">
                    ${this._esc(v.nombrePDV) || '—'}
                </td>
                <td style="padding:10px 12px; font-size:13px; color:#666;">
                    ${v.nroCliente ? '#' + this._esc(v.nroCliente) : '—'}
                </td>
                <td style="padding:10px 12px;">
                    <span style="background:${esCerrado ? '#4CAF50' : '#FF9800'};
                                 color:#fff; padding:2px 8px; border-radius:10px; font-size:11px;">
                        ${esCerrado ? 'Cerrado' : 'En progreso'}
                    </span>
                </td>
                <td style="padding:10px 12px; font-size:12px; color:#F44336;">
                    <span class="material-icons" style="font-size:14px; vertical-align:middle;">
                        location_off
                    </span>
                    Sin dirección
                </td>
            </tr>`;
        }).join('');

        el.innerHTML = `
        <div class="card">
            <h4 style="margin:0 0 8px; font-size:15px; color:#333; display:flex; align-items:center; gap:6px;">
                <span class="material-icons" style="color:#F44336; font-size:20px;">location_off</span>
                PDVs sin geolocalización (${visitas.length})
            </h4>
            <p style="font-size:13px; color:#999; margin-bottom:16px;">
                Estos registros no tienen dirección. Editá el registro y agregá la dirección para verlos en el mapa.
            </p>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:2px solid #e0e0e0;">
                            <th style="padding:8px 12px; text-align:left; font-size:11px; color:#666; text-transform:uppercase; letter-spacing:.5px;">PDV</th>
                            <th style="padding:8px 12px; text-align:left; font-size:11px; color:#666; text-transform:uppercase; letter-spacing:.5px;">Cliente</th>
                            <th style="padding:8px 12px; text-align:left; font-size:11px; color:#666; text-transform:uppercase; letter-spacing:.5px;">Estado</th>
                            <th style="padding:8px 12px; text-align:left; font-size:11px; color:#666; text-transform:uppercase; letter-spacing:.5px;">Ubicación</th>
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
