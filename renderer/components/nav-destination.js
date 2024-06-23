class NavDestination extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    const icon = this.getAttribute('icon');
    const label = this.getAttribute('label');
    this.href = this.getAttribute('href');
    this.addEventListener('click',(e)=>{
      e.preventDefault();
      if (this.href !== '') {
        history.pushState(null, null, this.href);
      }
    });
    this.shadowRoot.innerHTML = `
            <style>${this.getStyle()}</style>
            <div class="icon">${icon}</div>
            <div class="label">${label}</div>
        `;
  }

  getStyle() {
    return `
      :host {
        width: 72px;
        height: 72px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        text-align: center;
        color:  var(--text-color-hex);;
      }

      :host(.active) {
        font-weight: bold;
        color: var(--accent-color-hex); 
      }

      .icon {
        font-size: 24px;
        margin-bottom: calc(72px / 2 - 1.5em / 2); /* Center vertically */;
        font-family: var(--app-emoji-font-family)
      }

      :host(.active) .icon {
        margin-bottom: 14px;
      }

      .label {
        font-weight: 500;
        text-transform: uppercase;
        font-size: 14px;
        display: inline-block;
      }
    `;
  }
}

customElements.define('nav-destination', NavDestination);
