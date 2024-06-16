class NavigationRail extends HTMLElement{
    connectedCallback(){
        this.innerHTML =`
            <div id="nav-rail">
                <div>
                    <span class="icon">📋</span><a class="body2" href="/tasks">Tasks</a>
                </div>
                <div>
                    <span class="icon">✅</span><a class="body2" href="/reminders">Reminders</a>
                </div>
                <div>
                    <span class="icon">🛠️</span><a class="body2" href="/settings">Settings</a>
                </div>
                <div>
                    <span class="icon">👍</span><a class="body2" href="/attributions">Attributions</a>
                </div>
                <div>
                    <span class="icon">ℹ️</span><a class="body2" href="/about">About</a>
                </div>
            </div>
        `;
    }
}

customElements.define('navigation-rail',NavigationRail);
