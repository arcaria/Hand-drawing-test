class DomEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Bind handlers
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);

    this.state = {
      hoveredEl: null,
      selectedEl: null,
      dragging: false,
      resizing: false,
      resizeDir: null
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
          padding: 6px 10px;
          font-size: 12px;
          border-radius: 6px;
          z-index: 1000000;
          display: flex;
          gap: 8px;
        }

        .toolbar button {
          background: #333;
          color: white;
          border: none;
          padding: 4px 8px;
          cursor: pointer;
        }

        .handle {
          position: fixed;
          width: 10px;
          height: 10px;
          background: red;
          z-index: 1000001;
          cursor: nwse-resize;
        }
      </style>

      <div id="overlay" class="overlay"></div>
      <div id="toolbar" class="toolbar" hidden>
        <button id="editBtn">✏️</button>
        <button id="dupBtn">📦</button>
        <button id="delBtn">🗑</button>
      </div>

      <div id="handle" class="handle" hidden></div>
    `;
  }

  cacheDOM() {
    this.$ = {
      overlay: this.shadowRoot.getElementById('overlay'),
      toolbar: this.shadowRoot.getElementById('toolbar'),
      handle: this.shadowRoot.getElementById('handle'),
      editBtn: this.shadowRoot.getElementById('editBtn'),
      dupBtn: this.shadowRoot.getElementById('dupBtn'),
      delBtn: this.shadowRoot.getElementById('delBtn')
    };
  }

  attachEvents() {
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('click', this._onClick, true);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);

    this.$.editBtn.addEventListener('click', () => this.enableEdit());
    this.$.dupBtn.addEventListener('click', () => this.duplicate());
    this.$.delBtn.addEventListener('click', () => this.delete());
  }

  detachEvents() {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('click', this._onClick, true);
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mouseup', this._onMouseUp);
  }

  // ------------------------
  // 🎯 CORE
  // ------------------------

  _onMouseMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);

    if (!el || el === this || this.shadowRoot.contains(el)) return;

    this.state.hoveredEl = el;

    if (!this.state.dragging && !this.state.resizing) {
      this.updateOverlay(el);
    }

    if (this.state.dragging) {
      this.drag(e);
    }

    if (this.state.resizing) {
      this.resize(e);
    }
  }

  _onClick(e) {
    if (this.shadowRoot.contains(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    this.state.selectedEl = this.state.hoveredEl;
    this.updateOverlay(this.state.selectedEl);
    this.showToolbar(e.clientX, e.clientY);
    this.showHandle();
  }

  _onMouseDown(e) {
    if (e.target === this.$.handle) {
      this.state.resizing = true;
      return;
    }

    if (!this.state.selectedEl) return;

    this.state.dragging = true;

    const rect = this.state.selectedEl.getBoundingClientRect();
    this.startX = e.clientX;
    this.startY = e.clientY;

    this.offsetX = rect.left;
    this.offsetY = rect.top;
  }

  _onMouseUp() {
    this.state.dragging = false;
    this.state.resizing = false;
  }

  // ------------------------
  // 🟦 VISUALS
  // ------------------------

  updateOverlay(el) {
    const rect = el.getBoundingClientRect();

    Object.assign(this.$.overlay.style, {
      top: rect.top + 'px',
      left: rect.left + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px'
    });

    this.updateHandle(rect);
  }

  showToolbar(x, y) {
    this.$.toolbar.hidden = false;

    Object.assign(this.$.toolbar.style, {
      top: y + 10 + 'px',
      left: x + 10 + 'px'
    });
  }

  updateHandle(rect) {
    this.$.handle.hidden = false;

    Object.assign(this.$.handle.style, {
      top: rect.bottom - 5 + 'px',
      left: rect.right - 5 + 'px'
    });
  }

  showHandle() {
    this.$.handle.hidden = false;
  }

  // ------------------------
  // 🖱 INTERACTIONS
  // ------------------------

  drag(e) {
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    const el = this.state.selectedEl;

    el.style.position = 'absolute';
    el.style.left = this.offsetX + dx + 'px';
    el.style.top = this.offsetY + dy + 'px';

    this.updateOverlay(el);
  }

  resize(e) {
    const el = this.state.selectedEl;
    const rect = el.getBoundingClientRect();

    const width = e.clientX - rect.left;
    const height = e.clientY - rect.top;

    el.style.width = width + 'px';
    el.style.height = height + 'px';

    this.updateOverlay(el);
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
    this.$.overlay.style.width = '0';
  }

  duplicate() {
    const clone = this.state.selectedEl.cloneNode(true);
    this.state.selectedEl.after(clone);
  }
}

customElements.define('dom-editor', DomEditor);
