// navigate-event.d.ts

interface NavigateEventInit extends EventInit {
    canIntercept?: boolean;
    destination: NavigationDestination;
    downloadRequest?: string;
    formData?: FormData;
    hashChange?: boolean;
    info?: any;
    navigationType?: 'push' | 'reload' | 'replace' | 'traverse';
    signal: AbortSignal;
    userInitiated?: boolean;
  }
  
  interface NavigationDestination {
    url: string;
    // Add other properties of NavigationDestination if needed
  }
  
  interface NavigateEvent extends Event {
    readonly canIntercept: boolean;
    readonly destination: NavigationDestination;
    readonly downloadRequest: string | null;
    readonly formData: FormData | null;
    readonly hashChange: boolean;
    readonly info: any;
    readonly navigationType: 'push' | 'reload' | 'replace' | 'traverse';
    readonly signal: AbortSignal;
    readonly userInitiated: boolean;
  
    intercept(options: { handler: () => void }): void;
  }

  interface Navigation extends EventTarget {
    addEventListener(
      type: 'navigate',
      listener: (this: Window, ev: NavigateEvent) => any,
      options?: boolean | AddEventListenerOptions
    ): void;
  }

  interface Versions {
    node: () => string;
    chrome: () => string;
    electron: () => string;
    onAppVersionRecived: (callback: (e: Event, data: string) => void) => void;
  }
  
  interface IpcNav {
    onLocationReceived: (callback: (e: Event, data: string) => void) => void;
  }
  
  interface ToggleNotification {
    onStatusChanged: (callback: (e: Event, data: boolean) => void) => void;
    sendResponse: (data: boolean) => void;
  }
  
  interface AutoLauncher {
    onStatusChanged: (callback: (e: Event, data: boolean) => void) => void;
  }
  
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/navigator) */
  declare var navigation: Navigation;

  declare var versions: Versions;

  declare var ipcNav: IpcNav;

  declare var toggleNotification: ToggleNotification;

  declare var autoLauncher: AutoLauncher;
  