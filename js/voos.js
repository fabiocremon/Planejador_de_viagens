// Voos: buscas salvas, atalho para o Google Flights e histórico de preços.
// Os preços são digitados por você, com a fonte e a data.
// Nada é consultado automaticamente por esta página.
(function () {
  var buscas = App.ler('voos', []);
  function $(id) { return document.getElementById(id); }
  function salvar() { App.gravar('voos', buscas); }
  function hoje() { return new Date().toISOString().slice(0, 10); }

  function criar(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  // Lista de datas ISO entre de e ate (inclusive).
  function dias(de, ate) {
    var lista = [];
    var a = Date.parse(de + 'T00:00:00Z'), z = Date.parse(ate + 'T00:00:00Z');
    for (var t = a; t <= z; t += 86400000) lista.push(new Date(t).toISOString().slice(0, 10));
    return lista;
  }

  function urlGoogleFlights(b, dia) {
    var q = 'Flights to ' + b.destino + ' from ' + b.origem + ' on ' + dia + ' one way';
    return 'https://www.google.com/travel/flights?q=' + encodeURIComponent(q) + '&curr=BRL&hl=pt-BR';
  }

  // ----- Gráfico único: uma linha por trecho (menor preço de cada dia de consulta) -----
  var ocultosTrecho = {}; // idBusca -> true quando escondido
  function nomeTrecho(b) { return b.origem + ' - ' + b.destino; }

  function desenharGraficoGeral() {
    var comPreco = buscas.filter(function (b) { return b.registros.length; });
    $('semGrafico').classList.toggle('hidden', comPreco.length > 0);
    if (!comPreco.length) {
      ['legendaVoos', 'graficoVoos', 'avisoVoos'].forEach(function (id) { $(id).textContent = ''; });
      $('avisoVoos').classList.add('hidden');
      return;
    }

    // Colorir pela posição da busca (cor fixa por busca); a paleta tem 8 cores.
    var visiveis = comPreco.slice(0, 8);
    var repetido = {};
    visiveis.forEach(function (b) { repetido[nomeTrecho(b)] = (repetido[nomeTrecho(b)] || 0) + 1; });

    var datas = {};
    var series = [];
    visiveis.forEach(function (b) {
      var indice = buscas.indexOf(b);
      var nome = nomeTrecho(b);
      if (repetido[nome] > 1) nome += ' (' + App.data(b.de).slice(0, 5) + (b.de !== b.ate ? '–' + App.data(b.ate).slice(0, 5) : '') + ')';
      // último preço registrado de cada dia de voo em cada dia de consulta
      var ultimo = {};
      b.registros.forEach(function (r) { ultimo[r.em + '|' + r.voo + '|' + (r.cia || '')] = r; });
      var menorPorEm = {};
      Object.keys(ultimo).forEach(function (k) {
        var r = ultimo[k];
        datas[r.em] = true;
        if (!menorPorEm[r.em] || r.preco < menorPorEm[r.em].preco) menorPorEm[r.em] = r;
      });
      var pts = Object.keys(menorPorEm).sort().map(function (em) {
        var r = menorPorEm[em];
        return { data: em, v: r.preco, nota: 'voo ' + App.data(r.voo).slice(0, 5) + (r.cia ? ', ' + r.cia : '') };
      });
      b._serie = { id: b.id, nome: nome, cor: 'var(--s' + ((indice % 8) + 1) + ')', pts: pts };
    });

    // Legenda (liga/desliga cada trecho)
    var leg = $('legendaVoos');
    leg.textContent = '';
    visiveis.forEach(function (b) {
      var bt = criar('button', '');
      bt.type = 'button';
      bt.setAttribute('aria-pressed', ocultosTrecho[b.id] ? 'false' : 'true');
      var sw = criar('i', '');
      sw.style.background = b._serie.cor;
      bt.appendChild(sw);
      bt.appendChild(document.createTextNode(b._serie.nome));
      bt.addEventListener('click', function () { ocultosTrecho[b.id] = !ocultosTrecho[b.id]; desenharGraficoGeral(); });
      leg.appendChild(bt);
    });

    var caixa = $('graficoVoos');
    var ativas = visiveis.filter(function (b) { return !ocultosTrecho[b.id]; }).map(function (b) { return b._serie; });
    if (!ativas.length) {
      caixa.textContent = '';
      caixa.appendChild(criar('p', 'muted', 'Todos os trechos estão ocultos. Clique em um para mostrar.'));
    } else {
      Grafico.linhas(caixa, {
        series: ativas,
        datas: Object.keys(datas).sort(),
        tituloX: 'Dia da consulta',
        aria: 'Evolução do menor preço por trecho, por dia de consulta. O histórico de cada busca traz os mesmos valores.',
        margemDireita: 110,
        tituloDica: function (iso) { return 'Consulta de ' + App.data(iso); }
      });
    }
    var aviso = $('avisoVoos');
    var extra = comPreco.length - visiveis.length;
    aviso.textContent = extra > 0 ? 'O gráfico mostra as 8 primeiras buscas com preço. Há mais ' + extra + ' não exibida(s).' : '';
    aviso.classList.toggle('hidden', extra <= 0);
  }

  var COMPANHIAS = ['LATAM', 'GOL', 'Azul', 'Avianca', 'Sky Airline', 'TAP', 'Iberia', 'Copa', 'American', 'Air France', 'KLM', 'Outra'];
  var consultaEm = null, consultaFonte = 'Google Flights'; // valem para todos os preços registrados na janela

  function cartao(b) {
    var cart = criar('section', 'card');
    cart.setAttribute('aria-label', b.origem + ' para ' + b.destino);

    var topo = criar('div', 'row first');
    topo.style.paddingTop = '0';
    topo.appendChild(criar('h2', '', b.origem + ' → ' + b.destino));
    topo.appendChild(criar('span', 'muted', 'Só ida · ' + App.data(b.de) + (b.de !== b.ate ? ' a ' + App.data(b.ate) : '')));
    cart.appendChild(topo);

    // Atalhos: um só botão para o Google Flights (abre no primeiro dia; o calendário do Google mostra os demais).
    var lista = dias(b.de, b.ate);
    var atalhos = criar('div', '');
    atalhos.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 12px';
    var gf = criar('a', 'btn sec', 'Abrir no Google Flights');
    gf.href = urlGoogleFlights(b, lista[0]);
    gf.target = '_blank';
    gf.rel = 'noopener noreferrer';
    gf.title = 'Abre a busca no primeiro dia (' + App.data(lista[0]) + '). Use o calendário do Google para ver os outros dias.';
    atalhos.appendChild(gf);
    // Atalho para ver as rotas e companhias que operam o trecho (não mostra o preço do dia).
    var fc = criar('a', 'btn rota');
    fc.insertAdjacentHTML('afterbegin', '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/></svg>');
    fc.appendChild(document.createTextNode('Consulta rotas'));
    fc.title = 'Ver rotas e companhias do trecho no Flight Connections';
    fc.setAttribute('aria-label', 'Consulta rotas de ' + b.origem + ' para ' + b.destino + ' no Flight Connections');
    fc.href = 'https://www.flightconnections.com/flights-from-' + b.origem.toLowerCase() + '-to-' + b.destino.toLowerCase();
    fc.target = '_blank';
    fc.rel = 'noopener noreferrer';
    atalhos.appendChild(fc);
    cart.appendChild(atalhos);

    // Dados gerais da consulta (valem para todos os preços digitados abaixo)
    if (!consultaEm) consultaEm = hoje();
    var geral = criar('div', '');
    geral.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin-bottom:8px';
    var gEm = criar('div', 'field'); gEm.style.maxWidth = '180px';
    var lEm = criar('label', '', 'Dia da consulta'); lEm.htmlFor = 'consulta-em';
    var iEm = criar('input', ''); iEm.id = 'consulta-em'; iEm.type = 'date'; iEm.value = consultaEm;
    iEm.addEventListener('change', function () { if (iEm.value) consultaEm = iEm.value; });
    gEm.appendChild(lEm); gEm.appendChild(iEm);
    var gFo = criar('div', 'field'); gFo.style.cssText = 'flex:1 1 180px;max-width:280px';
    var lFo = criar('label', '', 'Fonte'); lFo.htmlFor = 'consulta-fonte';
    var iFo = criar('input', ''); iFo.id = 'consulta-fonte'; iFo.value = consultaFonte; iFo.autocomplete = 'off';
    iFo.addEventListener('input', function () { consultaFonte = iFo.value; });
    gFo.appendChild(lFo); gFo.appendChild(iFo);
    geral.appendChild(gEm); geral.appendChild(gFo);
    cart.appendChild(geral);
    var dl = criar('datalist', ''); dl.id = 'lista-cias';
    COMPANHIAS.forEach(function (n) { var o = criar('option', ''); o.value = n; dl.appendChild(o); });
    cart.appendChild(dl);

    // Histórico por data de voo
    var hist = criar('div', '');
    lista.forEach(function (d) {
      var regs = b.registros.filter(function (r) { return r.voo === d; })
        .sort(function (x, y) { return x.em < y.em ? -1 : x.em > y.em ? 1 : 0; });
      var f = criar('form', 'reg-linha');
      f.appendChild(criar('strong', 'reg-dia', 'Voo em ' + App.data(d)));
      var iCia = criar('input', 'cia');
      iCia.setAttribute('list', 'lista-cias');
      iCia.placeholder = 'Companhia';
      iCia.autocomplete = 'off';
      iCia.setAttribute('aria-label', 'Companhia aérea do voo em ' + App.data(d));
      var iPreco = criar('input', 'preco');
      iPreco.inputMode = 'decimal';
      iPreco.placeholder = 'Preço (R$)';
      iPreco.setAttribute('aria-label', 'Preço do voo em ' + App.data(d));
      iPreco.required = true;
      var reg = criar('button', 'btn sec', 'Registrar');
      reg.type = 'submit';
      f.appendChild(iCia); f.appendChild(iPreco); f.appendChild(reg);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var preco = App.num(iPreco.value);
        if (!(preco > 0)) { iPreco.focus(); return; }
        b.registros.push({
          id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
          voo: d, preco: preco, cia: iCia.value.trim(), fonte: (consultaFonte || '').trim(), em: consultaEm || hoje()
        });
        salvar(); desenhar();
      });
      hist.appendChild(f);
      if (regs.length) {
        var menor = regs.reduce(function (m, r) { return r.preco < m.preco ? r : m; }, regs[0]);
        var rs = criar('div', 'muted', 'Menor registrado: ' + App.brl(menor.preco) + (menor.cia ? ' · ' + menor.cia : '') + ' (' + App.data(menor.em) + ')');
        rs.style.cssText = 'font-size:12px;padding:0 0 4px 2px';
        hist.appendChild(rs);
      }
      regs.slice().reverse().forEach(function (r) {
        var l = criar('div', 'row');
        l.style.cssText = 'padding:3px 0 3px 16px;border-top:0;font-size:13px';
        l.appendChild(criar('span', 'muted', App.data(r.em) + (r.cia ? ' · ' + r.cia : '') + ' · ' + (r.fonte || 'sem fonte')));
        var dir = criar('span', '', App.brl(r.preco));
        var x = criar('button', 'btn link', 'Remover');
        x.type = 'button';
        x.setAttribute('aria-label', 'Remover preço de ' + App.brl(r.preco) + ' em ' + App.data(r.em));
        x.addEventListener('click', function () {
          if (!confirm('Remover este preço registrado?')) return;
          b.registros = b.registros.filter(function (y) { return y.id !== r.id; });
          salvar(); desenhar();
        });
        var caixa = criar('span', '');
        caixa.style.cssText = 'display:flex;gap:8px;align-items:center';
        caixa.appendChild(dir); caixa.appendChild(x);
        l.appendChild(caixa);
        hist.appendChild(l);
      });
    });
    cart.appendChild(hist);

    return cart;
  }

  // ----- Últimas rotas: por dia de consulta, o preço de cada dia de voo -----
  function consultasDaRota(b) {
    // último preço registrado de cada dia de voo em cada dia de consulta
    var porEm = {};
    b.registros.forEach(function (r) {
      porEm[r.em] = porEm[r.em] || {};
      porEm[r.em][r.voo + '|' + (r.cia || '')] = r;
    });
    var ems = Object.keys(porEm).sort();
    return ems.map(function (em, i) {
      var linhas = Object.keys(porEm[em]).sort().map(function (chave) {
        var r = porEm[em][chave], voo = r.voo;
        // preço anterior do mesmo dia de voo, em consulta mais antiga
        var anterior = null;
        for (var j = i - 1; j >= 0 && !anterior; j--) anterior = porEm[ems[j]][chave] || null;
        return { voo: voo, cia: r.cia || '', preco: r.preco, fonte: r.fonte, dif: anterior ? r.preco - anterior.preco : null };
      });
      var fontes = {}; Object.keys(porEm[em]).forEach(function (k) { if (porEm[em][k].fonte) fontes[porEm[em][k].fonte] = 1; });
      return { em: em, fonte: Object.keys(fontes).join(', '), linhas: linhas };
    }).reverse(); // mais recente primeiro
  }

  function blocoConsulta(c) {
    var bloco = criar('div', 'consulta-dia');
    var menor = Math.min.apply(null, c.linhas.map(function (l) { return l.preco; }));
    var tit = criar('div', 'consulta-titulo');
    tit.appendChild(criar('strong', '', 'Consulta de ' + App.data(c.em)));
    tit.appendChild(criar('span', 'muted', c.linhas.length + (c.linhas.length === 1 ? ' preço' : ' preços') + (c.fonte ? ' · ' + c.fonte : '')));
    bloco.appendChild(tit);
    c.linhas.forEach(function (l) {
      var linha = criar('div', 'consulta-linha');
      linha.appendChild(criar('span', '', 'Voo em ' + App.data(l.voo) + (l.cia ? ' · ' + l.cia : '')));
      var dir = criar('span', '');
      dir.style.cssText = 'display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;justify-content:flex-end';
      if (l.dif) dir.appendChild(criar('span', 'hint', (l.dif < 0 ? 'caiu ' : 'subiu ') + App.brl(Math.abs(l.dif))));
      if (c.linhas.length > 1 && l.preco === menor) dir.appendChild(criar('span', 'chip', 'menor do dia'));
      dir.appendChild(criar('strong', '', App.brl(l.preco)));
      linha.appendChild(dir);
      bloco.appendChild(linha);
    });
    return bloco;
  }

  var rotasAbertas = {}; // idBusca -> lista de consultas aberta

  function desenharUltimas() {
    var caixa = $('ultimas');
    caixa.textContent = '';
    $('vazio').classList.toggle('hidden', buscas.length > 0);
    buscas.slice().reverse().forEach(function (b) {
      var rota = criar('div', 'rota-box');
      var topo = criar('div', 'rota-linha');
      topo.appendChild(criar('strong', '', nomeTrecho(b)));
      topo.appendChild(criar('span', 'muted', 'Só ida · ' + App.data(b.de) + (b.de !== b.ate ? ' a ' + App.data(b.ate) : '') + ' · 1 adulto'));
      var consultas = consultasDaRota(b);
      var lista = criar('div', 'rota-lista');
      if (consultas.length) {
        // Seta ao lado de "adulto": clique para ver os dias consultados.
        var seta = criar('button', 'rota-seta', 'Ver consultas (' + consultas.length + ')');
        seta.type = 'button';
        function aplicar() {
          var aberta = !!rotasAbertas[b.id];
          seta.setAttribute('aria-expanded', aberta ? 'true' : 'false');
          lista.classList.toggle('hidden', !aberta);
        }
        seta.addEventListener('click', function () { rotasAbertas[b.id] = !rotasAbertas[b.id]; aplicar(); });
        aplicar();
        topo.appendChild(seta);
        consultas.forEach(function (c) { lista.appendChild(blocoConsulta(c)); });
      } else {
        topo.appendChild(criar('span', 'muted', 'Sem preços registrados'));
        lista.classList.add('hidden');
      }
      var acoes = criar('div', 'viagem-acoes');
      acoes.style.marginLeft = 'auto';
      var refazer = criar('button', 'btn sec', 'Refazer busca');
      refazer.type = 'button';
      refazer.setAttribute('aria-label', 'Refazer a busca ' + nomeTrecho(b) + ' nas mesmas condições');
      refazer.addEventListener('click', function () { abrirBusca(b.id); });
      var rem = criar('button', 'btn link', 'Remover');
      rem.type = 'button';
      rem.setAttribute('aria-label', 'Remover a rota ' + nomeTrecho(b));
      rem.addEventListener('click', function () {
        if (!confirm('Remover a rota ' + nomeTrecho(b) + ' e todo o histórico de preços dela?')) return;
        buscas = buscas.filter(function (x) { return x.id !== b.id; });
        salvar(); desenhar();
      });
      acoes.appendChild(refazer);
      acoes.appendChild(rem);
      topo.appendChild(acoes);
      rota.appendChild(topo);
      rota.appendChild(lista);
      caixa.appendChild(rota);
    });
  }

  // ----- Janela "Refazer busca": mesmas datas, atalhos, registro de preço e histórico -----
  var dlgBusca = $('dlgBusca');
  var abertaBusca = null;
  function renderBusca() {
    var b = buscas.filter(function (x) { return x.id === abertaBusca; })[0];
    if (!b) { if (dlgBusca.open) dlgBusca.close(); return; }
    $('buscaTitulo').textContent = 'Refazer busca: ' + nomeTrecho(b);
    var c = $('conteudoBusca');
    c.textContent = '';
    c.appendChild(cartao(b));
  }
  function abrirBusca(id) {
    abertaBusca = id;
    renderBusca();
    if (!dlgBusca.open) dlgBusca.showModal();
  }
  dlgBusca.addEventListener('close', function () { abertaBusca = null; });
  $('buscaFechar').addEventListener('click', function () { dlgBusca.close(); });

  function desenhar() {
    desenharUltimas();
    desenharGraficoGeral();
    if (abertaBusca) renderBusca();
  }

  // ----- Novo trecho -----
  var dlgNovo = $('dlgNovo');
  $('novoTrecho').addEventListener('click', function () {
    $('erro').classList.add('hidden');
    dlgNovo.showModal();
    $('origem').focus();
  });
  $('novoCancelar').addEventListener('click', function () { dlgNovo.close(); });

  var avisou = '';
  $('form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var erro = $('erro');
    var o = $('origem').value.trim().toUpperCase(), d = $('destino').value.trim().toUpperCase();
    var de = $('de').value, ate = $('ate').value;
    erro.classList.add('hidden');
    if (!/^[A-Z]{3}$/.test(o) || !/^[A-Z]{3}$/.test(d)) { erro.textContent = 'Use códigos de aeroporto com 3 letras, como GRU e LIM.'; erro.classList.remove('hidden'); return; }
    if (ate < de) { erro.textContent = 'A data final não pode ser antes da inicial.'; erro.classList.remove('hidden'); return; }
    var qtd = dias(de, ate).length;
    if (qtd > 31 && avisou !== de + '|' + ate) { avisou = de + '|' + ate; erro.textContent = 'Período de ' + qtd + ' dias: serão ' + qtd + ' linhas para preencher. Clique em Salvar de novo para confirmar.'; erro.classList.remove('hidden'); return; }
    var nova = { id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), origem: o, destino: d, de: de, ate: ate, registros: [] };
    buscas.push(nova);
    salvar();
    ['origem', 'destino', 'de', 'ate'].forEach(function (i) { $(i).value = ''; });
    dlgNovo.close();
    desenhar();
    abrirBusca(nova.id);
  });

  desenhar();
})();
