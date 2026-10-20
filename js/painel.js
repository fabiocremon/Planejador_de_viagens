// Painel: dados da viagem atual e saldos de milhas (salvos só neste navegador).
(function () {
  var campos = ['destino', 'saida', 'ida', 'volta', 'pessoas'];
  var el = {};
  campos.forEach(function (c) { el[c] = document.getElementById(c); });

  var viagem = App.ler('viagem', {});
  campos.forEach(function (c) { if (viagem[c] != null) el[c].value = viagem[c]; });

  function resumo() {
    var partes = [];
    if (el.destino.value.trim()) partes.push(el.destino.value.trim());
    if (el.ida.value && el.volta.value) partes.push(App.data(el.ida.value) + ' a ' + App.data(el.volta.value));
    else if (el.ida.value) partes.push('ida em ' + App.data(el.ida.value));
    if (el.pessoas.value) partes.push(el.pessoas.value + (el.pessoas.value === '1' ? ' pessoa' : ' pessoas'));
    document.getElementById('resumoViagem').textContent = partes.length ? partes.join(' · ') : 'Preencha os dados';
  }

  campos.forEach(function (c) {
    el[c].addEventListener('input', function () {
      var v = {};
      campos.forEach(function (k) { v[k] = el[k].value; });
      App.gravar('viagem', v);
      resumo();
    });
  });
  resumo();

  // Saldos de milhas
  var saldos = App.ler('saldos', {});
  var alvo = document.getElementById('saldos');

  App.programas.forEach(function (nome) {
    var s = saldos[nome] || {};
    var linha = document.createElement('div');
    linha.className = 'row';
    linha.style.alignItems = 'center';

    var titulo = document.createElement('strong');
    titulo.textContent = nome;
    titulo.style.flex = '1 1 160px';

    var gSaldo = document.createElement('div');
    gSaldo.className = 'field';
    gSaldo.style.flex = '1 1 160px';
    var lSaldo = document.createElement('label');
    lSaldo.textContent = 'Saldo';
    lSaldo.className = 'muted';
    var iSaldo = document.createElement('input');
    iSaldo.inputMode = 'numeric';
    iSaldo.placeholder = 'milhas ou pontos';
    iSaldo.value = s.saldo || '';
    iSaldo.id = 'saldo-' + nome;
    lSaldo.htmlFor = iSaldo.id;
    gSaldo.appendChild(lSaldo);
    gSaldo.appendChild(iSaldo);

    var gVal = document.createElement('div');
    gVal.className = 'field';
    gVal.style.flex = '1 1 160px';
    var lVal = document.createElement('label');
    lVal.textContent = 'Validade';
    lVal.className = 'muted';
    var iVal = document.createElement('input');
    iVal.type = 'date';
    iVal.value = s.validade || '';
    iVal.id = 'validade-' + nome;
    lVal.htmlFor = iVal.id;
    gVal.appendChild(lVal);
    gVal.appendChild(iVal);

    function salvar() {
      saldos[nome] = { saldo: iSaldo.value, validade: iVal.value };
      App.gravar('saldos', saldos);
    }
    iSaldo.addEventListener('input', salvar);
    iVal.addEventListener('input', salvar);

    linha.appendChild(titulo);
    linha.appendChild(gSaldo);
    linha.appendChild(gVal);
    alvo.appendChild(linha);
  });
})();
