// Calculadora milhas x dinheiro.
// Regra: nada é presumido. Os campos vazios ficam em "—" e o usuário decide.
(function () {
  var ids = ['prog', 'din', 'mil', 'tax', 'cus', 'fonte', 'consulta'];
  var el = {};
  ids.forEach(function (i) { el[i] = document.getElementById(i); });
  function $(id) { return document.getElementById(id); }

  // Programa
  App.programas.forEach(function (p) {
    var o = document.createElement('option');
    o.textContent = p;
    el.prog.appendChild(o);
  });

  // Cálculo puro (separado da tela para facilitar testes).
  function calcular(v) {
    var milheiros = v.milhas / 1000;
    var milhasEmReais = milheiros * v.custo;
    var custoMilhas = milhasEmReais + v.taxas;
    return {
      milhasEmReais: milhasEmReais,
      custoMilhas: custoMilhas,
      economia: v.dinheiro - custoMilhas, // positivo = milhas compensam
      valorMilheiro: milheiros > 0 ? (v.dinheiro - v.taxas) / milheiros : 0
    };
  }
  window.calcularMilhas = calcular;

  function atualizar() {
    var v = {
      dinheiro: App.num(el.din.value),
      milhas: App.num(el.mil.value),
      taxas: App.num(el.tax.value),
      custo: App.num(el.cus.value)
    };
    var prontoCalc = v.dinheiro > 0 && v.milhas > 0 && v.custo > 0;

    $('rMilhas').textContent = v.milhas > 0 ? App.inteiro(v.milhas) : '—';
    $('rTaxas').textContent = el.tax.value.trim() ? App.brl(v.taxas) : '—';
    $('rDinheiro').textContent = v.dinheiro > 0 ? App.brl(v.dinheiro) : '—';
    $('rMilhasReais').textContent = v.milhas > 0 && v.custo > 0 ? App.brl((v.milhas / 1000) * v.custo) : '—';
    $('rConsulta').textContent = 'Preço consultado em: ' + (App.data(el.consulta.value) || '—');
    $('rFonte').textContent = 'Fonte: ' + (el.fonte.value.trim() || '—');
    $('cardMilhas').classList.remove('win');
    $('cardDinheiro').classList.remove('win');

    if (v.milhas > 0 && v.dinheiro > 0) {
      var mil = (v.dinheiro - v.taxas) / (v.milhas / 1000);
      $('rMilheiro').textContent = App.brl(mil);
    } else {
      $('rMilheiro').textContent = '—';
    }

    if (!prontoCalc) {
      $('rMilhasTotal').textContent = '—';
      $('rTitulo').textContent = 'Preencha preço, milhas e custo do milheiro';
      $('rNota').textContent = 'A decisão é sua. Confira o saldo e a validade antes de emitir.';
    } else {
      var r = calcular(v);
      $('rMilhasTotal').textContent = App.brl(r.custoMilhas);
      if (r.economia > 0) {
        $('rTitulo').textContent = 'Com milhas, você economiza ' + App.brl(r.economia);
        $('cardMilhas').classList.add('win');
      } else if (r.economia < 0) {
        $('rTitulo').textContent = 'Em dinheiro, você economiza ' + App.brl(-r.economia);
        $('cardDinheiro').classList.add('win');
      } else {
        $('rTitulo').textContent = 'Os dois cenários custam o mesmo';
      }
      $('rNota').textContent = 'Usando seu custo de ' + App.brl(v.custo) + ' por milheiro. A decisão é sua.';
    }

    // Aviso de saldo (só se você já registrou o saldo no Painel).
    var saldos = App.ler('saldos', {});
    var aviso = $('avisos');
    var s = saldos[el.prog.value];
    if (v.milhas > 0 && s && s.saldo && App.num(s.saldo) < v.milhas) {
      aviso.textContent = 'Seu saldo registrado em ' + el.prog.value + ' (' + App.inteiro(App.num(s.saldo)) + ') é menor que as milhas necessárias.';
      aviso.classList.remove('hidden');
    } else if (v.milhas > 0 && s && s.validade && s.validade < new Date().toISOString().slice(0, 10)) {
      aviso.textContent = 'A validade registrada para ' + el.prog.value + ' (' + App.data(s.validade) + ') já passou.';
      aviso.classList.remove('hidden');
    } else {
      aviso.classList.add('hidden');
    }

    var estado = {};
    ids.forEach(function (i) { estado[i] = el[i].value; });
    App.gravar('milhas_form', estado);
  }

  // Restaura os últimos valores usados.
  var guardado = App.ler('milhas_form', {});
  ids.forEach(function (i) { if (guardado[i] != null) el[i].value = guardado[i]; });
  if (!el.prog.value) el.prog.selectedIndex = 0;

  ids.forEach(function (i) {
    el[i].addEventListener('input', atualizar);
    el[i].addEventListener('change', atualizar);
  });
  $('limpar').addEventListener('click', function () {
    ids.forEach(function (i) { if (i !== 'prog') el[i].value = ''; });
    atualizar();
  });

  // ----- Comparações salvas -----
  var salvas = App.ler('milhas_salvas', []);

  function lerValores() {
    return {
      dinheiro: App.num(el.din.value),
      milhas: App.num(el.mil.value),
      taxas: App.num(el.tax.value),
      custo: App.num(el.cus.value)
    };
  }

  function mensagem(texto) {
    var m = $('salvoMsg');
    m.textContent = texto;
    m.classList.remove('hidden');
  }

  function criar(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function desenharSalvas() {
    var caixa = $('salvas');
    caixa.textContent = '';
    $('qtdSalvas').textContent = salvas.length
      ? salvas.length + (salvas.length === 1 ? ' comparação' : ' comparações')
      : 'Nenhuma ainda';

    var melhor = null;
    salvas.forEach(function (s) { if (!melhor || s.economia > melhor.economia) melhor = s; });

    salvas.slice().reverse().forEach(function (s, i) {
      var linha = criar('div', 'slot' + (i === 0 ? ' first' : ''));
      var corpo = criar('div', 'body');
      var topo = criar('div', '');
      topo.style.display = 'flex';
      topo.style.gap = '8px';
      topo.style.flexWrap = 'wrap';
      topo.style.alignItems = 'center';
      topo.appendChild(criar('strong', '', s.nome));
      if (salvas.length > 1 && s === melhor && s.economia > 0) topo.appendChild(criar('span', 'chip', 'Maior economia'));
      corpo.appendChild(topo);

      var res = s.economia > 0
        ? 'Milhas economizam ' + App.brl(s.economia)
        : s.economia < 0 ? 'Dinheiro economiza ' + App.brl(-s.economia) : 'Empate';
      corpo.appendChild(criar('span', '', res + ' · ' + App.brl(s.valorMilheiro) + ' por milheiro'));
      corpo.appendChild(criar('span', 'muted',
        s.prog + ' · ' + App.inteiro(s.milhas) + ' milhas + ' + App.brl(s.taxas) +
        ' (' + App.brl(s.custoMilhas) + ') x ' + App.brl(s.dinheiro) +
        ' · milheiro a ' + App.brl(s.custo)));
      var origem = [];
      if (s.fonte) origem.push('Fonte: ' + s.fonte);
      if (s.consulta) origem.push('consultado em ' + App.data(s.consulta));
      origem.push('salvo em ' + App.data(s.salvoEm));
      corpo.appendChild(criar('span', 'hint', origem.join(' · ')));

      var acoes = criar('div', '');
      acoes.style.display = 'flex';
      acoes.style.flexDirection = 'column';
      var carregar = criar('button', 'btn link', 'Abrir');
      carregar.type = 'button';
      carregar.setAttribute('aria-label', 'Abrir ' + s.nome + ' nos campos');
      carregar.addEventListener('click', function () {
        el.prog.value = s.prog;
        el.din.value = s.campos.din; el.mil.value = s.campos.mil; el.tax.value = s.campos.tax;
        el.cus.value = s.campos.cus; el.fonte.value = s.fonte || ''; el.consulta.value = s.consulta || '';
        $('nome').value = s.nome;
        atualizar();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      var rem = criar('button', 'btn link', 'Remover');
      rem.type = 'button';
      rem.setAttribute('aria-label', 'Remover ' + s.nome);
      rem.addEventListener('click', function () {
        if (!confirm('Remover a comparação "' + s.nome + '"?')) return;
        salvas = salvas.filter(function (x) { return x.id !== s.id; });
        App.gravar('milhas_salvas', salvas);
        desenharSalvas();
      });
      acoes.appendChild(carregar);
      acoes.appendChild(rem);

      linha.appendChild(corpo);
      linha.appendChild(acoes);
      caixa.appendChild(linha);
    });
  }

  $('salvar').addEventListener('click', function () {
    var v = lerValores();
    if (!(v.dinheiro > 0 && v.milhas > 0 && v.custo > 0)) {
      mensagem('Preencha preço, milhas e custo do milheiro para salvar.');
      return;
    }
    var r = calcular(v);
    var nome = $('nome').value.trim() || (el.prog.value + ' · ' + App.inteiro(v.milhas) + ' milhas');
    salvas.push({
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      nome: nome,
      prog: el.prog.value,
      dinheiro: v.dinheiro, milhas: v.milhas, taxas: v.taxas, custo: v.custo,
      custoMilhas: r.custoMilhas, economia: r.economia, valorMilheiro: r.valorMilheiro,
      fonte: el.fonte.value.trim(), consulta: el.consulta.value,
      salvoEm: new Date().toISOString().slice(0, 10),
      campos: { din: el.din.value, mil: el.mil.value, tax: el.tax.value, cus: el.cus.value }
    });
    App.gravar('milhas_salvas', salvas);
    mensagem('Comparação "' + nome + '" salva.');
    $('nome').value = '';
    desenharSalvas();
  });

  desenharSalvas();
  atualizar();
})();
