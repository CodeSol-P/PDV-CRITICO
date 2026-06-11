/**
 * BaseView.js
 * Clase padre para todas las vistas
 * Proporciona métodos comunes: render, attach, cleanup
 */

class BaseView {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.listeners = [];
    }

    /**
     * Obtener contenedor
     */
    getContainer() {
        if (!this.container) {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                throw new Error(`Contenedor ${this.containerId} no encontrado`);
            }
        }
        return this.container;
    }

    /**
     * Renderizar vista (implementar en subclases)
     */
    async render() {
        throw new Error("render() debe ser implementado en subclase");
    }

    /**
     * Mostrar vista
     */
    show() {
        const container = this.getContainer();
        container.classList.add("active");
    }

    /**
     * Ocultar vista
     */
    hide() {
        const container = this.getContainer();
        container.classList.remove("active");
    }

    /**
     * Limpiar vista
     */
    async cleanup() {
        this.removeAllListeners();
    }

    /**
     * Agregar listener a elemento
     */
    addListener(element, eventType, handler) {
        if (!element) return;

        element.addEventListener(eventType, handler);
        this.listeners.push({ element, eventType, handler });
    }

    /**
     * Remover todos los listeners
     */
    removeAllListeners() {
        this.listeners.forEach(({ element, eventType, handler }) => {
            element.removeEventListener(eventType, handler);
        });
        this.listeners = [];
    }

    /**
     * Crear elemento
     */
    createElement(tag, className = "", html = "") {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (html) element.innerHTML = html;
        return element;
    }

    /**
     * Mostrar spinner de carga
     */
    showLoading() {
        const overlay = document.getElementById("loading-overlay");
        if (overlay) overlay.classList.add("active");
    }

    /**
     * Ocultar spinner de carga
     */
    hideLoading() {
        const overlay = document.getElementById("loading-overlay");
        if (overlay) overlay.classList.remove("active");
    }

    /**
     * Mostrar notificación
     */
    showToast(message, type = "info") {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="material-icons">${this._getToastIcon(type)}</span>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = "slideInRight 0.3s ease-out reverse";
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Obtener icono según tipo de toast
     */
    _getToastIcon(type) {
        const icons = {
            success: "check_circle",
            error: "error",
            warning: "warning",
            info: "info"
        };
        return icons[type] || "info";
    }

    /**
     * Validar formulario
     */
    validateForm(formData, rules) {
        return ValidationUtils.validateForm(formData, rules);
    }

    /**
     * Limpiar campo con error
     */
    clearError(fieldElement) {
        const errorElement = fieldElement.parentElement.querySelector(".form-error");
        if (errorElement) errorElement.remove();
        fieldElement.classList.remove("error");
    }

    /**
     * Mostrar error en campo
     */
    showError(fieldElement, errorMessage) {
        const errorElement = fieldElement.parentElement.querySelector(".form-error");
        
        if (errorElement) {
            errorElement.textContent = errorMessage;
        } else {
            const error = document.createElement("div");
            error.className = "form-error";
            error.textContent = errorMessage;
            fieldElement.parentElement.appendChild(error);
        }

        fieldElement.classList.add("error");
    }

    /**
     * Deshabilitar botón
     */
    disableButton(buttonElement) {
        buttonElement.disabled = true;
        buttonElement.classList.add("opacity-50");
    }

    /**
     * Habilitar botón
     */
    enableButton(buttonElement) {
        buttonElement.disabled = false;
        buttonElement.classList.remove("opacity-50");
    }

    /**
     * Truncar texto largo
     */
    truncateText(text, length = 50) {
        return FormatUtils.truncate(text, length);
    }

    /**
     * Formatear fecha
     */
    formatDate(date, format = "DD/MM/YYYY") {
        return DateUtils.format(date, format);
    }
}
