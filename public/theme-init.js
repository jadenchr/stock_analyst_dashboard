/* StockVision — pre-hydration theme bootstrap.
 * Reads the same localStorage key the Zustand `useTheme` store writes to
 * and sets the html class before paint so there's no FOUC.
 */
(function () {
  try {
    var raw = localStorage.getItem("stockvision.theme.v1");
    var pref = "dark";
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.state && parsed.state.preference) {
        pref = parsed.state.preference;
      }
    }
    var resolved = pref;
    if (pref === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    var html = document.documentElement;
    html.classList.remove("light", "dark");
    html.classList.add(resolved);
    html.style.colorScheme = resolved;
  } catch (e) {
    /* ignore — default class on <html> applies */
  }
})();
