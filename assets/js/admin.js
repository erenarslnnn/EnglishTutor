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

  /* ---------------- Show/hide password toggle ---------------- */
  var EYE_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.500-160.500T480-720q-113 0-207.500 59.500T128-500q50 101 144.500 160.500T480-280Z"/></svg>';
  var EYE_OFF_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.500-12t37.500-4q75 0 127.500 52.500T660-500q0 20-4 37.500T644-428Zm128 126-58-56q38-29 67.500-63.500T832-500q-50-101-143.500-160.500T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.500t90-8.500q151 0 269 83.500T920-500q-23 59-60.500 109.500T772-302Zm20 246L624-222q-35 11-70.500 16.500T480-200q-151 0-269-83.500T40-500q21-53 53-98.500t73-81.500L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.500 160.500T480-280q20 0 39-2.500t39-5.500l-36-38q-11 3-21 4.500t-21 1.500q-75 0-127.500-52.500T300-500q0-11 1.500-21t4.500-21l-84-82Zm319 93Zm-151 75Z"/></svg>';

  function attachPasswordToggle(input) {
    if (!input || input.parentNode.classList.contains("pw-field")) return;
    var wrapper = document.createElement("div");
    wrapper.className = "pw-field";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pw-toggle";
    wrapper.appendChild(btn);

    function paint() {
      var visible = input.type === "text";
      btn.innerHTML = visible ? EYE_OFF_ICON_SVG : EYE_ICON_SVG;
      btn.setAttribute("aria-label", visible ? "Şifreyi gizle" : "Şifreyi göster");
      btn.setAttribute("aria-pressed", visible ? "true" : "false");
    }
    btn.addEventListener("click", function () {
      input.type = input.type === "password" ? "text" : "password";
      paint();
    });
    paint();
  }

  attachPasswordToggle(document.getElementById("login-password"));

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
    updateContactBadge();

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
    EXTRA_SECTIONS.forEach(function (extra, i) {
      var idx = SCHEMA.length + i;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.id = "nav-" + extra.id;
      btn.className = "sidebar-btn text-left text-sm font-semibold px-4 py-3 rounded-lg whitespace-nowrap lg:whitespace-normal shrink-0 hover:bg-subtle transition-colors";
      btn.textContent = extra.label;
      btn.addEventListener("click", function () {
        currentSectionIndex = idx;
        paintSectionNav();
        renderFields();
      });
      nav.appendChild(btn);
    });
    paintSectionNav();
  }

  /* ---------------- Extra (non-schema) sections ----------------
     "Form Başvuruları" and "Şifre Değiştir" talk to their own API endpoints
     instead of editing the {en,tr,ru} content object, so they render their own UI. */
  var EXTRA_SECTIONS = [
    { id: "contacts", label: "Form Başvuruları", hint: "İletişim formundan gelen talepler. Yeni talepler için e-posta bildirimi yoktur; bu ekranı düzenli kontrol edin.", render: renderContactsSection },
    { id: "password", label: "Şifre Değiştir", hint: "Yönetim paneli giriş şifrenizi değiştirin.", render: renderPasswordSection }
  ];

  var contactsCache = [];

  function formatDate(iso) {
    if (!iso) return "";
    var s = /[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : iso + "Z"; // the API stores UTC without a marker
    var d = new Date(s);
    return isNaN(d.getTime()) ? iso : d.toLocaleString("tr-TR");
  }

  function updateContactBadge() {
    return apiFetch("/api/admin/contact").then(function (res) {
      return res.ok ? res.json() : null;
    }).then(function (list) {
      if (!list) return;
      contactsCache = list;
      var unread = list.filter(function (c) { return !c.isRead; }).length;
      var btn = document.getElementById("nav-contacts");
      if (btn) btn.textContent = "Form Başvuruları" + (unread > 0 ? " (" + unread + " yeni)" : "");
    }).catch(function () {});
  }

  function renderContactsSection(container) {
    var wrap = document.createElement("div");
    wrap.className = "sm:col-span-2 contact-list";
    wrap.textContent = "Yükleniyor…";
    container.appendChild(wrap);

    var myIndex = currentSectionIndex;
    updateContactBadge().then(function () {
      if (currentSectionIndex === myIndex) paintContacts(wrap);
    });
  }

  function contactField(dl, term, valueNode, extraClass) {
    var wrapper = document.createElement("div");
    if (extraClass) wrapper.className = extraClass;
    var dt = document.createElement("dt");
    dt.textContent = term;
    var dd = document.createElement("dd");
    dd.appendChild(valueNode);
    wrapper.appendChild(dt);
    wrapper.appendChild(dd);
    dl.appendChild(wrapper);
  }

  function linkNode(href, text) {
    var a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    return a;
  }

  function paintContacts(wrap) {
    wrap.innerHTML = "";
    if (!contactsCache.length) {
      var empty = document.createElement("div");
      empty.className = "contact-empty";
      empty.textContent = "Henüz başvuru yok.";
      wrap.appendChild(empty);
      return;
    }

    contactsCache.forEach(function (c) {
      var card = document.createElement("div");
      card.className = "contact-card" + (c.isRead ? "" : " is-unread");

      var head = document.createElement("div");
      head.className = "contact-card-head";
      var name = document.createElement("span");
      name.className = "contact-name";
      name.textContent = c.studentName;
      if (!c.isRead) {
        var nb = document.createElement("span");
        nb.className = "contact-new-badge";
        nb.textContent = "Yeni";
        name.appendChild(nb);
      }
      var date = document.createElement("span");
      date.className = "contact-date";
      date.textContent = formatDate(c.submittedAt);
      head.appendChild(name);
      head.appendChild(date);
      card.appendChild(head);

      var dl = document.createElement("dl");
      dl.className = "contact-fields";
      contactField(dl, "Öğrenci adı", document.createTextNode(c.studentName));
      contactField(dl, "E-posta", linkNode("mailto:" + c.parentEmail, c.parentEmail));
      contactField(dl, "Telefon", linkNode("tel:" + c.parentPhone, c.parentPhone));
      contactField(dl, "Konu / Hedef", document.createTextNode(c.topic || "—"));
      contactField(dl, "Mesaj", document.createTextNode(c.message || "—"), "contact-message");
      card.appendChild(dl);

      var actions = document.createElement("div");
      actions.className = "contact-actions";

      var readBtn = document.createElement("button");
      readBtn.type = "button";
      readBtn.className = "contact-read-btn";
      readBtn.textContent = c.isRead ? "Okunmadı yap" : "Okundu olarak işaretle";
      readBtn.addEventListener("click", function () {
        apiFetch("/api/admin/contact/" + c.id + "/read", { method: "PUT", body: JSON.stringify({ isRead: !c.isRead }) }).then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return updateContactBadge();
        }).then(function () { paintContacts(wrap); }).catch(function () { alert("İşlem başarısız oldu."); });
      });
      actions.appendChild(readBtn);

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "faq-delete-btn";
      delBtn.setAttribute("aria-label", c.studentName + " başvurusunu sil");
      delBtn.innerHTML = TRASH_ICON_SVG + "<span>Sil</span>";
      delBtn.addEventListener("click", function () {
        if (!confirm(c.studentName + " adlı kişinin başvurusunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
        apiFetch("/api/admin/contact/" + c.id, { method: "DELETE" }).then(function (res) {
          if (!res.ok && res.status !== 404) throw new Error("HTTP " + res.status);
          return updateContactBadge();
        }).then(function () { paintContacts(wrap); }).catch(function () { alert("Silme başarısız oldu."); });
      });
      actions.appendChild(delBtn);

      card.appendChild(actions);
      wrap.appendChild(card);
    });
  }

  function renderPasswordSection(container) {
    var form = document.createElement("form");
    form.className = "sm:col-span-2 pw-form";
    form.setAttribute("autocomplete", "off");

    function addField(id, labelText, autocomplete) {
      var box = document.createElement("div");
      box.className = "flex flex-col gap-1.5";
      var label = document.createElement("label");
      label.setAttribute("for", id);
      label.textContent = labelText;
      var input = document.createElement("input");
      input.type = "password";
      input.id = id;
      input.className = "field-input";
      input.required = true;
      input.setAttribute("autocomplete", autocomplete);
      box.appendChild(label);
      box.appendChild(input);
      attachPasswordToggle(input);
      form.appendChild(box);
      return input;
    }

    var current = addField("pw-current", "Mevcut şifre", "current-password");
    var next = addField("pw-new", "Yeni şifre (en az 8 karakter)", "new-password");
    var confirmInput = addField("pw-confirm", "Yeni şifre (tekrar)", "new-password");

    var message = document.createElement("p");
    message.className = "pw-message";
    message.setAttribute("role", "status");
    message.hidden = true;
    form.appendChild(message);

    var submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "faq-add-btn";
    submit.textContent = "Şifreyi Değiştir";
    form.appendChild(submit);

    function show(text, ok) {
      message.textContent = text;
      message.className = "pw-message " + (ok ? "is-success" : "is-error");
      message.hidden = false;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (next.value.length < 8) return show("Yeni şifre en az 8 karakter olmalı.", false);
      if (next.value !== confirmInput.value) return show("Yeni şifre ile tekrarı eşleşmiyor.", false);
      submit.disabled = true;
      apiFetch("/api/admin/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: current.value, newPassword: next.value, confirmNewPassword: confirmInput.value })
      }).then(function (res) {
        if (res.ok) {
          current.value = next.value = confirmInput.value = "";
          show("Şifreniz değiştirildi. Bu oturum açık kalır; bir sonraki girişte yeni şifreyi kullanın.", true);
          return;
        }
        if (res.status === 429) return show("Çok fazla deneme yapıldı. Bir dakika sonra tekrar deneyin.", false);
        return res.json().catch(function () { return {}; }).then(function (d) { show(d.error || "Şifre değiştirilemedi.", false); });
      }).catch(function (err) {
        if (err.message !== "unauthorized") show("Sunucuya ulaşılamadı.", false);
      }).finally(function () { submit.disabled = false; });
    });

    container.appendChild(form);
  }

  function paintSectionNav() {
    var buttons = document.querySelectorAll("#section-nav .sidebar-btn");
    buttons.forEach(function (btn, idx) {
      btn.classList.toggle("active", idx === currentSectionIndex);
    });
  }

  function renderFields() {
    if (currentSectionIndex >= SCHEMA.length) {
      var extra = EXTRA_SECTIONS[currentSectionIndex - SCHEMA.length];
      document.getElementById("section-title").textContent = extra.label;
      document.getElementById("section-hint").textContent = extra.hint;
      var extraContainer = document.getElementById("fields-container");
      extraContainer.innerHTML = "";
      extra.render(extraContainer);
      return;
    }
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
