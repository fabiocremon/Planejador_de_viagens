// Roteiro dia a dia. Dados salvos só neste navegador.
(function () {
  var viagem = App.ler('viagem', {});
  var estado = App.normalizarRoteiro(App.ler('roteiro', null));
  var diaAtual = 1;
  // Versões antigas mostravam as atividades ordenadas por horário. Agora a ordem é a da lista (pode ser mudada à mão).
  if (estado.ordem !== 2) {
    estado.atividades = estado.atividades.map(function (a, i) { return { a: a, i: i }; }).sort(function (x, y) {
      return (x.a.dia - y.a.dia) || (x.a.hora || '99:99').localeCompare(y.a.hora || '99:99') || (x.i - y.i);
    }).map(function (o) { return o.a; });
    estado.ordem = 2;
    App.salvarRoteiro(estado);
  }

  function $(id) { return document.getElementById(id); }
  // Salva o roteiro e mantém em dia a viagem salva que está aberta.
  function salvar() { App.salvarRoteiro(estado); }

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
    var bres2 = criar('button', diaAtual === -1 ? 'on' : '', 'Reservas e documentos');
    bres2.type = 'button';
    bres2.setAttribute('aria-pressed', diaAtual === -1 ? 'true' : 'false');
    bres2.addEventListener('click', function () { diaAtual = -1; desenhar(); });
    abas.appendChild(bres2);
  }

  function urlMapa(a) {
    var q = a.endereco || (a.titulo + (viagem.destino ? ' ' + viagem.destino : ''));
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  }

  // Coloca a atividade no dia certo, respeitando o horário (sem horário vai para o fim do dia).
  function inserirAtividade(nova) {
    var pos = -1;
    if (nova.hora) {
      for (var i = 0; i < estado.atividades.length; i++) {
        var a = estado.atividades[i];
        if (a.dia === nova.dia && (!a.hora || a.hora > nova.hora)) { pos = i; break; }
      }
    }
    if (pos < 0) {
      // fim do dia: depois da última atividade desse dia (ou no fim da lista)
      var ultimo = -1;
      estado.atividades.forEach(function (a, i) { if (a.dia <= nova.dia) ultimo = i; });
      pos = ultimo + 1;
    }
    estado.atividades.splice(pos, 0, nova);
  }

  function novoId() { return Date.now() + '-' + Math.random().toString(36).slice(2, 7); }

  function trocar(a, dir) {
    var doDia = estado.atividades.filter(function (x) { return x.dia === a.dia; });
    var i = doDia.indexOf(a), j = i + dir;
    if (j < 0 || j >= doDia.length) return;
    var ia = estado.atividades.indexOf(doDia[i]), ib = estado.atividades.indexOf(doDia[j]);
    estado.atividades[ia] = doDia[j]; estado.atividades[ib] = doDia[i];
    salvar(); desenhar();
  }

  function desenharLista() {
    var lista = $('lista');
    lista.textContent = '';
    var doDia = estado.atividades.filter(function (a) { return a.dia === diaAtual; });

    $('vazio').classList.toggle('hidden', doDia.length > 0);

    doDia.forEach(function (a, i) {
      var linha = criar('div', 'slot' + (i === 0 ? ' first' : ''));
      linha.appendChild(criar('div', 'time', a.hora || '—'));
      var corpo = criar('div', 'body');
      var topo = criar('div', '');
      topo.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center';
      topo.appendChild(criar('span', 'chip', a.tipo));
      topo.appendChild(criar('strong', '', a.titulo));
      corpo.appendChild(topo);
      if (a.endereco) corpo.appendChild(criar('span', 'muted', a.endereco));
      var extra = [];
      if (a.detalhe) extra.push(a.detalhe);
      if (a.custo > 0) extra.push(App.brl(a.custo));
      if (extra.length) corpo.appendChild(criar('span', 'muted', extra.join(' · ')));

      var acoes = criar('div', 'item-acoes');
      function botao(txt, rot, fn, desab) {
        var b = criar('button', 'btn link', txt);
        b.type = 'button';
        b.setAttribute('aria-label', rot + ': ' + a.titulo);
        if (desab) b.disabled = true;
        b.addEventListener('click', fn);
        acoes.appendChild(b);
      }
      botao('↑', 'Subir', function () { trocar(a, -1); }, i === 0);
      botao('↓', 'Descer', function () { trocar(a, 1); }, i === doDia.length - 1);
      var mapa = criar('a', 'btn link', 'Abrir no mapa');
      mapa.href = urlMapa(a); mapa.target = '_blank'; mapa.rel = 'noopener noreferrer';
      mapa.setAttribute('aria-label', 'Abrir no mapa: ' + a.titulo);
      acoes.appendChild(mapa);
      botao('Editar', 'Editar', function () { abrirAtiv(a); });
      botao('Duplicar', 'Duplicar', function () {
        var copia = {}; Object.keys(a).forEach(function (k) { copia[k] = a[k]; });
        copia.id = novoId(); copia.titulo = a.titulo + ' (cópia)';
        estado.atividades.splice(estado.atividades.indexOf(a) + 1, 0, copia);
        salvar(); desenhar();
      });
      botao('Remover', 'Remover', function () {
        if (!confirm('Remover "' + a.titulo + '" do roteiro?')) return;
        estado.atividades = estado.atividades.filter(function (x) { return x.id !== a.id; });
        salvar(); desenhar();
      });
      corpo.appendChild(acoes);
      linha.appendChild(corpo);
      lista.appendChild(linha);
    });
  }

  // ----- Editar atividade (inclui mover para outro dia) -----
  var dlgAtiv = $('dlgAtiv'), ativEditando = null;
  function abrirAtiv(a) {
    ativEditando = a;
    var sel = $('eDia');
    sel.textContent = '';
    for (var n = 1; n <= estado.dias; n++) { var o = criar('option', '', rotuloDia(n)); o.value = String(n); sel.appendChild(o); }
    sel.value = String(a.dia);
    $('eHora').value = a.hora || '';
    $('eTipo').value = a.tipo;
    $('eCusto').value = a.custo > 0 ? a.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
    $('eTitulo').value = a.titulo;
    $('eEndereco').value = a.endereco || '';
    $('eDetalhe').value = a.detalhe || '';
    dlgAtiv.showModal();
    $('eTitulo').focus();
  }
  $('eCancelar').addEventListener('click', function () { dlgAtiv.close(); });
  $('formAtiv').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var a = ativEditando;
    var titulo = $('eTitulo').value.trim();
    if (!a || !titulo) return;
    var novoDia = parseInt($('eDia').value, 10), novaHora = $('eHora').value;
    var reposicionar = novoDia !== a.dia || novaHora !== (a.hora || '');
    a.dia = novoDia; a.hora = novaHora; a.tipo = $('eTipo').value; a.titulo = titulo;
    a.endereco = $('eEndereco').value.trim(); a.detalhe = $('eDetalhe').value.trim(); a.custo = App.num($('eCusto').value);
    if (reposicionar) { estado.atividades = estado.atividades.filter(function (x) { return x !== a; }); inserirAtividade(a); }
    salvar(); dlgAtiv.close();
    if (novoDia !== diaAtual) diaAtual = novoDia;
    desenhar();
  });

  // ----- Dias: duplicar e mover -----
  $('duplicarDia').addEventListener('click', function () {
    var n = diaAtual;
    var doDia = estado.atividades.filter(function (a) { return a.dia === n; });
    estado.atividades.forEach(function (a) { if (a.dia > n) a.dia += 1; });
    var copias = doDia.map(function (a) { var c = {}; Object.keys(a).forEach(function (k) { c[k] = a[k]; }); c.id = novoId(); c.dia = n + 1; return c; });
    var ultimo = -1;
    estado.atividades.forEach(function (a, i) { if (a.dia <= n) ultimo = i; });
    Array.prototype.splice.apply(estado.atividades, [ultimo + 1, 0].concat(copias));
    estado.dias += 1; diaAtual = n + 1;
    salvar(); desenhar();
  });
  function moverDia(dir) {
    var n = diaAtual, m = n + dir;
    if (m < 1 || m > estado.dias) return;
    estado.atividades.forEach(function (a) { if (a.dia === n) a.dia = m; else if (a.dia === m) a.dia = n; });
    estado.atividades = estado.atividades.map(function (a, i) { return { a: a, i: i }; }).sort(function (x, y) { return (x.a.dia - y.a.dia) || (x.i - y.i); }).map(function (o) { return o.a; });
    diaAtual = m;
    salvar(); desenhar();
  }
  $('moverEsq').addEventListener('click', function () { moverDia(-1); });
  $('moverDir').addEventListener('click', function () { moverDia(1); });

  // ----- Ideias sem dia -----
  var dlgIdeia = $('dlgIdeia');
  function desenharIdeias() {
    var caixa = $('ideiasLista');
    caixa.textContent = '';
    $('semIdeias').classList.toggle('hidden', estado.ideias.length > 0);
    estado.ideias.forEach(function (it) {
      var item = criar('div', 'item-linha');
      var topo = criar('div', 'item-topo');
      topo.appendChild(criar('strong', '', it.texto));
      item.appendChild(topo);
      if (it.endereco) item.appendChild(criar('span', 'muted', it.endereco));
      var acoes = criar('div', 'item-acoes');
      var colocar = criar('button', 'btn sec', 'Colocar no ' + rotuloDia(diaAtual).split(' · ')[0]);
      colocar.type = 'button';
      colocar.setAttribute('aria-label', 'Colocar ' + it.texto + ' no dia ' + diaAtual);
      colocar.addEventListener('click', function () {
        inserirAtividade({ id: novoId(), dia: diaAtual, hora: '', tipo: 'Passeio', titulo: it.texto, endereco: it.endereco || '', detalhe: '', custo: 0 });
        estado.ideias = estado.ideias.filter(function (x) { return x.id !== it.id; });
        salvar(); desenhar();
      });
      var mapa = criar('a', 'btn link', 'Mapa');
      mapa.href = urlMapa({ endereco: it.endereco, titulo: it.texto }); mapa.target = '_blank'; mapa.rel = 'noopener noreferrer';
      mapa.setAttribute('aria-label', 'Abrir no mapa: ' + it.texto);
      var rem = criar('button', 'btn link', 'Remover'); rem.type = 'button';
      rem.setAttribute('aria-label', 'Remover ideia ' + it.texto);
      rem.addEventListener('click', function () {
        if (!confirm('Remover a ideia "' + it.texto + '"?')) return;
        estado.ideias = estado.ideias.filter(function (x) { return x.id !== it.id; });
        salvar(); desenhar();
      });
      acoes.appendChild(colocar); acoes.appendChild(mapa); acoes.appendChild(rem);
      item.appendChild(acoes);
      caixa.appendChild(item);
    });
  }
  $('novaIdeia').addEventListener('click', function () { $('iTexto').value = ''; $('iEndereco').value = ''; dlgIdeia.showModal(); $('iTexto').focus(); });
  $('iCancelar').addEventListener('click', function () { dlgIdeia.close(); });
  $('formIdeia').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var t = $('iTexto').value.trim();
    if (!t) return;
    estado.ideias.push({ id: novoId(), texto: t, endereco: $('iEndereco').value.trim() });
    salvar(); dlgIdeia.close(); desenhar();
  });

  function totais() {
    var t = { ativ: 0, lanc: 0, pago: 0, previsto: 0 };
    estado.atividades.forEach(function (a) { t.ativ += a.custo || 0; });
    estado.custos.forEach(function (c) { t.lanc += c.valor || 0; if (c.situacao === 'Pago') t.pago += c.valor || 0; else t.previsto += c.valor || 0; });
    t.total = t.ativ + t.lanc;
    return t;
  }

  // Orçamento: meta, barra de uso, saldo, por pessoa e por dia. Usado no card, no popup e no Resumo.
  function desenharOrcamento(caixa, completo) {
    caixa.textContent = '';
    var meta = estado.orcamento.meta || 0, reserva = estado.orcamento.reserva || 0;
    var t = totais();
    var cab = criar('div', 'row first');
    cab.style.paddingTop = '0';
    cab.appendChild(criar('strong', '', 'Meta de orçamento'));
    var bt = criar('button', 'btn link no-print', meta > 0 ? 'Alterar' : 'Definir meta');
    bt.type = 'button';
    bt.addEventListener('click', abrirOrcamento);
    var dir = criar('span', '');
    dir.style.cssText = 'display:flex;gap:6px;align-items:center';
    if (meta > 0) dir.appendChild(criar('strong', '', App.brl(meta)));
    dir.appendChild(bt);
    cab.appendChild(dir);
    caixa.appendChild(cab);
    if (!(meta > 0)) {
      caixa.appendChild(criar('span', 'hint', 'Defina um teto para acompanhar quanto já foi usado.'));
      return;
    }
    var pct = t.total / meta * 100;
    var barra = criar('div', 'barra');
    barra.setAttribute('role', 'progressbar');
    barra.setAttribute('aria-valuemin', '0'); barra.setAttribute('aria-valuemax', '100');
    barra.setAttribute('aria-valuenow', String(Math.min(100, Math.round(pct))));
    barra.setAttribute('aria-label', 'Uso da meta de orçamento');
    var i = criar('i', pct > 100 ? 'estourou' : (pct >= 90 ? 'quase' : ''));
    i.style.width = Math.min(100, pct) + '%';
    barra.appendChild(i);
    caixa.appendChild(barra);
    var saldo = meta - t.total;
    caixa.appendChild(criar('span', saldo < 0 ? 't-alerta' : (pct >= 90 ? 't-aviso' : 'muted'),
      Math.round(pct) + '% da meta · ' + (saldo >= 0 ? 'sobram ' + App.brl(saldo) : 'acima da meta em ' + App.brl(-saldo))));
    if (reserva > 0) {
      var comRes = t.total * (1 + reserva / 100);
      var r = criar('div', comRes > meta ? 't-aviso' : 'muted', 'Com reserva de ' + String(reserva).replace('.', ',') + '%: ' + App.brl(comRes) + (comRes > meta ? ' (passa da meta em ' + App.brl(comRes - meta) + ')' : ' (cabe na meta)'));
      r.style.cssText = 'font-size:13px;margin-bottom:8px';
      caixa.appendChild(r);
    }
    if (completo) {
      var pess = parseInt(viagem.pessoas, 10);
      var linhas = [];
      if (pess > 0) linhas.push(['Por pessoa (' + pess + ')', t.total / pess]);
      if (estado.dias > 0) linhas.push(['Por dia (' + estado.dias + ')', t.total / estado.dias]);
      linhas.forEach(function (l) {
        var row = criar('div', 'row');
        row.appendChild(criar('span', 'muted', l[0]));
        row.appendChild(criar('strong', '', App.brl(l[1])));
        caixa.appendChild(row);
      });
    }
  }

  var dlgOrc = $('dlgOrc');
  function abrirOrcamento() {
    var m = estado.orcamento.meta, r = estado.orcamento.reserva;
    $('oMeta').value = m > 0 ? m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
    $('oReserva').value = r > 0 ? String(r).replace('.', ',') : '';
    dlgOrc.showModal();
    $('oMeta').focus();
  }
  $('oCancelar').addEventListener('click', function () { dlgOrc.close(); });
  $('formOrc').addEventListener('submit', function (ev) {
    ev.preventDefault();
    estado.orcamento = { meta: App.num($('oMeta').value), reserva: App.num($('oReserva').value) };
    salvar(); dlgOrc.close(); desenhar();
  });

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
    desenharOrcamento($('orcBloco'), false);
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
    var orc = criar('div', '');
    orc.style.marginTop = '14px';
    caixa.appendChild(orc);
    desenharOrcamento(orc, true);

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
        if (c.moeda && c.moeda !== 'BRL') { var mo = criar('div', 'muted', fmt2(c.valorMoeda) + ' ' + c.moeda + ' × R$ ' + String(c.cotacao).replace('.', ',')); mo.style.fontSize = '12px'; o.appendChild(mo); }
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

  function moedaSel() { return $('cMoeda').value; }
  function atualizarMoeda() {
    var m = moedaSel(), estrangeira = m !== 'BRL';
    $('cCotBox').classList.toggle('hidden', !estrangeira);
    $('cMoedaNome').textContent = m;
    $('cValorRot').textContent = 'Valor (' + (estrangeira ? m : 'R$') + ')';
    var v = App.num($('cValor').value), cot = App.num($('cCot').value);
    var conv = $('cConv');
    if (estrangeira && v > 0 && cot > 0) { conv.textContent = 'Equivale a ' + App.brl(Math.round(v * cot * 100) / 100) + ' (cotação informada por você).'; conv.classList.remove('hidden'); }
    else conv.classList.add('hidden');
  }
  ['cMoeda', 'cValor', 'cCot'].forEach(function (id) { $(id).addEventListener('input', atualizarMoeda); });
  $('cMoeda').addEventListener('change', atualizarMoeda);

  function fmt2(n) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function abrirCusto(c) {
    custoEditando = c || null;
    $('custoTitulo').textContent = c ? 'Editar custo' : 'Adicionar custo';
    $('cEnviar').textContent = c ? 'Salvar alterações' : 'Adicionar';
    $('cOrigem').value = c ? c.origem : '';
    $('cTipo').value = c ? c.tipo : 'Passagem aérea';
    var est = c && c.moeda && c.moeda !== 'BRL';
    $('cMoeda').value = est ? c.moeda : 'BRL';
    $('cValor').value = c ? fmt2(est ? c.valorMoeda : c.valor) : '';
    $('cCot').value = est ? String(c.cotacao).replace('.', ',') : '';
    $('cData').value = c ? (c.data || '') : '';
    $('cSituacao').value = c ? c.situacao : 'Previsto';
    $('cObs').value = c ? (c.obs || '') : '';
    $('cErro').classList.add('hidden');
    atualizarMoeda();
    dlgCusto.showModal();
    $('cOrigem').focus();
  }
  $('novoCusto').addEventListener('click', function () { abrirCusto(null); });
  $('cCancelar').addEventListener('click', function () { dlgCusto.close(); });
  $('formCusto').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var origem = $('cOrigem').value.trim();
    var valorMoeda = App.num($('cValor').value);
    var moeda = moedaSel(), cot = moeda === 'BRL' ? 1 : App.num($('cCot').value);
    var erro = $('cErro');
    if (!origem) { erro.textContent = 'Informe de onde vem o custo.'; erro.classList.remove('hidden'); return; }
    if (!(valorMoeda > 0)) { erro.textContent = 'Informe um valor maior que zero.'; erro.classList.remove('hidden'); return; }
    if (!(cot > 0)) { erro.textContent = 'Informe a cotação usada para converter em R$.'; erro.classList.remove('hidden'); return; }
    var valor = Math.round(valorMoeda * cot * 100) / 100;
    var dados = { origem: origem, tipo: $('cTipo').value, valor: valor, moeda: moeda, valorMoeda: valorMoeda, cotacao: cot, data: $('cData').value, situacao: $('cSituacao').value, obs: $('cObs').value.trim() };
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

  // ----- Exportar para calendário (.ics) -----
  function icsTexto(t) {
    return String(t == null ? '' : t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  // Linhas do .ics têm no máximo 75 bytes; o excesso continua na linha seguinte, iniciada por espaço.
  function icsDobrar(linha) {
    var enc = new TextEncoder(), partes = [], atual = '', bytes = 0;
    Array.from(linha).forEach(function (ch) {
      var b = enc.encode(ch).length;
      if (bytes + b > 75) { partes.push(atual); atual = ' ' + ch; bytes = 1 + b; }
      else { atual += ch; bytes += b; }
    });
    partes.push(atual);
    return partes.join('\r\n');
  }
  function exportarIcs() {
    if (!viagem.ida) return;
    var agora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var ev = [];
    function evento(uid, linhas) { ev.push(['BEGIN:VEVENT', 'UID:' + uid + '@planejador-viagens', 'DTSTAMP:' + agora].concat(linhas, ['END:VEVENT'])); }
    estado.atividades.forEach(function (a) {
      var data = App.somarDias(viagem.ida, a.dia - 1).replace(/-/g, '');
      var linhas = ['SUMMARY:' + icsTexto(a.titulo)];
      if (a.hora) { linhas.push('DTSTART:' + data + 'T' + a.hora.replace(':', '') + '00', 'DURATION:PT1H'); }
      else linhas.push('DTSTART;VALUE=DATE:' + data);
      if (a.endereco) linhas.push('LOCATION:' + icsTexto(a.endereco));
      var desc = [a.tipo, a.detalhe].filter(Boolean).join(' · ');
      if (desc) linhas.push('DESCRIPTION:' + icsTexto(desc));
      evento('atv-' + a.id, linhas);
    });
    estado.reservas.forEach(function (r) {
      if (!r.cancelamento) return;
      evento('res-' + r.id, ['SUMMARY:' + icsTexto('Prazo para cancelar: ' + r.nome), 'DTSTART;VALUE=DATE:' + r.cancelamento.replace(/-/g, ''), 'DESCRIPTION:' + icsTexto(r.tipo + (r.localizador ? ' · Localizador ' + r.localizador : ''))]);
    });
    estado.lembretes.forEach(function (l) {
      if (!l.data || l.feito) return;
      evento('lem-' + l.id, ['SUMMARY:' + icsTexto('Lembrete: ' + l.texto), 'DTSTART;VALUE=DATE:' + l.data.replace(/-/g, '')]);
    });
    if (!ev.length) { alert('Não há atividades, prazos ou lembretes com data para exportar.'); return; }
    var linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Planejador de viagens//PT-BR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + icsTexto('Viagem: ' + (viagem.destino || ''))];
    ev.forEach(function (e) { linhas = linhas.concat(e); });
    linhas.push('END:VCALENDAR');
    var texto = linhas.map(icsDobrar).join('\r\n') + '\r\n';
    var blob = new Blob([texto], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    var slug = (viagem.destino || 'viagem').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    a.href = URL.createObjectURL(blob);
    a.download = 'roteiro-' + (slug || 'viagem') + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
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
    var cal = criar('button', 'btn sec', 'Adicionar ao calendário (.ics)');
    cal.type = 'button';
    cal.disabled = !viagem.ida;
    cal.title = viagem.ida ? 'Baixa um arquivo .ics para importar no Google Agenda, Outlook ou Apple Calendário. Os horários entram sem fuso: o calendário usa o fuso do seu aparelho.' : 'Informe a data de ida da viagem (Painel > Editar) para gerar o calendário.';
    cal.addEventListener('click', exportarIcs);
    acoes.appendChild(alt); acoes.appendChild(cal); acoes.appendChild(imp);
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
        var atvs = estado.atividades.filter(function (a) { return a.dia === n; });
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
            if (a.endereco) corpo.appendChild(criar('div', 'muted', a.endereco));
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

    // Ideias sem dia
    if (estado.ideias.length) {
      var is = secao('Ideias sem dia');
      estado.ideias.forEach(function (it) {
        var l = criar('div', 'resumo-lemb');
        l.appendChild(criar('span', 'resumo-caixa', '•'));
        l.appendChild(criar('span', '', it.texto + (resumoCompleto && it.endereco ? ' · ' + it.endereco : '')));
        is.appendChild(l);
      });
      r.appendChild(is);
    }

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
        d.appendChild(criar('span', 'muted', c.origem + ' · ' + c.situacao + (c.data ? ' · ' + App.data(c.data) : '') + (c.moeda && c.moeda !== 'BRL' ? ' · ' + fmt2(c.valorMoeda) + ' ' + c.moeda + ' × ' + String(c.cotacao).replace('.', ',') : '') + (c.obs ? ' · ' + c.obs : '')));
        d.appendChild(criar('span', 'muted', App.brl(c.valor)));
        cs.appendChild(d);
      });
    });
    if (!estado.custos.length) cs.appendChild(criar('p', 'muted', 'Nenhum custo lançado além dos custos das atividades.'));
    r.appendChild(cs);

    var os = secao('Orçamento');
    var ob2 = criar('div', '');
    os.appendChild(ob2);
    r.appendChild(os);
    desenharOrcamento(ob2, true);

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
    var resumo = diaAtual === 0, reservas = diaAtual === -1;
    $('resumo').classList.toggle('hidden', !resumo);
    $('telaReservas').classList.toggle('hidden', !reservas);
    $('telaDia').classList.toggle('hidden', resumo || reservas);
    desenharAbas();
    if (resumo) { desenharResumo(); return; }
    if (reservas) { painelReservas.desenhar(); return; }
    $('tituloDia').textContent = rotuloDia(diaAtual);
    $('removerDia').classList.toggle('hidden', estado.dias <= 1);
    $('moverEsq').disabled = diaAtual <= 1;
    $('moverDir').disabled = diaAtual >= estado.dias;
    desenharLista();
    desenharIdeias();
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
    inserirAtividade({
      id: novoId(),
      dia: diaAtual,
      hora: $('hora').value,
      tipo: $('tipo').value,
      titulo: titulo,
      endereco: $('endereco').value.trim(),
      detalhe: $('detalhe').value.trim(),
      custo: App.num($('custo').value)
    });
    salvar();
    ['hora', 'ativTitulo', 'endereco', 'detalhe', 'custo'].forEach(function (i) { $(i).value = ''; });
    desenhar();
    $('ativTitulo').focus();
  });

  // Aba Reservas e documentos (mesmo estado do roteiro, para os salvamentos não se sobrescreverem).
  var painelReservas = window.iniciarReservas(estado, salvar);
  if (location.hash === '#reservas') diaAtual = -1;
  desenhar();
})();
