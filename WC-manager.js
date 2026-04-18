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
    if (!customElements.get(tag)) {
      console.log(`Loading script for ${tag}...`);
      const script = document.createElement('script');
      script.src = url;
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
    // We check our registry tags to see if they exist in the actual document
    const activeTags = this.registry.filter(c => document.querySelector(c.tag));

    inspector.innerHTML = activeTags.length ? activeTags.map(c => `
      <div class="item" style="border-left: 3px solid var(--accent)">
        <strong>&lt;${c.tag}&gt;</strong>
        <span class="status-badge">ACTIVE</span>
        <div style="margin-top:5px">
            <button class="btn-sm" style="background:#89b4fa" onclick="document.querySelector('${c.tag}').remove()">Remove from DOM</button>
        </div>
      </div>
    `).join('') : '<div style="font-size:12px; color:#6c7086">No tracked components active.</div>';
  }

  renderList() {
    const list = this.shadowRoot.getElementById('list');
    list.innerHTML = this.registry.map((comp, i) => `
      <div class="item">
        <strong>&lt;${comp.tag}&gt;</strong>
        <div style="margin-top:8px">
          <button class="btn-sm btn-exec" data-index="${i}">Execute</button>
          <button class="btn-sm btn-del" data-del-index="${i}">Delete</button>
        </div>
      </div>
    `).join('');

    // Attach listeners to buttons after rendering
    list.querySelectorAll('.btn-exec').forEach(btn => {
      btn.onclick = () => {
        const item = this.registry[btn.dataset.index];
        this.executeComponent(item.tag, item.url);
      };
    });

    list.querySelectorAll('.btn-del').forEach(btn => {
      btn.onclick = () => {
        this.registry.splice(btn.dataset.delIndex, 1);
        localStorage.setItem('wc-registry', JSON.stringify(this.registry));
        this.renderList();
      };
    });
  }
}

customElements.define('component-manager', ComponentManager);
