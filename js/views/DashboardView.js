/**
 * DashboardView.js
 * Dashboard de métricas y gráficos basado en registros de visitas PDV.
 */

class DashboardView {
    constructor() {
        this.charts = {};
    }

    destroy() {
        Object.values(this.charts).forEach(c => {
            try { c.destroy(); } catch (e) {}
        });
        this.charts = {};
    }

    async render() {
        const container = document.getElementById('dashboard-view');
        if (!container) return;

        this.destroy();
        container.innerHTML = this._buildLayout();
        await this._loadData();
    }

    _buildLayout() {
        return `
        <div style="max-width:1200px; margin:0 auto;">

            <!-- Métricas -->
            <div class="grid grid-4 mb-lg">
                <div class="card text-center">
                    <div class="card-title">Total Registros</div>
                    <div class="card-value" id="dash-total" style="color:#1976D2;">—</div>
                    <div class="card-subtitle">PDVs levantados</div>
                </div>
                <div class="card text-center">
                    <div class="card-title">En Progreso</div>
                    <div class="card-value" id="dash-en-progreso" style="color:#FF9800;">—</div>
                    <div class="card-subtitle">Acciones pendientes</div>
                </div>
                <div class="card text-center">
                    <div class="card-title">Cerrados</div>
                    <div class="card-value" id="dash-cerrados" style="color:#4CAF50;">—</div>
                    <div class="card-subtitle">Acciones resueltas</div>
                </div>
                <div class="card text-center">
                    <div class="card-title">Tasa de Resolución</div>
                    <div class="card-value" id="dash-tasa" style="color:#9C27B0;">—</div>
                    <div class="card-subtitle">Porcentaje cerrados</div>
                </div>
            </div>

            <!-- Gráficos principales -->
            <div class="grid grid-2 mb-lg">
                <div class="card">
                    <h4 style="margin:0 0 16px; font-size:15px; color:#333;">PDVs Levantados por Mes</h4>
                    <div style="position:relative; height:220px;">
                        <canvas id="dash-chart-monthly"></canvas>
                    </div>
                </div>
                <div class="card">
                    <h4 style="margin:0 0 16px; font-size:15px; color:#333;">Estado de Acciones</h4>
                    <div style="position:relative; height:220px;">
                        <canvas id="dash-chart-estado"></canvas>
                    </div>
                </div>
            </div>

            <!-- Top PDVs -->
            <div class="card mb-lg">
                <h4 style="margin:0 0 16px; font-size:15px; color:#333;">Top 5 PDVs con más Visitas</h4>
                <div style="position:relative; height:200px;">
                    <canvas id="dash-chart-top"></canvas>
                </div>
            </div>

            <!-- Últimos registros -->
            <div class="card">
                <h4 style="margin:0 0 16px; font-size:15px; color:#333;">Últimos 5 Registros</h4>
                <div id="dash-recent"></div>
            </div>

        </div>`;
    }

    async _loadData() {
        try {
            const visitas = await visitaModel.getAll();

            const total      = visitas.length;
            const cerrados   = visitas.filter(v => v.estado === 'cerrado').length;
            const enProgreso = total - cerrados;
            const tasa       = total > 0 ? Math.round((cerrados / total) * 100) : 0;

            document.getElementById('dash-total').textContent       = total;
            document.getElementById('dash-en-progreso').textContent = enProgreso;
            document.getElementById('dash-cerrados').textContent    = cerrados;
            document.getElementById('dash-tasa').textContent        = tasa + '%';

            if (total === 0) {
                this._showEmpty();
                return;
            }

            this._createMonthlyChart(visitas);
            this._createEstadoChart(enProgreso, cerrados);
            this._createTopPDVChart(visitas);

            const sorted = visitas
                .slice()
                .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
            this._showRecentVisitas(sorted.slice(0, 5));

        } catch (error) {
            logger.error('Error cargando dashboard:', error);
        }
    }

    _showEmpty() {
        const msg = '<p style="color:#bbb; text-align:center; padding:24px 0; font-size:14px;">Sin datos para mostrar. Agregá registros desde la pestaña Registros.</p>';
        ['dash-chart-monthly', 'dash-chart-estado', 'dash-chart-top'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.parentNode) el.parentNode.innerHTML = msg;
        });
        const recent = document.getElementById('dash-recent');
        if (recent) recent.innerHTML = msg;
    }

    // ── Agrupaciones ────────────────────────────────────────────────────────────

    _groupByMonth(visitas) {
        const data = {};
        visitas.forEach(v => {
            if (!v.fechaVisita) return;
            const d = new Date(v.fechaVisita);
            if (isNaN(d)) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            data[key] = (data[key] || 0) + 1;
        });

        const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const sorted = Object.keys(data).sort();
        return {
            labels: sorted.map(k => {
                const [y, m] = k.split('-');
                return `${MESES[parseInt(m) - 1]} ${y}`;
            }),
            values: sorted.map(k => data[k])
        };
    }

    _getTopPDVs(visitas, n) {
        const counts = {};
        visitas.forEach(v => {
            const name = (v.nombrePDV || 'Sin nombre').trim();
            counts[name] = (counts[name] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n);
    }

    // ── Gráficos ─────────────────────────────────────────────────────────────────

    _createMonthlyChart(visitas) {
        const ctx = document.getElementById('dash-chart-monthly');
        if (!ctx || !window.Chart) return;

        const { labels, values } = this._groupByMonth(visitas);

        this.charts.monthly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'PDVs levantados',
                    data: values,
                    backgroundColor: 'rgba(25, 118, 210, 0.72)',
                    borderColor: '#1976D2',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }

    _createEstadoChart(enProgreso, cerrados) {
        const ctx = document.getElementById('dash-chart-estado');
        if (!ctx || !window.Chart) return;

        this.charts.estado = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['En Progreso', 'Cerrados'],
                datasets: [{
                    data: [enProgreso, cerrados],
                    backgroundColor: ['#FF9800', '#4CAF50'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    _createTopPDVChart(visitas) {
        const ctx = document.getElementById('dash-chart-top');
        if (!ctx || !window.Chart) return;

        const top = this._getTopPDVs(visitas, 5);

        this.charts.topPDV = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: top.map(([name]) => name),
                datasets: [{
                    label: 'Visitas',
                    data: top.map(([, count]) => count),
                    backgroundColor: 'rgba(156, 39, 176, 0.72)',
                    borderColor: '#9C27B0',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }

    // ── Tabla de últimos registros ───────────────────────────────────────────────

    _showRecentVisitas(visitas) {
        const container = document.getElementById('dash-recent');
        if (!container) return;

        if (visitas.length === 0) {
            container.innerHTML = '<p style="color:#bbb; text-align:center; padding:24px 0;">Sin registros</p>';
            return;
        }

        const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

        const rows = visitas.map(v => {
            const d     = v.fechaCreacion ? new Date(v.fechaCreacion) : null;
            const fecha = d && !isNaN(d)
                ? `${d.getDate().toString().padStart(2,'0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`
                : '—';

            const esCerrado   = v.estado === 'cerrado';
            const badgeColor  = esCerrado ? '#4CAF50' : '#FF9800';
            const badgeLabel  = esCerrado ? 'Cerrado'  : 'En progreso';

            return `
            <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:10px 12px; font-weight:600; font-size:13px;">${this._esc(v.nombrePDV) || '—'}</td>
                <td style="padding:10px 12px; font-size:13px; color:#666;">${v.nroCliente ? '#' + this._esc(v.nroCliente) : '—'}</td>
                <td style="padding:10px 12px; font-size:13px; color:#888;">${fecha}</td>
                <td style="padding:10px 12px;">
                    <span style="background:${badgeColor}; color:#fff; padding:3px 10px;
                                 border-radius:12px; font-size:11px; font-weight:700;">
                        ${badgeLabel}
                    </span>
                </td>
            </tr>`;
        }).join('');

        container.innerHTML = `
        <table style="width:100%; border-collapse:collapse;">
            <thead>
                <tr style="border-bottom:2px solid #e0e0e0;">
                    <th style="padding:8px 12px; font-size:12px; color:#666; text-align:left; font-weight:600; text-transform:uppercase; letter-spacing:.5px;">PDV</th>
                    <th style="padding:8px 12px; font-size:12px; color:#666; text-align:left; font-weight:600; text-transform:uppercase; letter-spacing:.5px;">Nro. Cliente</th>
                    <th style="padding:8px 12px; font-size:12px; color:#666; text-align:left; font-weight:600; text-transform:uppercase; letter-spacing:.5px;">Cargado</th>
                    <th style="padding:8px 12px; font-size:12px; color:#666; text-align:left; font-weight:600; text-transform:uppercase; letter-spacing:.5px;">Estado</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

    _esc(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g,  '&amp;')
            .replace(/</g,  '&lt;')
            .replace(/>/g,  '&gt;')
            .replace(/"/g,  '&quot;');
    }
}

const dashboardView = new DashboardView();
