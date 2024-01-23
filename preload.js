const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('versions', {
    electron: () => process.versions.electron,
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    onAppVersionRecived: (listener) => {
        ipcRenderer.on('app-version', listener);
    }
});
