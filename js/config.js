/**
 * config.js
 * Configuración global de la aplicación
 * Constantes, enumeraciones y configuración centralizada
 */

const APP_CONFIG = {
    // Información de la aplicación
    app_name: "PDV Crítico",
    version: "1.0.0",
    author: "Grupo Cargo SA",
    
    // IndexedDB
    db_name: "pdvcritico_db",
    db_version: 1,
    
    // Stores (tablas)
    stores: {
        pdv: "pdv",
        incidents: "incidents",
        actions: "actions",
        evidences: "evidences"
    },
    
    // Índices
    indexes: {
        pdv: [
            { name: "codigo", path: "codigo", unique: true },
            { name: "estado", path: "estado" },
            { name: "fechaCreacion", path: "fechaCreacion" }
        ],
        incidents: [
            { name: "pdvId", path: "pdvId" },
            { name: "estado", path: "estado" },
            { name: "criticidad", path: "criticidad" },
            { name: "fechaDeteccion", path: "fechaDeteccion" }
        ],
        actions: [
            { name: "incidenteId", path: "incidenteId" },
            { name: "resultado", path: "resultado" },
            { name: "fechaImplementacion", path: "fechaImplementacion" }
        ],
        evidences: [
            { name: "incidenteId", path: "incidenteId" },
            { name: "fechaCarga", path: "fechaCarga" }
        ]
    }
};

// Enumeraciones
const ENUMS = {
    PDV_STATE: {
        ACTIVO: "Activo",
        INACTIVO: "Inactivo"
    },
    
    INCIDENT_STATE: {
        ABIERTO: "Abierto",
        EN_PROCESO: "En Proceso",
        CERRADO: "Cerrado"
    },
    
    INCIDENT_CATEGORY: {
        HARDWARE: "Hardware",
        SOFTWARE: "Software",
        PROCESOS: "Procesos",
        OTRO: "Otro"
    },
    
    CRITICALITY: {
        ALTA: "Alta",
        MEDIA: "Media",
        BAJA: "Baja"
    },
    
    ACTION_RESULT: {
        EXITOSA: "Exitosa",
        PARCIAL: "Parcial",
        FALLIDA: "Fallida"
    },
    
    TOAST_TYPE: {
        SUCCESS: "success",
        ERROR: "error",
        WARNING: "warning",
        INFO: "info"
    }
};

// Valores por defecto
const DEFAULTS = {
    items_per_page: 10,
    max_image_size: 5 * 1024 * 1024, // 5 MB
    max_images_per_incident: 10,
    date_format: "DD/MM/YYYY",
    datetime_format: "DD/MM/YYYY HH:mm",
    default_currency: "ARS"
};

// Mensajes
const MESSAGES = {
    success: {
        created: "Registro creado exitosamente",
        updated: "Registro actualizado exitosamente",
        deleted: "Registro eliminado exitosamente",
        saved: "Cambios guardados",
        synced: "Sincronización completada"
    },
    error: {
        generic: "Ocurrió un error. Por favor, intenta de nuevo.",
        network: "Error de conexión",
        validation: "Por favor, verifica los datos ingresados",
        not_found: "Registro no encontrado",
        duplicate: "Este registro ya existe",
        invalid_file: "Archivo inválido",
        storage_quota: "Espacio de almacenamiento insuficiente"
    },
    warning: {
        unsaved_changes: "Hay cambios sin guardar",
        confirm_delete: "¿Estás seguro que deseas eliminar este registro?",
        confirm_sync: "Esto sobrescribirá los datos locales. ¿Continuar?"
    },
    info: {
        loading: "Cargando...",
        processing: "Procesando...",
        no_records: "No hay registros"
    }
};

// API endpoints (para futura integración con backend)
const API_ENDPOINTS = {
    base_url: "https://api.pdvcritico.com",
    sync: "/api/sync",
    export: "/api/export",
    import: "/api/import"
};

// Configuración de validaciones
const VALIDATION_RULES = {
    pdv_codigo: {
        required: true,
        minLength: 3,
        maxLength: 50,
        pattern: /^[A-Z0-9-]+$/,
        message: "Código de PDV: letras mayúsculas, números y guión, mín 3 caracteres"
    },
    pdv_nombre: {
        required: true,
        minLength: 5,
        maxLength: 200,
        message: "Nombre del PDV: mínimo 5 caracteres"
    },
    incident_description: {
        required: true,
        minLength: 10,
        maxLength: 1000,
        message: "Descripción: mínimo 10 caracteres"
    },
    email: {
        required: false,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "Email inválido"
    },
    phone: {
        required: false,
        pattern: /^[\d\s()+-]+$/,
        message: "Teléfono inválido"
    }
};

// Usuarios autorizados para acciones críticas (Nuevo PDV y Sincronizar datos)
// Para agregar o modificar usuarios, editar esta lista
const AUTH_USERS = [
    { username: "admin",      password: "cargo2026"  },
    { username: "supervisor", password: "pdv2026"    }
];

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APP_CONFIG, ENUMS, DEFAULTS, MESSAGES, API_ENDPOINTS, VALIDATION_RULES, AUTH_USERS };
}
