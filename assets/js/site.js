// Curriculum Tab Switcher
const tabButtons = document.querySelectorAll('.curriculum-tab-btn');
const tabPanels = document.querySelectorAll('.curriculum-panel');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');
    tabButtons.forEach(b => {
      b.classList.remove('bg-primary', 'text-on-primary');
      b.classList.add('text-on-surface-variant');
    });
    btn.classList.add('bg-primary', 'text-on-primary');
    btn.classList.remove('text-on-surface-variant');
    tabPanels.forEach(panel => {
      if (panel.id === `tab-${targetTab}`) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });
  });
});

// FAQ Accordion Collapsible Logic — delegated on the container so it also
// covers items rendered dynamically (any number of FAQ entries) by
// renderFAQAccordion() further down, not just ones present at page load.
const faqAccordion = document.getElementById('faq-accordion');
if (faqAccordion) {
  faqAccordion.addEventListener('click', (e) => {
    const btn = e.target.closest('.faq-btn');
    if (!btn || !faqAccordion.contains(btn)) return;
    const answer = btn.nextElementSibling;
    const icon = btn.querySelector('.faq-icon');
    const isExpanded = !answer.classList.contains('hidden');
    faqAccordion.querySelectorAll('.faq-answer').forEach(a => a.classList.add('hidden'));
    faqAccordion.querySelectorAll('.faq-icon').forEach(i => i.style.transform = 'rotate(0deg)');
    if (!isExpanded) {
      answer.classList.remove('hidden');
      icon.style.transform = 'rotate(180deg)';
    }
  });
}

const openBtn = document.getElementById('mobile-menu-trigger'); const closeBtn = document.getElementById('mobile-menu-close'); const drawer = document.getElementById('mobile-drawer'); if(openBtn && closeBtn && drawer){ openBtn.addEventListener('click', () => drawer.classList.remove('hidden')); closeBtn.addEventListener('click', () => drawer.classList.add('hidden')); drawer.querySelectorAll('a').forEach(link => { link.addEventListener('click', () => drawer.classList.add('hidden')); }); }
(function(){
  var trigger = document.getElementById('privacy-modal-trigger');
  var modal = document.getElementById('privacy-modal');
  var backdrop = document.getElementById('privacy-modal-backdrop');
  var closeBtn1 = document.getElementById('privacy-modal-close');
  var closeBtn2 = document.getElementById('privacy-modal-close-btn');
  var panel = document.getElementById('privacy-modal-panel');
  if (!trigger || !modal) return;
  var lastFocused = null;
  function openModal(e){
    if (e) e.preventDefault();
    lastFocused = document.activeElement;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.documentElement.classList.add('overflow-hidden');
    document.body.classList.add('overflow-hidden');
    if (closeBtn1) closeBtn1.focus();
  }
  function closeModal(){
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.documentElement.classList.remove('overflow-hidden');
    document.body.classList.remove('overflow-hidden');
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  trigger.addEventListener('click', openModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);
  if (closeBtn1) closeBtn1.addEventListener('click', closeModal);
  if (closeBtn2) closeBtn2.addEventListener('click', closeModal);
  if (panel) panel.addEventListener('click', function(e){ e.stopPropagation(); });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });
})();

(function () {
  "use strict";
  var ACTIVE_CLASSES = ['bg-surface-card', 'text-primary', 'font-bold', 'shadow-[0_1px_3px_rgba(15,41,66,0.08)]'];
  var INACTIVE_CLASSES = ['text-on-surface-variant'];

  function paintLangButtons(lang) {
    document.querySelectorAll('.lang-switch-btn').forEach(function (btn) {
      var isActive = btn.getAttribute('data-lang') === lang;
      ACTIVE_CLASSES.forEach(function (c) { btn.classList.toggle(c, isActive); });
      INACTIVE_CLASSES.forEach(function (c) { btn.classList.toggle(c, !isActive); });
    });
  }

  function syncEmailLinks(lang) {
    var content = window.SapphireContent.getContent()[lang];
    var addr = window.SapphireContent.getPath(content, 'contact.email.address');
    if (addr) {
      var l1 = document.getElementById('email-contact-link');
      var l2 = document.getElementById('footer-email-link');
      var l3 = document.getElementById('footer-social-email-link');
      if (l1) l1.setAttribute('href', 'mailto:' + addr);
      if (l2) l2.setAttribute('href', 'mailto:' + addr);
      if (l3) l3.setAttribute('href', 'mailto:' + addr);
    }
  }

  // FAQ items are a variable-length list, so they're rendered here instead
  // of through the static data-i18n bindings that applyLangToDocument()
  // handles — the accordion markup is built fresh from however many
  // faq.items entries exist for the language (no 4-item limit).
  function renderFAQAccordion(lang) {
    var container = document.getElementById('faq-accordion');
    if (!container) return;
    var content = window.SapphireContent.getContent()[lang];
    var items = (content && content.faq && Array.isArray(content.faq.items)) ? content.faq.items : [];
    // A question with no q or a text in this language is left out of the
    // accordion entirely rather than rendered blank (each language's FAQ
    // list is filtered independently, so a fully-filled TR entry can still
    // be hidden in EN/RU until translated).
    items = items.filter(function (item) {
      return item && typeof item.q === 'string' && item.q.trim() && typeof item.a === 'string' && item.a.trim();
    });

    container.innerHTML = '';
    items.forEach(function (item) {
      var wrap = document.createElement('div');
      wrap.className = 'faq-item bg-surface-card rounded-xl shadow-sm overflow-hidden transition-all';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'faq-btn w-full p-space-md md:p-space-lg flex items-center justify-between text-left gap-space-md';

      var q = document.createElement('span');
      q.className = 'font-title-md text-title-md text-primary font-bold flex-1 min-w-0';
      q.textContent = item && item.q ? item.q : '';

      var iconSpan = document.createElement('span');
      iconSpan.className = 'faq-icon text-secondary transition-transform duration-200 shrink-0';
      iconSpan.innerHTML = '<svg fill="currentColor" class="icon-inline" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/></svg>';

      btn.appendChild(q);
      btn.appendChild(iconSpan);

      var answer = document.createElement('div');
      answer.className = 'faq-answer hidden px-space-md md:px-space-lg pb-space-md md:pb-space-lg text-body-md font-body-md text-text-slate-muted border-l-4 border-secondary';
      answer.textContent = item && item.a ? item.a : '';

      wrap.appendChild(btn);
      wrap.appendChild(answer);
      container.appendChild(wrap);
    });
  }

  // The wa.me link needs the base URL (number) plus a prefilled ?text=
  // message appended, so it can't go through the plain data-i18n-href
  // mechanism (which only ever sets the raw stored value verbatim).
  function syncWhatsappFloat(lang) {
    var content = window.SapphireContent.getContent()[lang];
    var btn = document.getElementById('whatsapp-float');
    if (!btn) return;
    var wa = (content && content.contact && content.contact.whatsapp) || {};
    var base = wa.url || 'https://wa.me/';
    var message = wa.floatMessage || '';
    var separator = base.indexOf('?') === -1 ? '?' : '&';
    btn.setAttribute('href', base + separator + 'text=' + encodeURIComponent(message));
  }

  // Keeps the FAQPage structured-data block (<script type="application/ld+json">
  // id="faqpage-jsonld"> in <head>) in sync with whatever FAQ items are
  // actually visible in this language, instead of a hand-maintained copy
  // that silently drifts from the real content. Same q/a-must-both-be-filled
  // filter as the on-page accordion, so search engines never see a question
  // the visitor can't actually see. Stays inline (not an external file) —
  // Google's structured-data crawling expects this data embedded in the
  // page itself, not loaded separately.
  function updateFAQJsonLd(lang) {
    var content = window.SapphireContent.getContent()[lang];
    var items = (content && content.faq && Array.isArray(content.faq.items)) ? content.faq.items : [];
    items = items.filter(function (item) {
      return item && typeof item.q === 'string' && item.q.trim() && typeof item.a === 'string' && item.a.trim();
    });

    var scriptEl = document.getElementById('faqpage-jsonld');
    if (items.length === 0) {
      if (scriptEl) scriptEl.remove();
      return;
    }
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.id = 'faqpage-jsonld';
      document.head.appendChild(scriptEl);
    }
    var jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map(function (item) {
        return {
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a }
        };
      })
    };
    scriptEl.textContent = JSON.stringify(jsonLd);
  }

  function setLang(lang) {
    window.SapphireContent.applyLangToDocument(lang);
    renderFAQAccordion(lang);
    updateFAQJsonLd(lang);
    window.SapphireContent.setLangPref(lang);
    paintLangButtons(lang);
    syncEmailLinks(lang);
    syncWhatsappFloat(lang);
  }

  document.querySelectorAll('.lang-switch-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setLang(btn.getAttribute('data-lang'));
    });
  });

  // This file loads with `defer`, so by the time it runs the DOM is already
  // fully parsed (readyState is at least 'interactive') — a single direct
  // call is enough; no need for a DOMContentLoaded listener as well, which
  // would fire a second, redundant setLang() right after this one.
  setLang(window.SapphireContent.getLang());

  /* ---- Phone field: digits only, capped length ---- */
  var phoneInput = document.getElementById('parent-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      var digitsOnly = phoneInput.value.replace(/\D/g, '').slice(0, 15);
      if (digitsOnly !== phoneInput.value) phoneInput.value = digitsOnly;
    });
    phoneInput.addEventListener('keypress', function (e) {
      if (e.key && !/[0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }
    });
    phoneInput.addEventListener('paste', function (e) {
      var pasted = (e.clipboardData || window.clipboardData).getData('text');
      if (/\D/.test(pasted)) {
        e.preventDefault();
        var digitsOnly = (phoneInput.value + pasted).replace(/\D/g, '').slice(0, 15);
        phoneInput.value = digitsOnly;
      }
    });
  }

  /* ---- Consultation form: submit via Formspree (no backend needed) ---- */
  var consultationForm = document.getElementById('consultation-form');
  if (consultationForm) {
    var submitBtn = document.getElementById('consultation-submit');
    var successBox = document.getElementById('form-success');
    var errorBox = document.getElementById('form-error');

    consultationForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (successBox) successBox.classList.add('hidden');
      if (errorBox) errorBox.classList.add('hidden');
      if (submitBtn) submitBtn.setAttribute('disabled', 'disabled');

      var formData = new FormData(consultationForm);
      fetch(consultationForm.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      }).then(function (response) {
        if (response.ok) {
          if (successBox) successBox.classList.remove('hidden');
          consultationForm.reset();
        } else {
          if (errorBox) errorBox.classList.remove('hidden');
        }
      }).catch(function () {
        if (errorBox) errorBox.classList.remove('hidden');
      }).finally(function () {
        if (submitBtn) submitBtn.removeAttribute('disabled');
      });
    });
  }

  /* ---- Back-to-top button: hidden at the top, fades in past the hero, scrolls to top on click ---- */
  var backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    var BACK_TO_TOP_SCROLL_THRESHOLD = 400;
    var toggleBackToTop = function () {
      backToTopBtn.classList.toggle('is-visible', window.scrollY > BACK_TO_TOP_SCROLL_THRESHOLD);
    };
    toggleBackToTop();
    window.addEventListener('scroll', toggleBackToTop, { passive: true });
    backToTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
