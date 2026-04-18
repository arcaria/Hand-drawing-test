class DomEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);

    this.state = {
      hoveredEl: null,
      selectedEl: null,
      mode: null,

      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,

      grid: 10,
      snap: true,
      locked: new WeakSet(),

      history: [],
      future: []
    };
  }

  connectedCallback() {
    this.render();
    this.cacheDOM();
    this.attachEvents();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .overlay {
          position: fixed;
          border: 2px dashed #00aaff;
          pointer-events: none;
          z-index: 999999;
        }

        .toolbar {
          position: fixed;
          background: #111;
          color: white;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          gap: 5px;
          z-index: 1000000;
        }

        .panel {
          position: fixed;
          right: 0;
          top: 0;
          width: 260px;
          height: 100vh;
          background: #1e1e1e;
          color: white;
          font-size: 12px;
          padding: 10px;
          z-index: 1000000;
          overflow-y: auto;
        }

        input {
          width: 100%;
          margin-bottom: 6px;
        }

        button {
          cursor: pointer;
        }

        .handle {
          position: fixed;
          width: 12px;
          height: 12px;
          background: red;
          z-index: 1000001;
          cursor: nwse-resize;
        }
      </style>

      <div id="overlay" class="overlay"></div>
      <div id="toolbar" class="toolbar" hidden>
        <button id="undo">↩</button>
        <button id="redo">↪</button>
        <button id="lock">🔒</button>
        <button id="snap">📐</button>
        <button id="export">💾</button>
      </div>

      <div id="handle" class="handle" hidden></div>

      <div id="panel" class="panel">
        <h4>Inspector</h4>
        <label>Width</label>
        <input id="width" />
        <label>Height</label>
        <input id="height" />
        <label>Background</label>
        <input id="bg" />
      </div>
    `;
  }

  cacheDOM() {
    this.$ = {
      overlay: this.shadowRoot.getElementById('overlay'),
      toolbar: this.shadowRoot.getElementById('toolbar'),
      handle: this.shadowRoot.getElementById('handle'),
      panel: this.shadowRoot.getElementById('panel'),

      width: this.shadowRoot.getElementById('width'),
      height: this.shadowRoot.getElementById('height'),
      bg: this.shadowRoot.getElementById('bg'),

      undo: this.shadowRoot.getElementById('undo'),
      redo: this.shadowRoot.getElementById('redo'),
      lock: this.shadowRoot.getElementById('lock'),
      snap: this.shadowRoot.getElementById('snap'),
      export: this.shadowRoot.getElementById('export')
    };
  }

  attachEvents() {
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('click', this._onClick, true);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);

    this.$.undo.onclick = () => this.undo();
    this.$.redo.onclick = () => this.redo();
    this.$.lock.onclick = () => this.toggleLock();
    this.$.snap.onclick = () => this.state.snap = !this.state.snap;
    this.$.export.onclick = () => this.exportHTML();

    this.$.width.oninput = () => this.applyStyle('width', this.$.width.value);
    this.$.height.oninput = () => this.applyStyle('height', this.$.height.value);
    this.$.bg.oninput = () => this.applyStyle('background', this.$.bg.value);
  }

  // ------------------------
  // CORE
  // ------------------------

  _onMouseMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || this.shadowRoot.contains(el)) return;

    this.state.hoveredEl = el;

    if (!this.state.mode) this.updateOverlay(el);

    if (this.state.mode === 'drag') this.drag(e);
    if (this.state.mode === 'resize') this.resize(e);
  }

  _onClick(e) {
    if (this.shadowRoot.contains(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    this.select(this.state.hoveredEl, e);
  }

  _onMouseDown(e) {
    if (e.target === this.$.handle) {
      this.state.mode = 'resize';
      return;
    }

    if (!this.state.selectedEl) return;
    if (this.state.locked.has(this.state.selectedEl)) return;

    if (e.target === this.state.selectedEl) {
      this.state.mode = 'drag';

      const rect = this.state.selectedEl.getBoundingClientRect();

      this.state.startX = e.clientX;
      this.state.startY = e.clientY;
      this.state.offsetX = rect.left;
      this.state.offsetY = rect.top;
    }
  }

  _onMouseUp() {
    this.state.mode = null;
  }

  // ------------------------
  // ENGINES
  // ------------------------

  select(el, e) {
    this.state.selectedEl = el;
    this.updateOverlay(el);
    this.updatePanel();
    this.showToolbar(e);
  }

  drag(e) {
    const dx = e.clientX - this.state.startX;
    const dy = e.clientY - this.state.startY;

    let x = this.state.offsetX + dx;
    let y = this.state.offsetY + dy;

    if (this.state.snap) {
      x = Math.round(x / this.state.grid) * this.state.grid;
      y = Math.round(y / this.state.grid) * this.state.grid;
    }

    const el = this.state.selectedEl;

    el.style.position = 'absolute';
    el.style.left = x + 'px';
    el.style.top = y + 'px';

    this.updateOverlay(el);
  }

  resize(e) {
    const el = this.state.selectedEl;
    const rect = el.getBoundingClientRect();

    let w = e.clientX - rect.left;
    let h = e.clientY - rect.top;

    if (this.state.snap) {
      w = Math.round(w / this.state.grid) * this.state.grid;
      h = Math.round(h / this.state.grid) * this.state.grid;
    }

    el.style.width = w + 'px';
    el.style.height = h + 'px';

    this.updateOverlay(el);
  }

  // ------------------------
  // PANEL
  // ------------------------

  updatePanel() {
    const el = this.state.selectedEl;
    if (!el) return;

    this.$.width.value = el.style.width || '';
    this.$.height.value = el.style.height || '';
    this.$.bg.value = el.style.background || '';
  }

  applyStyle(prop, value) {
    this.saveHistory();
    this.state.selectedEl.style[prop] = value;
    this.updateOverlay(this.state.selectedEl);
  }

  // ------------------------
  // HISTORY
  // ------------------------

  saveHistory() {
    this.state.history.push(document.body.innerHTML);
    this.state.future = [];
  }

  undo() {
    if (!this.state.history.length) return;
    this.state.future.push(document.body.innerHTML);
    document.body.innerHTML = this.state.history.pop();
  }

  redo() {
    if (!this.state.future.length) return;
    this.state.history.push(document.body.innerHTML);
    document.body.innerHTML = this.state.future.pop();
  }

  // ------------------------
  // FEATURES
  // ------------------------

  toggleLock() {
    const el = this.state.selectedEl;
    if (this.state.locked.has(el)) {
      this.state.locked.delete(el);
    } else {
      this.state.locked.add(el);
    }
  }

  exportHTML() {
    const html = document.documentElement.outerHTML;
    console.log(html);
    alert('HTML exported to console');
  }

  // ------------------------
  // UI
  // ------------------------

  showToolbar(e) {
    this.$.toolbar.hidden = false;

    Object.assign(this.$.toolbar.style, {
      top: e.clientY + 10 + 'px',
      left: e.clientX + 10 + 'px'
    });

    this.updateHandle();
  }

  updateOverlay(el) {
    const rect = el.getBoundingClientRect();

    Object.assign(this.$.overlay.style, {
      top: rect.top + 'px',
      left: rect.left + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px'
    });

    this.updateHandle();
  }

  updateHandle() {
    const rect = this.state.selectedEl.getBoundingClientRect();

    this.$.handle.hidden = false;

    Object.assign(this.$.handle.style, {
      top: rect.bottom - 6 + 'px',
      left: rect.right - 6 + 'px'
    });
  }
}

customElements.define('dom-editor', DomEditor);
