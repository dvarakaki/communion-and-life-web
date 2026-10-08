// Marca cedo se o JS está ativo e se o usuário prefere menos movimento (evita "flash" de layout).
(function () {
  var d = document.documentElement, os = false;
  try { os = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  d.classList.add('js');
  d.dataset.motion = os ? 'reduced' : 'full';
})();
