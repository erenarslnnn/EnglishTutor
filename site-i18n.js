/* ==========================================================================
   Sapphire Academy — shared content engine (used by index.html & admin.html)
   No backend required: content lives in content-data.js (defaults) and is
   overridden by localStorage once someone edits it in admin.html. Admin can
   also export/import a content.json file for permanent, shareable changes.
   ========================================================================== */
(function (global) {
  "use strict";

  var STORAGE_KEY = "sapphire_content_v1";
  var LANG_KEY = "sapphire_lang_v1";
  var LANGS = ["en", "tr", "ru"];

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function isPlainObject(v) {
    return v && typeof v === "object" && !Array.isArray(v);
  }

  /* Recursively merge `overrides` onto a clone of `base`. Arrays in overrides
     fully replace arrays in base (item-by-item, merging matching object
     entries) whenever the override array is non-empty; this makes the
     override length authoritative, so removing an entry (e.g. deleting a
     FAQ item in admin) actually shrinks the merged result instead of the
     leftover base entry reappearing. An empty override array is treated as
     "not set" and falls back to base, keeping things resilient if the
     schema grows later. */
  function deepMerge(base, overrides) {
    if (!overrides) return base;
    if (Array.isArray(base)) {
      if (Array.isArray(overrides)) {
        if (overrides.length === 0) return base;
        return overrides.map(function (v, i) {
          if (isPlainObject(v) && isPlainObject(base[i])) {
            return deepMerge(base[i], v);
          }
          return v;
        });
      }
      return base;
    }
    if (isPlainObject(base)) {
      var result = {};
      Object.keys(base).forEach(function (k) {
        result[k] = base[k];
      });
      Object.keys(overrides).forEach(function (k) {
        if (isPlainObject(overrides[k]) && isPlainObject(base[k])) {
          result[k] = deepMerge(base[k], overrides[k]);
        } else if (Array.isArray(overrides[k]) && Array.isArray(base[k])) {
          result[k] = deepMerge(base[k], overrides[k]);
        } else {
          result[k] = overrides[k];
        }
      });
      return result;
    }
    return overrides;
  }

  function getPath(obj, path) {
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function setPath(obj, path, value) {
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      var key = parts[i];
      if (cur[key] == null || typeof cur[key] !== "object") {
        // decide array vs object by looking at next key
        cur[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      }
      cur = cur[key];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function readStoredOverrides() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeStoredOverrides(obj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Builds the effective content object per language: defaults merged with
     whatever has been saved in localStorage. */
  function getContent() {
    var defaults = global.SITE_CONTENT_DEFAULT;
    var overrides = readStoredOverrides();
    var out = {};
    LANGS.forEach(function (lang) {
      out[lang] = overrides && overrides[lang] ? deepMerge(deepClone(defaults[lang]), overrides[lang]) : deepClone(defaults[lang]);
    });
    return out;
  }

  function saveContent(fullContentObj) {
    return writeStoredOverrides(fullContentObj);
  }

  function resetLanguage(lang) {
    var overrides = readStoredOverrides() || {};
    delete overrides[lang];
    writeStoredOverrides(overrides);
  }

  function resetAll() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function getLang() {
    try {
      var v = localStorage.getItem(LANG_KEY);
      return LANGS.indexOf(v) !== -1 ? v : "en";
    } catch (e) {
      return "en";
    }
  }

  function setLangPref(lang) {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) {}
  }

  function exportJSON() {
    return JSON.stringify(getContent(), null, 2);
  }

  /* Defensive fallback for imported content.json files: makes sure
     faq.items is always a clean array of {q,a} strings per language, so a
     malformed or unexpected shape can't crash rendering. If items is
     missing entirely, it's left untouched so deepMerge falls back to the
     built-in defaults instead. */
  function normalizeFaqItems(parsed) {
    if (!parsed) return;
    LANGS.forEach(function (lang) {
      var faq = parsed[lang] && parsed[lang].faq;
      if (!faq || !("items" in faq)) return;
      var items = Array.isArray(faq.items) ? faq.items : [];
      faq.items = items
        .filter(function (it) { return isPlainObject(it); })
        .map(function (it) {
          return {
            q: typeof it.q === "string" ? it.q : "",
            a: typeof it.a === "string" ? it.a : ""
          };
        });
    });
  }

  function importJSON(jsonString) {
    var parsed = JSON.parse(jsonString);
    normalizeFaqItems(parsed);
    writeStoredOverrides(parsed);
    return parsed;
  }

  /* ---- Page-rendering helpers used by index.html -------------------- */

  function applyLangToDocument(lang, root) {
    root = root || document;
    var content = getContent()[lang];
    if (!content) return;

    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      var path = el.getAttribute("data-i18n");
      var val = getPath(content, path);
      if (val == null) return;
      if (el.hasAttribute("data-i18n-html")) {
        el.innerHTML = String(val).replace(/\n/g, "<br/>");
      } else {
        el.textContent = val;
      }
    });

    root.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var path = el.getAttribute("data-i18n-placeholder");
      var val = getPath(content, path);
      if (val != null) el.setAttribute("placeholder", val);
    });

    root.querySelectorAll("[data-i18n-href]").forEach(function (el) {
      var path = el.getAttribute("data-i18n-href");
      var val = getPath(content, path);
      if (val != null) el.setAttribute("href", val);
    });

    root.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var path = el.getAttribute("data-i18n-title");
      var val = getPath(content, path);
      if (val != null) el.setAttribute("title", val);
    });

    root.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var path = el.getAttribute("data-i18n-alt");
      var val = getPath(content, path);
      if (val != null) el.setAttribute("alt", val);
    });

    document.documentElement.setAttribute("lang", lang);

    if (root === document) {
      var seo = content.seo;
      if (seo) {
        if (seo.title) document.title = seo.title;
        if (seo.description) {
          var metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) metaDesc.setAttribute("content", seo.description);
          var ogDesc = document.querySelector('meta[property="og:description"]');
          if (ogDesc) ogDesc.setAttribute("content", seo.description);
          var twDesc = document.querySelector('meta[name="twitter:description"]');
          if (twDesc) twDesc.setAttribute("content", seo.description);
        }
        if (seo.title) {
          var ogTitle = document.querySelector('meta[property="og:title"]');
          if (ogTitle) ogTitle.setAttribute("content", seo.title);
          var twTitle = document.querySelector('meta[name="twitter:title"]');
          if (twTitle) twTitle.setAttribute("content", seo.title);
        }
      }
    }
  }

  global.SapphireContent = {
    LANGS: LANGS,
    getPath: getPath,
    setPath: setPath,
    getContent: getContent,
    saveContent: saveContent,
    resetLanguage: resetLanguage,
    resetAll: resetAll,
    getLang: getLang,
    setLangPref: setLangPref,
    exportJSON: exportJSON,
    importJSON: importJSON,
    applyLangToDocument: applyLangToDocument,
    deepClone: deepClone
  };
})(window);
