// pagina de guia de uso

import { router } from '../router.js';

export function registerGuia() {
    router.register('guia', async (container) => {
        container.innerHTML = `
            <div class="guia-page page-enter" style="max-width: 900px;">
                <div class="page-header">
                    <h1 class="page-title">📖 Guía de Uso</h1>
                    <p class="page-subtitle">Todo lo que necesitas saber para usar BVScouter</p>
                </div>

                <!-- indice -->
                <div class="card mb-24">
                    <h2 class="card-title">📋 Índice</h2>
                    <ul style="list-style: none; padding: 0; margin-top: 12px;">
                        <li style="padding: 6px 0;"><a href="#" class="guia-link" data-section="inicio" style="color: var(--accent-primary); text-decoration: none;">1. Primeros Pasos</a></li>
                        <li style="padding: 6px 0;"><a href="#" class="guia-link" data-section="jugadores" style="color: var(--accent-primary); text-decoration: none;">2. Gestión de Jugadores</a></li>
                        <li style="padding: 6px 0;"><a href="#" class="guia-link" data-section="partido" style="color: var(--accent-primary); text-decoration: none;">3. Crear un Partido</a></li>
                        <li style="padding: 6px 0;"><a href="#" class="guia-link" data-section="scouting" style="color: var(--accent-primary); text-decoration: none;">4. Scouting en Vivo</a></li>
                        <li style="padding: 6px 0;"><a href="#" class="guia-link" data-section="atajos" style="color: var(--accent-primary); text-decoration: none;">5. Atajos de Teclado</a></li>
                        <li style="padding: 6px 0;"><a href="#" class="guia-link" data-section="informe" style="color: var(--accent-primary); text-decoration: none;">6. Informes</a></li>
                        <li style="padding: 6px 0;"><a href="#" class="guia-link" data-section="glosario" style="color: var(--accent-primary); text-decoration: none;">7. Glosario de Voley Playa</a></li>
                        <li style="padding: 6px 0;"><a href="#" class="guia-link" data-section="faq" style="color: var(--accent-primary); text-decoration: none;">8. Preguntas Frecuentes</a></li>
                    </ul>
                </div>

                <!-- 1. primeros pasos -->
                <div class="card mb-24" id="section-inicio">
                    <h2 class="card-title" style="color: var(--accent-primary); margin-bottom: 16px;">1. 🚀 Primeros Pasos</h2>
                    <div style="color: var(--text-secondary); line-height: 1.7; font-size: 14px;">
                        <p>BVScouter es una herramienta profesional para analizar partidos de voley playa. El flujo de trabajo típico es:</p>
                        <ol style="margin: 12px 0 12px 20px;">
                            <li><strong>Registrar jugadores</strong> rivales que quieres analizar</li>
                            <li><strong>Crear un partido</strong> con la información del encuentro y el vídeo</li>
                            <li><strong>Hacer scouting</strong> registrando cada acción mientras ves el vídeo</li>
                            <li><strong>Generar el informe</strong> con todas las estadísticas y patrones</li>
                        </ol>
                        <p>La app guarda todos los datos automáticamente, así que puedes cerrar y volver cuando quieras.</p>
                    </div>
                </div>

                <!-- 2. jugadores -->
                <div class="card mb-24" id="section-jugadores">
                    <h2 class="card-title" style="color: var(--accent-primary); margin-bottom: 16px;">2. 👥 Gestión de Jugadores</h2>
                    <div style="color: var(--text-secondary); line-height: 1.7; font-size: 14px;">
                        <p>Antes de crear un partido necesitas registrar al menos <strong>2 jugadores</strong> (la pareja rival).</p>
                        <p style="margin-top: 8px;">Para cada jugador puedes guardar:</p>
                        <ul style="margin: 8px 0 8px 20px;">
                            <li><strong>Nombre y Apellidos</strong> (obligatorio)</li>
                            <li><strong>Nacionalidad</strong> - para identificarlos rápidamente</li>
                            <li><strong>Posición</strong> - Bloqueador, Defensor o Polivalente</li>
                            <li><strong>Notas</strong> - cualquier observación previa</li>
                        </ul>
                        <p>Los jugadores se reutilizan entre partidos, no hace falta crearlos cada vez.</p>
                    </div>
                </div>

                <!-- 3. partido -->
                <div class="card mb-24" id="section-partido">
                    <h2 class="card-title" style="color: var(--accent-primary); margin-bottom: 16px;">3. ➕ Crear un Partido</h2>
                    <div style="color: var(--text-secondary); line-height: 1.7; font-size: 14px;">
                        <p>Al crear un partido configuras:</p>
                        <ul style="margin: 8px 0 8px 20px;">
                            <li><strong>Fecha</strong> del partido</li>
                            <li><strong>Torneo y Fase</strong> (opcional pero recomendado)</li>
                            <li><strong>2 jugadores rivales</strong> seleccionados de tu base de datos</li>
                            <li><strong>Vídeo</strong> - enlace de YouTube o archivo local (.mp4, .avi, .mkv, .mov, .webm)</li>
                        </ul>
                        <p style="margin-top: 8px;">Una vez creado puedes elegir:</p>
                        <ul style="margin: 8px 0 8px 20px;">
                            <li><strong>"Crear y Empezar Scouting"</strong> - te lleva directamente a la pantalla de scouting</li>
                            <li><strong>"Solo Guardar"</strong> - guarda el partido para hacer scouting más tarde</li>
                        </ul>
                    </div>
                </div>

                <!-- 4. scouting -->
                <div class="card mb-24" id="section-scouting">
                    <h2 class="card-title" style="color: var(--accent-primary); margin-bottom: 16px;">4. 📋 Scouting en Vivo</h2>
                    <div style="color: var(--text-secondary); line-height: 1.7; font-size: 14px;">
                        <p>La pantalla de scouting es el <strong>corazón de la app</strong>. Se divide en:</p>

                        <h3 style="color: var(--text-primary); margin: 16px 0 8px; font-size: 15px;">🎬 Reproductor de Vídeo (izquierda)</h3>
                        <p>Muestra el vídeo del partido (YouTube o local). Usa los controles o atajos de teclado para navegar.</p>

                        <h3 style="color: var(--text-primary); margin: 16px 0 8px; font-size: 15px;">📝 Panel de Registro (derecha)</h3>
                        <p>Aquí registras cada acción. El flujo típico es:</p>
                        <ol style="margin: 8px 0 8px 20px;">
                            <li>Selecciona el <strong>jugador</strong> (teclas 1 o 2)</li>
                            <li>Selecciona el <strong>complejo</strong> (K1 o K2, tecla Q para alternar)</li>
                            <li>Selecciona el <strong>tipo de acción</strong> (S/R/A/B/D/C)</li>
                            <li>Selecciona el <strong>subtipo</strong> (haz clic en el subtipo específico)</li>
                            <li>Selecciona la <strong>zona del campo</strong> (opcional)</li>
                            <li>Marca el <strong>resultado</strong> (Enter=punto, Backspace=error, Tab=continuidad)</li>
                        </ol>
                        <p style="margin-top: 8px;">Al pulsar un resultado, la acción se registra automáticamente si ya hay un tipo de acción seleccionado.</p>

                        <h3 style="color: var(--text-primary); margin: 16px 0 8px; font-size: 15px;">📊 Stats en Vivo (abajo)</h3>
                        <p>Se actualizan en tiempo real con cada acción registrada. Verás el side-out %, ataques ganadores, errores, etc.</p>

                        <h3 style="color: var(--text-primary); margin: 16px 0 8px; font-size: 15px;">🔄 Timeline (debajo del vídeo)</h3>
                        <p>Muestra las últimas acciones registradas con timestamp del vídeo, jugador, tipo y resultado.</p>
                    </div>
                </div>

                <!-- 5. atajos -->
                <div class="card mb-24" id="section-atajos">
                    <h2 class="card-title" style="color: var(--accent-primary); margin-bottom: 16px;">5. ⌨️ Atajos de Teclado</h2>
                    <div class="table-container" style="margin-top: 12px;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tecla</th>
                                    <th>Acción</th>
                                    <th>Categoría</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td class="font-mono text-accent">1</td><td>Seleccionar Jugador 1</td><td><span class="badge badge-info">Jugador</span></td></tr>
                                <tr><td class="font-mono text-accent">2</td><td>Seleccionar Jugador 2</td><td><span class="badge badge-info">Jugador</span></td></tr>
                                <tr><td class="font-mono text-accent">Q</td><td>Alternar K1 ↔ K2</td><td><span class="badge badge-neutral">Complejo</span></td></tr>
                                <tr><td class="font-mono text-accent">S</td><td>Saque</td><td><span class="badge badge-warning">Acción</span></td></tr>
                                <tr><td class="font-mono text-accent">R</td><td>Recepción</td><td><span class="badge badge-warning">Acción</span></td></tr>
                                <tr><td class="font-mono text-accent">C</td><td>Colocación</td><td><span class="badge badge-warning">Acción</span></td></tr>
                                <tr><td class="font-mono text-accent">A</td><td>Ataque</td><td><span class="badge badge-warning">Acción</span></td></tr>
                                <tr><td class="font-mono text-accent">B</td><td>Bloqueo</td><td><span class="badge badge-warning">Acción</span></td></tr>
                                <tr><td class="font-mono text-accent">D</td><td>Defensa</td><td><span class="badge badge-warning">Acción</span></td></tr>
                                <tr><td class="font-mono text-accent">Enter</td><td>Resultado: Punto ✓</td><td><span class="badge badge-success">Resultado</span></td></tr>
                                <tr><td class="font-mono text-accent">Backspace</td><td>Resultado: Error ✗</td><td><span class="badge badge-error">Resultado</span></td></tr>
                                <tr><td class="font-mono text-accent">Tab</td><td>Resultado: Continuidad ↺</td><td><span class="badge badge-neutral">Resultado</span></td></tr>
                                <tr><td class="font-mono text-accent">Z</td><td>Deshacer última acción</td><td><span class="badge badge-info">Control</span></td></tr>
                                <tr><td class="font-mono text-accent">N</td><td>Nuevo set</td><td><span class="badge badge-info">Control</span></td></tr>
                                <tr><td class="font-mono text-accent">Espacio</td><td>Play / Pausa vídeo</td><td><span class="badge badge-neutral">Vídeo</span></td></tr>
                                <tr><td class="font-mono text-accent">→</td><td>Avanzar 5 segundos</td><td><span class="badge badge-neutral">Vídeo</span></td></tr>
                                <tr><td class="font-mono text-accent">←</td><td>Retroceder 5 segundos</td><td><span class="badge badge-neutral">Vídeo</span></td></tr>
                                <tr><td class="font-mono text-accent">.</td><td>Avanzar 1 frame</td><td><span class="badge badge-neutral">Vídeo</span></td></tr>
                                <tr><td class="font-mono text-accent">,</td><td>Retroceder 1 frame</td><td><span class="badge badge-neutral">Vídeo</span></td></tr>
                                <tr><td class="font-mono text-accent">+</td><td>Velocidad x2</td><td><span class="badge badge-neutral">Vídeo</span></td></tr>
                                <tr><td class="font-mono text-accent">-</td><td>Velocidad x0.5</td><td><span class="badge badge-neutral">Vídeo</span></td></tr>
                                <tr><td class="font-mono text-accent">F</td><td>Pantalla completa</td><td><span class="badge badge-neutral">Vídeo</span></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 6. informe -->
                <div class="card mb-24" id="section-informe">
                    <h2 class="card-title" style="color: var(--accent-primary); margin-bottom: 16px;">6. 📊 Informes</h2>
                    <div style="color: var(--text-secondary); line-height: 1.7; font-size: 14px;">
                        <p>El informe se genera automáticamente a partir de las acciones registradas e incluye:</p>
                        <ul style="margin: 8px 0 8px 20px;">
                            <li><strong>⭐ Side-Out %</strong> - El dato más importante. Porcentaje de puntos ganados en K1 (recepción)</li>
                            <li><strong>🎯 Golpes más repetidos</strong> - Gráfico de dona con los golpes favoritos de cada jugador</li>
                            <li><strong>⚡ Eficacia de ataque</strong> - (Kills - Errores) / Total × 100</li>
                            <li><strong>🏐 Distribución de saques</strong> - Tipos de saque y su frecuencia</li>
                            <li><strong>🤲 Calidad de recepción</strong> - Media de 0 a 3</li>
                            <li><strong>🧱 Bloqueo y defensa</strong> - Cantidad y tipos</li>
                            <li><strong>🧠 Patrones detectados</strong> - La app detecta automáticamente tendencias</li>
                            <li><strong>📝 Conclusiones</strong> - Campo libre para tus observaciones</li>
                        </ul>
                        <p style="margin-top: 12px;">Puedes exportar el informe a <strong>PDF</strong> para compartirlo con tu equipo.</p>
                    </div>
                </div>

                <!-- 7. glosario -->
                <div class="card mb-24" id="section-glosario">
                    <h2 class="card-title" style="color: var(--accent-primary); margin-bottom: 16px;">7. 📚 Glosario de Voley Playa</h2>
                    <div class="table-container" style="margin-top: 12px;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Término</th>
                                    <th>Descripción</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td class="text-accent" style="font-weight: 600;">Side-Out</td><td>Ganar el punto cuando tu equipo recibe el saque. Es el indicador más importante en voley playa.</td></tr>
                                <tr><td class="text-accent" style="font-weight: 600;">K1</td><td>Complejo 1 (Side-Out). Fase de juego que empieza con la recepción del saque.</td></tr>
                                <tr><td class="text-accent" style="font-weight: 600;">K2</td><td>Complejo 2 (Transición). Fase de juego que empieza con el saque propio, bloqueo y defensa.</td></tr>
                                <tr><td class="text-accent" style="font-weight: 600;">Cut Shot</td><td>Ataque cruzado con ángulo muy cerrado, dirigido cerca de la línea lateral del rival.</td></tr>
                                <tr><td class="text-accent" style="font-weight: 600;">Line Shot</td><td>Ataque dirigido por la línea (paralelo a la banda lateral).</td></tr>
                                <tr><td class="text-accent" style="font-weight: 600;">Poke</td><td>Golpe con los nudillos para colocar el balón suavemente por encima del bloqueo.</td></tr>
                                <tr><td class="text-accent" style="font-weight: 600;">Rainbow</td><td>Golpe alto y suave que busca pasar por encima del bloqueo y caer al fondo de la pista.</td></tr>
                                <tr><td class="text-accent" style="font-weight: 600;">Float Serve</td><td>Saque flotante sin rotación, con trayectoria impredecible (efecto "knuckleball").</td></tr>
                                <tr><td class="text-accent" style="font-weight: 600;">Jump Serve</td><td>Saque con salto y potencia. Puede ser flotante o con topspin.</td></tr>
                                <tr><td class="text-accent" style="font-weight: 600;">Skyball</td><td>Saque muy alto que busca dificultar la recepción usando el sol y el viento.</td></tr>
                                <tr><td class="text-accent" style="font-weight: 600;">Stuff Block</td><td>Bloqueo que devuelve el balón directamente al campo del atacante (punto directo).</td></tr>
                                <tr><td class="text-accent" style="font-weight: 600;">Peel</td><td>El bloqueador se retira de la red para convertirse en defensor de segunda línea.</td></tr>
                                <tr><td class="text-accent" style="font-weight: 600;">Dig</td><td>Defensa de un ataque potente, normalmente en plancha o con antebrazos.</td></tr>
                                <tr><td class="text-accent" style="font-weight: 600;">In-System</td><td>Cuando el equipo recibe bien y puede ejecutar su jugada ideal.</td></tr>
                                <tr><td class="text-accent" style="font-weight: 600;">Out-of-System</td><td>Cuando la recepción es mala y el equipo debe improvisar.</td></tr>
                                <tr><td class="text-accent" style="font-weight: 600;">Free Ball</td><td>Balón fácil que el rival devuelve sin atacar (pase alto por encima de la red).</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 8. faq -->
                <div class="card mb-24" id="section-faq">
                    <h2 class="card-title" style="color: var(--accent-primary); margin-bottom: 16px;">8. ❓ Preguntas Frecuentes</h2>
                    <div style="color: var(--text-secondary); line-height: 1.7; font-size: 14px;">
                        <div style="margin-bottom: 20px;">
                            <p style="font-weight: 600; color: var(--text-primary);">¿Dónde se guardan los datos?</p>
                            <p>Los datos se guardan en una base de datos local SQLite en la carpeta de datos de la aplicación. No necesitas conexión a internet.</p>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <p style="font-weight: 600; color: var(--text-primary);">¿Puedo usar vídeos de YouTube?</p>
                            <p>Sí, pega la URL del vídeo de YouTube al crear el partido. El vídeo se embebe directamente en la app. Ten en cuenta que los controles de teclado (avanzar, retroceder) solo funcionan con vídeos locales.</p>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <p style="font-weight: 600; color: var(--text-primary);">¿Qué formatos de vídeo soporta?</p>
                            <p>MP4, AVI, MKV, MOV y WebM.</p>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <p style="font-weight: 600; color: var(--text-primary);">¿Puedo hacer scouting sin vídeo?</p>
                            <p>Sí, puedes seleccionar "Sin Vídeo" al crear el partido y registrar acciones manualmente mientras ves el partido en directo.</p>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <p style="font-weight: 600; color: var(--text-primary);">¿Qué es el side-out y por qué es tan importante?</p>
                            <p>El side-out mide la capacidad de un equipo/jugador para ganar puntos cuando reciben el saque. Es el indicador #1 en el análisis de voley playa porque refleja la efectividad ofensiva en la fase más controlada del juego.</p>
                        </div>
                        <div>
                            <p style="font-weight: 600; color: var(--text-primary);">¿Puedo deshacer una acción mal registrada?</p>
                            <p>Sí, pulsa la tecla <strong>Z</strong> o el botón "Deshacer Última" para eliminar la última acción registrada.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // scroll suave a las secciones
        document.querySelectorAll('.guia-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = `section-${link.dataset.section}`;
                document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
            });
        });
    });
}
