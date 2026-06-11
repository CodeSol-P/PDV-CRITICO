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

            // Inicializar IndexedDB
            await db.init();
            logger.info('Base de datos lista');

            // Conectar botones
            this._setupButtons();

            // Renderizar tabla inicial
            await visitaView.render();

            this.isInitialized = true;
            logger.info('Aplicación lista');

        } catch (error) {
            logger.error('Error iniciando la aplicación:', error);
            this._showInitError(error.message);
        } finally {
            // Ocultar spinner inicial
            const overlay = document.getElementById('loading-overlay');
            if (overlay) overlay.classList.remove('active');
        }
    }

    _setupButtons() {

        // ── Nuevo Registro (requiere auth) ─────────────────────────────────────
        const btnAdd = document.getElementById('btn-add-visita');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                authService.requireAuth('Nuevo Registro', () => eventBus.emit('visita:create'));
            });
        }

        // ── Importar Excel (requiere auth) ────────────────────────────────────
        const btnImport  = document.getElementById('btn-import');
        const fileInput  = document.getElementById('file-import-excel');

        if (btnImport && fileInput) {
            btnImport.addEventListener('click', () => {
                authService.requireAuth('Importar Excel', () => fileInput.click());
            });

            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    visitaView.showLoading();

                    const { visitas, errors } = await ExcelManager.importFromExcel(file);

                    let imported = 0;
                    for (const v of visitas) {
                        try {
                            await visitaModel.create(v);
                            imported++;
                        } catch (err) {
                            logger.warn('Error importando fila:', err);
                        }
                    }

                    await visitaView.render();

                    if (imported > 0) {
                        visitaView.showToast(
                            `${imported} registro${imported !== 1 ? 's' : ''} importado${imported !== 1 ? 's' : ''} correctamente`,
                            'success'
                        );
                    } else {
                        visitaView.showToast(
                            'No se importaron registros. Verificá el formato del archivo.',
                            'warning'
                        );
                    }

                    if (errors.length > 0) {
                        logger.warn('Filas omitidas durante importación:', errors);
                        visitaView.showToast(
                            `${errors.length} fila${errors.length !== 1 ? 's omitidas' : ' omitida'} (sin cliente ni PDV)`,
                            'warning'
                        );
                    }

                } catch (error) {
                    logger.error('Error importando Excel:', error);
                    visitaView.showToast(error.message || 'Error al importar el archivo', 'error');
                } finally {
                    visitaView.hideLoading();
                    fileInput.value = ''; // Permitir volver a importar el mismo archivo
                }
            });
        }

        // ── Exportar Excel (sin auth) ─────────────────────────────────────────
        const btnExport = document.getElementById('btn-export');
        if (btnExport) {
            btnExport.addEventListener('click', async () => {
                try {
                    visitaView.showLoading();
                    const visitas = await visitaModel.getAll();

                    if (visitas.length === 0) {
                        visitaView.showToast('No hay registros para exportar', 'warning');
                        return;
                    }

                    const { filename, records } = ExcelManager.exportToExcel(visitas);
                    visitaView.showToast(
                        `${records} registro${records !== 1 ? 's' : ''} exportado${records !== 1 ? 's' : ''} → ${filename}`,
                        'success'
                    );
                } catch (error) {
                    logger.error('Error exportando:', error);
                    visitaView.showToast('Error al exportar', 'error');
                } finally {
                    visitaView.hideLoading();
                }
            });
        }

        // ── Descargar Plantilla (sin auth) ───────────────────────────────────
        const btnTemplate = document.getElementById('btn-template');
        if (btnTemplate) {
            btnTemplate.addEventListener('click', () => {
                try {
                    ExcelManager.downloadTemplate();
                    visitaView.showToast('Plantilla descargada', 'info');
                } catch (error) {
                    visitaView.showToast('Error al descargar la plantilla', 'error');
                }
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
                    const filtered = all.filter(v =>
                        (v.nroCliente    || '').toLowerCase().includes(query) ||
                        (v.nombrePDV     || '').toLowerCase().includes(query) ||
                        (v.direccion     || '').toLowerCase().includes(query) ||
                        (v.inconveniente || '').toLowerCase().includes(query) ||
                        (v.soluciones    || '').toLowerCase().includes(query)
                    );

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
