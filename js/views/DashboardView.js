/**
 * DashboardView.js
 * Vista del Dashboard con métricas y gráficos
 */

class DashboardView extends BaseView {
    constructor() {
        super("dashboard-view");
        this.charts = {};
    }

    async render() {
        const container = this.getContainer();
        container.innerHTML = `<div id="dashboard-container"></div>`;

        // Renderizar dashboard
        const dashboardContainer = container.querySelector("#dashboard-container");
        dashboardContainer.innerHTML = this._buildLayout();

        // Cargar datos y renderizar gráficos
        await this.loadData();
    }

    _buildLayout() {
        return `
            <div style="max-width: 1400px; margin: 0 auto;">
                <!-- Métricas -->
                <div class="grid grid-4 mb-lg">
                    <div class="card text-center">
                        <div class="card-title">Total PDV</div>
                        <div class="card-value" id="metric-pdv">0</div>
                    </div>
                    <div class="card text-center">
                        <div class="card-title">Incidentes Abiertos</div>
                        <div class="card-value" id="metric-open" style="color: #F44336;">0</div>
                    </div>
                    <div class="card text-center">
                        <div class="card-title">Incidentes Cerrados</div>
                        <div class="card-value" id="metric-closed" style="color: #4CAF50;">0</div>
                    </div>
                    <div class="card text-center">
                        <div class="card-title">Tasa Resolución</div>
                        <div class="card-value" id="metric-rate" style="color: #1976D2;">0%</div>
                    </div>
                </div>

                <!-- Gráficos -->
                <div class="grid grid-2 mb-lg">
                    <div class="card">
                        <h4>Incidentes por Criticidad</h4>
                        <canvas id="chart-criticality" height="200"></canvas>
                    </div>
                    <div class="card">
                        <h4>Estado de Incidentes</h4>
                        <canvas id="chart-state" height="200"></canvas>
                    </div>
                </div>

                <div class="grid grid-2 mb-lg">
                    <div class="card">
                        <h4>Incidentes por Mes</h4>
                        <canvas id="chart-monthly" height="200"></canvas>
                    </div>
                    <div class="card">
                        <h4>Top 5 PDV con Problemas</h4>
                        <canvas id="chart-top-pdv" height="200"></canvas>
                    </div>
                </div>

                <!-- Tabla de incidentes recientes -->
                <div class="card">
                    <h4>Incidentes Recientes</h4>
                    <div id="recent-incidents"></div>
                </div>
            </div>
        `;
    }

    async loadData() {
        try {
            // Cargar estadísticas
            const pdvCount = await db.count(APP_CONFIG.stores.pdv);
            const incidentStats = await incidentModel.getStats();
            const allIncidents = await incidentModel.getAll();

            // Actualizar métricas
            document.getElementById("metric-pdv").textContent = pdvCount;
            document.getElementById("metric-open").textContent = incidentStats.abiertos;
            document.getElementById("metric-closed").textContent = incidentStats.cerrados;

            const rate = incidentStats.total > 0 
                ? Math.round((incidentStats.cerrados / incidentStats.total) * 100)
                : 0;
            document.getElementById("metric-rate").textContent = rate + "%";

            // Gráfico: Criticidad
            this._createCriticalityChart(incidentStats);

            // Gráfico: Estado
            this._createStateChart(incidentStats);

            // Gráfico: Incidentes por mes
            this._createMonthlyChart(allIncidents);

            // Gráfico: Top PDV
            await this._createTopPDVChart();

            // Tabla de incidentes recientes
            this._showRecentIncidents(allIncidents.slice(-5).reverse());
        } catch (error) {
            logger.error("Error cargando dashboard:", error);
        }
    }

    _createCriticalityChart(stats) {
        const ctx = document.getElementById("chart-criticality").getContext("2d");

        this.charts.criticality = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["Alta", "Media", "Baja"],
                datasets: [{
                    data: [stats.alta, stats.media, stats.baja],
                    backgroundColor: ["#F44336", "#FF9800", "#4CAF50"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom" }
                }
            }
        });
    }

    _createStateChart(stats) {
        const ctx = document.getElementById("chart-state").getContext("2d");

        this.charts.state = new Chart(ctx, {
            type: "pie",
            data: {
                labels: ["Abiertos", "En Proceso", "Cerrados"],
                datasets: [{
                    data: [stats.abiertos, stats.enProceso, stats.cerrados],
                    backgroundColor: ["#F44336", "#FF9800", "#4CAF50"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom" }
                }
            }
        });
    }

    async _createMonthlyChart(incidents) {
        const monthlyData = {};

        incidents.forEach(incident => {
            const month = DateUtils.format(incident.fechaDeteccion, "MM/YYYY");
            monthlyData[month] = (monthlyData[month] || 0) + 1;
        });

        const months = Object.keys(monthlyData).sort();
        const values = months.map(m => monthlyData[m]);

        const ctx = document.getElementById("chart-monthly").getContext("2d");

        this.charts.monthly = new Chart(ctx, {
            type: "line",
            data: {
                labels: months,
                datasets: [{
                    label: "Incidentes",
                    data: values,
                    borderColor: "#1976D2",
                    backgroundColor: "rgba(25, 118, 210, 0.1)",
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true }
                }
            }
        });
    }

    async _createTopPDVChart() {
        const topPDVs = await incidentModel.getTopProblematicPDV(5);
        const pdvNames = [];
        const pdvCounts = [];

        for (const { pdvId, count } of topPDVs) {
            const pdv = await pdvModel.getById(pdvId);
            pdvNames.push(pdv?.nombre || "N/A");
            pdvCounts.push(count);
        }

        const ctx = document.getElementById("chart-top-pdv").getContext("2d");

        this.charts.topPDV = new Chart(ctx, {
            type: "barH",
            data: {
                labels: pdvNames,
                datasets: [{
                    label: "Incidentes",
                    data: pdvCounts,
                    backgroundColor: "#FF9800"
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    async _showRecentIncidents(incidents) {
        const container = document.getElementById("recent-incidents");

        if (incidents.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay incidentes</p>';
            return;
        }

        let html = '<table style="width: 100%;"><tbody>';

        for (const incident of incidents) {
            const pdv = await pdvModel.getById(incident.pdvId);
            const color = FormatUtils.getStateColor(incident.criticidad);

            html += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px; flex: 1;">
                        <strong>${pdv?.nombre}</strong><br>
                        <small style="color: #999;">${DateUtils.format(incident.fechaDeteccion)}</small>
                    </td>
                    <td style="padding: 10px; width: 200px;">
                        ${FormatUtils.truncate(incident.descripcion, 40)}
                    </td>
                    <td style="padding: 10px; text-align: center; width: 100px;">
                        <span class="badge" style="background-color: ${color}; color: white;">
                            ${incident.criticidad}
                        </span>
                    </td>
                </tr>
            `;
        }

        html += '</tbody></table>';
        container.innerHTML = html;
    }
}

const dashboardView = new DashboardView();
