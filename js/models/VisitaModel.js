/**
 * VisitaModel.js
 * Modelo para registros de visitas a Puntos de Venta
 */

class VisitaModel extends BaseModel {
    constructor() {
        super(APP_CONFIG.stores.visitas);
    }

    async _validate(data) {
        if (!data.nroCliente && !data.nombrePDV) {
            throw new Error("Debe ingresar al menos el número de cliente o el nombre del PDV");
        }
    }
}

const visitaModel = new VisitaModel();
