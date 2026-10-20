// Gráfico de linhas compartilhado (SVG puro, sem bibliotecas).
// Uso: Grafico.linhas(caixa, { series: [{ nome, cor, pts: [{ data: 'AAAA-MM-DD', v: número }] }],
//                              datas: ['AAAA-MM-DD', ...], aria: 'descrição', tituloDica: function (iso) {} })
// As cores (var(--s1)…) seguem a entidade, não a posição: quem chama define a cor de cada série.
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function criar(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function tempo(iso) { return Date.parse(iso + 'T00:00:00Z'); }
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

  function linhas(caixa, o) {
    caixa.textContent = '';
    var series = o.series.filter(function (s) { return s.pts.length; });
    var datas = o.datas;
    if (!series.length || !datas.length) return;

    var R = o.margemDireita || 120;
    var VW = 500 + R, L = 56, T = 12, B = o.tituloX ? 46 : 30, VH = 250 + (o.tituloX ? 16 : 0);
    var W = VW - L - R, H = VH - T - B;
    var tmin = tempo(datas[0]), tmax = tempo(datas[datas.length - 1]);
    var vmin = Infinity, vmax = -Infinity;
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

    var svg = sv('svg', { viewBox: '0 0 ' + VW + ' ' + VH, role: 'img', 'aria-label': o.aria || 'Gráfico de linhas. A tabela traz os mesmos valores.' });

    // Grade e eixo Y
    for (var v = lo; v <= hi + st / 100; v += st) {
      var y = Y(v);
      svg.appendChild(sv('line', { x1: L, x2: L + W, y1: y, y2: y, stroke: 'var(--border)', 'stroke-width': 1 }));
      var ty = sv('text', { x: L - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 13, fill: 'var(--muted)' });
      ty.textContent = 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
      svg.appendChild(ty);
    }

    // Eixo X: as datas registradas (no máximo ~7 rótulos)
    var anos = {};
    datas.forEach(function (d) { anos[d.slice(0, 4)] = true; });
    var comAno = Object.keys(anos).length > 1;
    var salto = Math.ceil(datas.length / 7);
    datas.forEach(function (d, i) {
      if (i % salto !== 0 && i !== datas.length - 1) return;
      var tx = sv('text', { x: X(tempo(d)), y: VH - B + 18, 'text-anchor': 'middle', 'font-size': 13, fill: 'var(--muted)' });
      tx.textContent = rotuloData(d, comAno);
      svg.appendChild(tx);
    });

    if (o.tituloX) {
      var tt = sv('text', { x: L + W / 2, y: VH - 6, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600, fill: 'var(--muted)' });
      tt.textContent = o.tituloX;
      svg.appendChild(tt);
    }

    // Linhas e pontos
    series.forEach(function (s) {
      if (s.pts.length > 1) {
        var d = s.pts.map(function (p, i) { return (i ? 'L' : 'M') + X(tempo(p.data)).toFixed(1) + ' ' + Y(p.v).toFixed(1); }).join(' ');
        svg.appendChild(sv('path', { d: d, fill: 'none', stroke: s.cor, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      }
      s.pts.forEach(function (p) {
        svg.appendChild(sv('circle', { cx: X(tempo(p.data)), cy: Y(p.v), r: 4, fill: s.cor, stroke: 'var(--surface)', 'stroke-width': 2 }));
      });
    });

    // Rótulos diretos no fim de cada linha (afastados para não se sobrepor)
    var rotulos = series.map(function (s) {
      var u = s.pts[s.pts.length - 1];
      return { s: s, x: X(tempo(u.data)), y: Y(u.v) };
    }).sort(function (a, b) { return a.y - b.y; });
    for (var i = 1; i < rotulos.length; i++) {
      if (rotulos[i].y - rotulos[i - 1].y < 16) rotulos[i].y = rotulos[i - 1].y + 16;
    }
    rotulos.forEach(function (r) {
      var tx = sv('text', { x: r.x + 10, y: r.y + 4, 'font-size': 13, 'font-weight': 600, fill: 'var(--fg)' });
      tx.textContent = r.s.nome;
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
      var melhor = datas[0], dist = Infinity;
      datas.forEach(function (d) {
        var dx = Math.abs(X(tempo(d)) - vx);
        if (dx < dist) { dist = dx; melhor = d; }
      });
      var gx = X(tempo(melhor));
      guia.setAttribute('x1', gx);
      guia.setAttribute('x2', gx);
      guia.setAttribute('visibility', 'visible');
      dica.textContent = '';
      dica.appendChild(criar('strong', '', o.tituloDica ? o.tituloDica(melhor) : App.data(melhor)));
      series.forEach(function (s) {
        var p = s.pts.filter(function (q) { return q.data === melhor; })[0];
        if (!p) return;
        var linha = criar('div', '');
        var nome = criar('span', '', s.nome + (p.nota ? ' (' + p.nota + ')' : ''));
        var sw = criar('i', '');
        sw.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;background:' + s.cor;
        nome.insertBefore(sw, nome.firstChild);
        linha.appendChild(nome);
        linha.appendChild(criar('strong', '', App.brl(p.v)));
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

  window.Grafico = { linhas: linhas };
})();
