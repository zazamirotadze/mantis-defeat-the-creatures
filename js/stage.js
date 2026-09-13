// ==========================================
// Enhanced Botanical & Geological Stage Environments
// 8 Ultra-Detailed Creature Habitats
// ==========================================

class StageManager {
  constructor(canvasWidth, canvasHeight) {
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.groundY = 560;

    this.currentHabitat = 'savanna';
    this.time = 0;
    this.particles = [];
    this.maxParticles = 28;

    this.platforms = []; // store platforms for stage

  }

  setHabitat(habitatId) {
    this.currentHabitat = habitatId;
    this.initParticles();
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle());
    }
  }

  createParticle() {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.groundY,
      vx: (Math.random() - 0.5) * 1.6,
      vy: Math.random() * 0.8 + 0.3,
      size: Math.random() * 4 + 2,
      alpha: Math.random() * 0.7 + 0.3,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.05
    };
  }

  update() {
    this.time += 0.025;

    this.particles.forEach(p => {
      p.rotation += p.vRot;

      if (this.currentHabitat === 'savanna') {
        p.x += Math.sin(this.time + p.y * 0.01) * 0.8 + 1.2;
        p.y += 0.3;
      } else if (this.currentHabitat === 'gravel_steppe') {
        p.x += 1.8;
        p.y += Math.sin(this.time * 2 + p.x * 0.05) * 0.4;
      } else if (this.currentHabitat === 'mediterranean_scrub') {
        p.x += 1.0;
        p.y += 0.5;
      } else if (this.currentHabitat === 'rainforest_canopy') {
        p.x += Math.sin(this.time + p.y * 0.02) * 0.6;
        p.y += Math.cos(this.time + p.x * 0.02) * 0.4;
      } else if (this.currentHabitat === 'mossy_pond') {
        p.x += Math.sin(this.time * 0.5 + p.y * 0.01) * 0.5;
        p.y += 0.8;
      } else if (this.currentHabitat === 'hornet_canopy') {
        p.x += 3.2; // strong wind gusts
        p.y += 0.6;
      } else if (this.currentHabitat === 'anthill_chambers') {
        p.x += (Math.random() - 0.5) * 0.4;
        p.y += 0.4;
      } else if (this.currentHabitat === 'forest_floor') {
        p.x += Math.sin(this.time + p.y * 0.01) * 0.7 + 0.5;
        p.y += 0.6; // falling dry leaves
      }

      if (p.y > this.groundY || p.x > this.width || p.x < 0) {
        p.y = Math.random() * 60;
        p.x = Math.random() * this.width;
      }
    });
  }

  draw(ctx) {
    ctx.save();

    switch (this.currentHabitat) {
      case 'savanna':
        this.drawSavanna(ctx);
        break;
      case 'gravel_steppe':
        this.drawGravelSteppe(ctx);
        break;
      case 'mediterranean_scrub':
        this.drawMediterraneanScrub(ctx);
        break;
      case 'rainforest_canopy':
        this.drawRainforestCanopy(ctx);
        break;
      case 'mossy_pond':
        this.drawMossyPond(ctx);
        break;
      case 'hornet_canopy':
        this.drawHornetCanopy(ctx);
        break;
      case 'anthill_chambers':
        this.drawAnthillChambers(ctx);
        break;
      case 'forest_floor':
        this.drawForestFloor(ctx);
        break;
      default:
        this.drawSavanna(ctx);
    }

    // Draw any platforms (e.g., TreePlatform for Hyla frog)
    if (this.platforms && this.platforms.length) {
      this.platforms.forEach(p => p.draw(ctx));
    }

    ctx.restore();
  }

  // --- Stage 1: Savanna (Truxalis) ---
  drawSavanna(ctx) {
    // Warm golden gradient sky
    const sky = ctx.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, '#f4a261');
    sky.addColorStop(0.4, '#e9c46a');
    sky.addColorStop(1, '#dda15e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    // Glowing Sun & God Rays
    ctx.save();
    const sunGrad = ctx.createRadialGradient(240, 140, 10, 240, 140, 180);
    sunGrad.addColorStop(0, 'rgba(255, 255, 240, 0.9)');
    sunGrad.addColorStop(0.3, 'rgba(255, 240, 180, 0.4)');
    sunGrad.addColorStop(1, 'rgba(255, 240, 180, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, 600, 360);
    ctx.restore();

    // Distant savanna hills
    ctx.fillStyle = '#bc6c25';
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.quadraticCurveTo(this.width * 0.3, 370, this.width * 0.6, 430);
    ctx.quadraticCurveTo(this.width * 0.85, 460, this.width, 410);
    ctx.lineTo(this.width, this.groundY);
    ctx.fill();

    // Dry sandy straw ground
    const groundGrad = ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#a68a64');
    groundGrad.addColorStop(1, '#7f5539');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Ground stones & straw texture
    ctx.fillStyle = '#654321';
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.ellipse((i * 44 + 10) % this.width, this.groundY + 15 + (i * 11) % 60, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tall swaying grass with drooping seed panicles (Oat grass)
    for (let x = 8; x < this.width; x += 14) {
      const sway = Math.sin(this.time * 2.2 + x * 0.06) * 16;
      const h = 60 + Math.sin(x) * 22;
      ctx.strokeStyle = x % 2 === 0 ? '#606c38' : '#dda15e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, this.groundY);
      ctx.quadraticCurveTo(x + sway * 0.5, this.groundY - h * 0.6, x + sway, this.groundY - h);
      ctx.stroke();

      // Seed panicle head
      ctx.fillStyle = '#dda15e';
      ctx.beginPath();
      ctx.ellipse(x + sway, this.groundY - h, 3, 6, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Stage 2: Gravel Steppe (Oedipoda caerulescens) ---
  drawGravelSteppe(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, '#495057');
    sky.addColorStop(0.5, '#6c757d');
    sky.addColorStop(1, '#ced4da');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    // Jagged rocky ridge with strata lines
    ctx.fillStyle = '#343a40';
    ctx.beginPath();
    ctx.moveTo(0, 400);
    ctx.lineTo(240, 290);
    ctx.lineTo(520, 420);
    ctx.lineTo(820, 280);
    ctx.lineTo(1120, 380);
    ctx.lineTo(this.width, 320);
    ctx.lineTo(this.width, this.groundY);
    ctx.lineTo(0, this.groundY);
    ctx.fill();

    // Strata geological lines on mountain
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 420);
    ctx.lineTo(240, 310);
    ctx.lineTo(520, 440);
    ctx.moveTo(520, 440);
    ctx.lineTo(820, 300);
    ctx.stroke();

    // Dark gravel ground
    ctx.fillStyle = '#212529';
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Dense scattered gravel pebbles with characteristic azure blue mineral stones
    for (let i = 0; i < 70; i++) {
      const px = (i * 21 + 12) % this.width;
      const py = this.groundY + ((i * 16) % 85) + 8;
      const isBlue = i % 3 === 0;
      if (isBlue) {
        ctx.fillStyle = 'rgba(0, 180, 216, 0.35)';
        ctx.beginPath();
        ctx.ellipse(px, py, 11 + (i % 4), 6 + (i % 3), (i * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = isBlue ? '#00b4d8' : '#495057';
      ctx.beginPath();
      ctx.ellipse(px, py, 7 + (i % 4), 3.5 + (i % 3), (i * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Stage 3: Mediterranean Scrub (Calliptamus italicus) ---
  drawMediterraneanScrub(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, '#9d0208');
    sky.addColorStop(0.4, '#d00000');
    sky.addColorStop(0.7, '#e85d04');
    sky.addColorStop(1, '#ffba08');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    // Distant terracotta hills
    ctx.fillStyle = '#6a040f';
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.quadraticCurveTo(420, 340, 860, 430);
    ctx.quadraticCurveTo(1120, 380, this.width, 410);
    ctx.lineTo(this.width, this.groundY);
    ctx.fill();

    // Red clay soil
    const groundGrad = ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#540b0e');
    groundGrad.addColorStop(1, '#331800');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Cracked clay fissures
    ctx.strokeStyle = '#220004';
    ctx.lineWidth = 2;
    for (let c = 50; c < this.width; c += 150) {
      ctx.beginPath();
      ctx.moveTo(c, this.groundY + 10);
      ctx.lineTo(c + 20, this.groundY + 40);
      ctx.lineTo(c + 10, this.groundY + 70);
      ctx.stroke();
    }

    // Thorny wild thistles with purple blossoms
    for (let x = 30; x < this.width; x += 110) {
      ctx.fillStyle = '#3a5a40';
      ctx.beginPath();
      ctx.arc(x, this.groundY - 14, 30, Math.PI, 0);
      ctx.fill();
      // Purple thistle flowers
      ctx.fillStyle = '#7209b7';
      ctx.beginPath();
      ctx.arc(x, this.groundY - 26, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Stage 4: Rainforest Canopy (Katydid) ---
  drawRainforestCanopy(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, '#081c15');
    sky.addColorStop(0.5, '#1b4332');
    sky.addColorStop(1, '#2d6a4f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    // Atmospheric emerald canopy mist
    ctx.fillStyle = 'rgba(82, 183, 136, 0.12)';
    ctx.fillRect(0, 160, this.width, 320);

    // Giant jungle liana vines
    ctx.strokeStyle = '#1b4332';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(-40, 40);
    ctx.bezierCurveTo(350, 160, 850, 20, this.width + 50, 130);
    ctx.stroke();

    // Giant Monstera & Palm Leaves with realistic deep slits and veins
    for (let i = 0; i < 9; i++) {
      const lx = i * 160 - 30;
      const ly = 240 + (i % 2) * 50;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(0.25 * (i % 2 === 0 ? 1 : -1));

      ctx.fillStyle = '#40916c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 85, 38, 0, 0, Math.PI * 2);
      ctx.fill();

      // Leaf veins & slits
      ctx.strokeStyle = '#52b788';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-75, 0);
      ctx.lineTo(75, 0);
      ctx.stroke();

      ctx.restore();
    }

    // Mossy canopy floor
    const floorGrad = ctx.createLinearGradient(0, this.groundY, 0, this.height);
    floorGrad.addColorStop(0, '#1b4332');
    floorGrad.addColorStop(1, '#081c15');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
  }

  // --- Stage 5: Mossy Pond (Hyla orientalis) ---
  drawMossyPond(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, '#102b3f');
    sky.addColorStop(0.6, '#1f4e5b');
    sky.addColorStop(1, '#3b7a57');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    // Giant mossy tree root arch with bark fissures
    ctx.fillStyle = '#283618';
    ctx.strokeStyle = '#132a13';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-20, this.groundY);
    ctx.bezierCurveTo(200, 180, 480, 280, 640, this.groundY);
    ctx.fill();
    ctx.stroke();

    // Old willow trunk and elevated branch: Hyla starts here before dropping
    // into the pond. The branch is deliberately visible behind the collision
    // platform drawn by StageManager.draw().
    ctx.fillStyle = '#3b2a1f';
    ctx.strokeStyle = '#1b120d';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(this.width - 210, this.groundY + 20);
    ctx.bezierCurveTo(this.width - 250, 360, this.width - 170, 180, this.width - 95, 70);
    ctx.lineTo(this.width + 20, 80);
    ctx.bezierCurveTo(this.width - 40, 220, this.width - 55, 390, this.width - 65, this.groundY + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#4e342e';
    ctx.beginPath();
    ctx.moveTo(this.width - 340, 390);
    ctx.bezierCurveTo(this.width - 170, 360, this.width - 20, 370, this.width + 25, 338);
    ctx.lineTo(this.width + 20, 382);
    ctx.bezierCurveTo(this.width - 70, 414, this.width - 200, 405, this.width - 340, 424);
    ctx.closePath();
    ctx.fill();

    // Bark fissures, moss, and hanging vine details.
    ctx.strokeStyle = 'rgba(20, 12, 9, 0.7)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const bx = this.width - 185 + i * 24;
      ctx.beginPath();
      ctx.moveTo(bx, 115 + (i % 2) * 20);
      ctx.quadraticCurveTo(bx - 18, 255, bx + 4, this.groundY - 10);
      ctx.stroke();
    }
    ctx.strokeStyle = '#588157';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(this.width - 110, 90);
    ctx.quadraticCurveTo(this.width - 90, 220, this.width - 120, 315);
    ctx.stroke();
    ctx.fillStyle = '#6a994e';
    ctx.beginPath();
    ctx.ellipse(this.width - 300, 395, 42, 8, -0.08, 0, Math.PI * 2);
    ctx.ellipse(this.width - 95, 356, 38, 7, 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Wetland ground
    ctx.fillStyle = '#132a13';
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Glistening water pool with animated ripples
    ctx.fillStyle = 'rgba(82, 183, 136, 0.25)';
    ctx.fillRect(0, this.groundY + 15, this.width, this.height - this.groundY - 15);

    ctx.strokeStyle = '#52b788';
    ctx.lineWidth = 2.2;
    for (let x = 30; x < this.width; x += 95) {
      const ripple = Math.sin(this.time * 3 + x * 0.05) * 5;
      ctx.beginPath();
      ctx.ellipse(x, this.groundY + 30, 40, 7 + ripple, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Blooming white water lilies with yellow stamens
    for (let lx = 120; lx < this.width; lx += 320) {
      // Lily pad
      ctx.fillStyle = '#2d6a4f';
      ctx.beginPath();
      ctx.ellipse(lx, this.groundY + 22, 28, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Flower petals
      ctx.fillStyle = '#ffffff';
      for (let p = 0; p < 6; p++) {
        const ang = (p / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(lx + Math.cos(ang) * 6, this.groundY + 18 + Math.sin(ang) * 4, 4, 7, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      // Yellow core
      ctx.fillStyle = '#ffbe0b';
      ctx.beginPath();
      ctx.arc(lx, this.groundY + 18, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cattails
    ctx.strokeStyle = '#606c38';
    ctx.lineWidth = 4;
    for (let cx = 80; cx < this.width; cx += 260) {
      ctx.beginPath();
      ctx.moveTo(cx, this.groundY);
      ctx.lineTo(cx + 10, this.groundY - 150);
      ctx.stroke();
      ctx.fillStyle = '#540b0e';
      ctx.beginPath();
      ctx.ellipse(cx + 10, this.groundY - 115, 9, 28, 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Stage 6: Hornet Tree Hollow (Asian Hornet) ---
  drawHornetCanopy(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, '#ff7b00');
    sky.addColorStop(0.4, '#e85d04');
    sky.addColorStop(1, '#9d0208');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    // Weathered oak tree branch with textured bark
    ctx.fillStyle = '#3a2010';
    ctx.beginPath();
    ctx.moveTo(0, 160);
    ctx.bezierCurveTo(400, 240, 720, 130, this.width, 210);
    ctx.lineTo(this.width, 280);
    ctx.bezierCurveTo(720, 190, 400, 310, 0, 230);
    ctx.fill();

    // Detailed Giant Paper Wasp Nest with Hexagonal Cell Comb Structure!
    ctx.save();
    const nestX = this.width * 0.83;
    const nestY = 165;
    ctx.fillStyle = '#7f7f7f';
    ctx.strokeStyle = '#495057';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(nestX, nestY, 105, 130, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Wasp paper texture rings
    ctx.strokeStyle = '#5a5a5a';
    ctx.lineWidth = 2.5;
    for (let r = 20; r < 95; r += 16) {
      ctx.beginPath();
      ctx.ellipse(nestX, nestY, r, r * 1.25, 0.12, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Hexagonal brood comb opening at base
    ctx.fillStyle = '#212529';
    ctx.beginPath();
    ctx.ellipse(nestX - 10, nestY + 90, 35, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // High branch floor
    ctx.fillStyle = '#211508';
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
  }

  // --- Stage 7: Subterranean Ant Labyrinth (Pharaoh Ants) ---
  drawAnthillChambers(ctx) {
    const earth = ctx.createLinearGradient(0, 0, 0, this.groundY);
    earth.addColorStop(0, '#1c100b');
    earth.addColorStop(0.5, '#2e1c14');
    earth.addColorStop(1, '#4e342e');
    ctx.fillStyle = earth;
    ctx.fillRect(0, 0, this.width, this.height);

    // Carved subterranean ant tunnel chambers
    ctx.fillStyle = '#0f0805';
    ctx.beginPath();
    ctx.arc(240, 270, 130, 0, Math.PI * 2);
    ctx.arc(660, 370, 160, 0, Math.PI * 2);
    ctx.arc(1060, 250, 140, 0, Math.PI * 2);
    ctx.fill();

    // Tree roots piercing through ceiling
    ctx.strokeStyle = '#8c5a3c';
    ctx.lineWidth = 4.5;
    for (let r = 180; r < this.width; r += 260) {
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.quadraticCurveTo(r + 25, 120, r + 40, 220);
      ctx.stroke();
    }

    // Glowing subterranean bio-fungi caps with soft halo
    for (let fx = 100; fx < this.width; fx += 150) {
      const fy = 410 + Math.sin(fx) * 45;
      // Soft radial glow
      ctx.fillStyle = 'rgba(6, 214, 160, 0.22)';
      ctx.beginPath();
      ctx.arc(fx, fy - 2, 20, Math.PI, 0);
      ctx.fill();

      // Mushroom cap
      ctx.fillStyle = '#06d6a0';
      ctx.beginPath();
      ctx.arc(fx, fy, 9, Math.PI, 0);
      ctx.fill();
      // Stem
      ctx.strokeStyle = '#a8dadc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx, fy + 14);
      ctx.stroke();
    }

    // Excavated sandy floor
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Natural Pharaoh-ant mound: an irregular, wind-cut sand cone with a low entrance.
    const nestX = this.width * 0.815;
    const nestBaseY = this.groundY + 2;
    const nestTopY = this.groundY - 168;
    const nestHalfWidth = 156;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(nestX, nestBaseY + 5, nestHalfWidth + 12, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    const moundGrad = ctx.createLinearGradient(nestX, nestTopY, nestX, nestBaseY);
    moundGrad.addColorStop(0, '#d6a15d');
    moundGrad.addColorStop(0.42, '#b8793f');
    moundGrad.addColorStop(1, '#704225');
    ctx.fillStyle = moundGrad;
    ctx.strokeStyle = '#4b2b1b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(nestX - nestHalfWidth, nestBaseY);
    ctx.quadraticCurveTo(nestX - 132, this.groundY - 40, nestX - 91, this.groundY - 94);
    ctx.quadraticCurveTo(nestX - 42, this.groundY - 150, nestX - 4, nestTopY);
    ctx.quadraticCurveTo(nestX + 39, this.groundY - 151, nestX + 88, this.groundY - 91);
    ctx.quadraticCurveTo(nestX + 132, this.groundY - 38, nestX + nestHalfWidth, nestBaseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wind-cut contour lines make the mound read as layered sand rather than a flat triangle.
    ctx.strokeStyle = 'rgba(78, 43, 23, 0.48)';
    ctx.lineWidth = 2;
    [0, 1, 2].forEach((row) => {
      const y = this.groundY - 55 - row * 34;
      const half = 112 - row * 29;
      ctx.beginPath();
      ctx.moveTo(nestX - half, y + 7);
      ctx.quadraticCurveTo(nestX - half * 0.42, y - 8, nestX, y + 1);
      ctx.quadraticCurveTo(nestX + half * 0.46, y + 10, nestX + half, y + 3);
      ctx.stroke();
    });

    // Scattered grains and small stones break up the symmetry of the mound.
    const nestGrains = [
      [-112, -34, 3], [-86, -78, 2], [-52, -119, 2], [-18, -66, 2],
      [32, -133, 2], [67, -86, 3], [103, -48, 2], [125, -18, 3],
      [-126, -12, 2], [5, -31, 2], [78, -24, 2]
    ];
    nestGrains.forEach(([dx, dy, radius], idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#e2b56e' : '#8b552e';
      ctx.beginPath();
      ctx.arc(nestX + dx, this.groundY + dy, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Dark entrance at the foot of the mound, where the three ants emerge.
    ctx.fillStyle = '#1d100a';
    ctx.beginPath();
    ctx.ellipse(nestX, this.groundY - 37, 34, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a351f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(nestX, this.groundY - 37, 38, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- Stage 8: Dark Forest Floor (Garter Snake) ---
  drawForestFloor(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, '#05070a');
    sky.addColorStop(0.5, '#121820');
    sky.addColorStop(1, '#253238');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    // Massive decaying fallen oak log with detailed bark fissures
    ctx.fillStyle = '#1c221e';
    ctx.strokeStyle = '#0e1210';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(this.width * 0.5, this.groundY - 45, this.width * 0.55, 72, 0.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Velvety green moss patches on the log
    ctx.fillStyle = '#40916c';
    for (let mx = 60; mx < this.width; mx += 120) {
      ctx.beginPath();
      ctx.ellipse(mx, this.groundY - 86, 42, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Damp leaf-litter ground
    const groundGrad = ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#0e1210');
    groundGrad.addColorStop(1, '#05070a');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Curled decaying autumn oak & maple leaves with veins
    const leafColors = ['#bc6c25', '#dda15e', '#606c38', '#9d0208'];
    for (let i = 0; i < 40; i++) {
      const lx = (i * 35 + 20) % this.width;
      const ly = this.groundY + 10 + (i * 18) % 85;
      ctx.fillStyle = leafColors[i % leafColors.length];
      ctx.beginPath();
      ctx.ellipse(lx, ly, 12, 6, (i * 0.65), 0, Math.PI * 2);
      ctx.fill();

      // Leaf vein
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx - 10, ly);
      ctx.lineTo(lx + 10, ly);
      ctx.stroke();
    }

    // An existing animal burrow for the final snake encounter. Garter snakes
    // use natural cavities and abandoned burrows instead of building a raised
    // mound of their own, so the entrance stays low and irregular.
    const burrowX = this.width * 0.82;
    const burrowY = this.groundY - 3;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.ellipse(burrowX, burrowY + 9, 51, 12, -0.08, 0, Math.PI * 2);
    ctx.fill();

    // Low, side-facing opening cut into the existing forest-floor soil.
    ctx.fillStyle = '#010201';
    ctx.strokeStyle = '#6b5133';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(burrowX - 47, burrowY + 3);
    ctx.quadraticCurveTo(burrowX - 36, burrowY - 9, burrowX - 14, burrowY - 7);
    ctx.quadraticCurveTo(burrowX + 7, burrowY - 12, burrowX + 28, burrowY - 5);
    ctx.quadraticCurveTo(burrowX + 42, burrowY - 1, burrowX + 48, burrowY + 4);
    ctx.quadraticCurveTo(burrowX + 27, burrowY + 11, burrowX + 4, burrowY + 8);
    ctx.quadraticCurveTo(burrowX - 21, burrowY + 13, burrowX - 47, burrowY + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // A small exposed-soil highlight makes the entrance readable against the
    // dark leaf litter without turning it into a constructed mound.
    ctx.strokeStyle = 'rgba(171, 126, 77, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(burrowX - 38, burrowY - 2);
    ctx.quadraticCurveTo(burrowX - 18, burrowY - 9, burrowX + 4, burrowY - 8);
    ctx.quadraticCurveTo(burrowX + 25, burrowY - 9, burrowX + 38, burrowY - 1);
    ctx.stroke();

    // A root partially covers one side, making the opening read as an
    // existing shelter rather than a freshly constructed nest.
    ctx.strokeStyle = '#293321';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(burrowX - 58, burrowY - 12);
    ctx.quadraticCurveTo(burrowX - 47, burrowY - 7, burrowX - 38, burrowY + 1);
    ctx.stroke();

    // Loose soil, stones and leaves are scattered around the entrance, not
    // piled into a pyramid.
    const burrowDebris = [
      [-50, -1, -0.45, '#606c38', 8, 3], [-35, 10, 0.25, '#bc6c25', 7, 3],
      [39, 8, -0.3, '#dda15e', 8, 3], [51, -4, 0.55, '#606c38', 7, 2.5],
      [-8, 13, 0.1, '#9d0208', 6, 2.5]
    ];
    burrowDebris.forEach(([dx, dy, rotation, color, rx, ry]) => {
      ctx.save();
      ctx.translate(burrowX + dx, burrowY + dy);
      ctx.rotate(rotation);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawParticles(ctx) {
    this.particles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha;

      if (this.currentHabitat === 'rainforest_canopy') {
        ctx.fillStyle = 'rgba(204, 255, 51, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ccff33';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.currentHabitat === 'mossy_pond') {
        ctx.fillStyle = '#90e0ef';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.currentHabitat === 'forest_floor') {
        ctx.fillStyle = '#dda15e';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }
}
