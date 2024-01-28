const { join } = require('path');

module.exports = {
    packagerConfig: {
        asar: true,
        icon: 'chrono-chime-icon.ico',
        name: 'chrono-chime-desktop',
        win32metadata: {
            CompanyName: 'Vijaykoushik, S.',
            ProductName: 'ChronoChime',
        },
    },
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                authors: 'Vijaykoushik, S.',
                name: 'chrono-chime-desktop',
                description:
                    'Hourly Notification Desktop Application  with background sounds and notifications',
                iconUrl:
                    'https://raw.githubusercontent.com/svijaykoushik/chrono-chime-desktop/main/chrono-chime-icon.ico',
                setupIcon: join(__dirname, 'chrono-chime_package.ico'),
                setupExe: 'chrono_chime_desktop_setup.exe',
                title: 'Chrono Chime'
            },
        },
        {
            name: '@electron-forge/maker-zip',
            platforms: ['darwin','win32'],
        },
        {
            name: '@electron-forge/maker-deb',
            config: {
                options: {
                    icon: join(__dirname, 'chrono-chime-icon-512.png'),
                    maintainer: 'Vijaykoushik, S.',
                    productName: 'Chrono Chime',
                    homepage: 'https://chrono-chime.web.app',
                    genericName: 'Hourly Notification',
                    description:
                        'Hourly Notification Desktop Application  with background sounds and notifications',
                    name: 'chrono-chime-desktop',
                },
            },
        },
        {
            name: '@electron-forge/maker-rpm',
            config: {
                options: {
                    description:
                        'Hourly Notification Desktop Application  with background sounds and notifications',
                    genericName: 'Hourly Notification',
                    homepage: 'https://chrono-chime.web.app',
                    icon: join(__dirname, 'chrono-chime-icon-512.png'),
                    name: 'chrono-chime-desktop',
                    productName: 'Chrono Chime',
                },
            },
        },
    ],
    plugins: [
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
            config: {},
        },
    ],
};
