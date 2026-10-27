// Estadísticas conjuntas de un equipo a partir de todos sus partidos (apuntados en el escritorio o
// importados de la tablet). Todo son funciones puras: la página solo pinta el resultado.
import { resumirRallies, cierraPunto, resumenSet } from './rallies-pista.js';
import { calcularTiempoJugadoPista, PESOS_VOTO } from './stats-calculator-pista.js';

const TIPOS_PROPIOS = ['saque', 'recepcion', 'colocacion', 'ataque', 'bloqueo', 'defensa', 'freeball'];
const CON_VOTO = ['saque', 'recepcion', 'ataque', 'bloqueo', 'defensa', 'colocacion', 'freeball'];
const VOTO_PRIOR = 6;
const VOTO_PRIOR_PESO = 4;

export const pct = (a, b) => (b ? (a / b) * 100 : null);
const vacioSO = () => ({ total: 0, ganados: 0 });
const sumar = (o, ganado) => { o.total++; if (ganado) o.ganados++; };

const jugadorVacio = (dorsal) => ({
  dorsal, nombre: '', partidos: new Set(), sets: new Set(),
  saque: { total: 0, ace: 0, err: 0, pos: 0 },
  recepcion: { total: 0, perfecta: 0, positiva: 0, err: 0 },
  ataque: { total: 0, puntos: 0, err: 0, bloq: 0 },
  bloqueo: { total: 0, puntos: 0, err: 0 },
  defensa: { total: 0, positiva: 0, err: 0 },
  votoSuma: 0, votoN: 0,
  tiempo: { sets: 0, puntosJugados: 0, ganados: 0, perdidos: 0, partidos: 0 },
  sacando: vacioSO()
});

function contarAccion(j, a) {
  const r = a.resultado;
  const t = a.tipo_accion;
  if (t === 'saque') {
    j.saque.total++;
    if (r === '#') j.saque.ace++;
    if (r === '=') j.saque.err++;
    if (r === '+') j.saque.pos++;
  } else if (t === 'recepcion') {
    j.recepcion.total++;
    if (r === '#') j.recepcion.perfecta++;
    if (r === '#' || r === '+') j.recepcion.positiva++;
    if (r === '=') j.recepcion.err++;
  } else if (t === 'ataque') {
    j.ataque.total++;
    if (r === '#') j.ataque.puntos++;
    if (r === '=') j.ataque.err++;
    if (r === '/') j.ataque.bloq++;
  } else if (t === 'bloqueo') {
    j.bloqueo.total++;
    if (r === '#') j.bloqueo.puntos++;
    if (r === '=') j.bloqueo.err++;
  } else if (t === 'defensa') {
    j.defensa.total++;
    if (r === '#' || r === '+') j.defensa.positiva++;
    if (r === '=') j.defensa.err++;
  }
  if (CON_VOTO.includes(t) && r in PESOS_VOTO) { j.votoSuma += PESOS_VOTO[r]; j.votoN++; }
}

const celdaAtaque = () => ({ total: 0, puntos: 0, err: 0, bloq: 0 });
const sumarAtaque = (c, r) => {
  c.total++;
  if (r === '#') c.puntos++;
  if (r === '=') c.err++;
  if (r === '/') c.bloq++;
};

function clasificarCierre(a, ganador) {
  const t = a.tipo_accion;
  const r = a.resultado;
  if (ganador === 'local') {
    if (t === 'ataque') return 'Ataque directo';
    if (t === 'saque') return 'Ace';
    if (t === 'bloqueo') return 'Bloqueo';
    if (t === 'rival' || t === 'error_general') return 'Error del rival';
    return 'Otros';
  }
  if (t === 'saque') return 'Error de saque';
  if (t === 'recepcion') return 'Error de recepción';
  if (t === 'ataque') return r === '/' ? 'Ataque bloqueado' : 'Error de ataque';
  if (t === 'defensa') return 'Error de defensa';
  if (t === 'bloqueo') return 'Error de bloqueo';
  if (t === 'error_general') return 'Error general';
  if (t === 'rival') return 'Punto directo del rival';
  return 'Otros';
}

function tiempoDePartido(p) {
  try {
    if (p.tiempo_jugado) return JSON.parse(p.tiempo_jugado);
    const rot = p.rotaciones_iniciales ? JSON.parse(p.rotaciones_iniciales) : null;
    if (rot && Object.keys(rot).length) {
      const t = calcularTiempoJugadoPista(p.acciones, p.roster, rot);
      return t.hayDatos ? t.porJugador : null;
    }
  } catch { /* datos corruptos: se ignora el tiempo de este partido */ }
  return null;
}

// Marcadores de set y sets ganados de un partido, a partir de los fin_set.
function resultadoPartido(p) {
  const sets = p.acciones.filter((a) => a.tipo_accion === 'fin_set').map((a) => ({
    set: Number(a.set_numero), l: Number(a.marcador_local) || 0, r: Number(a.marcador_rival) || 0, gana: a.resultado === 'local'
  }));
  const ganados = sets.filter((s) => s.gana).length;
  return { sets, ganados, perdidos: sets.length - ganados, victoria: sets.length ? ganados > sets.length - ganados : null };
}

const nuevoRot = () => ({
  so: vacioSO(), bp: vacioSO(),
  recepcion: { total: 0, positiva: 0, err: 0 }, ataque: celdaAtaque(),
  saqueErr: 0, saqueTotal: 0, cierres: {}
});

// partidos: [{ id, fecha, rival_nombre, acciones, roster, ... }]; jugadores: filas de jugadores_pista.
export function analizarEquipo(partidos, jugadores = []) {
  const jug = new Map();
  const getJ = (d) => { if (!jug.has(d)) jug.set(d, jugadorVacio(d)); return jug.get(d); };
  jugadores.forEach((j) => {
    const x = getJ(Number(j.dorsal));
    x.nombre = [j.nombre, j.apellidos].filter(Boolean).join(' ').trim();
    x.libero = !!j.es_libero;
  });

  const rot = [1, 2, 3, 4, 5, 6].map(() => nuevoRot());
  const global = { so: vacioSO(), bp: vacioSO(), puntosFavor: 0, puntosContra: 0 };
  const ganamos = {};
  const perdemos = {};
  const colocacion = { recBuena: {}, recMala: {}, defensa: {}, otro: {}, clutch: {} };
  const colocacionRot = [1, 2, 3, 4, 5, 6].map(() => ({}));
  const fuenteTotales = { recBuena: celdaAtaque(), recMala: celdaAtaque(), defensa: celdaAtaque(), otro: celdaAtaque() };
  const tiposAtaque = {};
  const clutch = { total: 0, ganados: 0, so: vacioSO(), bp: vacioSO() };
  const largo = { corto: vacioSO(), medio: vacioSO(), largo: vacioSO() };
  const porSetNum = {};
  const porRival = {};
  const rachas = { ganadora: 0, perdedora: 0, ventajaMax: 0 };
  const lista = [];
  let sets = { ganados: 0, perdidos: 0 };
  let victorias = 0; let derrotas = 0;
  let sinSetsCerrados = 0;

  const sumaColoc = (grupo, d, a) => {
    grupo[d] = grupo[d] || celdaAtaque();
    sumarAtaque(grupo[d], a.resultado);
  };

  partidos.forEach((p) => {
    const nombres = new Map();
    (p.roster || []).forEach((r) => {
      const d = Number(r.dorsal);
      const n = [r.nombre, r.apellidos].filter(Boolean).join(' ').trim();
      if (n) nombres.set(d, n);
      const x = getJ(d);
      if (!x.nombre && n) x.nombre = n;
      if (r.es_libero) x.libero = true;
    });

    const res = resultadoPartido(p);
    sets.ganados += res.ganados; sets.perdidos += res.perdidos;
    if (res.victoria === true) victorias++; else if (res.victoria === false) derrotas++; else sinSetsCerrados++;
    res.sets.forEach((s) => {
      const k = porSetNum[s.set] || (porSetNum[s.set] = { jugados: 0, ganados: 0, dif: 0 });
      k.jugados++; if (s.gana) k.ganados++; k.dif += s.l - s.r;
    });

    const partidoSO = vacioSO(); const partidoBP = vacioSO();
    const ataquePartido = celdaAtaque(); const recPartido = { total: 0, positiva: 0 };
    let favor = 0; let contra = 0;

    const rallies = resumirRallies(p.acciones);
    rallies.forEach((r) => {
      const nuestras = r.acciones.filter((a) => TIPOS_PROPIOS.includes(a.tipo_accion));
      const cierre = [...r.acciones].reverse().find(cierraPunto) || null;
      const cerrado = r.cerrado && r.ganador;
      const gana = r.ganador === 'local';
      const R = r.rotacion >= 1 && r.rotacion <= 6 ? r.rotacion - 1 : null;
      const sacamos = r.saqueInicio === 'local';

      // Marcador previo para situaciones de final de set.
      let enClutch = false;
      if (cerrado && r.marcador) {
        const pl = r.marcador.local - (gana ? 1 : 0);
        const pr = r.marcador.rival - (gana ? 0 : 1);
        const umbral = r.set >= 5 ? 11 : 20;
        enClutch = Math.min(pl, pr) >= umbral;
      }

      // Primer ataque tras recepción / defensa: a quién se la dan.
      let previa = null;
      nuestras.forEach((a) => {
        if (a.tipo_accion === 'recepcion') previa = { fuente: ['#', '+'].includes(a.resultado) ? 'recBuena' : 'recMala' };
        else if (a.tipo_accion === 'defensa') previa = { fuente: 'defensa' };
        else if (a.tipo_accion === 'ataque') {
          const fuente = previa?.fuente || 'otro';
          const d = Number(a.dorsal);
          sumaColoc(colocacion[fuente], d, a);
          sumarAtaque(fuenteTotales[fuente], a.resultado);
          if (fuente === 'recBuena') {
            if (R !== null) { colocacionRot[R][d] = colocacionRot[R][d] || celdaAtaque(); sumarAtaque(colocacionRot[R][d], a.resultado); }
            if (enClutch) sumaColoc(colocacion.clutch, d, a);
          }
          const tipo = (a.subtipo || '').trim();
          if (tipo) { tiposAtaque[tipo] = tiposAtaque[tipo] || celdaAtaque(); sumarAtaque(tiposAtaque[tipo], a.resultado); }
          previa = null;
        } else if (a.tipo_accion !== 'colocacion') previa = null;
      });

      // Contadores por jugador y por rotación.
      r.acciones.forEach((a) => {
        if (!TIPOS_PROPIOS.includes(a.tipo_accion)) return;
        const d = Number(a.dorsal);
        const x = getJ(d);
        x.partidos.add(p.id); x.sets.add(`${p.id}-${a.set_numero}`);
        contarAccion(x, a);
        if (a.tipo_accion === 'ataque') { sumarAtaque(ataquePartido, a.resultado); }
        if (a.tipo_accion === 'recepcion') { recPartido.total++; if (['#', '+'].includes(a.resultado)) recPartido.positiva++; }
        if (R !== null) {
          const z = rot[R];
          if (a.tipo_accion === 'recepcion') { z.recepcion.total++; if (['#', '+'].includes(a.resultado)) z.recepcion.positiva++; if (a.resultado === '=') z.recepcion.err++; }
          if (a.tipo_accion === 'ataque') sumarAtaque(z.ataque, a.resultado);
          if (a.tipo_accion === 'saque') { z.saqueTotal++; if (a.resultado === '=') z.saqueErr++; }
        }
      });

      if (!cerrado) return;
      const lado = sacamos ? 'bp' : 'so';
      sumar(global[lado], gana);
      sumar(sacamos ? partidoBP : partidoSO, gana);
      if (gana) { global.puntosFavor++; favor++; } else { global.puntosContra++; contra++; }
      if (R !== null) { sumar(rot[R][lado], gana); }
      if (enClutch) { clutch.total++; if (gana) clutch.ganados++; sumar(clutch[lado], gana); }

      const n = nuestras.length;
      sumar(n <= 2 ? largo.corto : n <= 4 ? largo.medio : largo.largo, gana);

      if (sacamos) {
        const saque = r.acciones.find((a) => a.tipo_accion === 'saque');
        if (saque) { const x = getJ(Number(saque.dorsal)); sumar(x.sacando, gana); }
      }
      if (cierre) {
        const c = clasificarCierre(cierre, r.ganador);
        const dic = gana ? ganamos : perdemos;
        dic[c] = (dic[c] || 0) + 1;
        if (R !== null) rot[R].cierres[c] = (rot[R].cierres[c] || 0) + (gana ? 0 : 1);
      }
    });

    // Rachas por set
    [...new Set(rallies.map((r) => r.set))].forEach((s) => {
      const rs = resumenSet(rallies.filter((r) => r.set === s));
      rachas.ganadora = Math.max(rachas.ganadora, rs.rachaLocal);
      rachas.perdedora = Math.max(rachas.perdedora, rs.rachaRival);
      rachas.ventajaMax = Math.max(rachas.ventajaMax, rs.ventajaLocal);
    });

    // Puntos jugados por jugador
    const t = tiempoDePartido(p);
    if (t) {
      Object.entries(t).forEach(([d, v]) => {
        const x = getJ(Number(d));
        x.tiempo.sets += Number(v.sets) || 0;
        x.tiempo.puntosJugados += v.puntosJugados || 0;
        x.tiempo.ganados += v.ganados || 0;
        x.tiempo.perdidos += v.perdidos || 0;
        x.tiempo.partidos++;
        x.partidos.add(p.id);
      });
    }

    const rival = p.rival_nombre || 'Rival';
    const rv = porRival[rival] || (porRival[rival] = { rival, v: 0, d: 0, favor: 0, contra: 0 });
    if (res.victoria === true) rv.v++; else if (res.victoria === false) rv.d++;
    rv.favor += favor; rv.contra += contra;

    lista.push({
      id: p.id, fecha: p.fecha, rival, victoria: res.victoria,
      sets: res.sets.length ? `${res.ganados}-${res.perdidos}` : (p.resultado || '–'),
      parciales: res.sets.map((s) => `${s.l}-${s.r}`).join(', ') || p.resultado_parciales || '',
      so: pct(partidoSO.ganados, partidoSO.total), bp: pct(partidoBP.ganados, partidoBP.total),
      ataquePuntos: pct(ataquePartido.puntos, ataquePartido.total),
      ataqueEf: pct(ataquePartido.puntos - ataquePartido.err - ataquePartido.bloq, ataquePartido.total),
      recPos: pct(recPartido.positiva, recPartido.total), favor, contra,
      origen: p.origen_uid ? 'tablet' : 'escritorio'
    });
  });

  // Totales y derivados por jugador
  const jugadoresOut = [...jug.values()].map((x) => {
    const voto = x.votoN ? (x.votoSuma + VOTO_PRIOR * VOTO_PRIOR_PESO) / (x.votoN + VOTO_PRIOR_PESO) : null;
    const anotados = x.ataque.puntos + x.saque.ace + x.bloqueo.puntos;
    const errores = x.saque.err + x.recepcion.err + x.ataque.err + x.ataque.bloq + x.bloqueo.err + x.defensa.err;
    return {
      ...x, partidos: x.partidos.size, setsJugados: x.tiempo.sets || x.sets.size, voto, anotados, errores,
      saldo: anotados - errores,
      ataqueEf: pct(x.ataque.puntos - x.ataque.err - x.ataque.bloq, x.ataque.total),
      anotadosPorPunto: pct(anotados, x.tiempo.puntosJugados)
    };
  }).filter((x) => x.partidos > 0 || x.tiempo.puntosJugados > 0)
    .sort((a, b) => a.dorsal - b.dorsal);

  const equipo = jugadoresOut.reduce((a, x) => {
    ['saque', 'recepcion', 'ataque', 'bloqueo', 'defensa'].forEach((k) => Object.keys(a[k]).forEach((f) => { a[k][f] += x[k][f]; }));
    return a;
  }, { saque: { total: 0, ace: 0, err: 0, pos: 0 }, recepcion: { total: 0, perfecta: 0, positiva: 0, err: 0 }, ataque: { total: 0, puntos: 0, err: 0, bloq: 0 }, bloqueo: { total: 0, puntos: 0, err: 0 }, defensa: { total: 0, positiva: 0, err: 0 } });

  // Distribución de colocación → filas ordenadas
  const filas = (grupo) => {
    const total = Object.values(grupo).reduce((a, c) => a + c.total, 0);
    return {
      total,
      jugadores: Object.entries(grupo).map(([d, c]) => ({
        dorsal: Number(d), ...c, reparto: pct(c.total, total), puntosPct: pct(c.puntos, c.total),
        ef: pct(c.puntos - c.err - c.bloq, c.total)
      })).sort((a, b) => b.total - a.total)
    };
  };

  const rotaciones = rot.map((z, i) => {
    const totalP = z.so.total + z.bp.total;
    const gan = z.so.ganados + z.bp.ganados;
    return {
      rot: i + 1, ...z, puntos: totalP, ganados: gan, dif: gan - (totalP - gan),
      pct: pct(gan, totalP), soPct: pct(z.so.ganados, z.so.total), bpPct: pct(z.bp.ganados, z.bp.total),
      recPos: pct(z.recepcion.positiva, z.recepcion.total), recErr: pct(z.recepcion.err, z.recepcion.total),
      ataqueEf: pct(z.ataque.puntos - z.ataque.err - z.ataque.bloq, z.ataque.total),
      ataquePts: pct(z.ataque.puntos, z.ataque.total),
      colocacion: filas(colocacionRot[i]).jugadores.slice(0, 3)
    };
  });
  const conDatos = rotaciones.filter((z) => z.puntos >= 5);
  const peor = conDatos.length ? conDatos.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;
  const mejor = conDatos.length ? conDatos.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;

  return {
    partidos: lista, victorias, derrotas, sinSetsCerrados, sets, global, equipo, jugadores: jugadoresOut,
    rotaciones, rotacionPeor: peor?.rot ?? null, rotacionMejor: mejor?.rot ?? null,
    colocacion: {
      recBuena: filas(colocacion.recBuena), recMala: filas(colocacion.recMala),
      defensa: filas(colocacion.defensa), clutch: filas(colocacion.clutch), otro: filas(colocacion.otro)
    },
    fuenteTotales, tiposAtaque, ganamos, perdemos, clutch, largo, porSetNum, porRival: Object.values(porRival), rachas
  };
}
