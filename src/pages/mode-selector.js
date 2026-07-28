// pantalla de selección de modalidad: Voley Playa vs Voley Pista

import beachImg from '../assets/beach-volleyball.jpg';
import indoorImg from '../assets/indoor-volleyball.jpg';

export function renderModeSelector(container, onModeSelected) {
    container.style.display = 'block';

    container.innerHTML = `
        <div class="mode-selector-screen">
            <!-- formas decorativas flotantes -->
            <div class="floating-shape"></div>
            <div class="floating-shape"></div>
            <div class="floating-shape"></div>

            <div class="mode-selector-header">
                <span class="mode-selector-logo">🏐</span>
                <h1 class="mode-selector-title">BVScouter</h1>
                <p class="mode-selector-subtitle">Análisis Profesional de Voleibol</p>
            </div>

            <div class="mode-cards-container">
                <!-- Card Voley Playa -->
                <div class="mode-card" data-mode="playa" id="mode-card-playa">
                    <div class="mode-card-image-wrapper">
                        <img src="${beachImg}" alt="Voley Playa" class="mode-card-image" />
                    </div>
                    <div class="mode-card-content">
                        <span class="mode-card-emoji">🏖️</span>
                        <div class="mode-card-label">Beach Volleyball</div>
                        <h2 class="mode-card-title">Voley Playa</h2>
                        <p class="mode-card-description">
                            Scouting de parejas 2 vs 2. Análisis de side-out, ataques, recepción,
                            bloqueo y defensas con video integrado.
                        </p>
                        <div class="mode-card-features">
                            <span class="mode-card-feature">2 jugadores</span>
                            <span class="mode-card-feature">K1 / K2</span>
                            <span class="mode-card-feature">3 sets</span>
                            <span class="mode-card-feature">Side-Out</span>
                            <span class="mode-card-feature">Video</span>
                        </div>
                    </div>
                    <div class="mode-card-arrow">→</div>
                </div>

                <!-- Card Voley Pista -->
                <div class="mode-card" data-mode="pista" id="mode-card-pista">
                    <div class="mode-card-image-wrapper">
                        <img src="${indoorImg}" alt="Voley Pista" class="mode-card-image" />
                    </div>
                    <div class="mode-card-content">
                        <span class="mode-card-emoji">🏐</span>
                        <div class="mode-card-label">Indoor Volleyball</div>
                        <h2 class="mode-card-title">Voley Pista</h2>
                        <p class="mode-card-description">
                            Scouting de equipos 6 vs 6 estilo DataVolley. Estadísticas por dorsal,
                            rotaciones, informes profesionales y video.
                        </p>
                        <div class="mode-card-features">
                            <span class="mode-card-feature">Equipos</span>
                            <span class="mode-card-feature">Dorsales</span>
                            <span class="mode-card-feature">5 sets</span>
                            <span class="mode-card-feature">Rotaciones</span>
                            <span class="mode-card-feature">DataVolley</span>
                        </div>
                    </div>
                    <div class="mode-card-arrow">→</div>
                </div>
            </div>

            <div class="mode-selector-footer">
                <p>BVScouter v1.1.0 — Desarrollado por Darío Erades</p>
            </div>
        </div>
    `;

    // eventos de click
    container.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            
            // animación de salida
            const screen = container.querySelector('.mode-selector-screen');
            screen.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            screen.style.opacity = '0';
            screen.style.transform = 'scale(1.02)';
            
            setTimeout(() => {
                container.style.display = 'none';
                onModeSelected(mode);
            }, 400);
        });
    });
}
