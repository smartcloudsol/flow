import { initializeFlow } from "@smart-cloud/flow-core";


import "jquery";

import { observe } from "./observer";

function onDomReady(fn: () => void) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

onDomReady(async () => {
  initializeFlow();
  observe();
});
