# 📁 Estructura del Proyecto PDV Crítico

```
PDV CRITICO/
├── index.html                          # Página principal
├── README.md                           # Documentación de usuario
│
├── css/
│   ├── variables.css                  # Tokens de diseño (colores, spacing, etc)
│   ├── styles.css                     # Estilos de componentes
│   └── responsive.css                 # Media queries y responsive
│
├── js/
│   ├── config.js                      # Configuración global y enums
│   ├── main.js                        # Inicialización de aplicación
│   │
│   ├── utils/
│   │   ├── Logger.js                 # Sistema de logging
│   │   ├── DateUtils.js              # Funciones de fecha (español)
│   │   ├── FileUtils.js              # Manejo de archivos y base64
│   │   ├── ValidationUtils.js        # Validación de formularios
│   │   └── FormatUtils.js            # Formateo de datos (moneda, texto, etc)
│   │
│   ├── storage/
│   │   ├── IndexedDBManager.js       # Gestor de BD local (CRUD + índices)
│   │   ├── ExcelManager.js           # Import/export Excel
│   │   ├── SyncService.js            # Servicio de sincronización
│   │   └── StorageFactory.js         # Factory pattern para instancias
│   │
│   ├── models/
│   │   ├── BaseModel.js              # Clase padre para todos los modelos
│   │   ├── PDVModel.js               # Modelo de Puntos de Venta
│   │   ├── IncidentModel.js          # Modelo de Incidentes
│   │   ├── ActionModel.js            # Modelo de Acciones Correctivas
│   │   └── EvidenceModel.js          # Modelo de Evidencias (imágenes)
│   │
│   ├── services/
│   │   └── EventBus.js               # Pub/Sub para comunicación
│   │
│   ├── views/
│   │   ├── BaseView.js               # Clase padre para todas las vistas
│   │   ├── ModalView.js              # Componente modal reutilizable
│   │   ├── PDVView.js                # Vista de lista de PDV
│   │   ├── IncidentView.js           # Vista de lista de Incidentes
│   │   ├── ActionView.js             # Vista de lista de Acciones
│   │   └── DashboardView.js          # Vista del Dashboard analítico
│   │
│   └── controllers/
│       ├── PDVController.js          # Controlador de PDV (CRUD)
│       ├── IncidentController.js     # Controlador de Incidentes (CRUD)
│       ├── ActionController.js       # Controlador de Acciones (CRUD)
│       └── DashboardController.js    # Controlador de Dashboard
│
└── lib/                                # Librerías externas (CDN)
    └── (Ver líneas de script en index.html)
```

## 📊 Diagrama de Relaciones

```
PDV (1)
  ├──→ (N) Incidentes
  │        └──→ (N) Evidencias
  │        └──→ (N) Acciones
  │
Incidente (1)
  ├──→ (N) Evidencias (fotos del problema)
  └──→ (N) Acciones (soluciones implementadas)

Acción (1)
  └──→ (1) Incidente
```

## 🔄 Flujo de Datos

```
Usuario interactúa con Vista
  ↓
Vista emite evento (EventBus)
  ↓
Controlador escucha evento
  ↓
Controlador llama a Modelo
  ↓
Modelo persiste en IndexedDB
  ↓
Modelo emite evento
  ↓
Vista se actualiza automáticamente
```

## 📝 Enumeraciones Disponibles

### Estados de PDV
- `Activo`
- `Inactivo`

### Estados de Incidente
- `Abierto`
- `En Proceso`
- `Cerrado`

### Criticidad
- `Alta`
- `Media`
- `Baja`

### Categoría de Incidente
- `Hardware`
- `Software`
- `Procesos`
- `Otro`

### Resultado de Acción
- `Exitosa`
- `Parcial`
- `Fallida`

## 🔐 Almacenamiento

### IndexedDB Stores
- `pdv` - Puntos de Venta
- `incidents` - Incidentes
- `actions` - Acciones
- `evidences` - Evidencias (Base64)

### Capacidad
- Máximo 50 MB por dominio
- Datos persisten hasta que usuario limpie el navegador
- Backup automático con JSON

## 🎨 Diseño

### Colores Principales
- Primary: `#1976D2` (Azul)
- Secondary: `#757575` (Gris)
- Success: `#4CAF50` (Verde)
- Warning: `#FF9800` (Naranja)
- Danger: `#F44336` (Rojo)

### Espaciado
- XS: 4px
- SM: 8px
- MD: 16px
- LG: 24px
- XL: 32px
- 2XL: 48px

## 📱 Responsive Breakpoints

- Mobile: < 480px
- Tablet: 768px
- Desktop: 1200px
- Print: Media de impresión

## 🚀 Carga de Recursos

### Orden de Carga (IMPORTANTE)
1. CSS (variables → estilos → responsive)
2. Librerías externas (Chart.js, SheetJS, UUID)
3. Config.js
4. Utils (Logger, DateUtils, FileUtils, ValidationUtils, FormatUtils)
5. Storage (IndexedDBManager → ExcelManager → SyncService → StorageFactory)
6. Services (EventBus)
7. Models (BaseModel → todos los modelos)
8. Views (BaseView → ModalView → todas las vistas)
9. Controllers (PDVController → IncidentController → ActionController → DashboardController)
10. main.js (inicialización)

**La orden es crítica** - cada componente depende de los anteriores.

## 💾 Tipos de Sincronización

### Excel (.xlsx)
- Exporta: PDV, Incidentes, Acciones (sin imágenes)
- Importa: Fusiona datos por ID

### JSON
- Exporta: Todo incluyendo imágenes (Base64)
- Importa: Restaura estado completo

### CSV
- Exporta: Para análisis en otros programas
- No incluye imágenes

## 🔍 Índices en IndexedDB

### PDV
- Índice: `codigo` (único)
- Índice: `estado`

### Incidentes
- Índice: `pdvId` (para relación FK)
- Índice: `criticidad`
- Índice: `estado`
- Índice: `categoria`

### Acciones
- Índice: `incidenteId` (para relación FK)
- Índice: `resultado`

### Evidencias
- Índice: `incidenteId` (para relación FK)

## 📊 Métricas del Dashboard

1. **Total PDV** - Cuenta simple de PDV activos
2. **Incidentes Abiertos** - Filtro por estado "Abierto"
3. **Incidentes Cerrados** - Filtro por estado "Cerrado"
4. **Tasa Resolución** - (Cerrados / Total) * 100
5. **Resolución Promedio** - Promedio de días para cerrar
6. **Top 5 PDV** - Ranking por cantidad de incidentes

## 🎯 Características Implementadas

✅ CRUD completo para PDV, Incidentes, Acciones
✅ Carga de evidencias (imágenes Base64)
✅ Sincronización Excel bidireccional
✅ Dashboard con 4 gráficos interactivos
✅ Búsqueda y filtrado en tiempo real
✅ Validación de formularios
✅ Logs de sistema
✅ Backup/Restore JSON
✅ Responsive Design
✅ Material Design UI

## 🎓 Patrones de Desarrollo

### MVC Architecture
- Model: Lógica de datos y validación
- View: Presentación UI y listeners
- Controller: Orquestación y eventos

### Pub/Sub Pattern
- EventBus centralizado
- Componentes desacoplados
- Actualizaciones automáticas

### Factory Pattern
- StorageFactory para instancias
- ModalView.openForm() para modales

### Observer Pattern
- Models emiten eventos
- Views se suscriben

## 📚 Documentación Adicional

- Ver comentarios en el código (documentados en español)
- Leer README.md para guía de usuario
- Ver config.js para valores por defecto

---

**Proyecto PDV Crítico v1.0.0**
Grupo Cargo SA - 2026
