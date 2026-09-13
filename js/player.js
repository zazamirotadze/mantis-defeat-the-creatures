// ==========================================
// Mantis Player Class & Color Palettes
// ==========================================

const MANTIS_PALETTES = {
  green: {
    id: 'green',
    name: 'Classic Green',
    nameEn: 'Classic Green',
    nameKa: 'კლასიკური მწვანე',
    primary: '#38b000',
    secondary: '#70e000',
    highlight: '#ccff33',
    dark: '#004b23',
    eyes: '#e01e37',
    glow: 'rgba(56, 176, 0, 0.4)'
  },
  orchid: {
    id: 'orchid',
    name: 'Orchid Pink',
    nameEn: 'Orchid Pink',
    nameKa: 'ორქიდეის ვარდისფერი',
    primary: '#f72585',
    secondary: '#ff70a6',
    highlight: '#ffffff',
    dark: '#7209b7',
    eyes: '#4cc9f0',
    glow: 'rgba(247, 37, 133, 0.4)'
  },
  dead_leaf: {
    id: 'dead_leaf',
    name: 'Dead Leaf Brown',
    nameEn: 'Dead Leaf Brown',
    nameKa: 'ხმელი ფოთოლი',
    primary: '#7f4f24',
    secondary: '#a68a64',
    highlight: '#d4a373',
    dark: '#43281c',
    eyes: '#f4a261',
    glow: 'rgba(127, 79, 36, 0.4)'
  },
  gold: {
    id: 'gold',
    name: 'Golden Sunburst',
    nameEn: 'Golden Sunburst',
    nameKa: 'ოქროსფერი მზე',
    primary: '#e09f3e',
    secondary: '#fff3b0',
    highlight: '#ffffff',
    dark: '#540b0e',
    eyes: '#9e2a2b',
    glow: 'rgba(224, 159, 62, 0.4)'
  },
  ghost: {
    id: 'ghost',
    name: 'Ghost Jade',
    nameEn: 'Ghost Jade',
    nameKa: 'მოჩვენება ნეფრიტი',
    primary: '#52b788',
    secondary: '#d8f3dc',
    highlight: '#ffffff',
    dark: '#1b4332',
    eyes: '#e76f51',
    glow: 'rgba(82, 183, 136, 0.4)'
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Obsidian',
    nameEn: 'Cyber Obsidian',
    nameKa: 'კიბერ ნეონი',
    primary: '#00f5d4',
    secondary: '#7b2cbf',
    highlight: '#f72585',
    dark: '#10002b',
    eyes: '#fee440',
    glow: 'rgba(0, 245, 212, 0.4)'
  }
};

class PlayerMantis {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = 560;

    this.palette = MANTIS_PALETTES.green;
    this.reset(180, this.groundY);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 90;
    this.height = 95;
    this.direction = 1; // 1 = right, -1 = left

    this.maxHp = 100;
    this.hp = this.maxHp;

    this.state = 'idle'; // idle, walk, jump, slash1, slash2, slash3, pounce, parry, hit, dead
    this.stateTimer = 0;
    this.isGrounded = true;
    this.isBlocking = false;
    this.comboCount = 0;
    this.comboResetTimer = 0;
    this.attackCooldown = 0;
    this.invulnerableTimer = 0;

    // Animation frame helpers
    this.animTime = 0;
    this.scytheAngleL = 0;
    this.scytheAngleR = 0;
    this.legCycle = 0;

    // Active attack hitbox info
    this.activeHitbox = null;
  }

  setPalette(paletteId) {
    if (MANTIS_PALETTES[paletteId]) {
      this.palette = MANTIS_PALETTES[paletteId];
      // Update CSS root variables for Mantis color
      document.documentElement.style.setProperty('--mantis-primary', this.palette.primary);
      document.documentElement.style.setProperty('--mantis-secondary', this.palette.secondary);
      document.documentElement.style.setProperty('--mantis-glow', this.palette.glow);
    }
  }

  update(input, enemy) {
    this.animTime += 0.05;
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;
    if (this.comboResetTimer > 0) {
      this.comboResetTimer--;
      if (this.comboResetTimer <= 0) this.comboCount = 0;
    }
    if (this.attackCooldown > 0) this.attackCooldown--;

    // Gravity
    if (!this.isGrounded) {
      this.vy += 0.85;
      this.y += this.vy;
      if (this.y >= this.groundY) {
        this.y = this.groundY;
        this.vy = 0;
        this.isGrounded = true;
        if (this.state === 'jump') this.state = 'idle';
      }
    }

    // Apply horizontal velocity
    this.x += this.vx;
    this.vx *= 0.82; // ground friction

    // Arena boundary clamps
    const minX = 60;
    const maxX = this.canvasWidth - 60;
    if (this.x < minX) this.x = minX;
    if (this.x > maxX) this.x = maxX;

    // Face the enemy when not in locked attack animation
    if (!['slash1', 'slash2', 'slash3', 'pounce', 'hit', 'dead'].includes(this.state)) {
      if (enemy) {
        this.direction = enemy.x > this.x ? 1 : -1;
      }
    }

    // Process State Machine & Actions
    if (this.state === 'hit') {
      this.stateTimer--;
      if (this.stateTimer <= 0) this.state = 'idle';
      return;
    }

    if (this.state === 'dead') {
      return;
    }

    if (this.state === 'parry') {
      this.stateTimer--;
      this.isBlocking = true;
      if (!input.block || this.stateTimer <= 0) {
        this.state = 'idle';
        this.isBlocking = false;
      }
      return;
    } else {
      this.isBlocking = false;
    }

    // Attack state update
    if (['slash1', 'slash2', 'slash3', 'pounce'].includes(this.state)) {
      this.stateTimer--;
      this.updateAttackHitbox();
      if (this.stateTimer <= 0) {
        this.activeHitbox = null;
        this.state = this.isGrounded ? 'idle' : 'jump';
      }
      return;
    }

    // Movement & Combat Inputs
    const walkSpeed = 5.2;

    // 1. Parry / Block (L or Shift)
    if (input.block && this.isGrounded) {
      this.state = 'parry';
      this.stateTimer = 45;
      this.vx = 0;
      return;
    }

    // 2. Ambush Pounce (K / Right Click)
    if (input.pounce && this.attackCooldown <= 0) {
      this.state = 'pounce';
      this.stateTimer = 28;
      this.attackCooldown = 32;
      this.vx = this.direction * 12; // burst lunge
      if (this.isGrounded) {
        this.vy = -5;
        this.isGrounded = false;
      }
      window.soundEngine.playHeavySlash();
      this.activeHitbox = {
        damage: 24,
        x: this.x + this.direction * 30,
        y: this.y - 30,
        width: 80,
        height: 60,
        type: 'pounce',
        hasHit: false
      };
      return;
    }

    // 4. Raptor Slash Combo (J / Left Click)
    if (input.slash && this.attackCooldown <= 0) {
      this.comboCount = (this.comboCount % 3) + 1;
      this.comboResetTimer = 50;

      if (this.comboCount === 1) {
        this.state = 'slash1';
        this.stateTimer = 18;
        this.attackCooldown = 16;
        this.vx = this.direction * 4;
        window.soundEngine.playSlash();
        this.activeHitbox = {
          damage: 12,
          x: this.x + this.direction * 40,
          y: this.y - 35,
          width: 70,
          height: 50,
          type: 'slash',
          hasHit: false
        };
      } else if (this.comboCount === 2) {
        this.state = 'slash2';
        this.stateTimer = 18;
        this.attackCooldown = 16;
        this.vx = this.direction * 5;
        window.soundEngine.playSlash();
        this.activeHitbox = {
          damage: 15,
          x: this.x + this.direction * 45,
          y: this.y - 45,
          width: 75,
          height: 55,
          type: 'slash',
          hasHit: false
        };
      } else {
        // Combo finisher: Dual Cross Cut
        this.state = 'slash3';
        this.stateTimer = 24;
        this.attackCooldown = 26;
        this.vx = this.direction * 7;
        window.soundEngine.playHeavySlash();
        this.activeHitbox = {
          damage: 22,
          x: this.x + this.direction * 55,
          y: this.y - 40,
          width: 90,
          height: 60,
          type: 'slash',
          hasHit: false
        };
      }
      return;
    }

    // 5. Jump (W / Space)
    if (input.jump && this.isGrounded) {
      this.vy = -17;
      this.isGrounded = false;
      this.state = 'jump';
      window.soundEngine.playJump();
    }

    // 6. Walking Left / Right
    if (input.left) {
      this.vx = -walkSpeed;
      if (this.isGrounded && this.state !== 'jump') this.state = 'walk';
      this.legCycle += 0.2;
    } else if (input.right) {
      this.vx = walkSpeed;
      if (this.isGrounded && this.state !== 'jump') this.state = 'walk';
      this.legCycle += 0.2;
    } else if (this.isGrounded && this.state !== 'jump') {
      this.state = 'idle';
    }
  }

  updateAttackHitbox() {
    if (!this.activeHitbox) return;
    if (this.state === 'pounce') {
      this.activeHitbox.x = this.x + (this.direction === 1 ? 10 : -90);
      this.activeHitbox.y = this.y - 50;
    } else {
      this.activeHitbox.x = this.x + (this.direction === 1 ? 20 : -90);
      this.activeHitbox.y = this.y - 60;
    }
  }

  takeDamage(amount, fromX = 0, isBlockable = true) {
    if (this.invulnerableTimer > 0 || this.state === 'dead') return 0;

    // Check Parry / Guard
    const facingEnemy = (this.direction === 1 && fromX >= this.x) || (this.direction === -1 && fromX <= this.x);
    if (this.isBlocking && isBlockable && facingEnemy) {
      // Perfect parry!
      window.soundEngine.playParry();
      this.invulnerableTimer = 15;
      return -1; // -1 indicates parry successful
    }

    // Regular damage taken
    const actualDamage = Math.max(1, amount);
    this.hp -= actualDamage;
    window.soundEngine.playHit();

    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dead';
      window.soundEngine.playDefeat();
    } else {
      this.state = 'hit';
      this.stateTimer = 16;
      this.invulnerableTimer = 30;
      this.vx = (fromX > this.x ? -1 : 1) * 6; // knockback
    }

    return actualDamage;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MANTIS_PALETTES, PlayerMantis };
}
