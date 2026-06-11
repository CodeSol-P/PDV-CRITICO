/**
 * FileUtils.js
 * Utilidades para manejo de archivos e imágenes
 * Upload, validación, conversión a Base64
 */

class FileUtils {
    /**
     * Validar archivo
     */
    static validateFile(file, options = {}) {
        const {
            maxSize = DEFAULTS.max_image_size,
            allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        } = options;

        // Validar tipo
        if (!allowedTypes.includes(file.type)) {
            return {
                valid: false,
                error: `Tipo de archivo no permitido. Formatos válidos: ${allowedTypes.join(", ")}`
            };
        }

        // Validar tamaño
        if (file.size > maxSize) {
            return {
                valid: false,
                error: `Archivo muy grande. Máximo: ${this._formatFileSize(maxSize)}`
            };
        }

        return { valid: true };
    }

    /**
     * Convertir archivo a Base64
     */
    static fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                resolve(reader.result);
            };

            reader.onerror = () => {
                reject(new Error("Error leyendo archivo"));
            };

            reader.readAsDataURL(file);
        });
    }

    /**
     * Convertir múltiples archivos a Base64
     */
    static async filesToBase64(files) {
        const results = [];
        
        for (const file of files) {
            try {
                const base64 = await this.fileToBase64(file);
                results.push({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: base64
                });
            } catch (error) {
                logger.error(`Error convirtiendo archivo ${file.name}:`, error);
                results.push({
                    name: file.name,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Descargar datos como archivo
     */
    static downloadData(data, filename, mimeType = "text/plain") {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        link.href = url;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    /**
     * Descargar JSON como archivo
     */
    static downloadJSON(data, filename) {
        const jsonStr = JSON.stringify(data, null, 2);
        this.downloadData(jsonStr, filename, "application/json");
    }

    /**
     * Descargar CSV
     */
    static downloadCSV(rows, filename) {
        const csvContent = this._convertToCSV(rows);
        this.downloadData(csvContent, filename, "text/csv;charset=utf-8;");
    }

    /**
     * Convertir datos a CSV
     */
    static _convertToCSV(rows) {
        if (!rows || rows.length === 0) return "";

        const headers = Object.keys(rows[0]);
        const headerLine = headers.map(h => this._escapeCSV(h)).join(",");

        const dataLines = rows.map(row => {
            return headers.map(header => {
                const value = row[header] ?? "";
                return this._escapeCSV(String(value));
            }).join(",");
        });

        return [headerLine, ...dataLines].join("\n");
    }

    /**
     * Escapar valores para CSV
     */
    static _escapeCSV(value) {
        if (typeof value !== "string") {
            value = String(value);
        }

        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
        }

        return value;
    }

    /**
     * Leer archivo como texto
     */
    static readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                resolve(reader.result);
            };

            reader.onerror = () => {
                reject(new Error("Error leyendo archivo"));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Parsear CSV desde texto
     */
    static parseCSV(csvText) {
        const lines = csvText.trim().split("\n");
        if (lines.length === 0) return [];

        const headers = lines[0].split(",").map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const obj = {};
            const values = this._parseCSVLine(lines[i]);

            headers.forEach((header, index) => {
                obj[header] = values[index] || "";
            });

            data.push(obj);
        }

        return data;
    }

    /**
     * Parsear línea CSV
     */
    static _parseCSVLine(line) {
        const values = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === "," && !inQuotes) {
                values.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }

        values.push(current.trim());
        return values;
    }

    /**
     * Obtener dimensiones de imagen
     */
    static getImageDimensions(base64String) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height
                });
            };

            img.onerror = () => {
                reject(new Error("Error cargando imagen"));
            };

            img.src = base64String;
        });
    }

    /**
     * Redimensionar imagen
     */
    static resizeImage(base64String, maxWidth = 1920, maxHeight = 1920, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL("image/jpeg", quality));
            };

            img.onerror = () => {
                reject(new Error("Error redimensionando imagen"));
            };

            img.src = base64String;
        });
    }

    /**
     * Formatear tamaño de archivo
     */
    static _formatFileSize(bytes) {
        if (bytes === 0) return "0 Bytes";

        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    }

    /**
     * Generar nombre de archivo único
     */
    static generateFileName(originalName) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const extension = originalName.split(".").pop();
        
        return `${timestamp}_${random}.${extension}`;
    }

    /**
     * Obtener extensión de archivo
     */
    static getExtension(filename) {
        return filename.split(".").pop().toLowerCase();
    }

    /**
     * Obtener nombre sin extensión
     */
    static getNameWithoutExtension(filename) {
        return filename.substring(0, filename.lastIndexOf("."));
    }
}
