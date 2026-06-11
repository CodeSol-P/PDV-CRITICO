/**
 * DashboardController.js
 * Controlador para Dashboard
 */

class DashboardController {
    async renderDashboard() {
        try {
            await dashboardView.render();
        } catch (error) {
            logger.error("Error renderizando dashboard:", error);
        }
    }
}

const dashboardController = new DashboardController();
