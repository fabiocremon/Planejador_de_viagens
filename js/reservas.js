// Reservas e documentos da viagem aberta. Salvos junto com o roteiro (neste navegador).
(function () {
  var viagem = App.ler('viagem', {});
  var estado = App.normalizarRoteiro(App.ler('roteiro', null));
  function $(id) { return document.getElementById(id); }
  function criar(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function salvar() { App.salvarRoteiro(estado); }
  function novoId() { return Date.now() + '-' + Math.random().toString(36).slice(2, 7); }

  if (!viagem.destino) {
    $('semViagem').classList.remove('hidden');
    $('conteudo').classList.add('hidden');
    return;
  }
  $('titulo').textContent = 'Reservas e documentos: ' + viagem.destino;
  if (viagem.ida) {
    $('subtitulo').textContent = App.data(viagem.ida) + (viagem.volta ? ' a ' + App.data(viagem.volta) : '') +
      (viagem.pessoas ? ' · ' + viagem.pessoas + (viagem.pessoas === '1' ? ' pessoa' : ' pessoas') : '');
  }

  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

  // ----- Reservas -----
  // Texto e classe do alerta de cancelamento grátis.
  function alertaCancelamento(r) {
    if (!r.cancelamento) return null;
    var n = App.diasAte(r.cancelamento);
    var quando = App.data(r.cancelamento);
    if (n < 0) return { txt: 'Prazo de cancelamento grátis acabou em ' + quando, cls: 'muted' };
    if (n === 0) return { txt: 'Hoje é o último dia para cancelar de graça (' + quando + ')', cls: 't-alerta' };
    if (n <= 7) return { txt: 'Cancelamento grátis até ' + quando + ' (faltam ' + plural(n, 'dia', 'dias') + ')', cls: 't-alerta' };
    if (n <= 30) return { txt: 'Cancelamento grátis até ' + quando + ' (faltam ' + n + ' dias)', cls: 't-aviso' };
    return { txt: 'Cancelamento grátis até ' + quando + ' (faltam ' + n + ' dias)', cls: 'muted' };
  }

  var dlgR = $('dlgReserva'), editR = null;
  function abrirReserva(r) {
    editR = r || null;
    $('resTitulo').textContent = r ? 'Editar reserva' : 'Adicionar reserva';
    $('rEnviar').textContent = r ? 'Salvar alterações' : 'Adicionar';
    $('rTipo').value = r ? r.tipo : 'Hospedagem';
    $('rStatus').value = r ? r.status : 'Confirmada';
    $('rNome').value = r ? r.nome : '';
    $('rLoc').value = r ? (r.localizador || '') : '';
    $('rCancel').value = r ? (r.cancelamento || '') : '';
    $('rIni').value = r ? (r.inicio || '') : '';
    $('rFim').value = r ? (r.fim || '') : '';
    $('rLink').value = r ? (r.link || '') : '';
    $('rObs').value = r ? (r.obs || '') : '';
    $('rErro').classList.add('hidden');
    dlgR.showModal();
    $('rNome').focus();
  }
  $('novaReserva').addEventListener('click', function () { abrirReserva(null); });
  $('rCancelar').addEventListener('click', function () { dlgR.close(); });
  $('formReserva').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var erro = $('rErro');
    var nome = $('rNome').value.trim();
    var ini = $('rIni').value, fim = $('rFim').value;
    var linkTxt = $('rLink').value.trim();
    var link = App.linkSeguro(linkTxt);
    if (!nome) { erro.textContent = 'Informe o nome da reserva.'; erro.classList.remove('hidden'); return; }
    if (ini && fim && fim < ini) { erro.textContent = 'O fim não pode ser antes do início.'; erro.classList.remove('hidden'); return; }
    if (linkTxt && !link) { erro.textContent = 'O link precisa começar com http:// ou https://.'; erro.classList.remove('hidden'); return; }
    var dados = {
      tipo: $('rTipo').value, status: $('rStatus').value, nome: nome, localizador: $('rLoc').value.trim(),
      cancelamento: $('rCancel').value, inicio: ini, fim: fim, link: link, obs: $('rObs').value.trim()
    };
    if (editR) Object.keys(dados).forEach(function (k) { editR[k] = dados[k]; });
    else { dados.id = novoId(); estado.reservas.push(dados); }
    salvar(); dlgR.close(); desenhar();
  });

  function desenharReservas() {
    var caixa = $('reservas');
    caixa.textContent = '';
    var lista = estado.reservas.slice().sort(function (a, b) { return (a.inicio || '9999').localeCompare(b.inicio || '9999'); });
    $('semReservas').classList.toggle('hidden', lista.length > 0);
    var urgentes = lista.filter(function (r) { var a = alertaCancelamento(r); return a && a.cls === 't-alerta'; }).length;
    $('resResumo').textContent = lista.length ? plural(lista.length, 'reserva', 'reservas') + (urgentes ? ' · ' + plural(urgentes, 'prazo urgente', 'prazos urgentes') : '') : '';
    lista.forEach(function (r) {
      var it = criar('div', 'item-linha');
      var topo = criar('div', 'item-topo');
      topo.appendChild(criar('span', 'chip', r.tipo));
      topo.appendChild(criar('strong', '', r.nome));
      topo.appendChild(criar('span', r.status === 'Pendente' ? 't-aviso' : 'muted', r.status));
      it.appendChild(topo);
      var det = [];
      if (r.inicio) det.push(App.data(r.inicio) + (r.fim ? ' a ' + App.data(r.fim) : ''));
      if (r.localizador) det.push('Localizador: ' + r.localizador);
      if (det.length) it.appendChild(criar('span', 'muted', det.join(' · ')));
      var al = alertaCancelamento(r);
      if (al) it.appendChild(criar('span', al.cls, al.txt));
      if (r.obs) it.appendChild(criar('span', 'muted', r.obs));
      var acoes = criar('div', 'item-acoes');
      if (r.link) {
        var a = criar('a', 'btn link', 'Abrir link');
        a.href = r.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
        acoes.appendChild(a);
      }
      var ed = criar('button', 'btn link', 'Editar'); ed.type = 'button';
      ed.setAttribute('aria-label', 'Editar reserva ' + r.nome);
      ed.addEventListener('click', function () { abrirReserva(r); });
      var rem = criar('button', 'btn link', 'Remover'); rem.type = 'button';
      rem.setAttribute('aria-label', 'Remover reserva ' + r.nome);
      rem.addEventListener('click', function () {
        if (!confirm('Remover a reserva "' + r.nome + '"?')) return;
        estado.reservas = estado.reservas.filter(function (x) { return x.id !== r.id; });
        salvar(); desenhar();
      });
      acoes.appendChild(ed); acoes.appendChild(rem);
      it.appendChild(acoes);
      caixa.appendChild(it);
    });
  }

  // ----- Documentos -----
  // Compara a validade com a volta da viagem (ou a ida, se não houver volta).
  function alertaDocumento(d) {
    if (!d.validade) return null;
    var n = App.diasAte(d.validade);
    var ref = viagem.volta || viagem.ida || '';
    if (n < 0) return { txt: 'Vencido em ' + App.data(d.validade), cls: 't-alerta' };
    if (ref && d.validade < ref) return { txt: 'Vence antes da volta (' + App.data(d.validade) + ')', cls: 't-alerta' };
    if (ref && d.tipo === 'Passaporte' && d.validade < App.somarMeses(ref, 6)) {
      return { txt: 'Vence menos de 6 meses após a volta. Alguns destinos exigem validade mínima: confira a regra do destino.', cls: 't-aviso' };
    }
    return { txt: 'Válido até ' + App.data(d.validade) + (ref ? ' (cobre a viagem)' : ''), cls: 't-ok' };
  }

  var dlgD = $('dlgDoc'), editD = null;
  function abrirDoc(d) {
    editD = d || null;
    $('docTitulo').textContent = d ? 'Editar documento' : 'Adicionar documento';
    $('dEnviar').textContent = d ? 'Salvar alterações' : 'Adicionar';
    $('dPessoa').value = d ? d.pessoa : '';
    $('dTipo').value = d ? d.tipo : 'Passaporte';
    $('dVal').value = d ? (d.validade || '') : '';
    $('dObs').value = d ? (d.obs || '') : '';
    $('dErro').classList.add('hidden');
    dlgD.showModal();
    $('dPessoa').focus();
  }
  $('novoDoc').addEventListener('click', function () { abrirDoc(null); });
  $('dCancelar').addEventListener('click', function () { dlgD.close(); });
  $('formDoc').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var pessoa = $('dPessoa').value.trim();
    if (!pessoa) { $('dErro').textContent = 'Informe a pessoa.'; $('dErro').classList.remove('hidden'); return; }
    var dados = { pessoa: pessoa, tipo: $('dTipo').value, validade: $('dVal').value, obs: $('dObs').value.trim() };
    if (editD) Object.keys(dados).forEach(function (k) { editD[k] = dados[k]; });
    else { dados.id = novoId(); estado.documentos.push(dados); }
    salvar(); dlgD.close(); desenhar();
  });

  function desenharDocumentos() {
    var caixa = $('documentos');
    caixa.textContent = '';
    var lista = estado.documentos.slice().sort(function (a, b) {
      return a.pessoa.localeCompare(b.pessoa, 'pt-BR') || (a.validade || '9999').localeCompare(b.validade || '9999');
    });
    $('semDocs').classList.toggle('hidden', lista.length > 0);
    var problemas = lista.filter(function (d) { var a = alertaDocumento(d); return a && a.cls !== 't-ok'; }).length;
    $('docResumo').textContent = lista.length ? plural(lista.length, 'documento', 'documentos') + (problemas ? ' · ' + plural(problemas, 'atenção', 'atenções') : '') : '';
    lista.forEach(function (d) {
      var it = criar('div', 'item-linha');
      var topo = criar('div', 'item-topo');
      topo.appendChild(criar('span', 'chip', d.tipo));
      topo.appendChild(criar('strong', '', d.pessoa));
      it.appendChild(topo);
      var al = alertaDocumento(d);
      it.appendChild(al ? criar('span', al.cls, al.txt) : criar('span', 'muted', 'Sem validade informada'));
      if (d.obs) it.appendChild(criar('span', 'muted', d.obs));
      var acoes = criar('div', 'item-acoes');
      var ed = criar('button', 'btn link', 'Editar'); ed.type = 'button';
      ed.setAttribute('aria-label', 'Editar ' + d.tipo + ' de ' + d.pessoa);
      ed.addEventListener('click', function () { abrirDoc(d); });
      var rem = criar('button', 'btn link', 'Remover'); rem.type = 'button';
      rem.setAttribute('aria-label', 'Remover ' + d.tipo + ' de ' + d.pessoa);
      rem.addEventListener('click', function () {
        if (!confirm('Remover ' + d.tipo + ' de ' + d.pessoa + '?')) return;
        estado.documentos = estado.documentos.filter(function (x) { return x.id !== d.id; });
        salvar(); desenhar();
      });
      acoes.appendChild(ed); acoes.appendChild(rem);
      it.appendChild(acoes);
      caixa.appendChild(it);
    });
  }

  function desenhar() { desenharReservas(); desenharDocumentos(); }
  desenhar();
})();
