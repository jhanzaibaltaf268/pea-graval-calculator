/* GravelCalc — shared calculators for the material pages (vanilla JS).
   Needs main.js (GRAVEL helpers and debounce) to be loaded first. */
(function () {
  "use strict";

  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? (parseFloat(e.value) || 0) : 0; }
  function setText(id, text) { var e = el(id); if (e) e.textContent = text; }
  function fmt(n, d) { return GRAVEL.fmt(n, d); }

  /* Unit toggle: map = { imperial: { elementId: "text" }, metric: { elementId: "text" } } */
  function bindUnits(map, onChange) {
    var unit = "imperial";
    var btnFt = el("unitFt"), btnM = el("unitM");
    function set(u) {
      unit = u;
      btnFt.classList.toggle("active", u === "imperial");
      btnM.classList.toggle("active", u === "metric");
      var m = map[u];
      for (var id in m) { if (Object.prototype.hasOwnProperty.call(m, id)) setText(id, m[id]); }
      onChange();
    }
    btnFt.addEventListener("click", function () { set("imperial"); });
    btnM.addEventListener("click", function () { set("metric"); });
    return { get: function () { return unit; } };
  }

  /* Copy-summary button. getText() must return the current summary. */
  function bindCopy(recalc, getText, msgs) {
    msgs = msgs || { ok: "\u2713 Copied. Paste it into a message or quote request.", fail: "Copy failed. Select the numbers above instead." };
    var btn = el("copyOrder"), status = el("copyStatus");
    if (!btn || !status) return { clearIfChanged: function () {} };
    var copied = "";
    function done(ok, text) {
      copied = ok ? text : "";
      status.textContent = ok ? msgs.ok : msgs.fail;
    }
    btn.addEventListener("click", function () {
      recalc();
      var text = getText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true, text); }, function () { done(false, text); });
        return;
      }
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      done(ok, text);
    });
    return {
      clearIfChanged: function () {
        if (copied && getText() !== copied) { status.textContent = ""; copied = ""; }
      }
    };
  }

  function wire(ids, run) {
    var d = debounce(run, 50);
    ids.forEach(function (id) {
      var e = el(id);
      if (!e) return;
      e.addEventListener("input", d);
      e.addEventListener("change", d);
    });
  }

  /* ---------- Area x depth materials: stone, sand, topsoil, road base ---------- */
  function area(cfg) {
    var last = { yards: 0, tons: 0, feet: 0, oy: 0, ot: 0, extra: 0 };
    var units = bindUnits({
      imperial: { lenUnit: "(ft)", widUnit: "(ft)", depUnit: "(inches)", lenSuffix: "ft", widSuffix: "ft", depSuffix: "in" },
      metric: { lenUnit: "(m)", widUnit: "(m)", depUnit: "(cm)", lenSuffix: "m", widSuffix: "m", depSuffix: "cm" }
    }, calc);
    var copy;
    function summary() {
      var m = el("material"); var opt = m.options[m.selectedIndex];
      var u = units.get() === "imperial" ? { l: "ft", d: "in" } : { l: "m", d: "cm" };
      var s = document.querySelector("h1").textContent + " estimate: " + el("length").value + " " + u.l + " x " + el("width").value + " " + u.l + " x " + el("depth").value + " " + u.d +
        " deep, " + opt.textContent + " (about " + m.value + " tons per cubic yard).\n" +
        "Volume: " + fmt(last.yards, 2) + " cubic yards (" + fmt(last.tons, 2) + " tons).\n" +
        "Order with " + fmt(last.extra, 0) + "% extra: " + fmt(last.oy, 2) + " cubic yards (" + fmt(last.ot, 2) + " tons).\n" +
        "Planning estimate from thegravelcalculators.com. Confirm density and quantity with your supplier.";
      return s;
    }
    function calc() {
      var u = units.get();
      var vol = GRAVEL.volume(GRAVEL.toFeet(val("length"), u), GRAVEL.toFeet(val("width"), u), GRAVEL.depthToFeet(val("depth"), u));
      var dens = parseFloat(el("material").value) || 0;
      var extra = Math.max(val("extra"), 0);
      var tons = GRAVEL.tons(vol.cubicYards, dens);
      last = { yards: vol.cubicYards, tons: tons, feet: vol.cubicFeet, oy: vol.cubicYards * (1 + extra / 100), ot: tons * (1 + extra / 100), extra: extra };
      setText("outYards", fmt(last.yards, 2));
      setText("outTons", fmt(last.tons, 2));
      setText("outFeet", fmt(last.feet, 2));
      setText("outPounds", fmt(last.tons * 2000, 0));
      setText("outOrderYards", fmt(last.oy, 2));
      setText("outOrderTons", fmt(last.ot, 2));
      setText("extraLabel", "Order with " + fmt(extra, 0) + "% extra");
      if (copy) copy.clearIfChanged();
    }
    copy = bindCopy(calc, summary);
    wire(["length", "width", "depth", "material", "extra"], calc);
    calc();
  }

  /* ---------- French drain: gravel around and over the pipe, plus filter fabric ---------- */
  function drain(cfg) {
    var last = { yards: 0, tons: 0, fabric: 0, oy: 0, ot: 0, extra: 0 };
    var units = bindUnits({
      imperial: { lenUnit: "(ft)", widUnit: "(inches)", depUnit: "(inches)", pipeUnit: "(inches)", lenSuffix: "ft", widSuffix: "in", depSuffix: "in", pipeSuffix: "in", fabUnit: "ft²" },
      metric: { lenUnit: "(m)", widUnit: "(cm)", depUnit: "(cm)", pipeUnit: "(cm)", lenSuffix: "m", widSuffix: "cm", depSuffix: "cm", pipeSuffix: "cm", fabUnit: "ft²" }
    }, calc);
    var copy;
    function toIn(v, u) { return u === "metric" ? v / 2.54 : v; }
    function summary() {
      var m = el("material"); var opt = m.options[m.selectedIndex];
      var u = units.get() === "imperial" ? { l: "ft", w: "in" } : { l: "m", w: "cm" };
      return "French drain gravel estimate: " + el("length").value + " " + u.l + " long, trench " + el("width").value + " " + u.w + " wide x " + el("depth").value + " " + u.w +
        " deep, " + el("pipe").value + " " + u.w + " pipe, " + opt.textContent + " (about " + m.value + " tons per cubic yard).\n" +
        "Gravel: " + fmt(last.yards, 2) + " cubic yards (" + fmt(last.tons, 2) + " tons).\n" +
        "Order with " + fmt(last.extra, 0) + "% extra: " + fmt(last.oy, 2) + " cubic yards (" + fmt(last.ot, 2) + " tons).\n" +
        "Filter fabric to wrap the trench: about " + fmt(last.fabric, 0) + " sq ft.\n" +
        "Planning estimate from thegravelcalculators.com. Confirm density and quantity with your supplier.";
    }
    function calc() {
      var u = units.get();
      var lenFt = GRAVEL.toFeet(val("length"), u);
      var wFt = toIn(val("width"), u) / 12, dFt = toIn(val("depth"), u) / 12, pipeFt = toIn(val("pipe"), u) / 12;
      var trench = Math.max(lenFt, 0) * Math.max(wFt, 0) * Math.max(dFt, 0);
      var pipeVol = Math.PI * Math.pow(pipeFt / 2, 2) * Math.max(lenFt, 0);
      var feet = Math.max(trench - pipeVol, 0);
      var yards = feet / 27;
      var dens = parseFloat(el("material").value) || 0;
      var extra = Math.max(val("extra"), 0);
      var tons = yards * dens;
      var fabric = Math.max(lenFt, 0) * (Math.max(wFt, 0) + 2 * Math.max(dFt, 0) + 1);
      last = { yards: yards, tons: tons, fabric: fabric, oy: yards * (1 + extra / 100), ot: tons * (1 + extra / 100), extra: extra };
      setText("outYards", fmt(yards, 2));
      setText("outTons", fmt(tons, 2));
      setText("outFeet", fmt(feet, 2));
      setText("outFabric", fmt(fabric, 0));
      setText("outOrderYards", fmt(last.oy, 2));
      setText("outOrderTons", fmt(last.ot, 2));
      setText("extraLabel", "Order with " + fmt(extra, 0) + "% extra");
      if (copy) copy.clearIfChanged();
    }
    copy = bindCopy(calc, summary);
    wire(["length", "width", "depth", "pipe", "material", "extra"], calc);
    calc();
  }

  /* ---------- Paver base: crushed stone base plus bedding sand ---------- */
  function paver(cfg) {
    var SAND = 1.35;
    var last = { by: 0, bt: 0, sy: 0, st: 0, oby: 0, obt: 0, osy: 0, ost: 0, extra: 0 };
    var units = bindUnits({
      imperial: { lenUnit: "(ft)", widUnit: "(ft)", baseUnit: "(inches)", sandUnit: "(inches)", lenSuffix: "ft", widSuffix: "ft", baseSuffix: "in", sandSuffix: "in" },
      metric: { lenUnit: "(m)", widUnit: "(m)", baseUnit: "(cm)", sandUnit: "(cm)", lenSuffix: "m", widSuffix: "m", baseSuffix: "cm", sandSuffix: "cm" }
    }, calc);
    var copy;
    function summary() {
      var m = el("material"); var opt = m.options[m.selectedIndex];
      var u = units.get() === "imperial" ? { l: "ft", d: "in" } : { l: "m", d: "cm" };
      return "Paver base estimate: " + el("length").value + " " + u.l + " x " + el("width").value + " " + u.l + ", base " + el("baseDepth").value + " " + u.d + " of " + opt.textContent +
        ", bedding sand " + el("sandDepth").value + " " + u.d + ".\n" +
        "Base: " + fmt(last.by, 2) + " cubic yards (" + fmt(last.bt, 2) + " tons). Order with " + fmt(last.extra, 0) + "% extra: " + fmt(last.oby, 2) + " cubic yards (" + fmt(last.obt, 2) + " tons).\n" +
        "Sand: " + fmt(last.sy, 2) + " cubic yards (" + fmt(last.st, 2) + " tons). Order with " + fmt(last.extra, 0) + "% extra: " + fmt(last.osy, 2) + " cubic yards (" + fmt(last.ost, 2) + " tons).\n" +
        "Planning estimate from thegravelcalculators.com. Confirm density and quantity with your supplier.";
    }
    function calc() {
      var u = units.get();
      var lenFt = GRAVEL.toFeet(val("length"), u), widFt = GRAVEL.toFeet(val("width"), u);
      var base = GRAVEL.volume(lenFt, widFt, GRAVEL.depthToFeet(val("baseDepth"), u));
      var sand = GRAVEL.volume(lenFt, widFt, GRAVEL.depthToFeet(val("sandDepth"), u));
      var dens = parseFloat(el("material").value) || 0;
      var extra = Math.max(val("extra"), 0), k = 1 + extra / 100;
      var bt = GRAVEL.tons(base.cubicYards, dens), st = GRAVEL.tons(sand.cubicYards, SAND);
      last = { by: base.cubicYards, bt: bt, sy: sand.cubicYards, st: st, oby: base.cubicYards * k, obt: bt * k, osy: sand.cubicYards * k, ost: st * k, extra: extra };
      setText("outBaseYards", fmt(last.by, 2)); setText("outBaseTons", fmt(last.bt, 2));
      setText("outSandYards", fmt(last.sy, 2)); setText("outSandTons", fmt(last.st, 2));
      setText("outOrderBaseYards", fmt(last.oby, 2)); setText("outOrderBaseTons", fmt(last.obt, 2));
      setText("outOrderSandYards", fmt(last.osy, 2)); setText("outOrderSandTons", fmt(last.ost, 2));
      setText("extraLabelBase", "Order base with " + fmt(extra, 0) + "% extra");
      setText("extraLabelSand", "Order sand with " + fmt(extra, 0) + "% extra");
      if (copy) copy.clearIfChanged();
    }
    copy = bindCopy(calc, summary);
    wire(["length", "width", "baseDepth", "sandDepth", "material", "extra"], calc);
    calc();
  }

  /* ---------- Fish tank substrate: pounds from tank footprint and depth ---------- */
  function tank(cfg) {
    var last = { feet: 0, lb: 0, kg: 0, olb: 0, okg: 0, extra: 0 };
    var units = bindUnits({
      imperial: { lenUnit: "(inches)", widUnit: "(inches)", depUnit: "(inches)", lenSuffix: "in", widSuffix: "in", depSuffix: "in" },
      metric: { lenUnit: "(cm)", widUnit: "(cm)", depUnit: "(cm)", lenSuffix: "cm", widSuffix: "cm", depSuffix: "cm" }
    }, calc);
    var copy;
    function summary() {
      var u = units.get() === "imperial" ? "in" : "cm";
      return "Fish tank substrate estimate: tank " + el("length").value + " " + u + " x " + el("width").value + " " + u + ", substrate " + el("depth").value + " " + u +
        " deep, planning density " + el("density").value + " lb per cubic foot.\n" +
        "Volume: " + fmt(last.feet, 2) + " cubic feet. Weight: " + fmt(last.lb, 1) + " lb (" + fmt(last.kg, 1) + " kg).\n" +
        "Buy about " + fmt(last.extra, 0) + "% extra: " + fmt(last.olb, 1) + " lb (" + fmt(last.okg, 1) + " kg).\n" +
        "Planning estimate from thegravelcalculators.com. Check the weight and density on the bag.";
    }
    function calc() {
      var u = units.get();
      var toIn = function (v) { return u === "metric" ? v / 2.54 : v; };
      var cuIn = Math.max(toIn(val("length")), 0) * Math.max(toIn(val("width")), 0) * Math.max(toIn(val("depth")), 0);
      var feet = cuIn / 1728;
      var lb = feet * Math.max(val("density"), 0);
      var extra = Math.max(val("extra"), 0), k = 1 + extra / 100;
      last = { feet: feet, lb: lb, kg: lb * 0.45359237, olb: lb * k, okg: lb * k * 0.45359237, extra: extra };
      setText("outFeet", fmt(feet, 2));
      setText("outLb", fmt(lb, 1));
      setText("outKg", fmt(last.kg, 1));
      setText("outOrderLb", fmt(last.olb, 1));
      setText("outOrderKg", fmt(last.okg, 1));
      setText("extraLabel", "Buy with " + fmt(extra, 0) + "% extra");
      if (copy) copy.clearIfChanged();
    }
    copy = bindCopy(calc, summary);
    wire(["length", "width", "depth", "density", "extra"], calc);
    calc();
  }


  /* ---------- Metric pages in other languages: m x m x cm, density in t per m3 ---------- */
  function areaMetric(cfg) {
    var T = cfg.t;
    function fmt(n, d) { if (!isFinite(n) || n < 0) n = 0; return n.toLocaleString(cfg.locale, { minimumFractionDigits: d, maximumFractionDigits: d }); }
    var last = { m3: 0, t: 0, kg: 0, om3: 0, ot: 0, extra: 0, bags: 0, obags: 0 };
    var copy;
    function dens() { return parseFloat(el("material").value) || 0; }
    function summary() {
      var m = el("material"); var opt = m.options[m.selectedIndex];
      return T.summary(el("length").value, el("width").value, el("depth").value, opt.textContent, dens(), last, fmt);
    }
    function calc() {
      var m3 = Math.max(val("length"), 0) * Math.max(val("width"), 0) * Math.max(val("depth"), 0) / 100;
      var extra = Math.max(val("extra"), 0), k = 1 + extra / 100;
      var t = m3 * dens();
      var bagKg = el("bagKg") ? (parseFloat(el("bagKg").value) || 0) : 0;
      var bags = bagKg ? t * 1000 / bagKg : 0;
      last = { m3: m3, t: t, kg: t * 1000, om3: m3 * k, ot: t * k, extra: extra, bags: bags, obags: bags * k };
      setText("outM3", fmt(m3, 2)); setText("outTons", fmt(t, 2)); setText("outKg", fmt(t * 1000, 0));
      setText("outOrderM3", fmt(last.om3, 2)); setText("outOrderTons", fmt(last.ot, 2));
      setText("outBags", fmt(bags, 0)); setText("outOrderBags", fmt(last.obags, 0));
      setText("extraLabel", T.order.replace("%s", fmt(extra, 0)));
      if (copy) copy.clearIfChanged();
    }
    copy = bindCopy(calc, summary, { ok: T.copied, fail: T.copyFail });
    wire(["length", "width", "depth", "material", "extra", "bagKg"], calc);
    calc();
  }


  /* ---------- Aquarium / container substrate, metric: cm x cm x cm -> kg ---------- */
  function tankMetric(cfg) {
    var T = cfg.t;
    function fmt(n, d) { if (!isFinite(n) || n < 0) n = 0; return n.toLocaleString(cfg.locale, { minimumFractionDigits: d, maximumFractionDigits: d }); }
    var last = { l: 0, kg: 0, okg: 0, bags: 0, obags: 0, extra: 0 };
    var copy;
    function dens() { return parseFloat(el("material").value) || 0; }
    function summary() {
      var m = el("material"); var opt = m.options[m.selectedIndex];
      return T.summary(el("length").value, el("width").value, el("depth").value, opt.textContent, dens(), last, fmt);
    }
    function calc() {
      var cm3 = Math.max(val("length"), 0) * Math.max(val("width"), 0) * Math.max(val("depth"), 0);
      var litres = cm3 / 1000;
      var kg = litres * dens();
      var extra = Math.max(val("extra"), 0), k = 1 + extra / 100;
      var bagKg = el("bagKg") ? (parseFloat(el("bagKg").value) || 0) : 0;
      var bags = bagKg ? kg / bagKg : 0;
      last = { l: litres, kg: kg, okg: kg * k, bags: bags, obags: bags * k, extra: extra };
      setText("outLitres", fmt(litres, 1));
      setText("outKg", fmt(kg, 1));
      setText("outOrderKg", fmt(last.okg, 1));
      setText("outBags", fmt(Math.ceil(last.obags) || 0, 0));
      setText("extraLabel", T.order.replace("%s", fmt(extra, 0)));
      if (copy) copy.clearIfChanged();
    }
    copy = bindCopy(calc, summary, { ok: T.copied, fail: T.copyFail });
    wire(["length", "width", "depth", "material", "extra", "bagKg"], calc);
    calc();
  }

  window.MaterialCalc = { area: area, drain: drain, paver: paver, tank: tank, areaMetric: areaMetric, tankMetric: tankMetric };
})();
