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
    var bres = criar('button', diaAtual === 0 ? 'on' : '', 'Resumo');
    bres.type = 'button';
    bres.setAttribute('aria-pressed', diaAtual === 0 ? 'true' : 'false');
    bres.addEventListener('click', function () { diaAtual = 0; desenhar(); });
    abas.appendChild(bres);
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

  var dlgCustos = $('dlgCustos');

  function celula(tag, texto, classe) { var c = criar(tag, classe || '', texto); return c; }

  // Janela com todo o custo da viagem: resumo, custos lançados por tipo e custos das atividades.
  function desenharDetalhe() {
    var caixa = $('custosDetalhe');
    caixa.textContent = '';
    var totalLanc = 0, pago = 0, previsto = 0, totalAtiv = 0;
    estado.custos.forEach(function (c) { totalLanc += c.valor; if (c.situacao === 'Pago') pago += c.valor; else previsto += c.valor; });
    var comCusto = estado.atividades.filter(function (a) { return a.custo > 0; });
    comCusto.forEach(function (a) { totalAtiv += a.custo; });

    // Resumo
    var resumo = criar('div', 'custos-resumo');
    [['Total da viagem', totalLanc + totalAtiv, true], ['Pago', pago], ['Previsto', previsto], ['Atividades do roteiro', totalAtiv]].forEach(function (x) {
      var k = criar('div', 'kpi' + (x[2] ? ' destaque' : ''));
      k.appendChild(criar('span', 'muted', x[0]));
      k.appendChild(criar('strong', '', App.brl(x[1])));
      resumo.appendChild(k);
    });
    caixa.appendChild(resumo);

    if (!estado.custos.length && !comCusto.length) {
      caixa.appendChild(criar('p', 'muted', 'Nenhum custo ainda. Use o + para lançar.'));
      return;
    }

    // Custos lançados, agrupados por tipo (maior subtotal primeiro)
    var grupos = {};
    estado.custos.forEach(function (c) { (grupos[c.tipo] = grupos[c.tipo] || []).push(c); });
    function soma(l) { return l.reduce(function (t, c) { return t + c.valor; }, 0); }
    Object.keys(grupos).sort(function (a, b) { return soma(grupos[b]) - soma(grupos[a]); }).forEach(function (tipo) {
      var itens = grupos[tipo].sort(function (a, b) { return (a.data || '9999').localeCompare(b.data || '9999'); });
      var sec = criar('section', 'custos-grupo');
      var cab = criar('div', 'custos-grupo-cab');
      cab.appendChild(criar('strong', '', tipo));
      cab.appendChild(criar('span', 'muted', itens.length + (itens.length === 1 ? ' lançamento' : ' lançamentos')));
      cab.appendChild(criar('strong', 'custos-sub', App.brl(soma(itens))));
      sec.appendChild(cab);
      var rolagem = criar('div', 'tabela-rolagem');
      var tab = criar('table', 'tab lanc');
      var th = criar('thead', ''); var trh = criar('tr', '');
      ['Origem', 'Data', 'Situação', 'Valor', ''].forEach(function (t) { var h = criar('th', '', t); if (!t) h.setAttribute('aria-label', 'Ações'); trh.appendChild(h); });
      th.appendChild(trh); tab.appendChild(th);
      var tb = criar('tbody', '');
      itens.forEach(function (c) {
        var tr = criar('tr', '');
        var o = criar('td', ''); o.style.whiteSpace = 'normal';
        o.appendChild(criar('strong', '', c.origem));
        if (c.obs) { var ob = criar('div', 'muted', c.obs); ob.style.fontSize = '12px'; o.appendChild(ob); }
        tr.appendChild(o);
        tr.appendChild(celula('td', c.data ? App.data(c.data) : '—'));
        var st = criar('td', ''); st.appendChild(criar('span', c.situacao === 'Pago' ? 'chip' : 'chip previsto', c.situacao)); tr.appendChild(st);
        tr.appendChild(celula('td', App.brl(c.valor)));
        var ac = criar('td', '');
        var ed = criar('button', 'btn link', 'Editar'); ed.type = 'button';
        ed.setAttribute('aria-label', 'Editar custo ' + c.origem);
        ed.addEventListener('click', function () { abrirCusto(c); });
        var rem = criar('button', 'btn link', 'Remover'); rem.type = 'button';
        rem.setAttribute('aria-label', 'Remover custo ' + c.origem);
        rem.addEventListener('click', function () {
          if (!confirm('Remover o custo "' + c.origem + '" (' + App.brl(c.valor) + ')?')) return;
          estado.custos = estado.custos.filter(function (x) { return x.id !== c.id; });
          salvar(); desenhar();
        });
        ac.appendChild(ed); ac.appendChild(rem); tr.appendChild(ac);
        tb.appendChild(tr);
      });
      tab.appendChild(tb); rolagem.appendChild(tab); sec.appendChild(rolagem);
      caixa.appendChild(sec);
    });

    // Custos informados nas atividades do roteiro (editados na lista de atividades)
    if (comCusto.length) {
      var sec = criar('section', 'custos-grupo');
      var cab = criar('div', 'custos-grupo-cab');
      cab.appendChild(criar('strong', '', 'Atividades do roteiro'));
      cab.appendChild(criar('span', 'muted', comCusto.length + (comCusto.length === 1 ? ' atividade' : ' atividades')));
      cab.appendChild(criar('strong', 'custos-sub', App.brl(totalAtiv)));
      sec.appendChild(cab);
      var rol = criar('div', 'tabela-rolagem');
      var tab = criar('table', 'tab ativ');
      var th = criar('thead', ''); var trh = criar('tr', '');
      ['Atividade', 'Dia', 'Tipo', 'Valor'].forEach(function (t) { trh.appendChild(criar('th', '', t)); });
      th.appendChild(trh); tab.appendChild(th);
      var tb = criar('tbody', '');
      comCusto.slice().sort(function (a, b) { return a.dia - b.dia || (a.hora || '').localeCompare(b.hora || ''); }).forEach(function (a) {
        var tr = criar('tr', '');
        var o = criar('td', ''); o.style.whiteSpace = 'normal'; o.appendChild(criar('strong', '', a.titulo)); tr.appendChild(o);
        tr.appendChild(celula('td', rotuloDia(a.dia)));
        tr.appendChild(celula('td', a.tipo));
        tr.appendChild(celula('td', App.brl(a.custo)));
        tb.appendChild(tr);
      });
      tab.appendChild(tb); rol.appendChild(tab); sec.appendChild(rol);
      caixa.appendChild(sec);
    }
  }

  function desenharCustos() {
    var vazio = !estado.custos.length && !estado.atividades.some(function (a) { return a.custo > 0; });
    $('semCustos').classList.toggle('hidden', !vazio);
    $('verCustos').disabled = vazio;
    if (dlgCustos.open) desenharDetalhe();
  }
  $('verCustos').addEventListener('click', function () { desenharDetalhe(); dlgCustos.showModal(); });
  $('custosFechar').addEventListener('click', function () { dlgCustos.close(); });

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

  // ----- Resumo da viagem (aba antes do Dia 1) -----
  var resumoCompleto = false;

  function secao(titulo, extra) {
    var sec = criar('section', 'card resumo-sec');
    var cab = criar('div', 'row first');
    cab.style.paddingTop = '0';
    cab.appendChild(criar('h2', '', titulo));
    if (extra) cab.appendChild(extra);
    sec.appendChild(cab);
    return sec;
  }

  function desenharResumo() {
    var r = $('resumo');
    r.textContent = '';

    // Dados da viagem + ações
    var acoes = criar('div', 'no-print');
    acoes.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
    var alt = criar('button', 'btn sec', resumoCompleto ? 'Mostrar resumido' : 'Ver todos os detalhes');
    alt.type = 'button';
    alt.addEventListener('click', function () { resumoCompleto = !resumoCompleto; desenharResumo(); });
    var imp = criar('button', 'btn', 'Imprimir / PDF');
    imp.type = 'button';
    imp.title = 'Na janela de impressão, escolha "Salvar como PDF"';
    imp.addEventListener('click', function () { window.print(); });
    acoes.appendChild(alt); acoes.appendChild(imp);
    var dados = secao('Dados da viagem', acoes);
    var grade = criar('div', 'resumo-dados');
    var itens = [
      ['Destino', viagem.destino || '—'],
      ['Saída de', viagem.saida || '—'],
      ['Ida', viagem.ida ? App.data(viagem.ida) : '—'],
      ['Volta', viagem.volta ? App.data(viagem.volta) : '—'],
      ['Pessoas', viagem.pessoas || '—'],
      ['Dias no roteiro', String(estado.dias)]
    ];
    itens.forEach(function (x) {
      var k = criar('div', 'kpi');
      k.appendChild(criar('span', 'muted', x[0]));
      k.appendChild(criar('strong', '', x[1]));
      grade.appendChild(k);
    });
    dados.appendChild(grade);
    r.appendChild(dados);

    // Dia a dia
    var dd = secao('Dia a dia');
    for (var n = 1; n <= estado.dias; n++) {
      (function (n) {
        var atvs = estado.atividades.filter(function (a) { return a.dia === n; })
          .sort(function (a, b) { return (a.hora || '99:99').localeCompare(b.hora || '99:99'); });
        var bloco = criar('div', 'resumo-dia');
        var cab = criar('div', 'resumo-dia-cab');
        var tit = criar('strong', '', rotuloDia(n));
        cab.appendChild(tit);
        var totalDia = atvs.reduce(function (t, a) { return t + (a.custo || 0); }, 0);
        cab.appendChild(criar('span', 'muted', !atvs.length ? 'sem atividades' : atvs.length + (atvs.length === 1 ? ' atividade' : ' atividades') + (totalDia > 0 ? ' · ' + App.brl(totalDia) : '')));
        if (!atvs.length) bloco.className += ' vazio';
        var ir = criar('button', 'btn link no-print', 'Abrir dia');
        ir.type = 'button';
        ir.setAttribute('aria-label', 'Abrir o dia ' + n);
        ir.addEventListener('click', function () { diaAtual = n; desenhar(); });
        cab.appendChild(ir);
        bloco.appendChild(cab);
        atvs.forEach(function (a) {
          var l = criar('div', 'resumo-atv');
          l.appendChild(criar('span', 'resumo-hora', a.hora || '—'));
          var corpo = criar('div', 'resumo-corpo');
          var linha = criar('div', '');
          linha.appendChild(criar('strong', '', a.titulo));
          linha.appendChild(criar('span', 'muted', ' · ' + a.tipo));
          corpo.appendChild(linha);
          if (resumoCompleto) {
            if (a.detalhe) corpo.appendChild(criar('div', 'muted', a.detalhe));
            if (a.custo > 0) corpo.appendChild(criar('div', 'muted', App.brl(a.custo)));
          }
          l.appendChild(corpo);
          bloco.appendChild(l);
        });
        dd.appendChild(bloco);
      })(n);
    }
    r.appendChild(dd);

    // Custos
    var cs = secao('Custos');
    var totalLanc = 0, pago = 0, previsto = 0, totalAtiv = 0;
    estado.custos.forEach(function (c) { totalLanc += c.valor; if (c.situacao === 'Pago') pago += c.valor; else previsto += c.valor; });
    estado.atividades.forEach(function (a) { totalAtiv += a.custo || 0; });
    var kg = criar('div', 'resumo-dados');
    [['Total da viagem', totalLanc + totalAtiv], ['Pago', pago], ['Previsto', previsto], ['Atividades do roteiro', totalAtiv]].forEach(function (x) {
      var k = criar('div', 'kpi');
      k.appendChild(criar('span', 'muted', x[0]));
      k.appendChild(criar('strong', '', App.brl(x[1])));
      kg.appendChild(k);
    });
    cs.appendChild(kg);
    var porTipo = {};
    estado.custos.forEach(function (c) { (porTipo[c.tipo] = porTipo[c.tipo] || []).push(c); });
    Object.keys(porTipo).sort(function (a, b) {
      return porTipo[b].reduce(function (t, c) { return t + c.valor; }, 0) - porTipo[a].reduce(function (t, c) { return t + c.valor; }, 0);
    }).forEach(function (tipo) {
      var lista = porTipo[tipo];
      var linha = criar('div', 'row');
      linha.appendChild(criar('span', '', tipo));
      linha.appendChild(criar('strong', '', App.brl(lista.reduce(function (t, c) { return t + c.valor; }, 0))));
      cs.appendChild(linha);
      if (resumoCompleto) lista.forEach(function (c) {
        var d = criar('div', 'row');
        d.style.cssText = 'padding:3px 0 3px 16px;border-top:0';
        d.appendChild(criar('span', 'muted', c.origem + ' · ' + c.situacao + (c.data ? ' · ' + App.data(c.data) : '') + (c.obs ? ' · ' + c.obs : '')));
        d.appendChild(criar('span', 'muted', App.brl(c.valor)));
        cs.appendChild(d);
      });
    });
    if (!estado.custos.length) cs.appendChild(criar('p', 'muted', 'Nenhum custo lançado além dos custos das atividades.'));
    r.appendChild(cs);

    // Lembretes
    var feitos = estado.lembretes.filter(function (l) { return l.feito; }).length;
    var ls = secao('Lembretes');
    ls.appendChild(criar('span', 'hint', estado.lembretes.length ? feitos + ' de ' + estado.lembretes.length + (feitos === 1 ? ' feito' : ' feitos') : ''));
    estado.lembretes.slice().sort(function (a, b) {
      if (!!a.feito !== !!b.feito) return a.feito ? 1 : -1;
      return (a.data || '9999').localeCompare(b.data || '9999');
    }).forEach(function (l) {
      var linha = criar('div', 'resumo-lemb' + (l.feito ? ' feito' : ''));
      linha.appendChild(criar('span', 'resumo-caixa', l.feito ? '☑' : '☐'));
      linha.appendChild(criar('span', '', l.texto + (l.data ? ' (prazo ' + App.data(l.data) + ')' : '')));
      ls.appendChild(linha);
    });
    if (!estado.lembretes.length) ls.appendChild(criar('p', 'muted', 'Nenhum lembrete.'));
    r.appendChild(ls);
  }

  function desenhar() {
    var resumo = diaAtual === 0;
    $('resumo').classList.toggle('hidden', !resumo);
    $('telaDia').classList.toggle('hidden', resumo);
    desenharAbas();
    if (resumo) { desenharResumo(); return; }
    $('tituloDia').textContent = rotuloDia(diaAtual);
    $('removerDia').classList.toggle('hidden', estado.dias <= 1);
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
