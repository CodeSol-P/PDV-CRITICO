# PDV Crítico - Sistema de Gestión de Puntos de Venta

## Descripción

**PDV Crítico** es una aplicación web profesional para la gestión de Puntos de Venta críticos, incidentes y acciones correctivas. Diseñada con **Material Design**, utiliza **IndexedDB** para almacenamiento local sin necesidad de servidor.

### Características Principales

- **Gestión de PDV**: Crear, editar, eliminar puntos de venta
- **Registro de Incidentes**: Documenta problemas con criticidad y categoría
- **Carga de Evidencias**: Soporta múltiples imágenes por incidente
- **Acciones Correctivas**: Registra y rastrea soluciones implementadas
- **Dashboard Analítico**: 4 gráficos + 4 métricas principales
- **Sincronización Excel**: Importa/exporta en .xlsx
- **Sin servidor**: Todo funciona en el navegador con IndexedDB
- **Responsive**: Funciona en desktop, tablet y mobile
- **Material Design**: Interfaz moderna y profesional

---

## Inicio Rápido

###  Abrir la Aplicación

1. Descarga todos los archivos de la carpeta
2. Abre `index.html` en tu navegador Chrome, Firefox, Edge o Safari
3. ¡Listo! La app se inicializa automáticamente

```bash
# Si quieres un servidor local simple:
python -m http.server 8000
# Luego: http://localhost:8000/index.html
```

### 2️Datos de Demostración

La app carga automáticamente datos de demostración:
- **3 PDV** de ejemplo (Tucumán Centro, Tucumán Sur, San Miguel)
- **2 Incidentes** de demostración
- Puedes eliminarlos y crear los tuyos

---

## 📱 Navegación

### Tabs Principales

| Tab | Función |
|-----|---------|
| **Dashboard** | Métricas y gráficos analíticos |
| **PDV** | Gestión de Puntos de Venta |
| **Incidentes** | Registro y seguimiento de problemas |
| **Acciones** | Acciones correctivas implementadas |

---

## 💼 Guía de Uso por Módulo

### 🏪 Gestión de PDV

#### Crear PDV
1. Ve a la tab **PDV**
2. Haz clic en **"Nuevo PDV"**
3. Completa los campos:
   - **Código**: Identificador único (ej: PDV-001)
   - **Nombre**: Nombre del punto de venta
   - **Dirección**: Ubicación física
   - **Responsable**: Persona a cargo
   - **Email** / **Teléfono**: Datos de contacto

#### Buscar PDV
- Usa la barra de búsqueda para filtrar por código, nombre o dirección

#### Filtrar por Estado
- Selecciona "Activo" o "Inactivo" en el dropdown

#### Ver Detalles
- Haz clic en el icono "ver" (👁) para ver estadísticas del PDV:
  - Total de incidentes
  - Incidentes abiertos/cerrados
  - Incidentes críticos

---

### 🚨 Registro de Incidentes

#### Crear Incidente
1. Ve a la tab **Incidentes**
2. Haz clic en **"Nuevo Incidente"**
3. Completa:
   - **Punto de Venta**: Selecciona el PDV
   - **Descripción**: Detalla el problema (mín. 10 caracteres)
   - **Categoría**: Hardware, Software, Procesos, Otro
   - **Criticidad**: Alta, Media, Baja
   - **Responsable**: Quién lo reporta

#### Cargar Evidencias (Imágenes)
1. En el formulario del incidente, busca la sección "Cargar Evidencias"
2. Selecciona una o varias imágenes (máximo 5 MB cada una)
3. Se suben automáticamente a la BD local
4. Máximo 10 imágenes por incidente

#### Ver Detalles con Galería
1. Haz clic en el icono "ver" en la tabla
2. Verás:
   - Información del incidente
   - Galería de fotos
   - Historial de acciones

---

### ✅ Acciones Correctivas

#### Registrar Acción
1. Ve a la tab **Acciones**
2. Haz clic en **"Nueva Acción"**
3. Completa:
   - **Incidente**: Vincula a un incidente existente
   - **Descripción**: Qué se hizo
   - **Fecha**: Cuándo se implementó
   - **Resultado**: Exitosa, Parcial, Fallida
   - **Observaciones**: Notas adicionales

#### Seguimiento
- La tabla muestra el historial de acciones
- Visualiza la tasa de éxito de tus acciones

---

### 📊 Dashboard Analítico

#### Métricas (Cuadro Superior)
- **Total PDV**: Puntos de venta registrados
- **Incidentes Abiertos**: En rojo
- **Incidentes Cerrados**: En verde
- **Tasa Resolución**: Porcentaje

#### Gráficos

**1. Incidentes por Criticidad** (Doughnut)
- Alta, Media, Baja
- Identifica riesgos de alto nivel

**2. Estado de Incidentes** (Pie)
- Abiertos, En Proceso, Cerrados
- Visualiza el flujo de trabajo

**3. Incidentes por Mes** (Line)
- Tendencias temporales
- Identifica picos de problemas

**4. Top 5 PDV con Problemas** (Bar Horizontal)
- Ranking de PDV problemáticos
- Prioriza atención

---

## 💾 Sincronización con Excel

### Descargar a Excel
1. Haz clic en el botón **"Sincronizar"** (arriba a la derecha)
2. Selecciona **"Descargar Excel"**
3. Se genera un archivo `.xlsx` con:
   - Hoja 1: Puntos de Venta
   - Hoja 2: Incidentes
   - Hoja 3: Acciones
   - Hoja 4: Evidencias (sin fotos)

### Importar desde Excel
1. Haz clic en **"Sincronizar"**
2. Selecciona **"Importar desde Excel"**
3. Elige tu archivo `.xlsx`
4. Los datos se fusionan con los existentes (sin duplicar)

### Exportar/Importar JSON
- **JSON**: Para backups completos (incluyendo imágenes)
- **CSV**: Para análisis en otros programas

---

## 🔧 Configuración

### Botón de Configuración (arriba a la derecha)

#### Ver Información
- Versión de la app
- Nombre de la BD

#### Zona de Peligro
- **Limpiar todos los datos**: Elimina toda la información
  - ⚠️ Esta acción NO se puede deshacer

### Estadísticas de Almacenamiento
- Consulta cuánto espacio usas
- Soporta hasta 50 MB en IndexedDB

---

## 📊 Estructura de Datos

### Entidades Principales

```
PDV
├── id (UUID)
├── codigo (string, único)
├── nombre
├── direccion
├── responsable
├── email
├── telefono
└── estado (Activo/Inactivo)

Incidente
├── id (UUID)
├── pdvId (FK)
├── fechaDeteccion
├── descripcion
├── categoria (Hardware/Software/Procesos/Otro)
├── criticidad (Alta/Media/Baja)
├── estado (Abierto/En Proceso/Cerrado)
├── responsable
└── comentarios

Acción
├── id (UUID)
├── incidenteId (FK)
├── descripcion
├── fechaImplementacion
├── responsable
├── resultado (Exitosa/Parcial/Fallida)
└── observaciones

Evidencia
├── id (UUID)
├── incidenteId (FK)
├── nombre
├── base64Data (imagen completa)
├── descripcion
├── fechaCarga
└── orden
```

---

## 🛠️ Requisitos Técnicos

### Navegadores Soportados
- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Características Requeridas
- IndexedDB (almacenamiento local)
- FileAPI (carga de archivos)
- LocalStorage (datos de sesión)

### Librerías Incluidas
- **Chart.js 4.4**: Gráficos analíticos
- **SheetJS 0.18**: Lectura/escritura Excel
- **UUID.js 9.0**: Generación de IDs únicos

---

## ⌨️ Atajos Útiles

| Acción | Atajo |
|--------|-------|
| Crear nuevo PDV | Tab PDV → Nuevo PDV |
| Búsqueda rápida | Escribe en el buscador |
| Ver gráficos | Tab Dashboard |
| Exportar datos | Icono Sincronizar |

---

## 🐛 Solución de Problemas

### "La app no guarda mis datos"
- Verifica que IndexedDB esté habilitado en tu navegador
- No uses modo incógnito/privado
- Intenta limpiar el caché

### "Las imágenes no se cargan"
- Máximo 5 MB por imagen
- Formatos soportados: JPG, PNG, GIF, WebP
- Máximo 10 imágenes por incidente

### "No puedo descargar Excel"
- Verifica que tu navegador permita descargas
- Intenta con otro navegador

### "Los datos desaparecieron"
- Si limpias el almacenamiento del navegador se pierden todos los datos
- Siempre haz backup con **"Crear Backup"** antes

---

## 📝 Mejores Prácticas

### Nomenclatura PDV
- Usa códigos consistentes: `PDV-001`, `PDV-002`, etc.
- Nombres descriptivos: `PDV Tucumán Centro` en lugar de `PDV 1`

### Incidentes
- Describe el problema de forma clara y detallada
- Asigna criticidad según el impacto en operaciones
- Carga evidencias (fotos) siempre que sea posible

### Acciones
- Vincula cada acción a su incidente
- Registra el resultado (éxito/fracaso)
- Documenta qué se hizo y quién lo hizo

### Backups
- Exporta tus datos semanalmente
- Descarga Excel para análisis en otros programas
- Crea backups JSON para seguridad

---

## 🎨 Personalización

### Cambiar Tema (CSS)
Edita `css/variables.css`:

```css
--primary-color: #1976D2;  /* Color principal */
--danger-color: #F44336;   /* Color alertas */
```

### Agregar Nuevos Campos
1. Edita el modelo correspondiente en `js/models/`
2. Agrega a la vista en `js/views/`
3. Actualiza el controlador

---

## 📞 Soporte

### Documentación
- Revisa los comentarios en el código
- Cada archivo tiene una sección `/** ... */` explicativa

### Reporte de Errores
- Abre la Consola del Navegador (F12)
- Revisa los logs en la pestaña Console
- Los errores también aparecen en el Log del Sistema

---

## 📄 Licencia

Desarrollado por **Grupo Cargo SA** - 2026
Uso exclusivo para gestión de PDV críticos.

---

## 🎓 Arquitectura Técnica

### Patrón MVC
- **Models** (`js/models/`): Lógica de datos
- **Views** (`js/views/`): Presentación UI
- **Controllers** (`js/controllers/`): Lógica de negocio

### Pub/Sub Event Bus
- Comunicación entre componentes
- Desacoplamiento de vistas y controladores

### IndexedDB Storage
- BD relacional local
- Índices para búsquedas rápidas
- Sincronización por timestamp

---

## 🚀 Próximas Características Planeadas

- [ ] Exportar PDF
- [ ] Reportes avanzados
- [ ] Geolocalización de PDV
- [ ] Notificaciones en tiempo real
- [ ] Sincronización con servidor remoto
- [ ] API REST para integración

---

## 📱 Versión

**PDV Crítico v1.0.0**

Última actualización: Junio 2026

---

### ¿Preguntas? 

Consulta el código fuente - está completamente documentado con comentarios en español.

**¡Gracias por usar PDV Crítico!** 🙌
