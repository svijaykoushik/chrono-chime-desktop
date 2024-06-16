class NavRail extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
            <style>${this.getStyle()}</style>
            <slot></slot>
        `;
    setTimeout(() => this.initDestinations());
  }

  getStyle() {
    return `
      :host{
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: rgba(255, 255, 255, 1);
          padding-top: 8px;
          width: 72px;            
          height: 100vh;
          box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
          z-index: 2;
      }
    `;
  }

  initDestinations() {
    const destinations = this.querySelectorAll('nav-destination');
    destinations.forEach((destination) => {
      destination.addEventListener('click', (e) => {
        e.preventDefault();
        destinations.forEach((d) => d.classList.remove('active'));
        destination.classList.add('active');
      });
    });
  }
}

customElements.define('nav-rail', NavRail);
