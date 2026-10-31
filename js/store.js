/**
 * Accase demo store — datos simulados en localStorage.
 * Operativo alimenta Administrativo. Las fallas simulan OnlineFleet.
 */
(function (global) {
    const KEY = 'accase-demo-v1';
    const DIESEL_PRICE = 24.5;

    const SEED = {
        lastSync: new Date().toISOString(),
        units: [
            { id: 'C-101', model: 'Kenworth T680', plates: '45-AA-89', odometer: 142500, gps: 'Km 180 Autopista México-Puebla' },
            { id: 'C-102', model: 'Freightliner Cascadia', plates: '12-BB-90', odometer: 98200, gps: 'Puerto de Veracruz' },
            { id: 'C-103', model: 'Volvo FH', plates: '88-CC-11', odometer: 110400, gps: 'Base Central Mérida' },
            { id: 'C-104', model: 'Kenworth T800', plates: '33-DD-55', odometer: 201100, gps: 'Mérida ➔ Cancún' },
            { id: 'C-105', model: 'International', plates: '19-EE-22', odometer: 176800, gps: 'Taller Central' }
        ],
        trips: [
            { folio: 'CP-2026-093', unitId: 'C-101', driver: 'Roberto Gómez', client: 'Logística Comercial S.A.', origin: 'Mérida', destination: 'CDMX', cargo: 'Abarrotes', status: 'En Tránsito', revenue: 165000, dieselLiters: 1380, tolls: 12400, advance: 8000, createdAt: '2026-10-28T08:00:00' },
            { folio: 'CP-2026-092', unitId: 'C-102', driver: 'Carlos Mendoza', client: 'Grupo Industrial del Sur', origin: 'Veracruz', destination: 'Puebla', cargo: 'Refrescos', status: 'Descargando', revenue: 138400, dieselLiters: 980, tolls: 8600, advance: 6500, createdAt: '2026-10-27T14:20:00' },
            { folio: 'CP-2026-091', unitId: 'C-104', driver: 'Alejandro Ruiz', client: 'Transportes Express MX', origin: 'Mérida', destination: 'Cancún', cargo: 'Cajas de alimentos', status: 'En Tránsito', revenue: 87800, dieselLiters: 720, tolls: 5400, advance: 4200, createdAt: '2026-10-26T06:40:00' },
            { folio: 'CP-2026-090', unitId: 'C-103', driver: 'Por Asignar', client: 'Mayorista Yucatán', origin: 'Base Central Mérida', destination: 'Campeche', cargo: 'Material de empaque', status: 'Programado', revenue: 94000, dieselLiters: 640, tolls: 4100, advance: 3800, createdAt: '2026-10-29T09:00:00' }
        ],
        faults: [
            { folio: 'OF-4412', unitId: 'C-105', driver: 'Jesús Hernández', title: 'Luces del faro', priority: 'Alta', cost: 0, status: 'sin_reparar', source: 'OnlineFleet', reportado: '2026-10-28T11:30:00' },
            { folio: 'OF-4411', unitId: 'C-102', driver: 'Carlos Mendoza', title: 'Falla en el motor', priority: 'Media', cost: 180, status: 'en_reparacion', source: 'OnlineFleet', reportado: '2026-10-27T16:05:00' },
            { folio: 'OF-4408', unitId: 'C-105', driver: 'Jesús Hernández', title: 'Frenos (revisión mayor)', priority: 'Alta', cost: 14400, status: 'en_reparacion', source: 'OnlineFleet', reportado: '2026-10-25T09:12:00' }
        ],
        invoices: [
            { folio: 'F-9821', tripFolio: 'CP-2026-089', type: 'Ingreso', party: 'Logística Comercial S.A.', amount: 45000, sat: 'Válida', createdAt: '2026-10-20T10:00:00' },
            { folio: 'D-4412', tripFolio: 'CP-2026-088', type: 'Gasto (Diésel)', party: 'Servicio Gasolinero del Sur', amount: 12400, sat: 'Válida', createdAt: '2026-10-21T12:30:00' }
        ]
    };

    const UNIT_STATUS_FROM_TRIP = {
        'En Tránsito': 'En Tránsito',
        Descargando: 'Descargando',
        'En Carga': 'En Carga',
        Programado: 'Programado',
        Completado: 'Disponible'
    };

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return clone(SEED);
            const parsed = JSON.parse(raw);
            return {
                lastSync: parsed.lastSync || SEED.lastSync,
                units: parsed.units || clone(SEED.units),
                trips: parsed.trips || clone(SEED.trips),
                faults: parsed.faults || clone(SEED.faults),
                invoices: parsed.invoices || clone(SEED.invoices)
            };
        } catch (err) {
            return clone(SEED);
        }
    }

    function save(state) {
        localStorage.setItem(KEY, JSON.stringify(state));
        return state;
    }

    function tripCost(trip) {
        const diesel = (Number(trip.dieselLiters) || 0) * DIESEL_PRICE;
        const extra = Number(trip.tolls || 0) + Number(trip.advance || 0);
        return diesel + extra;
    }

    function formatMoney(amount) {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(amount) || 0);
    }

    function formatTimeAgo(iso) {
        const then = new Date(iso).getTime();
        const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
        if (mins < 1) return 'hace un momento';
        if (mins === 1) return 'hace 1 min';
        if (mins < 60) return 'hace ' + mins + ' min';
        const hrs = Math.round(mins / 60);
        return hrs === 1 ? 'hace 1 h' : 'hace ' + hrs + ' h';
    }

    function unitOf(state, unitId) {
        return state.units.find((u) => u.id === unitId);
    }

    function activeTripForUnit(state, unitId) {
        const order = ['En Tránsito', 'Descargando', 'En Carga', 'Programado'];
        return state.trips
            .filter((t) => t.unitId === unitId && t.status !== 'Completado')
            .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))[0];
    }

    function unitStatus(state, unitId) {
        if (unitId === 'C-105') return 'Mantenimiento';
        const trip = activeTripForUnit(state, unitId);
        if (!trip) return 'Disponible';
        return UNIT_STATUS_FROM_TRIP[trip.status] || trip.status;
    }

    function kpis(state) {
        const billed = state.trips.reduce((sum, t) => sum + (Number(t.revenue) || 0), 0);
        const dieselTolls = state.trips.reduce((sum, t) => sum + tripCost(t), 0);
        const faultCost = state.faults.reduce((sum, f) => sum + (Number(f.cost) || 0), 0);
        const expenses = dieselTolls + faultCost;
        const margin = billed - expenses;
        const active = state.units.filter((u) => {
            const st = unitStatus(state, u.id);
            return st === 'En Tránsito' || st === 'Descargando' || st === 'En Carga';
        }).length;
        return {
            activeUnits: active,
            totalUnits: state.units.length,
            billed,
            expenses,
            margin,
            marginPct: billed ? (margin / billed) * 100 : 0,
            dieselShare: billed ? (dieselTolls / billed) * 100 : 0,
            openFaults: state.faults.filter((f) => f.status !== 'finalizado').length,
            activeTrips: state.trips.filter((t) => t.status !== 'Completado').length
        };
    }

    function unitRows(state) {
        return state.units.map((unit) => {
            const trips = state.trips.filter((t) => t.unitId === unit.id);
            const income = trips.reduce((s, t) => s + (Number(t.revenue) || 0), 0);
            const tripExpenses = trips.reduce((s, t) => s + tripCost(t), 0);
            const faultExpenses = state.faults
                .filter((f) => f.unitId === unit.id)
                .reduce((s, f) => s + (Number(f.cost) || 0), 0);
            const expenses = tripExpenses + faultExpenses;
            const profit = income - expenses;
            const trip = activeTripForUnit(state, unit.id);
            return {
                ...unit,
                driver: trip ? trip.driver : unit.id === 'C-105' ? 'Jesús Hernández' : 'Por Asignar',
                route: trip ? trip.origin + ' ➔ ' + trip.destination : unit.gps,
                income,
                expenses,
                profit,
                marginPct: income ? (profit / income) * 100 : 0,
                status: unitStatus(state, unit.id)
            };
        });
    }

    const api = {
        DIESEL_PRICE,
        load,
        save,
        reset() {
            localStorage.removeItem(KEY);
            return save(clone(SEED));
        },
        formatMoney,
        formatTimeAgo,
        tripCost,
        kpis,
        unitRows,
        unitStatus,
        unitOf,
        addTrip(trip) {
            const state = load();
            state.trips.unshift(trip);
            return save(state);
        },
        updateTripStatus(folio, status) {
            const state = load();
            const trip = state.trips.find((t) => t.folio === folio);
            if (trip) trip.status = status;
            return save(state);
        },
        isTripInvoiced(state, folio) {
            return state.invoices.some((inv) => inv.tripFolio === folio && String(inv.type).indexOf('Gasto') < 0);
        },
        nextInvoiceFolio(state) {
            return 'F-' + (9800 + state.invoices.length);
        },
        addInvoice(invoice) {
            const state = load();
            state.invoices.unshift(invoice);
            return save(state);
        },
        updateFault(folio, patch) {
            const state = load();
            const fault = state.faults.find((f) => f.folio === folio);
            if (fault) Object.assign(fault, patch);
            return save(state);
        },
        syncOnlineFleet() {
            const state = load();
            state.lastSync = new Date().toISOString();
            const incoming = {
                folio: 'OF-' + (4400 + state.faults.length + 12),
                unitId: 'C-104',
                driver: 'Alejandro Ruiz',
                title: 'Sensor de presión de llantas',
                priority: 'Media',
                cost: 0,
                status: 'sin_reparar',
                source: 'OnlineFleet',
                reportado: state.lastSync
            };
            if (!state.faults.some((f) => f.title === incoming.title && f.unitId === incoming.unitId)) {
                state.faults.unshift(incoming);
            }
            return save(state);
        }
    };

    global.AccaseStore = api;
})(window);
