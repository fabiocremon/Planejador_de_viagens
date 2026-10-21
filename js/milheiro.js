// Calculadora do valor do milheiro: custo total / milhas finais (com bonificação).
// Nada é presumido: campo vazio fica em "—".
(function () {
  function $(id) { return document.getElementById(id); }
  var campos = ['mpPontos', 'mpValor', 'mpBonus', 'mpExtra'];

  // Cálculo puro. bonus em % (30 = 30%). Devolve null se faltar pontos ou valor.
  function calcular(pontos, valor, bonus, extra) {
    if (!(pontos > 0) || !(valor > 0)) return null;
    var milhas = pontos * (1 + Math.max(bonus, 0) / 100);
    var custo = valor + Math.max(extra, 0);
    return {
      milhas: milhas,
      custo: custo,
      final: custo / (milhas / 1000),
      sem: custo / (pontos / 1000)
    };
  }
  window.calcularMilheiro = calcular;

  var ultimo = null;
  function atualizar() {
    var r = calcular(App.num($('mpPontos').value), App.num($('mpValor').value), App.num($('mpBonus').value), App.num($('mpExtra').value));
    ultimo = r;
    $('mpFinal').textContent = r ? App.brl(r.final) : '—';
    $('mpMilhas').textContent = r ? App.inteiro(r.milhas) : '—';
    $('mpCusto').textContent = r ? App.brl(r.custo) : '—';
    $('mpSem').textContent = r ? App.brl(r.sem) : '—';
    $('mpEcon').textContent = r ? App.brl(r.sem - r.final) + ' por milheiro' : '—';
    $('mpUsar').disabled = !r;
    var m = $('mpMsg'); m.classList.add('hidden');
    App.gravar('milheiro_calc', campos.map(function (c) { return $(c).value; }));
  }
  campos.forEach(function (c) { $(c).addEventListener('input', atualizar); });

  $('mpUsar').addEventListener('click', function () {
    if (!ultimo) return;
    var cus = document.getElementById('cus');
    cus.value = ultimo.final.toFixed(2).replace('.', ',');
    cus.dispatchEvent(new Event('input', { bubbles: true }));
    var m = $('mpMsg'); m.textContent = 'Valor copiado para "Meu custo do milheiro" acima.'; m.classList.remove('hidden');
  });
  $('mpLimpar').addEventListener('click', function () {
    campos.forEach(function (c) { $(c).value = ''; });
    atualizar();
  });

  var salvo = App.ler('milheiro_calc', null);
  if (Array.isArray(salvo)) campos.forEach(function (c, i) { $(c).value = salvo[i] || ''; });
  atualizar();
})();
