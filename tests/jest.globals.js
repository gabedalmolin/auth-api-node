const { jest: jestGlobal } = require("@jest/globals");

global.vi = jestGlobal;
globalThis.vi = jestGlobal;
