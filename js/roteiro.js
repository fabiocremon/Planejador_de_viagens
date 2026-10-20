// Roteiro dia a dia. Dados salvos só neste navegador.
(function () {
  var viagem = App.ler('viagem', {});
  var estado = App.ler('roteiro', { dias: 1, atividades: [] });
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
    var totalDia = 0, total = 0;
    estado.atividades.forEach(function (a) {
      total += a.custo || 0;
      if (a.dia === diaAtual) totalDia += a.custo || 0;
    });
    $('totalDia').textContent = App.brl(totalDia);
    $('totalViagem').textContent = App.brl(total);
  }

  function desenhar() {
    $('tituloDia').textContent = rotuloDia(diaAtual);
    $('removerDia').classList.toggle('hidden', estado.dias <= 1);
    desenharAbas();
    desenharLista();
    desenharTotais();
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
