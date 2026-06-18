/**
 * main.js
 * Inicialización de la aplicación PDV Crítico v2
 */

class App {
    constructor() {
        this.isInitialized = false;
    }

    async init() {
        try {
            logger.info('Iniciando PDV Crítico v2...');

            await db.init();
            logger.info('Base de datos lista');

            this._setupButtons();
            this._setupTabs();

            await visitaView.render();

            this.isInitialized = true;
            logger.info('Aplicación lista');

        } catch (error) {
            console.error('[PDV Crítico] Error completo:', error);
            const msg = (error && error.message) ? error.message : String(error);
            logger.error('Error iniciando la aplicación:', msg);
            this._showInitError(msg || 'Error desconocido al conectar con la base de datos');
        } finally {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) overlay.classList.remove('active');
        }
    }

    // ── Tabs ───────────────────────────────────────────────────────────────────

    _setupTabs() {
        const tabRegistros = document.getElementById('tab-registros');
        const tabDashboard = document.getElementById('tab-dashboard');

        if (tabRegistros) tabRegistros.addEventListener('click', () => this._switchTab('registros'));
        if (tabDashboard) tabDashboard.addEventListener('click', () => this._switchTab('dashboard'));
    }

    _switchTab(name) {
        ['registros', 'dashboard'].forEach(t => {
            const btn = document.getElementById(`tab-${t}`);
            if (btn) btn.classList.toggle('active', t === name);
        });

        const viewRegistros = document.getElementById('visitas-view');
        const viewDashboard = document.getElementById('dashboard-view');
        if (viewRegistros) viewRegistros.classList.toggle('active', name === 'registros');
        if (viewDashboard) viewDashboard.classList.toggle('active', name === 'dashboard');

        const toolbar = document.getElementById('toolbar-registros');
        if (toolbar) toolbar.style.display = name === 'registros' ? '' : 'none';

        if (name === 'dashboard') {
            dashboardController.renderDashboard();
        }
    }

    // ── Botones ────────────────────────────────────────────────────────────────

    _setupButtons() {

        // ── Nuevo Registro (requiere auth) ─────────────────────────────────────
        const btnAdd = document.getElementById('btn-add-visita');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                authService.requireAuth('Nuevo Registro', () => eventBus.emit('visita:create'));
            });
        }

        // ── Exportar Excel ───────────────────────────────────────────────────
        const btnExport = document.getElementById('btn-export');
        if (btnExport) {
            btnExport.addEventListener('click', async () => {
                const all = await visitaModel.getAll();
                if (all.length === 0) {
                    toastManager.show('No hay registros para exportar', 'warning');
                    return;
                }
                const { filename, records } = ExcelManager.exportToExcel(all);
                toastManager.show(`${records} registros exportados como ${filename}`, 'success');
            });
        }

        // ── Búsqueda en tiempo real ───────────────────────────────────────────
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(async () => {
                    const query = e.target.value.trim().toLowerCase();

                    if (!query) {
                        await visitaView.render();
                        return;
                    }

                    const all      = await visitaModel.getAll();
                    const filtered = all.filter(v => {
                        const estadoLabel = v.estado === 'cerrado' ? 'cerrado' : 'en progreso';
                        return (
                            (v.nroCliente    || '').toLowerCase().includes(query) ||
                            (v.nombrePDV     || '').toLowerCase().includes(query) ||
                            (v.direccion     || '').toLowerCase().includes(query) ||
                            (v.inconveniente || '').toLowerCase().includes(query) ||
                            (v.soluciones    || '').toLowerCase().includes(query) ||
                            estadoLabel.includes(query)
                        );
                    });

                    await visitaView.render(filtered);
                }, 200);
            });
        }
    }

    _showInitError(message) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.innerHTML = `
                <div style="text-align:center; color:#F44336; padding:40px;">
                    <span class="material-icons" style="font-size:64px;">error_outline</span>
                    <p style="font-size:18px; font-weight:bold; margin:20px 0;">
                        Error al iniciar la aplicación
                    </p>
                    <p style="color:#999;">${message || 'Por favor, recargá la página.'}</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top:20px;">
                        Recargar
                    </button>
                </div>
            `;
            overlay.classList.add('active');
        }
    }
}

const app = new App();

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
