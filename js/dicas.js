// Guia de dicas: abas, cartões clicáveis por companhia. Texto sempre via textContent.
(function () {
  var D = window.DICAS;
  var abas = [
    ['smiles', 'Smiles'], ['latam', 'LATAM Pass'], ['azul', 'Azul'],
    ['passagens', 'Tipos de passagem'], ['pontos', 'Transferência de pontos'], ['geral', 'Dicas gerais']
  ];
  var cores = {};
  var paleta = ['--s1', '--s2', '--s3', '--s4', '--s5', '--s6', '--s7'];
  var regioes = ['África', 'América Central', 'América do Norte', 'América do Sul', 'Ásia', 'Europa', 'Oceania', 'Oriente Médio'];
  regioes.forEach(function (r, i) { cores[r] = paleta[i % paleta.length]; });

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function link(txt, url) {
    var a = el('a', null, txt);
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }
  function iniciais(n) {
    var p = n.replace(/[^A-Za-zÀ-ú ]/g, '').split(' ').filter(Boolean);
    return (p.length > 1 ? p[0][0] + p[1][0] : n.slice(0, 2)).toUpperCase();
  }
  function fontes(lista) {
    var p = el('p', 'muted dica-fonte');
    p.appendChild(document.createTextNode('Consultado em ' + D.consulta + '. Fonte: '));
    lista.forEach(function (f, i) {
      if (i) p.appendChild(document.createTextNode(' · '));
      p.appendChild(link(f[0], f[1]));
    });
    return p;
  }
  function cartao(c) {
    var a = link('', c[1]);
    a.className = 'dica-card';
    a.setAttribute('aria-label', c[0] + ' — abrir site oficial em nova aba');
    var m = el('span', 'dica-mono', iniciais(c[0]));
    m.style.setProperty('--cor', 'var(' + (cores[c[2]] || '--s1') + ')');
    var t = el('span', 'dica-txt');
    t.appendChild(el('strong', null, c[0]));
    t.appendChild(el('span', 'muted', c[2]));
    if (c[3]) t.appendChild(el('span', 'dica-obs', c[3]));
    a.appendChild(m); a.appendChild(t); a.appendChild(el('span', 'dica-seta', '↗'));
    return a;
  }
  function programa(chave) {
    var p = D.programas[chave], f = el('div', 'dica-aba');
    var topo = el('section', 'card');
    var h = el('div', 'row first');
    var esq = el('div');
    esq.appendChild(el('h2', null, p.nome));
    esq.appendChild(el('span', 'muted', p.cias.length + ' companhias'));
    h.appendChild(esq);
    var b = link('Site do programa ↗', p.site); b.className = 'btn link';
    h.appendChild(b);
    topo.appendChild(h);
    topo.appendChild(el('p', null, p.texto));
    topo.appendChild(el('p', 'hint', p.aviso));
    topo.appendChild(fontes(p.fontes));
    f.appendChild(topo);
    regioes.forEach(function (r) {
      var cs = p.cias.filter(function (c) { return c[2] === r; });
      if (!cs.length) return;
      var s = el('section', 'dica-grupo');
      s.appendChild(el('h3', null, r));
      var g = el('div', 'dica-grade');
      cs.forEach(function (c) { g.appendChild(cartao(c)); });
      s.appendChild(g); f.appendChild(s);
    });
    if (chave === 'smiles') {
      var n = el('p', 'hint', 'Viaje Fácil (reservar sem ter as milhas e quitar depois): taxa de R$ 249,90 por emissão, sem reembolso. Veja em Tipos de passagem.');
      f.appendChild(n);
    }
    return f;
  }
  function texto(titulo, itens, fonteLista) {
    var f = el('div', 'dica-aba'), c = el('section', 'card');
    c.appendChild(el('h2', null, titulo));
    itens.forEach(function (i) {
      var bloco = el('div', 'dica-item');
      bloco.appendChild(el('strong', null, i[0]));
      bloco.appendChild(el('p', null, i[1]));
      c.appendChild(bloco);
    });
    if (fonteLista) c.appendChild(fontes(fonteLista));
    f.appendChild(c);
    return f;
  }
  var conteudo = {
    smiles: function () { return programa('smiles'); },
    latam: function () { return programa('latam'); },
    azul: function () { return programa('azul'); },
    passagens: function () {
      var f = texto('Tipos de passagem com milhas', [
        ['Viaje Fácil (Smiles)', 'Permite reservar sem ter as milhas e quitar depois, como comprar "fiado". Taxa de R$ 249,90 por emissão (não reembolsável), cobrada à vista no cartão. As milhas precisam ser debitadas até 60 dias antes do primeiro voo, sem pagamento parcial e sem débito automático; se não, a emissão é cancelada. Voos entre 61 e 330 dias após a emissão. Até 2 emissões ativas, com até 9 passageiros cada. Bônus de 4.000 milhas (Clube Smiles/Diamante) ou 2.000 ao quitar. Sem código promocional; tarifa, datas e parceira não mudam após a emissão.'],
        ['Tabela fixa (LATAM Pass)', 'Vale para voos operados por companhias parceiras: o valor em milhas depende da cabine e das regiões, não da data. Emissão pela Central de Vendas, conforme disponibilidade liberada pela parceira. Quais outras companhias têm tabela fixa: não confirmado.']
      ], [['Smiles — Viaje Fácil', 'https://www.smiles.com.br/viaje-facil'], ['Passageiro de Primeira (28/05/2026)', 'https://passageirodeprimeira.com/?p=537070'], ['Cartões e Viagens', 'https://cartoeseviagens.com.br/latam-pass/companhias-parceiras-latam-pass']]);
      return f;
    },
    pontos: function () {
      var f = texto('Transferência de pontos', [
        ['Livelo e Esfera', 'Acumulam pontos de cartões e compras e podem ser transferidos para programas aéreos. A paridade e os bônus mudam por campanha: confira no site antes de transferir. Não presuma promoção.'],
        ['Antes de transferir', 'Veja se há assento-prêmio disponível e quanto de milhas a emissão pede. A transferência geralmente não tem volta. Compare o custo do milheiro com o preço em dinheiro na página Milhas x dinheiro.']
      ]);
      var c = f.firstChild, g = el('div', 'dica-grade');
      [['Livelo', 'https://www.livelo.com.br'], ['Esfera', 'https://www.esfera.com.vc'], ['Smiles', D.programas.smiles.site], ['LATAM Pass', D.programas.latam.site], ['Azul Fidelidade', D.programas.azul.site]].forEach(function (x) {
        g.appendChild(cartao([x[0], x[1], 'Programa']));
      });
      c.appendChild(g);
      return f;
    },
    geral: function () {
      return texto('Dicas gerais de viagem', [
        ['Passaporte e visto', 'Confira a validade do passaporte e se o destino exige visto ou autorização eletrônica. Exigências variam por país e mudam: consulte o site oficial do destino.'],
        ['Seguro-viagem', 'Em viagens internacionais, confirme se o destino exige seguro e qual cobertura mínima.'],
        ['Câmbio', 'Defina a moeda e a cotação usada no orçamento do Roteiro, e anote a data da cotação.'],
        ['Reservas e prazos', 'Registre prazos de cancelamento e pagamento na aba Reservas e documentos do Roteiro para aparecerem no Painel.']
      ]);
    }
  };

  var nav = document.getElementById('abas'), alvo = document.getElementById('painelDicas');
  function abrir(chave) {
    Array.prototype.forEach.call(nav.children, function (b) {
      var on = b.getAttribute('data-aba') === chave;
      b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    alvo.textContent = '';
    alvo.appendChild(conteudo[chave]());
    App.gravar('dicas_aba', chave);
  }
  abas.forEach(function (a) {
    var b = el('button', null, a[1]);
    b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('data-aba', a[0]);
    b.addEventListener('click', function () { abrir(a[0]); });
    nav.appendChild(b);
  });
  var salva = App.ler('dicas_aba', 'smiles');
  abrir(conteudo[salva] ? salva : 'smiles');
})();
