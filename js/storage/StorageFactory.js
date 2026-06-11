/**
 * StorageFactory.js
 * Factory pattern para instanciar servicios de almacenamiento
 */

class StorageFactory {
    static getInstance() {
        return db;
    }

    static getExcelManager() {
        return ExcelManager;
    }

    static getSyncService() {
        return SyncService;
    }
}
