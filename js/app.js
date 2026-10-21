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
      var s = String(texto == null ? '' : texto).trim().replace(/\./g, '').replace(',', '.');
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
    voos: '<path d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2 3.5 7.5l6.7 3.7-3 3-2.7-.5L3 15l4 2 2 4 1.3-1.5-.5-2.7 3-3 3.7 6.7z"/>'
  };
  var PAGINAS = [
    ['index', 'index.html', 'Painel', 'painel'],
    ['roteiro', 'roteiro.html', 'Roteiro', 'roteiro'],
    ['reservas', 'reservas.html', 'Reservas e documentos', 'reservas'],
    ['voos', 'voos.html', 'Voos', 'voos'],
    ['milhas', 'milhas.html', 'Milhas x dinheiro', 'milhas']
  ];

  function svg(caminho, tam) {
    return '<svg width="' + tam + '" height="' + tam + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + caminho + '</svg>';
  }

  function montarLateral() {
    var alvo = document.getElementById('lateral');
    if (!alvo) return;
    var atual = document.body.getAttribute('data-pagina');
    var links = PAGINAS.map(function (p) {
      return '<a href="' + p[1] + '"' + (p[0] === atual ? ' class="on" aria-current="page"' : '') + '>' + svg(ICONES[p[3]], 20) + p[2] + '</a>';
    }).join('');
    alvo.innerHTML =
      '<div class="brand"><span class="mark">' +
      svg('<path d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2 3.5 7.5l6.7 3.7-3 3-2.7-.5L3 15l4 2 2 4 1.3-1.5-.5-2.7 3-3 3.7 6.7z"/>', 20) +
      '</span>Planejador de viagens</div>' +
      '<nav class="nav" aria-label="Principal">' + links + '</nav>' +
      '<div class="theme" role="group" aria-label="Tema">' +
      '<button type="button" data-tema="claro">Claro</button>' +
      '<button type="button" data-tema="escuro">Escuro</button></div>';

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
