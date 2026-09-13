// ==========================================
// High-Detail Anatomical Creature & Mantis Renderer
// Realistic vector biology, chitin textures & FX
// ==========================================

class GameRenderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.damageTexts = [];
    this.effects = [];
    this.screenShake = 0;
  }

  triggerShake(intensity = 8) {
    this.screenShake = intensity;
  }

  addDamageText(text, x, y, color = '#ffbe0b') {
    this.damageTexts.push({
      text,
      x: x + (Math.random() - 0.5) * 25,
      y: y - 25,
      vy: -2.4,
      alpha: 1.0,
      color
    });
  }

  addImpactSparks(x, y, color = '#fff', count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      this.effects.push({
        type: 'spark',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3.5 + 1.5,
        life: 16, maxLife: 16
      });
    }
  }

  addSonicRing(x, y, radius, color = 'rgba(112, 224, 0, 0.8)') {
    this.effects.push({
      type: 'ring',
      x, y,
      radius,
      dr: 8,
      color,
      life: 22, maxLife: 22
    });
  }

  addBiteFX(x, y, color = '#ffbe0b') {
    this.effects.push({
      type: 'bite',
      x, y,
      color,
      life: 14,
      maxLife: 14
    });
  }

  updateFX() {
    if (this.screenShake > 0) this.screenShake *= 0.86;
    if (this.screenShake < 0.2) this.screenShake = 0;

    // Damage numbers
    this.damageTexts.forEach(d => {
      d.y += d.vy;
      d.alpha -= 0.025;
    });
    this.damageTexts = this.damageTexts.filter(d => d.alpha > 0);

    // Visual effects
    this.effects.forEach(e => {
      e.life--;
      if (e.type === 'spark') {
        e.x += e.vx;
        e.y += e.vy;
        e.vy += 0.28; // gravity
      } else if (e.type === 'ring') {
        e.radius += e.dr;
      }
    });
    this.effects = this.effects.filter(e => e.life > 0);
  }

  drawFX(ctx) {
    this.effects.forEach(e => {
      const prog = e.life / e.maxLife;
      ctx.save();
      if (e.type === 'spark') {
        ctx.fillStyle = e.color;
        ctx.globalAlpha = prog;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * prog, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'ring') {
        ctx.strokeStyle = e.color;
        ctx.globalAlpha = prog;
        ctx.lineWidth = 4 * prog;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === 'bite') {
        // Dynamic mandible clamp animation (upper and lower jaws crunching shut)
        const clamp = (1 - prog) * 16;
        ctx.strokeStyle = e.color;
        ctx.fillStyle = e.color;
        ctx.lineWidth = 3.5 * prog;
        ctx.globalAlpha = prog;

        // Upper jaw arc
        ctx.beginPath();
        ctx.arc(e.x, e.y - 16 + clamp, 22, -Math.PI * 0.85, -Math.PI * 0.15);
        ctx.stroke();
        // Upper sharp teeth
        for (let t = -3; t <= 3; t++) {
          const ang = -Math.PI * 0.5 + t * 0.22;
          const bx = e.x + Math.cos(ang) * 22;
          const by = e.y - 16 + clamp + Math.sin(ang) * 22;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(ang) * 7, by + Math.sin(ang) * 7);
          ctx.stroke();
        }

        // Lower jaw arc
        ctx.beginPath();
        ctx.arc(e.x, e.y + 16 - clamp, 22, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        // Lower sharp teeth
        for (let t = -3; t <= 3; t++) {
          const ang = Math.PI * 0.5 + t * 0.22;
          const bx = e.x + Math.cos(ang) * 22;
          const by = e.y + 16 - clamp + Math.sin(ang) * 22;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(ang) * 7, by + Math.sin(ang) * 7);
          ctx.stroke();
        }
      }
      ctx.restore();
    });

    this.damageTexts.forEach(d => {
      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.font = '900 24px Orbitron, sans-serif';
      ctx.fillStyle = d.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(d.text, d.x, d.y);
      ctx.fillText(d.text, d.x, d.y);
      ctx.restore();
    });
  }

  // Shared gait clock for enemy anatomy. Every legged creature uses the same
  // movement signal, but each renderer scales it to its own body plan. This
  // keeps limbs alive while walking, hopping, attacking, or airborne instead
  // of leaving them frozen while only the torso moves.
  getCreatureLegMotion(enemy, idleRate = 3, activeRate = 12) {
    const time = enemy.animTime || 0;
    const isDead = enemy.isDead || enemy.actionState === 'dead';
    if (isDead) {
      // Dead legs stop cycling and stay slightly splayed instead of holding
      // the precise, alert stance used by a living creature.
      return {
        time,
        walking: false,
        airborne: false,
        stride: -0.28,
        oppositeStride: 0.24,
        lift: 0,
        jumpProgress: 0,
        jumpExtension: 0
      };
    }
    const walking = enemy.isGrounded
      && Math.abs(enemy.vx || 0) > 0.25
      && ['idle', 'perched'].includes(enemy.actionState);
    const rate = walking ? activeRate : idleRate;
    const phase = time * rate;
    const verticalSpeed = enemy.vy || 0;
    const airborne = !enemy.isGrounded;
    const jumpProgress = airborne ? Math.max(0, Math.min(1, (verticalSpeed + 13) / 26)) : 0;
    // 1 = legs extended for push-off/landing, 0 = tucked at the apex.
    const jumpExtension = airborne
      ? (jumpProgress < 0.5 ? 1 - jumpProgress * 2 : (jumpProgress - 0.5) * 2)
      : 0;
    const movingAction = [
      'blue_flash_dash', 'red_wing_charge', 'swarm_rush', 'aerial_divebomb',
      'mandible_nip', 'mandible_crush', 'mandible_bite', 'mandible_decapitate'
    ].includes(enemy.actionState);
    const bracedAction = ['gravel_kick', 'sonic_stridulation', 'leaf_shield', 'tongue_grapple'].includes(enemy.actionState);
    const chargePose = Math.sign(enemy.vx || 1) * 0.55;
    const poseOffset = airborne
      ? jumpExtension - 0.5
      : (walking ? Math.sin(phase) : (movingAction ? chargePose : (bracedAction ? -0.2 : 0)));
    return {
      time,
      walking,
      airborne,
      stride: poseOffset,
      oppositeStride: airborne
        ? poseOffset
        : (walking ? Math.sin(phase + Math.PI) : (movingAction ? -chargePose : (bracedAction ? 0.16 : 0))),
      lift: walking ? Math.max(0, Math.sin(phase)) : 0,
      jumpProgress,
      jumpExtension
    };
  }

  // =========================================================================
  // 1. PRAYING MANTIS (Mantis religiosa / Hierodula) - ULTRA-DETAILED ANATOMY
  // =========================================================================
  drawMantis(ctx, player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.scale(player.direction, 1);

    const isDead = player.state === 'dead';
    const deathProgress = isDead
      ? Math.max(0, Math.min(1, player.deathProgress ?? 1))
      : 0;
    if (isDead) {
      const easedDeath = 1 - Math.pow(1 - deathProgress, 3);
      // Tip the mantis down onto the ground instead of leaving it in its
      // upright combat pose after the final hit.
      ctx.translate(0, (player.deathLift || 8) * easedDeath);
      ctx.rotate((player.deathRotation || 1.38) * easedDeath);
      // A corpse loses the bright, saturated living coloration and shine.
      ctx.filter = 'grayscale(0.82) saturate(0.35) brightness(0.72)';
      ctx.globalAlpha = 0.94;
    }

    const p = player.palette;
    const time = player.animTime;
    const isHit = player.state === 'hit';

    // Fast, lightweight hit feedback without expensive ctx.filter
    if (isHit && Math.floor(Date.now() / 40) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    }

    // Ground contact shadow with soft blur
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 52, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. Hind & Middle Walking Legs (4 multi-jointed cursorial legs)
    this.drawMantisWalkingLegs(ctx, player, p, time);

    // 2. Abdomen (10 overlapping segmented tergites with breathing & spiracles)
    this.drawMantisAbdomen(ctx, player, p, time);

    // 3. Wings (Leathery tegmina with reticulated venation + folded membranous wings)
    this.drawMantisWings(ctx, player, p, time);

    // 4. Prothorax / Pronotum (Elongated neck shield with lateral denticles)
    this.drawMantisPronotum(ctx, player, p, time);

    // 5. Head (Triangular, compound eyes with tracking pseudopupils, 3 ocelli, mandibles)
    this.drawMantisHead(ctx, player, p, time);

    // 6. Raptorial Forelegs ("Scythes") with discoidal & marginal spines, warning patch
    this.drawMantisRaptorialLegs(ctx, player, p, time);

    ctx.restore();
  }

  drawMantisWalkingLegs(ctx, player, p, time) {
    ctx.save();
    const legCycle = Math.sin(player.legCycle);

    // Helper to draw a single 3-segmented leg (coxa/femur/tibia/tarsus)
    const drawLeg = (baseX, baseY, jointX, jointY, footX, footY, width = 3.5) => {
      // Femur
      const grad = ctx.createLinearGradient(baseX, baseY, jointX, jointY);
      grad.addColorStop(0, p.dark);
      grad.addColorStop(0.5, p.primary);
      grad.addColorStop(1, p.secondary);
      ctx.strokeStyle = grad;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(jointX, jointY);
      ctx.stroke();

      // Knee joint bead
      ctx.fillStyle = p.dark;
      ctx.beginPath();
      ctx.arc(jointX, jointY, width * 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Tibia
      ctx.strokeStyle = p.secondary;
      ctx.lineWidth = width * 0.75;
      ctx.beginPath();
      ctx.moveTo(jointX, jointY);
      ctx.lineTo(footX, footY);
      ctx.stroke();

      // Tiny apical spine / tarsal claw
      ctx.strokeStyle = p.dark;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(footX, footY);
      ctx.lineTo(footX + 4, footY + 2);
      ctx.stroke();
    };

    if (player.state === 'dead') {
      // Limbs relax and fold against the ground once the mantis collapses.
      drawLeg(-18, -25, -38, -20, -52, 3, 3.8);
      drawLeg(-8, -25, -25, -12, -35, 5, 3.4);
      drawLeg(10, -28, 22, -12, 38, 5, 3.6);
      ctx.restore();
      return;
    }

    // Rear Leg Left
    drawLeg(-18, -25, -42 - legCycle * 10, -48, -52 - legCycle * 12, 4, 3.8);
    // Rear Leg Right
    drawLeg(-8, -25, -28 + legCycle * 10, -44, -32 + legCycle * 10, 4, 3.4);
    // Middle Leg
    drawLeg(10, -28, 16 - legCycle * 8, -14, 28 - legCycle * 8, 4, 3.6);

    ctx.restore();
  }

  drawMantisAbdomen(ctx, player, p, time) {
    ctx.save();
    const breath = Math.sin(time * 3.5) * 2;
    const abX = -38;
    const abY = -34 + breath;

    // Abdomen base shape
    const grad = ctx.createLinearGradient(-68, -48, -10, -20);
    grad.addColorStop(0, p.dark);
    grad.addColorStop(0.4, p.primary);
    grad.addColorStop(0.85, p.secondary);
    grad.addColorStop(1, p.dark);

    ctx.fillStyle = grad;
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-10, -32);
    ctx.quadraticCurveTo(-35, -48 + breath, -70, -38 + breath); // dorsal curve
    ctx.quadraticCurveTo(-78, -32 + breath, -72, -26 + breath); // apex tip
    ctx.quadraticCurveTo(-38, -18 + breath, -10, -26); // ventral curve
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 10 Distinct overlapping tergite lines & breathing spiracles
    for (let i = 0; i < 7; i++) {
      const segX = -18 - i * 7.5;
      const segYTop = -32 - (i * 2.2) + breath;
      const segYBot = -24 - (i * 1.5) + breath;

      // Segment line
      ctx.strokeStyle = p.dark;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(segX, segYTop);
      ctx.quadraticCurveTo(segX + 2, (segYTop + segYBot) * 0.5, segX - 1, segYBot);
      ctx.stroke();

      // Chitin highlight rim on each segment
      ctx.strokeStyle = p.highlight;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(segX + 1, segYTop + 1);
      ctx.lineTo(segX + 2, segYTop + 5);
      ctx.stroke();

      // Lateral respiratory spiracle (tiny breathing pore)
      ctx.fillStyle = '#102518';
      ctx.beginPath();
      ctx.arc(segX - 2, (segYTop + segYBot) * 0.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sensory cerci at abdominal tip (paired appendages)
    ctx.strokeStyle = p.secondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-71, -30 + breath);
    ctx.quadraticCurveTo(-82, -35 + breath, -88, -40 + breath);
    ctx.moveTo(-71, -26 + breath);
    ctx.quadraticCurveTo(-80, -26 + breath, -86, -24 + breath);
    ctx.stroke();

    ctx.restore();
  }

  drawMantisWings(ctx, player, p, time) {
    ctx.save();
    const isJumping = player.state === 'jump';

    if (isJumping) {
      // Underwings (membranous, fan-pleated radial venation)
      const flutter = Math.sin(time * 25) * 6;
      ctx.fillStyle = 'rgba(230, 255, 240, 0.45)';
      ctx.strokeStyle = 'rgba(40, 90, 50, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(-28, -62 + flutter, 36, 16, -0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Fan radial veins
      for (let a = -1.1; a < -0.2; a += 0.15) {
        ctx.beginPath();
        ctx.moveTo(-12, -45);
        ctx.lineTo(-12 + Math.cos(a) * 44, -45 + Math.sin(a) * 32);
        ctx.stroke();
      }
    }

    // Tegmina (Forewings - Leathery, detailed biological venation)
    const tegX = -32;
    const tegY = isJumping ? -54 : -41;
    const rot = isJumping ? -0.45 : -0.22;

    ctx.save();
    ctx.translate(tegX, tegY);
    ctx.rotate(rot);

    // Wing blade gradient
    const wingGrad = ctx.createLinearGradient(-35, -12, 35, 12);
    wingGrad.addColorStop(0, p.dark);
    wingGrad.addColorStop(0.3, p.primary);
    wingGrad.addColorStop(0.7, p.secondary);
    wingGrad.addColorStop(1, p.primary);

    ctx.fillStyle = wingGrad;
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 38, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Prominent Subcostal & Radial longitudinal veins
    ctx.strokeStyle = p.highlight;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-32, -2);
    ctx.quadraticCurveTo(0, -6, 32, 0); // Subcosta
    ctx.moveTo(-30, 1);
    ctx.quadraticCurveTo(0, 2, 30, 1); // Radius
    ctx.stroke();

    // Reticulate micro-veinlets (transverse leaf-like cells)
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.6;
    for (let vx = -24; vx < 24; vx += 7) {
      ctx.beginPath();
      ctx.moveTo(vx, -5);
      ctx.lineTo(vx + 3, 5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Specular shine stripe
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-20, -4);
    ctx.lineTo(15, -4);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  drawMantisPronotum(ctx, player, p, time) {
    ctx.save();
    // Elongated saddle-like prothorax (slender neck)
    const grad = ctx.createLinearGradient(0, -35, 26, -72);
    grad.addColorStop(0, p.dark);
    grad.addColorStop(0.4, p.primary);
    grad.addColorStop(0.75, p.secondary);
    grad.addColorStop(1, p.primary);

    ctx.fillStyle = grad;
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(-4, -34);
    ctx.quadraticCurveTo(12, -58, 20, -72);
    ctx.lineTo(27, -69);
    ctx.quadraticCurveTo(19, -52, 4, -28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lateral denticles (tiny sharp spines along the outer edge of the pronotum)
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 1.2;
    for (let d = 0; d < 6; d++) {
      const tx = 0 + d * 3.8;
      const ty = -36 - d * 6.2;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - 2, ty - 1);
      ctx.stroke();
    }

    // Pronotum median ridge highlight
    ctx.strokeStyle = p.highlight;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.quadraticCurveTo(14, -54, 22, -69);
    ctx.stroke();

    ctx.restore();
  }

  drawMantisHead(ctx, player, p, time) {
    ctx.save();
    const headX = 23;
    const headY = -74;
    ctx.translate(headX, headY);

    // 1. Long, delicate, multi-segmented filiform antennae
    ctx.strokeStyle = p.secondary;
    ctx.lineWidth = 1.4;
    const antSway = Math.sin(time * 6) * 4;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.bezierCurveTo(10, -22 + antSway, 18, -35 + antSway, 24, -45 + antSway);
    ctx.moveTo(-2, -8);
    ctx.bezierCurveTo(4, -24 - antSway, 10, -38 - antSway, 14, -48 - antSway);
    ctx.stroke();

    // 2. Inverted Triangular Head Shield
    const headGrad = ctx.createRadialGradient(2, -2, 2, 2, -2, 14);
    headGrad.addColorStop(0, p.secondary);
    headGrad.addColorStop(0.7, p.primary);
    headGrad.addColorStop(1, p.dark);

    ctx.fillStyle = headGrad;
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(12, -7);
    ctx.lineTo(3, 9); // lower clypeus / mouthparts
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. ANIMATED MANDIBLES — open during ANY attack/block/parry (always visible)
    // Biological fact: mantises use asymmetric mandibles to bite and hold prey simultaneously
    const isAttacking = !['idle', 'walk', 'hit', 'dead'].includes(player.state);
    const gape = isAttacking
      ? (0.6 + Math.sin(time * 24) * 0.4)   // rapid chomping during strike
      : (0.06 + Math.abs(Math.sin(time * 3)) * 0.06); // subtle idle movement

    // Dark oral cavity (visible when mouth open)
    if (gape > 0.14) {
      ctx.fillStyle = '#050505';
      ctx.beginPath();
      ctx.ellipse(3, 9 + gape * 3, 3 + gape * 2, 1.5 + gape * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Upper-left mandible (pivots up when gaping)
    ctx.save();
    ctx.translate(1, 8);
    ctx.rotate(-gape * 0.5);
    ctx.fillStyle = '#172318';
    ctx.strokeStyle = '#0a130b';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.quadraticCurveTo(-1, 2, 0.5, 5 + gape * 2.5);
    ctx.lineTo(-2, 5.5 + gape * 2.5);
    ctx.quadraticCurveTo(-3.5, 3, -4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Inner serrated edge (apical tooth)
    ctx.strokeStyle = '#d4b96a';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-1.5, 2); ctx.lineTo(-0.2, 4.2);
    ctx.moveTo(-2.0, 3.5); ctx.lineTo(-0.8, 5.2);
    ctx.stroke();
    ctx.restore();

    // Lower-right mandible (pivots down)
    ctx.save();
    ctx.translate(5, 8);
    ctx.rotate(gape * 0.5);
    ctx.fillStyle = '#172318';
    ctx.strokeStyle = '#0a130b';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.quadraticCurveTo(2, 2, 0.8, 5 + gape * 2.5);
    ctx.lineTo(3.2, 5.5 + gape * 2.5);
    ctx.quadraticCurveTo(4.5, 3, 5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Inner serrated edge
    ctx.strokeStyle = '#d4b96a';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(2.5, 2); ctx.lineTo(1.2, 4.2);
    ctx.moveTo(3.0, 3.5); ctx.lineTo(1.8, 5.2);
    ctx.stroke();
    ctx.restore();

    // Labrum (plate above mandible base)
    ctx.fillStyle = p.dark;
    ctx.beginPath();
    ctx.moveTo(-2, 7); ctx.lineTo(8, 7); ctx.lineTo(7, 9); ctx.lineTo(-1, 9);
    ctx.closePath();
    ctx.fill();

    // Maxillary palps — wiggle continuously
    ctx.strokeStyle = p.secondary;
    ctx.lineWidth = 1.5;
    const palp = Math.sin(time * 8) * 2;
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.quadraticCurveTo(-2, 12, -4 + palp * 0.5, 15 + palp);
    ctx.moveTo(6, 9);
    ctx.quadraticCurveTo(8.5, 12, 10 - palp * 0.5, 15 - palp);
    ctx.stroke();
    ctx.fillStyle = p.secondary;
    ctx.beginPath();
    ctx.arc(-4 + palp * 0.5, 15 + palp, 1.5, 0, Math.PI * 2);
    ctx.arc(10 - palp * 0.5, 15 - palp, 1.5, 0, Math.PI * 2);
    ctx.fill();


    // 4. Three frontal ocelli (simple eyes on the forehead)
    ctx.fillStyle = '#ffbe0b';
    ctx.beginPath();
    ctx.arc(1, -7, 1.2, 0, Math.PI * 2);
    ctx.arc(3, -5, 1.2, 0, Math.PI * 2);
    ctx.arc(-1, -5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // 5. Giant Convex Compound Eyes with tracking Pseudopupil!
    const drawCompoundEye = (cx, cy, rx, ry, ang) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);

      const eyeGrad = ctx.createRadialGradient(-1, -2, 1, 0, 0, 7);
      eyeGrad.addColorStop(0, p.eyes);
      eyeGrad.addColorStop(0.8, p.dark);
      eyeGrad.addColorStop(1, '#000000');

      ctx.fillStyle = eyeGrad;
      ctx.strokeStyle = p.dark;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Dynamic "Pseudopupil" (Black optical focal illusion that tracks enemy direction!)
      ctx.fillStyle = '#080808';
      ctx.beginPath();
      ctx.arc(1.8, 0.5, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Brilliant corneal reflection glint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-1.5, -2.5, 1.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // Left and Right Compound Eyes
    drawCompoundEye(-6, -9, 5.5, 7.5, -0.35);
    drawCompoundEye(9, -7, 5.5, 7.5, 0.35);

    ctx.restore();
  }

  drawMantisRaptorialLegs(ctx, player, p, time) {
    ctx.save();
    const originX = 19;
    const originY = -56;
    const state = player.state;

    // Helper to draw realistic spiked raptorial leg (Coxa -> Femur with spines -> Tibia blade -> Tarsus)
    const renderScythe = (coxaEndX, coxaEndY, femurEndX, femurEndY, tibiaEndX, tibiaEndY, isPrimary = true) => {
      // 1. Elongated Coxa (Upper arm)
      const coxaGrad = ctx.createLinearGradient(originX, originY, coxaEndX, coxaEndY);
      coxaGrad.addColorStop(0, p.dark);
      coxaGrad.addColorStop(0.6, p.primary);
      coxaGrad.addColorStop(1, p.secondary);

      ctx.strokeStyle = coxaGrad;
      ctx.lineWidth = 5.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(coxaEndX, coxaEndY);
      ctx.stroke();

      // Trochanter joint ring
      ctx.fillStyle = p.dark;
      ctx.beginPath();
      ctx.arc(coxaEndX, coxaEndY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 2. Powerful Spiny Femur
      const femGrad = ctx.createLinearGradient(coxaEndX, coxaEndY, femurEndX, femurEndY);
      femGrad.addColorStop(0, p.secondary);
      femGrad.addColorStop(0.5, p.primary);
      femGrad.addColorStop(1, p.dark);

      ctx.strokeStyle = femGrad;
      ctx.lineWidth = 6.8;
      ctx.beginPath();
      ctx.moveTo(coxaEndX, coxaEndY);
      ctx.lineTo(femurEndX, femurEndY);
      ctx.stroke();

      // Warning spot on inner femur face (real biological trait!)
      if (isPrimary) {
        const midX = (coxaEndX + femurEndX) * 0.5;
        const midY = (coxaEndY + femurEndY) * 0.5;
        ctx.fillStyle = '#ffbe0b';
        ctx.beginPath();
        ctx.arc(midX, midY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(midX, midY, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Discoidal & Marginal Razor Spines along inner femur edge!
      const spineCount = 6;
      ctx.strokeStyle = '#0a1a0e';
      ctx.lineWidth = 2.2;
      for (let s = 1; s < spineCount; s++) {
        const t = s / spineCount;
        const sx = coxaEndX + (femurEndX - coxaEndX) * t;
        const sy = coxaEndY + (femurEndY - coxaEndY) * t;
        // Perpendicular vector for spine direction
        const dx = femurEndX - coxaEndX;
        const dy = femurEndY - coxaEndY;
        const len = Math.hypot(dx, dy) || 1;
        const px = -dy / len;
        const py = dx / len;
        const spineLen = (s % 2 === 0 ? 7 : 4.5); // Alternating long and short biological spines!

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + px * spineLen, sy + py * spineLen);
        ctx.stroke();
      }

      // 3. Curved Folding Tibia (The razor-sharp sickle blade)
      const tibGrad = ctx.createLinearGradient(femurEndX, femurEndY, tibiaEndX, tibiaEndY);
      tibGrad.addColorStop(0, p.highlight);
      tibGrad.addColorStop(0.5, p.secondary);
      tibGrad.addColorStop(1, p.dark);

      ctx.strokeStyle = tibGrad;
      ctx.lineWidth = 4.8;
      ctx.beginPath();
      ctx.moveTo(femurEndX, femurEndY);
      ctx.quadraticCurveTo(
        (femurEndX + tibiaEndX) * 0.5 + 4,
        (femurEndY + tibiaEndY) * 0.5,
        tibiaEndX, tibiaEndY
      );
      ctx.stroke();

      // Sharp terminal curved apical claw
      ctx.strokeStyle = '#10002b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(tibiaEndX, tibiaEndY);
      ctx.lineTo(tibiaEndX + 5, tibiaEndY + 2);
      ctx.stroke();
    };

    // Poses based on attack state
    if (state === 'slash1') {
      // Sweeping horizontal scythe slash
      renderScythe(34, -46, 68, -58, 85, -34, true);
      // Glow arc — layered alpha instead of shadowBlur
      ctx.lineWidth = 10;
      ctx.strokeStyle = p.highlight.replace(')', ', 0.18)').replace('rgb', 'rgba');
      ctx.beginPath(); ctx.arc(42, -45, 48, -0.4, 0.7); ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = p.highlight;
      ctx.beginPath(); ctx.arc(42, -45, 48, -0.4, 0.7); ctx.stroke();
    } else if (state === 'slash2') {
      // Downward diagonal cross slash
      renderScythe(32, -62, 64, -75, 88, -25, true);
      ctx.lineWidth = 10;
      ctx.strokeStyle = p.highlight.replace(')', ', 0.18)').replace('rgb', 'rgba');
      ctx.beginPath(); ctx.arc(40, -42, 54, -0.85, 0.35); ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = p.highlight;
      ctx.beginPath(); ctx.arc(40, -42, 54, -0.85, 0.35); ctx.stroke();
    } else if (state === 'slash3') {
      // Dual Scythe Cross Cut Finisher
      renderScythe(36, -65, 75, -74, 95, -32, true);
      renderScythe(38, -42, 78, -26, 96, -62, false);
      // X cross flare — layered
      ctx.lineWidth = 14;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath(); ctx.moveTo(60,-75); ctx.lineTo(95,-25); ctx.moveTo(60,-25); ctx.lineTo(95,-75); ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(60,-75); ctx.lineTo(95,-25); ctx.moveTo(60,-25); ctx.lineTo(95,-75); ctx.stroke();
    } else if (state === 'pounce') {
      // Forward hunting dagger lunge
      renderScythe(40, -52, 74, -50, 96, -42, true);
    } else if (state === 'parry') {
      // Crossed spiked shield defense
      renderScythe(28, -68, 38, -80, 38, -32, true);
      // Glowing energy barrier — layered
      ctx.lineWidth = 16;
      ctx.strokeStyle = p.highlight.replace(')', ', 0.15)').replace('rgb', 'rgba');
      ctx.beginPath(); ctx.arc(40, -54, 32, -Math.PI * 0.45, Math.PI * 0.45); ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = p.highlight;
      ctx.beginPath(); ctx.arc(40, -54, 32, -Math.PI * 0.45, Math.PI * 0.45); ctx.stroke();
    } else if (state === 'dead') {
      // The raptorial forelegs lose their raised guard and lie limp beside
      // the body after the mantis falls.
      renderScythe(26, -34, 39, -16, 51, 3, true);
      renderScythe(20, -38, 8, -19, -5, 4, false);
    } else {
      // Natural idle "prayer" posture (folded up against the chest)
      const breath = Math.sin(time * 2.5) * 2;
      renderScythe(30, -38 + breath, 25, -66 + breath, 29, -44 + breath, true);
    }

    ctx.restore();
  }

  // ==========================================
  // RENDER: CREATURE BOSS DISPATCHER
  // ==========================================
  drawCreature(ctx, enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(enemy.direction, 1);

    const isDead = enemy.isDead || enemy.actionState === 'dead';
    const deathProgress = isDead
      ? Math.max(0, Math.min(1, enemy.deathProgress ?? 1))
      : 0;
    if (isDead) {
      // Dead bodies are visibly desaturated and darker, not merely rotated.
      ctx.filter = 'grayscale(0.86) saturate(0.3) brightness(0.68)';
      ctx.globalAlpha = 0.9;
    }
    if (isDead && enemy.id !== 'pharaoh_ants') {
      const easedDeath = 1 - Math.pow(1 - deathProgress, 3);
      // Rotate the full body onto its side. The lift keeps the head and legs
      // resting on the ground instead of leaving the corpse half-standing.
      ctx.translate(0, (enemy.deathLift || -30) * easedDeath);
      ctx.rotate((enemy.deathRotation || 1.38) * easedDeath);
      ctx.globalAlpha = 0.9;
    }

    switch (enemy.id) {
      case 'truxalis':
        this.drawTruxalis(ctx, enemy);
        break;
      case 'oedipoda':
        this.drawOedipoda(ctx, enemy);
        break;
      case 'calliptamus':
        this.drawCalliptamus(ctx, enemy);
        break;
      case 'katydid':
        this.drawKatydid(ctx, enemy);
        break;
      case 'hyla_orientalis':
        this.drawHylaFrog(ctx, enemy);
        break;
      case 'asian_hornet':
        this.drawAsianHornet(ctx, enemy);
        break;
      case 'pharaoh_ants':
        this.drawPharaohAnts(ctx, enemy);
        break;
      case 'garter_snake':
        this.drawGarterSnake(ctx, enemy);
        break;
      default:
        this.drawTruxalis(ctx, enemy);
    }

    // Stun flash: cheap globalAlpha yellow overlay instead of ctx.filter
    if (enemy.isStunned) {
      const pulse = 0.35 + Math.sin(Date.now() * 0.025) * 0.25;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.ellipse(0, -35, 52, 48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Stars above head
      for (let s = 0; s < 3; s++) {
        const ang = Date.now() * 0.005 + s * Math.PI * 0.667;
        const sx = Math.cos(ang) * 28;
        const sy = -80 + Math.sin(ang * 2) * 8;
        ctx.fillStyle = '#ffe600';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('★', sx - 7, sy);
      }
    }

    ctx.restore();
  }

  // =========================================================================
  // 2. CREATURE 1: TRUXALIS NASUTA (კონუსთავა კალია)
  // =========================================================================
  drawTruxalis(ctx, enemy) {
    ctx.save();
    const legMotion = this.getCreatureLegMotion(enemy, 2.8, 14);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 58, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. Long, slender acridid body with longitudinal green & straw stripes
    const bodyGrad = ctx.createLinearGradient(-55, -28, 45, -24);
    bodyGrad.addColorStop(0, '#606c38');
    bodyGrad.addColorStop(0.5, '#a3b18a');
    bodyGrad.addColorStop(1, '#dda15e');

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#283618';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-55, -24);
    ctx.quadraticCurveTo(0, -36, 32, -26);
    ctx.lineTo(32, -18);
    ctx.quadraticCurveTo(0, -14, -55, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Longitudinal stripes
    ctx.strokeStyle = '#fefae0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-50, -26);
    ctx.quadraticCurveTo(0, -32, 30, -24);
    ctx.moveTo(-50, -21);
    ctx.quadraticCurveTo(0, -21, 30, -19);
    ctx.stroke();

    // 2. Cone Head (Striking sword-shaped conical snout extending forward-upward)
    const headGrad = ctx.createLinearGradient(28, -26, 78, -36);
    headGrad.addColorStop(0, '#a3b18a');
    headGrad.addColorStop(1, '#dda15e');

    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#283618';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(28, -32);
    ctx.lineTo(76, -40); // pointed cone apex
    ctx.lineTo(32, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // ANIMATED GRASSHOPPER MANDIBLES & MOUTH at ventral cone apex (32, -14)
    // Biological: acridids have hypognathous chewing mouthparts with toothed incisor cusps & sensory palps
    const isBiting = !enemy.isDead && enemy.actionState !== 'idle';
    const gapeT = isBiting
      ? (0.6 + Math.sin(enemy.animTime * 22) * 0.4)
      : (0.08 + Math.abs(Math.sin(enemy.animTime * 4)) * 0.08);

    // Dark oral cavity
    if (gapeT > 0.08) {
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.ellipse(32, -12 + gapeT * 3, 3.8 + gapeT * 2, 1.8 + gapeT * 2, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Anterior / Upper Mandible
    ctx.save();
    ctx.translate(33, -14);
    ctx.rotate(-gapeT * 0.45);
    ctx.fillStyle = '#3d405b';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2, 0); ctx.lineTo(4, 0); ctx.lineTo(4, 5 + gapeT * 3); ctx.lineTo(-1, 5 + gapeT * 2.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Chitin incisor teeth (sharp golden-tan cutting cusps)
    ctx.strokeStyle = '#dda15e'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(1, 1.5); ctx.lineTo(2.5, 4.5 + gapeT);
    ctx.moveTo(-0.5, 2); ctx.lineTo(1, 5 + gapeT);
    ctx.stroke();
    ctx.restore();

    // Posterior / Lower Mandible
    ctx.save();
    ctx.translate(31, -11);
    ctx.rotate(gapeT * 0.45);
    ctx.fillStyle = '#3d405b';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2, 0); ctx.lineTo(4, 0); ctx.lineTo(4, -5 - gapeT * 3); ctx.lineTo(-1, -5 - gapeT * 2.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Incisor teeth
    ctx.strokeStyle = '#dda15e'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(1, -1.5); ctx.lineTo(2.5, -4.5 - gapeT);
    ctx.moveTo(-0.5, -2); ctx.lineTo(1, -5 - gapeT);
    ctx.stroke();
    ctx.restore();

    // Maxillary palps hanging down from mouth
    ctx.strokeStyle = '#a3b18a'; ctx.lineWidth = 1.5;
    const palpT = Math.sin(enemy.animTime * 7) * 2;
    ctx.beginPath();
    ctx.moveTo(31, -12); ctx.quadraticCurveTo(28, -6, 26 + palpT, 0);
    ctx.moveTo(34, -12); ctx.quadraticCurveTo(37, -6, 39 - palpT, 0);
    ctx.stroke();
    ctx.fillStyle = '#606c38';
    ctx.beginPath();
    ctx.arc(26 + palpT, 0, 1.4, 0, Math.PI * 2);
    ctx.arc(39 - palpT, 0, 1.4, 0, Math.PI * 2);
    ctx.fill();


    ctx.fillStyle = '#bc6c25';
    ctx.beginPath();
    ctx.ellipse(38, -28, 4.5, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(37, -30, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // 3. Flattened Ensiform (Sword-like) Antennae at the very tip of the cone
    ctx.strokeStyle = '#dda15e';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(72, -39);
    ctx.lineTo(96, -48);
    ctx.stroke();
    // Segment notches on antennae
    ctx.strokeStyle = '#606c38';
    ctx.lineWidth = 1;
    for (let s = 76; s < 95; s += 4) {
      ctx.beginPath();
      ctx.moveTo(s, -40 - (s - 72) * 0.35);
      ctx.lineTo(s + 1, -43 - (s - 72) * 0.35);
      ctx.stroke();
    }

    // 4. Front & Middle Slender Walking Legs
    ctx.strokeStyle = '#606c38';
    ctx.lineWidth = 2.4;
    // Front leg
    ctx.beginPath();
    ctx.moveTo(20, -20);
    ctx.lineTo(28 + legMotion.stride * 5, -6 + Math.abs(legMotion.stride) * 2);
    ctx.lineTo(34 + legMotion.stride * 10, 4 - legMotion.stride * 2);
    ctx.stroke();
    // Middle leg
    ctx.beginPath();
    ctx.moveTo(2, -20);
    ctx.lineTo(8 + legMotion.oppositeStride * 5, -6 + Math.abs(legMotion.oppositeStride) * 2);
    ctx.lineTo(14 + legMotion.oppositeStride * 10, 4 - legMotion.oppositeStride * 2);
    ctx.stroke();

    // 5. WINGS (TEGMINA & HINDWINGS) - Real Truxalis nasuta biology!
    const isFlyingT = !enemy.isGrounded || enemy.actionState === 'flight_glide' || enemy.actionState === 'spring_kick';

    // Large Membranous Fan Underwings (Spread wide in flight & jumping!)
    if (isFlyingT) {
      ctx.save();
      const wingFlapT = Math.sin((enemy.animTime || 0) * 32) * 9;
      const wingX = -10;
      const wingY = -34 + wingFlapT;

      // Truxalis keeps its cryptic green/straw tegmen over the body, while
      // the exposed flight wing stays in the same green/olive palette.
      const underwingGrad = ctx.createRadialGradient(wingX, wingY, 4, wingX - 15, wingY - 25, 62);
      underwingGrad.addColorStop(0, 'rgba(239, 255, 196, 0.92)');
      underwingGrad.addColorStop(0.36, 'rgba(174, 220, 100, 0.82)');
      underwingGrad.addColorStop(0.72, 'rgba(93, 148, 65, 0.62)');
      underwingGrad.addColorStop(1, 'rgba(37, 89, 45, 0.16)');

      ctx.fillStyle = underwingGrad;
      ctx.strokeStyle = '#283618';
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      ctx.moveTo(wingX + 18, wingY);
      ctx.quadraticCurveTo(wingX + 10, wingY - 68, wingX - 42, wingY - 60);
      ctx.quadraticCurveTo(wingX - 78, wingY - 38, wingX - 68, wingY + 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Delicate radial fan veins
      ctx.strokeStyle = 'rgba(241, 255, 214, 0.78)';
      ctx.lineWidth = 1;
      for (let a = -1.65; a < -0.3; a += 0.16) {
        ctx.beginPath();
        ctx.moveTo(wingX + 12, wingY - 4);
        ctx.lineTo(wingX + 12 + Math.cos(a) * 66, wingY - 4 + Math.sin(a) * 66);
        ctx.stroke();
      }

      // Stronger green basal patch: it is the part that flashes first when
      // the folded hindwing starts opening.
      ctx.fillStyle = 'rgba(65, 118, 48, 0.78)';
      ctx.beginPath();
      ctx.ellipse(wingX + 8, wingY - 2, 15, 9, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (!isFlyingT) {
      // Long lanceolate forewing (tegmen): visible only while grounded,
      // when it lies folded flat over the abdomen.
      const tegGradT = ctx.createLinearGradient(25, -38, -75, -23);
      tegGradT.addColorStop(0, '#a3b18a');
      tegGradT.addColorStop(0.35, '#606c38');
      tegGradT.addColorStop(0.7, '#a3b18a');
      tegGradT.addColorStop(1, '#dda15e');

      ctx.fillStyle = tegGradT;
      ctx.strokeStyle = '#283618';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(22, -33);
      ctx.quadraticCurveTo(-15, -49, -80, -28); // Raised dorsal margin, nearly head height.
      ctx.quadraticCurveTo(-86, -21, -80, -14); // Slender acute apex
      ctx.quadraticCurveTo(-20, -18, 20, -25); // Ventral margin lying along the abdomen.
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Longitudinal straw/yellow and green primary veins on the folded tegmen.
      ctx.strokeStyle = '#fefae0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, -31);
      ctx.quadraticCurveTo(-15, -43, -76, -24);
      ctx.stroke();

      ctx.strokeStyle = '#dda15e';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(18, -28);
      ctx.quadraticCurveTo(-15, -37, -74, -20);
      ctx.stroke();

      // The green hindwing is concealed by the tegmen only in this
      // grounded pose; it is exposed above when isFlyingT becomes true.
      ctx.save();
      ctx.strokeStyle = '#283618';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(20, -35);
      ctx.quadraticCurveTo(-18, -51, -82, -30);
      ctx.quadraticCurveTo(-46, -33, 12, -30);
      ctx.stroke();

      ctx.strokeStyle = '#fefae0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(17, -32);
      ctx.quadraticCurveTo(-18, -44, -76, -25);
      ctx.stroke();

      ctx.fillStyle = '#606c38';
      ctx.beginPath();
      ctx.ellipse(17, -29, 4.8, 2.7, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Pair of extremely long jumping hind legs with real jump kinematics.
    // Grounded = folded under the abdomen; take-off = fully extended;
    // apex = tucked; falling = feet reach forward for the landing.
    const lerpPoint = (a, b, amount) => [
      a[0] + (b[0] - a[0]) * amount,
      a[1] + (b[1] - a[1]) * amount
    ];
    const lerpPose = (from, to, amount) => from.map((point, index) => lerpPoint(point, to[index], amount));
    const farFolded = [[-22, -24], [-58, -42], [-38, 5]];
    const nearFolded = [[-10, -22], [-48, -38], [-27, 7]];
    const farPushOff = [[-22, -24], [-82, -58], [-108, -18]];
    const nearPushOff = [[-10, -22], [-70, -54], [-96, -14]];
    const farLanding = [[-22, -24], [-52, -12], [-25, 10]];
    const nearLanding = [[-10, -22], [-42, -8], [-8, 11]];

    let farHindLeg;
    let nearHindLeg;
    if (legMotion.airborne) {
      const jumpProgress = legMotion.jumpProgress;
      const extension = legMotion.jumpExtension;
      const targetFar = jumpProgress < 0.5 ? farPushOff : farLanding;
      const targetNear = jumpProgress < 0.5 ? nearPushOff : nearLanding;
      farHindLeg = lerpPose(farFolded, targetFar, extension);
      nearHindLeg = lerpPose(nearFolded, targetNear, extension);
    } else {
      const farStep = legMotion.stride;
      const nearStep = legMotion.oppositeStride;
      farHindLeg = [
        [-22, -24],
        [-58 + farStep * 8, -42 + Math.abs(farStep) * 3],
        [-38 + farStep * 14, 5 - farStep * 2]
      ];
      nearHindLeg = [
        [-10, -22],
        [-48 + nearStep * 8, -38 + Math.abs(nearStep) * 3],
        [-27 + nearStep * 14, 7 - nearStep * 2]
      ];
    }

    const drawHindLeg = (points, farSide = false) => {
      const [hip, knee, foot] = points;
      const femurColor = farSide ? '#4f5d2f' : '#606c38';
      const tibiaColor = farSide ? '#b58b45' : '#dda15e';

      // Thick muscular femur with a dark biological outline.
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#283618';
      ctx.lineWidth = farSide ? 11 : 13;
      ctx.beginPath();
      ctx.moveTo(hip[0], hip[1]);
      ctx.lineTo(knee[0], knee[1]);
      ctx.stroke();
      ctx.strokeStyle = femurColor;
      ctx.lineWidth = farSide ? 8 : 10;
      ctx.beginPath();
      ctx.moveTo(hip[0], hip[1]);
      ctx.lineTo(knee[0], knee[1]);
      ctx.stroke();

      // Herringbone muscle marks follow the moving femur instead of staying
      // frozen at the old grounded coordinates.
      ctx.strokeStyle = '#dda15e';
      ctx.lineWidth = 1.2;
      for (let chevron = 1; chevron <= 4; chevron++) {
        const t = chevron / 5;
        const cx = hip[0] + (knee[0] - hip[0]) * t;
        const cy = hip[1] + (knee[1] - hip[1]) * t;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 2);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx - 2, cy + 3);
        ctx.stroke();
      }

      // Long tibia, knee joint, spines, and a small landing foot.
      ctx.fillStyle = '#283618';
      ctx.beginPath();
      ctx.arc(knee[0], knee[1], farSide ? 4 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#283618';
      ctx.lineWidth = farSide ? 4.8 : 5.5;
      ctx.beginPath();
      ctx.moveTo(knee[0], knee[1]);
      ctx.lineTo(foot[0], foot[1]);
      ctx.stroke();
      ctx.strokeStyle = tibiaColor;
      ctx.lineWidth = farSide ? 3 : 3.5;
      ctx.beginPath();
      ctx.moveTo(knee[0], knee[1]);
      ctx.lineTo(foot[0], foot[1]);
      ctx.stroke();

      for (let spine = 1; spine <= 5; spine++) {
        const t = spine / 6;
        const sx = knee[0] + (foot[0] - knee[0]) * t;
        const sy = knee[1] + (foot[1] - knee[1]) * t;
        ctx.strokeStyle = '#283618';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 4, sy - 2);
        ctx.stroke();
      }

      ctx.strokeStyle = tibiaColor;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(foot[0], foot[1]);
      ctx.lineTo(foot[0] + 5, foot[1] + 1);
      ctx.lineTo(foot[0] + 8, foot[1] - 1);
      ctx.stroke();
    };

    // Draw the far leg first so the nearer leg clearly overlaps it.
    drawHindLeg(farHindLeg, true);
    drawHindLeg(nearHindLeg, false);

    ctx.restore();
  }

  // =========================================================================
  // 3. CREATURE 2: OEDIPODA CAERULESCENS (ლურჯფრთიანი კალია) - REAL BIOLOGY
  // =========================================================================
  drawOedipoda(ctx, enemy) {
    ctx.save();
    const time = enemy.animTime || 0;
    const isFlashing = enemy.actionState === 'blue_flash_dash' || enemy.actionState === 'air_dash' || enemy.actionState === 'blue_wing_flight' || !enemy.isGrounded;
    const legMotion = this.getCreatureLegMotion(enemy, 2.8, 14);

    // 1. Ground Contact Shadow with soft ambient occlusion
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 60, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Far-side Legs (Subtle depth background limbs)
    ctx.strokeStyle = '#343a40';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(30, -16);
    ctx.lineTo(40 + legMotion.stride * 5, -4 + Math.abs(legMotion.stride) * 2);
    ctx.lineTo(44 + legMotion.stride * 10, 4 - legMotion.stride * 2); // Far front leg
    ctx.moveTo(14, -16);
    ctx.lineTo(18 + legMotion.oppositeStride * 5, -4 + Math.abs(legMotion.oppositeStride) * 2);
    ctx.lineTo(22 + legMotion.oppositeStride * 10, 4 - legMotion.oppositeStride * 2); // Far middle leg
    ctx.stroke();

    // 3. Abdomen (Sloping tapering segmented body beneath the wings)
    const abGrad = ctx.createLinearGradient(-10, -26, -55, -16);
    abGrad.addColorStop(0, '#495057');
    abGrad.addColorStop(0.5, '#6c757d');
    abGrad.addColorStop(1, '#343a40');

    ctx.fillStyle = abGrad;
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(8, -24);
    ctx.quadraticCurveTo(-25, -28, -56, -18);
    ctx.quadraticCurveTo(-60, -14, -54, -10);
    ctx.quadraticCurveTo(-20, -12, 8, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Abdominal sternite segmentation lines
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1.2;
    for (let s = -12; s > -50; s -= 7) {
      ctx.beginPath();
      ctx.moveTo(s, -24);
      ctx.lineTo(s - 2, -12);
      ctx.stroke();
    }

    // 4. "BLUE FLASH DASH" - Full Luminous Fan Hindwing Spread
    if (isFlashing) {
      ctx.save();
      // Fan-shaped hindwing spreading upward-backward
      const wingX = -12;
      const wingY = -36;

      // Basal 60%: Luminous Electric Azure / Cerulean Blue
      const blueGrad = ctx.createRadialGradient(wingX, wingY, 4, wingX - 10, wingY - 20, 55);
      blueGrad.addColorStop(0, '#caf0f8');
      blueGrad.addColorStop(0.3, '#48cae4');
      blueGrad.addColorStop(0.65, '#0096c7');
      blueGrad.addColorStop(0.9, '#03045e');
      blueGrad.addColorStop(1, 'rgba(3, 4, 94, 0.1)');

      ctx.fillStyle = blueGrad;

      // Glow layer without shadowBlur
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#00b4d8';
      ctx.beginPath();
      ctx.moveTo(wingX + 15, wingY);
      ctx.quadraticCurveTo(wingX + 10, wingY - 65, wingX - 35, wingY - 60);
      ctx.quadraticCurveTo(wingX - 65, wingY - 45, wingX - 58, wingY + 5);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = blueGrad;

      ctx.beginPath();
      ctx.moveTo(wingX + 15, wingY);
      ctx.quadraticCurveTo(wingX + 10, wingY - 65, wingX - 35, wingY - 60);
      ctx.quadraticCurveTo(wingX - 65, wingY - 45, wingX - 58, wingY + 5);
      ctx.closePath();
      ctx.fill();

      // Radiating Fan Pleat Veins
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.2;
      for (let a = -1.6; a < -0.4; a += 0.2) {
        ctx.beginPath();
        ctx.moveTo(wingX + 10, wingY);
        ctx.lineTo(wingX + 10 + Math.cos(a) * 58, wingY + Math.sin(a) * 58);
        ctx.stroke();
      }

      // Broad Crescent Velvety Black / Dark Smoky-Brown Submarginal Band
      ctx.strokeStyle = '#0a0908';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(wingX + 6, wingY - 6, 44, -1.9, -0.65);
      ctx.stroke();

      // Apical Transparent Hyaline Glass Wingtips with dark venation
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.strokeStyle = '#212529';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(wingX - 42, wingY - 54, 16, 9, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    } else {
      // The bright hindwing remains fully concealed beneath the tegmina.
    }

    if (!isFlashing) {
      // 5. Tegmina (Folded Forewings - Lithic Granite Stone Camouflage with 3 Dark Fasciae)
      ctx.save();
      const tegGrad = ctx.createLinearGradient(20, -40, -65, -18);
    tegGrad.addColorStop(0, '#ced4da');
    tegGrad.addColorStop(0.3, '#adb5bd');
    tegGrad.addColorStop(0.7, '#6c757d');
    tegGrad.addColorStop(1, '#495057');

    ctx.fillStyle = tegGrad;
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(18, -34);
    ctx.quadraticCurveTo(-15, -49, -66, -27); // Raised dorsal margin, nearly head height.
    ctx.quadraticCurveTo(-72, -21, -64, -15); // Wing apex
    ctx.quadraticCurveTo(-20, -19, 16, -25); // Ventral margin lying along the abdomen.
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Longitudinal venation (Subcosta, Radius, Media)
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(16, -32);
    ctx.quadraticCurveTo(-15, -43, -62, -24);
    ctx.moveTo(16, -28);
    ctx.quadraticCurveTo(-15, -35, -60, -20);
    ctx.stroke();

    // 3 Diagnostic Bold Jagged Dark Smoky-Brown Transverse Bands (Fasciae)
    ctx.fillStyle = '#1c1917';
    // Band 1: Basal band
    ctx.beginPath();
    ctx.moveTo(6, -33);
    ctx.lineTo(0, -32);
    ctx.lineTo(-4, -22);
    ctx.lineTo(2, -23);
    ctx.closePath();
    ctx.fill();

    // Band 2: Broad median band with jagged edges
    ctx.beginPath();
    ctx.moveTo(-16, -35);
    ctx.lineTo(-26, -33);
    ctx.lineTo(-24, -20);
    ctx.lineTo(-14, -21);
    ctx.closePath();
    ctx.fill();

    // Band 3: Subapical band
    ctx.beginPath();
    ctx.moveTo(-40, -30);
    ctx.lineTo(-49, -27);
    ctx.lineTo(-46, -17);
    ctx.lineTo(-37, -19);
    ctx.closePath();
    ctx.fill();

    // Fine speckled granite stippling texture
    ctx.fillStyle = '#212529';
    for (let p = 0; p < 24; p++) {
      const px = 12 - (p * 13) % 72;
      const py = -32 + (p * 17) % 13;
      ctx.fillRect(px, py, 2, 1.6);
    }

      ctx.restore();

    // At rest the bright hindwing is completely hidden. The two cryptic
    // tegmina lie flat over the abdomen, slightly overlapping at the back
    // seam; only their grey bands, edge and thoracic hinge should be visible.
      ctx.save();
      ctx.strokeStyle = '#212529';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(13, -35);
      ctx.quadraticCurveTo(-18, -50, -68, -29);
      ctx.quadraticCurveTo(-43, -32, 7, -31);
      ctx.stroke();

      ctx.strokeStyle = '#e9ecef';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(9, -33);
      ctx.quadraticCurveTo(-20, -45, -63, -25);
      ctx.stroke();

      ctx.fillStyle = '#343a40';
      ctx.beginPath();
      ctx.ellipse(10, -29, 4.5, 2.6, -0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Near-side Foreleg & Middle Leg (Sturdy, mottled ash-grey with dark rings)
    const drawNearLeg = (baseX, baseY, kneeX, kneeY, footX, footY) => {
      ctx.strokeStyle = '#6c757d';
      ctx.lineWidth = 3.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();

      // Dark rings on femur and tibia
      ctx.strokeStyle = '#212529';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo((baseX + kneeX) * 0.5 - 2, (baseY + kneeY) * 0.5);
      ctx.lineTo((baseX + kneeX) * 0.5 + 2, (baseY + kneeY) * 0.5);
      ctx.moveTo((kneeX + footX) * 0.5 - 2, (kneeY + footY) * 0.5);
      ctx.lineTo((kneeX + footX) * 0.5 + 2, (kneeY + footY) * 0.5);
      ctx.stroke();

      // Foot claw
      ctx.strokeStyle = '#212529';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(footX, footY);
      ctx.lineTo(footX + 3, footY + 1);
      ctx.stroke();
    };

    drawNearLeg(26, -16, 36 + legMotion.oppositeStride * 6, -8 + Math.abs(legMotion.oppositeStride) * 2, 44 + legMotion.oppositeStride * 11, 4 - legMotion.oppositeStride * 2); // Near front leg
    drawNearLeg(10, -16, 16 + legMotion.stride * 6, -6 + Math.abs(legMotion.stride) * 2, 22 + legMotion.stride * 11, 4 - legMotion.stride * 2); // Near middle leg

    // 7. Pronotum (High dorsal median crest deeply notched by transverse furrow)
    const pronGrad = ctx.createLinearGradient(6, -42, 28, -20);
    pronGrad.addColorStop(0, '#495057');
    pronGrad.addColorStop(0.5, '#6c757d');
    pronGrad.addColorStop(1, '#343a40');

    ctx.fillStyle = pronGrad;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(6, -42); // Anterior dorsal crest
    ctx.quadraticCurveTo(18, -44, 30, -38); // Crest ridge
    ctx.lineTo(26, -18); // Anterior ventral margin
    ctx.lineTo(4, -18); // Posterior ventral margin
    ctx.lineTo(2, -34); // Posterior triangular process over wings
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Transverse Sulcus (Deep cut in median crest - key Oedipoda trait!)
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(17, -44);
    ctx.lineTo(16, -20);
    ctx.stroke();

    // Craggy stone tuberculations on pronotum
    ctx.fillStyle = '#212529';
    ctx.beginPath();
    ctx.arc(10, -32, 2, 0, Math.PI * 2);
    ctx.arc(22, -28, 2.2, 0, Math.PI * 2);
    ctx.arc(12, -24, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 8. Head, Vertical Face, Eyes, Antennae & Mouthparts
    ctx.save();
    const headX = 35;
    const headY = -27;
    ctx.translate(headX, headY);

    // Head capsule (Vertical, blunt, sloping fastigium)
    const headGrad = ctx.createRadialGradient(2, -4, 2, 0, 0, 16);
    headGrad.addColorStop(0, '#adb5bd');
    headGrad.addColorStop(0.6, '#6c757d');
    headGrad.addColorStop(1, '#343a40');

    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-10, -16);
    ctx.lineTo(6, -14); // Fastigium
    ctx.lineTo(11, 2); // Frontal costa / face
    ctx.lineTo(4, 14); // Clypeus / mouthparts
    ctx.lineTo(-8, 8); // Gena
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Filiform Antennae (Slender with alternating dark and light rings)
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    const antWave = Math.sin(time * 4) * 3;
    ctx.strokeStyle = '#212529';
    ctx.beginPath();
    ctx.moveTo(4, -14);
    ctx.quadraticCurveTo(16, -28 + antWave, 26, -38 + antWave);
    ctx.stroke();

    // Pale rings on antennae
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 2;
    for (let an = 0; an < 4; an++) {
      const at = 0.25 + an * 0.2;
      const ax = 4 + (26 - 4) * at;
      const ay = -14 + (-38 + antWave - (-14)) * at;
      ctx.beginPath();
      ctx.moveTo(ax - 1, ay);
      ctx.lineTo(ax + 1, ay);
      ctx.stroke();
    }

    // Large Vertical Oval Compound Eye with vertical stripes
    ctx.fillStyle = '#495057';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(-1, -6, 5.5, 8, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eye vertical dark stripe & highlight
    ctx.fillStyle = '#212529';
    ctx.fillRect(-2, -12, 2.5, 12);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2, -9, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // ANIMATED MANDIBLES — acridid grasshopper: short, stout, dark, incisor+molar lobes
    // Always slightly open; gapes wide during blue_flash_dash and gravel_kick
    const isAttacking = !enemy.isDead && enemy.actionState !== 'idle';
    const gapeO = isAttacking
      ? (0.55 + Math.sin(enemy.animTime * 20) * 0.45)
      : (0.06 + Math.abs(Math.sin(enemy.animTime * 4)) * 0.05);

    // Oral cavity (dark)
    if (gapeO > 0.06) {
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.ellipse(4, 11 + gapeO * 3, 3.5 + gapeO * 1.5, 1.5 + gapeO * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Upper mandible — pivots upward
    ctx.save();
    ctx.translate(4, 10);
    ctx.rotate(-gapeO * 0.4);
    ctx.fillStyle = '#2b2010';
    ctx.strokeStyle = '#120d05';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, 0); ctx.lineTo(3, -1); ctx.lineTo(3.5, 5 + gapeO * 2.5); ctx.lineTo(-3, 5 + gapeO * 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Incisor lobe (tooth notch)
    ctx.strokeStyle = '#d4b96a'; ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(1, 1.5); ctx.lineTo(2.5, 4 + gapeO);
    ctx.moveTo(-0.5, 2.5); ctx.lineTo(1, 4.5 + gapeO);
    ctx.stroke();
    ctx.restore();
    // Lower mandible — pivots downward
    ctx.save();
    ctx.translate(4, 13);
    ctx.rotate(gapeO * 0.4);
    ctx.fillStyle = '#2b2010';
    ctx.strokeStyle = '#120d05';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, 0); ctx.lineTo(3, 1); ctx.lineTo(3.5, -5 - gapeO * 2.5); ctx.lineTo(-3, -5 - gapeO * 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#d4b96a'; ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(1, -1.5); ctx.lineTo(2.5, -4 - gapeO);
    ctx.moveTo(-0.5, -2.5); ctx.lineTo(1, -4.5 - gapeO);
    ctx.stroke();
    ctx.restore();
    // Maxillary palps — jointed, banded
    ctx.strokeStyle = '#6c757d'; ctx.lineWidth = 1.8;
    const palpWave = Math.sin(enemy.animTime * 7) * 2;
    ctx.beginPath();
    ctx.moveTo(1, 14); ctx.quadraticCurveTo(-2, 17, -4 + palpWave, 21);
    ctx.moveTo(5, 14); ctx.quadraticCurveTo(7, 17, 8 - palpWave, 21);
    ctx.stroke();
    ctx.fillStyle = '#495057';
    ctx.beginPath();
    ctx.arc(-4 + palpWave, 21, 1.5, 0, Math.PI * 2);
    ctx.arc(8 - palpWave, 21, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 9. Pair of muscular hind legs with the same take-off / apex / landing
    // kinematics as Truxalis, while retaining Oedipoda's blue tibiae.
    const lerpPoint = (a, b, amount) => [
      a[0] + (b[0] - a[0]) * amount,
      a[1] + (b[1] - a[1]) * amount
    ];
    const lerpPose = (from, to, amount) => from.map((point, index) => lerpPoint(point, to[index], amount));
    const farFolded = [[-14, -24], [-54, -44], [-37, 4]];
    const nearFolded = [[-4, -22], [-48, -39], [-26, 6]];
    const farPushOff = [[-14, -24], [-80, -60], [-106, -18]];
    const nearPushOff = [[-4, -22], [-68, -56], [-94, -14]];
    const farLanding = [[-14, -24], [-48, -12], [-22, 10]];
    const nearLanding = [[-4, -22], [-38, -8], [-4, 11]];

    let farHindLeg;
    let nearHindLeg;
    if (legMotion.airborne) {
      const jumpProgress = legMotion.jumpProgress;
      const extension = legMotion.jumpExtension;
      const targetFar = jumpProgress < 0.5 ? farPushOff : farLanding;
      const targetNear = jumpProgress < 0.5 ? nearPushOff : nearLanding;
      farHindLeg = lerpPose(farFolded, targetFar, extension);
      nearHindLeg = lerpPose(nearFolded, targetNear, extension);
    } else {
      const farStep = legMotion.stride;
      const nearStep = legMotion.oppositeStride;
      farHindLeg = [
        [-14, -24],
        [-54 + farStep * 8, -44 + Math.abs(farStep) * 3],
        [-37 + farStep * 14, 4 - farStep * 2]
      ];
      nearHindLeg = [
        [-4, -22],
        [-48 + nearStep * 8, -39 + Math.abs(nearStep) * 3],
        [-26 + nearStep * 14, 6 - nearStep * 2]
      ];
    }

    const drawHindLeg = (points, farSide = false) => {
      const [hip, knee, foot] = points;
      const femurColor = farSide ? '#59636b' : '#6c757d';
      const tibiaGrad = ctx.createLinearGradient(knee[0], knee[1], foot[0], foot[1]);
      tibiaGrad.addColorStop(0, '#0077b6');
      tibiaGrad.addColorStop(0.45, '#00b4d8');
      tibiaGrad.addColorStop(0.82, '#48cae4');
      tibiaGrad.addColorStop(1, '#0077b6');

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = farSide ? 11 : 13;
      ctx.beginPath();
      ctx.moveTo(hip[0], hip[1]);
      ctx.lineTo(knee[0], knee[1]);
      ctx.stroke();
      ctx.strokeStyle = femurColor;
      ctx.lineWidth = farSide ? 8 : 10;
      ctx.beginPath();
      ctx.moveTo(hip[0], hip[1]);
      ctx.lineTo(knee[0], knee[1]);
      ctx.stroke();

      // The dark diagonal femur bands move with the leg pose.
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1.8;
      for (let band = 1; band <= 3; band++) {
        const t = band / 4;
        const bx = hip[0] + (knee[0] - hip[0]) * t;
        const by = hip[1] + (knee[1] - hip[1]) * t;
        ctx.beginPath();
        ctx.moveTo(bx - 4, by - 3);
        ctx.lineTo(bx - 1, by + 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(knee[0], knee[1], farSide ? 4 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e9ecef';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.arc(knee[0] + 2, knee[1] - 1, 1.8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = farSide ? 6 : 7;
      ctx.beginPath();
      ctx.moveTo(knee[0], knee[1]);
      ctx.lineTo(foot[0], foot[1]);
      ctx.stroke();
      ctx.strokeStyle = tibiaGrad;
      ctx.lineWidth = farSide ? 3.8 : 5.2;
      ctx.beginPath();
      ctx.moveTo(knee[0], knee[1]);
      ctx.lineTo(foot[0], foot[1]);
      ctx.stroke();

      for (let spine = 1; spine <= 6; spine++) {
        const t = spine / 7;
        const sx = knee[0] + (foot[0] - knee[0]) * t;
        const sy = knee[1] + (foot[1] - knee[1]) * t;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 3.5, sy - 1);
        ctx.stroke();
        ctx.strokeStyle = '#050505';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(sx - 3.5, sy - 1);
        ctx.lineTo(sx - 5.5, sy - 1.5);
        ctx.stroke();
      }

      ctx.strokeStyle = tibiaGrad;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(foot[0], foot[1]);
      ctx.lineTo(foot[0] + 5, foot[1] + 1);
      ctx.lineTo(foot[0] + 8, foot[1] - 1);
      ctx.stroke();
    };

    drawHindLeg(farHindLeg, true);
    drawHindLeg(nearHindLeg, false);

    ctx.restore();
  }

  // =========================================================================
  // 4. CREATURE 3: CALLIPTAMUS ITALICUS (იტალიური კალია)
  // =========================================================================
  // =========================================================================
  // 4. CREATURE 3: CALLIPTAMUS ITALICUS (იტალიური კალია) - REAL BIOLOGY
  // =========================================================================
  drawCalliptamus(ctx, enemy) {
    ctx.save();
    const time = enemy.animTime || 0;
    const isCharging = enemy.actionState === 'red_wing_charge';
    const isStomping = enemy.actionState === 'ground_stomp';
    const isFlyingC = enemy.actionState === 'locust_swarm_flight' || !enemy.isGrounded;
    const isWingSpreadC = isCharging || isStomping || isFlyingC;
    const legMotion = this.getCreatureLegMotion(enemy, 2.6, 13);

    // 1. Ground Contact Shadow (Heavy, muscular low-slung body)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 66, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Far-side Walking Legs (Front & Middle) - Adding 3D depth
    ctx.strokeStyle = '#43281c';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(30, -14);
    ctx.lineTo(42 + legMotion.stride * 5, -2 + Math.abs(legMotion.stride) * 2);
    ctx.lineTo(46 + legMotion.stride * 10, 4 - legMotion.stride * 2); // Far front leg
    ctx.moveTo(12, -14);
    ctx.lineTo(18 + legMotion.oppositeStride * 5, -2 + Math.abs(legMotion.oppositeStride) * 2);
    ctx.lineTo(24 + legMotion.oppositeStride * 10, 4 - legMotion.oppositeStride * 2); // Far middle leg
    ctx.stroke();

    // 3. Robust Segmented Abdomen (Beneath the wings, pale buff sternites)
    const abGrad = ctx.createLinearGradient(-10, -26, -60, -14);
    abGrad.addColorStop(0, '#7f5539');
    abGrad.addColorStop(0.5, '#b08968');
    abGrad.addColorStop(1, '#604028');

    ctx.fillStyle = abGrad;
    ctx.strokeStyle = '#2b1b12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, -24);
    ctx.quadraticCurveTo(-26, -30, -62, -18);
    ctx.quadraticCurveTo(-68, -12, -60, -8);
    ctx.quadraticCurveTo(-22, -10, 10, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Abdominal sternite sutures
    ctx.strokeStyle = '#2b1b12';
    ctx.lineWidth = 1.3;
    for (let s = -10; s > -56; s -= 8) {
      ctx.beginPath();
      ctx.moveTo(s, -24);
      ctx.lineTo(s - 3, -10);
      ctx.stroke();
    }

    // 4. HINDWINGS: TRANSLUCENT VINOUS ROSE-PINK / CRIMSON RED BASE (Diagnostic Calliptamus trait!)
    if (isWingSpreadC) {
      ctx.save();
      const wingX = -14;
      const wingY = -38;

      // Basal 55%: Luminous Vinous Pink / Rose-Crimson
      const pinkGrad = ctx.createRadialGradient(wingX, wingY, 5, wingX - 10, wingY - 22, 60);
      pinkGrad.addColorStop(0, '#ff758f');
      pinkGrad.addColorStop(0.35, '#e63946');
      pinkGrad.addColorStop(0.7, '#a4161a');
      pinkGrad.addColorStop(1, 'rgba(164, 22, 26, 0.05)');

      ctx.fillStyle = pinkGrad;

      // Glow layer without shadowBlur
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = '#d90429';
      ctx.beginPath();
      ctx.moveTo(wingX + 16, wingY);
      ctx.quadraticCurveTo(wingX + 12, wingY - 68, wingX - 38, wingY - 62);
      ctx.quadraticCurveTo(wingX - 70, wingY - 44, wingX - 60, wingY + 8);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = pinkGrad;

      ctx.beginPath();
      ctx.moveTo(wingX + 16, wingY);
      ctx.quadraticCurveTo(wingX + 12, wingY - 68, wingX - 38, wingY - 62);
      ctx.quadraticCurveTo(wingX - 70, wingY - 44, wingX - 60, wingY + 8);
      ctx.closePath();
      ctx.fill();

      // Fan-pleated delicate radial veins
      ctx.strokeStyle = 'rgba(255, 200, 215, 0.45)';
      ctx.lineWidth = 1.2;
      for (let a = -1.6; a < -0.35; a += 0.18) {
        ctx.beginPath();
        ctx.moveTo(wingX + 12, wingY);
        ctx.lineTo(wingX + 12 + Math.cos(a) * 60, wingY + Math.sin(a) * 60);
        ctx.stroke();
      }

      // Outer margin: Glassy clear hyaline wing apex
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.strokeStyle = '#4a0e17';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(wingX - 44, wingY - 56, 18, 10, -0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    } else {
      // The rose-pink hindwing remains fully concealed beneath the tegmina.
    }

    if (!isWingSpreadC) {
      // 5. Tegmina (Folded Forewings - Earthy Ochre & Clay with Leopard Mosaic Flecks)
      ctx.save();
      const tegGrad = ctx.createLinearGradient(20, -40, -72, -18);
    tegGrad.addColorStop(0, '#ddb892');
    tegGrad.addColorStop(0.3, '#b08968');
    tegGrad.addColorStop(0.7, '#7f5539');
    tegGrad.addColorStop(1, '#582f0e');

    ctx.fillStyle = tegGrad;
    ctx.strokeStyle = '#2b1b12';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(18, -36);
    ctx.quadraticCurveTo(-15, -50, -70, -28); // Raised dorsal margin, nearly head height.
    ctx.quadraticCurveTo(-76, -21, -68, -14); // Wing apex
    ctx.quadraticCurveTo(-20, -20, 16, -27); // Ventral margin lying along the abdomen.
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Raised longitudinal veins (Subcosta, Radius, Media, Cubitus)
    ctx.strokeStyle = '#eed7c5';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(16, -34);
    ctx.quadraticCurveTo(-15, -44, -66, -25);
    ctx.moveTo(16, -30);
    ctx.quadraticCurveTo(-15, -36, -64, -21);
    ctx.stroke();

    // DIAGNOSTIC CALLIPTAMUS PATTERN: Dense leopard / mosaic of dark brown/black rectangular spots!
    ctx.fillStyle = '#261208';
    const spots = [
      { x: 8, y: -29, w: 4, h: 3 }, { x: 0, y: -31, w: 5, h: 3.5 },
      { x: -8, y: -30, w: 6, h: 4 }, { x: -16, y: -29, w: 5, h: 3.5 },
      { x: -24, y: -27, w: 7, h: 4 }, { x: -33, y: -26, w: 6, h: 3.5 },
      { x: -42, y: -24, w: 5, h: 3 }, { x: -50, y: -22, w: 6, h: 3 },
      { x: -58, y: -20, w: 4, h: 2.5 },
      // Secondary row of speckles
      { x: -4, y: -25, w: 3.5, h: 2.5 }, { x: -14, y: -23, w: 4, h: 2.5 },
      { x: -28, y: -21, w: 4.5, h: 2.5 }, { x: -38, y: -19, w: 4, h: 2 }
    ];
    spots.forEach(sp => {
      ctx.beginPath();
      ctx.rect(sp.x, sp.y, sp.w, sp.h);
      ctx.fill();
    });

      ctx.restore();

    // At rest the pink hindwing is hidden under the pair of overlapping,
    // earth-coloured tegmina. Keep the fold seam and hinge visible without
    // leaking the flight colour into the grounded camouflage pose.
      ctx.save();
      ctx.strokeStyle = '#2b1b12';
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.moveTo(13, -37);
      ctx.quadraticCurveTo(-18, -51, -72, -30);
      ctx.quadraticCurveTo(-45, -33, 7, -33);
      ctx.stroke();

      ctx.strokeStyle = '#eed7c5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(9, -34);
      ctx.quadraticCurveTo(-20, -45, -66, -26);
      ctx.stroke();

      ctx.fillStyle = '#43281c';
      ctx.beginPath();
      ctx.ellipse(9, -29, 4.8, 2.7, -0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Near-side Walking Legs (Front & Middle) - Sturdy, muscular, mottled earth-brown
    const drawNearLeg = (baseX, baseY, kneeX, kneeY, footX, footY) => {
      ctx.strokeStyle = '#7f5539';
      ctx.lineWidth = 4.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();

      // Dark spotting on legs
      ctx.strokeStyle = '#2b1b12';
      ctx.lineWidth = 4.6;
      ctx.beginPath();
      ctx.moveTo((baseX + kneeX) * 0.5 - 2, (baseY + kneeY) * 0.5);
      ctx.lineTo((baseX + kneeX) * 0.5 + 2, (baseY + kneeY) * 0.5);
      ctx.moveTo((kneeX + footX) * 0.5 - 2, (kneeY + footY) * 0.5);
      ctx.lineTo((kneeX + footX) * 0.5 + 2, (kneeY + footY) * 0.5);
      ctx.stroke();

      // Foot claws & pad
      ctx.strokeStyle = '#2b1b12';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(footX, footY);
      ctx.lineTo(footX + 3.5, footY + 1);
      ctx.stroke();
    };

    drawNearLeg(28, -16, 38 + legMotion.oppositeStride * 6, -8 + Math.abs(legMotion.oppositeStride) * 2, 46 + legMotion.oppositeStride * 11, 4 - legMotion.oppositeStride * 2); // Near front leg
    drawNearLeg(12, -16, 18 + legMotion.stride * 6, -6 + Math.abs(legMotion.stride) * 2, 24 + legMotion.stride * 11, 4 - legMotion.stride * 2); // Near middle leg

    // 7. PRONOTUM: THE ICONIC 3-KEELED SADDLE SHIELD (Carina Median & 2 Lateral Keels)
    const pronGrad = ctx.createLinearGradient(6, -44, 28, -18);
    pronGrad.addColorStop(0, '#582f0e');
    pronGrad.addColorStop(0.4, '#7f5539');
    pronGrad.addColorStop(0.85, '#9c6644');
    pronGrad.addColorStop(1, '#43281c');

    ctx.fillStyle = pronGrad;
    ctx.strokeStyle = '#24140b';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(4, -43); // Posterior crest angle
    ctx.quadraticCurveTo(18, -46, 32, -39); // Dorsal crest ridge
    ctx.lineTo(28, -16); // Anterior lower margin
    ctx.lineTo(4, -16); // Posterior lower margin
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3 Sharp Parallel Longitudinal Keels (Carinae - Calliptamus hallmark!)
    // 1. Median dorsal keel
    ctx.strokeStyle = '#ddb892';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(5, -43);
    ctx.quadraticCurveTo(18, -46, 31, -39);
    ctx.stroke();

    // 2. Upper lateral keel
    ctx.strokeStyle = '#ffe8d6';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(5, -36);
    ctx.lineTo(29, -32);
    ctx.stroke();

    // 3. Lower lateral keel / pale lobe margin
    ctx.strokeStyle = '#ddb892';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(6, -18);
    ctx.lineTo(26, -18);
    ctx.stroke();

    // Fine granulations / punctures on pronotum
    ctx.fillStyle = '#24140b';
    ctx.beginPath();
    ctx.arc(12, -28, 1.8, 0, Math.PI * 2);
    ctx.arc(22, -26, 2.2, 0, Math.PI * 2);
    ctx.arc(16, -22, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // 8. Massive Blunt Head, Strong Jaws, Eyes & Antennae
    ctx.save();
    const headX = 36;
    const headY = -27;
    ctx.translate(headX, headY);

    // Large rounded blunt head capsule (Clay-buff and earth-brown)
    const headGrad = ctx.createRadialGradient(2, -4, 2, 0, 0, 18);
    headGrad.addColorStop(0, '#ddb892');
    headGrad.addColorStop(0.6, '#9c6644');
    headGrad.addColorStop(1, '#43281c');

    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#24140b';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-10, -18);
    ctx.lineTo(6, -16); // Broad fastigium
    ctx.lineTo(13, 2); // Broad frons face
    ctx.lineTo(5, 16); // Lower mouthparts
    ctx.lineTo(-8, 9); // Gena
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Short to medium filiform antennae (reddish-brown)
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    const antWave = Math.sin(time * 3.5) * 3;
    ctx.strokeStyle = '#8c2f1b';
    ctx.beginPath();
    ctx.moveTo(4, -16);
    ctx.quadraticCurveTo(14, -28 + antWave, 24, -36 + antWave);
    ctx.stroke();

    // Antenna segments
    ctx.strokeStyle = '#ddb892';
    ctx.lineWidth = 1.8;
    for (let an = 0; an < 3; an++) {
      const at = 0.3 + an * 0.25;
      const ax = 4 + (24 - 4) * at;
      const ay = -16 + (-36 + antWave - (-16)) * at;
      ctx.beginPath();
      ctx.moveTo(ax - 1, ay);
      ctx.lineTo(ax + 1, ay);
      ctx.stroke();
    }

    // Large Vertical Oval Compound Eye (Warm amber-brown with vertical dark stripes)
    ctx.fillStyle = '#7f4f24';
    ctx.strokeStyle = '#24140b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(-1, -7, 6, 8.5, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Vertical dark eye stripes
    ctx.fillStyle = '#24140b';
    ctx.fillRect(-2, -14, 2.5, 13);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2, -10, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // ANIMATED MANDIBLES — Calliptamus is omnivorous; strong, dark, toothed mandibles
    // More powerful than typical grasshoppers — opens on red_wing_charge & ground_stomp
    const isAtkC = !enemy.isDead && enemy.actionState !== 'idle';
    const gapeC = isAtkC
      ? (0.6 + Math.sin(enemy.animTime * 20) * 0.4)
      : (0.07 + Math.abs(Math.sin(enemy.animTime * 3.5)) * 0.06);

    // Dark oral cavity
    if (gapeC > 0.07) {
      ctx.fillStyle = '#0a0505';
      ctx.beginPath();
      ctx.ellipse(5, 12 + gapeC * 3.5, 4 + gapeC * 2, 2 + gapeC * 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Upper mandible (heavier, stouter than Oedipoda)
    ctx.save();
    ctx.translate(5, 11);
    ctx.rotate(-gapeC * 0.45);
    ctx.fillStyle = '#1e110a';
    ctx.strokeStyle = '#0d0503';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-5, 0); ctx.lineTo(5, -1); ctx.lineTo(6, 6 + gapeC * 3); ctx.lineTo(-4, 6 + gapeC * 2.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Prominent molar ridge (Calliptamus grinds hard seeds)
    ctx.strokeStyle = '#c9a96e'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, 2); ctx.lineTo(4, 5 + gapeC * 1.2);
    ctx.moveTo(-0.5, 3); ctx.lineTo(1.5, 5.5 + gapeC);
    ctx.moveTo(-2.5, 4); ctx.lineTo(-1, 6 + gapeC * 0.8);
    ctx.stroke();
    ctx.restore();
    // Lower mandible
    ctx.save();
    ctx.translate(5, 15);
    ctx.rotate(gapeC * 0.45);
    ctx.fillStyle = '#1e110a';
    ctx.strokeStyle = '#0d0503';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-5, 0); ctx.lineTo(5, 1); ctx.lineTo(6, -6 - gapeC * 3); ctx.lineTo(-4, -6 - gapeC * 2.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#c9a96e'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, -2); ctx.lineTo(4, -5 - gapeC * 1.2);
    ctx.moveTo(-0.5, -3); ctx.lineTo(1.5, -5.5 - gapeC);
    ctx.stroke();
    ctx.restore();
    // Labrum
    ctx.fillStyle = '#43281c';
    ctx.beginPath();
    ctx.moveTo(-2, 10); ctx.lineTo(9, 10); ctx.lineTo(8, 13); ctx.lineTo(-1, 13);
    ctx.closePath(); ctx.fill();
    // Maxillary palps (reddish-brown)
    ctx.strokeStyle = '#b08968'; ctx.lineWidth = 2;
    const palpW = Math.sin(enemy.animTime * 7) * 2;
    ctx.beginPath();
    ctx.moveTo(1, 13); ctx.quadraticCurveTo(-2, 17, -3 + palpW, 21);
    ctx.moveTo(7, 13); ctx.quadraticCurveTo(9, 17, 10 - palpW, 21);
    ctx.stroke();
    ctx.fillStyle = '#9c6644';
    ctx.beginPath();
    ctx.arc(-3 + palpW, 21, 1.6, 0, Math.PI * 2);
    ctx.arc(10 - palpW, 21, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 9. Pair of muscular hind legs with the same take-off / apex / landing
    // kinematics as Truxalis, retaining Calliptamus' red tibia and chevrons.
    const lerpPoint = (a, b, amount) => [
      a[0] + (b[0] - a[0]) * amount,
      a[1] + (b[1] - a[1]) * amount
    ];
    const lerpPose = (from, to, amount) => from.map((point, index) => lerpPoint(point, to[index], amount));
    const farFolded = [[-14, -24], [-58, -45], [-35, 4]];
    const nearFolded = [[-4, -22], [-50, -40], [-25, 7]];
    const farPushOff = [[-14, -24], [-84, -60], [-110, -18]];
    const nearPushOff = [[-4, -22], [-72, -56], [-98, -14]];
    const farLanding = [[-14, -24], [-50, -12], [-22, 10]];
    const nearLanding = [[-4, -22], [-40, -8], [-4, 11]];

    let farHindLeg;
    let nearHindLeg;
    if (legMotion.airborne) {
      const jumpProgress = legMotion.jumpProgress;
      const extension = legMotion.jumpExtension;
      const targetFar = jumpProgress < 0.5 ? farPushOff : farLanding;
      const targetNear = jumpProgress < 0.5 ? nearPushOff : nearLanding;
      farHindLeg = lerpPose(farFolded, targetFar, extension);
      nearHindLeg = lerpPose(nearFolded, targetNear, extension);
    } else {
      const farStep = legMotion.stride;
      const nearStep = legMotion.oppositeStride;
      farHindLeg = [
        [-14, -24],
        [-58 + farStep * 8, -45 + Math.abs(farStep) * 3],
        [-35 + farStep * 14, 4 - farStep * 2]
      ];
      nearHindLeg = [
        [-4, -22],
        [-50 + nearStep * 8, -40 + Math.abs(nearStep) * 3],
        [-25 + nearStep * 14, 7 - nearStep * 2]
      ];
    }

    const drawHindLeg = (points, farSide = false) => {
      const [hip, knee, foot] = points;
      const femurColor = farSide ? '#79513a' : '#9c6644';
      const tibiaGrad = ctx.createLinearGradient(knee[0], knee[1], foot[0], foot[1]);
      tibiaGrad.addColorStop(0, '#a4161a');
      tibiaGrad.addColorStop(0.35, '#d90429');
      tibiaGrad.addColorStop(0.75, '#e63946');
      tibiaGrad.addColorStop(1, '#a4161a');

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#24140b';
      ctx.lineWidth = farSide ? 12 : 14;
      ctx.beginPath();
      ctx.moveTo(hip[0], hip[1]);
      ctx.lineTo(knee[0], knee[1]);
      ctx.stroke();
      ctx.strokeStyle = femurColor;
      ctx.lineWidth = farSide ? 9 : 11;
      ctx.beginPath();
      ctx.moveTo(hip[0], hip[1]);
      ctx.lineTo(knee[0], knee[1]);
      ctx.stroke();

      ctx.strokeStyle = '#261208';
      ctx.lineWidth = 2;
      for (let chevron = 1; chevron <= 3; chevron++) {
        const t = chevron / 4;
        const cx = hip[0] + (knee[0] - hip[0]) * t;
        const cy = hip[1] + (knee[1] - hip[1]) * t;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 4);
        ctx.lineTo(cx - 1, cy + 2);
        ctx.lineTo(cx - 5, cy + 4);
        ctx.stroke();
      }

      ctx.fillStyle = '#1c1008';
      ctx.beginPath();
      ctx.arc(knee[0], knee[1], farSide ? 4.5 : 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d90429';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(knee[0], knee[1]);
      ctx.lineTo(foot[0], foot[1]);
      ctx.stroke();
      ctx.strokeStyle = tibiaGrad;
      ctx.lineWidth = farSide ? 4.2 : 5.6;
      ctx.beginPath();
      ctx.moveTo(knee[0], knee[1]);
      ctx.lineTo(foot[0], foot[1]);
      ctx.stroke();

      for (let spine = 1; spine <= 7; spine++) {
        const t = spine / 8;
        const sx = knee[0] + (foot[0] - knee[0]) * t;
        const sy = knee[1] + (foot[1] - knee[1]) * t;
        ctx.strokeStyle = '#fff3b0';
        ctx.lineWidth = 2.3;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 4, sy - 1);
        ctx.stroke();
        ctx.strokeStyle = '#050505';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy - 1);
        ctx.lineTo(sx - 6, sy - 1.5);
        ctx.stroke();
      }

      ctx.strokeStyle = tibiaGrad;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(foot[0], foot[1]);
      ctx.lineTo(foot[0] + 5, foot[1] + 1);
      ctx.lineTo(foot[0] + 8, foot[1] - 1);
      ctx.stroke();
    };

    drawHindLeg(farHindLeg, true);
    drawHindLeg(nearHindLeg, false);

    ctx.restore();
  }

  // =========================================================================
  // 5. CREATURE 4: KATYDID / TETTIGONIIDAE (მწვანე კუტკალია) - TRUE BIOLOGY
  // =========================================================================
  drawKatydid(ctx, enemy) {
    ctx.save();
    const time = enemy.animTime || 0;
    const isAttacking = !enemy.isDead && enemy.actionState !== 'idle';
    const isSinging = enemy.actionState === 'sonic_stridulation';
    const isBiting = enemy.actionState === 'mandible_bite';
    const legMotion = this.getCreatureLegMotion(enemy, 2.8, 14);

    // 1. Ground Contact Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 75, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Far-side Legs (Front, Middle, Hind) - full 3D depth
    // Far Front Leg (with tibial hearing slit!)
    ctx.strokeStyle = '#2d6a4f';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(25, -22);
    ctx.lineTo(38 + legMotion.stride * 5, -8 + Math.abs(legMotion.stride) * 2);
    ctx.lineTo(44 + legMotion.stride * 10, 4 - legMotion.stride * 2);
    ctx.stroke();

    // Far Middle Leg
    ctx.beginPath();
    ctx.moveTo(6, -22);
    ctx.lineTo(14 + legMotion.oppositeStride * 5, -8 + Math.abs(legMotion.oppositeStride) * 2);
    ctx.lineTo(20 + legMotion.oppositeStride * 10, 4 - legMotion.oppositeStride * 2);
    ctx.stroke();

    // Far Hind Jumping Leg (Deep background)
    ctx.strokeStyle = '#1b4332';
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(-18, -26);
    ctx.lineTo(-58 - legMotion.stride * 8, -72 + legMotion.stride * 12);
    ctx.lineTo(-38 - legMotion.stride * 12, 4 - legMotion.stride * 3);
    ctx.stroke();

    // 3. Abdomen (Soft Yellowish-Lime Green Segmented Body beneath the wings)
    const abBreath = Math.sin(time * 3) * 1.5;
    const abGrad = ctx.createLinearGradient(-10, -28, -65, -18);
    abGrad.addColorStop(0, '#52b788');
    abGrad.addColorStop(0.5, '#74c69d');
    abGrad.addColorStop(1, '#40916c');

    ctx.fillStyle = abGrad;
    ctx.strokeStyle = '#1b4332';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(8, -26);
    ctx.quadraticCurveTo(-26, -32 + abBreath, -64, -20 + abBreath);
    ctx.quadraticCurveTo(-70, -15 + abBreath, -62, -10 + abBreath);
    ctx.quadraticCurveTo(-22, -12, 8, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Abdominal segment rings
    ctx.strokeStyle = '#2d6a4f';
    ctx.lineWidth = 1.2;
    for (let s = -12; s > -60; s -= 7.5) {
      ctx.beginPath();
      ctx.moveTo(s, -26 + abBreath * 0.5);
      ctx.lineTo(s - 2, -12 + abBreath * 0.5);
      ctx.stroke();
    }

    // 4. Saber-shaped Ovipositor / Cerci (The iconic Katydid sword tail!)
    ctx.fillStyle = '#b7e4c7';
    ctx.strokeStyle = '#1b4332';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-64, -18 + abBreath);
    ctx.quadraticCurveTo(-82, -28 + abBreath, -96, -42 + abBreath); // upward curved saber blade
    ctx.quadraticCurveTo(-84, -22 + abBreath, -62, -12 + abBreath);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Forewings (Tegmina - FOLIACEOUS LEAF MIMICRY)
    // Modeled with true tent-like roof shape, dicot branching venation & reticulated cell mesh!
    ctx.save();
    const wingFlap = isSinging ? Math.sin(time * 35) * 4 : 0;
    ctx.translate(0, wingFlap);

    // Leaf Tegmen Base Gradient
    const leafGrad = ctx.createLinearGradient(-70, -48, 35, -15);
    leafGrad.addColorStop(0, '#1b4332');
    leafGrad.addColorStop(0.25, '#2d6a4f');
    leafGrad.addColorStop(0.65, '#52b788');
    leafGrad.addColorStop(0.9, '#74c69d');
    leafGrad.addColorStop(1, '#95d5b2');

    ctx.fillStyle = leafGrad;
    ctx.strokeStyle = '#081c15';
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(18, -38); // anterior base at pronotum
    ctx.quadraticCurveTo(-20, -56, -72, -34); // arched dorsal leaf margin
    ctx.quadraticCurveTo(-80, -28, -75, -20); // acute leaf tip
    ctx.quadraticCurveTo(-25, -16, 14, -26); // ventral margin
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Distinct "Leaf Midrib" (Central longitudinal primary vein)
    ctx.strokeStyle = '#b7e4c7';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(16, -34);
    ctx.quadraticCurveTo(-25, -36, -75, -24);
    ctx.stroke();

    // Branching lateral leaf veins (Costal & Radial pectinate secondary veins)
    ctx.strokeStyle = '#95d5b2';
    ctx.lineWidth = 1.4;
    for (let v = -55; v < 15; v += 10) {
      const t = (v + 55) / 70;
      const midY = -34 - Math.sin(t * Math.PI) * 2;
      // Dorsal leaf branch
      ctx.beginPath();
      ctx.moveTo(v, midY);
      ctx.quadraticCurveTo(v - 6, midY - 8, v - 10, midY - 14);
      ctx.stroke();
      // Ventral leaf branch
      ctx.beginPath();
      ctx.moveTo(v, midY);
      ctx.quadraticCurveTo(v - 4, midY + 6, v - 8, midY + 10);
      ctx.stroke();
    }

    // Dense fine reticulated cell network (the micro-vein texture of a real leaf!)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 0.8;
    for (let r = -60; r < 5; r += 14) {
      ctx.beginPath();
      ctx.moveTo(r, -44); ctx.lineTo(r + 6, -38);
      ctx.moveTo(r - 4, -28); ctx.lineTo(r + 2, -20);
      ctx.stroke();
    }

    // Biological leaf blemishes (Realistic brown necrotic camouflage spots)
    ctx.fillStyle = '#6f4e37';
    ctx.beginPath();
    ctx.ellipse(-32, -42, 3, 2, 0.3, 0, Math.PI * 2);
    ctx.ellipse(-10, -22, 2.5, 1.8, -0.4, 0, Math.PI * 2);
    ctx.ellipse(-52, -28, 2, 1.5, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 6. Stridulatory Apparatus (Glassy circular sound mirror with sclerotized scraper frame!)
    ctx.fillStyle = 'rgba(230, 245, 225, 0.75)';
    ctx.strokeStyle = '#402e1c';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(6, -42, 7, 9, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Chitinous scraper file line
    ctx.strokeStyle = '#603813';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(2, -48);
    ctx.lineTo(9, -36);
    ctx.stroke();

    ctx.restore(); // restore wing translation

    // 7. Pronotum (Saddle-shaped Prothoracic Shield)
    const pronGrad = ctx.createLinearGradient(10, -46, 32, -24);
    pronGrad.addColorStop(0, '#40916c');
    pronGrad.addColorStop(0.5, '#52b788');
    pronGrad.addColorStop(1, '#2d6a4f');

    ctx.fillStyle = pronGrad;
    ctx.strokeStyle = '#081c15';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(12, -46); // posterior dorsal crest
    ctx.lineTo(30, -42); // anterior margin
    ctx.lineTo(32, -22); // lower anterior lobe
    ctx.lineTo(14, -24); // lower posterior lobe
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pronotum yellow/amber median dorsal stripe
    ctx.strokeStyle = '#e9d8a6';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(12, -45);
    ctx.lineTo(30, -41);
    ctx.stroke();

    // 8. Head (Smooth, Vertical Emerald Green Fastigium & Epicranium)
    const headGrad = ctx.createRadialGradient(38, -32, 3, 38, -32, 16);
    headGrad.addColorStop(0, '#74c69d');
    headGrad.addColorStop(0.6, '#52b788');
    headGrad.addColorStop(1, '#1b4332');

    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#081c15';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(26, -41); // neck joint
    ctx.quadraticCurveTo(38, -46, 44, -38); // vertex / high fastigium
    ctx.lineTo(47, -22); // vertical frons face
    ctx.lineTo(41, -12); // clypeus / mouth base
    ctx.lineTo(28, -21); // cheek gena
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Large Golden-Green Compound Eye with dark central pseudopupil
    ctx.fillStyle = '#ffb703';
    ctx.strokeStyle = '#081c15';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(39, -35, 5, 6.5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#080808';
    ctx.beginPath();
    ctx.arc(40, -35, 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(38, -37, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // 9. Ultra-Long Hair-Thin Antennae (1.5x body length sweeping gracefully back!)
    ctx.strokeStyle = '#b7e4c7';
    ctx.lineWidth = 1.4;
    const antSway = Math.sin(time * 5) * 4;
    ctx.beginPath();
    ctx.moveTo(42, -39);
    ctx.bezierCurveTo(75, -85 + antSway, 130, -115 + antSway, 185, -100 + antSway);
    ctx.moveTo(40, -41);
    ctx.bezierCurveTo(65, -95 - antSway, 115, -125 - antSway, 170, -112 - antSway);
    ctx.stroke();

    // 10. ANIMATED FORMIDABLE SABER MANDIBLES & MOUTH
    // Katydids have terrifying predatory jaws with hooked cutting teeth
    const gapeK = isAttacking
      ? (0.7 + Math.sin(time * 22) * 0.3)
      : (0.08 + Math.abs(Math.sin(time * 3)) * 0.06);

    // Dark oral cavity
    if (gapeK > 0.08) {
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.ellipse(43, -13 + gapeK * 2.5, 4.5 + gapeK * 2, 2.5 + gapeK * 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Upper mandible (Left saber jaw)
    ctx.save();
    ctx.translate(43, -15);
    ctx.rotate(-gapeK * 0.55);
    ctx.fillStyle = '#2b1b12';
    ctx.strokeStyle = '#0f0804';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.quadraticCurveTo(1, -1, 5, 5 + gapeK * 4.5);
    ctx.lineTo(1.5, 7 + gapeK * 5);
    ctx.quadraticCurveTo(-2, 3.5, -5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Hooked sharp apical tooth
    ctx.strokeStyle = '#ffeedd';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(3, 4 + gapeK * 3.5);
    ctx.lineTo(5.5, 7.5 + gapeK * 4.5);
    ctx.stroke();
    ctx.restore();

    // Lower mandible (Right saber jaw)
    ctx.save();
    ctx.translate(43, -11);
    ctx.rotate(gapeK * 0.55);
    ctx.fillStyle = '#2b1b12';
    ctx.strokeStyle = '#0f0804';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.quadraticCurveTo(1, 1, 5, -5 - gapeK * 4.5);
    ctx.lineTo(1.5, -7 - gapeK * 5);
    ctx.quadraticCurveTo(-2, -3.5, -5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ffeedd';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(3, -4 - gapeK * 3.5);
    ctx.lineTo(5.5, -7.5 - gapeK * 4.5);
    ctx.stroke();
    ctx.restore();

    // Sensory Maxillary Palps
    ctx.strokeStyle = '#52b788';
    ctx.lineWidth = 1.8;
    const palpK = Math.sin(time * 7) * 2;
    ctx.beginPath();
    ctx.moveTo(40, -11); ctx.lineTo(36 - palpK, -3);
    ctx.moveTo(45, -11); ctx.lineTo(49 + palpK, -3);
    ctx.stroke();
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    ctx.arc(36 - palpK, -3, 1.5, 0, Math.PI * 2);
    ctx.arc(49 + palpK, -3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 11. Near-side Walking Legs (Front & Middle with TYMPANAL HEARING SLIT!)
    // Near Front Leg (Active hunting posture)
    const frontStep = legMotion.oppositeStride;
    const middleStep = legMotion.stride;
    ctx.strokeStyle = '#40916c';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(30, -22);
    ctx.lineTo(44 + frontStep * 6, -10 + Math.abs(frontStep) * 2);
    ctx.lineTo(52 + frontStep * 12, 4 - frontStep * 2);
    ctx.stroke();
    // Tympanal organ (The katydid ear on front tibia!)
    ctx.fillStyle = '#1b4332';
    ctx.beginPath();
    ctx.ellipse(45, -8, 2.5, 1.2, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Tibial spines
    ctx.strokeStyle = '#081c15';
    ctx.lineWidth = 1.2;
    for (let sp = 0; sp < 4; sp++) {
      const sx = 46 + frontStep * 5 + sp * 1.5;
      const sy = -6 + Math.abs(frontStep) * 1.5 + sp * 2.8;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 2.5, sy + 1);
      ctx.stroke();
    }

    // Near Middle Leg
    ctx.strokeStyle = '#40916c';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(12, -22);
    ctx.lineTo(22 + middleStep * 6, -10 + Math.abs(middleStep) * 2);
    ctx.lineTo(30 + middleStep * 12, 4 - middleStep * 2);
    ctx.stroke();

    // 12. Near Hind Jumping Leg (ENORMOUS, ELONGATED, WITH MUSCULAR FEMUR & SPINY TIBIA!)
    const biteProgress = isBiting
      ? Math.max(0, Math.min(1, (28 - (enemy.actionTimer || 0)) / 28))
      : 0;
    const kickMove = isBiting
      ? biteProgress * 15
      : (legMotion.airborne ? (legMotion.jumpExtension - 0.5) * 24 : legMotion.stride * 3);
    // Muscular Femur
    const femGrad = ctx.createLinearGradient(-15, -26, -58, -78);
    femGrad.addColorStop(0, '#74c69d');
    femGrad.addColorStop(0.5, '#52b788');
    femGrad.addColorStop(1, '#2d6a4f');

    ctx.fillStyle = femGrad;
    ctx.strokeStyle = '#081c15';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-12, -26);
    ctx.quadraticCurveTo(-32, -62 + kickMove, -56, -78 + kickMove); // arched dorsal crest
    ctx.lineTo(-64, -73 + kickMove); // knee
    ctx.quadraticCurveTo(-36, -34, -16, -20); // ventral margin
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Chevron muscle pattern on femur
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.2;
    for (let c = 0; c < 6; c++) {
      const cx = -18 - c * 7;
      const cy = -32 - c * 7 + kickMove * (c / 6);
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - 2);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx - 2, cy + 3);
      ctx.stroke();
    }

    // Long Slender Tibia
    ctx.strokeStyle = '#52b788';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(-60, -75 + kickMove);
    ctx.lineTo(-34, 4);
    ctx.stroke();

    // Rows of sharp spines along hind tibia
    ctx.strokeStyle = '#081c15';
    ctx.lineWidth = 1.5;
    for (let sp = 0; sp < 7; sp++) {
      const tx = -58 + sp * 3.4;
      const ty = -70 + kickMove + sp * 10.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - 3.5, ty - 1.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  // =========================================================================
  // 6. CREATURE 5: HYLA ORIENTALIS (აღმოსავლური ვასაკა - ხის ბაყაყი)
  // =========================================================================
  drawHylaFrog(ctx, enemy) {
    ctx.save();
    const time = enemy.animTime || 0;
    const airborne = !enemy.isGrounded;
    const legMotion = this.getCreatureLegMotion(enemy, 2.6, 18);
    const groundOffset = Math.max(0, (enemy.groundY ?? 560) - enemy.y);
    const shadowY = airborne ? groundOffset + 8 : 6;

    // Tree frogs have a light, compact body with long angular limbs and a
    // high-contrast lateral stripe. Keep the silhouette readable while adding
    // the species-level landmarks: tympanum, horizontal pupil, vocal sac,
    // yellow inner thighs, and adhesive toe discs.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(0, shadowY, airborne ? 43 : 68, airborne ? 8 : 13, 0, 0, Math.PI * 2);
    ctx.fill();

    const drawLimb = (points, color, width) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#164b22';
      ctx.lineWidth = width + 4;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.stroke();
    };
    const drawToePads = (x, y, spread = 1) => {
      ctx.fillStyle = '#b8d957';
      ctx.strokeStyle = '#2c6e34';
      ctx.lineWidth = 1.2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.ellipse(x + i * 6 * spread, y - Math.abs(i) * 1.5, 4.2, 3.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    };

    // Explicit frog hind-leg kinematics:
    // grounded = compact Z-shaped crouch, rising = powerful push-off,
    // apex = tucked knees, falling = feet reaching down for the landing.
    const lerpPoint = (a, b, amount) => [
      a[0] + (b[0] - a[0]) * amount,
      a[1] + (b[1] - a[1]) * amount
    ];
    const lerpPose = (from, to, amount) => from.map((point, index) => lerpPoint(point, to[index], amount));
    // A frog's resting hind legs are not straight struts: the thigh reaches
    // out to the knee and the shin folds back underneath the body. Keep the
    // two knees visibly opposite so the crouch reads clearly in silhouette.
    const farFolded = [[-29, -27], [-58, -8], [-39, 9]];
    const nearFolded = [[-4, -24], [25, -5], [5, 10]];
    const farPushOff = [[-28, -27], [-70, -30], [-94, 12]];
    const nearPushOff = [[-9, -23], [-45, -28], [-70, 13]];
    const farLanding = [[-28, -27], [-44, 4], [-2, 14]];
    const nearLanding = [[-9, -23], [-12, 5], [39, 14]];

    let farHindPoints;
    let nearHindPoints;
    if (airborne) {
      const jumpProgress = legMotion.jumpProgress;
      const towardExtendedPose = jumpProgress < 0.5
        ? 1 - jumpProgress * 2
        : (jumpProgress - 0.5) * 2;
      const farTarget = jumpProgress < 0.5 ? farPushOff : farLanding;
      const nearTarget = jumpProgress < 0.5 ? nearPushOff : nearLanding;
      farHindPoints = lerpPose(farFolded, farTarget, towardExtendedPose);
      nearHindPoints = lerpPose(nearFolded, nearTarget, towardExtendedPose);
    } else {
      const farStep = legMotion.stride;
      const nearStep = legMotion.oppositeStride;
      farHindPoints = [
        [-29, -27],
        [-58 + farStep * 8, -8 + Math.abs(farStep) * 2],
        [-39 + farStep * 14, 9 - farStep * 2]
      ];
      nearHindPoints = [
        [-4, -24],
        [25 + nearStep * 7, -5 + Math.abs(nearStep) * 2],
        [5 + nearStep * 14, 10 - nearStep * 2]
      ];
    }

    drawLimb(farHindPoints, '#3f9440', 10);
    drawLimb([farHindPoints[1], farHindPoints[2]], '#61a83f', 8);
    ctx.fillStyle = '#d5b447';
    ctx.beginPath();
    ctx.ellipse(farHindPoints[1][0] + 5, farHindPoints[1][1] + 2, 13, 9, -0.28, 0, Math.PI * 2);
    ctx.fill();
    drawToePads(farHindPoints[2][0], farHindPoints[2][1] + 1, 1.05);

    // Moist glossy body with a compact, rounded trunk.
    const frogGrad = ctx.createRadialGradient(4, -61, 4, -4, -31, 58);
    frogGrad.addColorStop(0, '#c5e86c');
    frogGrad.addColorStop(0.28, '#7fbe45');
    frogGrad.addColorStop(0.72, '#3f9440');
    frogGrad.addColorStop(1, '#1d5b2a');
    ctx.fillStyle = frogGrad;
    ctx.strokeStyle = '#123d1c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(-7, -38, 50, 27, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cream belly and a few soft skin speckles break up the flat green fill.
    ctx.fillStyle = '#dce8bd';
    ctx.beginPath();
    ctx.ellipse(7, -20, 34, 12, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(25, 87, 42, 0.35)';
    [[-24, -48, 2.2], [-11, -55, 1.6], [2, -48, 1.8], [-3, -29, 1.4], [18, -35, 1.3]].forEach(([sx, sy, sr]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    });

    // Broad wedge-shaped head, characteristic golden eye, and visible tympanum.
    ctx.fillStyle = frogGrad;
    ctx.beginPath();
    ctx.moveTo(-20, -60);
    ctx.quadraticCurveTo(0, -87, 31, -84);
    ctx.quadraticCurveTo(60, -81, 65, -61);
    ctx.quadraticCurveTo(58, -46, 28, -45);
    ctx.quadraticCurveTo(-3, -45, -20, -60);
    ctx.fill();
    ctx.stroke();

    // Pale border around the dark eye-to-groin flank stripe.
    ctx.strokeStyle = '#dfe7b3';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(63, -63);
    ctx.lineTo(47, -76);
    ctx.quadraticCurveTo(23, -68, 4, -56);
    ctx.quadraticCurveTo(-22, -45, -43, -28);
    ctx.stroke();
    ctx.strokeStyle = '#33251f';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(63, -63);
    ctx.lineTo(47, -76);
    ctx.quadraticCurveTo(23, -68, 4, -56);
    ctx.quadraticCurveTo(-22, -45, -43, -28);
    ctx.stroke();

    // Near eye: bronze iris, horizontal pupil, and wet corneal highlight.
    ctx.fillStyle = '#d9ad3a';
    ctx.beginPath();
    ctx.arc(42, -78, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b4f1d';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.ellipse(42, -78, 8.5, 2.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffbe6';
    ctx.beginPath();
    ctx.arc(38.5, -82, 2.4, 0, Math.PI * 2);
    ctx.fill();
    // Far eye peeks over the crown in a three-quarter silhouette.
    ctx.fillStyle = '#a67c25';
    ctx.beginPath();
    ctx.arc(24, -82, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1712';
    ctx.beginPath();
    ctx.ellipse(24, -82, 5, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tympanum and nostril.
    ctx.fillStyle = 'rgba(74, 64, 42, 0.7)';
    ctx.beginPath();
    ctx.arc(23, -62, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(214, 202, 135, 0.75)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#1e2a18';
    ctx.beginPath();
    ctx.ellipse(59, -64, 2.3, 1.4, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Wide, soft mouth with small maxillary teeth only during an attack.
    const mouthOpen = ['tongue_grapple', 'body_slam', 'croak_wave'].includes(enemy.actionState)
      ? 0.75 + Math.abs(Math.sin(time * 12)) * 0.2
      : 0.08;
    ctx.strokeStyle = '#3c1820';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(43, -55);
    ctx.quadraticCurveTo(56, -51 + mouthOpen * 9, 64, -56 + mouthOpen * 6);
    ctx.stroke();
    if (mouthOpen > 0.2) {
      ctx.fillStyle = '#3b1420';
      ctx.beginPath();
      ctx.ellipse(54, -51 + mouthOpen * 5, 13, 4 + mouthOpen * 6, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2e7c9';
      for (let tooth = 0; tooth < 4; tooth++) {
        const tx = 47 + tooth * 5;
        ctx.beginPath();
        ctx.moveTo(tx, -52);
        ctx.lineTo(tx + 1.5, -48 + mouthOpen * 3);
        ctx.lineTo(tx + 3, -52);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#e55b70';
      ctx.beginPath();
      ctx.ellipse(56, -47 + mouthOpen * 7, 7, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Single subgular vocal sac inflates while croaking or grappling.
    const sacPulse = ['croak_wave', 'tongue_grapple'].includes(enemy.actionState)
      ? 1 + Math.abs(Math.sin(time * 9)) * 0.32
      : 0.35;
    const sacGrad = ctx.createRadialGradient(32, -19, 2, 32, -19, 24 * sacPulse);
    sacGrad.addColorStop(0, 'rgba(242, 255, 218, 0.88)');
    sacGrad.addColorStop(0.65, 'rgba(187, 220, 133, 0.66)');
    sacGrad.addColorStop(1, 'rgba(63, 148, 64, 0.12)');
    ctx.fillStyle = sacGrad;
    ctx.strokeStyle = 'rgba(35, 105, 47, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(32, -19, 18 * sacPulse, 14 * sacPulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Front leg and its enlarged adhesive discs. Keep the forelimb responsive
    // to the same airborne/grounded pose state instead of using the removed
    // generic leg oscillator.
    const frontStep = airborne ? legMotion.jumpExtension - 0.5 : legMotion.oppositeStride;
    drawLimb([[20, -34], [32 + frontStep * 4, -18 + Math.abs(frontStep) * 2], [49 + frontStep * 8, -3 - frontStep * 2]], '#4f9f43', 7);
    drawToePads(51 + frontStep * 8, -2 - frontStep * 2, 0.8);

    // The second hind leg is visible beneath the belly, especially during hops.
    drawLimb(nearHindPoints, '#58a946', 9);
    ctx.fillStyle = '#d8b54a';
    ctx.beginPath();
    ctx.ellipse(nearHindPoints[1][0] + 2, nearHindPoints[1][1] + 2, 10, 7, 0.25, 0, Math.PI * 2);
    ctx.fill();
    drawToePads(nearHindPoints[2][0] + 3, nearHindPoints[2][1], 0.9);

    // Sticky projectile tongue extends only during the grapple.
    if (enemy.actionState === 'tongue_grapple' && enemy.tongueX !== undefined) {
      const relTongueX = (enemy.tongueX - enemy.x) * enemy.direction;
      const relTongueY = enemy.tongueY - enemy.y;
      const tongueGrad = ctx.createLinearGradient(48, -51, relTongueX, relTongueY);
      tongueGrad.addColorStop(0, '#f06b7a');
      tongueGrad.addColorStop(1, '#b51f4b');
      ctx.strokeStyle = tongueGrad;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(48, -51);
      ctx.quadraticCurveTo(relTongueX * 0.55, relTongueY - 18, relTongueX, relTongueY);
      ctx.stroke();
      ctx.fillStyle = '#ff91a4';
      ctx.beginPath();
      ctx.arc(relTongueX, relTongueY, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // =========================================================================
  // 7. CREATURE 6: ASIAN GIANT HORNET (VESPA MANDARINIA)
  // =========================================================================
  drawAsianHornet(ctx, enemy) {
    ctx.save();
    const time = enemy.animTime || 0;
    const isDead = enemy.isDead || enemy.actionState === 'dead';
    const isEmerging = enemy.actionState === 'nest_emerge';
    const hoverY = isDead ? 0 : (isEmerging ? Math.sin(time * 4) * 1.2 : Math.sin(time * 3) * 3.5);
    const wingBeat = isDead ? 0 : (isEmerging ? Math.sin(time * 18) * 0.08 : Math.sin(time * 25) * 0.16);
    const isAttacking = !isDead && enemy.actionState !== 'idle' && !isEmerging;
    const stingerThrusting = enemy.actionState === 'stinger_thrust';
    const stingProgress = stingerThrusting
      ? 1 - Math.max(0, Math.min(1, (enemy.actionTimer || 0) / 34))
      : 0;
    const stingWindup = stingerThrusting
      ? Math.max(0, Math.min(1, stingProgress / 0.28))
      : 0;
    const stingExtension = stingerThrusting
      ? Math.sin(Math.max(0, Math.min(1, (stingProgress - 0.24) / 0.48)) * Math.PI)
      : 0;
    const stingRecoil = stingerThrusting
      ? Math.max(0, Math.min(1, (stingProgress - 0.68) / 0.32))
      : 0;

    // Asian giant hornet wings are smoky amber, narrow, and transparent —
    // not broad butterfly-like wings. The dark pterostigma marks the forewing.
    const drawWing = (x, y, length, width, angle, alpha, forewing) => {
      ctx.save();
      ctx.translate(x, y + hoverY);
      ctx.rotate(angle + wingBeat);
      ctx.globalAlpha = alpha;

      const wingGrad = ctx.createLinearGradient(0, 0, -length, -length * 0.45);
      wingGrad.addColorStop(0, 'rgba(247, 216, 170, 0.62)');
      wingGrad.addColorStop(0.55, 'rgba(184, 139, 86, 0.34)');
      wingGrad.addColorStop(1, 'rgba(92, 61, 38, 0.08)');
      ctx.fillStyle = wingGrad;
      ctx.strokeStyle = 'rgba(62, 42, 30, 0.8)';
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.moveTo(3, 2);
      ctx.quadraticCurveTo(-length * 0.22, -width, -length * 0.78, -width * 0.72);
      ctx.quadraticCurveTo(-length, -width * 0.15, -length - 5, 4);
      ctx.quadraticCurveTo(-length * 0.45, width * 0.26, 3, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Longitudinal veins and a few cross-veins give the wing a wasp-like mesh.
      ctx.strokeStyle = 'rgba(88, 59, 39, 0.56)';
      ctx.lineWidth = 0.75;
      for (let vein = 0; vein < 4; vein++) {
        const startX = -8 - vein * 2;
        ctx.beginPath();
        ctx.moveTo(startX, 1);
        ctx.quadraticCurveTo(-length * (0.35 + vein * 0.12), -width * 0.32, -length * (0.83 + vein * 0.025), -width * (0.55 + vein * 0.06));
        ctx.stroke();
      }
      if (forewing) {
        ctx.fillStyle = '#3a2417';
        ctx.beginPath();
        ctx.ellipse(-length * 0.8, -width * 0.56, 5, 2.1, -0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    // Far pair first; the long forewings overlap the shorter hindwings.
    drawWing(5, -39, 78, 18, -0.72, 0.24, false);
    drawWing(3, -40, 94, 13, -0.44, 0.34, true);

    // The three pairs of legs are attached to the thorax, not the abdomen.
    const drawHornetLeg = (base, knee, foot, alpha, width) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#17100c';
      ctx.lineWidth = width + 2.3;
      ctx.beginPath();
      ctx.moveTo(base[0], base[1] + hoverY);
      ctx.lineTo(knee[0], knee[1] + hoverY);
      ctx.lineTo(foot[0], foot[1] + hoverY);
      ctx.stroke();
      ctx.strokeStyle = '#7b5535';
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(base[0], base[1] + hoverY);
      ctx.lineTo(knee[0], knee[1] + hoverY);
      ctx.lineTo(foot[0], foot[1] + hoverY);
      ctx.stroke();
      ctx.fillStyle = '#c18b55';
      ctx.beginPath();
      ctx.arc(knee[0], knee[1] + hoverY, width * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#21150e';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(foot[0], foot[1] + hoverY);
      ctx.lineTo(foot[0] + 6, foot[1] + hoverY - 2);
      ctx.stroke();
      ctx.restore();
    };
    const legSwing = Math.sin(time * 13);
    const legs = [
      [[17, -17], [31 + legSwing * 3, -5], [49 + legSwing * 5, 7]],
      [[8, -13], [22 - legSwing * 4, 3], [34 - legSwing * 6, 16]],
      [[-3, -11], [-17 + legSwing * 4, 5], [-35 + legSwing * 6, 18]],
    ];
    legs.forEach(([base, knee, foot], index) => {
      drawHornetLeg(base, knee, foot, 0.38, 2.0);
      const farBase = [base[0] - 4, base[1] + 2];
      const farKnee = [knee[0] - 4, knee[1] + 3];
      const farFoot = [foot[0] - 5, foot[1] + 3];
      drawHornetLeg(farBase, farKnee, farFoot, 0.2, 1.45);
    });

    // Long, tapered gaster with the real black-and-yellow/orange banding.
    // At rest it lies behind the thorax. During a sting it is drawn as
    // articulated segments so the abdomen visibly curls under the body.
    const drawRestGaster = () => {
      ctx.save();
      ctx.translate(-32, -25 + hoverY);
      ctx.rotate(0.08);
      const gasterPath = () => {
        ctx.beginPath();
        ctx.moveTo(31, -13);
        ctx.quadraticCurveTo(5, -23, -29, -18);
        ctx.quadraticCurveTo(-48, -15, -57, -4);
        ctx.quadraticCurveTo(-47, 12, -27, 17);
        ctx.quadraticCurveTo(8, 21, 31, 11);
        ctx.closePath();
      };
      const gasterGrad = ctx.createLinearGradient(-58, -15, 30, 15);
      gasterGrad.addColorStop(0, '#100d0b');
      gasterGrad.addColorStop(0.45, '#29221b');
      gasterGrad.addColorStop(1, '#0d0b09');
      ctx.fillStyle = gasterGrad;
      gasterPath();
      ctx.fill();
      ctx.save();
      gasterPath();
      ctx.clip();
      ctx.fillStyle = '#e7a928';
      [-39, -21, -3, 15].forEach((bandX, index) => {
        ctx.fillRect(bandX, -25, index === 0 ? 8 : 7, 50);
      });
      ctx.fillStyle = 'rgba(255, 199, 82, 0.55)';
      ctx.fillRect(-40, -19, 2, 38);
      ctx.fillRect(-4, -19, 2, 38);
      ctx.restore();
      ctx.strokeStyle = '#080706';
      ctx.lineWidth = 2.3;
      gasterPath();
      ctx.stroke();

      // Tergite seams and lateral spiracles.
      ctx.strokeStyle = 'rgba(10, 8, 6, 0.8)';
      ctx.lineWidth = 1.2;
      [-30, -12, 6, 24].forEach((seamX) => {
        ctx.beginPath();
        ctx.moveTo(seamX, -15);
        ctx.quadraticCurveTo(seamX - 3, 0, seamX + 1, 14);
        ctx.stroke();
      });
      ctx.fillStyle = '#070605';
      [-27, -9, 9].forEach((spiracleX) => {
        ctx.beginPath();
        ctx.ellipse(spiracleX, 10, 1.6, 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Resting stinger: tucked back under the abdomen.
      ctx.strokeStyle = '#080706';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(-54, -2);
      ctx.quadraticCurveTo(-64, 1, -69, 8);
      ctx.stroke();
      ctx.restore();
    };

    const drawStingingGaster = () => {
      ctx.save();
      const curl = Math.max(0, Math.min(1, stingWindup * (1 - stingRecoil)));
      const restCenters = [
        [20, -5], [6, -7], [-9, -8], [-24, -6], [-38, -1], [-50, 7], [-56, 14]
      ];
      const curledCenters = [
        [20, -5], [6, -8], [-11, -6], [-27, 4], [-40, 19], [-38, 38], [-19, 51]
      ];
      const widths = [12, 13, 14, 14, 13, 11, 7];
      const centers = restCenters.map((point, index) => [
        point[0] + (curledCenters[index][0] - point[0]) * curl,
        point[1] + (curledCenters[index][1] - point[1]) * curl
      ]);

      // Draw overlapping abdominal segments, with the yellow bands following each segment.
      centers.forEach(([x, y], index) => {
        const previous = centers[Math.max(0, index - 1)];
        const next = centers[Math.min(centers.length - 1, index + 1)];
        const angle = Math.atan2(next[1] - previous[1], next[0] - previous[0]);
        const length = index === 0 || index === centers.length - 1 ? 10 : 13;
        const width = widths[index];
        ctx.save();
        ctx.translate(x, y + hoverY);
        ctx.rotate(angle);
        ctx.fillStyle = '#17110e';
        ctx.strokeStyle = '#080706';
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.ellipse(0, 0, length, width, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if ([1, 3, 5].includes(index)) {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(0, 0, length - 1, width - 1, 0, 0, Math.PI * 2);
          ctx.clip();
          ctx.fillStyle = '#e7a928';
          ctx.fillRect(-3.5, -width - 2, 7, width * 2 + 4);
          ctx.restore();
        }
        ctx.restore();
      });

      // Flexible dark petiole keeps the curled abdomen visibly connected to the thorax.
      ctx.strokeStyle = '#120d0a';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(24, -5 + hoverY);
      ctx.lineTo(13, -6 + hoverY);
      ctx.stroke();

      // The tip folds under first, then extends forward in a shallow hooked arc.
      const tail = centers[centers.length - 1];
      const reach = stingExtension * 76;
      const tipX = tail[0] + 16 + reach;
      const tipY = tail[1] + 5 - stingExtension * 30;
      ctx.strokeStyle = '#080706';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(tail[0] + 3, tail[1] + hoverY);
      ctx.quadraticCurveTo(tail[0] + 12, tail[1] + 14 + hoverY, tail[0] + 20 + reach * 0.35, tail[1] + 10 + hoverY);
      ctx.quadraticCurveTo(tail[0] + 30 + reach * 0.7, tail[1] - 7 + hoverY, tipX, tipY + hoverY);
      ctx.stroke();
      if (stingExtension > 0.18) {
        ctx.strokeStyle = 'rgba(231, 169, 40, 0.7)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(tail[0] + 7, tail[1] + 2 + hoverY);
        ctx.quadraticCurveTo(tail[0] + 20, tail[1] + 11 + hoverY, tail[0] + 31 + reach * 0.7, tail[1] - 6 + hoverY);
        ctx.lineTo(tipX - 2, tipY + hoverY);
        ctx.stroke();
      }
      ctx.restore();
    };

    if (stingerThrusting) {
      drawStingingGaster();
    } else {
      drawRestGaster();
    }

    // Heavy black-brown thorax and a small golden collar behind the head.
    const thoraxGrad = ctx.createRadialGradient(7, -35 + hoverY, 2, 7, -35 + hoverY, 25);
    thoraxGrad.addColorStop(0, '#554033');
    thoraxGrad.addColorStop(0.62, '#2d211b');
    thoraxGrad.addColorStop(1, '#100d0b');
    ctx.fillStyle = thoraxGrad;
    ctx.strokeStyle = '#090807';
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.ellipse(8, -34 + hoverY, 23, 20, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c28a28';
    ctx.beginPath();
    ctx.ellipse(26, -34 + hoverY, 6, 15, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Near wings sit over the thorax and beat during flight.
    drawWing(7, -41, 79, 18, -0.68, 0.42, false);
    drawWing(5, -41, 96, 13, -0.4, 0.56, true);

    // Massive orange head, black compound eye, ocelli, and segmented antennae.
    const headGrad = ctx.createRadialGradient(42, -38 + hoverY, 3, 42, -35 + hoverY, 24);
    headGrad.addColorStop(0, '#ffc43d');
    headGrad.addColorStop(0.55, '#f28c12');
    headGrad.addColorStop(1, '#b6420b');
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#160d08';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(42, -35 + hoverY, 21, 20, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#090807';
    ctx.beginPath();
    ctx.ellipse(49, -40 + hoverY, 7, 10, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 220, 125, 0.65)';
    ctx.beginPath();
    ctx.ellipse(51, -43 + hoverY, 2.2, 3.4, 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Three tiny ocelli on the crown.
    ctx.fillStyle = '#5b250b';
    [34, 38, 42].forEach((ocelliX, index) => {
      ctx.beginPath();
      ctx.arc(ocelliX, -52 + hoverY - (index === 1 ? 1 : 0), 1.45, 0, Math.PI * 2);
      ctx.fill();
    });

    // Two long, jointed antennae angle forward from the head.
    ctx.strokeStyle = '#4b2918';
    ctx.lineWidth = 1.5;
    [[51, -50, 70, -66, 87, -70], [55, -46, 75, -55, 91, -56]].forEach((antenna) => {
      ctx.beginPath();
      ctx.moveTo(antenna[0], antenna[1] + hoverY);
      ctx.lineTo(antenna[2], antenna[3] + hoverY);
      ctx.lineTo(antenna[4], antenna[5] + hoverY);
      ctx.stroke();
      ctx.fillStyle = '#d08a35';
      ctx.beginPath();
      ctx.arc(antenna[2], antenna[3] + hoverY, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Powerful serrated mandibles open wider during attacks.
    const gape = isAttacking ? 1.0 : 0.22 + Math.abs(Math.sin(time * 2)) * 0.08;
    ctx.fillStyle = '#1b0d07';
    ctx.beginPath();
    ctx.ellipse(58, -24 + hoverY, 7, 4 + gape * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    const drawMandible = (offset, rotation) => {
      ctx.save();
      ctx.translate(56, -25 + offset + hoverY);
      ctx.rotate(rotation * gape);
      ctx.fillStyle = '#d76b0b';
      ctx.strokeStyle = '#38170a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.quadraticCurveTo(4, 1, 10, 5 + gape * 2);
      ctx.lineTo(5, 9 + gape * 4);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#100806';
      ctx.beginPath();
      ctx.moveTo(7, 5 + gape * 2);
      ctx.lineTo(12, 6 + gape * 3);
      ctx.lineTo(6, 10 + gape * 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    drawMandible(-2, -0.34);
    drawMandible(2, 0.34);

    ctx.restore();
  }


  // =========================================================================
  // 8. CREATURE 7: PHARAOH ANTS COLONY (MONOMORIUM PHARAONIS)
  // =========================================================================
  drawPharaohAnts(ctx, enemy) {
    ctx.save();
    const time = Date.now() * 0.015;

    // Helper to draw an individual ant with biological anatomy:
    // Heart-shaped head, 12-segmented antennae with 3-club, 2-node petiole, polished gaster, 6 legs
    const drawAnt = (ax, ay, scale = 1, isMajor = false, legWalk = 0) => {
      ctx.save();
      ctx.translate(ax, ay);
      ctx.scale(scale, scale);

      // 6 Articulated Moving Legs
      ctx.strokeStyle = '#7f4f24';
      ctx.lineWidth = isMajor ? 2.2 : 1.2;
      for (let leg = -1; leg <= 1; leg++) {
        const lAngle = Math.sin(legWalk + leg * 2) * 5;
        // Upper leg
        ctx.beginPath();
        ctx.moveTo(leg * 6, -10);
        ctx.lineTo(leg * 8 + lAngle, -20);
        ctx.lineTo(leg * 14 + lAngle, 4);
        ctx.stroke();
      }

      // Gaster (Abdomen with shiny polish sheen)
      const gasGrad = ctx.createRadialGradient(-16, -14, 2, -16, -14, 15);
      gasGrad.addColorStop(0, '#d4a373');
      gasGrad.addColorStop(0.6, '#936639');
      gasGrad.addColorStop(1, '#43281c');

      ctx.fillStyle = gasGrad;
      ctx.strokeStyle = '#281c10';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(-18, -14, isMajor ? 18 : 10, isMajor ? 11 : 6, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Two-Segmented Petiole (Diagnostic Myrmicinae double node!)
      ctx.fillStyle = '#b08968';
      ctx.beginPath();
      ctx.arc(-4, -14, isMajor ? 3.5 : 2, 0, Math.PI * 2); // Node 1
      ctx.arc(2, -14, isMajor ? 3.2 : 1.8, 0, Math.PI * 2); // Node 2
      ctx.fill();

      // Thorax (Mesosoma)
      ctx.fillStyle = '#ddb892';
      ctx.beginPath();
      ctx.ellipse(12, -14, isMajor ? 12 : 7, isMajor ? 7 : 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Heart-shaped Head
      ctx.fillStyle = '#b08968';
      ctx.beginPath();
      ctx.arc(26, -16, isMajor ? 10 : 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Eye
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(28, -18, isMajor ? 2.5 : 1.3, 0, Math.PI * 2);
      ctx.fill();

      // ANIMATED MANDIBLES — ant mandibles open/close with leg cycle
      // Biology: Monomorium pharaonis has triangular mandibles with ~5 teeth, blood-red sclerotized
      const antGape = 0.1 + Math.abs(Math.sin(legWalk * 1.2)) * (isMajor ? 0.55 : 0.45);
      const mSize = isMajor ? 1.4 : 0.85;
      // Dark oral cavity
      ctx.fillStyle = '#0a0000';
      ctx.beginPath();
      ctx.ellipse(32, -14, 3 * mSize * antGape, 1.5 * mSize * antGape, 0, 0, Math.PI * 2);
      ctx.fill();
      // Upper mandible
      ctx.save();
      ctx.translate(32, -15);
      ctx.rotate(-antGape * 0.5);
      ctx.fillStyle = '#6a040f';
      ctx.strokeStyle = '#370617';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3 * mSize, 0);
      ctx.lineTo(5 * mSize, -0.5 * mSize);
      ctx.lineTo(5.5 * mSize, 3.5 * mSize + antGape * 4 * mSize);
      ctx.lineTo(-2 * mSize, 3 * mSize + antGape * 3.5 * mSize);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Teeth
      ctx.strokeStyle = '#c9a96e'; ctx.lineWidth = 0.7;
      for (let t = 0; t < 3; t++) {
        ctx.beginPath();
        ctx.moveTo((t * 1.8 - 1) * mSize, 1 * mSize);
        ctx.lineTo((t * 1.8) * mSize, 2.5 * mSize + antGape * 2 * mSize);
        ctx.stroke();
      }
      ctx.restore();
      // Lower mandible
      ctx.save();
      ctx.translate(32, -13);
      ctx.rotate(antGape * 0.5);
      ctx.fillStyle = '#6a040f';
      ctx.strokeStyle = '#370617';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3 * mSize, 0);
      ctx.lineTo(5 * mSize, 0.5 * mSize);
      ctx.lineTo(5.5 * mSize, -3.5 * mSize - antGape * 4 * mSize);
      ctx.lineTo(-2 * mSize, -3 * mSize - antGape * 3.5 * mSize);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();

      // Antennae with 3-segmented terminal club
      ctx.strokeStyle = '#7f4f24';
      ctx.lineWidth = isMajor ? 1.6 : 1.0;
      ctx.beginPath();
      ctx.moveTo(28, -19);
      ctx.lineTo(36, -26);
      ctx.lineTo(44, -24); // club
      ctx.stroke();

      ctx.restore();
    };


    // Three distinct ants emerge from the mound one at a time and then keep
    // their own spacing and walking phase instead of reading as one creature.
    const antUnits = enemy.antUnits || [
      { offsetX: -54, restY: 0, scale: 0.86, isMajor: false, phase: 0.2, emergeProgress: 1 },
      { offsetX: 0, restY: -4, scale: 1.08, isMajor: true, phase: 1.7, emergeProgress: 1 },
      { offsetX: 54, restY: 1, scale: 0.9, isMajor: false, phase: 3.1, emergeProgress: 1 }
    ];

    const colonyDefeated = enemy.isDead || enemy.actionState === 'dead';
    antUnits.forEach((ant, idx) => {
      if (!colonyDefeated && (ant.alive === false || ant.hp <= 0)) return;
      const progress = colonyDefeated
        ? 1
        : Math.max(0, Math.min(1, ant.emergeProgress ?? 1));
      const walkPhase = ant.phase ?? (time * 0.8 + idx * 1.7);
      const fallbackWalkSway = progress >= 1 ? Math.sin(walkPhase) * 3.5 : 0;
      const spreadX = colonyDefeated
        ? (ant.offsetX ?? 0)
        : (ant.renderX ?? (ant.offsetX * progress + fallbackWalkSway));
      const antY = colonyDefeated
        ? (ant.restY ?? 0)
        : (ant.renderY ?? (-46 + (ant.restY + 46) * progress));

      // Separate contact shadows make the three bodies readable at a glance.
      ctx.fillStyle = 'rgba(20, 10, 5, 0.42)';
      ctx.beginPath();
      ctx.ellipse(spreadX, 7, 20 * ant.scale, 4.5 * ant.scale, 0, 0, Math.PI * 2);
      ctx.fill();

      if (colonyDefeated) {
        const deathProgress = Math.max(0, Math.min(1, enemy.deathProgress ?? 1));
        const easedDeath = 1 - Math.pow(1 - deathProgress, 3);
        ctx.save();
        ctx.translate(spreadX, antY);
        ctx.translate(0, -14 * easedDeath);
        ctx.rotate((1.15 + idx * 0.12) * easedDeath);
        ctx.globalAlpha = 0.78;
        drawAnt(0, 0, ant.scale, ant.isMajor, 0);
        ctx.restore();
        return;
      }

      drawAnt(spreadX, antY, ant.scale, ant.isMajor, walkPhase * 4);

      // A small bar above each body makes the three independent lives explicit.
      if (progress >= 1 && ant.maxHp) {
        const healthRatio = Math.max(0, Math.min(1, ant.hp / ant.maxHp));
        const barWidth = 30 * ant.scale;
        const barY = antY - 34 * ant.scale;
        ctx.fillStyle = 'rgba(10, 8, 6, 0.85)';
        ctx.fillRect(spreadX - barWidth * 0.5, barY, barWidth, 3.5);
        ctx.fillStyle = healthRatio > 0.45 ? '#70e000' : '#e85d04';
        ctx.fillRect(spreadX - barWidth * 0.5, barY, barWidth * healthRatio, 3.5);
      }
    });

    // A few loose grains fall from the entrance while the last ant climbs out.
    const emergingCount = antUnits.filter((ant) => ant.alive !== false && (ant.emergeProgress ?? 1) < 1).length;
    if (emergingCount > 0) {
      ctx.fillStyle = '#d6a15d';
      for (let grain = 0; grain < emergingCount * 2; grain++) {
        const gx = Math.sin(time * 2 + grain * 2.4) * (10 + grain * 3);
        const gy = -32 + Math.abs(Math.sin(time * 3 + grain)) * 18;
        ctx.beginPath();
        ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Caustic Formic Acid Spray Droplets
    if (enemy.actionState === 'formic_acid_spray') {
      ctx.save();
      const sprayAnt = enemy.antUnits && enemy.antUnits.find((ant) => ant.id === enemy.attackingAntId && ant.alive);
      const sprayX = sprayAnt ? (sprayAnt.renderX ?? sprayAnt.offsetX) + 30 : 35;
      const sprayY = sprayAnt ? (sprayAnt.renderY ?? sprayAnt.restY) : 0;
      for (let i = 0; i < 5; i++) {
        const dropX = sprayX + i * 10;
        const dropY = sprayY - 18 - Math.sin(i * 0.7) * 12;
        // Glow halo (no shadowBlur)
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#70e000';
        ctx.beginPath();
        ctx.arc(dropX, dropY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Core drop
        ctx.fillStyle = '#70e000';
        ctx.beginPath();
        ctx.arc(dropX, dropY, 5.5, 0, Math.PI * 2);
        ctx.fill();
        // Sizzling acid smoke
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(dropX + 2, dropY - 6, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // =========================================================================
  // 9. CREATURE 8: GARTER SNAKE (THAMNOPHIS SIRTALIS) - FINAL BOSS
  // =========================================================================
  drawGarterSnake(ctx, enemy) {
    ctx.save();
    const time = Date.now() * 0.005;
    const isEmerging = enemy.actionState === 'burrow_emerge' || enemy.actionState === 'burrow_settle';
    const emergenceProgress = isEmerging
      ? (enemy.actionState === 'burrow_settle'
        ? 1
        : Math.max(0, Math.min(1, enemy.snakeEmergenceProgress || 0)))
      : 1;
    const settleProgress = enemy.actionState === 'burrow_settle'
      ? Math.max(0, Math.min(1, enemy.snakeSettleProgress || 0))
      : 0;
    const settleEased = settleProgress * settleProgress * (3 - 2 * settleProgress);
    const burrowSurfaceY = (enemy.groundY || 560) - 3;
    const holeLocalY = burrowSurfaceY - enemy.y;

    // During emergence the snake is still inside the burrow. Do not attach a
    // second moving shadow to its interpolated position, otherwise the body
    // appears to float between the hole and the combat position. The fixed
    // burrow shadow is already painted by the forest floor.
    if (!isEmerging) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 90, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Keep the snake visually anchored to the fixed ground burrow while it
    // moves away from it. The stage draws the same low opening underneath;
    // this pass gives the emerging body a clear occlusion point.
    if (isEmerging && Number.isFinite(enemy.snakeBurrowX) && Number.isFinite(enemy.snakeBurrowY)) {
      const burrowLocalX = (enemy.snakeBurrowX - enemy.x) * enemy.direction;
      // snakeBurrowY is the hidden spawn depth. The opening itself is at the
      // ground surface, otherwise the overlay would appear below the floor.
      const burrowLocalY = holeLocalY;
      ctx.save();
      ctx.translate(burrowLocalX, burrowLocalY);
      ctx.rotate(-0.08 * enemy.direction);
      ctx.fillStyle = '#010201';
      ctx.beginPath();
      ctx.moveTo(-47, 3);
      ctx.quadraticCurveTo(-36, -9, -14, -7);
      ctx.quadraticCurveTo(7, -12, 28, -5);
      ctx.quadraticCurveTo(42, -1, 48, 4);
      ctx.quadraticCurveTo(27, 11, 4, 8);
      ctx.quadraticCurveTo(-21, 13, -47, 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(171, 126, 77, 0.78)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-38, -2);
      ctx.quadraticCurveTo(-18, -9, 4, -8);
      ctx.quadraticCurveTo(25, -9, 38, -1);
      ctx.closePath();
      ctx.stroke();

      // Loose soil is disturbed by the head and the body following it out.
      const dustAlpha = 0.5 * (1 - emergenceProgress);
      ctx.globalAlpha = dustAlpha;
      ctx.fillStyle = '#9b7548';
      for (let grain = 0; grain < 5; grain++) {
        const grainX = Math.sin(time * 4 + grain * 1.9) * (16 + grain * 3);
        const grainY = -7 - Math.abs(Math.sin(time * 3 + grain)) * 16;
        ctx.beginPath();
        ctx.arc(grainX, grainY, 1.5 + (grain % 2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // The foreground soil occludes every part of the snake that is still
    // below ground. Without this mask the body appears to materialize in air.
    ctx.save();
    const groundLocalY = (enemy.groundY || 560) - enemy.y;
    ctx.beginPath();
    ctx.rect(-1600, -1200, 3200, groundLocalY + 1200);
    ctx.clip();

    // Reveal the snake in horizontal sections. The newest section always
    // ends at the same burrow anchor; older sections and the head extend only
    // toward world-left. No part of this path is allowed behind the opening.
    // Keep the silhouette unmistakably serpentine: many slim segments create
    // a long body, while the radius tapers steadily instead of ending in a
    // fish-like broad tail.
    const totalSegments = 42;
    // Continuous (unrounded) reveal amount. All position math below keys off
    // this float, never off the integer segment count. The old code used
    // `numSegments` (which only ever changes in whole-segment steps) directly
    // inside the per-point formulas, so every time a new segment appeared the
    // ENTIRE already-emerged body silently jumped forward by one full
    // segment-length (11.8px) on that single frame, instead of continuing to
    // slide out smoothly — that stepping is what reads as unrealistic/robotic
    // rather than a snake sliding out of a hole.
    const revealAmount = isEmerging && enemy.actionState !== 'burrow_settle'
      ? Math.max(2, totalSegments * (0.04 + emergenceProgress * 0.96))
      : totalSegments;
    // `numSegments` is still an integer (you can't push a fractional array
    // element), but it is only ever used as the loop bound below now — never
    // inside a formula that positions an already-existing point.
    const numSegments = Math.max(2, Math.min(totalSegments, Math.floor(revealAmount)));
    const bodyPoints = [];

    for (let i = 0; i < numSegments; i++) {
      const t = i / (totalSegments - 1);
      const waveAmplitude = isEmerging
        ? 5 + emergenceProgress * 8
        : 9 + 5 * (1 - t * 0.45);
      const wave = Math.sin(time * 2.8 + t * 5.2) * waveAmplitude;
      // The renderer is mirrored with direction -1, therefore positive local
      // X is world-left. During emergence point 0 is the head-side section,
      // while the newest section (the last point) remains at the hole.
      // Uses the continuous revealAmount (not numSegments) so an existing
      // segment's x drifts by a fraction of a pixel per frame instead of
      // snapping by a full segment-length whenever the count increases.
      const emergenceX = (revealAmount - 1 - i) * 11.8;
      const combatX = -i * 11.8;
      const flatX = isEmerging
        ? emergenceX * (1 - settleEased) + combatX * settleEased
        : combatX;
      const flatY = -18 + wave;

      // The head rises just above the lip while the body behind it follows a
      // continuous curve back into the hole. As the visible length grows, the
      // head moves left and the last point remains fixed at the entrance.
      const exitLift = isEmerging
        ? 42 * (enemy.actionState === 'burrow_settle'
          ? 1
          : Math.max(0, Math.min(1, emergenceProgress / 0.22)))
        : 0;
      const headPathY = holeLocalY + 20 - exitLift;
      // Same continuous denominator as emergenceX above and for the same
      // reason: a per-frame-changing integer here made every point's
      // head/hole blend snap instead of ease as new segments appeared.
      const pathT = isEmerging && revealAmount > 1
        ? Math.min(1, i / (revealAmount - 1))
        : t;
      const emergenceY = headPathY * (1 - pathT) + holeLocalY * pathT + Math.sin(pathT * Math.PI) * 2;
      const py = isEmerging
        ? emergenceY * (1 - settleEased) + flatY * settleEased
        : flatY;
      bodyPoints.push({
        x: flatX,
        y: py,
        radius: Math.max(2.5, 8.4 * (1 - t * 0.72))
      });
    }

    // 1. Olive-brown body with a soft outline and natural taper toward the tail.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const bodyGradient = ctx.createLinearGradient(0, -38, 0, 12);
    bodyGradient.addColorStop(0, '#6d8051');
    bodyGradient.addColorStop(0.48, '#536841');
    bodyGradient.addColorStop(1, '#293b2b');
    for (let i = 0; i < bodyPoints.length - 1; i++) {
      const current = bodyPoints[i];
      const next = bodyPoints[i + 1];
      const bodyWidth = (current.radius + next.radius) + 3;
      ctx.strokeStyle = '#142219';
      ctx.lineWidth = bodyWidth + 4;
      ctx.beginPath();
      ctx.moveTo(current.x, current.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
      ctx.strokeStyle = bodyGradient;
      ctx.lineWidth = bodyWidth;
      ctx.beginPath();
      ctx.moveTo(current.x, current.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }

    // Finish the narrowing tail with a true pointed tip instead of a blunt
    // rounded stroke. The outline and inner fill keep it attached to the last
    // body segment while tapering naturally to zero.
    const tailBase = bodyPoints[bodyPoints.length - 1];
    const tailBefore = bodyPoints[Math.max(0, bodyPoints.length - 2)];
    const tailDX = tailBase.x - tailBefore.x;
    const tailDY = tailBase.y - tailBefore.y;
    const tailLength = Math.max(13, 19 * (0.45 + emergenceProgress * 0.55));
    const tailMagnitude = Math.max(1, Math.hypot(tailDX, tailDY));
    const tailTip = {
      x: tailBase.x + (tailDX / tailMagnitude) * tailLength,
      y: tailBase.y + (tailDY / tailMagnitude) * tailLength
    };
    const tailNormal = { x: -tailDY / tailMagnitude, y: tailDX / tailMagnitude };
    const tailOuterRadius = tailBase.radius + 2.2;
    const tailInnerRadius = tailBase.radius;
    const drawTaperedTail = (radius, fillStyle, strokeStyle, lineWidth) => {
      ctx.fillStyle = fillStyle;
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(tailBase.x + tailNormal.x * radius, tailBase.y + tailNormal.y * radius);
      ctx.lineTo(tailTip.x, tailTip.y);
      ctx.lineTo(tailBase.x - tailNormal.x * radius, tailBase.y - tailNormal.y * radius);
      ctx.closePath();
      ctx.fill();
      if (lineWidth > 0) ctx.stroke();
    };
    // While the snake is exiting, the last visible segment terminates at the
    // burrow opening. Do not draw a tail tip past that point (to the right of
    // the hole); the pointed tail is added only after the turn is complete.
    if (!isEmerging) {
      drawTaperedTail(tailOuterRadius, '#142219', '#142219', 0);
      drawTaperedTail(tailInnerRadius, bodyGradient, bodyGradient, 0);

      ctx.strokeStyle = '#c4b86a';
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(tailBase.x, tailBase.y - 1);
      ctx.lineTo(tailTip.x, tailTip.y);
      ctx.stroke();
    }

    // Subtle overlapping scale rows, visible without making the skin glossy.
    for (let i = 0; i < bodyPoints.length - 1; i += 1) {
      const pt = bodyPoints[i];
      const scaleSize = Math.max(1.3, pt.radius * 0.26);
      ctx.strokeStyle = 'rgba(18, 35, 24, 0.42)';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.arc(pt.x - 1, pt.y - pt.radius * 0.2, scaleSize, Math.PI * 0.15, Math.PI * 1.05);
      ctx.stroke();
    }

    // Garter snakes have one muted yellow dorsal stripe and two pale lateral stripes.
    ctx.strokeStyle = '#c4b86a';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(bodyPoints[0].x, bodyPoints[0].y - 1);
    for (let i = 1; i < bodyPoints.length; i++) ctx.lineTo(bodyPoints[i].x, bodyPoints[i].y - 1);
    ctx.stroke();

    ctx.strokeStyle = '#aeb477';
    ctx.lineWidth = 2;
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(bodyPoints[0].x, bodyPoints[0].y + side * 6.2);
      for (let i = 1; i < bodyPoints.length; i++) {
        ctx.lineTo(bodyPoints[i].x, bodyPoints[i].y + side * (5.8 - i * 0.07));
      }
      ctx.stroke();
    });

    // 5. Tail Whip Sweeping Attack Visual Effect
    if (enemy.actionState === 'tail_whip_sweep') {
      // Glow layer (no shadowBlur)
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.22)';
      ctx.lineWidth = 28;
      ctx.beginPath();
      ctx.arc(-95, -10, 75, 0, Math.PI);
      ctx.stroke();
      // Bright inner arc
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.72)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(-95, -10, 75, 0, Math.PI);
      ctx.stroke();
    }

    // 6. Streamlined Snake Head with Smooth Supralabial Scales
    // Use the existing head (eye, tongue and jaw). Its anchor must follow the
    // first body ring every frame; during emergence that ring moves left as
    // the visible body length grows. Keeping headX relative to enemy.x was
    // the reason the real head stayed behind and looked detached.
    const headAnchorX = bodyPoints[0].x;
    const headAnchorY = bodyPoints[0].y;
    const headX = headAnchorX + 12;
    const headY = headAnchorY;

    // The head base already overlaps the first body ring. Do not add a
    // separate circular connector here: it makes the real head look like it
    // has an artificial collar between the skull and the body.

    // A garter snake has a small, hinged jaw rather than a giant monster gape.
    const isStriking = !enemy.isDead && enemy.actionState !== 'idle' && !isEmerging;
    const snakeGape = isStriking
      ? (0.45 + Math.sin(time * 18) * 0.2)
      : 0;

    // Lower jaw drops only slightly during a strike.
    const jawDrop = snakeGape * 9;
    ctx.save();
    ctx.translate(headX, headY);

    // Keep the resting jaw as a thin lower-lip line. The filled jaw and mouth
    // appear only during a real strike, so the head does not read like a fish.
    if (isStriking) {
      const lowerJawGrad = ctx.createLinearGradient(-12, 0, 42, 0);
      lowerJawGrad.addColorStop(0, '#1b4332');
      lowerJawGrad.addColorStop(0.6, '#2d6a4f');
      lowerJawGrad.addColorStop(1, '#728654');
      ctx.fillStyle = lowerJawGrad;
      ctx.strokeStyle = '#081c15';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-12, 5 + jawDrop * 0.3);
      ctx.lineTo(30, 5 + jawDrop * 0.5);
      ctx.lineTo(42, 2 + jawDrop * 0.7);
      ctx.lineTo(30, 8 + jawDrop);
      ctx.lineTo(-12, 12 + jawDrop * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Soft pink oral mucosa and small teeth only while the jaw opens.
      ctx.fillStyle = `rgba(210, 80, 80, ${snakeGape * 0.8})`;
      ctx.beginPath();
      ctx.ellipse(15, 4 + jawDrop * 0.4, 11 + snakeGape * 2, 1.7 + snakeGape * 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Small rear-pointing teeth along lower jaw
      ctx.strokeStyle = '#f0ead6';
      ctx.lineWidth = 0.9;
      for (let t = 0; t < 4; t++) {
        const tx = 1 + t * 7;
        ctx.beginPath();
        ctx.moveTo(tx, 5 + jawDrop * 0.45);
        ctx.quadraticCurveTo(tx + 1.5, 8 + jawDrop * 0.5, tx + 0.5, 10 + jawDrop * 0.5);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = '#081c15';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-7, 5);
      ctx.quadraticCurveTo(13, 8, 39, 2);
      ctx.stroke();
    }
    ctx.restore();

    // Upper jaw (main head shape — stays mostly in place, slight tip tilt)
    const headGrad = ctx.createLinearGradient(headX - 10, headY - 12, headX + 38, headY + 8);
    headGrad.addColorStop(0, '#718454');
    headGrad.addColorStop(0.62, '#526741');
    headGrad.addColorStop(1, '#b9aa61');

    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#081c15';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(headX - 12, headY - 11);
    ctx.quadraticCurveTo(headX + 9, headY - 14, headX + 29, headY - 7);
    ctx.lineTo(headX + 39, headY - snakeGape * 3);
    ctx.quadraticCurveTo(headX + 31, headY + 4 - snakeGape * 2, headX + 17, headY + 6);
    ctx.lineTo(headX - 12, headY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Upper jaw teeth (visible during strike)
    if (snakeGape > 0.1) {
      ctx.strokeStyle = '#f0ead6';
      ctx.lineWidth = 0.9;
      for (let t = 0; t < 4; t++) {
        const tx = headX + 1 + t * 7;
        const ty = headY + 2 - snakeGape * 2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + 1.5, ty + 4 + snakeGape * 2, tx + 0.5, ty + 6 + snakeGape * 3);
        ctx.stroke();
      }
    }

    // Supralabial scale suture lines
    ctx.strokeStyle = '#081c15';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(headX + 12, headY + 1);
    ctx.lineTo(headX + 12, headY + 5);
    ctx.moveTo(headX + 22, headY - 1);
    ctx.lineTo(headX + 22, headY + 4);
    ctx.stroke();

    // Nostril
    ctx.fillStyle = '#081c15';
    ctx.beginPath();
    ctx.arc(headX + 36, headY - 4 - snakeGape * 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Garter snake eye: a small round dark pupil with a warm amber iris.
    ctx.fillStyle = '#c7b35c';
    ctx.beginPath();
    ctx.arc(headX + 16, headY - 5, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#080808';
    ctx.beginPath();
    ctx.arc(headX + 16, headY - 5, 2.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(headX + 15.3, headY - 5.8, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // 7. Flickering Crimson Forked Sensory Tongue
    if (!enemy.isDead && Math.sin(time * 14) > 0.15) {
      ctx.strokeStyle = '#d90429';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(headX + 42, headY - snakeGape * 2);
      ctx.lineTo(headX + 62, headY - snakeGape * 1.5);
      ctx.lineTo(headX + 74, headY - 6 - snakeGape); // fork 1
      ctx.moveTo(headX + 62, headY - snakeGape * 1.5);
      ctx.lineTo(headX + 74, headY + 4 - snakeGape * 0.5); // fork 2
      ctx.stroke();
    }

    // Release the ground mask, then release the function's outer transform.
    ctx.restore();
    ctx.restore();
  }
}
