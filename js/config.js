/**
 * config.js
 * Configuración global de la aplicación PDV Crítico
 */

const APP_CONFIG = {
    app_name:   "PDV Crítico",
    version:    "2.0.0",
    author:     "Grupo Cargo SA",

    // ── Supabase ── Reemplazá estos valores con los de tu proyecto ──────────
    supabase_url:      'https://sb_publishable_wmcgbDtL8PFuGf4OmiKl1g_m76jE35P.supabase.co',
    supabase_anon_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYW5heHNuc3N2bm5naGd3c2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzA2ODcsImV4cCI6MjA5NzIwNjY4N30.qtyFBBDPGZhNz_v0KYIMNv1ixT_jN4iSCAZksLwm0vs',
    // ────────────────────────────────────────────────────────────────────────

    // (ya no se usa IndexedDB, estas claves quedan por compatibilidad)
    db_name:    "pdvcritico_visitas_db",
    db_version: 1,

    stores: {
        visitas: "visitas"
    },

    indexes: {
        visitas: [
            { name: "nroCliente",  path: "nroCliente"  },
            { name: "nombrePDV",   path: "nombrePDV"   },
            { name: "fechaVisita", path: "fechaVisita" }
        ]
    }
};

const ENUMS = {
    TOAST_TYPE: {
        SUCCESS: "success",
        ERROR:   "error",
        WARNING: "warning",
        INFO:    "info"
    }
};

const DEFAULTS = {
    date_format: "DD/MM/YYYY"
};

const MESSAGES = {
    success: {
        created:  "Registro creado exitosamente",
        updated:  "Registro actualizado exitosamente",
        deleted:  "Registro eliminado exitosamente",
        imported: "Datos importados exitosamente",
        exported: "Archivo exportado exitosamente"
    },
    error: {
        generic:      "Ocurrió un error. Por favor, intentá de nuevo.",
        validation:   "Por favor, verificá los datos ingresados",
        not_found:    "Registro no encontrado",
        invalid_file: "Archivo inválido. Usá un archivo .xlsx o .xls"
    }
};

// Usuarios autorizados para acciones protegidas (Nuevo Registro e Importar Excel)
// Editá esta lista para agregar o quitar usuarios
const AUTH_USERS = [
    { username: "admin",      password: "cargo2026" },
    { username: "supervisor", password: "pdv2026"   }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APP_CONFIG, ENUMS, DEFAULTS, MESSAGES, AUTH_USERS };
}
