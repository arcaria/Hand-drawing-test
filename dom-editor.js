class DomEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Bind
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);

    this.state = {
      hoveredEl: null,
      selectedEl: null,

      mode: null, // 'drag' | 'resize' | null

      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0
    };
  }

  connectedCallback() {
    this.render();
    this.cacheDOM();
    this.attachEvents();
  }

  disconnectedCallback() {
    this.detachEvents();
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
          color: #fff;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          gap: 5px;
          z-index: 1000000;
        }

        .toolbar button {
          background: #333;
          color: white;
          border: none;
          padding: 4px 6px;
          cursor: pointer;
        }

        .handle {
          position: fixed;
          width: 12px;
          height: 12px;
          background: red;
          cursor: nwse-resize;
          z-index: 1000001;
        }
      </style>

      <div id="overlay" class="overlay"></div>
      <div id="toolbar" class="toolbar" hidden>
        <button id="edit">✏️</button>
        <button id="dup">📦</button>
        <button id="del">🗑</button>
      </div>
      <div id="handle" class="handle" hidden></div>
    `;
  }

  cacheDOM() {
    this.$ = {
      overlay: this.shadowRoot.getElementById('overlay'),
      toolbar: this.shadowRoot.getElementById('toolbar'),
      handle: this.shadowRoot.getElementById('handle'),
      edit: this.shadowRoot.getElementById('edit'),
      dup: this.shadowRoot.getElementById('dup'),
      del: this.shadowRoot.getElementById('del')
    };
  }

  attachEvents() {
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('click', this._onClick, true);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);

    // Toolbar actions (CRITICAL: stop propagation)
    this.$.edit.addEventListener('click', (e) => {
      e.stopPropagation();
      this.enableEdit();
    });

    this.$.dup.addEventListener('click', (e) => {
      e.stopPropagation();
      this.duplicate();
    });

    this.$.del.addEventListener('click', (e) => {
      e.stopPropagation();
      this.delete();
    });
  }

  detachEvents() {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('click', this._onClick, true);
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mouseup', this._onMouseUp);
  }

  // ------------------------
  // 🎯 SELECTION ENGINE
  // ------------------------

  _onMouseMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);

    if (!el || this.shadowRoot.contains(el)) return;

    this.state.hoveredEl = el;

    if (!this.state.mode) {
      this.updateOverlay(el);
    }

    if (this.state.mode === 'drag') this.drag(e);
    if (this.state.mode === 'resize') this.resize(e);
  }

  _onClick(e) {
    if (this.shadowRoot.contains(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    this.state.selectedEl = this.state.hoveredEl;
    this.updateOverlay(this.state.selectedEl);
    this.showUI(e);
  }

  // ------------------------
  // 🖱 INTERACTION ENGINE
  // ------------------------

  _onMouseDown(e) {
    if (e.target === this.$.handle) {
      this.state.mode = 'resize';
      return;
    }

    if (!this.state.selectedEl) return;

    // Start drag only if clicking selected element
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

  drag(e) {
    const dx = e.clientX - this.state.startX;
    const dy = e.clientY - this.state.startY;

    const el = this.state.selectedEl;

    el.style.position = 'absolute';
    el.style.left = this.state.offsetX + dx + 'px';
    el.style.top = this.state.offsetY + dy + 'px';

    this.updateOverlay(el);
  }

  resize(e) {
    const el = this.state.selectedEl;
    const rect = el.getBoundingClientRect();

    const width = e.clientX - rect.left;
    const height = e.clientY - rect.top;

    el.style.width = Math.max(20, width) + 'px';
    el.style.height = Math.max(20, height) + 'px';

    this.updateOverlay(el);
  }

  // ------------------------
  // 🟦 UI ENGINE
  // ------------------------

  showUI(e) {
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
    if (!this.state.selectedEl) return;

    const rect = this.state.selectedEl.getBoundingClientRect();

    this.$.handle.hidden = false;

    Object.assign(this.$.handle.style, {
      top: rect.bottom - 6 + 'px',
      left: rect.right - 6 + 'px'
    });
  }

  // ------------------------
  // 🧩 ACTIONS
  // ------------------------

  enableEdit() {
    const el = this.state.selectedEl;
    el.contentEditable = true;
    el.focus();
  }

  delete() {
    this.state.selectedEl?.remove();
    this.$.toolbar.hidden = true;
  }

  duplicate() {
    const clone = this.state.selectedEl.cloneNode(true);
    this.state.selectedEl.after(clone);
  }
}

customElements.define('dom-editor', DomEditor);
