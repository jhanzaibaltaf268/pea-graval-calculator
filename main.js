/* GravelCalc — shared site behavior + calculator engine (vanilla JS, no framework) */

(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* Dropdown menus: click/tap/keyboard toggles, Escape and outside click close */
  var menus = document.querySelectorAll(".has-dropdown");
  function closeAll(except) {
    for (var i = 0; i < menus.length; i++) {
      if (menus[i] === except) continue;
      menus[i].classList.remove("open");
      var b = menus[i].querySelector(".dd-toggle");
      if (b) b.setAttribute("aria-expanded", "false");
    }
  }
  Array.prototype.forEach.call(menus, function (m) {
    var btn = m.querySelector(".dd-toggle");
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = m.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      closeAll(m);
    });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest(".has-dropdown")) closeAll();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeAll();
      if (nav && nav.classList.contains("open") && toggle) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    }
  });
})();

/* Debounce so rapid keystrokes don't trigger a re-render on every input (protects INP) */
function debounce(fn, wait) {
  var t;
  return function () {
    var args = arguments;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(null, args); }, wait);
  };
}

var GRAVEL = {
  FEET_PER_METER: 3.28084,
  CUFT_PER_CUYD: 27,

  /* length/width fields: value is entered in feet ("imperial") or meters ("metric") */
  toFeet: function (value, unit) {
    return unit === "metric" ? value * this.FEET_PER_METER : value;
  },

  /* depth field: value is entered in inches ("imperial") or centimeters ("metric") */
  depthToFeet: function (value, unit) {
    return unit === "metric" ? (value / 100) * this.FEET_PER_METER : value / 12;
  },

  volume: function (lengthFt, widthFt, depthFt) {
    var cubicFeet = Math.max(lengthFt, 0) * Math.max(widthFt, 0) * Math.max(depthFt, 0);
    return {
      cubicFeet: cubicFeet,
      cubicYards: cubicFeet / this.CUFT_PER_CUYD
    };
  },

  tons: function (cubicYards, densityTonsPerCy) {
    return cubicYards * densityTonsPerCy;
  },

  bags: function (cubicFeet, bagCuFt) {
    if (cubicFeet <= 0) return 0;
    return Math.ceil(cubicFeet / bagCuFt);
  },

  fmt: function (n, decimals) {
    if (!isFinite(n) || n < 0) n = 0;
    return n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
};


/* Language suggestion banner (English pages only).
   If the visitor's browser prefers another language we offer a link to that
   version. It never redirects automatically (good for SEO and for users who
   want English), and once dismissed it stays hidden. */
(function () {
  try {
    if (document.documentElement.lang !== "en") return;
    var LANGS = {
      de: { url: "/de/kies-rechner", text: "Diese Seite auf Deutsch ansehen", btn: "Zum deutschen Rechner" },
      es: { url: "/es/calculadora-de-grava", text: "Ver esta página en español", btn: "Ir a la calculadora" },
      fr: { url: "/fr/calculateur-gravier", text: "Voir cette page en français", btn: "Aller au calculateur" },
      pt: { url: "/pt/calculadora-da-brita", text: "Ver esta página em português", btn: "Ir para a calculadora" },
      nl: { url: "/nl/grind-rekenen", text: "Bekijk deze pagina in het Nederlands", btn: "Naar de rekenmachine" },
      it: { url: "/it/peso-ghiaia-metro-cubo", text: "Vedi questa pagina in italiano", btn: "Vai al calcolatore" }
    };
    var prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"]);
    var code = null;
    for (var i = 0; i < prefs.length; i++) {
      var c = String(prefs[i]).toLowerCase().split("-")[0];
      if (c === "en") return;
      if (LANGS[c]) { code = c; break; }
    }
    if (!code) return;
    try { if (localStorage.getItem("gc-lang-dismissed")) return; } catch (e) {}

    var L = LANGS[code];
    var bar = document.createElement("div");
    bar.setAttribute("role", "region");
    bar.setAttribute("lang", code);
    bar.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#1a1a1a;color:#fff;padding:12px 16px;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;font:500 15px/1.4 Inter,system-ui,sans-serif;box-shadow:0 -2px 12px rgba(0,0,0,.25)";
    var span = document.createElement("span");
    span.textContent = L.text;
    var a = document.createElement("a");
    a.href = L.url;
    a.textContent = L.btn;
    a.style.cssText = "background:#ff5a1f;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none;font-weight:600";
    var x = document.createElement("button");
    x.type = "button";
    x.setAttribute("aria-label", "Close");
    x.textContent = "×";
    x.style.cssText = "background:none;border:0;color:#fff;font-size:24px;line-height:1;cursor:pointer;padding:0 6px";
    function dismiss() {
      try { localStorage.setItem("gc-lang-dismissed", "1"); } catch (e) {}
      bar.remove();
    }
    x.addEventListener("click", dismiss);
    a.addEventListener("click", function () {
      try { localStorage.setItem("gc-lang-dismissed", "1"); } catch (e) {}
    });
    bar.appendChild(span);
    bar.appendChild(a);
    bar.appendChild(x);
    document.body.appendChild(bar);
  } catch (e) { /* never break the calculator */ }
})();
