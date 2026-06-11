/**
 * DateUtils.js
 * Utilidades para manejo de fechas y horas
 * Formato, cálculos, conversiones
 */

class DateUtils {
    /**
     * Obtener fecha actual en formato ISO
     */
    static getNow() {
        return new Date().toISOString();
    }

    /**
     * Obtener fecha actual en formato legible
     */
    static getNowFormatted() {
        return this.format(new Date(), DEFAULTS.datetime_format);
    }

    /**
     * Formatear fecha
     * Formatos soportados: DD/MM/YYYY, YYYY-MM-DD, DD/MM/YYYY HH:mm, etc.
     */
    static format(date, format = "DD/MM/YYYY") {
        if (!date) return "";
        
        if (typeof date === "string") {
            date = new Date(date);
        }

        if (!(date instanceof Date) || isNaN(date)) {
            return "";
        }

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        const replacements = {
            "DD": day,
            "MM": month,
            "YYYY": year,
            "YY": String(year).slice(-2),
            "HH": hours,
            "mm": minutes,
            "ss": seconds
        };

        let result = format;
        Object.entries(replacements).forEach(([key, value]) => {
            result = result.replace(key, value);
        });

        return result;
    }

    /**
     * Parsear fecha desde string
     */
    static parse(dateString, format = "DD/MM/YYYY") {
        if (!dateString) return null;

        let year, month, day, hours = 0, minutes = 0;

        if (format === "DD/MM/YYYY") {
            const parts = dateString.split("/");
            if (parts.length !== 3) return null;
            day = parseInt(parts[0]);
            month = parseInt(parts[1]);
            year = parseInt(parts[2]);
        } else if (format === "YYYY-MM-DD") {
            const parts = dateString.split("-");
            if (parts.length < 3) return null;
            year = parseInt(parts[0]);
            month = parseInt(parts[1]);
            day = parseInt(parts[2]);
            if (parts.length > 3) {
                hours = parseInt(parts[3]);
                minutes = parseInt(parts[4]);
            }
        }

        if (!year || !month || !day) return null;

        return new Date(year, month - 1, day, hours, minutes);
    }

    /**
     * Obtener diferencia en días entre dos fechas
     */
    static differenceInDays(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const time_difference = d2.getTime() - d1.getTime();
        return Math.floor(time_difference / (1000 * 3600 * 24));
    }

    /**
     * Obtener diferencia en horas
     */
    static differenceInHours(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const time_difference = d2.getTime() - d1.getTime();
        return Math.floor(time_difference / (1000 * 3600));
    }

    /**
     * Obtener diferencia en minutos
     */
    static differenceInMinutes(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const time_difference = d2.getTime() - d1.getTime();
        return Math.floor(time_difference / (1000 * 60));
    }

    /**
     * Agregar días a una fecha
     */
    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    /**
     * Agregar horas a una fecha
     */
    static addHours(date, hours) {
        const result = new Date(date);
        result.setHours(result.getHours() + hours);
        return result;
    }

    /**
     * Obtener el inicio del día
     */
    static startOfDay(date) {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        return result;
    }

    /**
     * Obtener el final del día
     */
    static endOfDay(date) {
        const result = new Date(date);
        result.setHours(23, 59, 59, 999);
        return result;
    }

    /**
     * Obtener el inicio de la semana
     */
    static startOfWeek(date) {
        const result = new Date(date);
        const day = result.getDay();
        const diff = result.getDate() - day;
        result.setDate(diff);
        result.setHours(0, 0, 0, 0);
        return result;
    }

    /**
     * Obtener el inicio del mes
     */
    static startOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    /**
     * Obtener el final del mes
     */
    static endOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    /**
     * Verificar si es fecha válida
     */
    static isValid(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        return date instanceof Date && !isNaN(date);
    }

    /**
     * Obtener nombre del mes en español
     */
    static getMonthName(date, short = false) {
        const months = {
            long: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                   "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
            short: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        };
        
        const monthIndex = new Date(date).getMonth();
        return short ? months.short[monthIndex] : months.long[monthIndex];
    }

    /**
     * Obtener nombre del día en español
     */
    static getDayName(date, short = false) {
        const days = {
            long: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
            short: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sab"]
        };
        
        const dayIndex = new Date(date).getDay();
        return short ? days.short[dayIndex] : days.long[dayIndex];
    }

    /**
     * Obtener número de semana del año
     */
    static getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        
        return weekNum;
    }

    /**
     * Rango de fechas para el mes actual
     */
    static getCurrentMonthRange() {
        const now = new Date();
        return {
            start: this.startOfMonth(now),
            end: this.endOfMonth(now)
        };
    }

    /**
     * Rango de fechas para el año actual
     */
    static getCurrentYearRange() {
        const now = new Date();
        return {
            start: new Date(now.getFullYear(), 0, 1),
            end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        };
    }
}
