class ComponentManager extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.registry = JSON.parse(localStorage.getItem('wc-registry')) || [];

    this.shadowRoot.innerHTML = `
      <style>
        :host { --primary: #6366f1; --bg: #1e1e2e; --text: #cdd6f4; --accent: #a6e3a1; font-family: sans-serif; }
        .trigger-btn { position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 10px; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer; }
        .sidebar { position: fixed; top: 0; right: -350px; width: 320px; height: 100%; background: var(--bg); color: var(--text); z-index: 10000; transition: right 0.3s ease; padding: 20px; box-shadow: -5px 0 15px rgba(0,0,0,0.5); display: flex; flex-direction: column; box-sizing: border-box; }
        .sidebar.open { right: 0; }
        .section-title { font-size: 14px; text-transform: uppercase; color: #9399b2; margin: 20px 0 10px 0; border-bottom: 1px solid #45475a; padding-bottom: 5px; }
        input { width: 100%; padding: 8px; margin-bottom: 5px; border-radius: 4px; border: 1px solid #45475a; background: #313244; color: white; box-sizing: border-box; }
        button.action { width: 100%; background: var(--primary); color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; margin-top: 5px; }
        .component-list, .inspector-list { flex: 1; overflow-y: auto; }
        .item { background: #313244; padding: 10px; border-radius: 6px; margin-bottom: 10px; font-size: 12px; }
        .btn-sm { padding: 4px 8px; cursor: pointer; border: none; border-radius: 3px; margin-right: 5px; }
        .btn-exec { background: var(--accent); }
        .btn-del { background: #f38ba8; color: white; }
        .status-badge { font-size: 10px; padding: 2px 5px; border-radius: 10px; background: #45475a; float: right; }
      </style>

      <button class="trigger-btn">🛠 Manager</button>
      
      <div class="sidebar">
        <div style="display:flex; justify-content: space-between; align-items:center;">
            <h3>WC Orchestrator</h3>
            <button id="closeBtn" style="background:none; border:none; color:white; cursor:pointer; font-size:20px;">×</button>
        </div>

        <div class="section-title">Add New Source</div>
        <input type="text" id="tagInput" placeholder="Tag Name (e.g. chatbot-demo)">
        <input type="text" id="urlInput" placeholder="JS URL">
        <button class="action" id="addBtn">Save to List</button>

        <div class="section-title">Source Library</div>
        <div class="component-list" id="list"></div>

        <div class="section-title">State Inspector (Active in DOM)</div>
        <div class="inspector-list" id="inspector"></div>
      </div>
    `;
  }

  connectedCallback() {
    this.shadowRoot.getElementById('addBtn').onclick = () => this.addComponent();
    this.shadowRoot.querySelector('.trigger-btn').onclick = () => this.shadowRoot.querySelector('.sidebar').classList.add('open');
    this.shadowRoot.getElementById('closeBtn').onclick = () => this.shadowRoot.querySelector('.sidebar').classList.remove('open');
    this.renderList();

    // Start the inspector loop to check for active tags every 2 seconds
    setInterval(() => this.inspectDOM(), 2000);
  }

  addComponent() {
    const tag = this.shadowRoot.getElementById('tagInput').value;
    const url = this.shadowRoot.getElementById('urlInput').value;
    if (tag && url) {
      this.registry.push({ tag, url });
      localStorage.setItem('wc-registry', JSON.stringify(this.registry));
      this.renderList();
    }
  }

  // The missing link: Properly injecting the script and then the tag
  async executeComponent(tag, url) {
    // We add a timestamp to the URL to ensure we ALWAYS get the latest version
    const versionedUrl = `${url}?t=${Date.now()}`;

    if (!customElements.get(tag)) {
      console.log(`Loading script for ${tag}...`);
      const script = document.createElement('script');
      script.src = versionedUrl;
      script.type = 'text/javascript';
      document.head.appendChild(script);

      // Wait for the element to be defined in the registry
      await customElements.whenDefined(tag);
    }

    if (!document.querySelector(tag)) {
      const el = document.createElement(tag);
      document.body.appendChild(el);
    }
    this.inspectDOM();
  }

  inspectDOM() {
    const inspector = this.shadowRoot.getElementById('inspector');
    const activeComponents = this.registry.filter(c => document.querySelector(c.tag));

    // 1. Get current list of tags already showing in the inspector
    const existingTags = Array.from(inspector.querySelectorAll('.item')).map(el => el.dataset.tag);
    const activeTagNames = activeComponents.map(c => c.tag);

    // 2. Only rebuild if the list of active components actually changed
    // This prevents wiping out your textboxes while you're typing!
    if (JSON.stringify(existingTags) !== JSON.stringify(activeTagNames)) {
      this.renderInspector(activeComponents);
    }
  }

  renderInspector(activeComponents) {
    const inspector = this.shadowRoot.getElementById('inspector');
    if (activeComponents.length === 0) {
      inspector.innerHTML = '<div style="font-size:12px; color:#6c7086">No tracked components active.</div>';
      return;
    }

    inspector.innerHTML = activeComponents.map(c => `
      <div class="item" data-tag="${c.tag}" style="border-left: 3px solid var(--accent)">
        <strong>&lt;${c.tag}&gt;</strong>
        <span class="status-badge">ACTIVE</span>
        
        <div style="margin-top:10px; display:flex; flex-direction:column; gap:5px;">
            <div style="display:flex; gap:2px;">
                <input type="text" placeholder="attr" class="attr-key" style="flex:1; font-size:10px; margin:0;">
                <input type="text" placeholder="val" class="attr-val" style="flex:1; font-size:10px; margin:0;">
                <button class="btn-sm btn-set" style="background:var(--primary); color:white;">Set</button>
            </div>
            <button class="btn-sm btn-remove" style="background:#89b4fa; width:100%;">Remove from DOM</button>
        </div>
      </div>
    `).join('');

    // Attach listeners manually to avoid string-based 'onclick' issues
    inspector.querySelectorAll('.item').forEach(itemEl => {
      const tag = itemEl.dataset.tag;
      const targetEl = document.querySelector(tag);

      itemEl.querySelector('.btn-set').onclick = () => {
        const key = itemEl.querySelector('.attr-key').value;
        const val = itemEl.querySelector('.attr-val').value;
        if (key) targetEl.setAttribute(key, val);
      };

      itemEl.querySelector('.btn-remove').onclick = () => {
        targetEl.remove();
        this.inspectDOM(); // Immediate refresh
      };
    });
  }
}

customElements.define('component-manager', ComponentManager);
