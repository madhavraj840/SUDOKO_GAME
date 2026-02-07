class AudioSystem {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.lastPlayTime = 0;
    }

    ensureContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, durationMs, volume) {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        gain.gain.value = 0;
        gain.gain.linearRampToValueAtTime(volume, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + durationMs / 1000);
    }

    playClick() {
        this.playTone(600, 60, 0.08);
    }

    playPlace() {
        this.playTone(420, 90, 0.10);
    }

    playConflict() {
        this.playTone(180, 140, 0.12);
    }

    playHint() {
        this.playTone(760, 120, 0.10);
    }

    playWin() {
        this.playTone(880, 220, 0.12);
    }

    playVictory() {
        this.playTone(660, 120, 0.10);
        setTimeout(() => this.playTone(880, 140, 0.12), 140);
        setTimeout(() => this.playTone(1100, 160, 0.12), 300);
    }
}

class SudokuGame {
    constructor() {
        this.grid = [];
        this.originalGrid = [];
        this.solution = [];
        this.selectedCell = null;
        this.timer = 0;
        this.timerInterval = null;
        this.difficulty = 'medium';
        this.isGameComplete = false;
        this.isPaused = false;
        this.hintsUsed = 0;
    
        // **MONETIZATION: Game currency and rewards**
        this.coins = 0;
        this.speedMultiplier = 1.0; // 2x reward if speedMultiplier = 2
        this.undoCount = 3; // Free undos per game
    
        // **MONETIZATION: Cosmetics system**
        this.currentTheme = 'default';
        this.unlockedThemes = ['default']; // Start with default
        this.currentBoardColor = 'default';
        this.unlockedBoardColors = ['default'];
    
        // **LOCALIZATION**
        this.lang = this.detectLanguage();
        this.translations = this.getTranslations();

        // **ONBOARDING / RETENTION**
        this.isTouchDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
        this.tutorial = { active: false, step: 0 };
        this.pendingAction = null;
        this.sessionStart = Date.now();
        this.firstMoveTracked = false;
        this.dailyChallengeMode = false;
        this.random = Math.random;
        this.hasUserStarted = false;
        this.isAdActive = false;
        this.loadingFinishedSent = false;
        this.loadingFinishedTimer = null;
        this.audioEnabledBeforeAd = null;
        this.eventListenersInitialized = false; // Prevent duplicate event listeners
        this.languageSelectorInitialized = false;
            this.usedSolve = false; // Track if user used solve button

        this.achievements = this.loadAchievements();
        this.leaderboard = this.loadLeaderboard();
        this.streakData = this.loadStreak();

        // **AUDIO/HAPTICS**
        this.audio = new AudioSystem();
        this.lastConflictAt = 0;
    
        this.loadUserProgress();
        this.initializeTheme();
        this.applyThemeStyling();
        this.applyTranslations();
        this.setupScreenNavigation();
        // Don't start game automatically - wait for user to select difficulty
    }

    initializeTheme() {
        // Default is dark mode (set in HTML)
        // Only change if user previously saved light mode preference
        const savedTheme = localStorage.getItem('sudokuTheme');
        if (savedTheme === 'light') {
            document.body.classList.remove('dark-mode');
        } else {
            // Ensure dark mode is set and save it as default
            document.body.classList.add('dark-mode');
            if (!savedTheme) {
                localStorage.setItem('sudokuTheme', 'dark');
            }
        }
        this.updateAllThemeIcons();
    }

    detectLanguage() {
        // Always start in English; do not persist language selection
        localStorage.removeItem('sudokuLang');
        console.log('[Language] Defaulting to English (no persistence)');
        return 'en';
    }

    getTranslations() {
        return {
            en: {
                app_title: 'Sudoku Game',
                loading_title: 'Sudoku Game',
                loading_text: 'Loading Game...',
                game_title: 'Sudoku',
                language_label: 'Language',
                back_button: '← Back',
                back_menu_button: '← Menu',
                customization_title: 'Customize Theme',
                theme_default_name: 'Default',
                theme_default_desc: 'Original Sudoku theme',
                theme_classic_name: 'Classic',
                theme_classic_desc: 'The original Sudoku theme',
                theme_ocean_name: 'Ocean Blue',
                theme_ocean_desc: 'Calm ocean-inspired colors',
                theme_forest_name: 'Forest Green',
                theme_forest_desc: 'Peaceful green theme',
                theme_sunset_name: 'Sunset',
                theme_sunset_desc: 'Warm sunset colors',
                theme_purple_name: 'Purple Haze',
                theme_purple_desc: 'Mystical purple theme',
                theme_neon_name: 'Neon Lights',
                theme_neon_desc: 'Vibrant neon colors',
                theme_status_active: '✓ Active',
                theme_status_unlocked: '✓ Unlocked',
                theme_status_locked: '🔒 Locked',
                theme_btn_current: 'Currently Active',
                theme_btn_select: 'Select Theme',
                theme_price_coins: 'coins',
                theme_btn_unlock_coins: 'Unlock ({cost} Coins)',
                theme_btn_unlock_ad: 'Unlock (Watch Ad)',
                theme_need_more_coins: 'You need {remaining} more coins!',
                theme_confirm_unlock: 'Unlock "{theme}" for {cost} coins?',
                theme_unlocked_message: 'Theme "{theme}" unlocked!',
                theme_unlocked_ad_message: 'Theme "{theme}" unlocked! Thanks for watching ads!',
                theme_changed_message: 'Theme changed to "{theme}"!',
                ad_playing_message: 'Playing advertisement...',
                new_game: 'New Game',
                new_game_menu: 'New Game',
                saved_game: 'Saved Game',
                difficulty_screen_title: 'Choose Difficulty Level',
                reset: 'Reset',
                solve: 'Solve',
                difficulty_label: 'Difficulty:',
                difficulty_text_label: 'Difficulty',
                time_label: 'Time',
                difficulty_easy: 'Easy',
                difficulty_medium: 'Medium',
                difficulty_hard: 'Hard',
                pause_title: 'Pause game',
                resume_title: 'Resume game',
                hint_button: 'Get Hint (Watch Ad)',
                clear: 'Clear',
                modal_title: 'Congratulations!',
                modal_message: 'You\'ve completed the puzzle!',
                play_again: 'Play Again',
                coin_boost: '⚡ 2x Coins',
                undo: '↶ Undo',
                customize: '🎨 Customize',
                confirm_new_game: 'You have unsaved progress — start a new game and lose current progress?',
                confirm_change_difficulty: 'You have unsaved progress — change difficulty and start a new game?',
                confirm_change_difficulty_plain: 'Change difficulty and start a new game?',
                confirm_reset: 'Reset will remove your current entries and restore the original puzzle. Continue?',
                confirm_reset_plain: 'Reset the puzzle to the original state?',
                select_cell_first: 'Please select a cell first!',
                game_paused: 'Game is paused! Resume to continue playing.',
                resume_to_use_hints: 'Resume the game to use hints!',
                game_already_complete: 'Game is already complete!',
                no_empty_cells: 'No empty cells to hint!',
                ad_skipped: 'Ad was skipped. {reward} not granted.',
                ad_error: 'Error loading ad. Please try again.',
                reward_hint: 'Hint',
                reward_undo: 'Additional undo',
                reward_speed_boost: '2x Coin bonus',
                reward_cosmetic: 'Cosmetic unlock',
                reward_generic: 'Reward',
                prompt_ok: 'OK',
                prompt_cancel: 'Cancel',
                tutorial_title: 'How to Play',
                tutorial_start: 'Tutorial started: follow the steps below.',
                tutorial_complete: 'Tutorial complete! You are ready to play.',
                tutorial_step_1: 'Tap a cell to select it.',
                tutorial_step_2: 'Use the number pad to place a number.',
                tutorial_step_3: 'Use Clear to remove a mistake.',
                tutorial_step_4: 'Use a hint when you are stuck.',
                tutorial_step_5: 'Finish a puzzle to win.',
                streak_label: 'Streak',
                leaderboard_title: 'Leaderboard (Best Times)',
                achievements_title: 'Achievements',
                daily_challenge: 'Daily Challenge',
                leaderboard_btn: 'Leaderboard',
                achievements_btn: 'Achievements',
                tutorial_next: 'Next',
                tutorial_skip: 'Skip',
                speed_boost_active_label: '⚡ 2x Active',
                speed_boost_active_title: '2x Coin bonus active',
                speed_boost_btn_title: 'Watch ad for 2x coins',
                toggle_theme: 'Toggle dark mode',
                daily_challenge_start: 'Daily challenge started. Good luck!',
                msg_new_game: 'New game started.',
                msg_reset: 'Puzzle reset to original state.',
                msg_resume: 'Game resumed.',
                achievement_unlocked: 'Achievement unlocked!',
                ach_first_win: 'First Win',
                ach_first_win_desc: 'Complete your first puzzle.',
                ach_no_hints: 'No Hints',
                ach_no_hints_desc: 'Complete a puzzle without hints.',
                ach_under_5: 'Speed Runner',
                ach_under_5_desc: 'Complete a puzzle under 5 minutes.',
                ach_daily_3: 'Daily Streak',
                ach_daily_3_desc: 'Complete 3 days in a row.',
                undo_used: 'Undo used ({remaining} free left). To undo more, watch an ad!',
                undo_granted: '✓ Extra undo granted! You now have {count} undos available.',
                speed_boost_active: 'Speed boost already active! Complete a puzzle to use it.',
                speed_boost_granted: '✓ Speed Boost activated! Earn 2x coins on your next puzzle!',
                coins_earned_html: 'You completed the puzzle in {time}!<br><span style="font-size: 0.9em; color: gold;">💰 Earned {coins} coins</span>',
                theme_locked: 'Theme "{theme}" is not unlocked yet!',
                theme_unlocked: '✓ New theme unlocked: {theme}!',
                board_color_unlocked: '✓ New board color unlocked: {color}!',
                customize_menu: '🎨 COSMETICS MENU\n\nUnlocked Themes: {themes}\nUnlocked Colors: {colors}\n\nWatch ads to unlock more!\n\n(Customize feature coming soon)'
            },
            fr: {
                app_title: 'Jeu de Sudoku',
                loading_title: 'Jeu de Sudoku',
                loading_text: 'Chargement du jeu...',
                game_title: 'Sudoku',
                language_label: 'Langue',
                back_button: '← Retour',
                back_menu_button: '← Menu',
                customization_title: 'Personnaliser le theme',
                theme_default_name: 'Par defaut',
                theme_default_desc: 'Theme Sudoku original',
                theme_classic_name: 'Classique',
                theme_classic_desc: 'Le theme original de Sudoku',
                theme_ocean_name: 'Bleu ocean',
                theme_ocean_desc: 'Couleurs calmes inspirees de l\'ocean',
                theme_forest_name: 'Vert foret',
                theme_forest_desc: 'Theme vert paisible',
                theme_sunset_name: 'Coucher de soleil',
                theme_sunset_desc: 'Couleurs chaudes du coucher de soleil',
                theme_purple_name: 'Brume violette',
                theme_purple_desc: 'Theme violet mystique',
                theme_neon_name: 'Lumières neon',
                theme_neon_desc: 'Couleurs neon vibrantes',
                theme_status_active: '✓ Actif',
                theme_status_unlocked: '✓ Debloque',
                theme_status_locked: '🔒 Verrouille',
                theme_btn_current: 'Actuellement actif',
                theme_btn_select: 'Selectionner',
                theme_price_coins: 'pieces',
                theme_btn_unlock_coins: 'Debloquer ({cost} pieces)',
                theme_btn_unlock_ad: 'Debloquer (Voir pub)',
                theme_need_more_coins: 'Il vous faut encore {remaining} pieces!',
                theme_confirm_unlock: 'Debloquer "{theme}" pour {cost} pieces?',
                theme_unlocked_message: 'Theme "{theme}" debloque!',
                theme_unlocked_ad_message: 'Theme "{theme}" debloque! Merci d\'avoir regarde des pubs!',
                theme_changed_message: 'Theme change en "{theme}"!',
                ad_playing_message: 'Lecture de la pub...',
                new_game: 'Nouvelle partie',
                new_game_menu: 'Nouvelle partie',
                saved_game: 'Partie sauvegardée',
                difficulty_screen_title: 'Choisir le niveau de difficulté',
                reset: 'Réinitialiser',
                solve: 'Resoudre',
                difficulty_label: 'Difficulte:',
                difficulty_text_label: 'Difficulte',
                time_label: 'Temps',
                difficulty_easy: 'Facile',
                difficulty_medium: 'Moyen',
                difficulty_hard: 'Difficile',
                pause_title: 'Mettre en pause',
                resume_title: 'Reprendre',
                hint_button: 'Indice (Voir pub)',
                clear: 'Effacer',
                modal_title: 'Bravo!',
                modal_message: 'Vous avez termine la grille!',
                play_again: 'Rejouer',
                coin_boost: '⚡ Pieces x2',
                undo: '↶ Annuler',
                customize: '🎨 Personnaliser',
                confirm_new_game: 'Progression non sauvegardee — commencer une nouvelle partie et perdre la progression?',
                confirm_change_difficulty: 'Progression non sauvegardee — changer la difficulte et recommencer?',
                confirm_change_difficulty_plain: 'Changer la difficulte et recommencer?',
                confirm_reset: 'Reinitialiser effacera vos entrees et restaurera la grille originale. Continuer?',
                confirm_reset_plain: 'Reinitialiser la grille a son etat original?',
                select_cell_first: 'Veuillez d\'abord selectionner une case!',
                game_paused: 'Jeu en pause! Reprenez pour continuer.',
                resume_to_use_hints: 'Reprenez la partie pour utiliser un indice!',
                game_already_complete: 'La grille est deja terminee!',
                no_empty_cells: 'Aucune case vide a indiquer!',
                ad_skipped: 'Pub ignoree. {reward} non accorde.',
                ad_error: 'Erreur de chargement de la pub. Reessayez.',
                reward_hint: 'Indice',
                reward_undo: 'Annulation supplementaire',
                reward_speed_boost: 'Bonus pieces x2',
                reward_cosmetic: 'Deblocage cosmetique',
                reward_generic: 'Recompense',
                prompt_ok: 'OK',
                prompt_cancel: 'Annuler',
                tutorial_title: 'Comment jouer',
                tutorial_start: 'Tutoriel demarre: suivez les etapes ci-dessous.',
                tutorial_complete: 'Tutoriel termine! Vous etes pret a jouer.',
                tutorial_step_1: 'Touchez une case pour la selectionner.',
                tutorial_step_2: 'Utilisez le pavé numerique pour placer un nombre.',
                tutorial_step_3: 'Utilisez Effacer pour corriger une erreur.',
                tutorial_step_4: 'Utilisez un indice si vous etes bloque.',
                tutorial_step_5: 'Terminez un puzzle pour gagner.',
                streak_label: 'Serie',
                leaderboard_title: 'Classement (Meilleurs temps)',
                achievements_title: 'Succes',
                daily_challenge: 'Defi du jour',
                leaderboard_btn: 'Classement',
                achievements_btn: 'Succes',
                tutorial_next: 'Suivant',
                tutorial_skip: 'Passer',
                speed_boost_active_label: '⚡ x2 Actif',
                speed_boost_active_title: 'Bonus pieces x2 actif',
                speed_boost_btn_title: 'Regarder une pub pour x2 pieces',
                toggle_theme: 'Basculer le mode sombre',
                daily_challenge_start: 'Defi du jour lance. Bonne chance!',
                msg_new_game: 'Nouvelle partie lancee.',
                msg_reset: 'Grille reinitialisee.',
                msg_resume: 'Partie reprise.',
                achievement_unlocked: 'Succes debloque!',
                ach_first_win: 'Premiere victoire',
                ach_first_win_desc: 'Terminer votre premier puzzle.',
                ach_no_hints: 'Sans indice',
                ach_no_hints_desc: 'Terminer un puzzle sans indice.',
                ach_under_5: 'Rapide',
                ach_under_5_desc: 'Terminer un puzzle en moins de 5 minutes.',
                ach_daily_3: 'Serie quotidienne',
                ach_daily_3_desc: 'Terminer 3 jours de suite.',
                undo_used: 'Annulation utilisee ({remaining} gratuites restantes). Regardez une pub pour plus!',
                undo_granted: '✓ Annulation accordee! Vous avez {count} annulations disponibles.',
                speed_boost_active: 'Bonus deja actif! Terminez une grille pour l\'utiliser.',
                speed_boost_granted: '✓ Bonus active! Gagnez x2 pieces au prochain puzzle!',
                coins_earned_html: 'Grille terminee en {time}!<br><span style="font-size: 0.9em; color: gold;">💰 +{coins} pieces</span>',
                theme_locked: 'Theme "{theme}" non debloque!',
                theme_unlocked: '✓ Nouveau theme debloque: {theme}!',
                board_color_unlocked: '✓ Nouvelle couleur debloquee: {color}!',
                customize_menu: '🎨 MENU COSMETIQUES\n\nThemes debloques: {themes}\nCouleurs debloquees: {colors}\n\nRegardez des pubs pour debloquer plus!\n\n(Personnalisation bientot)'
            },
            it: {
                app_title: 'Gioco Sudoku',
                loading_title: 'Gioco Sudoku',
                loading_text: 'Caricamento gioco...',
                game_title: 'Sudoku',
                language_label: 'Lingua',
                back_button: '← Indietro',
                back_menu_button: '← Menu',
                customization_title: 'Personalizza tema',
                theme_default_name: 'Predefinito',
                theme_default_desc: 'Tema Sudoku originale',
                theme_classic_name: 'Classico',
                theme_classic_desc: 'Il tema originale di Sudoku',
                theme_ocean_name: 'Blu oceano',
                theme_ocean_desc: 'Colori calmi ispirati all\'oceano',
                theme_forest_name: 'Verde foresta',
                theme_forest_desc: 'Tema verde tranquillo',
                theme_sunset_name: 'Tramonto',
                theme_sunset_desc: 'Colori caldi del tramonto',
                theme_purple_name: 'Foschia viola',
                theme_purple_desc: 'Tema viola mistico',
                theme_neon_name: 'Luci neon',
                theme_neon_desc: 'Colori neon vivaci',
                theme_status_active: '✓ Attivo',
                theme_status_unlocked: '✓ Sbloccato',
                theme_status_locked: '🔒 Bloccato',
                theme_btn_current: 'Attualmente attivo',
                theme_btn_select: 'Seleziona tema',
                theme_price_coins: 'monete',
                theme_btn_unlock_coins: 'Sblocca ({cost} monete)',
                theme_btn_unlock_ad: 'Sblocca (Guarda annuncio)',
                theme_need_more_coins: 'Ti servono altre {remaining} monete!',
                theme_confirm_unlock: 'Sbloccare "{theme}" per {cost} monete?',
                theme_unlocked_message: 'Tema "{theme}" sbloccato!',
                theme_unlocked_ad_message: 'Tema "{theme}" sbloccato! Grazie per aver guardato gli annunci!',
                theme_changed_message: 'Tema cambiato in "{theme}"!',
                ad_playing_message: 'Riproduzione annuncio...',
                new_game: 'Nuova partita',
                new_game_menu: 'Nuova partita',
                saved_game: 'Partita salvata',
                difficulty_screen_title: 'Scegli il livello di difficoltà',
                reset: 'Ripristina',
                solve: 'Risolvere',
                difficulty_label: 'Difficolta:',
                difficulty_text_label: 'Difficolta',
                time_label: 'Tempo',
                difficulty_easy: 'Facile',
                difficulty_medium: 'Medio',
                difficulty_hard: 'Difficile',
                pause_title: 'Metti in pausa',
                resume_title: 'Riprendi',
                hint_button: 'Suggerimento (Guarda annuncio)',
                clear: 'Cancella',
                modal_title: 'Complimenti!',
                modal_message: 'Hai completato il puzzle!',
                play_again: 'Gioca ancora',
                coin_boost: '⚡ Monete x2',
                undo: '↶ Annulla',
                customize: '🎨 Personalizza',
                confirm_new_game: 'Progressi non salvati — iniziare una nuova partita e perdere i progressi?',
                confirm_change_difficulty: 'Progressi non salvati — cambiare difficolta e ricominciare?',
                confirm_change_difficulty_plain: 'Cambiare difficolta e ricominciare?',
                confirm_reset: 'Il ripristino rimuovera le tue mosse e ripristinera la griglia. Continuare?',
                confirm_reset_plain: 'Ripristinare la griglia allo stato originale?',
                select_cell_first: 'Seleziona prima una cella!',
                game_paused: 'Gioco in pausa! Riprendi per continuare.',
                resume_to_use_hints: 'Riprendi il gioco per usare i suggerimenti!',
                game_already_complete: 'Il puzzle e gia completo!',
                no_empty_cells: 'Nessuna cella vuota da suggerire!',
                ad_skipped: 'Annuncio saltato. {reward} non assegnato.',
                ad_error: 'Errore nel caricamento dell\'annuncio. Riprova.',
                reward_hint: 'Suggerimento',
                reward_undo: 'Annullamento extra',
                reward_speed_boost: 'Bonus monete x2',
                reward_cosmetic: 'Sblocco estetico',
                reward_generic: 'Ricompensa',
                prompt_ok: 'OK',
                prompt_cancel: 'Annulla',
                tutorial_title: 'Come si gioca',
                tutorial_start: 'Tutorial avviato: segui i passaggi sotto.',
                tutorial_complete: 'Tutorial completato! Sei pronto a giocare.',
                tutorial_step_1: 'Tocca una cella per selezionarla.',
                tutorial_step_2: 'Usa il tastierino per inserire un numero.',
                tutorial_step_3: 'Usa Cancella per correggere un errore.',
                tutorial_step_4: 'Usa un suggerimento quando sei bloccato.',
                tutorial_step_5: 'Completa un puzzle per vincere.',
                streak_label: 'Serie',
                leaderboard_title: 'Classifica (Migliori tempi)',
                achievements_title: 'Obiettivi',
                daily_challenge: 'Sfida giornaliera',
                leaderboard_btn: 'Classifica',
                achievements_btn: 'Obiettivi',
                tutorial_next: 'Avanti',
                tutorial_skip: 'Salta',
                speed_boost_active_label: '⚡ x2 Attivo',
                speed_boost_active_title: 'Bonus monete x2 attivo',
                speed_boost_btn_title: 'Guarda annuncio per monete x2',
                toggle_theme: 'Attiva/disattiva tema scuro',
                daily_challenge_start: 'Sfida giornaliera avviata. Buona fortuna!',
                msg_new_game: 'Nuova partita iniziata.',
                msg_reset: 'Puzzle ripristinato.',
                msg_resume: 'Gioco ripreso.',
                achievement_unlocked: 'Obiettivo sbloccato!',
                ach_first_win: 'Prima vittoria',
                ach_first_win_desc: 'Completa il tuo primo puzzle.',
                ach_no_hints: 'Senza suggerimenti',
                ach_no_hints_desc: 'Completa un puzzle senza suggerimenti.',
                ach_under_5: 'Veloce',
                ach_under_5_desc: 'Completa un puzzle sotto 5 minuti.',
                ach_daily_3: 'Serie giornaliera',
                ach_daily_3_desc: 'Completa 3 giorni di fila.',
                undo_used: 'Annullamento usato ({remaining} gratuiti rimasti). Guarda un annuncio per altri!',
                undo_granted: '✓ Annullamento extra concesso! Hai {count} annullamenti disponibili.',
                speed_boost_active: 'Bonus gia attivo! Completa un puzzle per usarlo.',
                speed_boost_granted: '✓ Bonus attivo! Guadagna x2 monete nel prossimo puzzle!',
                coins_earned_html: 'Puzzle completato in {time}!<br><span style="font-size: 0.9em; color: gold;">💰 +{coins} monete</span>',
                theme_locked: 'Tema "{theme}" non sbloccato!',
                theme_unlocked: '✓ Nuovo tema sbloccato: {theme}!',
                board_color_unlocked: '✓ Nuovo colore sbloccato: {color}!',
                customize_menu: '🎨 MENU COSMETICI\n\nTemi sbloccati: {themes}\nColori sbloccati: {colors}\n\nGuarda annunci per sbloccarne altri!\n\n(Personalizzazione in arrivo)'
            },
            de: {
                app_title: 'Sudoku Spiel',
                loading_title: 'Sudoku Spiel',
                loading_text: 'Spiel wird geladen...',
                game_title: 'Sudoku',
                language_label: 'Sprache',
                back_button: '← Zuruck',
                back_menu_button: '← Menu',
                customization_title: 'Thema anpassen',
                theme_default_name: 'Standard',
                theme_default_desc: 'Originales Sudoku-Thema',
                theme_classic_name: 'Klassisch',
                theme_classic_desc: 'Das originale Sudoku-Thema',
                theme_ocean_name: 'Ozeanblau',
                theme_ocean_desc: 'Ruhige, ozean-inspirierte Farben',
                theme_forest_name: 'Waldgrun',
                theme_forest_desc: 'Friedliches grunes Thema',
                theme_sunset_name: 'Sonnenuntergang',
                theme_sunset_desc: 'Warme Sonnenuntergangsfarben',
                theme_purple_name: 'Violetter Dunst',
                theme_purple_desc: 'Mystisches violettes Thema',
                theme_neon_name: 'Neonlichter',
                theme_neon_desc: 'Lebendige Neonfarben',
                theme_status_active: '✓ Aktiv',
                theme_status_unlocked: '✓ Freigeschaltet',
                theme_status_locked: '🔒 Gesperrt',
                theme_btn_current: 'Derzeit aktiv',
                theme_btn_select: 'Thema wahlen',
                theme_price_coins: 'Munzen',
                theme_btn_unlock_coins: 'Freischalten ({cost} Munzen)',
                theme_btn_unlock_ad: 'Freischalten (Werbung ansehen)',
                theme_need_more_coins: 'Du brauchst noch {remaining} Munzen!',
                theme_confirm_unlock: '"{theme}" fur {cost} Munzen freischalten?',
                theme_unlocked_message: 'Thema "{theme}" freigeschaltet!',
                theme_unlocked_ad_message: 'Thema "{theme}" freigeschaltet! Danke fur das Ansehen der Werbung!',
                theme_changed_message: 'Thema geandert zu "{theme}"!',
                ad_playing_message: 'Werbung wird abgespielt...',
                new_game: 'Neues Spiel',
                new_game_menu: 'Neues Spiel',
                saved_game: 'Gespeichertes Spiel',
                difficulty_screen_title: 'Schwierigkeitsgrad wählen',
                reset: 'Zurucksetzen',
                solve: 'Losung',
                difficulty_label: 'Schwierigkeit:',
                difficulty_text_label: 'Schwierigkeit',
                time_label: 'Zeit',
                difficulty_easy: 'Einfach',
                difficulty_medium: 'Mittel',
                difficulty_hard: 'Schwer',
                pause_title: 'Pausieren',
                resume_title: 'Fortsetzen',
                hint_button: 'Hinweis (Werbung ansehen)',
                clear: 'Loschen',
                modal_title: 'Gluckwunsch!',
                modal_message: 'Du hast das Puzzle gelost!',
                play_again: 'Nochmal spielen',
                coin_boost: '⚡ 2x Munzen',
                undo: '↶ Ruckgangig',
                customize: '🎨 Anpassen',
                confirm_new_game: 'Ungespeicherter Fortschritt — neues Spiel starten und Fortschritt verlieren?',
                confirm_change_difficulty: 'Ungespeicherter Fortschritt — Schwierigkeit andern und neu starten?',
                confirm_change_difficulty_plain: 'Schwierigkeit andern und neu starten?',
                confirm_reset: 'Zurucksetzen entfernt deine Eintrage und stellt das Original wieder her. Fortfahren?',
                confirm_reset_plain: 'Puzzle auf den Originalzustand zurucksetzen?',
                select_cell_first: 'Bitte zuerst eine Zelle auswahlen!',
                game_paused: 'Spiel pausiert! Zum Weiterspielen fortsetzen.',
                resume_to_use_hints: 'Spiel fortsetzen, um Hinweise zu nutzen!',
                game_already_complete: 'Das Puzzle ist bereits fertig!',
                no_empty_cells: 'Keine leeren Zellen fur einen Hinweis!',
                ad_skipped: 'Werbung ubersprungen. {reward} nicht gewahrt.',
                ad_error: 'Fehler beim Laden der Werbung. Bitte erneut versuchen.',
                reward_hint: 'Hinweis',
                reward_undo: 'Zusatz-Ruckgangig',
                reward_speed_boost: '2x Munzen-Bonus',
                reward_cosmetic: 'Kosmetik-Freischaltung',
                reward_generic: 'Belohnung',
                prompt_ok: 'OK',
                prompt_cancel: 'Abbrechen',
                tutorial_title: 'So spielst du',
                tutorial_start: 'Tutorial gestartet: folge den Schritten unten.',
                tutorial_complete: 'Tutorial abgeschlossen! Du bist bereit.',
                tutorial_step_1: 'Tippe auf eine Zelle, um sie zu wahlen.',
                tutorial_step_2: 'Nutze das Zahlenfeld, um eine Zahl zu setzen.',
                tutorial_step_3: 'Nutze Loschen, um einen Fehler zu entfernen.',
                tutorial_step_4: 'Nutze einen Hinweis, wenn du feststeckst.',
                tutorial_step_5: 'Beende ein Puzzle, um zu gewinnen.',
                streak_label: 'Serie',
                leaderboard_title: 'Bestenliste (Beste Zeiten)',
                achievements_title: 'Erfolge',
                daily_challenge: 'Tagliche Herausforderung',
                leaderboard_btn: 'Bestenliste',
                achievements_btn: 'Erfolge',
                tutorial_next: 'Weiter',
                tutorial_skip: 'Uberspringen',
                speed_boost_active_label: '⚡ 2x Aktiv',
                speed_boost_active_title: '2x Munzen-Bonus aktiv',
                speed_boost_btn_title: 'Werbung fur 2x Munzen ansehen',
                toggle_theme: 'Dunkelmodus umschalten',
                daily_challenge_start: 'Tagliche Herausforderung gestartet. Viel Gluck!',
                msg_new_game: 'Neues Spiel gestartet.',
                msg_reset: 'Puzzle wurde zuruckgesetzt.',
                msg_resume: 'Spiel fortgesetzt.',
                achievement_unlocked: 'Erfolg freigeschaltet!',
                ach_first_win: 'Erster Sieg',
                ach_first_win_desc: 'Beende dein erstes Puzzle.',
                ach_no_hints: 'Ohne Hinweise',
                ach_no_hints_desc: 'Beende ein Puzzle ohne Hinweise.',
                ach_under_5: 'Schnell',
                ach_under_5_desc: 'Beende ein Puzzle in unter 5 Minuten.',
                ach_daily_3: 'Tagliche Serie',
                ach_daily_3_desc: 'Beende 3 Tage in Folge.',
                undo_used: 'Ruckgangig benutzt ({remaining} kostenlos ubrig). Werbung fur mehr ansehen!',
                undo_granted: '✓ Extra Ruckgangig gewahrt! Du hast {count} Ruckgangig.',
                speed_boost_active: 'Boost bereits aktiv! Puzzle abschlieen, um ihn zu nutzen.',
                speed_boost_granted: '✓ Boost aktiv! Verdiene 2x Munzen im nachsten Puzzle!',
                coins_earned_html: 'Puzzle in {time} gelost!<br><span style="font-size: 0.9em; color: gold;">💰 +{coins} Munzen</span>',
                theme_locked: 'Thema "{theme}" ist nicht freigeschaltet!',
                theme_unlocked: '✓ Neues Thema freigeschaltet: {theme}!',
                board_color_unlocked: '✓ Neue Farbe freigeschaltet: {color}!',
                customize_menu: '🎨 KOSMETIK MENÜ\n\nFreigeschaltete Themen: {themes}\nFreigeschaltete Farben: {colors}\n\nWerbung ansehen, um mehr freizuschalten!\n\n(Anpassung folgt)'
            },
            es: {
                app_title: 'Juego de Sudoku',
                loading_title: 'Juego de Sudoku',
                loading_text: 'Cargando juego...',
                game_title: 'Sudoku',
                language_label: 'Idioma',
                back_button: '← Atras',
                back_menu_button: '← Menu',
                customization_title: 'Personalizar tema',
                theme_default_name: 'Predeterminado',
                theme_default_desc: 'Tema Sudoku original',
                theme_classic_name: 'Clasico',
                theme_classic_desc: 'El tema original de Sudoku',
                theme_ocean_name: 'Azul oceano',
                theme_ocean_desc: 'Colores calmos inspirados en el oceano',
                theme_forest_name: 'Verde bosque',
                theme_forest_desc: 'Tema verde tranquilo',
                theme_sunset_name: 'Atardecer',
                theme_sunset_desc: 'Colores calidos del atardecer',
                theme_purple_name: 'Niebla morada',
                theme_purple_desc: 'Tema morado mistico',
                theme_neon_name: 'Luces neon',
                theme_neon_desc: 'Colores neon vibrantes',
                theme_status_active: '✓ Activo',
                theme_status_unlocked: '✓ Desbloqueado',
                theme_status_locked: '🔒 Bloqueado',
                theme_btn_current: 'Actualmente activo',
                theme_btn_select: 'Seleccionar tema',
                theme_price_coins: 'monedas',
                theme_btn_unlock_coins: 'Desbloquear ({cost} monedas)',
                theme_btn_unlock_ad: 'Desbloquear (Ver anuncio)',
                theme_need_more_coins: 'Necesitas {remaining} monedas mas!',
                theme_confirm_unlock: 'Desbloquear "{theme}" por {cost} monedas?',
                theme_unlocked_message: 'Tema "{theme}" desbloqueado!',
                theme_unlocked_ad_message: 'Tema "{theme}" desbloqueado! Gracias por ver anuncios!',
                theme_changed_message: 'Tema cambiado a "{theme}"!',
                ad_playing_message: 'Reproduciendo anuncio...',
                new_game: 'Nuevo juego',
                new_game_menu: 'Nuevo juego',
                saved_game: 'Juego guardado',
                difficulty_screen_title: 'Elegir nivel de dificultad',
                reset: 'Reiniciar',
                solve: 'Resolver',
                difficulty_label: 'Dificultad:',
                difficulty_text_label: 'Dificultad',
                time_label: 'Tiempo',
                difficulty_easy: 'Facil',
                difficulty_medium: 'Medio',
                difficulty_hard: 'Dificil',
                pause_title: 'Pausar juego',
                resume_title: 'Reanudar juego',
                hint_button: 'Pista (Ver anuncio)',
                clear: 'Borrar',
                modal_title: 'Felicidades!',
                modal_message: 'Has completado el rompecabezas!',
                play_again: 'Jugar de nuevo',
                coin_boost: '⚡ Monedas x2',
                undo: '↶ Deshacer',
                customize: '🎨 Personalizar',
                confirm_new_game: 'Progreso sin guardar — iniciar un nuevo juego y perder el progreso?',
                confirm_change_difficulty: 'Progreso sin guardar — cambiar dificultad y reiniciar?',
                confirm_change_difficulty_plain: 'Cambiar dificultad y reiniciar?',
                confirm_reset: 'Reiniciar eliminara tus entradas y restaurara el tablero original. Continuar?',
                confirm_reset_plain: 'Reiniciar el tablero al estado original?',
                select_cell_first: 'Primero selecciona una celda!',
                game_paused: 'Juego en pausa! Reanuda para continuar.',
                resume_to_use_hints: 'Reanuda el juego para usar pistas!',
                game_already_complete: 'El juego ya esta completo!',
                no_empty_cells: 'No hay celdas vacias para mostrar!',
                ad_skipped: 'Anuncio omitido. {reward} no otorgado.',
                ad_error: 'Error al cargar el anuncio. Intentalo de nuevo.',
                reward_hint: 'Pista',
                reward_undo: 'Deshacer extra',
                reward_speed_boost: 'Bono monedas x2',
                reward_cosmetic: 'Desbloqueo cosmetico',
                reward_generic: 'Recompensa',
                prompt_ok: 'OK',
                prompt_cancel: 'Cancelar',
                tutorial_title: 'Como jugar',
                tutorial_start: 'Tutorial iniciado: sigue los pasos abajo.',
                tutorial_complete: 'Tutorial completo! Ya puedes jugar.',
                tutorial_step_1: 'Toca una celda para seleccionarla.',
                tutorial_step_2: 'Usa el teclado numerico para poner un numero.',
                tutorial_step_3: 'Usa Borrar para corregir un error.',
                tutorial_step_4: 'Usa una pista si te atascas.',
                tutorial_step_5: 'Completa un puzzle para ganar.',
                streak_label: 'Racha',
                leaderboard_title: 'Clasificacion (Mejores tiempos)',
                achievements_title: 'Logros',
                daily_challenge: 'Desafio diario',
                leaderboard_btn: 'Clasificacion',
                achievements_btn: 'Logros',
                tutorial_next: 'Siguiente',
                tutorial_skip: 'Saltar',
                speed_boost_active_label: '⚡ x2 Activo',
                speed_boost_active_title: 'Bono de monedas x2 activo',
                speed_boost_btn_title: 'Ver anuncio para x2 monedas',
                toggle_theme: 'Alternar modo oscuro',
                daily_challenge_start: 'Desafio diario iniciado. Buena suerte!',
                msg_new_game: 'Nuevo juego iniciado.',
                msg_reset: 'Puzzle reiniciado.',
                msg_resume: 'Juego reanudado.',
                achievement_unlocked: 'Logro desbloqueado!',
                ach_first_win: 'Primera victoria',
                ach_first_win_desc: 'Completa tu primer puzzle.',
                ach_no_hints: 'Sin pistas',
                ach_no_hints_desc: 'Completa un puzzle sin pistas.',
                ach_under_5: 'Rapido',
                ach_under_5_desc: 'Completa un puzzle en menos de 5 minutos.',
                ach_daily_3: 'Racha diaria',
                ach_daily_3_desc: 'Completa 3 dias seguidos.',
                undo_used: 'Deshacer usado ({remaining} gratis restantes). Mira un anuncio para mas!',
                undo_granted: '✓ Deshacer extra otorgado! Tienes {count} disponibles.',
                speed_boost_active: 'El impulso ya esta activo! Completa un puzzle para usarlo.',
                speed_boost_granted: '✓ Impulso activo! Gana 2x monedas en el proximo puzzle!',
                coins_earned_html: 'Puzzle completado en {time}!<br><span style="font-size: 0.9em; color: gold;">💰 +{coins} monedas</span>',
                theme_locked: 'El tema "{theme}" no esta desbloqueado!',
                theme_unlocked: '✓ Nuevo tema desbloqueado: {theme}!',
                board_color_unlocked: '✓ Nuevo color desbloqueado: {color}!',
                customize_menu: '🎨 MENU DE COSMETICOS\n\nTemas desbloqueados: {themes}\nColores desbloqueados: {colors}\n\nMira anuncios para desbloquear mas!\n\n(Personalizacion pronto)'
            },
            hi: {
                app_title: 'सुडोकू गेम',
                loading_title: 'सुडोकू गेम',
                loading_text: 'गेम लोड हो रहा है...',
                game_title: 'सुडोकू',
                language_label: 'भाषा',
                back_button: '← वापस',
                back_menu_button: '← मेनू',
                customization_title: 'थीम अनुकूलित करें',
                theme_default_name: 'डिफ़ॉल्ट',
                theme_default_desc: 'मूल सुडोकू थीम',
                theme_classic_name: 'क्लासिक',
                theme_classic_desc: 'मूल सुडोकू थीम',
                theme_ocean_name: 'ओशन ब्लू',
                theme_ocean_desc: 'समुद्र-प्रेरित शांत रंग',
                theme_forest_name: 'फॉरेस्ट ग्रीन',
                theme_forest_desc: 'शांत हरी थीम',
                theme_sunset_name: 'सनसेट',
                theme_sunset_desc: 'गर्म सनसेट रंग',
                theme_purple_name: 'पर्पल हेज',
                theme_purple_desc: 'रहस्यमय बैंगनी थीम',
                theme_neon_name: 'नियोन लाइट्स',
                theme_neon_desc: 'चटकीले नियोन रंग',
                theme_status_active: '✓ सक्रिय',
                theme_status_unlocked: '✓ अनलॉक',
                theme_status_locked: '🔒 लॉक',
                theme_btn_current: 'पहले से चयनित',
                theme_btn_select: 'थीम चुनें',
                theme_price_coins: 'कॉइन्स',
                theme_btn_unlock_coins: 'अनलॉक ({cost} कॉइन्स)',
                theme_btn_unlock_ad: 'अनलॉक (विज्ञापन देखें)',
                theme_need_more_coins: 'आपको {remaining} कॉइन्स और चाहिए!',
                theme_confirm_unlock: '"{theme}" को {cost} कॉइन्स में अनलॉक करें?',
                theme_unlocked_message: 'थीम "{theme}" अनलॉक हो गई!',
                theme_unlocked_ad_message: 'थीम "{theme}" अनलॉक हो गई! विज्ञापन देखने के लिए धन्यवाद!',
                theme_changed_message: 'थीम "{theme}" पर बदल दी गई!',
                ad_playing_message: 'विज्ञापन चल रहा है...',
                new_game: 'नया गेम',
                new_game_menu: 'नया गेम',
                saved_game: 'सहेजा हुआ गेम',
                difficulty_screen_title: 'कठिनाई स्तर चुनें',
                reset: 'रीसेट',
                solve: 'हल करें',
                difficulty_label: 'कठिनाई:',
                difficulty_text_label: 'कठिनाई',
                time_label: 'समय',
                difficulty_easy: 'आसान',
                difficulty_medium: 'मध्यम',
                difficulty_hard: 'कठिन',
                pause_title: 'गेम रोकें',
                resume_title: 'गेम जारी रखें',
                hint_button: 'संकेत (विज्ञापन देखें)',
                clear: 'क्लियर',
                modal_title: 'बधाई!',
                modal_message: 'आपने पहेली पूरी कर ली!',
                play_again: 'फिर से खेलें',
                coin_boost: '⚡ 2x कॉइन्स',
                undo: '↶ पूर्ववत',
                customize: '🎨 कस्टमाइज़',
                confirm_new_game: 'असहेजी प्रगति है — नया गेम शुरू करें और वर्तमान प्रगति खो दें?',
                confirm_change_difficulty: 'असहेजी प्रगति है — कठिनाई बदलें और नया गेम शुरू करें?',
                confirm_change_difficulty_plain: 'कठिनाई बदलें और नया गेम शुरू करें?',
                confirm_reset: 'रीसेट करने पर आपकी प्रविष्टियां हट जाएंगी और मूल पहेली लौट आएगी। जारी रखें?',
                confirm_reset_plain: 'पहेली को मूल स्थिति में रीसेट करें?',
                select_cell_first: 'पहले कोई सेल चुनें!',
                game_paused: 'गेम रुका है! जारी रखने के लिए फिर शुरू करें।',
                resume_to_use_hints: 'संकेत उपयोग करने के लिए गेम जारी करें!',
                game_already_complete: 'पहेली पहले से पूरी है!',
                no_empty_cells: 'संकेत देने के लिए कोई खाली सेल नहीं है!',
                ad_skipped: 'विज्ञापन छोड़ा गया। {reward} नहीं मिला।',
                ad_error: 'विज्ञापन लोड करने में त्रुटि। फिर प्रयास करें।',
                reward_hint: 'संकेत',
                reward_undo: 'अतिरिक्त पूर्ववत',
                reward_speed_boost: '2x कॉइन्स बोनस',
                reward_cosmetic: 'कॉस्मेटिक अनलॉक',
                reward_generic: 'इनाम',
                prompt_ok: 'ठीक',
                prompt_cancel: 'रद्द करें',
                tutorial_title: 'कैसे खेलें',
                tutorial_start: 'ट्यूटोरियल शुरू: नीचे दिए गए चरणों का पालन करें।',
                tutorial_complete: 'ट्यूटोरियल पूरा! आप खेलने के लिए तैयार हैं।',
                tutorial_step_1: 'सेल चुनने के लिए उस पर टैप करें।',
                tutorial_step_2: 'नंबर डालने के लिए नंबर पैड का उपयोग करें।',
                tutorial_step_3: 'गलती सुधारने के लिए क्लियर का उपयोग करें।',
                tutorial_step_4: 'अटके होने पर संकेत उपयोग करें।',
                tutorial_step_5: 'जीतने के लिए पहेली पूरी करें।',
                streak_label: 'स्ट्रीक',
                leaderboard_title: 'लीडरबोर्ड (सबसे अच्छे समय)',
                achievements_title: 'उपलब्धियां',
                daily_challenge: 'डेली चैलेंज',
                leaderboard_btn: 'लीडरबोर्ड',
                achievements_btn: 'उपलब्धियां',
                tutorial_next: 'आगे',
                tutorial_skip: 'स्किप',
                speed_boost_active_label: '⚡ 2x सक्रिय',
                speed_boost_active_title: '2x कॉइन्स बोनस सक्रिय',
                speed_boost_btn_title: '2x कॉइन्स के लिए विज्ञापन देखें',
                toggle_theme: 'डार्क मोड बदलें',
                daily_challenge_start: 'डेली चैलेंज शुरू हो गया। शुभकामनाएं!',
                msg_new_game: 'नया गेम शुरू हुआ।',
                msg_reset: 'पहेली रीसेट हो गई।',
                msg_resume: 'गेम फिर शुरू हुआ।',
                achievement_unlocked: 'उपलब्धि अनलॉक!',
                ach_first_win: 'पहली जीत',
                ach_first_win_desc: 'अपनी पहली पहेली पूरी करें।',
                ach_no_hints: 'बिना संकेत',
                ach_no_hints_desc: 'बिना संकेत के पहेली पूरी करें।',
                ach_under_5: 'तेज़',
                ach_under_5_desc: '5 मिनट से कम में पहेली पूरी करें।',
                ach_daily_3: 'डेली स्ट्रीक',
                ach_daily_3_desc: 'लगातार 3 दिन पूरा करें।',
                undo_used: 'पूर्ववत उपयोग हुआ ({remaining} मुफ्त बचे)। और के लिए विज्ञापन देखें!',
                undo_granted: '✓ अतिरिक्त पूर्ववत मिला! आपके पास {count} पूर्ववत हैं।',
                speed_boost_active: 'बूस्ट पहले से सक्रिय है! उपयोग के लिए पहेली पूरी करें।',
                speed_boost_granted: '✓ बूस्ट सक्रिय! अगली पहेली में 2x कॉइन्स मिलेंगे!',
                coins_earned_html: 'पहेली {time} में पूरी!<br><span style="font-size: 0.9em; color: gold;">💰 +{coins} कॉइन्स</span>',
                theme_locked: 'थीम "{theme}" अभी अनलॉक नहीं है!',
                theme_unlocked: '✓ नई थीम अनलॉक: {theme}!',
                board_color_unlocked: '✓ नया बोर्ड रंग अनलॉक: {color}!',
                customize_menu: '🎨 कॉस्मेटिक्स मेनू\n\nअनलॉक थीम: {themes}\nअनलॉक रंग: {colors}\n\nअधिक अनलॉक करने के लिए विज्ञापन देखें!\n\n(कस्टमाइज़ फीचर जल्द आ रहा है)'
            }
        };
    }

    t(key, vars = {}) {
        const dict = this.translations[this.lang] || this.translations.en;
        let text = dict[key] || this.translations.en[key] || key;
        Object.keys(vars).forEach((varKey) => {
            const value = String(vars[varKey]);
            text = text.replace(new RegExp(`\\{${varKey}\\}`, 'g'), value);
        });
        return text;
    }

    applyTranslations() {
        console.log('[Translations] applyTranslations() called with language:', this.lang);
        document.title = this.t('app_title');

        const setText = (id, key) => {
            const el = document.getElementById(id);
            if (el) {
                const text = this.t(key);
                el.textContent = text;
                console.log('[Translations] Updated element:', id, '=', text);
            } else {
                console.warn('[Translations] Element not found:', id);
            }
        };

        const setTitle = (id, key) => {
            const el = document.getElementById(id);
            if (el) {
                const text = this.t(key);
                el.title = text;
                console.log('[Translations] Updated title:', id, '=', text);
            } else {
                console.warn('[Translations] Element not found for title:', id);
            }
        };

        setText('loadingTitle', 'loading_title');
        setText('loadingText', 'loading_text');
        setText('gameLogoTitle', 'game_title');
        setText('gameTitle', 'game_title');
        setText('languageLabel', 'language_label');
        setText('newGameBtn', 'new_game');
        setText('newGameMenuBtn', 'new_game_menu');
        setText('savedGameBtn', 'saved_game');
        setText('dailyChallengeMenuBtn', 'daily_challenge');
        setText('customizeMenuBtn', 'customize');
        setText('difficultyTitle', 'difficulty_screen_title');
        setText('customizationTitle', 'customization_title');
        setText('resetBtn', 'reset');
        setText('solveBtn', 'solve');
        setText('difficultyLabel', 'difficulty_label');
        setText('difficultyTextLabel', 'difficulty_text_label');
        setText('timeLabel', 'time_label');
        setText('hintButtonLabel', 'hint_button');
        setText('clearBtn', 'clear');
        setText('modalTitle', 'modal_title');
        setText('modalMessage', 'modal_message');
        setText('playAgainBtn', 'play_again');
        setText('speedBoostBtn', 'coin_boost');
        setText('undoBtn', 'undo');
        setText('dailyChallengeBtn', 'daily_challenge');
        setText('streakLabel', 'streak_label');
        setText('leaderboardTitle', 'leaderboard_title');
        setText('achievementsTitle', 'achievements_title');
        setText('tutorialTitle', 'tutorial_title');
        setText('tutorialNext', 'tutorial_next');
        setText('tutorialSkip', 'tutorial_skip');
        setText('promptConfirm', 'prompt_ok');
        setText('promptCancel', 'prompt_cancel');
        setText('leaderboardBtn', 'leaderboard_btn');
        setText('achievementsBtn', 'achievements_btn');

        setText('difficultyBackBtn', 'back_button');
        setText('customizationBackBtn', 'back_button');
        setText('gameBackBtn', 'back_menu_button');

        setText('speedBoostActiveLabel', 'speed_boost_active_label');
        setTitle('speedBoostActiveLabel', 'speed_boost_active_title');
        setTitle('speedBoostBtn', 'speed_boost_btn_title');
        setTitle('themeToggleStart', 'toggle_theme');
        setTitle('themeToggleDifficulty', 'toggle_theme');
        setTitle('themeToggleCustomization', 'toggle_theme');
        setTitle('themeToggleGame', 'toggle_theme');

        // Difficulty screen buttons
        setText('diffEasyBtn', 'difficulty_easy');
        setText('diffMediumBtn', 'difficulty_medium');
        setText('diffHardBtn', 'difficulty_hard');

        const difficultyButtons = document.querySelectorAll('.difficulty-btn');
        difficultyButtons.forEach((btn) => {
            const level = btn.dataset.difficulty;
            if (level === 'easy') btn.textContent = this.t('difficulty_easy');
            if (level === 'medium') btn.textContent = this.t('difficulty_medium');
            if (level === 'hard') btn.textContent = this.t('difficulty_hard');
        });

        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.title = this.isPaused ? this.t('resume_title') : this.t('pause_title');
        }

        const langSelect = document.getElementById('languageSelect');
        if (langSelect) {
            langSelect.value = this.lang;
            console.log('[Translations] Language selector updated to:', this.lang);
        } else {
            console.warn('[Translations] Language selector not found');
        }

        this.updateDifficultyText();
        this.updateMonetizationUI();
        this.updateEngagementUI();
        console.log('[Translations] All translations applied successfully for language:', this.lang);
    }

    updateDifficultyText() {
        const difficultyText = this.getDifficultyLabel(this.difficulty);
        const dailySuffix = this.dailyChallengeMode ? ` (${this.t('daily_challenge')})` : '';
        const difficultyEl = document.getElementById('difficulty');
        if (difficultyEl) {
            difficultyEl.textContent = `${difficultyText}${dailySuffix}`;
            console.log('[UI] Difficulty display updated:', difficultyText);
        }
    }

    getDifficultyLabel(difficulty) {
        if (difficulty === 'easy') return this.t('difficulty_easy');
        if (difficulty === 'hard') return this.t('difficulty_hard');
        return this.t('difficulty_medium');
    }

    triggerHaptic(pattern) {
        if (navigator && typeof navigator.vibrate === 'function') {
            navigator.vibrate(pattern);
        }
    }

    isCellConflicting(row, col) {
        const val = this.grid[row][col];
        if (!val) return false;

        for (let i = 0; i < 9; i++) {
            if (i !== col && this.grid[row][i] === val) return true;
            if (i !== row && this.grid[i][col] === val) return true;
        }

        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let r = boxRow; r < boxRow + 3; r++) {
            for (let c = boxCol; c < boxCol + 3; c++) {
                if ((r !== row || c !== col) && this.grid[r][c] === val) return true;
            }
        }

        return false;
    }

    loadUserProgress() {
        // **MONETIZATION: Load saved cosmetics and currency**
        const saved = localStorage.getItem('sudokuProgress');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.coins = data.coins || 0;
                const unlockedThemes = Array.isArray(data.unlockedThemes) ? data.unlockedThemes : ['default'];
                this.unlockedThemes = unlockedThemes.map((themeId) => (themeId === 'classic' ? 'default' : themeId));
                this.unlockedBoardColors = data.unlockedBoardColors || ['default'];
                this.currentTheme = data.currentTheme === 'classic' ? 'default' : (data.currentTheme || 'default');
                this.currentBoardColor = data.currentBoardColor || 'default';
            } catch (e) {
                console.warn('[Monetization] Failed to load progress:', e);
            }
        }
    }

    saveUserProgress() {
        // **MONETIZATION: Persist cosmetics and currency**
        try {
            const data = {
                coins: this.coins,
                unlockedThemes: this.unlockedThemes,
                unlockedBoardColors: this.unlockedBoardColors,
                currentTheme: this.currentTheme,
                currentBoardColor: this.currentBoardColor
            };
            localStorage.setItem('sudokuProgress', JSON.stringify(data));
        } catch (e) {
            console.warn('[Monetization] Failed to save progress:', e);
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            // Wait 1 second for loading screen to display
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                this.signalLoadingFinished();
                setTimeout(() => {
                    if (loadingScreen.parentNode) {
                        loadingScreen.parentNode.removeChild(loadingScreen);
                    }
                }, 500);
            }, 1000);
        }
    }

    signalLoadingFinished() {
        if (this.loadingFinishedSent) return;

        const canCall = window.__pokiReady && typeof PokiSDK !== 'undefined' && typeof PokiSDK.gameLoadingFinished === 'function';
        if (canCall) {
            try {
                PokiSDK.gameLoadingFinished();
            } catch (error) {
                console.warn('[Poki] gameLoadingFinished() error:', error);
            }
            this.loadingFinishedSent = true;
            return;
        }

        if (window.__pokiReady && typeof PokiSDK !== 'undefined') {
            this.loadingFinishedSent = true;
            return;
        }

        if (this.loadingFinishedTimer) return;
        let attempts = 0;
        this.loadingFinishedTimer = setInterval(() => {
            attempts += 1;
            const ready = window.__pokiReady && typeof PokiSDK !== 'undefined' && typeof PokiSDK.gameLoadingFinished === 'function';
            if (ready) {
                try {
                    PokiSDK.gameLoadingFinished();
                } catch (error) {
                    console.warn('[Poki] gameLoadingFinished() error:', error);
                }
                this.loadingFinishedSent = true;
            }

            if (this.loadingFinishedSent || attempts >= 20) {
                clearInterval(this.loadingFinishedTimer);
                this.loadingFinishedTimer = null;
            }
        }, 250);
    }

    updateThemeIcon() {
        const icon = document.querySelector('.theme-icon');
        if (document.body.classList.contains('dark-mode')) {
            icon.textContent = '🌙';
        } else {
            icon.textContent = '☀️';
        }
    }

    setupScreenNavigation() {
        console.log('[Setup] Starting setupScreenNavigation...');

        this.attachLanguageSelector();
        
        // **START SCREEN NAVIGATION**
        const newGameBtn = document.getElementById('newGameMenuBtn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                console.log('[Nav] New Game button clicked');
                this.showDifficultyScreen();
            });
        } else {
            console.warn('[Setup] newGameMenuBtn not found');
        }

        const savedGameBtn = document.getElementById('savedGameBtn');
        if (savedGameBtn) {
            savedGameBtn.addEventListener('click', () => this.loadSavedGame());
        }

        const dailyChallengeBtn = document.getElementById('dailyChallengeMenuBtn');
        if (dailyChallengeBtn) {
            dailyChallengeBtn.addEventListener('click', () => this.startDailyChallenge());
        }

        const customizeMenuBtn = document.getElementById('customizeMenuBtn');
        if (customizeMenuBtn) {
            customizeMenuBtn.addEventListener('click', () => this.showCustomizationScreen());
        }

        // **DIFFICULTY SELECTION - Ensure elements exist before attaching listeners**
        const diffEasyBtn = document.getElementById('diffEasyBtn');
        console.log('[Setup] diffEasyBtn found:', !!diffEasyBtn);
        if (diffEasyBtn) {
            diffEasyBtn.addEventListener('click', () => {
                console.log('[Nav] Easy difficulty button clicked');
                this.startGameWithDifficulty('easy');
            });
        } else {
            console.warn('[Setup] diffEasyBtn not found');
        }

        const diffMediumBtn = document.getElementById('diffMediumBtn');
        console.log('[Setup] diffMediumBtn found:', !!diffMediumBtn);
        if (diffMediumBtn) {
            diffMediumBtn.addEventListener('click', () => {
                console.log('[Nav] Medium difficulty button clicked');
                this.startGameWithDifficulty('medium');
            });
        } else {
            console.warn('[Setup] diffMediumBtn not found');
        }

        const diffHardBtn = document.getElementById('diffHardBtn');
        console.log('[Setup] diffHardBtn found:', !!diffHardBtn);
        if (diffHardBtn) {
            diffHardBtn.addEventListener('click', () => {
                console.log('[Nav] Hard difficulty button clicked');
                this.startGameWithDifficulty('hard');
            });
        } else {
            console.warn('[Setup] diffHardBtn not found');
        }

        // **BACK BUTTONS**
        const backDiffBtn = document.getElementById('difficultyBackBtn');
        if (backDiffBtn) {
            backDiffBtn.addEventListener('click', () => {
                console.log('[Nav] Difficulty back button clicked');
                this.showStartScreen();
            });
        }

        const backCustomizeBtn = document.getElementById('customizationBackBtn');
        if (backCustomizeBtn) {
            backCustomizeBtn.addEventListener('click', () => {
                console.log('[Nav] Customization back button clicked');
                this.showStartScreen();
            });
        }

        const backGameBtn = document.getElementById('gameBackBtn');
        if (backGameBtn) {
            backGameBtn.addEventListener('click', () => {
                console.log('[Nav] Game back button clicked');
                this.handleGameBackButton();
            });
        }

        // **THEME TOGGLES ON ALL SCREENS**
        const themeStart = document.getElementById('themeToggleStart');
        if (themeStart) {
            themeStart.addEventListener('click', () => this.toggleTheme());
        }

        const themeDifficulty = document.getElementById('themeToggleDifficulty');
        if (themeDifficulty) {
            themeDifficulty.addEventListener('click', () => this.toggleTheme());
        }

        const themeCustomization = document.getElementById('themeToggleCustomization');
        if (themeCustomization) {
            themeCustomization.addEventListener('click', () => this.toggleTheme());
        }

        const themeGame = document.getElementById('themeToggleGame');
        if (themeGame) {
            themeGame.addEventListener('click', () => this.toggleTheme());
        }

        // Show start screen initially
        console.log('[Setup] Initialization complete - showing start screen');
        this.showStartScreen();
    }

    showStartScreen() {
        console.log('[Screen] Showing start screen');
        this.stopGame();
        this.switchScreen('startScreen');
    }

    showDifficultyScreen() {
        console.log('[Screen] Showing difficulty screen');
        this.switchScreen('difficultyScreen');
    }

    showCustomizationScreen() {
        console.log('[Screen] Showing customization screen');
        this.switchScreen('customizationScreen');
        this.renderThemesList();
    }

    showGameScreen() {
        console.log('[Screen] Showing game screen');
        this.switchScreen('gameScreen');
    }

    switchScreen(screenId) {
        console.log('[Screen] Switching to screen:', screenId);
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show requested screen
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
            console.log('[Screen] Screen activated:', screenId);
            // Update all theme icons for consistency
            this.updateAllThemeIcons();
        } else {
            console.error('[Screen] Screen not found:', screenId);
        }
    }

    updateAllThemeIcons() {
        document.querySelectorAll('.theme-icon').forEach(icon => {
            if (document.body.classList.contains('dark-mode')) {
                icon.textContent = '🌙';
            } else {
                icon.textContent = '☀️';
            }
        });
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('sudokuTheme', isDarkMode ? 'dark' : 'light');
        this.updateAllThemeIcons();
    }

    startGameWithDifficulty(difficulty) {
        console.log('[Game] startGameWithDifficulty() called with:', difficulty);
        this.dailyChallengeMode = false;
        this.difficulty = difficulty;
        console.log('[Game] this.difficulty set to:', this.difficulty);
        
        this.initializeEventListeners();
        this.applyTranslations();
        this.maybeStartTutorial();
        this.startNewGame();
        
        console.log('[Game] Game started with difficulty:', this.difficulty);
        this.showGameScreen();
    }

    stopGame() {
        this.stopTimer();
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    handleGameBackButton() {
        // Check if game is running
        if (this.hasUserStarted || this.timerInterval) {
            // Show confirmation dialog
            this.showConfirmationDialog(
                'Exit Game?',
                'Do you really want to exit? Your progress will be lost.',
                () => {
                    // On confirm, go back to start screen
                    console.log('[Game] User confirmed exit');
                    this.showStartScreen();
                },
                () => {
                    // On cancel, do nothing
                    console.log('[Game] User cancelled exit');
                }
            );
        } else {
            // Game not running, just go back
            this.showStartScreen();
        }
    }

    showConfirmationDialog(title, message, onConfirm, onCancel) {
        // Create a temporary confirmation dialog
        const existingDialog = document.getElementById('confirmDialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        const isDarkMode = document.body.classList.contains('dark-mode');

        const dialog = document.createElement('div');
        dialog.id = 'confirmDialog';
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: ${isDarkMode ? '#2d2d2d' : 'white'};
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            min-width: 300px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            color: ${isDarkMode ? '#e0e0e0' : '#333'};
        `;

        const dialogTitle = document.createElement('h2');
        dialogTitle.textContent = title;
        dialogTitle.style.cssText = `margin: 0 0 15px 0; color: ${isDarkMode ? '#fff' : '#333'}; font-size: 20px;`;

        const dialogMessage = document.createElement('p');
        dialogMessage.textContent = message;
        dialogMessage.style.cssText = `margin: 0 0 25px 0; color: ${isDarkMode ? '#b0b0b0' : '#666'}; font-size: 14px;`;

        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = 'display: flex; gap: 12px; justify-content: center;';

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'YES, EXIT';
        confirmBtn.style.cssText = `
            padding: 12px 24px;
            background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
        `;
        confirmBtn.addEventListener('click', () => {
            dialog.remove();
            onConfirm();
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'CANCEL';
        cancelBtn.style.cssText = `
            padding: 12px 24px;
            background: ${isDarkMode ? '#444' : '#ddd'};
            color: ${isDarkMode ? '#e0e0e0' : '#333'};
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
        `;
        cancelBtn.addEventListener('click', () => {
            dialog.remove();
            onCancel();
        });

        buttonsContainer.appendChild(confirmBtn);
        buttonsContainer.appendChild(cancelBtn);

        content.appendChild(dialogTitle);
        content.appendChild(dialogMessage);
        content.appendChild(buttonsContainer);

        dialog.appendChild(content);
        document.body.appendChild(dialog);
    }

    loadSavedGame() {
        // TODO: Implement loading saved game from localStorage
        this.showMessage('Saved game feature coming soon!', 'info');
    }

    initializeEventListeners() {
        // Prevent duplicate event listener attachments
        if (this.eventListenersInitialized) {
            console.log('[Listeners] Already initialized, skipping duplicate attachment');
            return;
        }
        
        console.log('[Listeners] initializeEventListeners called');
        this.eventListenersInitialized = true;
        // Ensure audio context is resumed by user gesture
        const resumeAudioOnce = () => {
            this.audio.ensureContext();
            this.audio.resume();
            document.removeEventListener('pointerdown', resumeAudioOnce);
        };
        document.addEventListener('pointerdown', resumeAudioOnce, { once: true });

        // Safe helper to add listener only if element exists
        const addListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
                console.log(`[Listeners] ✓ Attached ${event} listener to:`, id);
            } else {
                console.warn(`[Listeners] ✗ Element not found: ${id}`);
            }
        };

        addListener('newGameBtn', 'click', () => this.requestStartNewGame());
        addListener('resetBtn', 'click', () => this.requestReset());
        addListener('solveBtn', 'click', () => this.solveGame());
        addListener('playAgainBtn', 'click', () => this.startNewGameWithBreak());
        
        // Pause button
        console.log('[Listeners] Attaching pause button listener...');
        addListener('pauseBtn', 'click', () => {
            console.log('[Pause] Pause button clicked');
            this.togglePause();
        });
        
        // Number pad buttons
        document.querySelectorAll('.number-btn:not(.clear-btn)').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleNumberButtonClick(e.target.dataset.number));
        });
        
        // Clear button
        addListener('clearBtn', 'click', () => this.handleNumberButtonClick(''));
        
        // Hint button
        addListener('hintBtn', 'click', () => this.requestHint());
        
        // Difficulty buttons (confirm before switching if there's progress)
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.requestChangeDifficulty(e.target.dataset.difficulty));
        });

        // **MONETIZATION: Reward buttons**
        addListener('speedBoostBtn', 'click', () => this.requestSpeedBoost());
        addListener('undoBtn', 'click', () => this.requestUndo());
        addListener('customizeBtn', 'click', () => this.showCustomizeMenu());
        addListener('dailyChallengeBtn', 'click', () => this.startDailyChallenge());

        // Engagement panels
        addListener('leaderboardBtn', 'click', () => this.togglePanel('leaderboardPanel'));
        addListener('achievementsBtn', 'click', () => this.togglePanel('achievementsPanel'));

        // Tutorial controls
        addListener('tutorialNext', 'click', () => this.advanceTutorial());
        addListener('tutorialSkip', 'click', () => this.finishTutorial());

        // Inline prompt actions
        addListener('promptConfirm', 'click', () => this.resolvePrompt(true));
        addListener('promptCancel', 'click', () => this.resolvePrompt(false));

        // Track drop-off
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.signalGameplayStop();
                this.trackEvent('session_backgrounded', { seconds: this.getSessionSeconds() });
            }
        });
        window.addEventListener('beforeunload', () => {
            this.trackEvent('session_end', { seconds: this.getSessionSeconds() });
        });

        this.updateMonetizationUI();
        this.updateEngagementUI();
    }

    attachLanguageSelector() {
        if (this.languageSelectorInitialized) {
            return;
        }
        this.languageSelectorInitialized = true;
        const langSelect = document.getElementById('languageSelect');
        if (langSelect) {
            console.log('[Setup] Language selector found, attaching event listener');
            langSelect.addEventListener('change', (e) => {
                console.log('[Language] Language changed to:', e.target.value);
                this.setLanguage(e.target.value);
            });
        } else {
            console.warn('[Setup] Language selector NOT found!');
        }
    }
    showMessage(text, tone = 'info') {
        const bar = document.getElementById('statusBar');
        if (!bar) return;
        bar.textContent = text;
        bar.classList.remove('status-info', 'status-warn', 'status-success');
        if (tone === 'warn') bar.classList.add('status-warn');
        if (tone === 'success') bar.classList.add('status-success');
    }

    showPrompt(message, onConfirm) {
        const prompt = document.getElementById('inlinePrompt');
        const text = document.getElementById('promptText');
        if (!prompt || !text) return;
        text.textContent = message;
        prompt.classList.remove('hidden');
        this.pendingAction = onConfirm;
    }

    resolvePrompt(confirmed) {
        const prompt = document.getElementById('inlinePrompt');
        if (prompt) prompt.classList.add('hidden');
        if (confirmed && typeof this.pendingAction === 'function') {
            this.pendingAction();
        }
        this.pendingAction = null;
    }

    togglePanel(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        panel.classList.toggle('hidden');
    }

    getSessionSeconds() {
        return Math.floor((Date.now() - this.sessionStart) / 1000);
    }

    trackEvent(name, data = {}) {
        // Local-only tracking for UI state and QA; no network calls.
        this.recordCheckpoint(name, data);
    }

    maybeStartTutorial() {
        const done = localStorage.getItem('sudokuTutorialDone');
        if (!done) {
            this.tutorial.active = true;
            this.tutorial.step = 0;
            this.difficulty = 'easy';
            this.updateDifficultyButtons();
            this.applyTutorialStep();
            this.trackEvent('tutorial_start');
            this.showMessage(this.t('tutorial_start'), 'info');
        }
    }

    applyTutorialStep() {
        const panel = document.getElementById('tutorialPanel');
        const stepText = document.getElementById('tutorialStepText');
        const title = document.getElementById('tutorialTitle');
        if (!panel || !stepText || !title) return;
        panel.classList.remove('hidden');

        const steps = [
            this.t('tutorial_step_1'),
            this.t('tutorial_step_2'),
            this.t('tutorial_step_3'),
            this.t('tutorial_step_4'),
            this.t('tutorial_step_5')
        ];

        stepText.textContent = steps[this.tutorial.step] || '';
        title.textContent = this.t('tutorial_title');

        this.clearHighlights();
        if (this.tutorial.step === 0) this.highlightElement('.sudoku-grid');
        if (this.tutorial.step === 1) this.highlightElement('.number-pad');
        if (this.tutorial.step === 2) this.highlightElement('#clearBtn');
        if (this.tutorial.step === 3) this.highlightElement('#hintBtn');
        if (this.tutorial.step === 4) this.highlightElement('#playAgainBtn');

        const hintBtn = document.getElementById('hintBtn');
        if (hintBtn) hintBtn.disabled = this.tutorial.step < 3;

        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) clearBtn.disabled = this.tutorial.step < 2;
    }

    highlightElement(selector) {
        const el = document.querySelector(selector);
        if (el) el.classList.add('highlight-step');
    }

    clearHighlights() {
        document.querySelectorAll('.highlight-step').forEach(el => el.classList.remove('highlight-step'));
    }

    advanceTutorial() {
        if (!this.tutorial.active) return;
        this.tutorial.step += 1;
        if (this.tutorial.step >= 5) {
            this.finishTutorial();
        } else {
            this.applyTutorialStep();
            this.trackEvent('tutorial_step', { step: this.tutorial.step });
        }
    }

    finishTutorial() {
        this.tutorial.active = false;
        const panel = document.getElementById('tutorialPanel');
        if (panel) panel.classList.add('hidden');
        this.clearHighlights();
        localStorage.setItem('sudokuTutorialDone', 'true');
        this.trackEvent('tutorial_complete');
        this.showMessage(this.t('tutorial_complete'), 'success');

        const hintBtn = document.getElementById('hintBtn');
        if (hintBtn) hintBtn.disabled = false;
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) clearBtn.disabled = false;
    }

    updateDifficultyButtons() {
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.difficulty === this.difficulty);
        });
        this.updateDifficultyText();
    }

    loadAchievements() {
        const saved = localStorage.getItem('sudokuAchievements');
        return saved ? JSON.parse(saved) : {};
    }

    saveAchievements() {
        localStorage.setItem('sudokuAchievements', JSON.stringify(this.achievements));
    }

    loadLeaderboard() {
        const saved = localStorage.getItem('sudokuLeaderboard');
        const empty = { easy: [], medium: [], hard: [], daily: [] };
        if (!saved) return empty;

        try {
            const data = JSON.parse(saved);
            if (Array.isArray(data)) {
                // Migrate legacy flat list to per-mode lists
                data.forEach((entry) => {
                    const key = entry.daily ? 'daily' : entry.difficulty;
                    if (empty[key]) {
                        empty[key].push({ time: entry.time, date: entry.date });
                    }
                });
                Object.keys(empty).forEach((key) => {
                    empty[key].sort((a, b) => a.time - b.time);
                    empty[key] = empty[key].slice(0, 10);
                });
                return empty;
            }

            const normalized = { ...empty, ...data };
            Object.keys(normalized).forEach((key) => {
                if (!Array.isArray(normalized[key])) {
                    normalized[key] = [];
                }
            });
            return normalized;
        } catch (error) {
            console.warn('[Leaderboard] Failed to load leaderboard:', error);
            return empty;
        }
    }

    saveLeaderboard() {
        localStorage.setItem('sudokuLeaderboard', JSON.stringify(this.leaderboard));
    }

    loadStreak() {
        const saved = localStorage.getItem('sudokuStreak');
        return saved ? JSON.parse(saved) : { count: 0, lastDate: null };
    }

    saveStreak() {
        localStorage.setItem('sudokuStreak', JSON.stringify(this.streakData));
    }

    updateEngagementUI() {
        const streak = document.getElementById('streakCount');
        if (streak) streak.textContent = String(this.streakData.count || 0);
        this.renderLeaderboard();
        this.renderAchievements();
    }

    updateAchievementsOnWin() {
        this.unlockAchievement('first_win');
        if (this.hintsUsed === 0) {
            this.unlockAchievement('no_hints');
        }
        if (this.timer <= 300) {
            this.unlockAchievement('under_5');
        }
        if (this.streakData.count >= 3) {
            this.unlockAchievement('daily_3');
        }

        // Cosmetic reward example
        if (this.achievements.first_win) {
            this.unlockCosmetic('theme', 'classic');
        }
    }

    updateLeaderboardOnWin() {
        const key = this.dailyChallengeMode ? 'daily' : this.difficulty;
        if (!this.leaderboard[key]) {
            this.leaderboard[key] = [];
        }

        const entry = {
            time: this.timer,
            date: new Date().toISOString()
        };

        this.leaderboard[key].push(entry);
        this.leaderboard[key].sort((a, b) => a.time - b.time);
        this.leaderboard[key] = this.leaderboard[key].slice(0, 10);
        this.saveLeaderboard();
        this.renderLeaderboard();
    }

    renderLeaderboard() {
        const list = document.getElementById('leaderboardList');
        if (!list) return;
        list.innerHTML = '';

        const categories = [
            { key: 'easy', label: this.t('difficulty_easy') },
            { key: 'medium', label: this.t('difficulty_medium') },
            { key: 'hard', label: this.t('difficulty_hard') },
            { key: 'daily', label: this.t('daily_challenge') }
        ];

        categories.forEach((category) => {
            const entries = Array.isArray(this.leaderboard[category.key]) ? this.leaderboard[category.key] : [];
            const best = entries.length ? entries[0] : null;
            const li = document.createElement('li');
            li.textContent = `${category.label}: ${best ? this.formatTime(best.time) : '--:--'}`;
            list.appendChild(li);
        });
    }

    formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    renderAchievements() {
        const list = document.getElementById('achievementsList');
        if (!list) return;
        list.innerHTML = '';
        const items = this.getAchievementDefinitions();
        items.forEach((a) => {
            const li = document.createElement('li');
            const done = this.achievements[a.id];
            li.textContent = `${done ? '✓' : '•'} ${a.title} - ${a.desc}`;
            list.appendChild(li);
        });
    }

    getAchievementDefinitions() {
        return [
            { id: 'first_win', title: this.t('ach_first_win'), desc: this.t('ach_first_win_desc') },
            { id: 'no_hints', title: this.t('ach_no_hints'), desc: this.t('ach_no_hints_desc') },
            { id: 'under_5', title: this.t('ach_under_5'), desc: this.t('ach_under_5_desc') },
            { id: 'daily_3', title: this.t('ach_daily_3'), desc: this.t('ach_daily_3_desc') }
        ];
    }

    unlockAchievement(id) {
        if (!this.achievements[id]) {
            this.achievements[id] = true;
            this.saveAchievements();
            this.renderAchievements();
            this.showMessage(this.t('achievement_unlocked'), 'success');
            this.trackEvent('achievement_unlocked', { id });
        }
    }

    updateStreakOnWin() {
            // Don't count streak if user used the solve button
            if (this.usedSolve) {
                console.log('[Engagement] Streak not counted - used solve button');
                this.usedSolve = false;
                return;
            }
            // Increase streak by 1 for every puzzle solved manually
            this.streakData.count += 1;
            console.log('[Engagement] Streak increased to:', this.streakData.count);
        this.saveStreak();
    }

    startDailyChallenge() {
        this.dailyChallengeMode = true;
        const seed = this.getDailySeed();
        this.random = this.mulberry32(seed);
        const difficulties = ['easy', 'medium', 'hard'];
        this.difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
        this.updateDifficultyButtons();
        this.trackEvent('daily_challenge_start', { seed });
        this.showMessage(this.t('daily_challenge_start'), 'info');
        this.initializeEventListeners();
        this.applyTranslations();
        this.maybeStartTutorial();
        this.startNewGame();
        this.showGameScreen();
    }

    getDailySeed() {
        const today = new Date().toISOString().slice(0, 10);
        let hash = 0;
        for (let i = 0; i < today.length; i++) {
            hash = (hash * 31 + today.charCodeAt(i)) >>> 0;
        }
        return hash;
    }

    mulberry32(seed) {
        return function () {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    setLanguage(lang) {
        console.log('[Language] Setting language to:', lang);
        this.lang = lang;
        console.log('[Language] Calling applyTranslations()...');
        this.applyTranslations();
        console.log('[Language] applyTranslations() completed');
    }

    getAvailableThemes() {
        return [
            {
                id: 'default',
                nameKey: 'theme_default_name',
                descriptionKey: 'theme_default_desc',
                cost: 0,
                preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                unlocked: true
            },
            {
                id: 'classic',
                nameKey: 'theme_classic_name',
                descriptionKey: 'theme_classic_desc',
                cost: 0,
                preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                unlocked: true
            },
            {
                id: 'ocean',
                nameKey: 'theme_ocean_name',
                descriptionKey: 'theme_ocean_desc',
                cost: 200,
                preview: 'linear-gradient(135deg, #0066cc 0%, #00aaff 100%)',
                unlocked: this.unlockedThemes.includes('ocean')
            },
            {
                id: 'forest',
                nameKey: 'theme_forest_name',
                descriptionKey: 'theme_forest_desc',
                cost: 200,
                preview: 'linear-gradient(135deg, #2d5016 0%, #548235 100%)',
                unlocked: this.unlockedThemes.includes('forest')
            },
            {
                id: 'sunset',
                nameKey: 'theme_sunset_name',
                descriptionKey: 'theme_sunset_desc',
                cost: 300,
                preview: 'linear-gradient(135deg, #ff6b4a 0%, #ffb84d 100%)',
                unlocked: this.unlockedThemes.includes('sunset')
            },
            {
                id: 'purple',
                nameKey: 'theme_purple_name',
                descriptionKey: 'theme_purple_desc',
                cost: 250,
                preview: 'linear-gradient(135deg, #9c27b0 0%, #d946ef 100%)',
                unlocked: this.unlockedThemes.includes('purple')
            },
            {
                id: 'neon',
                nameKey: 'theme_neon_name',
                descriptionKey: 'theme_neon_desc',
                cost: 300,
                preview: 'linear-gradient(135deg, #ff00ff 0%, #00ffff 100%)',
                unlocked: this.unlockedThemes.includes('neon')
            }
        ];
    }

    renderThemesList() {
        const themesList = document.getElementById('themesList');
        const coinCount = document.getElementById('customizationCoinCount');
        
        if (!themesList) return;
        
        coinCount.textContent = `💰 ${this.coins}`;
        themesList.innerHTML = '';
        
        const themes = this.getAvailableThemes();
        themes.forEach(theme => {
            const card = document.createElement('div');
            card.className = `theme-card ${theme.unlocked ? 'unlocked' : ''} ${this.currentTheme === theme.id ? 'active' : ''}`;
            
            const preview = document.createElement('div');
            preview.className = 'theme-preview';
            preview.style.background = theme.preview;
            preview.textContent = this.t(theme.nameKey);
            
            const name = document.createElement('div');
            name.className = 'theme-name';
            name.textContent = this.t(theme.nameKey);
            
            const status = document.createElement('div');
            status.className = 'theme-status';
            if (this.currentTheme === theme.id) {
                status.className += ' active';
                status.textContent = this.t('theme_status_active');
            } else if (theme.unlocked) {
                status.className += ' unlocked';
                status.textContent = this.t('theme_status_unlocked');
            } else {
                status.className += ' locked';
                status.textContent = this.t('theme_status_locked');
            }
            
            const actions = document.createElement('div');
            actions.className = 'theme-actions';
            
            if (this.currentTheme === theme.id) {
                // Active theme - just show a button to close
                const selectBtn = document.createElement('button');
                selectBtn.className = 'theme-btn select-btn';
                selectBtn.textContent = this.t('theme_btn_current');
                selectBtn.disabled = true;
                actions.appendChild(selectBtn);
            } else if (theme.unlocked) {
                // Unlocked theme - show select button
                const selectBtn = document.createElement('button');
                selectBtn.className = 'theme-btn select-btn';
                selectBtn.textContent = this.t('theme_btn_select');
                selectBtn.addEventListener('click', () => this.setCurrentTheme(theme.id));
                actions.appendChild(selectBtn);
            } else {
                // Locked theme - show coins and ad options
                const priceDiv = document.createElement('div');
                priceDiv.className = 'theme-price';
                priceDiv.innerHTML = `<span class="theme-price-amount">${theme.cost}</span> <span>${this.t('theme_price_coins')}</span>`;
                actions.appendChild(priceDiv);
                
                const coinsBtn = document.createElement('button');
                coinsBtn.className = 'theme-btn theme-btn-coins';
                coinsBtn.textContent = this.t('theme_btn_unlock_coins', { cost: theme.cost });
                coinsBtn.disabled = this.coins < theme.cost;
                coinsBtn.addEventListener('click', () => this.unlockThemeWithCoins(theme.id, theme.cost, theme.nameKey));
                actions.appendChild(coinsBtn);
                
                const adBtn = document.createElement('button');
                adBtn.className = 'theme-btn theme-btn-ad';
                adBtn.textContent = this.t('theme_btn_unlock_ad');
                adBtn.addEventListener('click', () => this.unlockThemeWithAd(theme.id, theme.nameKey));
                actions.appendChild(adBtn);
            }
            
            card.appendChild(preview);
            card.appendChild(name);
            card.appendChild(status);
            card.appendChild(actions);
            themesList.appendChild(card);
        });
    }

    unlockThemeWithCoins(themeId, cost, themeNameKey) {
        if (this.coins < cost) {
            this.showMessage(this.t('theme_need_more_coins', { remaining: cost - this.coins }), 'warn');
            return;
        }
        
        if (confirm(this.t('theme_confirm_unlock', { theme: this.t(themeNameKey), cost }))) {
            this.coins -= cost;
            this.unlockedThemes.push(themeId);
            this.saveUserProgress();
            this.setCurrentTheme(themeId);
            this.renderThemesList();
            this.showMessage(this.t('theme_unlocked_message', { theme: this.t(themeNameKey) }), 'success');
        }
    }

    unlockThemeWithAd(themeId, themeNameKey) {
        // Simulate watching an ad to unlock
        this.showMessage(this.t('ad_playing_message'), 'info');
        
        setTimeout(() => {
            if (!this.unlockedThemes.includes(themeId)) {
                this.unlockedThemes.push(themeId);
                this.saveUserProgress();
                this.setCurrentTheme(themeId);
                this.renderThemesList();
                this.showMessage(this.t('theme_unlocked_ad_message', { theme: this.t(themeNameKey) }), 'success');
            }
        }, 2000);
    }

    setCurrentTheme(themeName) {
        const normalizedTheme = themeName === 'classic' ? 'default' : themeName;
        this.currentTheme = normalizedTheme;
        this.saveUserProgress();
        this.renderThemesList();
        const theme = this.getAvailableThemes().find(item => item.id === this.currentTheme);
        const themeLabel = theme ? this.t(theme.nameKey) : themeName;
        this.showMessage(this.t('theme_changed_message', { theme: themeLabel }), 'success');
        this.applyThemeStyling();
    }

    hasUserProgress() {
        // Returns true if the player has entered any numbers different from the original puzzle
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const orig = this.originalGrid[row] ? this.originalGrid[row][col] : 0;
                const cur = this.grid[row] ? this.grid[row][col] : 0;
                if (orig !== cur && cur !== 0) return true;
            }
        }
        return false;
    }

    requestStartNewGame() {
        if (this.hasUserProgress()) {
            this.showPrompt(this.t('confirm_new_game'), () => this.startNewGameWithBreak());
            return;
        }
        this.dailyChallengeMode = false;
        this.startNewGameWithBreak();
    }

    requestChangeDifficulty(newDifficulty) {
        if (newDifficulty === this.difficulty) return;
        const message = this.hasUserProgress()
            ? this.t('confirm_change_difficulty')
            : this.t('confirm_change_difficulty_plain');

        this.showPrompt(message, () => {
            this.dailyChallengeMode = false;
            this.changeDifficulty(newDifficulty, true);
        });
    }

    requestReset() {
        const message = this.hasUserProgress()
            ? this.t('confirm_reset')
            : this.t('confirm_reset_plain');

        this.showPrompt(message, () => this.resetGame());
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('sudokuTheme', isDarkMode ? 'dark' : 'light');
        this.updateThemeIcon();
    }

    togglePause() {
        console.log('[Pause] togglePause called, current isPaused:', this.isPaused);
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');
        console.log('[Pause] pauseBtn element found:', !!pauseBtn);
        
        if (this.isPaused) {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            this.signalGameplayStop();
            pauseBtn.textContent = '▶️';
            pauseBtn.classList.add('paused');
            pauseBtn.title = this.t('resume_title');
            this.applyPausedState();
            this.trackEvent('game_pause', { paused: true });
            this.showMessage(this.t('game_paused'), 'warn');
        } else {
            if (this.hasUserStarted) {
                this.signalGameplayStart();
            }
            pauseBtn.textContent = '⏸️';
            pauseBtn.classList.remove('paused');
            pauseBtn.title = this.t('pause_title');
            this.removePausedState();
            this.startTimer();
            this.trackEvent('game_pause', { paused: false });
            this.showMessage(this.t('msg_resume'), 'info');
        }
    }

    setControlsLocked(locked) {
        const elements = document.querySelectorAll('button, select, input');
        elements.forEach((el) => {
            if (locked) {
                if (!el.hasAttribute('data-prev-disabled')) {
                    el.setAttribute('data-prev-disabled', el.disabled ? '1' : '0');
                }
                el.disabled = true;
            } else {
                const prev = el.getAttribute('data-prev-disabled');
                if (prev !== null) {
                    el.disabled = prev === '1';
                    el.removeAttribute('data-prev-disabled');
                }
            }
        });
    }

    setAdOverlayVisible(visible) {
        const overlay = document.getElementById('adOverlay');
        if (!overlay) return;
        overlay.classList.toggle('hidden', !visible);
    }

    beginAdBreak() {
        if (this.isAdActive) return { wasActive: false, wasTimerRunning: false };
        this.isAdActive = true;
        this.audioEnabledBeforeAd = this.audio.enabled;
        this.audio.enabled = false;
        this.setControlsLocked(true);
        this.setAdOverlayVisible(true);

        const wasTimerRunning = !!this.timerInterval;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        const wasActive = window.__pokiGameplayActive === true;
        if (wasActive) {
            this.signalGameplayStop();
        }

        return { wasActive, wasTimerRunning };
    }

    endAdBreak(state, resumeGameplay) {
        this.isAdActive = false;
        if (typeof this.audioEnabledBeforeAd === 'boolean') {
            this.audio.enabled = this.audioEnabledBeforeAd;
            this.audioEnabledBeforeAd = null;
        }
        this.setControlsLocked(false);
        this.setAdOverlayVisible(false);

        if (state.wasTimerRunning) {
            this.startTimer();
        }

        if (resumeGameplay && state.wasActive) {
            this.signalGameplayStart();
        }
    }

    runCommercialBreak() {
        if (window.__pokiReady && typeof PokiSDK !== 'undefined' && typeof PokiSDK.commercialBreak === 'function') {
            const state = this.beginAdBreak();
            return PokiSDK.commercialBreak()
                .catch((error) => {
                    console.warn('[Poki] commercialBreak() error:', error);
                })
                .finally(() => {
                    this.endAdBreak(state, false);
                });
        }
        return Promise.resolve();
    }

    startNewGameWithBreak() {
        this.runCommercialBreak().finally(() => {
            this.startNewGame();
        });
    }

    applyPausedState() {
        const grid = document.getElementById('sudoku-grid');
        if (grid) {
            grid.classList.add('paused');
        }
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.add('paused');
        });
        
        // Create or show pause overlay
        let pauseOverlay = document.getElementById('pauseOverlay');
        if (!pauseOverlay) {
            pauseOverlay = document.createElement('div');
            pauseOverlay.id = 'pauseOverlay';
            pauseOverlay.className = 'pause-overlay';
            pauseOverlay.textContent = '⏸️';
            document.getElementById('sudoku-grid').appendChild(pauseOverlay);
        }
        pauseOverlay.classList.add('show');
    }

    removePausedState() {
        const grid = document.getElementById('sudoku-grid');
        if (grid) {
            grid.classList.remove('paused');
        }
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('paused');
        });
        
        // Hide pause overlay (if present)
        const pauseOverlay = document.getElementById('pauseOverlay');
        if (pauseOverlay) {
            pauseOverlay.classList.remove('show');
        }
    }

    startNewGame() {
        this.stopTimer();
        this.timer = 0;
        this.isGameComplete = false;
        this.isPaused = false;
        this.hasUserStarted = false;
        this.hintsUsed = 0;
        this.usedSolve = false;
        document.getElementById('modal').classList.remove('show');
            this.undoCount = 3; // Reset free undos per game

        if (!this.dailyChallengeMode) {
            this.random = Math.random;
        }
        
        // Reset pause button
        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.textContent = '⏸️';
        pauseBtn.classList.remove('paused');
        pauseBtn.title = this.t('pause_title');
        
        // Reset hint counter
        this.updateHintCounter();
        
        // Update difficulty display
        this.updateDifficultyText();
        
        this.generatePuzzle();
        this.renderGrid();

        this.trackEvent('game_start', {
            difficulty: this.difficulty,
            daily: this.dailyChallengeMode
        });

        this.showMessage(this.t('msg_new_game'), 'info');
        
        // **MONETIZATION: Update UI with current stats**
        this.updateMonetizationUI();
        this.updateEngagementUI();
        this.saveUserProgress();
    }

    resetGame() {
        this.grid = JSON.parse(JSON.stringify(this.originalGrid));
        this.renderGrid();
        this.showMessage(this.t('msg_reset'), 'info');
    }

    generatePuzzle() {
        // Generate a valid solved sudoku
        this.solution = Array(9).fill(null).map(() => Array(9).fill(0));
        this.generateSolution(this.solution);
        
        // Copy solution for reference
        const fullGrid = JSON.parse(JSON.stringify(this.solution));
        
        // Remove numbers based on difficulty
        const cellsToRemove = this.difficulty === 'easy' ? 40 : this.difficulty === 'medium' ? 50 : 60;
        console.log('[Puzzle] Difficulty:', this.difficulty, '| Cells to remove:', cellsToRemove);
        
        let removed = 0;
        const cellsRemoved = [];
        
        while (removed < cellsToRemove) {
            const row = Math.floor(this.random() * 9);
            const col = Math.floor(this.random() * 9);
            const key = `${row}-${col}`;
            
            if (fullGrid[row][col] !== 0 && !cellsRemoved.includes(key)) {
                fullGrid[row][col] = 0;
                cellsRemoved.push(key);
                removed++;
            }
        }
        
        this.grid = JSON.parse(JSON.stringify(fullGrid));
        this.originalGrid = JSON.parse(JSON.stringify(fullGrid));
        console.log('[Puzzle] Puzzle generated with', removed, 'cells removed');
    }

    generateSolution(grid) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => this.random() - 0.5);
                    
                    for (let num of numbers) {
                        if (this.isValid(grid, row, col, num)) {
                            grid[row][col] = num;
                            
                            if (this.generateSolution(grid)) {
                                return true;
                            }
                            
                            grid[row][col] = 0;
                        }
                    }
                    
                    return false;
                }
            }
        }
        return true;
    }

    isValid(grid, row, col, num) {
        // Check row
        for (let i = 0; i < 9; i++) {
            if (grid[row][i] === num) return false;
        }
        
        // Check column
        for (let i = 0; i < 9; i++) {
            if (grid[i][col] === num) return false;
        }
        
        // Check 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                if (grid[i][j] === num) return false;
            }
        }
        
        return true;
    }

    renderGrid() {
        const gridContainer = document.getElementById('sudoku-grid');
        console.log('[Grid] Rendering grid for device type - Touch:', this.isTouchDevice);
        
        // Preserve pause overlay (if present) when re-rendering the grid
        const pauseOverlay = document.getElementById('pauseOverlay');
        if (pauseOverlay && pauseOverlay.parentElement === gridContainer) {
            pauseOverlay.remove();
        }
        gridContainer.innerHTML = '';
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                if (this.originalGrid[row][col] !== 0) {
                    cell.className += ' initial';
                    cell.textContent = this.grid[row][col];
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.inputMode = this.isTouchDevice ? 'none' : 'numeric';
                    input.maxLength = '1';
                    input.placeholder = '';

                    if (this.isTouchDevice) {
                        // Only on touch devices: make readonly and blur on focus
                        input.setAttribute('readonly', 'readonly');
                        input.addEventListener('focus', (e) => e.target.blur());
                    }
                    
                    if (this.grid[row][col] !== 0) {
                        input.value = this.grid[row][col];
                    }
                    
                    input.addEventListener('input', (e) => this.handleCellInput(e, row, col));
                    input.addEventListener('focus', () => this.selectCell(row, col));
                    input.addEventListener('keydown', (e) => this.handleKeyDown(e, row, col));
                    
                    cell.appendChild(input);
                    
                    // On click, focus the input for desktop/laptop users
                    cell.addEventListener('click', (e) => {
                        if (!this.isTouchDevice) {
                            input.focus();
                        } else {
                            this.selectCell(row, col);
                        }
                    });
                }
                
                gridContainer.appendChild(cell);
            }
        }
        // Re-attach pause overlay if it existed
        if (pauseOverlay) {
            gridContainer.appendChild(pauseOverlay);
        }

        this.updateCellStyles();
    }

    handleCellInput(e, row, col) {
        if (this.isAdActive) return;
        let value = e.target.value;
        console.log('[Input] Cell input detected:', row, col, 'value:', value);
        
        if (value === '') {
            this.grid[row][col] = 0;
        } else if (/^[1-9]$/.test(value)) {
            this.grid[row][col] = parseInt(value);
        } else {
            e.target.value = '';
            return;
        }
        
        this.updateCellStyles();
        this.checkGameCompletion();

        if (!this.hasUserStarted && this.grid[row][col] !== 0) {
            this.hasUserStarted = true;
            console.log('[Timer] Starting timer on first user interaction via cell input');
            this.startTimer();
            this.signalGameplayStart();
        }

            if (!this.firstMoveTracked && this.grid[row][col] !== 0) {
                this.firstMoveTracked = true;
                this.trackEvent('first_move');
            }

            if (this.tutorial.active && this.tutorial.step === 1 && this.grid[row][col] !== 0) {
                this.advanceTutorial();
            }

        if (!this.firstMoveTracked && this.grid[row][col] !== 0) {
            this.firstMoveTracked = true;
            this.trackEvent('first_move');
        }

        if (this.tutorial.active && this.tutorial.step === 1 && this.grid[row][col] !== 0) {
            this.advanceTutorial();
        }

        if (this.grid[row][col] !== 0) {
            this.audio.playPlace();
            this.triggerHaptic([10, 20, 10]);

            if (this.isCellConflicting(row, col)) {
                const now = Date.now();
                if (now - this.lastConflictAt > 300) {
                    this.lastConflictAt = now;
                    this.audio.playConflict();
                    this.triggerHaptic([30, 30, 30]);
                }
            }
        }
    }

    handleKeyDown(e, row, col) {
        if (this.isAdActive) return;
        const rowNum = parseInt(row);
        const colNum = parseInt(col);
        console.log('[KeyDown] Key pressed:', e.key, 'at cell:', rowNum, colNum);
        
        if (e.key === 'ArrowUp' && rowNum > 0) {
            e.preventDefault();
            this.focusCell(rowNum - 1, colNum);
        } else if (e.key === 'ArrowDown' && rowNum < 8) {
            e.preventDefault();
            this.focusCell(rowNum + 1, colNum);
        } else if (e.key === 'ArrowLeft' && colNum > 0) {
            e.preventDefault();
            this.focusCell(rowNum, colNum - 1);
        } else if (e.key === 'ArrowRight' && colNum < 8) {
            e.preventDefault();
            this.focusCell(rowNum, colNum + 1);
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            this.grid[rowNum][colNum] = 0;
            e.target.value = '';
            this.updateCellStyles();
        }
    }

    selectCell(row, col) {
        if (this.isAdActive) return;
        this.selectedCell = { row, col };
        this.updateCellStyles();
        this.audio.playClick();
        this.triggerHaptic(10);
        console.log('[Game] Cell selected:', row, col);

        if (this.tutorial.active && this.tutorial.step === 0) {
            this.advanceTutorial();
        }
    }

    focusCell(row, col) {
        if (this.originalGrid[row][col] === 0) {
            const cells = document.querySelectorAll('.cell');
            const cellIndex = row * 9 + col;
            const input = cells[cellIndex].querySelector('input');
            if (input) input.focus();
        }
    }

    handleNumberButtonClick(number) {
        if (this.isAdActive) return;
        if (!this.selectedCell) {
            this.showMessage(this.t('select_cell_first'), 'warn');
            console.log('[Game] No cell selected');
            return;
        }

        if (this.isPaused) {
            this.showMessage(this.t('game_paused'), 'warn');
            return;
        }

        const { row, col } = this.selectedCell;

        // Don't allow editing initial cells
        if (this.originalGrid[row][col] !== 0) {
            return;
        }

        const cells = document.querySelectorAll('.cell');
        const cellIndex = row * 9 + col;
        const input = cells[cellIndex].querySelector('input');

        if (input) {
            if (number === '') {
                input.value = '';
                this.grid[row][col] = 0;
                if (this.tutorial.active && this.tutorial.step === 2) {
                    this.advanceTutorial();
                }
            } else {
                input.value = number;
                this.grid[row][col] = parseInt(number);
            }

            this.updateCellStyles();
            this.checkGameCompletion();

            if (!this.hasUserStarted && this.grid[row][col] !== 0) {
                this.hasUserStarted = true;
                console.log('[Timer] Starting timer on first user interaction via number pad');
                this.startTimer();
                this.signalGameplayStart();
            }

            if (this.grid[row][col] !== 0) {
                this.audio.playPlace();
                this.triggerHaptic([10, 20, 10]);

                if (this.isCellConflicting(row, col)) {
                    const now = Date.now();
                    if (now - this.lastConflictAt > 300) {
                        this.lastConflictAt = now;
                        this.audio.playConflict();
                        this.triggerHaptic([30, 30, 30]);
                    }
                }
            }
        }
    }

    updateCellStyles() {
        const cells = document.querySelectorAll('.cell');
        
        cells.forEach((cell) => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            cell.classList.remove('selected', 'related', 'conflict');
            
            if (this.selectedCell && row === this.selectedCell.row && col === this.selectedCell.col) {
                cell.classList.add('selected');
            } else if (this.selectedCell) {
                // Highlight related cells
                if (row === this.selectedCell.row || col === this.selectedCell.col) {
                    cell.classList.add('related');
                }
                
                const boxRow = Math.floor(row / 3);
                const boxCol = Math.floor(col / 3);
                const selectedBoxRow = Math.floor(this.selectedCell.row / 3);
                const selectedBoxCol = Math.floor(this.selectedCell.col / 3);
                
                if (boxRow === selectedBoxRow && boxCol === selectedBoxCol) {
                    cell.classList.add('related');
                }
            }
            
            // Check for conflicts
            const cellValue = this.grid[row][col];
            if (cellValue !== 0) {
                // Check row conflict
                for (let i = 0; i < 9; i++) {
                    if (i !== col && this.grid[row][i] === cellValue) {
                        cell.classList.add('conflict');
                        break;
                    }
                }
                
                // Check column conflict
                for (let i = 0; i < 9; i++) {
                    if (i !== row && this.grid[i][col] === cellValue) {
                        cell.classList.add('conflict');
                        break;
                    }
                }
                
                // Check box conflict
                const boxRow = Math.floor(row / 3) * 3;
                const boxCol = Math.floor(col / 3) * 3;
                for (let i = boxRow; i < boxRow + 3; i++) {
                    for (let j = boxCol; j < boxCol + 3; j++) {
                        if ((i !== row || j !== col) && this.grid[i][j] === cellValue) {
                            cell.classList.add('conflict');
                            break;
                        }
                    }
                }
            }
        });
        
        this.updateNumberButtonStates();
    }

    updateNumberButtonStates() {
        for (let num = 1; num <= 9; num++) {
            const isComplete = this.isNumberComplete(num);
            const btn = document.querySelector(`.number-btn[data-number="${num}"]`);
            
            if (btn) {
                if (isComplete) {
                    btn.disabled = true;
                    btn.classList.add('completed');
                } else {
                    btn.disabled = false;
                    btn.classList.remove('completed');
                }
            }
        }
    }

    isNumberComplete(num) {
        let count = 0;
        
        // Count how many times this number appears in the grid
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === num) {
                    count++;
                }
            }
        }
        
        // If all 9 instances are placed, check if they're all valid
        if (count === 9) {
            // Check if any cell with this number has a conflict
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (this.grid[row][col] === num) {
                        // Check row
                        for (let i = 0; i < 9; i++) {
                            if (i !== col && this.grid[row][i] === num) {
                                return false;
                            }
                        }
                        
                        // Check column
                        for (let i = 0; i < 9; i++) {
                            if (i !== row && this.grid[i][col] === num) {
                                return false;
                            }
                        }
                        
                        // Check 3x3 box
                        const boxRow = Math.floor(row / 3) * 3;
                        const boxCol = Math.floor(col / 3) * 3;
                        for (let i = boxRow; i < boxRow + 3; i++) {
                            for (let j = boxCol; j < boxCol + 3; j++) {
                                if ((i !== row || j !== col) && this.grid[i][j] === num) {
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
            
            return true;
        }
        
        return false;
    }

    checkGameCompletion() {
        if (this.isGameComplete) return;
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === 0) return;
            }
        }
        
        // All cells filled, check if valid
        if (this.isSolutionValid()) {
            this.isGameComplete = true;
            this.stopTimer();
            this.showCompletionModal();
        }
    }

    isSolutionValid() {
        // Check rows
        for (let row = 0; row < 9; row++) {
            const seen = new Set();
            for (let col = 0; col < 9; col++) {
                const num = this.grid[row][col];
                if (seen.has(num)) return false;
                seen.add(num);
            }
        }
        
        // Check columns
        for (let col = 0; col < 9; col++) {
            const seen = new Set();
            for (let row = 0; row < 9; row++) {
                const num = this.grid[row][col];
                if (seen.has(num)) return false;
                seen.add(num);
            }
        }
        
        // Check 3x3 boxes
        for (let boxRow = 0; boxRow < 9; boxRow += 3) {
            for (let boxCol = 0; boxCol < 9; boxCol += 3) {
                const seen = new Set();
                for (let i = boxRow; i < boxRow + 3; i++) {
                    for (let j = boxCol; j < boxCol + 3; j++) {
                        const num = this.grid[i][j];
                        if (seen.has(num)) return false;
                        seen.add(num);
                    }
                }
            }
        }
        
        return true;
    }

    solveGame() {
        this.usedSolve = true;
        this.grid = JSON.parse(JSON.stringify(this.solution));
        this.renderGrid();
        this.isGameComplete = true;
        this.stopTimer();
        this.showCompletionModal();
    }

    showCompletionModal() {
        this.signalGameplayStop();
        const modal = document.getElementById('modal');
        const minutes = Math.floor(this.timer / 60);
        const seconds = this.timer % 60;
        
        // **MONETIZATION: Award coins based on difficulty and time**
        const baseCoins = this.difficulty === 'easy' ? 10 : this.difficulty === 'medium' ? 25 : 50;
        const timeBonus = Math.max(0, 60 - this.timer); // Bonus for speed
        const earnedCoins = this.usedSolve ? 0 : Math.floor((baseCoins + timeBonus) * this.speedMultiplier);
        if (!this.usedSolve) {
            this.coins += earnedCoins;
        }
        this.speedMultiplier = 1.0; // Reset multiplier after use
        
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('modalMessage').innerHTML =
            this.t('coins_earned_html', { time: timeStr, coins: earnedCoins });
        
        modal.classList.add('show');

        this.audio.playWin();
        this.audio.playVictory();
        this.triggerHaptic([20, 40, 20, 60]);

        if (this.tutorial.active && this.tutorial.step === 4) {
            this.finishTutorial();
        }
        
            // **MONETIZATION: Update UI and save progress**
            this.updateMonetizationUI();
            this.saveUserProgress();

            // Engagement: achievements, streaks, leaderboard
            this.updateStreakOnWin();
            this.updateEngagementUI();
            this.updateAchievementsOnWin();
            this.updateLeaderboardOnWin();
        
        // **POKI SDK: Checkpoint - game completed milestone**
        this.recordCheckpoint('level_complete', {
            difficulty: this.difficulty,
            time_seconds: this.timer,
            hints_used: this.hintsUsed
        });

        this.trackEvent('game_complete', {
            difficulty: this.difficulty,
            time_seconds: this.timer,
            hints_used: this.hintsUsed,
            daily: this.dailyChallengeMode
        });
    }

    changeDifficulty(newDifficulty, useCommercialBreak = false) {
        this.difficulty = newDifficulty;
        this.updateDifficultyButtons();

        if (useCommercialBreak) {
            this.startNewGameWithBreak();
            return;
        }

        // Start new game with new difficulty
        this.startNewGame();
    }

    signalGameplayStart() {
        if (window.__pokiReady && typeof PokiSDK !== 'undefined' && !window.__pokiGameplayActive) {
            try {
                PokiSDK.gameplayStart();
                window.__pokiGameplayActive = true;
                console.log('[Poki] gameplayStart() called');
            } catch (error) {
                console.warn('[Poki] gameplayStart() error:', error);
            }
        }
    }

    signalGameplayStop() {
        if (window.__pokiReady && typeof PokiSDK !== 'undefined' && window.__pokiGameplayActive) {
            try {
                PokiSDK.gameplayStop();
                window.__pokiGameplayActive = false;
                console.log('[Poki] gameplayStop() called');
            } catch (error) {
                console.warn('[Poki] gameplayStop() error:', error);
            }
        }
    }

    startTimer() {
        console.log('[Timer] Timer is starting now!');
        this.timerInterval = setInterval(() => {
            this.timer++;
            const minutes = Math.floor(this.timer / 60);
            const seconds = this.timer % 60;
            document.getElementById('timer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        // **POKI SDK: Signal gameplay stop when timer stops (pause/end)**
        this.signalGameplayStop();
    }

    requestHint() {
        if (this.isAdActive) return;
        if (this.isPaused) {
            this.showMessage(this.t('resume_to_use_hints'), 'warn');
            return;
        }

        // Check if game is complete
        if (this.isGameComplete) {
            this.showMessage(this.t('game_already_complete'), 'warn');
            return;
        }

        this.showRewardedAd('hint');
    }

    requestUndo() {
        if (this.isAdActive) return;
        // **MONETIZATION: Free or rewarded undo**
        if (this.undoCount > 0) {
            this.undoCount--;
            this.showMessage(this.t('undo_used', { remaining: this.undoCount }), 'info');
            // TODO: Implement undo logic (restore previous board state)
            return;
        }
        
        // Show rewarded ad for additional undo
        this.showRewardedAd('undo');
    }

    showRewardedAd(rewardType) {
        // **POKI SDK: Trigger rewarded video - break-based API**
        let state = null;
        if (window.__pokiReady && typeof PokiSDK !== 'undefined') {
            try {
                console.log(`[Poki] Showing rewarded video for: ${rewardType}`);
                this.trackEvent('ad_started', { reward: rewardType });
                state = this.beginAdBreak();

                if (typeof PokiSDK.rewardedBreak === 'function') {
                    PokiSDK.rewardedBreak({ size: 'small' }).then((success) => {
                        if (success) {
                            console.log(`[Poki] Rewarded break finished - granting ${rewardType}`);
                            this.trackEvent('ad_finished', { reward: rewardType, result: 'finished' });
                            this.trackEvent('rewarded_ad_complete', { reward: rewardType });
                            this.grantReward(rewardType);
                        } else {
                            console.log(`[Poki] Rewarded break skipped for ${rewardType}`);
                            this.trackEvent('ad_finished', { reward: rewardType, result: 'skipped' });
                            this.trackEvent('rewarded_ad_skipped', { reward: rewardType });
                            this.showMessage(this.t('ad_skipped', { reward: this.getRewardDescription(rewardType) }), 'warn');
                        }
                    }).catch((error) => {
                        console.error('[Poki] rewardedBreak() error:', error);
                        this.trackEvent('ad_finished', { reward: rewardType, result: 'error' });
                        this.showMessage(this.t('ad_error'), 'warn');
                    }).finally(() => {
                        this.endAdBreak(state, true);
                    });
                } else if (typeof PokiSDK.showRewardedVideo === 'function') {
                    PokiSDK.showRewardedVideo({
                        onFinished: () => {
                            console.log(`[Poki] Rewarded video finished - granting ${rewardType}`);
                            this.trackEvent('ad_finished', { reward: rewardType, result: 'finished' });
                            this.trackEvent('rewarded_ad_complete', { reward: rewardType });
                            this.grantReward(rewardType);
                            this.endAdBreak(state, true);
                        },
                        onSkipped: () => {
                            console.log(`[Poki] Rewarded video skipped for ${rewardType}`);
                            this.trackEvent('ad_finished', { reward: rewardType, result: 'skipped' });
                            this.trackEvent('rewarded_ad_skipped', { reward: rewardType });
                            this.showMessage(this.t('ad_skipped', { reward: this.getRewardDescription(rewardType) }), 'warn');
                            this.endAdBreak(state, true);
                        }
                    });
                } else {
                    this.endAdBreak(state, true);
                    this.trackEvent('ad_finished', { reward: rewardType, result: 'unsupported' });
                    this.showMessage(this.t('ad_error'), 'warn');
                }
            } catch (error) {
                console.error('[Poki] Error calling showRewardedVideo():', error);
                if (state) {
                    this.endAdBreak(state, true);
                }
                this.trackEvent('ad_finished', { reward: rewardType, result: 'error' });
                this.showMessage(this.t('ad_error'), 'warn');
            }
        } else {
            // **No Poki SDK - grant reward immediately (testing/standalone)**
            console.log(`[Monetization] SDK unavailable - granting ${rewardType} immediately`);
            this.trackEvent('ad_finished', { reward: rewardType, result: 'offline' });
            this.trackEvent('rewarded_ad_offline', { reward: rewardType });
            this.grantReward(rewardType);
        }
    }

    grantReward(rewardType) {
        // **MONETIZATION: Grant requested reward**
        switch (rewardType) {
            case 'hint':
                this.grantHint();
                break;
            case 'undo':
                this.grantUndo();
                break;
            case 'speed_boost':
                this.grantSpeedBoost();
                break;
            case 'cosmetic_theme':
                console.log('[Monetization] Cosmetic unlock not yet claimed');
                break;
            default:
                console.warn(`[Monetization] Unknown reward type: ${rewardType}`);
        }
    }

    getRewardDescription(rewardType) {
        const descriptions = {
            'hint': this.t('reward_hint'),
            'undo': this.t('reward_undo'),
            'speed_boost': this.t('reward_speed_boost'),
            'cosmetic_theme': this.t('reward_cosmetic')
        };
        return descriptions[rewardType] || this.t('reward_generic');
    }

    grantUndo() {
        // **MONETIZATION: Grant undo via rewarded video**
        this.undoCount++;
        console.log(`[Monetization] Undo granted via ad. Total undos: ${this.undoCount}`);
        this.showMessage(this.t('undo_granted', { count: this.undoCount }), 'success');
    }

    grantSpeedBoost() {
        // **MONETIZATION: Activate 2x coin multiplier for next game**
        this.speedMultiplier = 2.0;
        console.log('[Monetization] Speed boost granted - 2x coins enabled for next game');
        this.showMessage(this.t('speed_boost_granted'), 'success');
    }

    grantHint() {
        // Find all empty cells (value 0)
        const emptyCells = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }

        if (emptyCells.length === 0) {
            this.showMessage(this.t('no_empty_cells'), 'warn');
            return;
        }

        // Pick a random empty cell
        const randomCell = emptyCells[Math.floor(this.random() * emptyCells.length)];
        const { row, col } = randomCell;

        // Fill it with the correct answer from solution
        this.grid[row][col] = this.solution[row][col];

        // Update hint counter
        this.hintsUsed++;
        this.updateHintCounter();

        this.trackEvent('hint_used', { total: this.hintsUsed });

        // Re-render grid
        this.renderGrid();

        // Check for game completion
        this.checkGameCompletion();

        if (this.tutorial.active && this.tutorial.step === 3) {
            this.advanceTutorial();
        }

        this.audio.playHint();
        this.triggerHaptic([20, 30, 20]);

        // **MONETIZATION: Save progress**
        this.saveUserProgress();
    }

    updateHintCounter() {
        const counterEl = document.getElementById('hintCounter');
        counterEl.textContent = `${this.hintsUsed}`;
        
        // **POKI SDK: Checkpoint - hint used milestone**
        this.recordCheckpoint('hint_used', {
            total_hints: this.hintsUsed,
            current_time: this.timer
        });
    }

    recordCheckpoint(checkpointType, data = {}) {
        if (window.__pokiReady && typeof PokiSDK !== 'undefined') {
            try {
                // Note: PokiSDK v2 may not have built-in checkpoint API
                // This can be used for custom analytics if available
                console.log(`[Poki] Checkpoint recorded: ${checkpointType}`, data);
                
                // If using custom analytics via Poki
                if (typeof PokiSDK.customEvent !== 'undefined') {
                    PokiSDK.customEvent(checkpointType, data);
                }
            } catch (error) {
                console.warn('[Poki] Checkpoint recording error:', error);
            }
        }
    }

    updateMonetizationUI() {
        // **MONETIZATION: Update coin display**
        const coinCount = document.getElementById('coinCount');
        if (coinCount) {
            coinCount.textContent = this.coins;
        }
        
        // **MONETIZATION: Show/hide speed boost indicator**
        const boostIndicator = document.getElementById('speedBoostIndicator');
        if (boostIndicator) {
            boostIndicator.style.display = this.speedMultiplier > 1 ? 'flex' : 'none';
        }
    }

    requestSpeedBoost() {
        // **MONETIZATION: Speed boost with rewarded video**
        if (this.speedMultiplier > 1) {
            this.showMessage(this.t('speed_boost_active'), 'warn');
            return;
        }
        this.showRewardedAd('speed_boost');
    }

    showCustomizeMenu() {
        // **MONETIZATION: Show cosmetics menu**
        const themes = this.unlockedThemes.join(', ');
        const colors = this.unlockedBoardColors.join(', ');
        this.showMessage(this.t('customize_menu', { themes, colors }), 'info');
        // TODO: Implement visual customization menu/modal
    }

    unlockCosmetic(cosmeticType, cosmeticName) {
        // **MONETIZATION: Unlock cosmetic items via rewards or coins**
        if (cosmeticType === 'theme') {
            if (!this.unlockedThemes.includes(cosmeticName)) {
                this.unlockedThemes.push(cosmeticName);
                console.log(`[Monetization] Theme unlocked: ${cosmeticName}`);
                this.showMessage(this.t('theme_unlocked', { theme: cosmeticName }), 'success');
                this.saveUserProgress();
                return true;
            }
        } else if (cosmeticType === 'board_color') {
            if (!this.unlockedBoardColors.includes(cosmeticName)) {
                this.unlockedBoardColors.push(cosmeticName);
                console.log(`[Monetization] Board color unlocked: ${cosmeticName}`);
                this.showMessage(this.t('board_color_unlocked', { color: cosmeticName }), 'success');
                this.saveUserProgress();
                return true;
            }
        }
        return false;
    }

    applyThemeStyling() {
        // **MONETIZATION: Apply cosmetic styling to board**
        console.log(`[Monetization] Applying theme: ${this.currentTheme}`);
        
        const root = document.documentElement;
        const themes = {
            default: {
                primary: '#667eea',
                secondary: '#764ba2',
                bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                darkBg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            },
            classic: {
                primary: '#667eea',
                secondary: '#764ba2',
                bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                darkBg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            },
            ocean: {
                primary: '#0066cc',
                secondary: '#00aaff',
                bg: 'linear-gradient(135deg, #0066cc 0%, #00aaff 100%)',
                darkBg: 'linear-gradient(135deg, #003d7a 0%, #004d7a 100%)'
            },
            forest: {
                primary: '#2d5016',
                secondary: '#548235',
                bg: 'linear-gradient(135deg, #2d5016 0%, #548235 100%)',
                darkBg: 'linear-gradient(135deg, #1a2e0d 0%, #2d5016 100%)'
            },
            sunset: {
                primary: '#ff6b4a',
                secondary: '#ffb84d',
                bg: 'linear-gradient(135deg, #ff6b4a 0%, #ffb84d 100%)',
                darkBg: 'linear-gradient(135deg, #8b3a20 0%, #7a5e2e 100%)'
            },
            purple: {
                primary: '#9c27b0',
                secondary: '#d946ef',
                bg: 'linear-gradient(135deg, #9c27b0 0%, #d946ef 100%)',
                darkBg: 'linear-gradient(135deg, #5a1b6d 0%, #7a2e8f 100%)'
            },
            neon: {
                primary: '#ff00ff',
                secondary: '#00ffff',
                bg: 'linear-gradient(135deg, #ff00ff 0%, #00ffff 100%)',
                darkBg: 'linear-gradient(135deg, #660066 0%, #006666 100%)'
            }
        };
        
        const theme = themes[this.currentTheme] || themes.classic;
        root.style.setProperty('--theme-primary', theme.primary);
        root.style.setProperty('--theme-secondary', theme.secondary);
        root.style.setProperty('--theme-bg', theme.bg);
        root.style.setProperty('--theme-bg-dark', theme.darkBg);
    }
}

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Init] ========================================');
    console.log('[Init] DOMContentLoaded fired');
    console.log('[Init] Creating game instance...');
    
    // **SIMPLIFIED INITIALIZATION: Create game instance immediately**
    // The game will handle Poki SDK internally when needed
    window.gameInstance = new SudokuGame();
    
    console.log('[Init] Game instance created:', !!window.gameInstance);
    console.log('[Init] window.gameInstance type:', typeof window.gameInstance);
    console.log('[Init] Has startGameWithDifficulty method:', typeof window.gameInstance.startGameWithDifficulty);
    console.log('[Init] ========================================');
    
    // Test button access after a short delay
    setTimeout(() => {
        const testBtn = document.getElementById('diffEasyBtn');
        console.log('[Init] Test: diffEasyBtn exists after init:', !!testBtn);
        if (testBtn) {
            console.log('[Init] Test: diffEasyBtn onclick:', testBtn.onclick);
            console.log('[Init] Test: diffEasyBtn classes:', testBtn.className);
        }
    }, 500);
});
