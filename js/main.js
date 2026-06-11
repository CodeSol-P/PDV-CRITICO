/**
 * main.js
 * Archivo principal de inicialización de la aplicación
 * Setup, routing, event management
 */

class App {
    constructor() {
        this.currentView = "dashboard";
        this.views = {};
        this.isInitialized = false;
    }

    /**
     * Inicializar aplicación
     */
    async init() {
        try {
            logger.info("Iniciando aplicación PDV Crítico...");

            // Inicializar IndexedDB
            await db.init();
            logger.info("Base de datos inicializada");

            // Configurar eventos globales
            this.setupGlobalEvents();

            // Cargar datos iniciales
            await this.loadInitialData();

            // Configurar navegación
            this.setupNavigation();

            // Renderizar vista inicial
            await this.switchView("dashboard");

            // Cargar interfaz
            await this.renderAll();

            this.isInitialized = true;
            logger.info("Aplicación iniciada correctamente");

            eventBus.emit(EVENTS.LOADING_END);
        } catch (error) {
            logger.error("Error inicializando aplicación:", error);
            this.showError("Error iniciando la aplicación. Por favor, recarga la página.");
        }
    }

    /**
     * Configurar eventos globales
     */
    setupGlobalEvents() {
        // Botón Sync
        const syncBtn = document.getElementById("sync-btn");
        if (syncBtn) {
            syncBtn.addEventListener("click", () => this.openSyncMenu());
        }

        // Botón Configuración
        const settingsBtn = document.getElementById("settings-btn");
        if (settingsBtn) {
            settingsBtn.addEventListener("click", () => this.openSettingsMenu());
        }

        // Escuchar cambios de datos
        eventBus.on(EVENTS.PDV_LIST_CHANGED, () => this.handleDataChange("pdv"));
        eventBus.on(EVENTS.INCIDENT_LIST_CHANGED, () => this.handleDataChange("incident"));
    }

    /**
     * Configurar navegación de tabs
     */
    setupNavigation() {
        const tabs = document.querySelectorAll(".tab-btn");

        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                const view = tab.dataset.view;
                this.switchView(view);
            });
        });
    }

    /**
     * Cambiar vista
     */
    async switchView(viewName) {
        try {
            // Ocultar vista actual
            const currentViewElement = document.querySelector(".view.active");
            if (currentViewElement) {
                currentViewElement.classList.remove("active");
            }

            // Actualizar tab activo
            document.querySelectorAll(".tab-btn").forEach(tab => {
                tab.classList.remove("active");
                if (tab.dataset.view === viewName) {
                    tab.classList.add("active");
                }
            });

            // Mostrar nueva vista
            const viewElement = document.getElementById(`${viewName}-view`);
            if (viewElement) {
                viewElement.classList.add("active");
            }

            // Renderizar vista
            switch (viewName) {
                case "dashboard":
                    await dashboardController?.renderDashboard();
                    break;
                case "pdv":
                    await pdvView?.render();
                    break;
            }

            this.currentView = viewName;
            eventBus.emit(EVENTS.VIEW_CHANGED, { view: viewName });

            logger.info(`Vista cambiada a: ${viewName}`);
        } catch (error) {
            logger.error(`Error cambiando vista a ${viewName}:`, error);
        }
    }

    /**
     * Cargar datos iniciales
     */
    async loadInitialData() {
        try {
            const count = await db.count(APP_CONFIG.stores.pdv);

            if (count === 0) {
                logger.info("Base de datos vacía, cargando datos de demostración...");
                await this.loadDemoData();
            }
        } catch (error) {
            logger.error("Error cargando datos iniciales:", error);
        }
    }

    /**
     * Cargar datos de demostración
     */
    async loadDemoData() {
        try {
            // Crear PDV de demostración
            const pdvs = [
                { codigo: "PDV-001", nombre: "PDV Tucumán Centro", direccion: "Av. Principal 123", responsable: "Juan Pérez", email: "juan@empresa.com", telefono: "+54 381 123 4567", estado: "Activo" },
                { codigo: "PDV-002", nombre: "PDV Tucumán Sur", direccion: "Ruta 9 Km 5", responsable: "María González", email: "maria@empresa.com", telefono: "+54 381 234 5678", estado: "Activo" },
                { codigo: "PDV-003", nombre: "PDV San Miguel", direccion: "Calle 9 de Julio 456", responsable: "Carlos López", estado: "Inactivo" }
            ];

            for (const pdvData of pdvs) {
                await pdvModel.create(pdvData);
            }

            // Crear incidentes de demostración
            const allPDVs = await pdvModel.getAll();
            const incidents = [
                { 
                    pdvId: allPDVs[0].id, 
                    fechaDeteccion: DateUtils.getNow(),
                    descripcion: "Terminal de punto de venta no responde", 
                    categoria: "Hardware", 
                    criticidad: "Alta", 
                    estado: "Abierto", 
                    responsable: "Equipo IT" 
                },
                { 
                    pdvId: allPDVs[0].id, 
                    fechaDeteccion: DateUtils.addDays(new Date(), -2).toISOString(),
                    descripcion: "Problemas de conectividad de red", 
                    categoria: "Procesos", 
                    criticidad: "Media", 
                    estado: "En Proceso", 
                    responsable: "Soporte Técnico" 
                }
            ];

            for (const incidentData of incidents) {
                await incidentModel.create(incidentData);
            }

            logger.info("Datos de demostración cargados");
        } catch (error) {
            logger.error("Error cargando datos de demostración:", error);
        }
    }

    /**
     * Renderizar todas las vistas
     */
    async renderAll() {
        try {
            await pdvView.render();
            // Las otras vistas se renderizarán cuando se carguen
        } catch (error) {
            logger.error("Error renderizando vistas:", error);
        }
    }

    /**
     * Manejar cambios de datos
     */
    async handleDataChange(type) {
        try {
            // Re-renderizar vista actual si es relevante
            if (this.currentView === "pdv" && type === "pdv") {
                await pdvView.render();
            } else if (this.currentView === "incidents" && type === "incident") {
                if (incidentView) await incidentView.render();
            } else if (this.currentView === "dashboard") {
                if (dashboardController) await dashboardController.renderDashboard();
            }
        } catch (error) {
            logger.error("Error en handleDataChange:", error);
        }
    }

    /**
     * Abrir menú de sincronización
     */
    openSyncMenu() {
        const html = `
            <div style="padding: 20px;">
                <div class="mb-lg">
                    <h4>Importar/Exportar Datos</h4>
                    <p style="color: #666; margin-bottom: 15px;">Sincroniza tus datos con archivos Excel o JSON</p>
                    
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <label style="cursor: pointer; padding: 15px; border: 2px solid #1976D2; border-radius: 8px; text-align: center; background: #E3F2FD;">
                            <input type="file" accept=".xlsx" id="import-excel" style="display: none;">
                            <span class="material-icons" style="vertical-align: middle; margin-right: 5px;">upload_file</span>
                            <span>Importar desde Excel</span>
                        </label>
                        
                        <button class="btn btn-primary" style="width: 100%;" onclick="syncService.exportData().catch(e => console.error(e))">
                            <span class="material-icons">download</span>
                            Descargar Excel
                        </button>

                        <button class="btn btn-secondary" style="width: 100%;" onclick="syncService.exportJSON().catch(e => console.error(e))">
                            <span class="material-icons">download</span>
                            Exportar JSON
                        </button>

                        <button class="btn btn-secondary" style="width: 100%;" onclick="syncService.createBackup().catch(e => console.error(e))">
                            <span class="material-icons">backup</span>
                            Crear Backup
                        </button>
                    </div>
                </div>
                
                <div style="border-top: 1px solid #ddd; padding-top: 15px;">
                    <h4>Información de Almacenamiento</h4>
                    <div id="storage-info" style="font-size: 12px; color: #666; line-height: 1.8;">
                        <p>Cargando...</p>
                    </div>
                </div>
            </div>
        `;

        const modal = ModalView.openInfo("Sincronización", html);

        // Cargar estadísticas
        SyncService.getDataSummary().then(summary => {
            if (summary) {
                const storageInfo = document.getElementById("storage-info");
                if (storageInfo) {
                    let html = `
                        <p><strong>PDV:</strong> ${summary.pdvs}</p>
                        <p><strong>Incidentes:</strong> ${summary.incidents.total}</p>
                        <p><strong>Acciones:</strong> ${summary.actions.total}</p>
                        <p><strong>Evidencias:</strong> ${summary.evidences}</p>
                    `;

                    if (summary.storage) {
                        html += `<p><strong>Almacenamiento usado:</strong> ${FileUtils._formatFileSize(summary.storage.used)} / ${FileUtils._formatFileSize(summary.storage.quota)} (${summary.storage.percentUsed}%)</p>`;
                    }

                    storageInfo.innerHTML = html;
                }
            }
        });

        // Listener para archivo de importación
        const importInput = modal.getElement("#import-excel");
        if (importInput) {
            importInput.addEventListener("change", async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        await SyncService.importData(file);
                        pdvView.showToast("Datos importados exitosamente", "success");
                        modal.close();
                        await this.renderAll();
                    } catch (error) {
                        pdvView.showToast("Error importando datos", "error");
                    }
                }
            });
        }
    }

    /**
     * Abrir menú de configuración
     */
    openSettingsMenu() {
        const html = `
            <div style="padding: 20px;">
                <div class="mb-lg">
                    <h4>Configuración General</h4>
                    <ul style="list-style: none; padding: 0;">
                        <li style="padding: 10px 0; border-bottom: 1px solid #eee;">
                            <strong>Versión:</strong> ${APP_CONFIG.version}
                        </li>
                        <li style="padding: 10px 0; border-bottom: 1px solid #eee;">
                            <strong>Base de Datos:</strong> ${APP_CONFIG.db_name}
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 style="color: #F44336;">Zona de Peligro</h4>
                    <p style="color: #666; margin-bottom: 15px; font-size: 12px;">Estas acciones no se pueden deshacer</p>
                    
                    <button class="btn btn-danger" style="width: 100%; margin-bottom: 10px;" id="clear-all-btn">
                        <span class="material-icons">delete_sweep</span>
                        Limpiar todos los datos
                    </button>
                </div>
            </div>
        `;

        const modal = ModalView.openInfo("Configuración", html);

        const clearBtn = modal.getElement("#clear-all-btn");
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                modal.close();
                ModalView.openConfirm(
                    "Limpiar todos los datos",
                    "¿Estás ABSOLUTAMENTE seguro? Esta acción eliminará toda la información de la aplicación y no se puede deshacer.",
                    async () => {
                        try {
                            await SyncService.clearAllData(true);
                            pdvView.showToast("Todos los datos han sido eliminados", "warning");
                            location.reload();
                        } catch (error) {
                            pdvView.showToast("Error limpiando datos", "error");
                        }
                    }
                );
            });
        }
    }

    /**
     * Mostrar error
     */
    showError(message) {
        const overlay = document.getElementById("loading-overlay");
        if (overlay) {
            overlay.innerHTML = `
                <div style="text-align: center; color: #F44336;">
                    <span class="material-icons" style="font-size: 60px; margin-bottom: 20px;">error</span>
                    <p style="font-size: 18px; font-weight: bold; margin: 20px 0;">${message}</p>
                </div>
            `;
            overlay.classList.add("active");
        }
    }
}

// Instancia global
const app = new App();

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    app.init();
});

// Referencia global para syncService (usada en HTML)
const syncService = SyncService;
