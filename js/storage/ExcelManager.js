/**
 * ExcelManager.js
 * Importación y exportación de Excel para registros de visitas PDV.
 *
 * Columnas soportadas en importación (insensible a mayúsculas/minúsculas y espacios):
 *   Nro. Cliente / Número de Cliente / Cliente / ...
 *   Nombre PDV / Nombre del Punto de Venta / ...
 *   Dirección / Domicilio / ...
 *   Inconveniente Ocurrido / Inconveniente / Problema / ...
 *   Soluciones / Solución / Resolución / ...
 *   Fecha Visita / Fecha / ... (opcional, por defecto hoy)
 */

class ExcelManager {

    // Mapa de variantes de nombres de columna → campo interno
    static get COLUMN_MAP() {
        return {
            // Nro. Cliente
            'nro. cliente':          'nroCliente',
            'nro cliente':           'nroCliente',
            'numero de cliente':     'nroCliente',
            'número de cliente':     'nroCliente',
            'numero cliente':        'nroCliente',
            'número cliente':        'nroCliente',
            'nro.cliente':           'nroCliente',
            'nrocliente':            'nroCliente',
            'cliente':               'nroCliente',
            'cod. cliente':          'nroCliente',
            'cod cliente':           'nroCliente',
            'codigo cliente':        'nroCliente',
            'código cliente':        'nroCliente',

            // Nombre PDV
            'nombre pdv':                              'nombrePDV',
            'nombre del pdv':                          'nombrePDV',
            'nombre del punto de venta':               'nombrePDV',
            'nombre del numero de punto de venta':     'nombrePDV',
            'nombre del número de punto de venta':     'nombrePDV',
            'nombrepdv':                               'nombrePDV',
            'pdv':                                     'nombrePDV',
            'nombre':                                  'nombrePDV',
            'punto de venta':                          'nombrePDV',
            'razon social':                            'nombrePDV',
            'razón social':                            'nombrePDV',

            // Dirección
            'direccion':   'direccion',
            'dirección':   'direccion',
            'domicilio':   'direccion',
            'dir.':        'direccion',
            'dir':         'direccion',
            'calle':       'direccion',

            // Inconveniente
            'inconveniente':          'inconveniente',
            'inconveniente ocurrido': 'inconveniente',
            'inconvenientes':         'inconveniente',
            'problema':               'inconveniente',
            'problemas':              'inconveniente',
            'incidente':              'inconveniente',
            'descripcion':            'inconveniente',
            'descripción':            'inconveniente',
            'detalle':                'inconveniente',

            // Soluciones
            'solucion':    'soluciones',
            'solución':    'soluciones',
            'soluciones':  'soluciones',
            'resolucion':  'soluciones',
            'resolución':  'soluciones',
            'accion':      'soluciones',
            'acción':      'soluciones',
            'acciones':    'soluciones',
            'observacion': 'soluciones',
            'observación': 'soluciones',

            // Fecha
            'fecha':            'fechaVisita',
            'fecha visita':     'fechaVisita',
            'fecha de visita':  'fechaVisita',
            'fecha_visita':     'fechaVisita',
        };
    }

    /**
     * Importar visitas desde un archivo Excel.
     * @param {File} file
     * @returns {{ visitas: Array, errors: string[] }}
     */
    static importFromExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });

                    // Usar la primera hoja disponible
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                    const visitas = [];
                    const errors  = [];

                    rows.forEach((row, idx) => {
                        // Omitir filas completamente vacías
                        const hasContent = Object.values(row).some(v => String(v).trim() !== '');
                        if (!hasContent) return;

                        const mapped = ExcelManager._mapRow(row);

                        if (!mapped.nroCliente && !mapped.nombrePDV) {
                            errors.push(`Fila ${idx + 2}: sin número de cliente ni nombre de PDV — omitida`);
                            return;
                        }

                        visitas.push(mapped);
                    });

                    resolve({ visitas, errors });
                } catch (err) {
                    reject(new Error('No se pudo leer el archivo. Verificá que sea un Excel válido (.xlsx / .xls).'));
                }
            };

            reader.onerror = () => reject(new Error('Error leyendo el archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Mapea una fila del Excel a los campos internos de visita.
     */
    static _mapRow(row) {
        const result = {
            nroCliente:    '',
            nombrePDV:     '',
            direccion:     '',
            inconveniente: '',
            soluciones:    '',
            fechaVisita:   '',
        };

        for (const [col, value] of Object.entries(row)) {
            const key = ExcelManager.COLUMN_MAP[col.toLowerCase().trim()];
            if (key && value !== undefined && value !== null && value !== '') {
                result[key] = String(value).trim();
            }
        }

        // Normalizar fecha de visita
        if (result.fechaVisita) {
            let parsed;
            // SheetJS puede devolver un objeto Date si cellDates:true
            if (result.fechaVisita instanceof Date) {
                parsed = result.fechaVisita;
            } else {
                // Intentar parsear string (varios formatos)
                const raw = String(result.fechaVisita).trim();
                // DD/MM/YYYY → YYYY-MM-DD para que Date() lo entienda
                const ddmmyyyy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
                if (ddmmyyyy) {
                    parsed = new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2,'0')}-${ddmmyyyy[1].padStart(2,'0')}`);
                } else {
                    parsed = new Date(raw);
                }
            }
            result.fechaVisita = isNaN(parsed) ? new Date().toISOString() : parsed.toISOString();
        } else {
            result.fechaVisita = new Date().toISOString();
        }

        return result;
    }

    /**
     * Exportar todas las visitas a un archivo Excel.
     * @param {Array} visitas
     */
    static exportToExcel(visitas) {
        const data = visitas.map(v => ({
            'Nro. Cliente':           v.nroCliente    || '',
            'Nombre PDV':             v.nombrePDV     || '',
            'Dirección':              v.direccion     || '',
            'Inconveniente Ocurrido': v.inconveniente || '',
            'Soluciones':             v.soluciones    || '',
            'Fecha Visita':           v.fechaVisita
                                        ? DateUtils.format(v.fechaVisita)
                                        : '',
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [
            { wch: 15 }, // Nro. Cliente
            { wch: 25 }, // Nombre PDV
            { wch: 30 }, // Dirección
            { wch: 45 }, // Inconveniente
            { wch: 45 }, // Soluciones
            { wch: 14 }, // Fecha
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Visitas PDV');

        const filename = `visitas_pdv_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, filename);

        return { filename, records: visitas.length };
    }

    /**
     * Descargar plantilla Excel con las columnas correctas y una fila de ejemplo.
     */
    static downloadTemplate() {
        const data = [{
            'Nro. Cliente':           '12345',
            'Nombre PDV':             'PDV Tucumán Centro',
            'Dirección':              'Av. Principal 123, Tucumán',
            'Inconveniente Ocurrido': 'Descripción del inconveniente ocurrido en el punto de venta',
            'Soluciones':             'Acciones realizadas para resolver el inconveniente',
            'Fecha Visita':           DateUtils.format(new Date()),
        }];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [
            { wch: 15 },
            { wch: 25 },
            { wch: 30 },
            { wch: 45 },
            { wch: 45 },
            { wch: 14 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Visitas PDV');
        XLSX.writeFile(wb, 'plantilla_visitas_pdv.xlsx');
    }
}
