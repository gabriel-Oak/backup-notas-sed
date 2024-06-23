import executeProcess from "./execute-process.mjs";

(async () => {
  executeProcess('.block.to-click:not(.btn-disabled)');
})();