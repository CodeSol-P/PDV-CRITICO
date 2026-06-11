/**
 * AuthService.js
 * Servicio de autenticación para acciones protegidas.
 * Verifica usuario y contraseña contra AUTH_USERS definido en config.js.
 */

class AuthService {
    /**
     * Muestra un modal de autenticación. Si las credenciales son válidas,
     * ejecuta el callback onSuccess.
     * @param {string} actionLabel - Nombre de la acción que requiere autorización
     * @param {Function} onSuccess - Se ejecuta si la autenticación es exitosa
     */
    requireAuth(actionLabel, onSuccess) {
        const html = `
            <div style="padding: 20px;">
                <p style="margin-bottom: 20px; color: #555;">
                    La acción <strong>"${actionLabel}"</strong> requiere autorización.
                </p>
                <div class="form-group required">
                    <label>Usuario</label>
                    <input type="text" id="auth-username" placeholder="Ingrese usuario" autocomplete="username" style="width:100%;">
                </div>
                <div class="form-group required" style="margin-top: 12px;">
                    <label>Contraseña</label>
                    <input type="password" id="auth-password" placeholder="Ingrese contraseña" autocomplete="current-password" style="width:100%;">
                </div>
                <div id="auth-error" style="color: #F44336; font-size: 13px; margin-top: 10px; display: none;">
                    Usuario o contraseña incorrectos.
                </div>
            </div>
        `;

        const modal = new ModalView({
            title: "Autorización Requerida",
            size: "420px",
            closeButton: true,
            footer: true,
            buttons: [
                {
                    text: "Cancelar",
                    className: "btn-outline",
                    onClick: () => modal.close()
                },
                {
                    text: "Ingresar",
                    className: "btn-primary",
                    onClick: () => this._attemptLogin(modal, onSuccess)
                }
            ]
        });

        modal.open(html);

        // Enviar con Enter en el campo de contraseña
        setTimeout(() => {
            const usernameInput = modal.getElement("#auth-username");
            const passwordInput = modal.getElement("#auth-password");

            if (usernameInput) usernameInput.focus();

            const handleEnter = (e) => {
                if (e.key === "Enter") this._attemptLogin(modal, onSuccess);
            };

            if (usernameInput) usernameInput.addEventListener("keydown", handleEnter);
            if (passwordInput) passwordInput.addEventListener("keydown", handleEnter);
        }, 100);
    }

    /**
     * Intenta validar las credenciales ingresadas en el modal.
     */
    _attemptLogin(modal, onSuccess) {
        const usernameInput = modal.getElement("#auth-username");
        const passwordInput = modal.getElement("#auth-password");

        const username = usernameInput ? usernameInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";

        if (this._validateCredentials(username, password)) {
            modal.close();
            onSuccess();
        } else {
            const errorEl = modal.getElement("#auth-error");
            if (errorEl) errorEl.style.display = "block";
            if (passwordInput) {
                passwordInput.value = "";
                passwordInput.focus();
            }
        }
    }

    /**
     * Valida las credenciales contra la lista de usuarios en config.js.
     */
    _validateCredentials(username, password) {
        return AUTH_USERS.some(
            user => user.username === username && user.password === password
        );
    }
}

const authService = new AuthService();
