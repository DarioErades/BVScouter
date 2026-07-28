// Filtros de revisión reutilizables para convertir el scouting en una lista
// accionable de jugadas que revisar con el equipo.

export function reviewCategories(acciones) {
    return [
        { id: 'favorites', label: 'Favoritos', count: acciones.filter(a => a.es_favorito).length },
        { id: 'errors', label: 'Errores propios', count: acciones.filter(a => ['error', 'bloqueado'].includes(a.resultado)).length },
        { id: 'k1-errors', label: 'Errores K1', count: acciones.filter(a => a.complejo === 'K1' && ['error', 'bloqueado'].includes(a.resultado)).length },
        { id: 'points', label: 'Puntos propios', count: acciones.filter(a => a.resultado === 'punto').length }
    ];
}

export function actionsForReview(acciones, category) {
    switch (category) {
        case 'favorites': return acciones.filter(a => a.es_favorito);
        case 'errors': return acciones.filter(a => ['error', 'bloqueado'].includes(a.resultado));
        case 'k1-errors': return acciones.filter(a => a.complejo === 'K1' && ['error', 'bloqueado'].includes(a.resultado));
        case 'points': return acciones.filter(a => a.resultado === 'punto');
        default: return [];
    }
}
