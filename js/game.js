// ==========================================
// Core Game Engine & Combat Controller
// ==========================================

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Resolution constants
    this.canvasWidth = 1280;
    this.canvasHeight = 720;
    this.groundY = 560;

    // Subsystems
    this.renderer = new GameRenderer(this.canvas, this.ctx);
    this.stageManager = new StageManager(this.canvasWidth, this.canvasHeight);
    this.player = new PlayerMantis(this.canvasWidth, this.canvasHeight);

    // Current Game State
    this.currentStageIndex = 0; // 0 to 7 (8 stages)
    this.unlockedStageIndex = this.loadUnlockedStageIndex();
    this.currentCreature = null;
    this.enemy = null;
    this.gameState = 'start'; // start, playing, paused, victory, defeat, clear
    this.pausedForSettings = false;
    this.roundTimer = 99;
    this.timerInterval = null;
    this.targetFrameInterval = 1000 / 50;
    this.lastFrameAt = performance.now();
    this.needsStaticRender = true;
    this.pendingResult = null;
    this.pendingResultTimer = 0;
    this.deathAnimationTotal = 42;
    this.deathAnimationProgress = 0;

    // Input States
    this.input = {
      left: false,
      right: false,
      jump: false,
      slash: false,
      pounce: false,
      block: false
    };

    this.initUI();
    this.bindInputs();

    // Cache all HUD DOM references once at start (avoid 60fps getElementById calls)
    this.dom = {
      mantisName:    document.getElementById('mantis-name'),
      mantisHpFill:  document.getElementById('mantis-hp-fill'),
      mantisHpBg:    document.getElementById('mantis-hp-bg'),
      mantisHpText:  document.getElementById('mantis-hp-text'),
      enemyHpFill:   document.getElementById('enemy-hp-fill'),
      enemyHpBg:     document.getElementById('enemy-hp-bg'),
      enemyHpText:   document.getElementById('enemy-hp-text'),
      enemyName:     document.getElementById('enemy-name'),
      enemyScientific: document.getElementById('enemy-scientific'),
      enemyAvatar:   document.getElementById('enemy-avatar'),
      stageBadge:    document.getElementById('stage-badge'),
    };

    // Dirty-check values — only write to DOM when changed
    this._hud = { mantisHp: -1, enemyHp: -1, stageIdx: -1 };

    I18N.onChange(() => this.applyLanguage());
    this.applyLanguage();

    this.setupStage(0);
    this.initOverlayFit();

    // Start main game loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  initOverlayFit() {
    this.overlayFitFrame = 0;
    this.overlayFitObserver = new MutationObserver(() => this.scheduleOverlayFit());
    document.querySelectorAll('.overlay').forEach((overlay) => {
      this.overlayFitObserver.observe(overlay, {
        attributes: true,
        attributeFilter: ['class']
      });
    });
    window.addEventListener('resize', () => this.scheduleOverlayFit(), { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => this.scheduleOverlayFit());
    }
    this.scheduleOverlayFit();
  }

  scheduleOverlayFit() {
    if (this.overlayFitFrame) cancelAnimationFrame(this.overlayFitFrame);
    this.overlayFitFrame = requestAnimationFrame(() => {
      this.overlayFitFrame = 0;
      this.fitVisibleOverlays();
    });
  }

  fitVisibleOverlays() {
    const container = document.getElementById('game-container');
    if (!container) return;

    const overlayIds = [
      'overlay-start',
      'overlay-epilogue',
      'overlay-settings',
      'overlay-victory',
      'overlay-defeat',
      'overlay-campaign-clear'
    ];
    const availableHeight = Math.max(1, container.clientHeight - 16);

    overlayIds.forEach((id) => {
      const overlay = document.getElementById(id);
      const box = overlay && overlay.querySelector('.modal-box');
      if (!overlay || !box || getComputedStyle(overlay).display === 'none') return;

      box.classList.remove('overlay-fit-compact');
      box.style.removeProperty('--overlay-fit-scale');

      const renderedHeight = box.getBoundingClientRect().height;
      const contentHeight = Math.max(renderedHeight, box.scrollHeight);
      if (!contentHeight || contentHeight <= availableHeight) return;

      const scale = Math.max(0.55, Math.min(0.98, availableHeight / contentHeight));
      box.style.setProperty('--overlay-fit-scale', scale.toFixed(3));
      box.classList.add('overlay-fit-compact');
    });
  }

  loadUnlockedStageIndex() {
    try {
      const lastUnlocked = Number.parseInt(localStorage.getItem('mantis-unlocked-stage'), 10);
      if (Number.isInteger(lastUnlocked)) {
        return Math.max(0, Math.min(CREATURE_DATABASE.length - 1, lastUnlocked));
      }
    } catch (error) {
      // The first tour stays available if browser storage is unavailable.
    }
    return 0;
  }

  unlockStage(stageIndex) {
    const nextUnlocked = Math.max(0, Math.min(CREATURE_DATABASE.length - 1, stageIndex));
    if (nextUnlocked <= this.unlockedStageIndex) return;

    this.unlockedStageIndex = nextUnlocked;
    try {
      localStorage.setItem('mantis-unlocked-stage', String(this.unlockedStageIndex));
    } catch (error) {
      // The game still works if browser storage is unavailable.
    }
    this.updateStageSelector();
  }

  updateStageSelector() {
    document.querySelectorAll('.stage-select-btn').forEach((btn, idx) => {
      const isUnlocked = idx <= this.unlockedStageIndex;
      const creature = CREATURE_DATABASE[idx];
      btn.disabled = !isUnlocked;
      btn.classList.toggle('locked', !isUnlocked);
      btn.classList.toggle('current', idx === this.currentStageIndex);
      const cName = I18N.getCreatureName(creature);
      btn.textContent = isUnlocked
        ? `${idx + 1}. ${cName}`
        : `🔒 ${idx + 1}. ${cName}`;
      btn.title = isUnlocked
        ? I18N.t('stage_start_tooltip', { stage: idx + 1 })
        : I18N.t('stage_locked_tooltip', { prevCreature: I18N.getCreatureName(CREATURE_DATABASE[idx - 1]) });
    });

    const progressNote = document.getElementById('stage-progress-note');
    if (progressNote) {
      progressNote.textContent = this.unlockedStageIndex >= CREATURE_DATABASE.length - 1
        ? I18N.t('progress_all_unlocked')
        : I18N.t('progress_some_unlocked', { unlocked: this.unlockedStageIndex + 1, total: CREATURE_DATABASE.length });
    }
  }

  // --- Stage & Creature Initialization ---
  setupStage(stageIndex) {
    if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= CREATURE_DATABASE.length) return;
    if (stageIndex > this.unlockedStageIndex) return;
    this.currentStageIndex = stageIndex;
    this.currentCreature = CREATURE_DATABASE[stageIndex];
    this.stageManager.setHabitat(this.currentCreature.habitat);
    this.pendingResult = null;
    this.pendingResultTimer = 0;

    const isFrogStage = this.currentCreature.id === 'hyla_orientalis';
    const isAntStage = this.currentCreature.id === 'pharaoh_ants';
    const isHornetStage = this.currentCreature.id === 'asian_hornet';
    const isSnakeStage = this.currentCreature.id === 'garter_snake';
    const frogPlatform = {
      x: 820,
      y: this.groundY - 160,
      width: 260,
      height: 16
    };

    // Reset player position and state
    this.player.reset(180, this.groundY);

    // Instantiate Enemy Combatant
    this.enemy = {
      ...this.currentCreature,
      x: isFrogStage
        ? frogPlatform.x + frogPlatform.width * 0.58
        : (isHornetStage
          ? this.canvasWidth * 0.83 - 10
        : (isSnakeStage ? this.canvasWidth * 0.82 : this.canvasWidth - 240)),
      y: isFrogStage
        ? frogPlatform.y
        : (isHornetStage ? 255 : (isSnakeStage ? this.groundY + 38 : this.groundY)),
      vx: 0,
      vy: 0,
      direction: -1,
      hp: this.currentCreature.maxHp,
      maxHp: this.currentCreature.maxHp,
      isGrounded: isHornetStage || isSnakeStage ? false : true,
      isStunned: false,
      stunTimer: 0,
      actionState: isSnakeStage ? 'burrow_emerge' : 'idle',
      actionTimer: 0,
      attackCooldown: 60,
      animTime: 0,
      activeHitbox: null,
      attackingAntId: null,
      isDead: false,
      deathProgress: 0,
      deathStartY: null,
      deathTargetY: null,
      deathRotation: 0,
      hornetNestX: isHornetStage ? this.canvasWidth * 0.83 - 10 : null,
      hornetCombatX: isHornetStage ? this.canvasWidth - 330 : null,
      hornetNestY: isHornetStage ? 255 : null,
      hornetCombatY: isHornetStage ? 365 : null,
      hornetEmergenceTimer: isHornetStage ? 90 : 0,
      hornetEmergenceTotal: isHornetStage ? 90 : 0,
      hornetEmergenceProgress: 0,
      hornetEmergenceSoundPlayed: false,
      snakeBurrowX: isSnakeStage ? this.canvasWidth * 0.82 : null,
      // Leave enough room on the right for the snake's long, pointed tail.
      // Keep the normal combat body left of the burrow as well; the snake
      // exits toward the left and never spawns a segment on the right side.
      snakeCombatX: isSnakeStage ? this.canvasWidth - 760 : null,
      snakeBurrowY: isSnakeStage ? this.groundY + 38 : null,
      snakeCombatY: isSnakeStage ? this.groundY : null,
      snakeEmergenceTimer: isSnakeStage ? 150 : 0,
      snakeEmergenceTotal: isSnakeStage ? 150 : 0,
      snakeEmergenceProgress: 0,
      snakeEmergenceSoundPlayed: false,
      snakeSettleTimer: 0,
      snakeSettleTotal: 45,
      snakeSettleProgress: 0,
      tongueX: 0,
      tongueY: 0,
      groundY: this.groundY,
      frogOnPerch: isFrogStage,
      frogHasDropped: false,
      frogPerchTimer: isFrogStage ? 55 : 0,
      // Three separate ants enter through the mound one after another.
      antUnits: isAntStage ? [
        { id: 'ant-left', offsetX: -54, restY: 0, scale: 0.86, isMajor: false, phase: 0.2, emergeDelay: 0, emergeProgress: 0, maxHp: 85, hp: 85, alive: true, renderX: 0, renderY: -46, walkOffset: 0 },
        { id: 'ant-commander', offsetX: 0, restY: -4, scale: 1.08, isMajor: true, phase: 1.7, emergeDelay: 14, emergeProgress: 0, maxHp: 110, hp: 110, alive: true, renderX: 0, renderY: -46, walkOffset: 0 },
        { id: 'ant-right', offsetX: 54, restY: 1, scale: 0.9, isMajor: false, phase: 3.1, emergeDelay: 28, emergeProgress: 0, maxHp: 85, hp: 85, alive: true, renderX: 0, renderY: -46, walkOffset: 0 }
      ] : null,
    };

    if (isAntStage) this.syncAntColonyHealth();

    this.roundTimer = 99;
    this.needsStaticRender = true;
    // Invalidate dirty cache so enemy name/info and HP bars refresh on new stage
    if (this._hud) {
      this._hud.mantisHp = -1;
      this._hud.enemyHp  = -1;
      this._hud.stageIdx = -1;
    }
    this.updateHUD();
    this.highlightActiveStageBtn();
    // Initialize platforms for current creature
    if (isFrogStage) {
      this.stageManager.platforms = [new TreePlatform(
        frogPlatform.x,
        frogPlatform.y,
        frogPlatform.width,
        frogPlatform.height
      )];
    } else {
      this.stageManager.platforms = [];
    }
  }

  startRound() {
    this.gameState = 'playing';
    this.roundActive = true;
    window.soundEngine.stopMenuMusic();
    window.soundEngine.stopEpilogueMusic();
    window.soundEngine.startBGM();

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.gameState === 'playing' && this.roundTimer > 0 && this.roundActive) {
        this.roundTimer--;
        document.getElementById('round-timer').textContent = this.roundTimer;
        if (this.roundTimer <= 0) {
          // Time over! Compare HP
          if (this.player.hp >= this.enemy.hp) {
            this.queueRoundResult('victory');
          } else {
            this.queueRoundResult('defeat');
          }
        }
      }
    }, 1000);
  }

  returnToMainMenu() {
    this.gameState = 'start';
    this.pausedForSettings = false;
    this.roundActive = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    window.soundEngine.stopBGM();
    window.soundEngine.stopEpilogueMusic();
    window.soundEngine.startMenuMusic();

    Object.keys(this.input).forEach((key) => {
      this.input[key] = false;
    });
    this.player.activeHitbox = null;
    this.player.state = 'idle';
    this.player.stateTimer = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.needsStaticRender = true;

    document.querySelectorAll('.overlay').forEach((overlay) => {
      overlay.classList.add('hidden');
    });
    document.getElementById('overlay-start').classList.remove('hidden');
  }

  toggleSettingsOverlay() {
    const settingsOverlay = document.getElementById('overlay-settings');
    const isOpening = settingsOverlay.classList.contains('hidden');

    if (isOpening) {
      if (this.gameState === 'playing') {
        this.gameState = 'paused';
        this.pausedForSettings = true;
        Object.keys(this.input).forEach((key) => {
          this.input[key] = false;
        });
      }
      settingsOverlay.classList.remove('hidden');
    } else {
      settingsOverlay.classList.add('hidden');
      if (this.pausedForSettings) {
        this.pausedForSettings = false;
        this.gameState = 'playing';
        Object.keys(this.input).forEach((key) => {
          this.input[key] = false;
        });
        // Prevent a large frame delta when the fight resumes.
        this.lastTime = performance.now();
      }
    }

    this.needsStaticRender = true;
  }

  closeSettingsOverlay() {
    const settingsOverlay = document.getElementById('overlay-settings');
    settingsOverlay.classList.add('hidden');
    if (this.pausedForSettings) {
      this.pausedForSettings = false;
      this.gameState = 'playing';
      Object.keys(this.input).forEach((key) => {
        this.input[key] = false;
      });
      this.lastTime = performance.now();
    }
    this.needsStaticRender = true;
  }

  resumeActiveMusic() {
    const eng = window.soundEngine;
    if (!eng || !eng.bgmEnabled) return;

    const epilogueOverlay = document.getElementById('overlay-epilogue');
    const epilogueVisible = epilogueOverlay && !epilogueOverlay.classList.contains('hidden');
    if (epilogueVisible) {
      eng.startEpilogueMusic();
    } else if (this.gameState === 'start') {
      eng.startMenuMusic();
    } else {
      // Settings pauses the fight, so pausedForSettings must still resume the
      // combat track when music is switched back on.
      eng.startBGM();
    }
  }

  // --- Main Game Loop ---
  loop(timestamp) {
    if (timestamp - this.lastFrameAt < this.targetFrameInterval) {
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    this.lastFrameAt = timestamp;

    if (this.gameState === 'playing') {
      this.update(dt);
      this.render();
    } else if (this.gameState === 'ending') {
      // Animate the losing creature while keeping the result screen hidden.
      this.renderer.updateFX();
      this.updateDeathAnimation();
      this.render();
      this.pendingResultTimer--;
      if (this.pendingResultTimer <= 0) {
        this.finishPendingResult();
      }
    } else if (this.needsStaticRender) {
      // A modal/menu does not need a continuously redrawn canvas.
      this.render();
      this.needsStaticRender = false;
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (this.gameState !== 'playing') return;

    this.stageManager.update();
    this.renderer.updateFX();

    // 1. Update Player
    this.player.update(this.input, this.enemy);

    // 2. Update Enemy AI
    this.updateEnemyAI();

    // 3. Check Hitbox Collisions
    this.checkCombatCollisions();

    // 4. Update HUD bars
    this.updateHUD();

    // 5. Check Win / Lose
    if (this.enemy.hp <= 0 && this.gameState === 'playing') {
      this.queueRoundResult('victory');
    } else if (this.player.hp <= 0 && this.gameState === 'playing') {
      this.queueRoundResult('defeat');
    }
  }

  queueRoundResult(result) {
    if (this.pendingResult) return;

    // Freeze gameplay while the losing creature completes its fall.
    this.pendingResult = result;
    this.pendingResultTimer = this.deathAnimationTotal;
    this.deathAnimationProgress = 0;
    this.roundActive = false;
    this.gameState = 'ending';
    this.player.activeHitbox = null;
    this.enemy.activeHitbox = null;
    this.beginDeathAnimation(result);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getEnemyDeathGroundY(enemy) {
    // The hornet's local drawing origin is above its feet, so its anchor
    // settles slightly above the common ground line when it falls.
    return enemy.id === 'asian_hornet' ? this.groundY - 18 : this.groundY;
  }

  getEnemyDeathRotation(enemy) {
    if (enemy.id === 'garter_snake') return 0.2;
    if (enemy.id === 'asian_hornet') return 1.42;
    // Rotation happens after the renderer mirrors the creature, so keeping
    // this in local coordinates makes both facing directions fall downward.
    return 1.38;
  }

  getEnemyDeathLift(enemy) {
    if (enemy.id === 'garter_snake') return 0;
    // Rotate around the feet and lift the body so the fallen creature rests
    // on the ground instead of sinking through the floor.
    return -30;
  }

  beginDeathAnimation(result) {
    if (result === 'defeat') {
      const player = this.player;
      player.state = 'dead';
      player.isBlocking = false;
      player.activeHitbox = null;
      player.vx = 0;
      player.vy = 0;
      player.deathProgress = 0;
      player.deathStartY = player.y;
      player.deathTargetY = this.groundY;
      player.deathRotation = 1.38;
      player.deathLift = 8;
      return;
    }

    const enemy = this.enemy;
    enemy.isDead = true;
    enemy.actionState = 'dead';
    enemy.isStunned = false;
    enemy.stunTimer = 0;
    enemy.activeHitbox = null;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.isGrounded = false;
    enemy.deathProgress = 0;
    enemy.deathStartY = enemy.y;
    enemy.deathTargetY = this.getEnemyDeathGroundY(enemy);
    enemy.deathRotation = this.getEnemyDeathRotation(enemy);
    enemy.deathLift = this.getEnemyDeathLift(enemy);
  }

  updateDeathAnimation() {
    if (!this.pendingResult) return;

    const progress = Math.max(0, Math.min(1,
      1 - this.pendingResultTimer / this.deathAnimationTotal
    ));
    const eased = 1 - Math.pow(1 - progress, 3);
    this.deathAnimationProgress = progress;

    if (this.pendingResult === 'defeat') {
      const player = this.player;
      player.deathProgress = progress;
      player.y = player.deathStartY + (player.deathTargetY - player.deathStartY) * eased;
      player.isGrounded = progress >= 0.94;
      player.vx = 0;
      player.vy = 0;
      return;
    }

    const enemy = this.enemy;
    enemy.deathProgress = progress;
    enemy.y = enemy.deathStartY + (enemy.deathTargetY - enemy.deathStartY) * eased;
    enemy.isGrounded = progress >= 0.94;
    enemy.vx = 0;
    enemy.vy = 0;
  }

  finishPendingResult() {
    const result = this.pendingResult;
    this.pendingResult = null;
    this.pendingResultTimer = 0;
    this.deathAnimationProgress = 1;
    if (result === 'victory' && this.enemy) {
      this.enemy.deathProgress = 1;
      this.enemy.y = this.enemy.deathTargetY;
      this.enemy.isGrounded = true;
    } else if (result === 'defeat' && this.player) {
      this.player.deathProgress = 1;
      this.player.y = this.player.deathTargetY;
      this.player.isGrounded = true;
    }
    if (result === 'victory') {
      this.handleVictory();
    } else if (result === 'defeat') {
      // Player.takeDamage already played the defeat sound on the final hit.
      this.handleDefeat(false);
    }
  }

  // --- Enemy Biological AI State Machine ---
  updateEnemyAI() {
    const e = this.enemy;
    const p = this.player;
    e.animTime += 0.05;
    // Frog jump physics constants (used only for Hyla frog enemy)
    const FROG_JUMP_VELOCITY = -13;
    const FROG_GRAVITY = 0.6;
    const FROG_JUMP_COOLDOWN = 70; // frames before next hop

    // Boundary clamps
    if (e.x < 100) e.x = 100;
    if (e.x > this.canvasWidth - 100) e.x = this.canvasWidth - 100;

    // The hornet crawls out of the lower opening of its hanging nest before
    // taking its normal airborne combat position.
    if (e.id === 'asian_hornet' && e.hornetEmergenceTimer > 0) {
      if (!e.hornetEmergenceSoundPlayed) {
        e.hornetEmergenceSoundPlayed = true;
        window.soundEngine.playWingFlutter();
      }
      const elapsed = e.hornetEmergenceTotal - e.hornetEmergenceTimer;
      const progress = Math.max(0, Math.min(1, elapsed / e.hornetEmergenceTotal));
      const eased = progress * progress * (3 - 2 * progress);
      e.hornetEmergenceProgress = progress;
      e.actionState = 'nest_emerge';
      e.isGrounded = false;
      e.vx = 0;
      e.x = e.hornetNestX + (e.hornetCombatX - e.hornetNestX) * eased;
      e.y = e.hornetNestY + (e.hornetCombatY - e.hornetNestY) * eased;
      e.hornetEmergenceTimer--;
      if (e.hornetEmergenceTimer <= 0) {
        e.actionState = 'idle';
        e.x = e.hornetCombatX;
        e.y = e.hornetCombatY;
      }
      return;
    }

    // The final snake starts hidden in a ground burrow. Each new section
    // clears the same opening and lays out to the left before the next
    // section follows. The body does not travel away from the opening until
    // the complete snake has emerged.
    if (e.id === 'garter_snake' && e.snakeEmergenceTimer > 0) {
      if (!e.snakeEmergenceSoundPlayed) {
        e.snakeEmergenceSoundPlayed = true;
        window.soundEngine.playSnakeHiss();
      }
      const elapsed = e.snakeEmergenceTotal - e.snakeEmergenceTimer;
      const progress = Math.max(0, Math.min(1, elapsed / e.snakeEmergenceTotal));
      // Raise the anchor just enough for the next horizontal section to clear
      // the soil. The anchor stays at the burrow while the visible length
      // grows, so no section can appear on the right side of the entrance.
      const verticalProgress = Math.max(0, Math.min(1, progress / 0.22));
      const verticalEased = verticalProgress * verticalProgress * (3 - 2 * verticalProgress);
      e.snakeEmergenceProgress = progress;
      e.actionState = 'burrow_emerge';
      e.isGrounded = false;
      e.vx = 0;
      e.x = e.snakeBurrowX;
      e.y = e.snakeBurrowY + (e.snakeCombatY - e.snakeBurrowY) * verticalEased;
      e.snakeEmergenceTimer--;
      if (e.snakeEmergenceTimer <= 0) {
        // The whole body is now out. Let it turn into its natural combat
        // orientation only after the last segment has cleared the hole.
        e.actionState = 'burrow_settle';
        e.isGrounded = false;
        e.snakeSettleTimer = e.snakeSettleTotal;
        e.snakeSettleProgress = 0;
        e.x = e.snakeBurrowX;
        e.y = e.snakeCombatY;
      }
      return;
    }

    // Smoothly turn the fully emerged body into its normal combat pose. This
    // starts only after every section is already visible left of the burrow.
    if (e.id === 'garter_snake' && e.actionState === 'burrow_settle' && e.snakeSettleTimer > 0) {
      const elapsed = e.snakeSettleTotal - e.snakeSettleTimer;
      const progress = Math.max(0, Math.min(1, elapsed / e.snakeSettleTotal));
      const eased = progress * progress * (3 - 2 * progress);
      e.snakeSettleProgress = progress;
      e.snakeEmergenceProgress = 1;
      e.isGrounded = false;
      e.vx = 0;
      e.x = e.snakeBurrowX + (e.snakeCombatX - e.snakeBurrowX) * eased;
      e.y = e.snakeCombatY;
      e.snakeSettleTimer--;
      if (e.snakeSettleTimer <= 0) {
        e.actionState = 'idle';
        e.isGrounded = true;
        e.snakeSettleProgress = 1;
        e.x = e.snakeCombatX;
        e.y = e.snakeCombatY;
      }
      return;
    }

    // Animate each ant independently while the colony emerges and spreads out.
    if (e.antUnits) {
      e.antUnits.forEach((ant) => {
        if (!ant.alive) return;
        if (ant.emergeDelay > 0) {
          ant.emergeDelay--;
        } else {
          ant.emergeProgress = Math.min(1, ant.emergeProgress + 0.045);
        }
        ant.phase += ant.emergeProgress >= 1 ? 0.18 : 0.08;
        const progress = Math.max(0, Math.min(1, ant.emergeProgress));
        ant.walkOffset = progress >= 1
          ? Math.sin(ant.phase * 0.75) * 6 + Math.sin(ant.phase * 0.31) * 3
          : 0;
        ant.renderX = ant.offsetX * progress + ant.walkOffset;
        ant.renderY = -46 + (ant.restY + 46) * progress;
      });
      this.syncAntColonyHealth();
    }

    // Stun recovery
    if (e.isStunned) {
      e.stunTimer--;
      if (e.stunTimer <= 0) {
        e.isStunned = false;
        e.actionState = 'idle';
      }
      return;
    }

    // Hyla begins on a high branch, pauses briefly, then deliberately drops
    // to the pond floor before joining the fight.
    if (e.id === 'hyla_orientalis' && e.frogOnPerch) {
      e.frogPerchTimer--;
      e.actionState = 'perched';
      e.vx = 0;
      if (e.frogPerchTimer <= 0) {
        e.frogOnPerch = false;
        e.frogHasDropped = true;
        e.isGrounded = false;
        e.actionState = 'frog_drop';
        e.actionTimer = 48;
        e.vy = 2.2;
        e.vx = (p.x >= e.x ? 1 : -1) * 2.2;
        e.attackCooldown = 45;
        if (window.soundEngine && window.soundEngine.playFrogJump) window.soundEngine.playFrogJump();
      } else {
        return;
      }
    }

    // Aerial flight & Gravity physics
    // Frog jump trigger (Space) when grounded. The AI also starts hops below.
    if (e.id === 'hyla_orientalis' && this.input.jump && e.isGrounded && e.attackCooldown <= 0) {
      e.actionState = 'frog_hop';
      e.actionTimer = 50;
      e.vy = FROG_JUMP_VELOCITY;
      e.isGrounded = false;
      e.attackCooldown = FROG_JUMP_COOLDOWN;
      e.activeHitbox = { damage: e.attackPower * 1.15, width: 105, height: 72, isBlockable: true };
      if (window.soundEngine && window.soundEngine.playFrogJump) window.soundEngine.playFrogJump();
    }
    const isGrasshopperFlying = ['flight_glide', 'blue_wing_flight', 'locust_swarm_flight'].includes(e.actionState);
    if (e.id === 'asian_hornet') {
      // Asian Hornet aerial hovering
      e.y += Math.sin(e.animTime * 3) * 1.5;
    } else if (isGrasshopperFlying) {
      // Grasshoppers flying through the air with fluttering wings!
      e.isGrounded = false;
      const targetFlightY = this.groundY - 145;
      e.y += (targetFlightY - e.y) * 0.12 + Math.sin(e.animTime * 14) * 2.5;
      e.vx = e.direction * 7.5;
    } else {
      if (!e.isGrounded) {
        // Apply custom gravity: frog uses its own gravity constant
        if (e.id === 'hyla_orientalis') {
          e.vy += FROG_GRAVITY;
        } else {
          e.vy += 0.85;
        }
        e.y += e.vy;
        // Ground landing
        if (e.y >= this.groundY) {
          e.y = this.groundY;
          e.vy = 0;
          e.isGrounded = true;
          if (['spring_kick', 'body_slam', 'frog_drop', 'frog_hop', 'frog_jump', 'flight_glide', 'blue_wing_flight', 'locust_swarm_flight'].includes(e.actionState)) {
            e.actionState = 'idle';
            e.activeHitbox = null;
            if (e.id === 'hyla_orientalis' && window.soundEngine && window.soundEngine.playFrogLand) {
              window.soundEngine.playFrogLand();
            }
          }
        } else {
          // Platform landing for Hyla frog
          if (e.id === 'hyla_orientalis' && !e.frogHasDropped && e.vy >= 0 && this.stageManager && this.stageManager.platforms) {
            const frogWidth = e.size && e.size.width ? e.size.width : 90;
            const previousY = e.y - e.vy;
            for (const plat of this.stageManager.platforms) {
              const frogLeft = e.x - frogWidth * 0.5;
              const frogRight = e.x + frogWidth * 0.5;
              const onPlatform = frogRight > plat.x && frogLeft < plat.x + plat.width && previousY <= plat.y && e.y >= plat.y;
              if (onPlatform) {
                e.y = plat.y;
                e.vy = 0;
                e.isGrounded = true;
                if (['frog_hop', 'frog_jump'].includes(e.actionState)) {
                  e.actionState = 'idle';
                  e.activeHitbox = null;
                  if (window.soundEngine && window.soundEngine.playFrogLand) window.soundEngine.playFrogLand();
                }
                break;
              }
            }
          }
        }
      }
    }

    // Apply horizontal velocity with friction
    e.x += e.vx;
    e.vx *= 0.88;

    // Cooldown decrement
    if (e.attackCooldown > 0) e.attackCooldown--;

    // Face Player when not in a locked aerial dash
    if (!['air_dash', 'red_wing_charge', 's_coil_strike', 'stinger_thrust'].includes(e.actionState)) {
      e.direction = p.x > e.x ? 1 : -1;
    }

    // If currently performing an action
    if (e.actionTimer > 0) {
      e.actionTimer--;
      this.updateEnemyActionBehavior(e, p);
      return;
    }

    // Idle or selecting next move
    const dist = Math.abs(p.x - e.x);

    // Choose attack based on biological creature ID
    if (e.attackCooldown <= 0) {
      this.triggerCreatureAttack(e, p, dist);
    } else {
      // Intelligent tactical movement
      if (dist > 320) {
        // Move closer
        e.vx = e.direction * (e.speed * 0.7);
      } else if (dist < 120 && Math.random() < 0.3) {
        // Step back
        e.vx = -e.direction * (e.speed * 0.8);
      }
    }
  }

  triggerCreatureAttack(e, p, dist) {
    e.attackCooldown = Math.floor(Math.random() * 40 + e.aiCooldowns.attack);

    if (e.id === 'pharaoh_ants' && e.antUnits) {
      const availableAnts = this.getLivingAnts().filter((ant) => ant.emergeProgress >= 1);
      const attacker = availableAnts[Math.floor(Math.random() * availableAnts.length)] || this.getLivingAnts()[0];
      e.attackingAntId = attacker ? attacker.id : null;
    }

    switch (e.id) {
      case 'truxalis':
        // Aerial Wing Flight Glide, High Spring Jump Kick, or Toothed Mandible Nip
        if (dist > 180 || Math.random() < 0.38) {
          // Real Truxalis flight: leaps high into the air and glides with rustling fan underwings!
          e.actionState = 'flight_glide';
          e.actionTimer = 55;
          e.vy = -16;
          e.vx = e.direction * 7.5;
          e.isGrounded = false;
          window.soundEngine.playWingFlutter();
          e.activeHitbox = { damage: e.attackPower * 1.2, width: 85, height: 60, isBlockable: true };
        } else if (Math.random() < 0.5) {
          e.actionState = 'spring_kick';
          e.actionTimer = 45;
          e.vy = -18;
          e.vx = e.direction * 7;
          e.isGrounded = false;
          window.soundEngine.playGrasshopperJump();
          window.soundEngine.playWingFlutter();
          e.activeHitbox = { damage: e.attackPower, width: 70, height: 60, isBlockable: true };
        } else {
          e.actionState = 'mandible_nip';
          e.actionTimer = 22;
          e.vx = e.direction * 6;
          window.soundEngine.playMandibleBite();
          this.renderer.addBiteFX(e.x + e.direction * 35, e.y - 20, '#dda15e');
          e.activeHitbox = { damage: e.attackPower * 0.9, width: 65, height: 40, isBlockable: true, isBite: true };
        }
        break;

      case 'oedipoda':
        // Electric-Blue Wing Flight, Blue Flash Dash, Gravel Kick, or Toothed Mandible Nip
        if (dist > 180 || Math.random() < 0.35) {
          // Real Oedipoda flash flight: leaps into the air with radiant blue wings flapping!
          e.actionState = 'blue_wing_flight';
          e.actionTimer = 52;
          e.vy = -16;
          e.vx = e.direction * 8.5;
          e.isGrounded = false;
          window.soundEngine.playBlueFlash();
          window.soundEngine.playWingFlutter();
          this.renderer.addImpactSparks(e.x, e.y - 30, '#00b4d8', 15);
          e.activeHitbox = { damage: e.attackPower * 1.25, width: 95, height: 65, isBlockable: true };
        } else if (dist < 130 && Math.random() < 0.5) {
          e.actionState = 'mandible_nip';
          e.actionTimer = 24;
          e.vx = e.direction * 6.5;
          window.soundEngine.playMandibleBite();
          this.renderer.addBiteFX(e.x + e.direction * 35, e.y - 22, '#48cae4');
          e.activeHitbox = { damage: e.attackPower * 0.95, width: 70, height: 45, isBlockable: true, isBite: true };
        } else if (Math.random() < 0.65) {
          e.actionState = 'blue_flash_dash';
          e.actionTimer = 35;
          e.vx = e.direction * 14; // lightning dash
          window.soundEngine.playBlueFlash();
          this.renderer.addImpactSparks(e.x, e.y - 30, '#00b4d8', 15);
          e.activeHitbox = { damage: e.attackPower * 1.1, width: 85, height: 50, isBlockable: true };
        } else {
          e.actionState = 'gravel_kick';
          e.actionTimer = 28;
          window.soundEngine.playHit();
          this.renderer.addImpactSparks(e.x + e.direction * 40, e.y, '#adb5bd', 8);
          e.activeHitbox = { damage: e.attackPower * 0.8, width: 90, height: 40, isBlockable: true };
        }
        break;

      case 'calliptamus':
        // Luminous Rose-Pink Locust Swarm Flight, Crushing Mandibles, Red Wing Charge, or Ground Stomp
        if (dist > 180 || Math.random() < 0.35) {
          // Real Calliptamus locust flight: flies across the arena with luminous pink wings!
          e.actionState = 'locust_swarm_flight';
          e.actionTimer = 54;
          e.vy = -15;
          e.vx = e.direction * 8;
          e.isGrounded = false;
          window.soundEngine.playLocustCharge();
          window.soundEngine.playWingFlutter();
          e.activeHitbox = { damage: e.attackPower * 1.3, width: 100, height: 70, isBlockable: true };
        } else if (dist < 140 && Math.random() < 0.55) {
          e.actionState = 'mandible_crush';
          e.actionTimer = 26;
          e.vx = e.direction * 8;
          window.soundEngine.playMandibleBite();
          this.renderer.addBiteFX(e.x + e.direction * 35, e.y - 24, '#d90429');
          e.activeHitbox = { damage: e.attackPower * 1.15, width: 75, height: 50, isBlockable: true, isBite: true };
        } else if (dist > 160) {
          e.actionState = 'red_wing_charge';
          e.actionTimer = 42;
          e.vx = e.direction * 11;
          window.soundEngine.playLocustCharge();
          e.activeHitbox = { damage: e.attackPower * 1.25, width: 95, height: 65, isBlockable: true };
        } else {
          e.actionState = 'ground_stomp';
          e.actionTimer = 35;
          e.vy = -12;
          e.isGrounded = false;
          window.soundEngine.playLocustCharge();
          e.activeHitbox = { damage: e.attackPower, width: 80, height: 60, isBlockable: true };
        }
        break;

      case 'katydid':
        // Lethal predatory saber mandible bite, Sonic Stridulation blast, or Leaf Shield
        if (dist < 150 && Math.random() < 0.65) {
          // Katydids have terrifying predatory curved mandibles that draw blood!
          e.actionState = 'mandible_bite';
          e.actionTimer = 28;
          e.vx = e.direction * 9;
          window.soundEngine.playMandibleBite();
          this.renderer.addBiteFX(e.x + e.direction * 38, e.y - 28, '#52b788');
          e.activeHitbox = { damage: e.attackPower * 1.35, width: 85, height: 55, isBlockable: true, isBite: true };
        } else if (Math.random() < 0.6) {
          e.actionState = 'sonic_stridulation';
          e.actionTimer = 40;
          window.soundEngine.playKatydidStridulation();
          this.renderer.addSonicRing(e.x, e.y - 35, 40, '#52b788');
          e.activeHitbox = { damage: e.attackPower * 1.1, width: 140, height: 80, isBlockable: true };
        } else {
          e.actionState = 'leaf_shield';
          e.actionTimer = 50;
        }
        break;

      case 'hyla_orientalis':
        // A tree frog fights with repeated long hops, tongue grapples, and body slams.
        if (Math.random() < 0.55 || dist > 260) {
          e.actionState = 'frog_hop';
          e.actionTimer = 50;
          e.vy = -13;
          e.vx = e.direction * (dist > 260 ? 8 : 6);
          e.isGrounded = false;
          e.activeHitbox = { damage: e.attackPower * 1.15, width: 105, height: 72, isBlockable: true };
          window.soundEngine.playFrogJump();
        } else if (dist > 180 || Math.random() < 0.65) {
          // Gaping mouth Tongue Grapple
          e.actionState = 'tongue_grapple';
          e.actionTimer = 32;
          e.tongueX = p.x;
          e.tongueY = p.y - 30;
          window.soundEngine.playTongueWhip();
          window.soundEngine.playMandibleBite();
          this.renderer.addBiteFX(e.x + e.direction * 40, e.y - 30, '#ccff33');
          e.activeHitbox = { damage: e.attackPower * 1.25, width: 180, height: 45, isBlockable: true, isBite: true };
        } else {
          // Short, heavy landing/body slam
          e.actionState = 'body_slam';
          e.actionTimer = 45;
          e.vy = -16;
          e.vx = e.direction * 6;
          e.isGrounded = false;
          window.soundEngine.playFrogCroak();
          e.activeHitbox = { damage: e.attackPower * 1.3, width: 100, height: 80, isBlockable: true };
        }
        break;

      case 'asian_hornet': {
        // The hornet fights at close range with its mandibles first; the stinger is a rarer follow-up.
        if (dist < 160 && Math.random() < 0.72) {
          e.actionState = 'mandible_decapitate';
          e.actionTimer = 30;
          e.vx = e.direction * 11;
          window.soundEngine.playMandibleBite();
          this.renderer.addBiteFX(e.x + e.direction * 42, e.y - 25, '#faa307');
          e.activeHitbox = { damage: e.attackPower * 1.45, width: 90, height: 60, isBlockable: true, isBite: true };
        } else if (dist < 240 && Math.random() < 0.55) {
          e.actionState = 'stinger_thrust';
          e.actionTimer = 34;
          // Keep the head facing the player; the abdomen bends underneath the thorax.
          e.vx = (p.x > e.x ? 1 : -1) * 4.5;
          window.soundEngine.playStingerThrust();
          this.renderer.addImpactSparks(p.x, p.y - 35, '#ffd166', 14);
          e.activeHitbox = {
            damage: e.attackPower * 1.6,
            width: 120,
            height: 68,
            isBlockable: true,
            isStinger: true
          };
        } else {
          e.actionState = 'aerial_divebomb';
          e.actionTimer = 38;
          e.vx = e.direction * 13;
          e.vy = 7; // dive down toward player
          window.soundEngine.playHornetBuzz();
          e.activeHitbox = { damage: e.attackPower * 1.3, width: 85, height: 65, isBlockable: true };
        }
        break;
      }

      case 'pharaoh_ants':
        // Swarm rush (mandibles biting) & caustic formic acid spray
        if (Math.random() < 0.5) {
          e.actionState = 'formic_acid_spray';
          e.actionTimer = 36;
          window.soundEngine.playAntSwarm();
          this.renderer.addImpactSparks(e.x + e.direction * 50, e.y - 20, '#70e000', 12);
          e.activeHitbox = { damage: e.attackPower, width: 130, height: 60, isBlockable: true };
        } else {
          e.actionState = 'swarm_rush';
          e.actionTimer = 35;
          e.vx = e.direction * 9;
          window.soundEngine.playAntSwarm();
          window.soundEngine.playMandibleBite();
          this.renderer.addBiteFX(e.x + e.direction * 35, e.y - 12, '#936639');
          e.activeHitbox = { damage: e.attackPower * 1.15, width: 95, height: 50, isBlockable: true, isBite: true };
        }
        break;

      case 'garter_snake':
        // Recurved needle-fang lunge strike or sweeping tail whip
        if (Math.random() < 0.65) {
          e.actionState = 's_coil_strike';
          e.actionTimer = 36;
          e.vx = e.direction * 16; // lightning lunge
          window.soundEngine.playSnakeStrike();
          window.soundEngine.playMandibleBite();
          this.renderer.addBiteFX(e.x + e.direction * 50, e.y - 22, '#ffd166');
          e.activeHitbox = { damage: e.attackPower * 1.45, width: 160, height: 60, isBlockable: true, isBite: true };
        } else {
          e.actionState = 'tail_whip_sweep';
          e.actionTimer = 32;
          window.soundEngine.playSnakeHiss();
          e.activeHitbox = { damage: e.attackPower * 1.1, width: 140, height: 50, isBlockable: false };
        }
        break;
    }
  }

  updateEnemyActionBehavior(e, p) {
    if (e.id === 'asian_hornet' && e.actionState === 'aerial_divebomb') {
      if (e.y >= this.groundY - 40) {
        e.vy = -6; // pull up after dive
      }
    }
    if (e.actionTimer <= 0) {
      e.actionState = 'idle';
      e.activeHitbox = null;
      e.attackingAntId = null;
    }
  }

  // --- Combat & Hitbox Collision Math ---
  syncAntColonyHealth() {
    if (!this.enemy || !this.enemy.antUnits) return;
    const livingAnts = this.enemy.antUnits.filter((ant) => ant.alive && ant.hp > 0);
    this.enemy.hp = livingAnts.reduce((total, ant) => total + ant.hp, 0);
    this.enemy.aliveAntCount = livingAnts.length;
  }

  getAntWorldPose(ant) {
    return {
      x: this.enemy.x + this.enemy.direction * (ant.renderX ?? ant.offsetX),
      y: this.enemy.y + (ant.renderY ?? ant.restY)
    };
  }

  getLivingAnts() {
    return this.enemy && this.enemy.antUnits
      ? this.enemy.antUnits.filter((ant) => ant.alive && ant.hp > 0)
      : [];
  }

  checkCombatCollisions() {
    const p = this.player;
    const e = this.enemy;

    // 1. Player attack hitting Enemy
    if (!['nest_emerge', 'burrow_emerge'].includes(e.actionState) && p.activeHitbox && !p.activeHitbox.hasHit) {
      const hb = p.activeHitbox;
      let targetAnt = null;
      let enemyHitbox = null;

      if (e.id === 'pharaoh_ants') {
        // Resolve the hit against one living ant, not the colony as a single body.
        for (const ant of this.getLivingAnts()) {
          const pose = this.getAntWorldPose(ant);
          const antBox = {
            x: pose.x - 45 * ant.scale,
            y: pose.y - 58 * ant.scale,
            width: 92 * ant.scale,
            height: 68 * ant.scale
          };
          if (this.boxIntersect(hb, antBox)) {
            targetAnt = ant;
            enemyHitbox = antBox;
            break;
          }
        }
      } else {
        enemyHitbox = {
          x: e.x - e.size.width * 0.4,
          y: e.y - e.size.height,
          width: e.size.width * 0.8,
          height: e.size.height
        };
      }

      if (enemyHitbox && this.boxIntersect(hb, enemyHitbox)) {
        p.activeHitbox.hasHit = true;

        // Damage calculation
        let damage = Math.max(2, hb.damage - e.defense);
        if (e.actionState === 'leaf_shield') damage = Math.floor(damage * 0.25); // leaf shield defense

        const hitX = targetAnt ? this.getAntWorldPose(targetAnt).x : e.x;
        const hitY = targetAnt ? this.getAntWorldPose(targetAnt).y : e.y;
        if (targetAnt) {
          targetAnt.hp = Math.max(0, targetAnt.hp - damage);
          if (targetAnt.hp <= 0) {
            targetAnt.alive = false;
            targetAnt.emergeProgress = 1;
            targetAnt.walkOffset = 0;
            if (e.attackingAntId === targetAnt.id) {
              e.attackingAntId = null;
              e.activeHitbox = null;
            }
          }
          this.syncAntColonyHealth();
        } else {
          e.hp = Math.max(0, e.hp - damage);
        }

        // Feedback
        this.renderer.triggerShake(5);
        if (hb.type === 'pounce') {
          // Mantis Ambush Pounce & Mandible Bite!
          this.renderer.addDamageText(`-${damage} BITE!`, hitX, hitY - 45, this.player.palette.highlight);
          this.renderer.addBiteFX(hitX, hitY - 35, this.player.palette.highlight);
          window.soundEngine.playMandibleBite();
        } else if (hb.type === 'slash' && p.comboCount === 3) {
          // Finisher Cross Cut with Mandible Snap
          this.renderer.addDamageText(`-${damage} CRUNCH!`, hitX, hitY - 45, '#ffffff');
          this.renderer.addBiteFX(hitX, hitY - 35, '#ffffff');
          window.soundEngine.playMandibleBite();
        } else {
          this.renderer.addDamageText(`-${damage}`, hitX, hitY - 40, '#ccff33');
          window.soundEngine.playHit();
        }
        this.renderer.addImpactSparks(hitX, hitY - 30, '#fff', 12);

        // Pushback
        e.vx = p.direction * 6;
      }
    }

    // 2. Enemy attack hitting Player
    if (e.activeHitbox && p.state !== 'dead') {
      const playerBox = {
        x: p.x - p.width * 0.35,
        y: p.y - p.height,
        width: p.width * 0.7,
        height: p.height
      };

      // The revised stinger bends around the hornet's own body and strikes forward,
      // so it uses the same facing direction as the head and mandible attacks.
      const attackingAnt = e.id === 'pharaoh_ants' && e.antUnits
        ? e.antUnits.find((ant) => ant.id === e.attackingAntId && ant.alive && ant.hp > 0)
        : null;
      const attackPose = attackingAnt ? this.getAntWorldPose(attackingAnt) : { x: e.x, y: e.y };
      const attackDirection = e.direction;
      const enemyAtkBox = {
        x: attackPose.x + (attackDirection === 1 ? 0 : -e.activeHitbox.width),
        y: attackPose.y - e.activeHitbox.height - 10,
        width: e.activeHitbox.width,
        height: e.activeHitbox.height
      };

      if (this.boxIntersect(enemyAtkBox, playerBox)) {
        const isBiteAtk = !!e.activeHitbox.isBite;
        const damageResult = p.takeDamage(e.activeHitbox.damage, attackPose.x, e.activeHitbox.isBlockable);

        if (damageResult === -1) {
          // Perfect Parry!
          this.renderer.addDamageText('PARRIED!', p.x, p.y - 60, '#00f5d4');
          this.renderer.addImpactSparks(p.x + p.direction * 30, p.y - 50, '#00f5d4', 20);
          this.renderer.triggerShake(7);

          // Stun the enemy!
          e.isStunned = true;
          e.stunTimer = 65; // ~1.1s stun window
          e.actionState = 'stunned';
          e.activeHitbox = null;
          e.vx = -e.direction * 8;
        } else if (damageResult > 0) {
          // Regular hit took damage
          if (isBiteAtk) {
            this.renderer.addDamageText(`-${damageResult} BITE!`, p.x, p.y - 45, '#e63946');
            this.renderer.addBiteFX(p.x, p.y - 40, '#ff3366');
            window.soundEngine.playMandibleBite();
          } else {
            this.renderer.addDamageText(`-${damageResult}`, p.x, p.y - 40, '#e63946');
          }
          this.renderer.addImpactSparks(p.x, p.y - 40, '#e63946', 10);
          this.renderer.triggerShake(8);
          e.activeHitbox = null; // consume hit
        }
      }
    }
  }

  boxIntersect(r1, r2) {
    return !(
      r2.x > r1.x + r1.width ||
      r2.x + r2.width < r1.x ||
      r2.y > r1.y + r1.height ||
      r2.y + r2.height < r1.y
    );
  }

  // --- Rendering pipeline ---
  render() {
    this.ctx.save();

    // Apply Screen Shake
    if (this.renderer.screenShake > 0) {
      const dx = (Math.random() - 0.5) * this.renderer.screenShake;
      const dy = (Math.random() - 0.5) * this.renderer.screenShake;
      this.ctx.translate(dx, dy);
    }

    // 1. Draw Biome Background & Particles
    this.stageManager.draw(this.ctx);

    // 2. Draw Creature Boss
    if (this.enemy) {
      this.renderer.drawCreature(this.ctx, this.enemy);
    }

    // 3. Draw Mantis Player
    this.renderer.drawMantis(this.ctx, this.player);

    // 4. Draw Combat FX & Floating Damage
    this.renderer.drawFX(this.ctx);

    this.ctx.restore();
  }

  // --- HUD Updates (dirty-checked — only writes DOM on actual value change) ---
  updateHUD() {
    const d = this.dom;
    const h = this._hud;

    // Mantis HP (quantize to 1 decimal to avoid per-pixel updates)
    const mantisHpRnd = Math.ceil(this.player.hp);
    if (mantisHpRnd !== h.mantisHp) {
      h.mantisHp = mantisHpRnd;
      const pct = Math.max(0, (this.player.hp / this.player.maxHp) * 100).toFixed(2);
      d.mantisHpFill.style.width = `${pct}%`;
      d.mantisHpBg.style.width   = `${pct}%`;
      d.mantisHpText.textContent = `${mantisHpRnd} / ${this.player.maxHp}`;
    }

    // Enemy HP & Info
    if (this.enemy) {
      const enemyHpRnd = Math.ceil(this.enemy.hp);
      if (enemyHpRnd !== h.enemyHp) {
        h.enemyHp = enemyHpRnd;
        const ePct = Math.max(0, (this.enemy.hp / this.enemy.maxHp) * 100).toFixed(2);
        d.enemyHpFill.style.width = `${ePct}%`;
        d.enemyHpBg.style.width   = `${ePct}%`;
        d.enemyHpText.textContent = `${enemyHpRnd} / ${this.enemy.maxHp}`;
      }
      // Enemy name/avatar only updates on stage change (handled in setupStage via h.stageIdx guard below)
    }

    // Stage badge & enemy info — only on stage change or lang change
    if (this.currentStageIndex !== h.stageIdx) {
      h.stageIdx = this.currentStageIndex;
      d.stageBadge.textContent = I18N.t('stage_badge', { current: this.currentStageIndex + 1, total: 8 });
      if (d.mantisName) {
        d.mantisName.textContent = I18N.t('mantis_name');
      }
      if (this.enemy) {
        d.enemyName.textContent      = I18N.getCreatureName(this.enemy);
        d.enemyScientific.textContent = this.enemy.scientificName;
        d.enemyAvatar.textContent    = this.enemy.avatar;
      }
    }
  }

  // --- Victory & Defeat Handlers ---
  handleVictory() {
    this.gameState = 'victory';
    if (this.timerInterval) clearInterval(this.timerInterval);
    window.soundEngine.playVictory();
    // A win unlocks only the next, harder tour.
    this.unlockStage(this.currentStageIndex + 1);

    if (this.currentStageIndex >= CREATURE_DATABASE.length - 1) {
      // Beat Final Boss (Garter Snake)!
      document.getElementById('overlay-campaign-clear').classList.remove('hidden');
    } else {
      // Stage Victory
      const vOverlay = document.getElementById('overlay-victory');
      document.getElementById('victory-stage-text').textContent = 
        I18N.t('victory_defeated', { creature: I18N.getCreatureName(this.currentCreature) });
      document.getElementById('victory-bio-card').innerHTML = `
        <strong>${I18N.t('bio_card_heading')}</strong> ${I18N.getCreatureLore(this.currentCreature)}
      `;
      vOverlay.classList.remove('hidden');
    }
  }

  handleDefeat(playSound = true) {
    this.gameState = 'defeat';
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (playSound) window.soundEngine.playDefeat();

    const dOverlay = document.getElementById('overlay-defeat');
    document.getElementById('defeat-stage-text').textContent = 
      I18N.t('defeat_sub', { creature: I18N.getCreatureName(this.currentCreature) });
    document.getElementById('defeat-tip-card').innerHTML = `
      <strong>${I18N.t('tip_card_heading')}</strong> ${I18N.getCreatureTip(this.currentCreature)}
    `;
    dOverlay.classList.remove('hidden');
  }

  // --- UI and Modal Binding ---
  initUI() {
    // Populate Color Palette picker in settings
    this.renderColorPalettes();

    // Language Toggle Buttons in Settings
    const btnLangEn = document.getElementById('btn-lang-en');
    const btnLangKa = document.getElementById('btn-lang-ka');
    if (btnLangEn) {
      btnLangEn.addEventListener('click', () => I18N.setLanguage('en'));
    }
    if (btnLangKa) {
      btnLangKa.addEventListener('click', () => I18N.setLanguage('ka'));
    }

    // Populate the stage selector in the main menu.
    const stageContainer = document.getElementById('stage-select-container');
    stageContainer.innerHTML = '';
    CREATURE_DATABASE.forEach((c, idx) => {
      const btn = document.createElement('button');
      btn.className = 'stage-select-btn';
      btn.dataset.index = idx;
      btn.addEventListener('click', () => {
        if (idx > this.unlockedStageIndex) return;
        this.setupStage(idx);
        document.getElementById('overlay-start').classList.add('hidden');
        this.startRound();
      });
      stageContainer.appendChild(btn);
    });
    this.updateStageSelector();

    // Start Button
    // Audio starts from a menu interaction so browser autoplay rules are respected.
    document.getElementById('overlay-start').addEventListener('pointerdown', () => {
      if (this.gameState === 'start') window.soundEngine.startMenuMusic();
    }, { passive: true });
    document.getElementById('btn-start-game').addEventListener('click', () => {
      document.getElementById('overlay-start').classList.add('hidden');
      this.startRound();
    });

    // Return to the main menu during a fight
    document.getElementById('btn-main-menu').addEventListener('click', () => {
      this.returnToMainMenu();
    });

    // Epilogue from the main menu
    document.getElementById('btn-open-epilogue').addEventListener('click', () => {
      const credits = document.getElementById('epilogue-credits');
      window.soundEngine.stopMenuMusic();
      window.soundEngine.stopBGM();
      document.getElementById('overlay-start').classList.add('hidden');
      document.getElementById('overlay-epilogue').classList.remove('hidden');
      credits.classList.remove('playing');
      void credits.offsetWidth;
      credits.classList.add('playing');
      window.soundEngine.startEpilogueMusic();
    });
    document.getElementById('btn-close-epilogue').addEventListener('click', () => {
      window.soundEngine.stopEpilogueMusic();
      document.getElementById('epilogue-credits').classList.remove('playing');
      document.getElementById('overlay-epilogue').classList.add('hidden');
      document.getElementById('overlay-start').classList.remove('hidden');
      window.soundEngine.startMenuMusic();
    });

    // Open Settings from start
    document.getElementById('btn-open-settings-start').addEventListener('click', () => {
      document.getElementById('overlay-settings').classList.remove('hidden');
    });

    // Floating HUD Settings Button
    document.getElementById('btn-settings').addEventListener('click', () => {
      this.toggleSettingsOverlay();
    });

    // Close Settings
    document.getElementById('btn-close-settings').addEventListener('click', () => {
      this.closeSettingsOverlay();
    });

    // Sound Toggles inside Settings Modal
    const sfxBtn = document.getElementById('toggle-sfx-btn');
    sfxBtn.addEventListener('click', () => {
      window.soundEngine.sfxEnabled = !window.soundEngine.sfxEnabled;
      sfxBtn.textContent = window.soundEngine.sfxEnabled ? I18N.t('sfx_label_on') : I18N.t('sfx_label_off');
    });
    const bgmBtn = document.getElementById('toggle-bgm-btn');
    bgmBtn.addEventListener('click', () => {
      const eng = window.soundEngine;
      eng.bgmEnabled = !eng.bgmEnabled;
      if (!eng.bgmEnabled) {
        eng.stopBGM();
        eng.stopMenuMusic();
        eng.stopEpilogueMusic();
      } else {
        this.resumeActiveMusic();
      }
      bgmBtn.textContent = eng.bgmEnabled ? I18N.t('bgm_label_on') : I18N.t('bgm_label_off');
    });

    // Victory Buttons
    document.getElementById('btn-next-stage').addEventListener('click', () => {
      document.getElementById('overlay-victory').classList.add('hidden');
      this.setupStage(this.currentStageIndex + 1);
      this.startRound();
    });
    document.getElementById('btn-replay-stage').addEventListener('click', () => {
      document.getElementById('overlay-victory').classList.add('hidden');
      this.setupStage(this.currentStageIndex);
      this.startRound();
    });

    // Defeat Buttons
    document.getElementById('btn-retry-stage').addEventListener('click', () => {
      document.getElementById('overlay-defeat').classList.add('hidden');
      this.setupStage(this.currentStageIndex);
      this.startRound();
    });
    document.getElementById('btn-settings-defeat').addEventListener('click', () => {
      document.getElementById('overlay-defeat').classList.add('hidden');
      document.getElementById('overlay-settings').classList.remove('hidden');
    });

    // Campaign Clear — Epilogue Button (primary)
    document.getElementById('btn-open-epilogue-clear').addEventListener('click', () => {
      const credits = document.getElementById('epilogue-credits');
      window.soundEngine.stopMenuMusic();
      window.soundEngine.stopBGM();
      document.getElementById('overlay-campaign-clear').classList.add('hidden');
      document.getElementById('overlay-epilogue').classList.remove('hidden');
      credits.classList.remove('playing');
      void credits.offsetWidth;
      credits.classList.add('playing');
      window.soundEngine.startEpilogueMusic();
    });

    // Restart the campaign from the first tour after the final victory.
    document.getElementById('btn-restart-campaign').addEventListener('click', () => {
      document.getElementById('overlay-campaign-clear').classList.add('hidden');
      this.setupStage(0);
      this.startRound();
    });
  }

  highlightActiveStageBtn() {
    document.querySelectorAll('.stage-select-btn').forEach((btn, idx) => {
      if (idx === this.currentStageIndex) {
        btn.classList.add('current');
      } else {
        btn.classList.remove('current');
      }
    });
  }


  renderColorPalettes() {
    const colorContainer = document.getElementById('color-palette-container');
    if (!colorContainer) return;
    colorContainer.innerHTML = '';
    Object.values(MANTIS_PALETTES).forEach(palette => {
      const btn = document.createElement('button');
      btn.className = `color-option-btn ${palette.id === this.player.palette.id ? 'active' : ''}`;
      btn.dataset.id = palette.id;
      const paletteName = I18N.getPaletteName(palette);
      btn.innerHTML = `
        <div class="color-sample-circle" style="background: ${palette.primary}; border-color: ${palette.secondary}"></div>
        <span class="color-name-text">${paletteName}</span>
      `;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.color-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.player.setPalette(palette.id);
      });
      colorContainer.appendChild(btn);
    });
  }

  applyLanguage() {
    const lang = I18N.current;

    // Language buttons active state
    const btnEn = document.getElementById('btn-lang-en');
    const btnKa = document.getElementById('btn-lang-ka');
    if (btnEn && btnKa) {
      btnEn.classList.toggle('active', lang === 'en');
      btnKa.classList.toggle('active', lang === 'ka');
    }

    // Controls hint
    const hintMove = document.getElementById('hint-move');
    const hintJump = document.getElementById('hint-jump');
    const hintSlash = document.getElementById('hint-slash');
    const hintPounce = document.getElementById('hint-pounce');
    const hintBlock = document.getElementById('hint-block');
    if (hintMove) hintMove.innerHTML = `<span class="key-tag">A / D</span> ${I18N.t('controls_move')}`;
    if (hintJump) hintJump.innerHTML = `<span class="key-tag">W / Space</span> ${I18N.t('controls_jump')}`;
    if (hintSlash) hintSlash.innerHTML = `<span class="key-tag">J / L-Click</span> ${I18N.t('controls_slash')}`;
    if (hintPounce) hintPounce.innerHTML = `<span class="key-tag">K / R-Click</span> ${I18N.t('controls_pounce')}`;
    if (hintBlock) hintBlock.innerHTML = `<span class="key-tag">L / Shift</span> ${I18N.t('controls_block')}`;

    // HUD buttons
    const btnSettings = document.getElementById('btn-settings');
    const btnMenu = document.getElementById('btn-main-menu');
    if (btnSettings) {
      btnSettings.textContent = I18N.t('btn_settings');
      btnSettings.title = I18N.t('btn_settings_title');
    }
    if (btnMenu) {
      btnMenu.textContent = I18N.t('btn_menu');
      btnMenu.title = I18N.t('btn_menu_title');
    }

    // Start Screen
    const startHero = document.getElementById('start-title-hero');
    const startSub = document.getElementById('start-subtitle');
    const startIntro = document.getElementById('start-intro');
    const btnStartGame = document.getElementById('btn-start-game');
    const labelStages = document.getElementById('label-stages-section');
    const btnOpenEpilogue = document.getElementById('btn-open-epilogue');
    const btnOpenSettingsStart = document.getElementById('btn-open-settings-start');
    if (startHero) startHero.textContent = I18N.t('mantis_hero_title');
    if (startSub) startSub.textContent = I18N.t('game_subtitle');
    if (startIntro) startIntro.textContent = I18N.t('start_intro');
    if (btnStartGame) btnStartGame.textContent = I18N.t('btn_start');
    if (labelStages) labelStages.textContent = I18N.t('stages_label');
    if (btnOpenEpilogue) btnOpenEpilogue.textContent = I18N.t('btn_epilogue');
    if (btnOpenSettingsStart) btnOpenSettingsStart.textContent = I18N.t('btn_settings_start');

    // Settings Modal
    const settingsTitle = document.getElementById('settings-title');
    const settingsSub = document.getElementById('settings-subtitle');
    const labelLang = document.getElementById('label-settings-lang');
    const labelColor = document.getElementById('label-settings-color');
    const labelAudio = document.getElementById('label-settings-audio');
    const sfxBtn = document.getElementById('toggle-sfx-btn');
    const bgmBtn = document.getElementById('toggle-bgm-btn');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    if (settingsTitle) settingsTitle.textContent = I18N.t('settings_title');
    if (settingsSub) settingsSub.textContent = I18N.t('settings_subtitle');
    if (labelLang) labelLang.textContent = I18N.t('settings_lang_label');
    if (labelColor) labelColor.textContent = I18N.t('settings_color_label');
    if (labelAudio) labelAudio.textContent = I18N.t('settings_audio_label');
    if (sfxBtn) sfxBtn.textContent = window.soundEngine && window.soundEngine.sfxEnabled ? I18N.t('sfx_label_on') : I18N.t('sfx_label_off');
    if (bgmBtn) bgmBtn.textContent = window.soundEngine && window.soundEngine.bgmEnabled ? I18N.t('bgm_label_on') : I18N.t('bgm_label_off');
    if (btnCloseSettings) btnCloseSettings.textContent = I18N.t('btn_save_settings');

    // Epilogue Modal
    const epilogueTitle = document.getElementById('epilogue-title');
    const epilogueCredits = document.getElementById('epilogue-credits');
    const btnCloseEpilogue = document.getElementById('btn-close-epilogue');
    if (epilogueTitle) epilogueTitle.textContent = I18N.t('epilogue_title');
    if (btnCloseEpilogue) btnCloseEpilogue.textContent = I18N.t('btn_close_epilogue');
    if (epilogueCredits) {
      epilogueCredits.innerHTML = `
        <p class="epilogue-kicker">${I18N.t('epilogue_kicker')}</p>
        <p>${I18N.t('epilogue_p1')}</p>
        <p>${I18N.t('epilogue_p2')}</p>
        <p>${I18N.t('epilogue_p3')}</p>
        <p class="epilogue-credit-heading">${I18N.t('epilogue_heading_starring')}</p>
        <p class="epilogue-credit-name">${I18N.t('epilogue_name_mantis')}</p>
        <p class="epilogue-credit-heading">${I18N.t('epilogue_heading_dwellers')}</p>
        <p class="epilogue-credit-name">${I18N.t('epilogue_name_dwellers')}</p>
        <p class="epilogue-final-line">${I18N.t('epilogue_final_line')}</p>
        <p class="epilogue-the-end">${I18N.t('epilogue_the_end')}</p>
      `;
    }

    // Victory Modal
    const victoryTitle = document.getElementById('victory-title');
    const btnNextStage = document.getElementById('btn-next-stage');
    const btnReplayStage = document.getElementById('btn-replay-stage');
    if (victoryTitle) victoryTitle.textContent = I18N.t('victory_title');
    if (btnNextStage) btnNextStage.textContent = I18N.t('btn_next_stage');
    if (btnReplayStage) btnReplayStage.textContent = I18N.t('btn_replay_stage');
    if (this.currentCreature) {
      const vText = document.getElementById('victory-stage-text');
      const vCard = document.getElementById('victory-bio-card');
      if (vText) vText.textContent = I18N.t('victory_defeated', { creature: I18N.getCreatureName(this.currentCreature) });
      if (vCard) vCard.innerHTML = `<strong>${I18N.t('bio_card_heading')}</strong> ${I18N.getCreatureLore(this.currentCreature)}`;
    }

    // Defeat Modal
    const defeatTitle = document.getElementById('defeat-title');
    const btnRetryStage = document.getElementById('btn-retry-stage');
    const btnSettingsDefeat = document.getElementById('btn-settings-defeat');
    if (defeatTitle) defeatTitle.textContent = I18N.t('defeat_title');
    if (btnRetryStage) btnRetryStage.textContent = I18N.t('btn_retry');
    if (btnSettingsDefeat) btnSettingsDefeat.textContent = I18N.t('btn_settings_title');
    if (this.currentCreature) {
      const dText = document.getElementById('defeat-stage-text');
      const dCard = document.getElementById('defeat-tip-card');
      if (dText) dText.textContent = I18N.t('defeat_sub', { creature: I18N.getCreatureName(this.currentCreature) });
      if (dCard) dCard.innerHTML = `<strong>${I18N.t('tip_card_heading')}</strong> ${I18N.getCreatureTip(this.currentCreature)}`;
    }

    // Campaign Clear Modal
    const clearTitle = document.getElementById('clear-title');
    const clearSub = document.getElementById('clear-subtitle');
    const clearHeading = document.getElementById('clear-card-heading');
    const clearBody = document.getElementById('clear-card-body');
    const btnEpilogueClear = document.getElementById('btn-open-epilogue-clear');
    const btnRestartCampaign = document.getElementById('btn-restart-campaign');
    if (clearTitle) clearTitle.textContent = I18N.t('clear_title');
    if (clearSub) clearSub.textContent = I18N.t('clear_subtitle');
    if (clearHeading) clearHeading.textContent = I18N.t('clear_card_heading');
    if (clearBody) clearBody.textContent = I18N.t('clear_card_body');
    if (btnEpilogueClear) btnEpilogueClear.textContent = I18N.t('btn_epilogue');
    if (btnRestartCampaign) btnRestartCampaign.textContent = I18N.t('btn_play_again');

    // Re-populate palette buttons and stages
    this.renderColorPalettes();
    this.updateStageSelector();

    // Invalidate HUD cache to force re-render
    if (this._hud) {
      this._hud.stageIdx = -1;
    }
    this.updateHUD();
    this.scheduleOverlayFit();
  }

  // --- Keyboard & Touch Input Event Listeners ---
  bindInputs() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
          this.input.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.input.right = true;
          break;
        case 'KeyW':
        case 'ArrowUp':
        case 'Space':
          this.input.jump = true;
          break;
        case 'KeyJ':
        case 'KeyZ':
          this.input.slash = true;
          break;
        case 'KeyK':
        case 'KeyX':
          this.input.pounce = true;
          break;
        case 'KeyL':
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyC':
          this.input.block = true;
          break;
        case 'Escape':
          this.toggleSettingsOverlay();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
          this.input.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.input.right = false;
          break;
        case 'KeyW':
        case 'ArrowUp':
        case 'Space':
          this.input.jump = false;
          break;
        case 'KeyJ':
        case 'KeyZ':
          this.input.slash = false;
          break;
        case 'KeyK':
        case 'KeyX':
          this.input.pounce = false;
          break;
        case 'KeyL':
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyC':
          this.input.block = false;
          break;
      }
    });

    // Mouse Clicks on Canvas
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.input.slash = true;
      } else if (e.button === 2) {
        this.input.pounce = true;
      }
    });
    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.input.slash = false;
      if (e.button === 2) this.input.pounce = false;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Virtual Touch Buttons
    const bindTouch = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => { e.preventDefault(); this.input[key] = true; });
      el.addEventListener('touchend', (e) => { e.preventDefault(); this.input[key] = false; });
    };

    bindTouch('btn-touch-left', 'left');
    bindTouch('btn-touch-right', 'right');
    bindTouch('btn-touch-jump', 'jump');
    bindTouch('btn-touch-slash', 'slash');
    bindTouch('btn-touch-pounce', 'pounce');
    bindTouch('btn-touch-block', 'block');
  }
}

// Start Game instance on load
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
