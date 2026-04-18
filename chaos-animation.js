class ChaosAnimation extends HTMLElement {
  // 1. Tell the browser which attributes to watch
  static get observedAttributes() {
    return ['color', 'speed'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.particles = [];
    this.baseSpeed = 5;
    this.activeColor = null;
  }

  // 2. This runs whenever you hit "Set" in your Manager
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'color') {
      this.activeColor = newValue;
      // Update existing particles immediately
      this.particles.forEach(p => p.color = newValue);
    }
    if (name === 'speed') {
      const multiplier = parseFloat(newValue) || 1;
      this.particles.forEach(p => {
        // Normalize then apply new speed
        const currentSpeed = Math.sqrt(p.dx**2 + p.dy**2);
        p.dx = (p.dx / currentSpeed) * multiplier * 5;
        p.dy = (p.dy / currentSpeed) * multiplier * 5;
      });
    }
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        canvas {
          position: fixed; top: 0; left: 0;
          width: 100vw; height: 100vh;
          pointer-events: none;
          z-index: 9998;
        }
      </style>
      <canvas id="canvas"></canvas>
    `;
    this.init();
  }

  init() {
    const canvas = this.shadowRoot.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 5 + 2,
      dx: (Math.random() - 0.5) * 10,
      dy: (Math.random() - 0.5) * 10,
      color: this.activeColor || `hsl(${Math.random() * 360}, 70%, 60%)`
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.particles.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      this._frame = requestAnimationFrame(animate);
    };
    animate();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._frame);
  }
}

customElements.define('chaos-animation', ChaosAnimation);
