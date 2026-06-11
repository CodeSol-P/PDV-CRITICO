/**
 * ModalView.js
 * Componente de modal reutilizable
 * Para formularios, confirmaciones, etc.
 */

class ModalView {
    constructor(options = {}) {
        this.options = {
            title: "Modal",
            size: "600px",
            closeButton: true,
            footer: true,
            ...options
        };

        this.container = null;
        this.overlay = null;
        this.modal = null;
        this.body = null;
        this.listeners = [];
    }

    /**
     * Crear y abrir modal
     */
    open(content = "") {
        this.container = document.getElementById("modal-container");
        if (!this.container) return;

        // Crear overlay
        this.overlay = document.createElement("div");
        this.overlay.className = "modal-overlay";

        // Crear modal
        this.modal = document.createElement("div");
        this.modal.className = "modal";
        this.modal.style.maxWidth = this.options.size;

        // Header
        if (this.options.title) {
            const header = document.createElement("div");
            header.className = "modal-header";

            const title = document.createElement("h3");
            title.textContent = this.options.title;
            header.appendChild(title);

            if (this.options.closeButton) {
                const closeBtn = document.createElement("button");
                closeBtn.className = "btn btn-icon";
                closeBtn.innerHTML = '<span class="material-icons">close</span>';
                closeBtn.addEventListener("click", () => this.close());
                header.appendChild(closeBtn);
            }

            this.modal.appendChild(header);
        }

        // Body
        this.body = document.createElement("div");
        this.body.className = "modal-body";
        this.body.innerHTML = content;
        this.modal.appendChild(this.body);

        // Footer (si está habilitado)
        if (this.options.footer && this.options.buttons) {
            const footer = document.createElement("div");
            footer.className = "modal-footer";

            this.options.buttons.forEach(btn => {
                const button = document.createElement("button");
                button.className = `btn ${btn.className || "btn-primary"}`;
                button.textContent = btn.text;
                button.addEventListener("click", btn.onClick);
                footer.appendChild(button);
            });

            this.modal.appendChild(footer);
        }

        // Agregar a DOM
        this.overlay.appendChild(this.modal);
        this.container.appendChild(this.overlay);

        // Cerrar al hacer click fuera del modal
        this.overlay.addEventListener("click", (e) => {
            if (e.target === this.overlay) this.close();
        });

        // Evento de apertura
        eventBus.emit(EVENTS.MODAL_OPENED);
    }

    /**
     * Cerrar modal
     */
    close() {
        if (this.overlay && this.overlay.parentElement) {
            this.overlay.parentElement.removeChild(this.overlay);
        }

        this.removeAllListeners();
        eventBus.emit(EVENTS.MODAL_CLOSED);
    }

    /**
     * Obtener elemento del body
     */
    getElement(selector) {
        if (!this.body) return null;
        return this.body.querySelector(selector);
    }

    /**
     * Obtener todos los elementos
     */
    getElements(selector) {
        if (!this.body) return [];
        return this.body.querySelectorAll(selector);
    }

    /**
     * Agregar listener
     */
    addListener(selector, eventType, handler) {
        const element = this.getElement(selector);
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
     * Modal de formulario
     */
    static openForm(title, fields, onSubmit, submitText = "Guardar") {
        let formHtml = '<form class="modal-form">';

        fields.forEach(field => {
            formHtml += `
                <div class="form-group ${field.required ? 'required' : ''}">
                    <label>${field.label}</label>
            `;

            if (field.type === "textarea") {
                formHtml += `<textarea name="${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}></textarea>`;
            } else if (field.type === "select") {
                formHtml += `
                    <select name="${field.name}" ${field.required ? 'required' : ''}>
                        <option value="">Seleccionar...</option>
                `;
                field.options?.forEach(opt => {
                    formHtml += `<option value="${opt.value}">${opt.label}</option>`;
                });
                formHtml += `</select>`;
            } else {
                formHtml += `<input type="${field.type || 'text'}" name="${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>`;
            }

            formHtml += '</div>';
        });

        formHtml += '</form>';

        const modal = new ModalView({
            title,
            size: "600px",
            closeButton: true,
            footer: true,
            buttons: [
                {
                    text: "Cancelar",
                    className: "btn-outline",
                    onClick: () => modal.close()
                },
                {
                    text: submitText,
                    className: "btn-primary",
                    onClick: () => {
                        const form = modal.getElement("form");
                        const formData = new FormData(form);
                        const data = Object.fromEntries(formData);
                        onSubmit(data);
                        modal.close();
                    }
                }
            ]
        });

        modal.open(formHtml);
        return modal;
    }

    /**
     * Modal de confirmación
     */
    static openConfirm(title, message, onConfirm, onCancel = null) {
        const html = `
            <div style="padding: 20px;">
                <p>${message}</p>
            </div>
        `;

        const modal = new ModalView({
            title,
            size: "400px",
            closeButton: true,
            footer: true,
            buttons: [
                {
                    text: "Cancelar",
                    className: "btn-outline",
                    onClick: () => {
                        if (onCancel) onCancel();
                        modal.close();
                    }
                },
                {
                    text: "Confirmar",
                    className: "btn-danger",
                    onClick: () => {
                        onConfirm();
                        modal.close();
                    }
                }
            ]
        });

        modal.open(html);
        return modal;
    }

    /**
     * Modal de información
     */
    static openInfo(title, message) {
        const html = `
            <div style="padding: 20px;">
                <p>${message}</p>
            </div>
        `;

        const modal = new ModalView({
            title,
            size: "400px",
            closeButton: true,
            footer: true,
            buttons: [
                {
                    text: "Cerrar",
                    className: "btn-primary",
                    onClick: () => modal.close()
                }
            ]
        });

        modal.open(html);
        return modal;
    }
}
