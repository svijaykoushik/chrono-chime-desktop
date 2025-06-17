// forge.config.js
// this file is required for wdio to run correctly
require('ts-node').register();
module.exports = require('./forge.config.ts').default;
