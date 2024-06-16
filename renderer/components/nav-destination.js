class NavDestination extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    const icon = this.getAttribute('icon');
    const label = this.getAttribute('label');
    this.href = this.getAttribute('href');
    console.log('Href attr',this.href);
    this.shadowRoot.innerHTML = `
            <style>${this.getStyle()}</style>
            <div class="icon">${icon}</div>
            <div class="label">${label}</div>
        `;
    setTimeout(() => this.initDestinations());
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
        color: #555;
      }

      :host(.active) {
        font-weight: bold;
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
        letter-spacing: 1.5px;
        font-weight: 500;
        text-transform: uppercase;
        font-size: 14px;
        display: inline-block;
      }
    `;
  }

  initDestinations() {
    const destinations = this.querySelectorAll('nav-destination');
    console.log('destinations',destinations);
    destinations.forEach((destination) => {
      destination.addEventListener('click', (e) => {
        e.preventDefault();
        destinations.forEach((d) => d.classList.remove('active'));
        destination.classList.add('active');
        console.log('Selected destination', destination, this.href);
        if(this.href !==''){
          history.pushState(null,null,this.href);
        }
      });
    });
  }
}

customElements.define('nav-destination',NavDestination);
