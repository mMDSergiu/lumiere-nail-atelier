// Runs before the page paints: applies the saved theme and language, so there is no flash.
(function () {
  var theme = null;
  var lang = null;
  try {
    theme = localStorage.getItem('site-theme');
    lang = localStorage.getItem('site-lang');
  } catch (e) {}
  if (theme !== 'dark' && theme !== 'light') {
    theme = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (lang !== 'en' && lang !== 'ro' && lang !== 'ru') {
    var nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    lang = nav === 'ro' || nav === 'ru' ? nav : 'en';
  }
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('lang', lang);
})();
