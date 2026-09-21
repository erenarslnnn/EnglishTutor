(function () {
  "use strict";

  var TOKEN_KEY = "sapphire_admin_token"; // JWT from POST /api/auth/login; sessionStorage = gone when the tab closes
  var FLASH_KEY = "sapphire_admin_flash";
  var API = window.SITE_API_BASE || "";

  var SC = window.SapphireContent;
  var SCHEMA = window.SITE_SCHEMA;
  var content = null; // {en:{...}, tr:{...}, ru:{...}} — loaded from GET /api/admin/content after login
  var currentLang = "tr";
  var currentSectionIndex = 0;
  var saveTimer = null;

  /* ---------------- API / Auth ---------------- */
  function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function logout(message) {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      if (message) sessionStorage.setItem(FLASH_KEY, message);
    } catch (e) {}
    location.reload();
  }

  function apiFetch(path, options) {
    options = options || {};
    var headers = { Accept: "application/json" };
    if (options.body) headers["Content-Type"] = "application/json";
    var token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
    return fetch(API + path, { method: options.method || "GET", headers: headers, body: options.body }).then(function (res) {
      if (res.status === 401 && token) {
        logout("Oturum süresi doldu, lütfen tekrar giriş yapın.");
        throw new Error("unauthorized");
      }
      return res;
    });
  }

  function showLoginError(message) {
    var box = document.getElementById("login-error");
    box.textContent = message;
    box.hidden = false;
  }

  function showApp() {
    document.getElementById("login-screen").hidden = true;
    document.getElementById("admin-app").hidden = false;
    initAdmin();
  }

  function loadContentAndShow() {
    return apiFetch("/api/admin/content").then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (data) {
      content = data;
      showApp();
    });
  }

  if (!API) {
    showLoginError("Bu adreste yönetim sunucusu (API) tanımlı değil. Paneli yerelde, backend çalışırken açın.");
  }

  try {
    var flash = sessionStorage.getItem(FLASH_KEY);
    if (flash) { sessionStorage.removeItem(FLASH_KEY); showLoginError(flash); }
  } catch (e) {}

  if (API && getToken()) {
    loadContentAndShow().catch(function (err) {
      if (err.message !== "unauthorized") {
        try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
        showLoginError("Sunucuya bağlanılamadı. Backend'in çalıştığından emin olun.");
      }
    });
  }

  document.getElementById("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!API) return;
    var val = document.getElementById("login-password").value;
    fetch(API + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: window.SITE_ADMIN_USERNAME || "admin", password: val })
    }).then(function (res) {
      if (res.status === 401) { showLoginError("Şifre hatalı. Lütfen tekrar deneyin."); return null; }
      if (res.status === 429) { showLoginError("Çok fazla deneme yapıldı. Bir dakika sonra tekrar deneyin."); return null; }
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (data) {
      if (!data) return;
      try { sessionStorage.setItem(TOKEN_KEY, data.token); } catch (err) {}
      document.getElementById("login-error").hidden = true;
      return loadContentAndShow();
    }).catch(function () {
      showLoginError("Sunucuya bağlanılamadı. Backend'in çalıştığından emin olun.");
    });
  });

  /* ---------------- Admin UI ---------------- */
  function initAdmin() {
    document.getElementById("btn-logout").addEventListener("click", function () {
      logout();
    });

    document.querySelectorAll(".lang-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        currentLang = btn.getAttribute("data-lang");
        paintLangTabs();
        renderFields();
      });
    });
    paintLangTabs();

    buildSectionNav();
    renderFields();

    document.getElementById("btn-export").addEventListener("click", exportJSON);
    document.getElementById("import-file-input").addEventListener("change", handleImport);
    document.getElementById("btn-reset").addEventListener("click", handleReset);
  }

  function paintLangTabs() {
    document.querySelectorAll(".lang-tab").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === currentLang);
    });
  }

  function buildSectionNav() {
    var nav = document.getElementById("section-nav");
    nav.innerHTML = "";
    SCHEMA.forEach(function (section, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sidebar-btn text-left text-sm font-semibold px-4 py-3 rounded-lg whitespace-nowrap lg:whitespace-normal shrink-0 hover:bg-subtle transition-colors";
      btn.textContent = (section.label.tr || section.section);
      btn.addEventListener("click", function () {
        currentSectionIndex = idx;
        paintSectionNav();
        renderFields();
      });
      nav.appendChild(btn);
    });
    paintSectionNav();
  }

  function paintSectionNav() {
    var buttons = document.querySelectorAll("#section-nav .sidebar-btn");
    buttons.forEach(function (btn, idx) {
      btn.classList.toggle("active", idx === currentSectionIndex);
    });
  }

  function renderFields() {
    var section = SCHEMA[currentSectionIndex];
    document.getElementById("section-title").textContent = section.label.tr || section.section;
    document.getElementById("section-hint").textContent =
      "Şu an düzenlenen dil: " + langName(currentLang) + " — Değişiklikler otomatik kaydedilir.";

    var container = document.getElementById("fields-container");
    container.innerHTML = "";

    section.fields.forEach(function (field) {
      var wrapper = document.createElement("div");
      wrapper.className = "flex flex-col gap-1.5" + (field.type === "textarea" ? " sm:col-span-2" : "");

      var label = document.createElement("label");
      label.className = "text-xs font-bold uppercase tracking-wide text-secondary-tint-text";
      label.textContent = field.label.tr || field.key;
      wrapper.appendChild(label);

      var value = SC.getPath(content[currentLang], field.key);
      if (value == null) value = "";

      var input;
      if (field.type === "textarea") {
        input = document.createElement("textarea");
        input.rows = 4;
        input.className = "field-input";
        input.value = value;
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.className = "field-input";
        input.value = value;
      }

      input.addEventListener("input", function () {
        SC.setPath(content[currentLang], field.key, input.value);
        scheduleSave();
      });

      wrapper.appendChild(input);
      container.appendChild(wrapper);
    });

    if (section.list) {
      renderListEditor(section.list, container);
    }
  }

  /* ---------------- Repeatable list editor (e.g. FAQ items) ----------------
     Adding/removing an entry changes the array length in all three languages
     at once (so indices stay aligned); editing q/a text only touches the
     language currently being edited. */
  function getListArray(lang, path) {
    var arr = SC.getPath(content[lang], path);
    if (!Array.isArray(arr)) {
      arr = [];
      SC.setPath(content[lang], path, arr);
    }
    return arr;
  }

  var TRASH_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>';
  var PLUS_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>';

  function renderListEditor(listSchema, container) {
    var wrap = document.createElement("div");
    wrap.className = "sm:col-span-2 faq-list-wrap flex flex-col gap-3";

    var headerRow = document.createElement("div");
    headerRow.className = "flex items-center justify-between gap-3 flex-wrap";

    var heading = document.createElement("h3");
    heading.className = "text-sm font-bold text-primary";
    heading.textContent = (listSchema.itemLabel.tr || "Liste") + " Listesi";
    headerRow.appendChild(heading);

    var addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "faq-add-btn";
    addBtn.setAttribute("aria-label", (listSchema.addLabel.tr || "Ekle").replace(/^\+\s*/, ""));
    // schema labels carry a leading "+" for plain-text contexts; the icon already conveys "add".
    addBtn.innerHTML = PLUS_ICON_SVG + "<span>" + (listSchema.addLabel.tr || "Ekle").replace(/^\+\s*/, "") + "</span>";
    addBtn.addEventListener("click", function () {
      SC.LANGS.forEach(function (lang) {
        var arr = getListArray(lang, listSchema.path);
        var item = {};
        listSchema.itemFields.forEach(function (f) { item[f.key] = ""; });
        arr.push(item);
      });
      scheduleSave();
      renderFields();
      focusNewestListItem();
    });
    headerRow.appendChild(addBtn);
    wrap.appendChild(headerRow);

    var note = document.createElement("p");
    note.className = "faq-list-note";
    note.textContent = "Not: Bir dilde soru veya cevap boş bırakılırsa, o soru sitede o dilde görünmez.";
    wrap.appendChild(note);

    var list = document.createElement("div");
    list.className = "faq-list";

    var items = getListArray(currentLang, listSchema.path);

    items.forEach(function (item, idx) {
      var card = document.createElement("div");
      card.className = "faq-card";

      var cardHeader = document.createElement("div");
      cardHeader.className = "flex items-center justify-between gap-2";

      var badge = document.createElement("span");
      badge.className = "faq-item-badge";
      badge.textContent = (listSchema.itemLabel.tr || "Öğe") + " " + (idx + 1);
      cardHeader.appendChild(badge);

      var removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "faq-delete-btn";
      removeBtn.setAttribute("aria-label", (listSchema.removeLabel.tr || "Sil") + " " + (listSchema.itemLabel.tr || "") + " " + (idx + 1));
      removeBtn.innerHTML = TRASH_ICON_SVG + "<span>" + (listSchema.removeLabel.tr || "Sil") + "</span>";
      removeBtn.addEventListener("click", function () {
        if (!confirm("Bu soruyu TR/EN/RU üçünde de silmek istediğinize emin misiniz?")) return;
        SC.LANGS.forEach(function (lang) {
          getListArray(lang, listSchema.path).splice(idx, 1);
        });
        scheduleSave();
        renderFields();
      });
      cardHeader.appendChild(removeBtn);
      card.appendChild(cardHeader);

      listSchema.itemFields.forEach(function (f) {
        var fieldWrap = document.createElement("div");
        fieldWrap.className = "flex flex-col gap-1";

        var flabel = document.createElement("label");
        flabel.className = "text-[11px] font-bold uppercase tracking-wide text-secondary-tint-text";
        flabel.textContent = f.label.tr || f.key;
        fieldWrap.appendChild(flabel);

        var finput;
        if (f.type === "textarea") {
          finput = document.createElement("textarea");
          finput.rows = 3;
        } else {
          finput = document.createElement("input");
          finput.type = "text";
        }
        finput.className = "field-input";
        finput.value = item[f.key] == null ? "" : item[f.key];
        finput.addEventListener("input", function () {
          getListArray(currentLang, listSchema.path)[idx][f.key] = finput.value;
          scheduleSave();
        });
        fieldWrap.appendChild(finput);
        card.appendChild(fieldWrap);
      });

      list.appendChild(card);
    });

    wrap.appendChild(list);
    container.appendChild(wrap);
  }

  // After adding a new FAQ item, scroll its card into view and focus the
  // question input so the user can start typing right away.
  function focusNewestListItem() {
    var cards = document.querySelectorAll(".faq-card");
    var last = cards[cards.length - 1];
    if (!last) return;
    var firstInput = last.querySelector(".field-input");
    if (!firstInput) return;
    requestAnimationFrame(function () {
      last.scrollIntoView({ behavior: "smooth", block: "center" });
      firstInput.focus({ preventScroll: true });
    });
  }

  function langName(lang) {
    return { en: "İngilizce (EN)", tr: "Türkçe (TR)", ru: "Rusça (RU)" }[lang] || lang;
  }

  var saveInFlight = false;
  var savePending = false;

  function scheduleSave() {
    setSaveStatus("saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 600);
  }

  // Saves are serialized: while one PUT is in flight, further edits just mark
  // "pending" and one more PUT (with the then-current content) runs afterwards.
  function saveNow() {
    if (saveInFlight) { savePending = true; return; }
    saveInFlight = true;
    savePending = false;
    apiFetch("/api/admin/content", { method: "PUT", body: JSON.stringify(content) }).then(function (res) {
      if (res.ok) return { ok: true };
      return res.json().catch(function () { return {}; }).then(function (d) { return { ok: false, data: d }; });
    }).then(function (result) {
      if (savePending) return;
      if (result.ok) {
        setSaveStatus("saved");
      } else {
        var errs = (result.data && result.data.errors) || [];
        var msg = errs.length ? errs.slice(0, 3).join(" ") + (errs.length > 3 ? " (+" + (errs.length - 3) + " hata daha)" : "") : ((result.data && result.data.error) || "Kayıt başarısız oldu.");
        setSaveStatus("error", "Kaydedilemedi: " + msg);
      }
    }).catch(function (err) {
      if (err.message !== "unauthorized") setSaveStatus("error", "Kaydedilemedi: sunucuya ulaşılamadı.");
    }).finally(function () {
      saveInFlight = false;
      if (savePending) saveNow();
    });
  }

  function setSaveStatus(state, message) {
    var el = document.getElementById("save-status");
    if (state === "error") {
      el.textContent = message || "Kaydedilemedi.";
      el.className = "text-xs text-danger flex items-center gap-1";
      return;
    }
    if (state === "saving") {
      el.innerHTML = '<span class="text-[15px] animate-pulse"><svg fill="currentColor" style="display:inline-block;vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="15" viewBox="0 -960 960 960" width="15"><path d="M160-160v-80h110l-16-14q-52-46-73-105t-21-119q0-111 66.5-197.5T400-790v84q-72 26-116 88.5T240-478q0 45 17 87.5t53 78.5l10 10v-98h80v240H160Zm400-10v-84q72-26 116-88.5T720-482q0-45-17-87.5T650-648l-10-10v98h-80v-240h240v80H690l16 14q49 49 71.5 106.5T800-482q0 111-66.5 197.5T560-170Z"/></svg></span><span>Kaydediliyor…</span>';
      el.className = "text-xs text-amber-tint-text flex items-center gap-1";
    } else {
      el.innerHTML = '<span class="text-[15px]"><svg fill="currentColor" style="display:inline-block;vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="15" viewBox="0 -960 960 960" width="15"><path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg></span><span>Tüm değişiklikler kaydedildi</span>';
      el.className = "text-xs text-secondary-tint-text flex items-center gap-1";
    }
  }

  function exportJSON() {
    var json = JSON.stringify(content, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "content.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var imported = JSON.parse(reader.result);
        if (!imported || !imported.en || !imported.tr || !imported.ru) throw new Error("bad shape");
        content = imported;
        renderFields();
        scheduleSave(); // goes through the API's validation like any other edit
        alert("İçerik içe aktarıldı ve veritabanına kaydediliyor. Kayıt durumunu üst çubukta görebilirsiniz.");
      } catch (err) {
        alert("Dosya okunamadı. Geçerli bir content.json dosyası seçtiğinizden emin olun.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleReset() {
    if (!confirm(langName(currentLang) + " için tüm değişiklikleri varsayılan içeriğe sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
    content[currentLang] = SC.deepClone(window.SITE_CONTENT_DEFAULT[currentLang]);
    renderFields();
    scheduleSave();
  }
})();
