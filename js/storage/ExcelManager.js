/**
 * ExcelManager.js
 * Gestión de lectura/escritura de archivos Excel
 * Sincronización bidireccional con archivos .xlsx
 */

class ExcelManager {
    /**
     * Exportar datos a Excel
     */
    static async exportToExcel() {
        try {
            eventBus.emit(EVENTS.LOADING_START);

            // Obtener datos de todos los modelos
            const pdvs = await pdvModel.getAll();
            const incidents = await incidentModel.getAll();
            const actions = await actionModel.getAll();
            const evidences = await evidenceModel.getAll();

            // Crear libro de trabajo
            const wb = XLSX.utils.book_new();

            // Hojas de datos
            const pdvSheet = XLSX.utils.json_to_sheet(this._preparePDVData(pdvs));
            const incidentSheet = XLSX.utils.json_to_sheet(this._prepareIncidentData(incidents));
            const actionSheet = XLSX.utils.json_to_sheet(this._prepareActionData(actions));
            const evidenceSheet = XLSX.utils.json_to_sheet(this._prepareEvidenceData(evidences));

            // Configurar ancho de columnas
            this._setColumnWidths(pdvSheet, [15, 25, 30, 20, 20, 15, 12, 18]);
            this._setColumnWidths(incidentSheet, [15, 25, 18, 15, 12, 15, 12, 15, 30, 18]);
            this._setColumnWidths(actionSheet, [20, 30, 18, 20, 12, 30, 18]);
            this._setColumnWidths(evidenceSheet, [15, 30, 30, 18, 12]);

            // Agregar hojas al libro
            XLSX.utils.book_append_sheet(wb, pdvSheet, "Puntos de Venta");
            XLSX.utils.book_append_sheet(wb, incidentSheet, "Incidentes");
            XLSX.utils.book_append_sheet(wb, actionSheet, "Acciones");
            XLSX.utils.book_append_sheet(wb, evidenceSheet, "Evidencias");

            // Generar nombre de archivo
            const filename = `pdvcritico_${DateUtils.format(new Date(), "YYYY-MM-DD_HH-mm")}.xlsx`;

            // Descargar archivo
            XLSX.writeFile(wb, filename);

            logger.info("Archivo Excel exportado:", filename);
            eventBus.emit(EVENTS.DATA_EXPORTED, { filename, records: pdvs.length + incidents.length });
            eventBus.emit(EVENTS.LOADING_END);

            return { success: true, filename };
        } catch (error) {
            logger.error("Error exportando Excel:", error);
            eventBus.emit(EVENTS.LOADING_END);
            throw error;
        }
    }

    /**
     * Importar datos desde Excel
     */
    static async importFromExcel(file) {
        try {
            eventBus.emit(EVENTS.LOADING_START);

            const workbook = await this._readExcelFile(file);

            let imported = {
                pdvs: 0,
                incidents: 0,
                actions: 0,
                evidences: 0
            };

            // Procesar hoja de PDV
            if (workbook.Sheets["Puntos de Venta"]) {
                const pdvData = XLSX.utils.sheet_to_json(workbook.Sheets["Puntos de Venta"]);
                imported.pdvs = await this._importPDVData(pdvData);
            }

            // Procesar hoja de Incidentes
            if (workbook.Sheets["Incidentes"]) {
                const incidentData = XLSX.utils.sheet_to_json(workbook.Sheets["Incidentes"]);
                imported.incidents = await this._importIncidentData(incidentData);
            }

            // Procesar hoja de Acciones
            if (workbook.Sheets["Acciones"]) {
                const actionData = XLSX.utils.sheet_to_json(workbook.Sheets["Acciones"]);
                imported.actions = await this._importActionData(actionData);
            }

            logger.info("Datos importados desde Excel:", imported);
            eventBus.emit(EVENTS.DATA_IMPORTED, imported);
            eventBus.emit(EVENTS.LOADING_END);

            return { success: true, imported };
        } catch (error) {
            logger.error("Error importando Excel:", error);
            eventBus.emit(EVENTS.LOADING_END);
            throw error;
        }
    }

    /**
     * Leer archivo Excel
     */
    static _readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: "array" });
                    resolve(workbook);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error("Error leyendo archivo"));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Preparar datos de PDV para exportar
     */
    static _preparePDVData(pdvs) {
        return pdvs.map(pdv => ({
            "Código": pdv.codigo,
            "Nombre": pdv.nombre,
            "Dirección": pdv.direccion,
            "Responsable": pdv.responsable,
            "Email": pdv.email,
            "Teléfono": pdv.telefono,
            "Estado": pdv.estado,
            "Fecha Creación": DateUtils.format(pdv.fechaCreacion)
        }));
    }

    /**
     * Preparar datos de Incidentes para exportar
     */
    static _prepareIncidentData(incidents) {
        return incidents.map(incident => ({
            "ID PDV": incident.pdvId,
            "Fecha Detección": DateUtils.format(incident.fechaDeteccion),
            "Descripción": incident.descripcion,
            "Categoría": incident.categoria,
            "Criticidad": incident.criticidad,
            "Estado": incident.estado,
            "Responsable": incident.responsable,
            "Comentarios": incident.comentarios,
            "Fecha Actualización": DateUtils.format(incident.fechaActualizacion)
        }));
    }

    /**
     * Preparar datos de Acciones para exportar
     */
    static _prepareActionData(actions) {
        return actions.map(action => ({
            "ID Incidente": action.incidenteId,
            "Descripción": action.descripcion,
            "Fecha Implementación": DateUtils.format(action.fechaImplementacion),
            "Responsable": action.responsable,
            "Resultado": action.resultado,
            "Observaciones": action.observaciones
        }));
    }

    /**
     * Preparar datos de Evidencias para exportar
     */
    static _prepareEvidenceData(evidences) {
        return evidences.map(evidence => ({
            "ID Incidente": evidence.incidenteId,
            "Nombre": evidence.nombre,
            "Descripción": evidence.descripcion,
            "Fecha Carga": DateUtils.format(evidence.fechaCarga),
            "Orden": evidence.orden
        }));
    }

    /**
     * Importar datos de PDV
     */
    static async _importPDVData(data) {
        let count = 0;

        for (const row of data) {
            try {
                if (!row["Código"] || !row["Nombre"]) continue;

                await pdvModel.create({
                    codigo: row["Código"],
                    nombre: row["Nombre"],
                    direccion: row["Dirección"] || "",
                    responsable: row["Responsable"] || "",
                    email: row["Email"] || "",
                    telefono: row["Teléfono"] || "",
                    estado: row["Estado"] || ENUMS.PDV_STATE.ACTIVO
                });

                count++;
            } catch (error) {
                logger.warn("Error importando PDV:", error);
            }
        }

        return count;
    }

    /**
     * Importar datos de Incidentes
     */
    static async _importIncidentData(data) {
        let count = 0;

        for (const row of data) {
            try {
                if (!row["ID PDV"] || !row["Descripción"]) continue;

                await incidentModel.create({
                    pdvId: row["ID PDV"],
                    fechaDeteccion: new Date(row["Fecha Detección"]).toISOString(),
                    descripcion: row["Descripción"],
                    categoria: row["Categoría"] || ENUMS.INCIDENT_CATEGORY.OTRO,
                    criticidad: row["Criticidad"] || ENUMS.CRITICALITY.MEDIA,
                    estado: row["Estado"] || ENUMS.INCIDENT_STATE.ABIERTO,
                    responsable: row["Responsable"] || "",
                    comentarios: row["Comentarios"] || ""
                });

                count++;
            } catch (error) {
                logger.warn("Error importando Incidente:", error);
            }
        }

        return count;
    }

    /**
     * Importar datos de Acciones
     */
    static async _importActionData(data) {
        let count = 0;

        for (const row of data) {
            try {
                if (!row["ID Incidente"] || !row["Descripción"]) continue;

                await actionModel.create({
                    incidenteId: row["ID Incidente"],
                    descripcion: row["Descripción"],
                    fechaImplementacion: new Date(row["Fecha Implementación"]).toISOString(),
                    responsable: row["Responsable"] || "",
                    resultado: row["Resultado"] || ENUMS.ACTION_RESULT.EXITOSA,
                    observaciones: row["Observaciones"] || ""
                });

                count++;
            } catch (error) {
                logger.warn("Error importando Acción:", error);
            }
        }

        return count;
    }

    /**
     * Establecer ancho de columnas
     */
    static _setColumnWidths(sheet, widths) {
        sheet["!cols"] = widths.map(w => ({ wch: w }));
    }
}
