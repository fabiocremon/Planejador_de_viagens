// Roteiro dia a dia. Dados salvos só neste navegador.
(function () {
  var viagem = App.ler('viagem', {});
  var estado = App.ler('roteiro', { dias: 1, atividades: [] });
  if (!Array.isArray(estado.custos)) estado.custos = [];
  if (!Array.isArray(estado.lembretes)) estado.lembretes = [];
  var diaAtual = 1;

  function $(id) { return document.getElementById(id); }
  // Salva o roteiro e mantém em dia a viagem salva que está aberta.
  function salvar() {
    App.gravar('roteiro', estado);
    var id = App.ler('viagem_aberta', null);
    if (!id) return;
    var lista = App.ler('viagens', []);
    lista.forEach(function (t) { if (t.id === id) t.roteiro = estado; });
    App.gravar('viagens', lista);
  }

  // Número de dias sugerido pelas datas da viagem (só na primeira vez).
  if (viagem.ida && viagem.volta && estado.atividades.length === 0 && estado.dias === 1) {
    var d = Math.round((new Date(viagem.volta) - new Date(viagem.ida)) / 86400000) + 1;
    if (d > 1 && d <= 60) { estado.dias = d; salvar(); }
  }

  if (viagem.destino) $('titulo').textContent = 'Roteiro: ' + viagem.destino;
  if (viagem.ida) {
    $('subtitulo').textContent = App.data(viagem.ida) + (viagem.volta ? ' a ' + App.data(viagem.volta) : '') +
      (viagem.pessoas ? ' · ' + viagem.pessoas + (viagem.pessoas === '1' ? ' pessoa' : ' pessoas') : '');
  }

  function rotuloDia(n) {
    var dm = viagem.ida ? App.diaMes(viagem.ida, n - 1) : '';
    return 'Dia ' + n + (dm ? ' · ' + dm : '');
  }

  function criar(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function desenharAbas() {
    var abas = $('abas');
    abas.textContent = '';
    for (var n = 1; n <= estado.dias; n++) {
      (function (n) {
        var b = criar('button', n === diaAtual ? 'on' : '', 'Dia ' + n);
        b.type = 'button';
        b.setAttribute('aria-pressed', n === diaAtual ? 'true' : 'false');
        b.addEventListener('click', function () { diaAtual = n; desenhar(); });
        abas.appendChild(b);
      })(n);
    }
    var mais = criar('button', '', '+ Dia');
    mais.type = 'button';
    mais.addEventListener('click', function () {
      estado.dias += 1; diaAtual = estado.dias; salvar(); desenhar();
    });
    abas.appendChild(mais);
  }

  function desenharLista() {
    var lista = $('lista');
    lista.textContent = '';
    var doDia = estado.atividades
      .filter(function (a) { return a.dia === diaAtual; })
      .sort(function (a, b) { return (a.hora || '99:99').localeCompare(b.hora || '99:99'); });

    $('vazio').classList.toggle('hidden', doDia.length > 0);

    doDia.forEach(function (a, i) {
      var linha = criar('div', 'slot' + (i === 0 ? ' first' : ''));
      linha.appendChild(criar('div', 'time', a.hora || '—'));
      var corpo = criar('div', 'body');
      corpo.appendChild(criar('span', 'chip', a.tipo));
      corpo.appendChild(criar('strong', '', a.titulo));
      var extra = [];
      if (a.detalhe) extra.push(a.detalhe);
      if (a.custo > 0) extra.push(App.brl(a.custo));
      if (extra.length) corpo.appendChild(criar('span', 'muted', extra.join(' · ')));
      var rem = criar('button', 'btn link', 'Remover');
      rem.type = 'button';
      rem.setAttribute('aria-label', 'Remover ' + a.titulo);
      rem.addEventListener('click', function () {
        if (!confirm('Remover "' + a.titulo + '" do roteiro?')) return;
        estado.atividades = estado.atividades.filter(function (x) { return x.id !== a.id; });
        salvar(); desenhar();
      });
      linha.appendChild(corpo);
      linha.appendChild(rem);
      lista.appendChild(linha);
    });
  }

  function desenharTotais() {
    var totalDia = 0, totalAtiv = 0, totalCustos = 0;
    estado.atividades.forEach(function (a) {
      totalAtiv += a.custo || 0;
      if (a.dia === diaAtual) totalDia += a.custo || 0;
    });
    estado.custos.forEach(function (c) { totalCustos += c.valor || 0; });
    $('totalDia').textContent = App.brl(totalDia);
    $('totalCustos').textContent = App.brl(totalCustos);
    $('totalViagem').textContent = App.brl(totalAtiv + totalCustos);
  }

  // ----- Custos lançados (+) -----
  var dlgCusto = $('dlgCusto');
  var custoEditando = null;

  function desenharCustos() {
    var caixa = $('custosLista');
    caixa.textContent = '';
    $('semCustos').classList.toggle('hidden', estado.custos.length > 0);
    var ordenados = estado.custos.slice().sort(function (a, b) { return (b.data || '').localeCompare(a.data || ''); });
    ordenados.forEach(function (c, i) {
      var linha = criar('div', 'custo-item');
      var topo = criar('div', 'custo-topo');
      topo.appendChild(criar('strong', '', c.origem));
      topo.appendChild(criar('strong', '', App.brl(c.valor)));
      linha.appendChild(topo);
      var meta = criar('div', 'custo-meta');
      meta.appendChild(criar('span', 'chip', c.tipo));
      meta.appendChild(criar('span', 'muted', c.situacao + (c.data ? ' · ' + App.data(c.data) : '')));
      linha.appendChild(meta);
      if (c.obs) linha.appendChild(criar('div', 'muted', c.obs));
      var acoes = criar('div', 'custo-acoes');
      var ed = criar('button', 'btn link', 'Editar');
      ed.type = 'button';
      ed.setAttribute('aria-label', 'Editar custo ' + c.origem);
      ed.addEventListener('click', function () { abrirCusto(c); });
      var rem = criar('button', 'btn link', 'Remover');
      rem.type = 'button';
      rem.setAttribute('aria-label', 'Remover custo ' + c.origem);
      rem.addEventListener('click', function () {
        if (!confirm('Remover o custo "' + c.origem + '" (' + App.brl(c.valor) + ')?')) return;
        estado.custos = estado.custos.filter(function (x) { return x.id !== c.id; });
        salvar(); desenhar();
      });
      acoes.appendChild(ed); acoes.appendChild(rem);
      linha.appendChild(acoes);
      caixa.appendChild(linha);
    });

    // Resumo por tipo e por situação
    var porTipo = {}, pago = 0, previsto = 0;
    estado.custos.forEach(function (c) {
      porTipo[c.tipo] = (porTipo[c.tipo] || 0) + c.valor;
      if (c.situacao === 'Pago') pago += c.valor; else previsto += c.valor;
    });
    var box = $('custosTipo');
    box.textContent = '';
    Object.keys(porTipo).sort(function (a, b) { return porTipo[b] - porTipo[a]; }).forEach(function (t) {
      var r = criar('div', 'row');
      r.appendChild(criar('span', 'muted', t));
      r.appendChild(criar('strong', '', App.brl(porTipo[t])));
      box.appendChild(r);
    });
    var rp = criar('div', 'row'); rp.appendChild(criar('span', 'muted', 'Pago')); rp.appendChild(criar('strong', '', App.brl(pago))); box.appendChild(rp);
    var rv = criar('div', 'row'); rv.appendChild(criar('span', 'muted', 'Previsto')); rv.appendChild(criar('strong', '', App.brl(previsto))); box.appendChild(rv);
    $('custosTipoBox').classList.toggle('hidden', estado.custos.length === 0);
  }

  function abrirCusto(c) {
    custoEditando = c || null;
    $('custoTitulo').textContent = c ? 'Editar custo' : 'Adicionar custo';
    $('cEnviar').textContent = c ? 'Salvar alterações' : 'Adicionar';
    $('cOrigem').value = c ? c.origem : '';
    $('cTipo').value = c ? c.tipo : 'Passagem aérea';
    $('cValor').value = c ? c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
    $('cData').value = c ? (c.data || '') : '';
    $('cSituacao').value = c ? c.situacao : 'Previsto';
    $('cObs').value = c ? (c.obs || '') : '';
    $('cErro').classList.add('hidden');
    dlgCusto.showModal();
    $('cOrigem').focus();
  }
  $('novoCusto').addEventListener('click', function () { abrirCusto(null); });
  $('cCancelar').addEventListener('click', function () { dlgCusto.close(); });
  $('formCusto').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var origem = $('cOrigem').value.trim();
    var valor = App.num($('cValor').value);
    var erro = $('cErro');
    if (!origem) { erro.textContent = 'Informe de onde vem o custo.'; erro.classList.remove('hidden'); return; }
    if (!(valor > 0)) { erro.textContent = 'Informe um valor maior que zero.'; erro.classList.remove('hidden'); return; }
    var dados = { origem: origem, tipo: $('cTipo').value, valor: valor, data: $('cData').value, situacao: $('cSituacao').value, obs: $('cObs').value.trim() };
    if (custoEditando) {
      Object.keys(dados).forEach(function (k) { custoEditando[k] = dados[k]; });
    } else {
      dados.id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      estado.custos.push(dados);
    }
    salvar();
    dlgCusto.close();
    desenhar();
  });

  // ----- Lembretes (checklist) -----
  var SUGESTOES = [
    { grupo: 'Viagem internacional', itens: [
      'Conferir a validade do passaporte exigida pelo destino',
      'Ver se o destino exige visto ou autorização de entrada',
      'Contratar seguro-viagem',
      'Definir câmbio e cartão para uso no exterior',
      'Chip, eSIM ou roaming'] },
    { grupo: 'Qualquer viagem', itens: [
      'Separar documentos pessoais',
      'Confirmar reservas (voo e hospedagem)',
      'Fazer o check-in online',
      'Ver a previsão do tempo',
      'Avisar o banco e conferir limite do cartão'] }
  ];
  var dlgLemb = $('dlgLembrete'), dlgSug = $('dlgSugestoes');
  var lembEditando = null;

  function desenharLembretes() {
    var caixa = $('lembLista');
    caixa.textContent = '';
    var itens = estado.lembretes;
    $('semLemb').classList.toggle('hidden', itens.length > 0);
    var feitos = itens.filter(function (l) { return l.feito; }).length;
    $('lembProgresso').textContent = itens.length ? feitos + ' de ' + itens.length + (feitos === 1 ? ' feito' : ' feitos') : '';
    itens.slice().sort(function (a, b) {
      if (!!a.feito !== !!b.feito) return a.feito ? 1 : -1;
      return (a.data || '9999').localeCompare(b.data || '9999');
    }).forEach(function (l) {
      var linha = criar('div', 'lemb-item' + (l.feito ? ' feito' : ''));
      var rotulo = criar('label', 'lemb-check');
      var cb = criar('input', '');
      cb.type = 'checkbox';
      cb.checked = !!l.feito;
      cb.addEventListener('change', function () { l.feito = cb.checked; salvar(); desenhar(); });
      var txt = criar('span', 'lemb-texto', l.texto);
      rotulo.appendChild(cb); rotulo.appendChild(txt);
      linha.appendChild(rotulo);
      if (l.data) linha.appendChild(criar('span', 'muted', 'Prazo: ' + App.data(l.data)));
      var acoes = criar('div', 'custo-acoes');
      var ed = criar('button', 'btn link', 'Editar');
      ed.type = 'button';
      ed.setAttribute('aria-label', 'Editar lembrete: ' + l.texto);
      ed.addEventListener('click', function () { abrirLembrete(l); });
      var rem = criar('button', 'btn link', 'Remover');
      rem.type = 'button';
      rem.setAttribute('aria-label', 'Remover lembrete: ' + l.texto);
      rem.addEventListener('click', function () {
        if (!confirm('Remover o lembrete "' + l.texto + '"?')) return;
        estado.lembretes = estado.lembretes.filter(function (x) { return x.id !== l.id; });
        salvar(); desenhar();
      });
      acoes.appendChild(ed); acoes.appendChild(rem);
      linha.appendChild(acoes);
      caixa.appendChild(linha);
    });
  }

  function novoId() { return Date.now() + '-' + Math.random().toString(36).slice(2, 7); }

  function abrirLembrete(l) {
    lembEditando = l || null;
    $('lembTitulo').textContent = l ? 'Editar lembrete' : 'Adicionar lembrete';
    $('lEnviar').textContent = l ? 'Salvar alterações' : 'Adicionar';
    $('lTexto').value = l ? l.texto : '';
    $('lData').value = l ? (l.data || '') : '';
    dlgLemb.showModal();
    $('lTexto').focus();
  }
  $('novoLembrete').addEventListener('click', function () { abrirLembrete(null); });
  $('lCancelar').addEventListener('click', function () { dlgLemb.close(); });
  $('formLembrete').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var texto = $('lTexto').value.trim();
    if (!texto) return;
    if (lembEditando) { lembEditando.texto = texto; lembEditando.data = $('lData').value; }
    else estado.lembretes.push({ id: novoId(), texto: texto, data: $('lData').value, feito: false });
    salvar(); dlgLemb.close(); desenhar();
  });

  $('sugestoes').addEventListener('click', function () {
    var lista = $('sugLista');
    lista.textContent = '';
    var existentes = estado.lembretes.map(function (l) { return l.texto; });
    var algum = false;
    SUGESTOES.forEach(function (g) {
      var novos = g.itens.filter(function (t) { return existentes.indexOf(t) < 0; });
      if (!novos.length) return;
      algum = true;
      lista.appendChild(criar('strong', '', g.grupo));
      novos.forEach(function (t) {
        var r = criar('label', 'lemb-check');
        var cb = criar('input', '');
        cb.type = 'checkbox';
        cb.value = t;
        r.appendChild(cb); r.appendChild(criar('span', '', t));
        lista.appendChild(r);
      });
    });
    if (!algum) lista.appendChild(criar('p', 'muted', 'Você já incluiu todas as sugestões.'));
    dlgSug.showModal();
  });
  $('sCancelar').addEventListener('click', function () { dlgSug.close(); });
  $('formSugestoes').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var marcados = $('sugLista').querySelectorAll('input:checked');
    Array.prototype.forEach.call(marcados, function (cb) {
      estado.lembretes.push({ id: novoId(), texto: cb.value, data: '', feito: false });
    });
    salvar(); dlgSug.close(); desenhar();
  });

  function desenhar() {
    $('tituloDia').textContent = rotuloDia(diaAtual);
    $('removerDia').classList.toggle('hidden', estado.dias <= 1);
    desenharAbas();
    desenharLista();
    desenharTotais();
    desenharCustos();
    desenharLembretes();
  }

  $('removerDia').addEventListener('click', function () {
    var qtd = estado.atividades.filter(function (a) { return a.dia === diaAtual; }).length;
    var msg = 'Remover o Dia ' + diaAtual + (qtd ? ' e suas ' + qtd + ' atividade(s)?' : '?');
    if (!confirm(msg)) return;
    estado.atividades = estado.atividades
      .filter(function (a) { return a.dia !== diaAtual; })
      .map(function (a) { if (a.dia > diaAtual) a.dia -= 1; return a; });
    estado.dias -= 1;
    if (diaAtual > estado.dias) diaAtual = estado.dias;
    salvar(); desenhar();
  });

  $('form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var titulo = $('ativTitulo').value.trim();
    if (!titulo) return;
    estado.atividades.push({
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      dia: diaAtual,
      hora: $('hora').value,
      tipo: $('tipo').value,
      titulo: titulo,
      detalhe: $('detalhe').value.trim(),
      custo: App.num($('custo').value)
    });
    salvar();
    ['hora', 'ativTitulo', 'detalhe', 'custo'].forEach(function (i) { $(i).value = ''; });
    desenhar();
    $('ativTitulo').focus();
  });

  desenhar();
})();
