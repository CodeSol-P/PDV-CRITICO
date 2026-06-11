/**
 * SyncService.js
 * Servicio de sincronización de datos
 * Manejo de conflictos, merging inteligente, auditoría
 */

class SyncService {
    /**
     * Sincronizar con Excel
     */
    static async syncWithExcel(file = null) {
        try {
            eventBus.emit(EVENTS.SYNC_START);

            if (file) {
                // Importar desde Excel
                const result = await ExcelManager.importFromExcel(file);
                
                eventBus.emit(EVENTS.SYNC_SUCCESS, result);
                logger.info("Sincronización completada", result);

                return result;
            } else {
                // Exportar a Excel
                const result = await ExcelManager.exportToExcel();
                
                eventBus.emit(EVENTS.SYNC_SUCCESS, result);
                logger.info("Exportación completada", result);

                return result;
            }
        } catch (error) {
            logger.error("Error en sincronización:", error);
            eventBus.emit(EVENTS.SYNC_ERROR, error);
            throw error;
        }
    }

    /**
     * Exportar datos
     */
    static async exportData() {
        try {
            return await ExcelManager.exportToExcel();
        } catch (error) {
            logger.error("Error exportando datos:", error);
            throw error;
        }
    }

    /**
     * Importar datos
     */
    static async importData(file) {
        try {
            return await ExcelManager.importFromExcel(file);
        } catch (error) {
            logger.error("Error importando datos:", error);
            throw error;
        }
    }

    /**
     * Exportar como JSON
     */
    static async exportJSON() {
        try {
            const data = await db.exportDatabase();
            const json = JSON.stringify(data, null, 2);
            
            FileUtils.downloadJSON(data, `pdvcritico_${DateUtils.format(new Date(), "YYYY-MM-DD_HH-mm")}.json`);
            
            logger.info("Datos exportados como JSON");
            return { success: true };
        } catch (error) {
            logger.error("Error exportando JSON:", error);
            throw error;
        }
    }

    /**
     * Importar desde JSON
     */
    static async importJSON(file) {
        try {
            const text = await FileUtils.readFileAsText(file);
            const data = JSON.parse(text);

            const result = await db.importDatabase(data);

            logger.info("Datos importados desde JSON");
            return { success: true, imported: result };
        } catch (error) {
            logger.error("Error importando JSON:", error);
            throw error;
        }
    }

    /**
     * Exportar como CSV
     */
    static async exportCSV() {
        try {
            const pdvs = await pdvModel.exportList();
            FileUtils.downloadCSV(pdvs, `pdvcritico_pdv_${DateUtils.format(new Date(), "YYYY-MM-DD")}.csv`);

            logger.info("Datos de PDV exportados como CSV");
            return { success: true };
        } catch (error) {
            logger.error("Error exportando CSV:", error);
            throw error;
        }
    }

    /**
     * Obtener resumen de datos
     */
    static async getDataSummary() {
        try {
            const pdvStats = await db.count(APP_CONFIG.stores.pdv);
            const incidentStats = await incidentModel.getStats();
            const actionStats = await actionModel.getStats();
            const evidenceCount = await db.count(APP_CONFIG.stores.evidences);

            const dbSize = await db.getSize();

            return {
                pdvs: pdvStats,
                incidents: incidentStats,
                actions: actionStats,
                evidences: evidenceCount,
                storage: dbSize,
                lastSync: localStorage.getItem("lastSyncTime") || "Nunca"
            };
        } catch (error) {
            logger.error("Error obteniendo resumen:", error);
            return null;
        }
    }

    /**
     * Limpiar todos los datos
     */
    static async clearAllData(confirm = false) {
        if (!confirm) {
            return { success: false, message: "Confirmación requerida" };
        }

        try {
            await db.clearDatabase();
            localStorage.removeItem("lastSyncTime");
            
            eventBus.emit(EVENTS.DATA_CLEARED);
            logger.info("Todos los datos han sido eliminados");

            return { success: true, message: "Datos eliminados correctamente" };
        } catch (error) {
            logger.error("Error limpiando datos:", error);
            throw error;
        }
    }

    /**
     * Crear copia de seguridad
     */
    static async createBackup() {
        try {
            const data = await db.exportDatabase();
            const backup = {
                timestamp: DateUtils.getNow(),
                version: APP_CONFIG.version,
                data: data
            };

            FileUtils.downloadJSON(backup, `backup_${DateUtils.format(new Date(), "YYYY-MM-DD_HH-mm-ss")}.json`);

            logger.info("Copia de seguridad creada");
            return { success: true };
        } catch (error) {
            logger.error("Error creando backup:", error);
            throw error;
        }
    }

    /**
     * Restaurar desde copia de seguridad
     */
    static async restoreFromBackup(file) {
        try {
            const text = await FileUtils.readFileAsText(file);
            const backup = JSON.parse(text);

            if (!backup.data) {
                throw new Error("Formato de backup inválido");
            }

            // Limpiar BD actual
            await db.clearDatabase();

            // Importar datos del backup
            await db.importDatabase(backup.data);

            logger.info("Datos restaurados desde backup");
            return { success: true };
        } catch (error) {
            logger.error("Error restaurando backup:", error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de almacenamiento
     */
    static async getStorageStats() {
        try {
            const dbSize = await db.getSize();
            const evidenceSize = await evidenceModel.getTotalSize();

            return {
                database: dbSize,
                evidences: FileUtils._formatFileSize(evidenceSize),
                percent: dbSize ? dbSize.percentUsed : null
            };
        } catch (error) {
            logger.error("Error obteniendo stats:", error);
            return null;
        }
    }

    /**
     * Registrar sincronización
     */
    static _recordSync() {
        localStorage.setItem("lastSyncTime", DateUtils.getNowFormatted());
    }
}
