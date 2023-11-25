const { join } = require("path");

module.exports = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        authors: "Vijaykoushik, S.",
        name: "ChronoChime",
        description:
          "Hourly Notification Desktop Application  with background sounds and notifications",
        iconUrl:
          "https://raw.githubusercontent.com/svijaykoushik/chrono-chime-desktop/main/chrono-chime-icon.ico",
        setupIcon: join(__dirname, "chrono-chime_package.ico"),
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        options: {
          icon: join(__dirname, "chrono-chime-icon-512.png"),
          maintainer: "Vijaykoushik, S.",
          productName: "ChoronoChime",
          homepage: "https://chrono-chime.web.app",
          genericName: "Hourly Notification",
          description:
            "Hourly Notification Desktop Application  with background sounds and notifications",
        },
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
  ],
};
