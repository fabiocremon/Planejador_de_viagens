// Voos: buscas salvas, atalho para o Google Flights e histórico de preços.
// Os preços são digitados por você (ou trazidos pelo Claude) com a fonte e a data.
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

  function pedidoClaude(b) {
    var datas = dias(b.de, b.ate).map(App.data).join(', ');
    return 'Consulte o menor preço só de ida de ' + b.origem + ' para ' + b.destino +
      ' nos dias ' + datas + ', para 1 adulto, em R$. Informe a fonte e a data da consulta.';
  }

  function copiar(texto, aviso) {
    function ok() { aviso.textContent = 'Pedido copiado. Cole no chat com o Claude.'; }
    function falha() { aviso.textContent = texto; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(ok, falha);
    else falha();
  }

  var ocultasVoos = {}; // por busca: { idBusca: { 'AAAA-MM-DD': true } }

  // Último preço de cada data de voo em cada data de consulta.
  function precosPorConsulta(b, vooDia) {
    var porEm = {};
    b.registros.forEach(function (r) {
      if (vooDia && r.voo !== vooDia) return;
      var chave = vooDia ? r.em : r.em + '|' + r.voo;
      porEm[chave] = r;
    });
    return porEm;
  }

  function blocoGrafico(b, lista) {
    var caixaTudo = criar('div', '');
    caixaTudo.style.margin = '4px 0 12px';
    caixaTudo.appendChild(criar('strong', '', 'Evolução do preço'));
    caixaTudo.appendChild(criar('div', 'muted', 'Eixo horizontal: data em que você consultou. Cada linha é um dia de voo.'));
    var ocultas = ocultasVoos[b.id] = ocultasVoos[b.id] || {};

    var datas = {};
    b.registros.forEach(function (r) { datas[r.em] = true; });
    var datasOrd = Object.keys(datas).sort();

    var series = [];
    var muitos = lista.length > 8; // a paleta tem 8 cores: acima disso, só o menor preço
    if (muitos) {
      var menor = {};
      var ultimos = precosPorConsulta(b, null);
      Object.keys(ultimos).forEach(function (k) {
        var r = ultimos[k];
        if (menor[r.em] == null || r.preco < menor[r.em]) menor[r.em] = r.preco;
      });
      series.push({ nome: 'Menor preço', cor: 'var(--s1)', pts: datasOrd.map(function (d) { return { data: d, v: menor[d] }; }) });
    } else {
      lista.forEach(function (dia, i) {
        if (ocultas[dia]) return;
        var ult = precosPorConsulta(b, dia);
        var pts = Object.keys(ult).sort().map(function (em) { return { data: em, v: ult[em].preco }; });
        if (pts.length) series.push({ nome: App.data(dia).slice(0, 5), cor: 'var(--s' + (i + 1) + ')', pts: pts });
      });
      // Legenda (liga/desliga cada dia de voo)
      var com = lista.filter(function (dia) { return b.registros.some(function (r) { return r.voo === dia; }); });
      if (com.length > 1) {
        var leg = criar('div', 'legenda');
        leg.setAttribute('role', 'group');
        leg.setAttribute('aria-label', 'Mostrar ou ocultar dias de voo');
        com.forEach(function (dia) {
          var i = lista.indexOf(dia);
          var bt = criar('button', '');
          bt.type = 'button';
          bt.setAttribute('aria-pressed', ocultas[dia] ? 'false' : 'true');
          var sw = criar('i', '');
          sw.style.background = 'var(--s' + (i + 1) + ')';
          bt.appendChild(sw);
          bt.appendChild(document.createTextNode('Voo ' + App.data(dia).slice(0, 5)));
          bt.addEventListener('click', function () { ocultas[dia] = !ocultas[dia]; desenhar(); });
          leg.appendChild(bt);
        });
        caixaTudo.appendChild(leg);
      }
    }

    var area = criar('div', 'grafico');
    if (series.length) {
      Grafico.linhas(area, {
        series: series,
        datas: datasOrd,
        aria: 'Evolução do preço do voo de ' + b.origem + ' para ' + b.destino + ' por data de consulta. O histórico abaixo traz os mesmos valores.',
        margemDireita: 70,
        tituloDica: function (iso) { return 'Consulta de ' + App.data(iso); }
      });
    } else {
      area.appendChild(criar('p', 'muted', 'Todos os dias estão ocultos. Clique em um para mostrar.'));
    }
    caixaTudo.appendChild(area);
    if (b.registros.length < 2) caixaTudo.appendChild(criar('p', 'hint', 'Registre o preço em outro dia para a linha aparecer.'));
    return caixaTudo;
  }

  function cartao(b) {
    var cart = criar('section', 'card');
    cart.setAttribute('aria-label', b.origem + ' para ' + b.destino);

    var topo = criar('div', 'row first');
    topo.style.paddingTop = '0';
    topo.appendChild(criar('h2', '', b.origem + ' → ' + b.destino));
    topo.appendChild(criar('span', 'muted', 'Só ida · ' + App.data(b.de) + (b.de !== b.ate ? ' a ' + App.data(b.ate) : '')));
    cart.appendChild(topo);

    // Atalhos
    var lista = dias(b.de, b.ate);
    var atalhos = criar('div', '');
    atalhos.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 12px';
    lista.forEach(function (d) {
      var a = criar('a', 'btn sec', 'Abrir ' + App.data(d).slice(0, 5));
      a.href = urlGoogleFlights(b, d);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      atalhos.appendChild(a);
    });
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
    var aviso = criar('span', 'hint hidden');
    aviso.setAttribute('role', 'status');
    aviso.style.wordBreak = 'break-word';
    var cp = criar('button', 'btn', 'Copiar pedido para o Claude');
    cp.type = 'button';
    cp.addEventListener('click', function () {
      aviso.classList.remove('hidden');
      copiar(pedidoClaude(b), aviso);
    });
    atalhos.appendChild(cp);
    cart.appendChild(atalhos);
    cart.appendChild(aviso);

    // Gráfico: evolução do preço ao longo das datas em que você consultou
    if (b.registros.length) cart.appendChild(blocoGrafico(b, lista));

    // Registrar preço
    var f = criar('form', '');
    f.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;align-items:end;margin:12px 0';
    var gData = criar('div', 'field');
    var lData = criar('label', '', 'Data do voo');
    var sData = criar('select', '');
    sData.id = 'voo-' + b.id;
    lData.htmlFor = sData.id;
    lista.forEach(function (d) { var o = criar('option', '', App.data(d)); o.value = d; sData.appendChild(o); });
    gData.appendChild(lData); gData.appendChild(sData);

    var gPreco = criar('div', 'field');
    var lPreco = criar('label', '', 'Preço (R$)');
    var iPreco = criar('input', '');
    iPreco.id = 'preco-' + b.id;
    iPreco.inputMode = 'decimal';
    iPreco.placeholder = 'ex.: 1.250,00';
    iPreco.required = true;
    lPreco.htmlFor = iPreco.id;
    gPreco.appendChild(lPreco); gPreco.appendChild(iPreco);

    var gFonte = criar('div', 'field');
    var lFonte = criar('label', '', 'Fonte');
    var iFonte = criar('input', '');
    iFonte.id = 'fonte-' + b.id;
    iFonte.value = 'Google Flights';
    lFonte.htmlFor = iFonte.id;
    gFonte.appendChild(lFonte); gFonte.appendChild(iFonte);

    var reg = criar('button', 'btn', 'Registrar preço');
    reg.type = 'submit';
    f.appendChild(gData); f.appendChild(gPreco); f.appendChild(gFonte); f.appendChild(reg);
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var preco = App.num(iPreco.value);
      if (!(preco > 0)) { iPreco.focus(); return; }
      b.registros.push({
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        voo: sData.value, preco: preco, fonte: iFonte.value.trim(), em: hoje()
      });
      salvar(); desenhar();
    });
    cart.appendChild(f);

    // Histórico por data de voo
    var hist = criar('div', '');
    lista.forEach(function (d) {
      var regs = b.registros.filter(function (r) { return r.voo === d; })
        .sort(function (x, y) { return x.em < y.em ? -1 : x.em > y.em ? 1 : 0; });
      var linha = criar('div', 'row');
      linha.appendChild(criar('strong', '', 'Voo em ' + App.data(d)));
      if (!regs.length) {
        linha.appendChild(criar('span', 'muted', 'Sem preços registrados'));
      } else {
        var ult = regs[regs.length - 1];
        var menor = regs.reduce(function (m, r) { return r.preco < m.preco ? r : m; }, regs[0]);
        var txt = 'Último: ' + App.brl(ult.preco) + ' (' + App.data(ult.em) + ')';
        if (regs.length > 1) {
          var dif = ult.preco - regs[regs.length - 2].preco;
          txt += dif === 0 ? ' · igual ao anterior' : (dif > 0 ? ' · subiu ' : ' · caiu ') + App.brl(Math.abs(dif));
        }
        txt += ' · menor: ' + App.brl(menor.preco) + ' (' + App.data(menor.em) + ')';
        linha.appendChild(criar('span', '', txt));
      }
      hist.appendChild(linha);
      regs.slice().reverse().forEach(function (r) {
        var l = criar('div', 'row');
        l.style.cssText = 'padding:6px 0 6px 16px;border-top:0';
        l.appendChild(criar('span', 'muted', App.data(r.em) + ' · ' + (r.fonte || 'sem fonte')));
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

    var rem = criar('button', 'btn link', 'Remover busca');
    rem.type = 'button';
    rem.style.marginTop = '8px';
    rem.addEventListener('click', function () {
      if (!confirm('Remover a busca ' + b.origem + ' → ' + b.destino + ' e todo o histórico dela?')) return;
      buscas = buscas.filter(function (x) { return x.id !== b.id; });
      salvar(); desenhar();
    });
    cart.appendChild(rem);
    return cart;
  }

  function desenhar() {
    var caixa = $('buscas');
    // Preserva o que o usuário está digitando ao redesenhar.
    caixa.textContent = '';
    $('vazio').classList.toggle('hidden', buscas.length > 0);
    buscas.forEach(function (b) { caixa.appendChild(cartao(b)); });
  }

  $('form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var erro = $('erro');
    var o = $('origem').value.trim().toUpperCase(), d = $('destino').value.trim().toUpperCase();
    var de = $('de').value, ate = $('ate').value;
    erro.classList.add('hidden');
    if (!/^[A-Z]{3}$/.test(o) || !/^[A-Z]{3}$/.test(d)) { erro.textContent = 'Use códigos de aeroporto com 3 letras, como GRU e LIM.'; erro.classList.remove('hidden'); return; }
    if (ate < de) { erro.textContent = 'A data final não pode ser antes da inicial.'; erro.classList.remove('hidden'); return; }
    if (dias(de, ate).length > 14) { erro.textContent = 'Use no máximo 14 dias por busca.'; erro.classList.remove('hidden'); return; }
    buscas.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), origem: o, destino: d, de: de, ate: ate, registros: [] });
    salvar();
    ['origem', 'destino', 'de', 'ate'].forEach(function (i) { $(i).value = ''; });
    desenhar();
  });

  desenhar();
})();
