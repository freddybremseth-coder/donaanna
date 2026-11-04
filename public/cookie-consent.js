/* Consent preferences: analytics and marketing are off until explicitly enabled. */
(function () {
  "use strict";
  var key = "donaanna:cookie-consent:v1";
  function choice() { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (_) { return null; } }
  window.donaannaAnalyticsAllowed = function () { return choice()?.analytics === true; };
  function init() {
    var trigger = document.createElement("button");
    trigger.textContent = "Kapselvalg";
    trigger.setAttribute("aria-label", "Endre informasjonskapsler");
    trigger.style.cssText = "position:fixed;bottom:12px;left:12px;z-index:99990;background:#fff;color:#244a3a;border:1px solid #aaa;border-radius:30px;padding:8px 12px;cursor:pointer;font:12px sans-serif";
    document.body.appendChild(trigger);
    var shade = document.createElement("div");
    shade.style.cssText = "position:fixed;inset:0;z-index:99999;background:#0009;display:none;align-items:flex-end;justify-content:center;padding:16px;box-sizing:border-box";
    var panel = document.createElement("section");
    panel.setAttribute("role", "dialog");panel.setAttribute("aria-modal", "true");panel.setAttribute("aria-label", "Valg av informasjonskapsler");
    panel.style.cssText = "max-width:720px;width:100%;background:#fff;color:#172c26;padding:24px;border-radius:16px;box-sizing:border-box;box-shadow:0 10px 40px #0004;font:15px/1.5 system-ui,sans-serif";
    panel.innerHTML = '<h2 style="margin:0 0 12px;font:700 23px/1.3 system-ui,sans-serif;color:#172c26">Vi respekterer personvernet ditt</h2><p>Vi bruker nødvendige informasjonskapsler for grunnleggende funksjoner. Analyse og markedsføring er valgfrie og aktiveres bare etter samtykke.</p><div data-options hidden style="margin:16px 0"><label style="display:block;margin:8px 0"><input type="checkbox" checked disabled> Nødvendige (alltid aktive)</label><label style="display:block;margin:8px 0"><input data-analytics type="checkbox"> Analyse og besøksstatistikk</label><label style="display:block;margin:8px 0"><input data-marketing type="checkbox"> Markedsføring (ingen annonsetagger er aktivert nå)</label></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button data-reject type="button">Avvis</button><button data-settings type="button">Innstillinger</button><button data-accept type="button">Godta alle</button></div>';
    panel.querySelectorAll("button").forEach(function (button) { button.style.cssText = "padding:10px 15px;border:1px solid #82918b;border-radius:8px;background:#f5f8f6;color:#172c26;cursor:pointer;font:600 14px system-ui,sans-serif"; });
    panel.querySelector("[data-accept]").style.cssText += ";background:#286e52;color:white;border-color:#286e52";
    shade.appendChild(panel); document.body.appendChild(shade);
    var opts = panel.querySelector("[data-options]");
    var a = panel.querySelector("[data-analytics]");
    var m = panel.querySelector("[data-marketing]");
    var settings = panel.querySelector("[data-settings]");
    function show(edit) { var saved = choice(); a.checked = saved?.analytics === true; m.checked = saved?.marketing === true; opts.hidden = !edit; settings.textContent = edit ? "Lagre valg" : "Innstillinger"; shade.style.display = "flex"; trigger.hidden = true; }
    function save(analytics, marketing) {
      try { localStorage.setItem(key, JSON.stringify({ analytics: analytics, marketing: marketing, savedAt: new Date().toISOString() })); } catch (_) {}
      shade.style.display = "none"; trigger.hidden = false;
      window.dispatchEvent(new Event("donaanna:cookie-consent-changed"));
      if (!analytics && document.querySelector('script[src*="googletagmanager.com/gtag"]')) location.reload();
    }
    trigger.addEventListener("click", function () { show(true); });
    panel.querySelector("[data-reject]").addEventListener("click", function () { save(false, false); });
    panel.querySelector("[data-accept]").addEventListener("click", function () { save(true, true); });
    settings.addEventListener("click", function () { if (opts.hidden) { opts.hidden = false; settings.textContent = "Lagre valg"; } else save(a.checked, m.checked); });
    if (!choice()) show(false);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

