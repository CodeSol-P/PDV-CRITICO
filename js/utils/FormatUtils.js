/**
 * FormatUtils.js
 * Utilidades para formateo de datos
 * Moneda, números, texto, etc.
 */

class FormatUtils {
    /**
     * Formatear como moneda
     */
    static formatCurrency(value, currency = "ARS") {
        const num = parseFloat(value);
        
        if (isNaN(num)) return "";

        const symbols = {
            ARS: "$",
            USD: "$",
            EUR: "€",
            GBP: "£"
        };

        const symbol = symbols[currency] || currency;

        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: currency
        }).format(num);
    }

    /**
     * Formatear como número
     */
    static formatNumber(value, decimals = 2) {
        const num = parseFloat(value);
        
        if (isNaN(num)) return "";

        return num.toLocaleString("es-AR", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * Formatear porcentaje
     */
    static formatPercentage(value, decimals = 1) {
        const num = parseFloat(value);
        
        if (isNaN(num)) return "";

        return num.toLocaleString("es-AR", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }) + "%";
    }

    /**
     * Truncar texto
     */
    static truncate(text, length = 50, suffix = "...") {
        if (!text) return "";
        
        if (text.length <= length) return text;

        return text.substring(0, length - suffix.length) + suffix;
    }

    /**
     * Capitalizar primera letra
     */
    static capitalize(text) {
        if (!text) return "";
        
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    /**
     * Convertir a mayúsculas
     */
    static uppercase(text) {
        return text ? text.toUpperCase() : "";
    }

    /**
     * Convertir a minúsculas
     */
    static lowercase(text) {
        return text ? text.toLowerCase() : "";
    }

    /**
     * Convertir CamelCase a espacios
     */
    static camelCaseToSpaces(text) {
        return text.replace(/([A-Z])/g, " $1").trim();
    }

    /**
     * Formatear tamaño de archivo
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return "0 Bytes";

        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    }

    /**
     * Formatear duración en milisegundos
     */
    static formatDuration(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0) parts.push(`${seconds}s`);

        return parts.join(" ") || "0s";
    }

    /**
     * Formatear como slug (URL-friendly)
     */
    static toSlug(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");
    }

    /**
     * Reemplazar variables en template
     */
    static formatTemplate(template, variables = {}) {
        let result = template;

        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, "g");
            result = result.replace(regex, value);
        });

        return result;
    }

    /**
     * Formatear teléfono
     */
    static formatPhone(phone) {
        if (!phone) return "";

        // Remover caracteres no numéricos
        const cleaned = phone.replace(/\D/g, "");

        // Formato: +54 381 123-4567
        if (cleaned.length === 10) {
            return `+54 ${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
        } else if (cleaned.length === 12) {
            return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5, 8)}-${cleaned.substring(8)}`;
        }

        return phone;
    }

    /**
     * Formatear URL (agregar protocolo si falta)
     */
    static formatURL(url) {
        if (!url) return "";

        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            return "https://" + url;
        }

        return url;
    }

    /**
     * Obtener extensión de nombre de archivo
     */
    static getFileExtension(filename) {
        return filename.split(".").pop().toLowerCase();
    }

    /**
     * Obtener nombre de archivo sin extensión
     */
    static getFileNameWithoutExtension(filename) {
        return filename.substring(0, filename.lastIndexOf("."));
    }

    /**
     * Colorear según criticidad
     */
    static getCriticalityColor(criticality) {
        const colors = {
            "Alta": "#F44336",
            "Media": "#FF9800",
            "Baja": "#4CAF50"
        };

        return colors[criticality] || "#9E9E9E";
    }

    /**
     * Obtener icono según estado
     */
    static getStateIcon(state) {
        const icons = {
            "Abierto": "error",
            "En Proceso": "hourglass_top",
            "Cerrado": "check_circle",
            "Activo": "check_circle",
            "Inactivo": "block"
        };

        return icons[state] || "help";
    }

    /**
     * Obtener color según estado
     */
    static getStateColor(state) {
        const colors = {
            "Abierto": "#F44336",
            "En Proceso": "#FF9800",
            "Cerrado": "#4CAF50",
            "Exitosa": "#4CAF50",
            "Parcial": "#FF9800",
            "Fallida": "#F44336",
            "Activo": "#4CAF50",
            "Inactivo": "#9E9E9E"
        };

        return colors[state] || "#9E9E9E";
    }

    /**
     * Hipótesis para abreviatura
     */
    static abbreviate(text, length = 1) {
        return text
            .split(" ")
            .map(word => word[0])
            .join("")
            .substring(0, length)
            .toUpperCase();
    }

    /**
     * Remover caracteres especiales
     */
    static removeSpecialChars(text) {
        return text.replace(/[^a-zA-Z0-9\s]/g, "");
    }
}
