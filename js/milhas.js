// Calculadora milhas x dinheiro.
// Regra: nada é presumido. Os campos vazios ficam em "—" e o usuário decide.
(function () {
  var ids = ['prog', 'din', 'mil', 'tax', 'cus', 'fonte', 'consulta'];
  var el = {};
  ids.forEach(function (i) { el[i] = document.getElementById(i); });
  function $(id) { return document.getElementById(id); }

  // Programa
  App.programas.forEach(function (p) {
    var o = document.createElement('option');
    o.textContent = p;
    el.prog.appendChild(o);
  });

  // Cálculo puro (separado da tela para facilitar testes).
  function calcular(v) {
    var milheiros = v.milhas / 1000;
    var milhasEmReais = milheiros * v.custo;
    var custoMilhas = milhasEmReais + v.taxas;
    return {
      milhasEmReais: milhasEmReais,
      custoMilhas: custoMilhas,
      economia: v.dinheiro - custoMilhas, // positivo = milhas compensam
      valorMilheiro: milheiros > 0 ? (v.dinheiro - v.taxas) / milheiros : 0
    };
  }
  window.calcularMilhas = calcular;

  function atualizar() {
    var v = {
      dinheiro: App.num(el.din.value),
      milhas: App.num(el.mil.value),
      taxas: App.num(el.tax.value),
      custo: App.num(el.cus.value)
    };
    var prontoCalc = v.dinheiro > 0 && v.milhas > 0 && v.custo > 0;

    $('rMilhas').textContent = v.milhas > 0 ? App.inteiro(v.milhas) : '—';
    $('rTaxas').textContent = el.tax.value.trim() ? App.brl(v.taxas) : '—';
    $('rDinheiro').textContent = v.dinheiro > 0 ? App.brl(v.dinheiro) : '—';
    $('rMilhasReais').textContent = v.milhas > 0 && v.custo > 0 ? App.brl((v.milhas / 1000) * v.custo) : '—';
    $('rConsulta').textContent = 'Preço consultado em: ' + (App.data(el.consulta.value) || '—');
    $('rFonte').textContent = 'Fonte: ' + (el.fonte.value.trim() || '—');
    $('cardMilhas').classList.remove('win');
    $('cardDinheiro').classList.remove('win');

    if (v.milhas > 0 && v.dinheiro > 0) {
      var mil = (v.dinheiro - v.taxas) / (v.milhas / 1000);
      $('rMilheiro').textContent = App.brl(mil);
    } else {
      $('rMilheiro').textContent = '—';
    }

    if (!prontoCalc) {
      $('rMilhasTotal').textContent = '—';
      $('rTitulo').textContent = 'Preencha preço, milhas e custo do milheiro';
      $('rNota').textContent = 'A decisão é sua. Confira o saldo e a validade antes de emitir.';
    } else {
      var r = calcular(v);
      $('rMilhasTotal').textContent = App.brl(r.custoMilhas);
      if (r.economia > 0) {
        $('rTitulo').textContent = 'Com milhas, você economiza ' + App.brl(r.economia);
        $('cardMilhas').classList.add('win');
      } else if (r.economia < 0) {
        $('rTitulo').textContent = 'Em dinheiro, você economiza ' + App.brl(-r.economia);
        $('cardDinheiro').classList.add('win');
      } else {
        $('rTitulo').textContent = 'Os dois cenários custam o mesmo';
      }
      $('rNota').textContent = 'Usando seu custo de ' + App.brl(v.custo) + ' por milheiro. A decisão é sua.';
    }

    // Aviso de saldo (só se você já registrou o saldo no Painel).
    var saldos = App.ler('saldos', {});
    var aviso = $('avisos');
    var s = saldos[el.prog.value];
    if (v.milhas > 0 && s && s.saldo && App.num(s.saldo) < v.milhas) {
      aviso.textContent = 'Seu saldo registrado em ' + el.prog.value + ' (' + App.inteiro(App.num(s.saldo)) + ') é menor que as milhas necessárias.';
      aviso.classList.remove('hidden');
    } else if (v.milhas > 0 && s && s.validade && s.validade < new Date().toISOString().slice(0, 10)) {
      aviso.textContent = 'A validade registrada para ' + el.prog.value + ' (' + App.data(s.validade) + ') já passou.';
      aviso.classList.remove('hidden');
    } else {
      aviso.classList.add('hidden');
    }

    var estado = {};
    ids.forEach(function (i) { estado[i] = el[i].value; });
    App.gravar('milhas_form', estado);
  }

  // Restaura os últimos valores usados.
  var guardado = App.ler('milhas_form', {});
  ids.forEach(function (i) { if (guardado[i] != null) el[i].value = guardado[i]; });
  if (!el.prog.value) el.prog.selectedIndex = 0;

  ids.forEach(function (i) {
    el[i].addEventListener('input', atualizar);
    el[i].addEventListener('change', atualizar);
  });
  $('limpar').addEventListener('click', function () {
    ids.forEach(function (i) { if (i !== 'prog') el[i].value = ''; });
    atualizar();
  });
  atualizar();
})();
