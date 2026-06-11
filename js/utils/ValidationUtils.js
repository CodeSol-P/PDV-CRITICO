/**
 * ValidationUtils.js
 * Utilidades para validación de formularios y datos
 */

class ValidationUtils {
    /**
     * Validar email
     */
    static isValidEmail(email) {
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(email);
    }

    /**
     * Validar teléfono
     */
    static isValidPhone(phone) {
        const pattern = /^[\d\s()+-]+$/;
        return pattern.test(phone) && phone.length >= 10;
    }

    /**
     * Validar URL
     */
    static isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validar que no esté vacío
     */
    static isRequired(value) {
        if (typeof value === "string") {
            return value.trim().length > 0;
        }
        return value !== null && value !== undefined && value !== "";
    }

    /**
     * Validar longitud mínima
     */
    static minLength(value, min) {
        return value && value.toString().length >= min;
    }

    /**
     * Validar longitud máxima
     */
    static maxLength(value, max) {
        return !value || value.toString().length <= max;
    }

    /**
     * Validar rango de números
     */
    static isInRange(value, min, max) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    }

    /**
     * Validar que sea número
     */
    static isNumeric(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    /**
     * Validar que sea entero
     */
    static isInteger(value) {
        return Number.isInteger(parseFloat(value));
    }

    /**
     * Validar patrón regex
     */
    static matchPattern(value, pattern) {
        if (typeof pattern === "string") {
            pattern = new RegExp(pattern);
        }
        return pattern.test(value);
    }

    /**
     * Validar fecha válida
     */
    static isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    /**
     * Validar fecha posterior a otra
     */
    static isDateAfter(date1, date2) {
        return new Date(date1) > new Date(date2);
    }

    /**
     * Validar fecha anterior a otra
     */
    static isDateBefore(date1, date2) {
        return new Date(date1) < new Date(date2);
    }

    /**
     * Validar que tenga al menos una mayúscula
     */
    static hasUpperCase(value) {
        return /[A-Z]/.test(value);
    }

    /**
     * Validar que tenga al menos una minúscula
     */
    static hasLowerCase(value) {
        return /[a-z]/.test(value);
    }

    /**
     * Validar que tenga al menos un número
     */
    static hasNumber(value) {
        return /\d/.test(value);
    }

    /**
     * Validar que tenga al menos un carácter especial
     */
    static hasSpecialChar(value) {
        return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
    }

    /**
     * Validar fortaleza de contraseña
     */
    static getPasswordStrength(password) {
        let strength = 0;

        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (this.hasUpperCase(password)) strength++;
        if (this.hasLowerCase(password)) strength++;
        if (this.hasNumber(password)) strength++;
        if (this.hasSpecialChar(password)) strength++;

        return ["Muy débil", "Débil", "Regular", "Buena", "Fuerte", "Muy fuerte"][strength] || "Muy débil";
    }

    /**
     * Validar formulario completo
     */
    static validateForm(formData, rules) {
        const errors = {};

        Object.entries(rules).forEach(([field, rule]) => {
            const value = formData[field];

            if (rule.required && !this.isRequired(value)) {
                errors[field] = rule.message || `${field} es requerido`;
                return;
            }

            if (!this.isRequired(value)) return; // Si no es requerido y está vacío, está ok

            if (rule.minLength && !this.minLength(value, rule.minLength)) {
                errors[field] = rule.message || `Mínimo ${rule.minLength} caracteres`;
            }

            if (rule.maxLength && !this.maxLength(value, rule.maxLength)) {
                errors[field] = rule.message || `Máximo ${rule.maxLength} caracteres`;
            }

            if (rule.pattern && !this.matchPattern(value, rule.pattern)) {
                errors[field] = rule.message || "Formato inválido";
            }

            if (rule.custom && !rule.custom(value)) {
                errors[field] = rule.message || "Validación personalizada fallida";
            }
        });

        return {
            valid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Sanitizar entrada de texto (XSS prevention)
     */
    static sanitizeHTML(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Sanitizar para SQL (básico)
     */
    static sanitizeSQL(value) {
        return value.replace(/['";\\]/g, "\\$&");
    }

    /**
     * Validar que dos campos coincidan
     */
    static fieldMatch(value1, value2) {
        return value1 === value2;
    }

    /**
     * Validar selección única
     */
    static isSelected(value) {
        return value && value !== "" && value !== "0";
    }
}
