import { createSiteUI } from "@/ui/site";

const ui = createSiteUI();
const events = new AbortController();
function dispose() {
  events.abort();
  ui.dispose();
}
window.addEventListener(
  "pagehide",
  event => {
    if (!event.persisted) dispose();
  },
  { signal: events.signal }
);
import.meta.hot?.dispose(dispose);
