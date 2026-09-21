/* Where the C# API lives. Empty string = no backend: the site then uses content-data.js only.
   Local development: the API runs on http://localhost:5080 (see backend/EnglishTutor.Api).
   Going live: set the production API origin below AND add it to `connect-src` in the
   Content-Security-Policy <meta> tag of index.html and admin.html. */
window.SITE_API_BASE = (function () {
  var host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "http://localhost:5080";
  return "";
})();

/* The single seeded admin account (its password is NOT stored here; it is checked by the API). */
window.SITE_ADMIN_USERNAME = "admin";
