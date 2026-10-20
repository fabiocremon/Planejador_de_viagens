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

  $('mkData').value = hoje();
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
    $('mkCampos').appendChild(g);
    inputsMk[op] = inp;
  });

  $('formMilheiro').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var data = $('mkData').value;
    var msg = $('mkMsg');
    if (!data) { msg.textContent = 'Informe a data da consulta.'; return; }
    var novos = {};
    var qtd = 0;
    OPS.forEach(function (op) {
      var v = App.num(inputsMk[op].value);
      if (inputsMk[op].value.trim() && v > 0) { novos[op] = v; qtd++; }
    });
    if (!qtd) { msg.textContent = 'Informe o valor de pelo menos uma operadora.'; return; }
    var reg = registros.filter(function (r) { return r.data === data; })[0];
    if (reg) {
      Object.keys(novos).forEach(function (op) { reg.valores[op] = novos[op]; });
      msg.textContent = 'Valores de ' + App.data(data) + ' atualizados.';
    } else {
      registros.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), data: data, valores: novos });
      msg.textContent = 'Valores de ' + App.data(data) + ' salvos.';
    }
    registros.sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; });
    gravarMilheiros();
    OPS.forEach(function (op) { inputsMk[op].value = ''; });
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

  function passo(bruto) {
    var exp = Math.pow(10, Math.floor(Math.log10(bruto)));
    var f = bruto / exp;
    var n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return n * exp;
  }
  function rotuloData(iso, comAno) {
    var d = App.data(iso);
    return comAno ? d.slice(0, 6) + d.slice(8) : d.slice(0, 5);
  }

  var NS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  function desenharGrafico() {
    var caixa = $('grafico');
    caixa.textContent = '';
    var vazio = $('mkVazio');
    vazio.classList.add('hidden');
    if (!registros.length) {
      vazio.textContent = 'Registre valores em pelo menos uma data para ver o gráfico.';
      vazio.classList.remove('hidden');
      return;
    }

    var series = [];
    OPS.forEach(function (op, i) {
      if (ocultas[op]) return;
      var pts = registros.filter(function (r) { return r.valores[op] > 0; }).map(function (r) {
        return { t: Date.parse(r.data + 'T00:00:00Z'), v: r.valores[op], data: r.data };
      });
      if (pts.length) series.push({ op: op, cor: 'var(--s' + (i + 1) + ')', pts: pts });
    });
    if (!series.length) {
      vazio.textContent = 'Todas as operadoras estão ocultas. Clique em uma para mostrar.';
      vazio.classList.remove('hidden');
      return;
    }

    var VW = 760, VH = 340, L = 56, R = 120, T = 16, B = 40;
    var W = VW - L - R, H = VH - T - B;
    var tmin = Infinity, tmax = -Infinity, vmin = Infinity, vmax = -Infinity;
    registros.forEach(function (r) {
      var t = Date.parse(r.data + 'T00:00:00Z');
      if (t < tmin) tmin = t;
      if (t > tmax) tmax = t;
    });
    series.forEach(function (s) {
      s.pts.forEach(function (p) { if (p.v < vmin) vmin = p.v; if (p.v > vmax) vmax = p.v; });
    });
    var intervalo = (vmax - vmin) || Math.max(vmax * 0.1, 1);
    var pad = intervalo * 0.12;
    var st = passo((intervalo + 2 * pad) / 4);
    var lo = Math.max(0, Math.floor((vmin - pad) / st) * st);
    var hi = Math.ceil((vmax + pad) / st) * st;
    if (hi === lo) hi = lo + st;

    function X(t) { return tmax === tmin ? L + W / 2 : L + (t - tmin) / (tmax - tmin) * W; }
    function Y(v) { return T + H - (v - lo) / (hi - lo) * H; }

    var svg = sv('svg', { viewBox: '0 0 ' + VW + ' ' + VH, role: 'img', 'aria-label': 'Evolução do valor do milheiro por operadora. A tabela abaixo traz os mesmos valores.' });

    // Grade e eixo Y
    for (var v = lo; v <= hi + st / 100; v += st) {
      var y = Y(v);
      svg.appendChild(sv('line', { x1: L, x2: L + W, y1: y, y2: y, stroke: 'var(--border)', 'stroke-width': 1 }));
      var tx = sv('text', { x: L - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--muted)' });
      tx.textContent = 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
      svg.appendChild(tx);
    }

    // Eixo X: as datas registradas (no máximo ~7 rótulos)
    var datas = registros.map(function (r) { return r.data; });
    var anos = {};
    datas.forEach(function (d) { anos[d.slice(0, 4)] = true; });
    var comAno = Object.keys(anos).length > 1;
    var salto = Math.ceil(datas.length / 7);
    datas.forEach(function (d, i) {
      if (i % salto !== 0 && i !== datas.length - 1) return;
      var x = X(Date.parse(d + 'T00:00:00Z'));
      var tx = sv('text', { x: x, y: VH - B + 20, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)' });
      tx.textContent = rotuloData(d, comAno);
      svg.appendChild(tx);
    });

    // Linhas e pontos
    series.forEach(function (s) {
      if (s.pts.length > 1) {
        var d = s.pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.v).toFixed(1); }).join(' ');
        svg.appendChild(sv('path', { d: d, fill: 'none', stroke: s.cor, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      }
      s.pts.forEach(function (p) {
        svg.appendChild(sv('circle', { cx: X(p.t), cy: Y(p.v), r: 4.5, fill: s.cor, stroke: 'var(--surface)', 'stroke-width': 2 }));
      });
    });

    // Rótulos diretos no fim de cada linha (com afastamento para não se sobrepor)
    var rotulos = series.map(function (s) {
      var u = s.pts[s.pts.length - 1];
      return { s: s, x: X(u.t), y: Y(u.v) };
    }).sort(function (a, b) { return a.y - b.y; });
    for (var i = 1; i < rotulos.length; i++) {
      if (rotulos[i].y - rotulos[i - 1].y < 14) rotulos[i].y = rotulos[i - 1].y + 14;
    }
    rotulos.forEach(function (r) {
      var tx = sv('text', { x: r.x + 12, y: r.y + 4, 'font-size': 11, 'font-weight': 600, fill: 'var(--fg)' });
      tx.textContent = r.s.op;
      svg.appendChild(tx);
    });

    // Interação: linha vertical + dica com os valores da data mais próxima
    var guia = sv('line', { y1: T, y2: T + H, stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '3 3', visibility: 'hidden' });
    svg.appendChild(guia);
    var cobertura = sv('rect', { x: L, y: T, width: W, height: H, fill: 'transparent' });
    svg.appendChild(cobertura);
    caixa.appendChild(svg);

    var dica = criar('div', 'dica hidden');
    caixa.appendChild(dica);

    function mostrar(ev) {
      var rect = svg.getBoundingClientRect();
      var vx = (ev.clientX - rect.left) / rect.width * VW;
      var melhor = registros[0], dist = Infinity;
      registros.forEach(function (r) {
        var dx = Math.abs(X(Date.parse(r.data + 'T00:00:00Z')) - vx);
        if (dx < dist) { dist = dx; melhor = r; }
      });
      var gx = X(Date.parse(melhor.data + 'T00:00:00Z'));
      guia.setAttribute('x1', gx);
      guia.setAttribute('x2', gx);
      guia.setAttribute('visibility', 'visible');
      dica.textContent = '';
      dica.appendChild(criar('strong', '', App.data(melhor.data)));
      series.forEach(function (s) {
        var val = melhor.valores[s.op];
        if (!(val > 0)) return;
        var linha = criar('div', '');
        var nome = criar('span', '', s.op);
        var sw = criar('i', '');
        sw.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;background:' + s.cor;
        nome.insertBefore(sw, nome.firstChild);
        linha.appendChild(nome);
        linha.appendChild(criar('strong', '', App.brl(val)));
        dica.appendChild(linha);
      });
      dica.classList.remove('hidden');
      var px = gx / VW * rect.width;
      var larg = dica.offsetWidth;
      dica.style.left = (px + 12 + larg > rect.width ? Math.max(0, px - larg - 12) : px + 12) + 'px';
      dica.style.top = '8px';
    }
    function esconder() { guia.setAttribute('visibility', 'hidden'); dica.classList.add('hidden'); }
    cobertura.addEventListener('pointermove', mostrar);
    cobertura.addEventListener('pointerleave', esconder);
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
  // Saldos de milhas e pontos
  // =====================================================================
  var saldos = App.ler('saldos', {});
  var alvo = $('saldos');
  OPS.forEach(function (nome) {
    var s = saldos[nome] || {};
    var linha = criar('div', 'row');
    linha.style.alignItems = 'center';

    var titulo = criar('strong', '', nome);
    titulo.style.flex = '1 1 160px';

    var gSaldo = criar('div', 'field');
    gSaldo.style.flex = '1 1 160px';
    var lSaldo = criar('label', 'muted', 'Saldo');
    var iSaldo = criar('input', '');
    iSaldo.inputMode = 'numeric';
    iSaldo.placeholder = 'milhas ou pontos';
    iSaldo.value = s.saldo || '';
    iSaldo.id = 'saldo-' + nome;
    lSaldo.htmlFor = iSaldo.id;
    gSaldo.appendChild(lSaldo);
    gSaldo.appendChild(iSaldo);

    var gVal = criar('div', 'field');
    gVal.style.flex = '1 1 160px';
    var lVal = criar('label', 'muted', 'Validade');
    var iVal = criar('input', '');
    iVal.type = 'date';
    iVal.value = s.validade || '';
    iVal.id = 'validade-' + nome;
    lVal.htmlFor = iVal.id;
    gVal.appendChild(lVal);
    gVal.appendChild(iVal);

    function salvarSaldo() {
      saldos[nome] = { saldo: iSaldo.value, validade: iVal.value };
      App.gravar('saldos', saldos);
    }
    iSaldo.addEventListener('input', salvarSaldo);
    iVal.addEventListener('input', salvarSaldo);

    linha.appendChild(titulo);
    linha.appendChild(gSaldo);
    linha.appendChild(gVal);
    alvo.appendChild(linha);
  });
})();
