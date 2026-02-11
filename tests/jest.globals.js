const { jest: jestGlobal } = require("@jest/globals");

const shadowWebStorage = (key) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);

  if (!descriptor || descriptor.get) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: undefined,
    });
  }
};

shadowWebStorage("localStorage");
shadowWebStorage("sessionStorage");

global.vi = jestGlobal;
globalThis.vi = jestGlobal;
