// Painel: viagens salvas, valor do milheiro (com gráfico) e saldos.
// Tudo fica salvo só neste navegador.
(function () {
  function $(id) { return document.getElementById(id); }
  function criar(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function hoje() { return new Date().toISOString().slice(0, 10); }

  // =====================================================================
  // Viagens salvas (criar, editar, abrir). Cada viagem guarda dados + roteiro.
  // A viagem aberta fica em 'viagem' e 'roteiro'; a página Roteiro mantém a salva em dia.
  // =====================================================================
  var CAMPOS = ['destino', 'saida', 'ida', 'volta', 'pessoas'];
  var STATUS = ['Planejando', 'Confirmada', 'Realizada'];
  var d = {};
  CAMPOS.forEach(function (c) { d[c] = $('v-' + c); });

  var viagens = App.ler('viagens', []);
  var abertaId = App.ler('viagem_aberta', null);
  var editandoId = null;

  function gravarViagens() {
    App.gravar('viagens', viagens);
    App.gravar('viagem_aberta', abertaId);
  }

  function abrirViagem(t) {
    App.gravar('viagem', t.dados);
    App.gravar('roteiro', t.roteiro || { dias: 1, atividades: [] });
    abertaId = t.id;
    gravarViagens();
    window.location.href = 'roteiro.html';
  }

  var dlg = $('dlgViagem');
  function abrirDialogo(t) {
    editandoId = t ? t.id : null;
    $('dlgTitulo').textContent = t ? 'Editar viagem' : 'Nova viagem';
    $('dlgEnviar').textContent = t ? 'Salvar alterações' : 'Criar e abrir roteiro';
    CAMPOS.forEach(function (c) { d[c].value = t && t.dados[c] != null ? t.dados[c] : ''; });
    $('dlgErro').classList.add('hidden');
    dlg.showModal();
    d.destino.focus();
  }

  $('novaViagem').addEventListener('click', function () { abrirDialogo(null); });
  $('dlgCancelar').addEventListener('click', function () { dlg.close(); });

  $('formViagem').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var erro = $('dlgErro');
    var dados = {};
    CAMPOS.forEach(function (c) { dados[c] = d[c].value.trim(); });
    if (!dados.destino) { erro.textContent = 'Informe o destino.'; erro.classList.remove('hidden'); d.destino.focus(); return; }
    if (dados.ida && dados.volta && dados.volta < dados.ida) { erro.textContent = 'A volta não pode ser antes da ida.'; erro.classList.remove('hidden'); return; }

    if (editandoId) {
      var t = viagens.filter(function (x) { return x.id === editandoId; })[0];
      if (t) {
        t.dados = dados;
        if (abertaId === t.id) App.gravar('viagem', dados);
        gravarViagens();
      }
      dlg.close();
      desenharViagens();
    } else {
      var nova = {
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        status: 'Planejando',
        dados: dados,
        roteiro: { dias: 1, atividades: [] }
      };
      viagens.push(nova);
      gravarViagens();
      dlg.close();
      abrirViagem(nova);
    }
  });

  function desenharViagens() {
    var caixa = $('viagens');
    caixa.textContent = '';
    $('semViagens').classList.toggle('hidden', viagens.length > 0);
    // Mais recentes primeiro (pela data de ida; sem data vai para o fim).
    var ordenadas = viagens.slice().sort(function (a, b) {
      return (b.dados.ida || '0000').localeCompare(a.dados.ida || '0000');
    });
    ordenadas.forEach(function (t) {
      var item = criar('div', 'viagem-item');
      var info = criar('div', 'viagem-info');
      var topo = criar('div', '');
      topo.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center';
      topo.appendChild(criar('strong', '', t.dados.destino));
      if (t.id === abertaId) topo.appendChild(criar('span', 'chip', 'Aberta agora'));
      info.appendChild(topo);
      var det = [];
      if (t.dados.ida) det.push(App.data(t.dados.ida) + (t.dados.volta ? ' a ' + App.data(t.dados.volta) : ''));
      if (t.dados.saida) det.push('saída de ' + t.dados.saida);
      if (t.dados.pessoas) det.push(t.dados.pessoas + (t.dados.pessoas === '1' ? ' pessoa' : ' pessoas'));
      var n = (t.roteiro && t.roteiro.atividades) ? t.roteiro.atividades.length : 0;
      det.push(n + (n === 1 ? ' atividade no roteiro' : ' atividades no roteiro'));
      info.appendChild(criar('span', 'muted', det.join(' · ')));

      var acoes = criar('div', 'viagem-acoes');
      var sel = criar('select', '');
      sel.setAttribute('aria-label', 'Status de ' + t.dados.destino);
      STATUS.forEach(function (s) {
        var o = criar('option', '', s);
        if (s === t.status) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () { t.status = sel.value; gravarViagens(); });
      var abrir = criar('button', 'btn sec', 'Abrir roteiro');
      abrir.type = 'button';
      abrir.setAttribute('aria-label', 'Abrir roteiro de ' + t.dados.destino);
      abrir.addEventListener('click', function () { abrirViagem(t); });
      var edit = criar('button', 'btn link', 'Editar');
      edit.type = 'button';
      edit.setAttribute('aria-label', 'Editar dados de ' + t.dados.destino);
      edit.addEventListener('click', function () { abrirDialogo(t); });
      var rem = criar('button', 'btn link', 'Remover');
      rem.type = 'button';
      rem.setAttribute('aria-label', 'Remover ' + t.dados.destino);
      rem.addEventListener('click', function () {
        if (!confirm('Remover a viagem "' + t.dados.destino + '" e o roteiro dela?')) return;
        viagens = viagens.filter(function (x) { return x.id !== t.id; });
        if (abertaId === t.id) abertaId = null;
        gravarViagens();
        desenharViagens();
      });
      acoes.appendChild(sel);
      acoes.appendChild(abrir);
      acoes.appendChild(edit);
      acoes.appendChild(rem);

      item.appendChild(info);
      item.appendChild(acoes);
      caixa.appendChild(item);
    });
  }
  desenharViagens();

  // =====================================================================
  // Valor do milheiro na operadora
  // =====================================================================
  var OPS = App.programas;
  var registros = App.ler('milheiros', []); // [{id, data, valores:{operadora: numero}}]
  var ocultas = {};                         // operadora -> true quando escondida no gráfico
  function gravarMilheiros() { App.gravar('milheiros', registros); }

  var dlgCot = $('dlgCotacao');
  var inputsMk = {};
  OPS.forEach(function (op, i) {
    var g = criar('div', 'field');
    var l = criar('label', '', op + ' (R$)');
    var inp = criar('input', '');
    inp.id = 'mk-' + i;
    inp.inputMode = 'decimal';
    inp.placeholder = 'ex.: 16,50';
    inp.autocomplete = 'off';
    l.htmlFor = inp.id;
    g.appendChild(l);
    g.appendChild(inp);
    $('cotCampos').appendChild(g);
    inputsMk[op] = inp;
  });

  // Ao escolher a data, traz a cotação já registrada nela (se houver).
  function preencherCotacao() {
    var reg = registros.filter(function (r) { return r.data === $('cotData').value; })[0];
    OPS.forEach(function (op) {
      var v = reg && reg.valores[op] > 0 ? reg.valores[op] : '';
      inputsMk[op].value = v === '' ? '' : String(v).replace('.', ',');
    });
  }
  $('cotData').addEventListener('change', preencherCotacao);

  $('novaCotacao').addEventListener('click', function () {
    $('cotData').value = hoje();
    preencherCotacao();
    $('cotErro').classList.add('hidden');
    dlgCot.showModal();
    inputsMk[OPS[0]].focus();
  });
  $('cotCancelar').addEventListener('click', function () { dlgCot.close(); });

  $('formCotacao').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var erro = $('cotErro');
    var data = $('cotData').value;
    if (!data) { erro.textContent = 'Informe a data.'; erro.classList.remove('hidden'); return; }
    var valores = {};
    var qtd = 0;
    OPS.forEach(function (op) {
      var v = App.num(inputsMk[op].value);
      if (inputsMk[op].value.trim() && v > 0) { valores[op] = v; qtd++; }
    });
    if (!qtd) { erro.textContent = 'Informe o valor de pelo menos uma operadora.'; erro.classList.remove('hidden'); return; }
    var reg = registros.filter(function (r) { return r.data === data; })[0];
    var atualizou = !!reg;
    if (reg) reg.valores = valores;
    else registros.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), data: data, valores: valores });
    registros.sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; });
    gravarMilheiros();
    dlgCot.close();
    $('mkMsg').textContent = 'Cotação de ' + App.data(data) + (atualizou ? ' atualizada.' : ' salva.');
    desenharMilheiro();
  });

  function desenharLegenda() {
    var caixa = $('legenda');
    caixa.textContent = '';
    OPS.forEach(function (op, i) {
      var tem = registros.some(function (r) { return r.valores[op] > 0; });
      if (!tem) return;
      var b = criar('button', '');
      b.type = 'button';
      b.setAttribute('aria-pressed', ocultas[op] ? 'false' : 'true');
      var sw = criar('i', '');
      sw.style.background = 'var(--s' + (i + 1) + ')';
      b.appendChild(sw);
      b.appendChild(document.createTextNode(op));
      b.addEventListener('click', function () { ocultas[op] = !ocultas[op]; desenharMilheiro(); });
      caixa.appendChild(b);
    });
  }

  function desenharGrafico() {
    var caixa = $('grafico');
    caixa.textContent = '';
    var vazio = $('mkVazio');
    vazio.classList.add('hidden');
    if (!registros.length) {
      vazio.textContent = 'Inclua a cotação de um dia para ver o gráfico.';
      vazio.classList.remove('hidden');
      return;
    }
    var series = [];
    OPS.forEach(function (op, i) {
      if (ocultas[op]) return;
      var pts = registros.filter(function (r) { return r.valores[op] > 0; })
        .map(function (r) { return { data: r.data, v: r.valores[op] }; });
      if (pts.length) series.push({ nome: op, cor: 'var(--s' + (i + 1) + ')', pts: pts });
    });
    if (!series.length) {
      vazio.textContent = 'Todas as operadoras estão ocultas. Clique em uma para mostrar.';
      vazio.classList.remove('hidden');
      return;
    }
    Grafico.linhas(caixa, {
      series: series,
      datas: registros.map(function (r) { return r.data; }),
      aria: 'Evolução do valor do milheiro por operadora. A tabela abaixo traz os mesmos valores.',
      margemDireita: 120
    });
  }

  function desenharTabela() {
    var caixa = $('mkTabela');
    caixa.textContent = '';
    if (!registros.length) { caixa.appendChild(criar('p', 'muted', 'Nenhum valor registrado.')); return; }
    var usadas = OPS.filter(function (op) { return registros.some(function (r) { return r.valores[op] > 0; }); });
    var tab = criar('table', 'tab');
    var cab = criar('tr', '');
    cab.appendChild(criar('th', '', 'Data'));
    usadas.forEach(function (op) { cab.appendChild(criar('th', '', op)); });
    cab.appendChild(criar('th', '', ''));
    tab.appendChild(cab);
    registros.slice().reverse().forEach(function (r) {
      var tr = criar('tr', '');
      tr.appendChild(criar('td', '', App.data(r.data)));
      usadas.forEach(function (op) { tr.appendChild(criar('td', '', r.valores[op] > 0 ? App.brl(r.valores[op]) : '—')); });
      var td = criar('td', '');
      var b = criar('button', 'btn link', 'Remover');
      b.type = 'button';
      b.setAttribute('aria-label', 'Remover valores de ' + App.data(r.data));
      b.addEventListener('click', function () {
        if (!confirm('Remover os valores de ' + App.data(r.data) + '?')) return;
        registros = registros.filter(function (x) { return x.id !== r.id; });
        gravarMilheiros();
        desenharMilheiro();
      });
      td.appendChild(b);
      tr.appendChild(td);
      tab.appendChild(tr);
    });
    caixa.appendChild(tab);
  }

  function desenharMilheiro() {
    desenharLegenda();
    desenharGrafico();
    desenharTabela();
  }
  desenharMilheiro();

  // =====================================================================
  // Saldos: só os programas que o usuário incluiu
  // =====================================================================
  var saldos = App.ler('saldos', {});
  var marcados = {};          // programas marcados no checklist
  var editandoPrograma = null;
  var dlgSal = $('dlgSaldo');

  function gravarSaldos() { App.gravar('saldos', saldos); }
  // Dados antigos vazios (sem saldo nem validade) não contam como programa incluído.
  function incluido(nome) {
    var s = saldos[nome];
    return !!(s && (s.ativo || s.saldo || s.validade));
  }

  function atualizarSelecao() {
    var nomes = OPS.filter(function (n) { return incluido(n) && marcados[n]; });
    $('editarSaldo').disabled = nomes.length !== 1;
    $('excluirSaldo').disabled = nomes.length === 0;
    $('selInfo').textContent = nomes.length === 0
      ? 'Marque um programa para editar ou excluir.'
      : nomes.length === 1 ? '1 programa marcado.' : nomes.length + ' programas marcados. Editar exige só um.';
  }

  function desenharSaldos() {
    var alvo = $('saldos');
    alvo.textContent = '';
    var lista = OPS.filter(incluido);
    $('semSaldos').classList.toggle('hidden', lista.length > 0);
    lista.forEach(function (nome, i) {
      var s = saldos[nome];
      var linha = criar('label', 'saldo-item');
      var cx = criar('input', '');
      cx.type = 'checkbox';
      cx.checked = !!marcados[nome];
      cx.setAttribute('aria-label', 'Marcar ' + nome);
      cx.addEventListener('change', function () { marcados[nome] = cx.checked; atualizarSelecao(); });
      var info = criar('div', 'saldo-info');
      info.appendChild(criar('strong', '', nome));
      var det = [];
      det.push(s.saldo ? App.inteiro(App.num(s.saldo)) + ' pts/milhas' : 'sem saldo informado');
      if (s.validade) det.push('vence em ' + App.data(s.validade));
      info.appendChild(criar('span', 'muted', det.join(' · ')));
      if (s.validade && s.validade < hoje()) info.appendChild(criar('span', 'chip', 'Vencido'));
      linha.appendChild(cx);
      linha.appendChild(info);
      alvo.appendChild(linha);
    });
    atualizarSelecao();
  }

  function abrirSaldo(nome) {
    editandoPrograma = nome || null;
    var sel = $('salPrograma');
    sel.textContent = '';
    var opcoes = nome ? [nome] : OPS.filter(function (n) { return !incluido(n); });
    if (!opcoes.length) { $('semSaldos').textContent = 'Todos os programas já foram incluídos.'; $('semSaldos').classList.remove('hidden'); return; }
    opcoes.forEach(function (n) { sel.appendChild(criar('option', '', n)); });
    sel.disabled = !!nome;
    var s = nome ? saldos[nome] : {};
    $('salSaldo').value = s.saldo || '';
    $('salValidade').value = s.validade || '';
    $('salTitulo').textContent = nome ? 'Editar programa' : 'Incluir programa';
    $('salErro').classList.add('hidden');
    dlgSal.showModal();
    (nome ? $('salSaldo') : sel).focus();
  }

  $('novoPrograma').addEventListener('click', function () { abrirSaldo(null); });
  $('salCancelar').addEventListener('click', function () { dlgSal.close(); });
  $('editarSaldo').addEventListener('click', function () {
    var nomes = OPS.filter(function (n) { return incluido(n) && marcados[n]; });
    if (nomes.length === 1) abrirSaldo(nomes[0]);
  });
  $('excluirSaldo').addEventListener('click', function () {
    var nomes = OPS.filter(function (n) { return incluido(n) && marcados[n]; });
    if (!nomes.length) return;
    if (!confirm('Excluir ' + nomes.join(', ') + ' dos seus saldos?')) return;
    nomes.forEach(function (n) { delete saldos[n]; delete marcados[n]; });
    gravarSaldos();
    desenharSaldos();
  });

  $('formSaldo').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var nome = $('salPrograma').value;
    if (!nome) return;
    saldos[nome] = { ativo: true, saldo: $('salSaldo').value.trim(), validade: $('salValidade').value };
    gravarSaldos();
    dlgSal.close();
    desenharSaldos();
  });
  desenharSaldos();
})();
