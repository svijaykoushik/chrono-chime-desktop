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
        box-shadow: 0px 3px 3px -2px rgba(0,0,0,0.2),
          0px 3px 4px 0px rgba(0,0,0,0.14),
          0px 1px 8px 0px rgba(0,0,0,0.12);
        z-index: 3;
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
