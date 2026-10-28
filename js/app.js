// Planejador de viagens — base compartilhada: tema, navegação e armazenamento local.
// Os dados ficam somente neste navegador (localStorage). Nada é enviado para fora.
(function () {
  var PREFIXO = 'viagens:';

  var App = {
    programas: ['Smiles (GOL)', 'LATAM Pass', 'Azul Fidelidade', 'TAP', 'Iberia', 'Livelo', 'Esfera'],
    ler: function (chave, padrao) {
      try {
        var v = localStorage.getItem(PREFIXO + chave);
        return v === null ? padrao : JSON.parse(v);
      } catch (e) { return padrao; }
    },
    gravar: function (chave, valor) {
      try { localStorage.setItem(PREFIXO + chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ }
    },
    // Converte texto em formato brasileiro ("2.400,50") para número.
    num: function (texto) {
      // Com vírgula: o ponto é milhar ("1.234,50"). Sem vírgula: "2.500" e "1.234.567" são milhar;
      // "2.5" e "0.5" são decimais (hábito de teclado).
      var s = String(texto == null ? '' : texto).trim();
      if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
      else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
      var n = parseFloat(s);
      return isFinite(n) ? n : 0;
    },
    brl: function (n) {
      return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },
    inteiro: function (n) {
      return Math.round(n).toLocaleString('pt-BR');
    },
    // "AAAA-MM-DD" -> "DD/MM/AAAA"
    data: function (iso) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
      return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
    },
    // Data de hoje (calendário local) em "AAAA-MM-DD".
    hojeISO: function () {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    // Dias inteiros de hoje até a data ISO (negativo se já passou).
    diasAte: function (iso) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
      var h = /^(\d{4})-(\d{2})-(\d{2})$/.exec(App.hojeISO());
      if (!m) return null;
      return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(+h[1], +h[2] - 1, +h[3])) / 86400000);
    },
    // Soma n dias a uma data ISO e devolve "AAAA-MM-DD".
    somarDias: function (iso, n) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
      if (!m) return '';
      var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n));
      return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
    },
    // Soma n meses a uma data ISO.
    somarMeses: function (iso, n) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
      if (!m) return '';
      var d = new Date(Date.UTC(+m[1], +m[2] - 1 + n, +m[3]));
      return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
    },
    // Garante todos os campos do roteiro (viagens antigas não os têm).
    normalizarRoteiro: function (e) {
      e = e || {};
      if (!(e.dias >= 1)) e.dias = 1;
      ['atividades', 'custos', 'lembretes', 'reservas', 'documentos', 'ideias'].forEach(function (k) { if (!Array.isArray(e[k])) e[k] = []; });
      if (!e.orcamento || typeof e.orcamento !== 'object') e.orcamento = { meta: 0, reserva: 0 };
      return e;
    },
    // Salva o roteiro aberto e mantém em dia a viagem salva correspondente.
    salvarRoteiro: function (estado) {
      App.gravar('roteiro', estado);
      var id = App.ler('viagem_aberta', null);
      if (!id) return;
      var lista = App.ler('viagens', []);
      lista.forEach(function (t) { if (t.id === id) t.roteiro = estado; });
      App.gravar('viagens', lista);
    },
    // Só aceita links http(s).
    linkSeguro: function (url) {
      try { var u = new URL(String(url || '').trim()); return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : ''; } catch (e) { return ''; }
    },
    // Soma n dias a uma data ISO e devolve "DD/MM".
    diaMes: function (iso, n) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
      if (!m) return '';
      var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n));
      return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0');
    }
  };
  window.App = App;

  // ----- Tema (claro / escuro / segue o sistema) -----
  var raiz = document.documentElement;
  var salvo = App.ler('tema', null);
  if (salvo === 'claro' || salvo === 'escuro') raiz.setAttribute('data-tema', salvo);

  function temaAtual() {
    var t = raiz.getAttribute('data-tema');
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
  }

  // ----- Navegação lateral -----
  var ICONES = {
    painel: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    roteiro: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    milhas: '<circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/>',
    reservas: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
    dicas: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    ajuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><path d="M12 17h.01"/>',
    voos: '<path d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2 3.5 7.5l6.7 3.7-3 3-2.7-.5L3 15l4 2 2 4 1.3-1.5-.5-2.7 3-3 3.7 6.7z"/>'
  };
  var PAGINAS = [
    ['index', 'index.html', 'Painel', 'painel'],
    ['roteiro', 'roteiro.html', 'Roteiro', 'roteiro'],
    ['voos', 'voos.html', 'Voos', 'voos'],
    ['milhas', 'milhas.html', 'Milhas x dinheiro', 'milhas'],
    ['dicas', 'dicas.html', 'Dicas', 'dicas'],
    ['como-usar', 'como-usar.html', 'Como usar o planejador', 'ajuda']
  ];

  function svg(caminho, tam) {
    return '<svg width="' + tam + '" height="' + tam + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + caminho + '</svg>';
  }

  function montarLateral() {
    var alvo = document.getElementById('lateral');
    if (!alvo) return;
    var atual = document.body.getAttribute('data-pagina');
    function montarLinks(lista) {
      return lista.map(function (p) {
        return '<a href="' + p[1] + '" title="' + p[2] + '"' + (p[0] === atual ? ' class="on" aria-current="page"' : '') + '>' + svg(ICONES[p[3]], 20) + '<span class="rot">' + p[2] + '</span></a>';
      }).join('');
    }
    // Dicas e Como usar ficam abaixo da linha separadora.
    var SECUNDARIAS = ['dicas', 'como-usar'];
    var links = montarLinks(PAGINAS.filter(function (p) { return SECUNDARIAS.indexOf(p[0]) < 0; }));
    var linksExtra = montarLinks(PAGINAS.filter(function (p) { return SECUNDARIAS.indexOf(p[0]) >= 0; }));
    alvo.innerHTML =
      '<div class="brand"><span class="mark">' +
      svg('<path d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2 3.5 7.5l6.7 3.7-3 3-2.7-.5L3 15l4 2 2 4 1.3-1.5-.5-2.7 3-3 3.7 6.7z"/>', 20) +
      '</span><span class="nome">Planejador de viagens</span>' +
      '<button type="button" class="recolher" id="recolherMenu" aria-label="Recolher menu" aria-expanded="true" title="Recolher menu">&laquo;</button></div>' +
      '<nav class="nav" aria-label="Principal">' + links + '</nav>' +
      '<div class="theme-box">' +
      '<nav class="nav" aria-label="Ajuda">' + linksExtra + '</nav>' +
      '<div class="theme" role="group" aria-label="Tema">' +
      '<button type="button" data-tema="claro">Claro</button>' +
      '<button type="button" data-tema="escuro">Escuro</button></div>' +
      '<button type="button" class="tema-mini" id="temaMini" aria-label="Alternar tema claro e escuro" title="Alternar tema">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>', 20) + '</button></div>';

    // Recolher / expandir o menu lateral (lembra a escolha neste navegador).
    var app = alvo.parentNode;
    var bt = document.getElementById('recolherMenu');
    function aplicarMenu(rec) {
      if (app && app.classList) app.classList.toggle('recolhido', rec);
      bt.innerHTML = rec ? '&raquo;' : '&laquo;';
      bt.setAttribute('aria-expanded', rec ? 'false' : 'true');
      var t = rec ? 'Expandir menu' : 'Recolher menu';
      bt.setAttribute('aria-label', t); bt.title = t;
    }
    aplicarMenu(App.ler('menu_recolhido', false) === true);
    bt.addEventListener('click', function () {
      var rec = !(app.classList.contains('recolhido'));
      App.gravar('menu_recolhido', rec);
      aplicarMenu(rec);
    });
    document.getElementById('temaMini').addEventListener('click', function () {
      var novo = temaAtual() === 'escuro' ? 'claro' : 'escuro';
      raiz.setAttribute('data-tema', novo);
      App.gravar('tema', novo);
      marcar();
    });

    var botoes = alvo.querySelectorAll('.theme button');
    function marcar() {
      var t = temaAtual();
      botoes.forEach(function (b) {
        var on = b.getAttribute('data-tema') === t;
        b.className = on ? 'on' : '';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    botoes.forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-tema');
        raiz.setAttribute('data-tema', t);
        App.gravar('tema', t);
        marcar();
      });
    });
    marcar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarLateral);
  else montarLateral();
})();
