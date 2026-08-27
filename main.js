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
