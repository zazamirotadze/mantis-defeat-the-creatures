/*
 * TreePlatform entity – simple rectangular platform representing a tree branch
 * Used as a jump source for the Hyla frog enemy.
 */
class TreePlatform {
  constructor(x, y, width = 80, height = 12) {
    this.x = x;
    this.y = y; // top Y coordinate (platform surface)
    this.width = width;
    this.height = height;
    this.type = 'tree';
  }

  // Detailed mossy branch used as Hyla's starting perch.
  draw(ctx) {
    ctx.save();
    const midY = this.y + this.height * 0.5;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1b120d';
    ctx.lineWidth = this.height + 7;
    ctx.beginPath();
    ctx.moveTo(this.x - 28, midY + 4);
    ctx.bezierCurveTo(
      this.x + this.width * 0.24, midY - 13,
      this.x + this.width * 0.70, midY + 10,
      this.x + this.width + 38, midY - 4
    );
    ctx.stroke();

    ctx.strokeStyle = '#5b3925';
    ctx.lineWidth = this.height;
    ctx.beginPath();
    ctx.moveTo(this.x - 28, midY);
    ctx.bezierCurveTo(
      this.x + this.width * 0.24, midY - 13,
      this.x + this.width * 0.70, midY + 10,
      this.x + this.width + 38, midY - 4
    );
    ctx.stroke();

    // Bark grain and knots.
    ctx.strokeStyle = 'rgba(32, 20, 12, 0.72)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const grainX = this.x + 24 + i * (this.width / 5);
      ctx.beginPath();
      ctx.moveTo(grainX, midY - 5);
      ctx.quadraticCurveTo(grainX + 18, midY + 2, grainX + 32, midY - 3);
      ctx.stroke();
    }

    ctx.fillStyle = '#4f772d';
    ctx.beginPath();
    ctx.ellipse(this.x + 38, midY - 9, 25, 5, -0.12, 0, Math.PI * 2);
    ctx.ellipse(this.x + this.width * 0.72, midY + 6, 30, 5, 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Small hanging root at the right edge makes the perch read as a tree branch.
    ctx.strokeStyle = '#3b2719';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(this.x + this.width - 2, midY - 1);
    ctx.quadraticCurveTo(this.x + this.width + 26, midY + 30, this.x + this.width + 16, midY + 58);
    ctx.stroke();
    ctx.restore();
  }

  // Collision check – returns true if a point (px, py) is on top of the platform
  isStandingOn(px, py, entityWidth, entityHeight) {
    // Check horizontal overlap
    const withinX = px + entityWidth > this.x && px < this.x + this.width;
    // Check vertical: entity bottom is at py (its y coordinate represents bottom for enemy)
    const onTop = Math.abs(py - this.y) <= 2; // tolerance 2px
    return withinX && onTop;
  }
}

// Export for module usage (commonjs style used in other files)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TreePlatform };
}
