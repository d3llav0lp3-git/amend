// ==UserScript==
// @name        Exportar Chat
// @version     1.0.0
// @author      d3llav0lp3
// @perm        armazenamento
// @description  Salva o histórico visível do canal em .txt ou .json
// @official    true
// ==/UserScript==
//
// Plugin de exemplo do Amend.
// Ele lê as mensagens que estão no DOM e monta um arquivo para baixar.

(function() {
    'use strict';

    var FORMATOS = { txt: 'Texto (.txt)', json: 'JSON (.json)', csv: 'CSV (.csv)' };
    var formatoAtual = 'txt';

    function coletar() {
        // Cada linha de mensagem do Discord tem um id chat-messages-<id>
        var itens = document.querySelectorAll('[id^="chat-messages-"] [class*="messageListItem"]');
        var saida = [];
        for (var i = 0; i < itens.length; i++) {
            var el = itens[i];
            var autorEl = el.querySelector('[class*="username"],[class*="usernameContent"]');
            var textoEl = el.querySelector('[id^="message-content"]');
            var horaEl = el.querySelector('time,[class*="timestamp"]');
            saida.push({
                autor: (autorEl ? autorEl.textContent : '').trim() || 'desconhecido',
                texto: (textoEl ? textoEl.textContent : '').trim(),
                hora: (horaEl ? (horaEl.getAttribute('datetime') || horaEl.textContent) : '').trim()
            });
        }
        return saida;
    }

    function nomeCanal() {
        // o título da aba é "(3) Servidor - Discord"
        var t = (document.title || 'chat').replace(/\s*-\s*Discord\s*$/, '').trim();
        return t.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_') || 'chat';
    }

    function formatar(msgs) {
        if (formatoAtual === 'json') return JSON.stringify(msgs, null, 2);
        if (formatoAtual === 'csv') {
            var linhas = ['autor;texto;hora'];
            for (var i = 0; i < msgs.length; i++) {
                linhas.push([msgs[i].autor, '"' + msgs[i].texto.replace(/"/g, '""') + '"', msgs[i].hora].join(';'));
            }
            return linhas.join('\n');
        }
        var out = [];
        for (var j = 0; j < msgs.length; j++) {
            out.push('[' + (msgs[j].hora || '?') + '] ' + msgs[j].autor + ': ' + msgs[j].texto);
        }
        return out.join('\n');
    }

    function baixar(conteudo, extensao) {
        var blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = nomeCanal() + '.' + extensao;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    }

    // Painel flutuante, no canto inferior direito
    var painel = document.createElement('div');
    painel.style.cssText = [
        'position:fixed','right:16px','bottom:16px','z-index:2147482900',
        'width:250px','background:#2b2d31','border-radius:8px',
        'box-shadow:0 8px 24px rgba(0,0,0,.5)','color:#dbdee1',
        "font-family:'gg sans','Noto Sans',Helvetica,Arial,sans-serif",
        'font-size:13px','overflow:hidden'
    ].join(';');
    painel.innerHTML =
        '<div style="padding:10px 12px;background:#313338;font-weight:600;display:flex;justify-content:space-between;align-items:center">' +
            '<span>Exportar Chat</span>' +
            '<button id="ap-x" style="background:none;border:none;color:#b5bac1;cursor:pointer;font-size:16px">&times;</button>' +
        '</div>' +
        '<div style="padding:10px 12px">' +
            '<select id="ap-fmt" style="width:100%;background:#1e1f22;color:#dbdee1;border:none;padding:6px;border-radius:4px;margin-bottom:8px">' +
                '<option value="txt">' + FORMATOS.txt + '</option>' +
                '<option value="json">' + FORMATOS.json + '</option>' +
                '<option value="csv">' + FORMATOS.csv + '</option>' +
            '</select>' +
            '<button id="ap-go" style="width:100%;background:#5865F2;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;font-weight:500">Baixar mensagens visíveis</button>' +
            '<div id="ap-info" style="margin-top:7px;font-size:11px;color:#949ba4"></div>' +
        '</div>';
    document.body.appendChild(painel);

    function atualizar() {
        var info = painel.querySelector('#ap-info');
        if (info) info.textContent = coletar().length + ' mensagem(ns) no canal';
    }

    painel.querySelector('#ap-x').onclick = function() { painel.remove(); };
    painel.querySelector('#ap-fmt').onchange = function() { formatoAtual = this.value; };
    painel.querySelector('#ap-go').onclick = function() {
        var msgs = coletar();
        if (!msgs.length) { alert('Nenhuma mensagem visível para exportar.'); return; }
        baixar(formatar(msgs), formatoAtual);
    };

    atualizar();
    setInterval(atualizar, 4000);

    console.log('[Exportar Chat] carregado');
})();
