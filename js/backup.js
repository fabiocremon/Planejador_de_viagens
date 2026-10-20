// Exportar e importar todos os dados do programa (viagens, cotações, saldos, voos...) em um arquivo .json.
// Serve para levar os dados entre computadores, já que ficam só no navegador (localStorage).
(function () {
  var PREFIXO = 'viagens:';
  var msg = document.getElementById('bkMsg');
  function aviso(t) { msg.textContent = t; }

  function hoje() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  document.getElementById('bkExportar').addEventListener('click', function () {
    var dados = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf(PREFIXO) === 0) dados[k.slice(PREFIXO.length)] = JSON.parse(localStorage.getItem(k));
      }
    } catch (e) { aviso('Não foi possível ler os dados deste navegador.'); return; }
    var n = Object.keys(dados).length;
    if (!n) { aviso('Ainda não há dados para exportar.'); return; }
    var pacote = { app: 'planejador-de-viagens', versao: 1, exportadoEm: new Date().toISOString(), dados: dados };
    var blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'planejador-viagens-' + hoje() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    aviso('Arquivo gerado: ' + a.download + '. Guarde-o em um lugar seguro: ele tem os dados das suas viagens.');
  });

  var arq = document.getElementById('bkArquivo');
  document.getElementById('bkImportar').addEventListener('click', function () { arq.value = ''; arq.click(); });
  arq.addEventListener('change', function () {
    var f = arq.files && arq.files[0];
    if (!f) return;
    var leitor = new FileReader();
    leitor.onerror = function () { aviso('Não foi possível ler o arquivo.'); };
    leitor.onload = function () {
      var pacote;
      try { pacote = JSON.parse(leitor.result); } catch (e) { pacote = null; }
      if (!pacote || pacote.app !== 'planejador-de-viagens' || !pacote.dados || typeof pacote.dados !== 'object') {
        aviso('Esse arquivo não é um backup do Planejador de viagens.');
        return;
      }
      var chaves = Object.keys(pacote.dados);
      if (!chaves.length) { aviso('O arquivo está vazio.'); return; }
      var quando = pacote.exportadoEm ? new Date(pacote.exportadoEm).toLocaleDateString('pt-BR') : 'data desconhecida';
      if (!confirm('Importar o backup de ' + quando + '?\n\nOs dados atuais deste navegador serão substituídos pelos do arquivo.')) return;
      try {
        // Remove os dados atuais do programa e grava os do arquivo.
        var antigas = [];
        for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf(PREFIXO) === 0) antigas.push(k); }
        antigas.forEach(function (k) { localStorage.removeItem(k); });
        chaves.forEach(function (c) { localStorage.setItem(PREFIXO + c, JSON.stringify(pacote.dados[c])); });
      } catch (e) { aviso('Não foi possível gravar os dados neste navegador.'); return; }
      location.reload();
    };
    leitor.readAsText(f);
  });
})();
