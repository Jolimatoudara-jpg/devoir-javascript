/* ============================================================
   SCRIPT.JS — Jeu des Nombres Rapides
   Logique complète du jeu : minuterie, score, pavé, animations
   ============================================================ */


/* ─────────────────────────────────────────────
   1. RÉFÉRENCES AUX ÉLÉMENTS DU DOM
   ───────────────────────────────────────────── */

// Écrans principaux
const ecranAccueil = document.getElementById('ecran-accueil');
const ecranJeu     = document.getElementById('ecran-jeu');
const ecranFin     = document.getElementById('ecran-fin');

// Éléments de l'écran de jeu
const affichageNombre     = document.getElementById('nombre-affiche');    // Grand nombre à deviner
const affichageScore      = document.getElementById('affichage-score');   // Score en cours
const affichageTemps      = document.getElementById('affichage-temps');   // Secondes restantes
const affichageRecord     = document.getElementById('affichage-record');  // Meilleur score de session
const barreProgression    = document.getElementById('barre-progression'); // Barre 500 ms
const cercleTemps         = document.getElementById('cercle-temps');      // Cercle SVG du chrono
const zoneFeedback        = document.getElementById('zone-feedback');     // Message de retour

// Éléments de l'écran de fin
const scoreFinal    = document.getElementById('score-final');
const recordFinal   = document.getElementById('record-final');
const messagePerf   = document.getElementById('message-performance');


/* ─────────────────────────────────────────────
   2. VARIABLES D'ÉTAT DU JEU
   ───────────────────────────────────────────── */

let nombreActuel    = 0;        // Le nombre actuellement affiché (1-10)
let score           = 0;        // Score de la partie en cours
let meilleurScore   = 0;        // Meilleur score de la session (conservé entre parties)
let tempsRestant    = 60;       // Secondes restantes dans la partie

let intervalleNombre  = null;   // Référence au setInterval qui change le nombre (500 ms)
let intervalleTemps   = null;   // Référence au setInterval du compte à rebours (1 s)
let intervalleAnime   = null;   // Référence à l'animation de la barre de 500 ms
let timeoutFeedback   = null;   // Référence au timeout de nettoyage du feedback

// Constante : circonférence du cercle SVG (2π × r = 2π × 50 ≈ 314.16)
const CIRCONFERENCE_SVG = 2 * Math.PI * 50;

// Durée totale d'une partie en secondes
const DUREE_PARTIE = 60;


/* ─────────────────────────────────────────────
   3. FONCTIONS DE NAVIGATION ENTRE ÉCRANS
   ───────────────────────────────────────────── */

/**
 * Affiche uniquement l'écran dont l'id est passé en paramètre.
 * Retire la classe "actif" de tous les autres écrans.
 * @param {string} idEcran - L'id de l'écran à afficher
 */
function afficherEcran(idEcran) {
  // Retire "actif" de tous les écrans
  [ecranAccueil, ecranJeu, ecranFin].forEach(e => e.classList.remove('actif'));
  // Ajoute "actif" à l'écran cible
  document.getElementById(idEcran).classList.add('actif');
}

/**
 * Retour à l'écran d'accueil depuis l'écran de fin.
 * Arrête les intervalles en cours par sécurité.
 */
function allerAccueil() {
  arreterTousLesIntervalles();
  afficherEcran('ecran-accueil');
}


/* ─────────────────────────────────────────────
   4. LANCEMENT DE LA PARTIE
   ───────────────────────────────────────────── */

/**
 * Lance ou relance une partie.
 * Réinitialise toutes les variables, affiche l'écran de jeu,
 * puis démarre les deux minuteries (changement de nombre + compte à rebours).
 */
function lancerJeu() {
  // ── Réinitialisation des variables ──
  score        = 0;
  tempsRestant = DUREE_PARTIE;

  // ── Mise à jour de l'affichage initial ──
  affichageScore.textContent = '0';
  affichageRecord.textContent = meilleurScore;
  affichageTemps.textContent  = DUREE_PARTIE;
  zoneFeedback.textContent    = '';
  zoneFeedback.className      = 'feedback-zone';

  // Réinitialise le cercle SVG (plein = aucun décalage)
  cercleTemps.style.strokeDashoffset = '0';
  cercleTemps.style.stroke = 'var(--neon-cyan)'; // Remet la couleur cyan

  // ── Affichage de l'écran de jeu ──
  afficherEcran('ecran-jeu');

  // ── Arrêt des éventuels intervalles précédents ──
  arreterTousLesIntervalles();

  // ── Affiche immédiatement un premier nombre ──
  changerNombre();

  // ── Intervalle 1 : change le nombre affiché toutes les 500 ms ──
  intervalleNombre = setInterval(changerNombre, 500);

  // ── Intervalle 2 : compte à rebours, mis à jour chaque seconde ──
  intervalleTemps = setInterval(mettreAJourChrono, 1000);

  // ── Démarre l'animation de la barre de 500 ms ──
  animerBarre();
}


/* ─────────────────────────────────────────────
   5. GESTION DU NOMBRE ALÉATOIRE
   ───────────────────────────────────────────── */

/**
 * Génère un nouveau nombre aléatoire entre 1 et 10,
 * différent du précédent si possible, et met à jour l'affichage.
 */
function changerNombre() {
  // Génère un nouveau nombre, différent du précédent (si possible)
  let nouveau;
  do {
    nouveau = Math.floor(Math.random() * 10) + 1; // Entier entre 1 et 10 inclus
  } while (nouveau === nombreActuel && tempsRestant > 0);

  nombreActuel = nouveau;

  // Animation visuelle de changement (effet "flash")
  affichageNombre.classList.add('changement');
  setTimeout(() => affichageNombre.classList.remove('changement'), 120);

  // Met à jour le texte du nombre affiché
  affichageNombre.textContent = nombreActuel;

  // Réinitialise et relance l'animation de la barre de progression
  animerBarre();
}


/* ─────────────────────────────────────────────
   6. ANIMATION DE LA BARRE DE 500 MS
   ───────────────────────────────────────────── */

/**
 * Anime la barre de progression qui se vide en 500 ms.
 * Elle indique visuellement le temps restant avant le prochain changement.
 * Utilise une animation CSS via la propriété `transform: scaleX`.
 */
function animerBarre() {
  // Annule toute animation précédente
  barreProgression.style.transition = 'none';
  barreProgression.style.transform  = 'scaleX(1)'; // Remet à 100%

  // Force le navigateur à recalculer (reflow) pour que la transition reparte
  void barreProgression.offsetWidth;

  // Lance l'animation : réduction à 0 en 500 ms
  barreProgression.style.transition = 'transform 500ms linear';
  barreProgression.style.transform  = 'scaleX(0)';
}


/* ─────────────────────────────────────────────
   7. COMPTE À REBOURS
   ───────────────────────────────────────────── */

/**
 * Diminue le temps restant d'une seconde, met à jour l'affichage
 * et le cercle SVG. Déclenche la fin de partie quand tempsRestant === 0.
 */
function mettreAJourChrono() {
  tempsRestant--; // Décrémente d'une seconde

  // Met à jour l'affichage numérique
  affichageTemps.textContent = tempsRestant;

  // ── Calcul du décalage du cercle SVG ──
  // Quand tempsRestant = 60 → offset = 0 (cercle plein)
  // Quand tempsRestant = 0  → offset = 314.16 (cercle vide)
  const ratio  = tempsRestant / DUREE_PARTIE;          // Entre 0 et 1
  const offset = CIRCONFERENCE_SVG * (1 - ratio);      // Entre 0 et 314.16
  cercleTemps.style.strokeDashoffset = offset;

  // ── Changement de couleur selon l'urgence ──
  if (tempsRestant <= 10) {
    // Moins de 10 secondes : rouge urgence
    cercleTemps.style.stroke = 'var(--neon-rose)';
    affichageTemps.style.color = 'var(--neon-rose)';
  } else if (tempsRestant <= 20) {
    // Moins de 20 secondes : orange avertissement
    cercleTemps.style.stroke = 'var(--neon-orange)';
    affichageTemps.style.color = 'var(--neon-orange)';
  }

  // ── Fin de partie si plus de temps ──
  if (tempsRestant <= 0) {
    finDePartie();
  }
}


/* ─────────────────────────────────────────────
   8. SÉLECTION D'UN NOMBRE PAR LE JOUEUR
   ───────────────────────────────────────────── */

/**
 * Appelé quand le joueur appuie sur une touche du pavé numérique.
 * Compare le choix au nombre affiché, met à jour le score si correct,
 * et affiche un feedback visuel.
 * @param {number} choix - Le nombre sélectionné par le joueur (1-10)
 */
function selectionnerNombre(choix) {
  // Ignore les clics si le jeu n'est pas en cours
  if (tempsRestant <= 0) return;

  // Trouve le bouton correspondant au choix pour l'animation
  const touches  = document.querySelectorAll('.touche');
  let toucheChoisie = null;

  // Parcours des boutons pour trouver celui qui a été pressé
  touches.forEach(t => {
    if (parseInt(t.textContent) === choix) {
      toucheChoisie = t;
    }
  });

  // ── Réponse correcte ──
  if (choix === nombreActuel) {
    score++;                                        // Incrémente le score
    afficherScoreAvecAnimation(affichageScore, score); // Mise à jour animée

    // Flash vert sur la touche
    appliquerClasseTouche(toucheChoisie, 'correct');

    // Message de feedback positif
    afficherFeedback('✓ Correct !', 'bon');

  } else {
    // ── Réponse incorrecte ──
    // Le score ne change pas

    // Flash rouge sur la touche pressée
    appliquerClasseTouche(toucheChoisie, 'incorrect');

    // Message de feedback négatif (indique le bon nombre)
    afficherFeedback(`✗ C'était ${nombreActuel} !`, 'mauvais');
  }
}

/**
 * Applique temporairement une classe CSS à une touche (correct/incorrect).
 * Retire la classe après 300 ms.
 * @param {HTMLElement} touche - L'élément bouton ciblé
 * @param {string} classe      - La classe CSS à appliquer ('correct' ou 'incorrect')
 */
function appliquerClasseTouche(touche, classe) {
  if (!touche) return;
  touche.classList.add(classe);
  setTimeout(() => touche.classList.remove(classe), 300);
}

/**
 * Affiche un message de feedback pendant 400 ms puis l'efface.
 * @param {string} texte   - Le message à afficher
 * @param {string} type    - 'bon' (vert) ou 'mauvais' (rouge)
 */
function afficherFeedback(texte, type) {
  // Annule l'éventuel timeout précédent (évite les conflits)
  clearTimeout(timeoutFeedback);

  zoneFeedback.textContent = texte;
  zoneFeedback.className   = `feedback-zone ${type}`;

  // Efface le message après 400 ms
  timeoutFeedback = setTimeout(() => {
    zoneFeedback.textContent = '';
    zoneFeedback.className   = 'feedback-zone';
  }, 400);
}

/**
 * Met à jour l'affichage d'un score avec une animation "pulse".
 * @param {HTMLElement} element - L'élément d'affichage
 * @param {number} valeur       - La nouvelle valeur à afficher
 */
function afficherScoreAvecAnimation(element, valeur) {
  element.textContent = valeur;
  element.classList.add('pulse');
  setTimeout(() => element.classList.remove('pulse'), 200);
}


/* ─────────────────────────────────────────────
   9. FIN DE PARTIE
   ───────────────────────────────────────────── */

/**
 * Arrête les intervalles et affiche l'écran de fin de partie
 * avec le score final et un message d'évaluation.
 */
function finDePartie() {
  // Arrêt de toutes les minuteries
  arreterTousLesIntervalles();

  // Mise à jour du meilleur score de session si battu
  if (score > meilleurScore) {
    meilleurScore = score;
  }

  // Affichage des scores sur l'écran de fin
  scoreFinal.textContent  = score;
  recordFinal.textContent = meilleurScore;

  // Message d'évaluation selon la performance
  messagePerf.textContent = obtenirMessagePerformance(score);

  // Affiche l'écran de fin
  afficherEcran('ecran-fin');
}

/**
 * Retourne un message d'encouragement selon le score obtenu.
 * @param {number} s - Le score de la partie
 * @returns {string} - Le message d'évaluation
 */
function obtenirMessagePerformance(s) {
  if (s === 0)       return "Courage, il faut s'entraîner davantage !";
  if (s <= 5)        return "Bon début ! Continuez à vous entraîner.";
  if (s <= 15)       return "Pas mal ! Vos réflexes s'améliorent.";
  if (s <= 25)       return "Excellent ! Vous êtes un joueur rapide.";
  if (s <= 40)       return "Impressionnant ! Des réflexes de champion.";
  return               "Incroyable ! Vous êtes une véritable machine ! 🏆";
}


/* ─────────────────────────────────────────────
   10. UTILITAIRES
   ───────────────────────────────────────────── */

/**
 * Arrête tous les intervalles et timeouts actifs.
 * Appelé avant de lancer une nouvelle partie ou à la fin.
 */
function arreterTousLesIntervalles() {
  clearInterval(intervalleNombre);
  clearInterval(intervalleTemps);
  clearInterval(intervalleAnime);
  clearTimeout(timeoutFeedback);
}


/* ─────────────────────────────────────────────
   11. SUPPORT DU CLAVIER (1-9 et 0 pour 10)
   ───────────────────────────────────────────── */

/**
 * Écoute les touches du clavier physique pour une meilleure accessibilité.
 * Touche "1"-"9" → sélectionne 1 à 9.
 * Touche "0"     → sélectionne 10.
 */
document.addEventListener('keydown', function(evenement) {
  // Vérifie que l'écran de jeu est actif
  if (!ecranJeu.classList.contains('actif')) return;

  const touche = evenement.key;

  if (touche >= '1' && touche <= '9') {
    selectionnerNombre(parseInt(touche));    // Touches 1-9
  } else if (touche === '0') {
    selectionnerNombre(10);                  // Touche 0 → nombre 10
  }
});
