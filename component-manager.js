class ComponentManager extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Load saved components from localStorage or default to an empty list
    this.registry = JSON.parse(localStorage.getItem('wc-registry')) || [];
    
    this.shadowRoot.innerHTML = `
      <style>
        :host { --primary: #6366f1; --bg: #1e1e2e; --text: #cdd6f4; }
        .trigger-btn {
          position: fixed; top: 20px; right: 20px; z-index: 9999;
          padding: 10px 15px; background: var(--primary); color: white;
          border: none; border-radius: 8px; cursor: pointer; font-weight: bold;
        }
        .sidebar {
          position: fixed; top: 0; right: -350px; width: 320px; height: 100%;
          background: var(--bg); color: var(--text); z-index: 10000;
          transition: right 0.3s ease; padding: 20px; box-shadow: -5px 0 15px rgba(0,0,0,0.5);
          display: flex; flex-direction: column; font-family: sans-serif;
        }
        .sidebar.open { right: 0; }
        .close-btn { align-self: flex-end; cursor: pointer; background: none; border: none; color: white; font-size: 20px; }
        
        .form-group { margin: 20px 0; display: flex; flex-direction: column; gap: 8px; }
        input { padding: 8px; border-radius: 4px; border: 1px solid #45475a; background: #313244; color: white; }
        button.action { background: var(--primary); color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; }
        
        .component-list { flex: 1; overflow-y: auto; margin-top: 20px; border-top: 1px solid #45475a; padding-top: 10px; }
        .item { 
          background: #313244; padding: 10px; border-radius: 6px; margin-bottom: 10px;
          display: flex; flex-direction: column; gap: 5px; font-size: 13px;
        }
        .item-actions { display: flex; gap: 5px; }
        .btn-sm { font-size: 11px; padding: 4px 8px; cursor: pointer; border: none; border-radius: 3px; }
        .btn-exec { background: #a6e3a1; color: #111; }
        .btn-del { background: #f38ba8; color: white; }
      </style>

      <button class="trigger-btn">🛠 Component Manager</button>
      
      <div class="sidebar">
        <button class="close-btn">×</button>
        <h3>Add Web Component</h3>
        <div class="form-group">
          <input type="text" id="tagInput" placeholder="Tag Name (e.g. my-element)">
          <input type="text" id="urlInput" placeholder="JS URL (CDN Link)">
          <button class="action" id="addBtn">Save to Source List</button>
        </div>

        <div class="component-list" id="list"></div>
      </div>
    `;
  }

  connectedCallback() {
    const shadow = this.shadowRoot;
    shadow.querySelector('.trigger-btn').onclick = () => shadow.querySelector('.sidebar').classList.add('open');
    shadow.querySelector('.close-btn').onclick = () => shadow.querySelector('.sidebar').classList.remove('open');
    shadow.getElementById('addBtn').onclick = () => this.addComponent();
    this.renderList();
  }

  addComponent() {
    const tag = this.shadowRoot.getElementById('tagInput').value;
    const url = this.shadowRoot.getElementById('urlInput').value;
    if (!tag || !url) return;
    
    this.registry.push({ tag, url });
    this.save();
    this.renderList();
  }

  save() {
    localStorage.setItem('wc-registry', JSON.stringify(this.registry));
  }

  deleteComponent(index) {
    this.registry.splice(index, 1);
    this.save();
    this.renderList();
  }

  executeComponent(tag, url) {
    // 1. Inject Script
    if (!document.querySelector(`script[src="${url}"]`)) {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => this.injectTag(tag);
      document.head.appendChild(script);
    } else {
      this.injectTag(tag);
    }
  }

  injectTag(tag) {
    if (!document.querySelector(tag)) {
      const el = document.createElement(tag);
      document.body.appendChild(el);
      console.log(`🚀 ${tag} injected!`);
    }
  }

  renderList() {
    const list = this.shadowRoot.getElementById('list');
    list.innerHTML = this.registry.map((comp, i) => `
      <div class="item">
        <strong>&lt;${comp.tag}&gt;</strong>
        <span style="font-size:10px; color:#bac2de; word-break: break-all;">${comp.url}</span>
        <div class="item-actions">
          <button class="btn-sm btn-exec" onclick="this.getRootNode().host.executeComponent('${comp.tag}', '${comp.url}')">Execute</button>
          <button class="btn-sm btn-del" onclick="this.getRootNode().host.deleteComponent(${i})">Delete</button>
        </div>
      </div>
    `).join('');
  }
}

customElements.define('component-manager', ComponentManager);
