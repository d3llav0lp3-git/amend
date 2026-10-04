// ==PluginSystem==
// @name        Sistema de Plugins do Amend
// @version     2.0.0
// @author      d3llav0lp3
// @description Runtime do sistema de plugins: painel, busca, ativar/desativar e instalar.
// @official    true
// ==/PluginSystem==
//
// Este arquivo e o "DLC" do sistema de plugins. O app baixa uma vez pelo
// GitHub; depois disso o painel abre sempre. Fica separado do app de
// proposito: assim o sistema de plugins pode ser atualizado sem lancar
// uma versao nova do Amend.

// =====================================================================
//  Plugins do Amend — aba escondida no canto superior esquerdo
//
//  Abre com Ctrl+Shift+P ou no botao discreto do canto.
//  Catalogo oficial vem do GitHub do autor; qualquer um pode instalar
//  o seu por URL/arquivo e ele aparece marcado como NAO OFICIAL.
// =====================================================================
(function() {

    // ------------------------------------------------------------ idioma
    //
    // O painel é um arquivo baixável, então não pode assumir português. O app
    // injeta o idioma do sistema (mesma fonte que a bandeja usa).
    var IDIOMA = (window.__AMEND_IDIOMA === 'en') ? 'en' : 'pt';

    var T = {
        pt: {
            plugins: 'Plugins',
            buscando: 'Buscando...',
            busca: 'Buscar plugins...',
            instalar: 'Instalar',
            instalado: 'Instalado',
            remover: 'Remover',
            voltar: 'Voltar p/ v',
            atualizar: 'Atualizar',
            desinstalar: 'Desinstalar sistema',
            versao: 'Sistema de plugins',
            add: 'Adicionar plugin',
            url: 'URL de um plugin (.js) — não oficial',
            instalados: 'Instalados',
            catalogo: 'Catálogo oficial',
            vazio_cat: 'Catálogo vazio ou indisponível offline.',
            vazio_inst: 'Nenhum plugin instalado. Baixe do catálogo oficial ou use o campo acima com a URL de um plugin.',
            ligar: 'Ligar', desligar: 'Desligar',
            att_p: 'Reverter para a versão anterior',
            ms_atualizado: 'Plugin atualizado.', ms_removido: 'Removido.',
            nada_encontrado: 'Nada encontrado para',
            desinstalar_titulo: 'Desinstalar o sistema de plugins?',
            desinstalar_txt: 'Os plugins já instalados continuam nos arquivos, mas o painel deixa de funcionar até você instalar de novo.',
            nada: 'Nada encontrado para',
            stats_inst: t('stats_inst'),
            stats_ativos: t('stats_ativos'),
            stats_cat: t('stats_cat'),
            oficial: 'oficial',
            nao_oficial: 'não oficial',
            atualização: 'ATUALIZAÇÃO',
            upd: 'Atualização',
            erro_plugin: 'Este plugin falhou ao carregar',
            instalar_titulo: 'Instalar plugin',
            quer_instalar: 'quer instalar. O que ele faz:',
            so_pagina: t('so_pagina'),
            pede_acesso: t('pede_acesso'),
            cancel: 'Cancelar',
            aviso: 'Atenção',
            perm_desconhecida: 'Permissão desconhecida',
            instalado_ok: 'Instalado: ',
            fora_catalogo: t('fora_catalogo'),
            revertido: t('revertido'),
            nao_oficial_aviso: 'Vem de fora do catálogo oficial.'
        },
        en: {
            plugins: 'Plugins',
            buscando: 'Loading...',
            busca: 'Search plugins...',
            instalar: 'Install',
            instalado: 'Installed',
            remover: 'Remove',
            voltar: 'Back to v',
            atualizar: 'Update',
            desinstalar: 'Uninstall system',
            versao: 'Plugin system',
            add: 'Add plugin',
            url: 'Plugin URL (.js) — unofficial',
            instalados: 'Installed',
            catalogo: 'Official catalog',
            vazio_cat: 'Catalog empty or unavailable offline.',
            vazio_inst: 'No plugins installed. Download from the official catalog or paste a plugin URL above.',
            ligar: 'Turn on', desligar: 'Turn off',
            att_p: 'Go back to the previous version',
            ms_atualizado: 'Plugin updated.', ms_removido: 'Removed.',
            nada_encontrado: 'Nothing found for',
            desinstalar_titulo: 'Uninstall the plugin system?',
            desinstalar_txt: 'Installed plugins stay in the files, but the panel stops working until you install it again.',
            nada: 'Nothing found for',
            stats_inst: 'installed',
            stats_ativos: 'active',
            stats_cat: 'in catalog',
            oficial: 'official',
            nao_oficial: 'unofficial',
            atualização: 'UPDATE',
            upd: 'Update',
            erro_plugin: 'This plugin failed to load',
            instalar_titulo: 'Install plugin',
            quer_instalar: 'wants to install. What it does:',
            so_pagina: 'This plugin only touches the Discord page.',
            pede_acesso: 'This plugin asks for access to:',
            cancel: 'Cancel',
            aviso: 'Warning',
            perm_desconhecida: 'Unknown permission',
            instalado_ok: 'Installed: ',
            fora_catalogo: 'Installed. It came from outside the official catalog.',
            revertido: 'Reverted.',
            nao_oficial_aviso: 'Comes from outside the official catalog.'
        }
    };

    function t(chave) { return (T[IDIOMA] || T.pt)[chave] || chave; }
    window.__amendIdioma = t;
    if (window.__amendPluginsOn) return;
    window.__amendPluginsOn = true;

    var invoke = null;
    function ipc(cmd, args) {
        if (!invoke) {
            var t = window.__TAURI__;
            invoke = (t && t.core && t.core.invoke) ? t.core.invoke
                   : (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke)
                     ? function(c, a) { return window.__TAURI_INTERNALS__.invoke(c, a); }
                     : null;
        }
        if (!invoke) return Promise.reject('sem IPC');
        return invoke(cmd, args || {});
    }
    function temIpc() {
        var t = window.__TAURI__;
        return !!(t && t.core && t.core.invoke) || !!window.__TAURI_INTERNALS__;
    }

    var CATALOGO_URL = 'https://raw.githubusercontent.com/d3llav0lp3-git/amend/main/plugins/catalogo.json';

    // O bootstrap (que veio no app) deixou um botao no canto. Assume ele:
    // esconde o antigo e cria o proprio, com o mesmo visual.
    var antigo = document.querySelector('.abd-btn');
    if (antigo) antigo.style.display = 'none';

    var raiz = null, overlay = null, painel = null;
    var instalado = [], catalogo = [];
    // O sistema de plugins NAO vem ligado. O botão verifica isso e, se
    // estiver desligado, explica o que é antes de perguntar se quer ativar.
    var ATIVO = true;
    var verificado = true;
    var LIGADOS = {};   // { id: true/false }
    var UPDATES = [];   // ids com versao nova
    var termo = '';
    var versaoSistema = null;
    // Plugin que quebrou na hora de carregar: id -> mensagem. Sem isso o
    // erro vai só para o console e o usuário acha que o plugin não existe.
    var ERROS = {};

    function el(tag, cls, txt) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt !== undefined) e.textContent = txt;
        return e;
    }

    var CSS = `
    .ap-btn {
        position: fixed; top: 12px; left: 12px; z-index: 2147483000;
        width: 30px; height: 30px; border-radius: 8px;
        background: #2b2d31; border: 1px solid #404249;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; opacity: .28;
        transition: opacity .15s ease, background .15s ease;
        font-family: 'gg sans','Noto Sans',Helvetica,Arial,sans-serif;
    }
    .ap-btn:hover { opacity: 1; background: #404249; }
    .ap-btn svg { width: 16px; height: 16px; fill: #dbdee1; }
    .ap-btn .ap-dot { position: absolute; top: -2px; right: -2px;
        width: 9px; height: 9px; border-radius: 50%; background: #5865F2;
        border: 2px solid #313338; }
    .ap-btn[hidden] { display: none; }

    .ap-overlay { position: fixed; inset: 0; z-index: 2147483200;
        background: rgba(0,0,0,.7); display: flex; align-items: flex-start;
        justify-content: center; padding-top: 8vh;
        font-family: 'gg sans','Noto Sans',Helvetica,Arial,sans-serif; }
    .ap-overlay[hidden] { display: none; }
    .ap-janela { width: 620px; max-width: calc(100vw - 32px); max-height: 80vh;
        background: #313338; border-radius: 8px; overflow: hidden;
        box-shadow: 0 8px 32px rgba(0,0,0,.5); display: flex;
        flex-direction: column; }
    .ap-topo { padding: 16px; display: flex; align-items: center;
        gap: 10px; box-shadow: 0 1px 0 rgba(0,0,0,.15); }
    .ap-topo h2 { margin: 0; font-size: 20px; font-weight: 600; color: #f2f3f5; flex: 1; }
    .ap-x { width: 32px; height: 32px; border: none; border-radius: 4px;
        background: transparent; color: #b5bac1; cursor: pointer; font-size: 18px; }
    .ap-x:hover { background: #404249; color: #fff; }
    .ap-corpo { padding: 12px 16px 16px; overflow-y: auto; }
    .ap-secao { font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
        color: #949ba4; margin: 14px 0 8px; }
    .ap-secao:first-child { margin-top: 0; }
    .ap-item { display: flex; align-items: center; gap: 12px; padding: 10px;
        border-radius: 6px; margin-bottom: 6px; background: #2b2d31; }
    .ap-info { flex: 1; min-width: 0; }
    .ap-nome { font-size: 14px; font-weight: 600; color: #f2f3f5;
        display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .ap-desc { font-size: 12px; color: #949ba4; margin-top: 2px; }
    .ap-sel { font-size: 10px; padding: 2px 6px; border-radius: 3px;
        font-weight: 600; letter-spacing: .4px; }
    .ap-oficial { background: #3a55a5; color: #fff; }
    .ap-naooficial { background: #4e5058; color: #f2f3f5; }
    .ap-btn2 { padding: 6px 12px; border: none; border-radius: 4px;
        background: #5865F2; color: #fff; font-size: 13px; font-weight: 500;
        cursor: pointer; font-family: inherit; }
    .ap-btn2:hover { background: #4752c4; }
    .ap-btn2.sec { background: #404249; color: #dbdee1; }
    .ap-btn2.sec:hover { background: #4e5058; }
    .ap-btn2.perigo { background: #f23f43; }
    .ap-btn2.perigo:hover { background: #c93034; }
    .ap-linha { display: flex; gap: 8px; margin-bottom: 8px; }
    .ap-input { flex: 1; background: #1e1f22; border: none; outline: none;
        color: #f2f3f5; padding: 9px 11px; border-radius: 4px; font-size: 13px;
        font-family: inherit; }
    .ap-input:focus { border-bottom: 2px solid #5865F2; }
    .ap-aviso { background: #3a2b2b; border-left: 3px solid #faa81a;
        padding: 9px 11px; border-radius: 4px; font-size: 12px;
        color: #dbdee1; margin: 8px 0; }
    .ap-vazio { color: #949ba4; font-size: 13px; padding: 14px;
        text-align: center; }
    .ap-msg { font-size: 12px; margin-top: 8px; min-height: 16px; }
    .ap-msg.ok { color: #23a55a; }
    .ap-msg.erro { color: #f23f43; }

    /* busca */
    .ap-busca { position:relative; margin:0 0 12px; }
    .ap-busca input { width:100%; height:36px; padding:0 12px 0 32px; border-radius:5px;
      border:1px solid #1e1f22; background:#1e1f22; color:#dbdee1; font-size:14px;
      font-family:inherit; outline:none; }
    .ap-busca input:focus { border-color:#5865F2; }
    .ap-busca svg { position:absolute; left:10px; top:9px; width:15px; height:15px;
      fill:#80848e; pointer-events:none; }

    /* linha de plugin */
    .ap-linha { display:flex; align-items:center; gap:10px; padding:11px 0;
      border-top:1px solid rgba(255,255,255,.06); }
    .ap-linha:first-child { border-top:none; }
    .ap-info { flex:1; min-width:0; }
    .ap-nome { font-size:14px; color:#f2f3f5; display:flex; align-items:center; gap:6px; }
    .ap-desc { font-size:12px; color:#80848e; margin-top:2px;
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ap-off .ap-nome, .ap-off .ap-desc { opacity:.45; }

    /* switch (igual do Discord) */
    .ap-sw { width:40px; height:24px; border-radius:12px; background:#80848e;
      position:relative; cursor:pointer; flex:none; transition:background .15s; }
    .ap-sw.on { background:#23a55a; }
    .ap-sw:after { content:''; position:absolute; top:4px; left:4px; width:16px; height:16px;
      border-radius:50%; background:#fff; transition:transform .15s; }
    .ap-sw.on:after { transform:translateX(16px); }

    /* permissões */
    .ap-perm { margin-top:8px; }
    .ap-perm-r { font-size:12px; color:#b5bac1; margin:0 0 4px; }
    .ap-perm-e { display:flex; align-items:flex-start; gap:6px; font-size:12px;
      padding:4px 0; color:#dbdee1; text-align:left; }
    .ap-perm-e b { color:#f2f3f5; font-weight:500; }
    .ap-perm-i { width:14px; height:14px; border-radius:3px; flex:none; margin-top:1px;
      display:flex; align-items:center; justify-content:center; font-size:9px;
      font-weight:700; }
    .ap-perm-i.sim { background:#3a55a5; color:#fff; }
    .ap-perm-i.esp { background:transparent; border:1px solid #4e5058; color:#6d6f78; }
    .ap-aviso { background:#3a2b2b; border-left:3px solid #f23f43; padding:9px 11px;
      border-radius:4px; font-size:12px; color:#dbdee1; text-align:left; margin:8px 0; }
    .ap-aviso b { color:#f23f43; }
    .ap-erro { background:#3a2b2b; border-left:3px solid #f23f43; padding:6px 10px;
      border-radius:4px; font-size:11px; color:#f23f43; margin-top:5px;
      font-family:Consolas,monospace; word-break:break-all; }
    .ap-ok { font-size:12px; color:#23a55a; padding:6px 0; }

    /* ---- grid de cards do catalogo ---- */
    .ap-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
    @media (max-width:520px) { .ap-grid { grid-template-columns:1fr; } }

    .ap-card { background:#2b2d31; border:1px solid rgba(255,255,255,.06);
      border-radius:8px; padding:12px; display:flex; flex-direction:column;
      gap:8px; min-height:118px; transition:border-color .12s, background .12s; }
    .ap-card:hover { background:#313338; border-color:#3f4247; }
    .ap-card-topo { display:flex; align-items:flex-start; gap:9px; }
    .ap-icone { width:34px; height:34px; border-radius:9px; flex:none;
      display:flex; align-items:center; justify-content:center;
      font-size:16px; font-weight:700; color:#fff;
      background:linear-gradient(135deg,#5865F2,#eb459e); }
    .ap-icone.mini { width:22px; height:22px; border-radius:6px; font-size:11px; }
    .ap-card-info { flex:1; min-width:0; }
    .ap-card-nome { font-size:14px; color:#f2f3f5; font-weight:500;
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ap-card-ver { font-size:11px; color:#80848e; margin-top:1px; }
    .ap-card-desc { font-size:12px; color:#b5bac1; line-height:1.45;
      flex:1; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2;
      -webkit-box-orient:vertical; }
    .ap-card-pe { display:flex; align-items:center; gap:6px; }
    .ap-card .ap-btn-mini { flex:1; height:30px; }
    .ap-card-pe .ap-ofi, .ap-card-pe .ap-naoofi { margin-left:auto; }

    .ap-card[data-off="1"] { opacity:.5; }

    .ap-rodape { display:flex; align-items:center; gap:8px; padding:10px 16px;
      border-top:1px solid rgba(255,255,255,.06); }
    .ap-rodape-txt { flex:1; font-size:11px; color:#80848e; }
    .ap-vazio { font-size:12px; color:#80848e; padding:10px 0; }
    .ap-ofi { font-size:10px; font-weight:700; padding:2px 6px; border-radius:3px;
      background:#3a55a5; color:#fff; letter-spacing:.3px; }
    .ap-naoofi { font-size:10px; font-weight:700; padding:2px 6px; border-radius:3px;
      background:#4e5058; color:#b5bac1; letter-spacing:.3px; }
    .ap-badge { font-size:10px; font-weight:700; padding:2px 6px; border-radius:3px;
      letter-spacing:.3px; }
    .ap-badge.novo { background:#faa81a; color:#1e1f22; }
    .ap-badge.upd { background:#5865F2; color:#fff; }

    .ap-btn-mini { height:28px; padding:0 10px; font-size:12px; border:none;
      border-radius:4px; background:#404249; color:#dbdee1; cursor:pointer;
      font-family:inherit; }
    .ap-btn-mini:hover { background:#4e5058; color:#fff; }

    /* estatisticas no topo */
    .ap-stats { display:flex; gap:16px; padding:0 16px 14px; font-size:12px;
      color:#80848e; border-bottom:1px solid rgba(255,255,255,.06); margin-bottom:12px; }
    .ap-stats b { color:#dbdee1; font-size:14px; display:block; }
    .ap-stats .s { flex:1; text-align:center; }

    /* tela de apresentacao (sistema de plugins desligado) */
    .ap-intro { text-align: center; padding: 22px 18px 8px; }
    .ap-intro-icone { width:60px; height:60px; margin:0 auto 14px; border-radius:16px;
      background:linear-gradient(135deg,#5865F2,#eb459e);
      display:flex; align-items:center; justify-content:center; }
    .ap-intro-icone svg { width:30px; height:30px; fill:#fff; }
    .ap-intro h3 { margin:0 0 8px; font-size:18px; color:#f2f3f5; }
    .ap-intro p { margin:0 0 10px; font-size:13px; line-height:1.6; color:#b5bac1; }
    .ap-risco { background:#3a2b2b; border-left:3px solid #faa81a;
      padding:9px 11px; border-radius:4px; font-size:12px; color:#dbdee1;
      text-align:left; margin:14px 0 4px; }
    .ap-risco b { color:#faa81a; }
    .ap-acoes { display:flex; gap:8px; padding:14px 16px 18px; }
    .ap-acoes .ap-btn2 { flex:1; height:40px; font-size:14px; }
    `;

    function garantirBotao() {
        if (document.querySelector('.ap-btn')) return;
        var b = el('div', 'ap-btn');
        b.title = 'Plugins do Amend';
        b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H8a2 2 0 0 0-2 2v3.8h-1.5a2.5 2.5 0 0 0 0 5H6V20a2 2 0 0 0 2 2h4v1.5a2.5 2.5 0 0 0 5 0V22h4a2 2 0 0 0 2-2v-4.2h1.5a2.5 2.5 0 0 0 0-5z"/></svg>';
        b.onclick = function (e) { e.stopPropagation(); abrir(); };
        document.body.appendChild(b);
        if (antigo) antigo.remove();
        // o atalho Ctrl+Shift+P e o bootstrap: evita dois abrindo junto
        document.removeEventListener('keydown', abrirPorAtalho, true);
    }

    function abrirPorAtalho(e) {
        if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
            e.preventDefault(); e.stopPropagation();
            abrir();
        }
    }

    function garantirUI() {
        garantirBotao();
        if (raiz && raiz.isConnected) return;
        var st = document.createElement('style');
        st.id = 'amend-plugins-css';
        st.textContent = CSS;
        (document.head || document.documentElement).appendChild(st);

        raiz = el('div', 'ap-root');
        var btn = el('div', 'ap-btn');
        btn.title = 'Plugins do Amend (Ctrl+Shift+P)';
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H8a2 2 0 0 0-2 2v3.8h-1.5a2.5 2.5 0 0 0 0 5H6V20a2 2 0 0 0 2 2h4v1.5a2.5 2.5 0 0 0 5 0V22h4a2 2 0 0 0 2-2v-4.2h1.5a2.5 2.5 0 0 0 0-5z"/></svg>';
        btn.onclick = function(ev) { ev.stopPropagation(); abrir(); };
        btn.appendChild(el('div', 'ap-dot'));
        raiz.appendChild(btn);
        document.body.appendChild(raiz);

        overlay = el('div', 'ap-overlay');
        overlay.hidden = true;
        painel = el('div', 'ap-janela');
        overlay.appendChild(painel);
        overlay.onclick = function(e) { if (e.target === overlay) fechar(); };
        document.body.appendChild(overlay);

        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
                e.preventDefault(); e.stopPropagation();
                overlay.hidden ? abrir() : fechar();
            }
            if (e.key === 'Escape' && overlay && !overlay.hidden) fechar();
        }, true);
    }

    function msg(txt, cls) {
        var m = painel.querySelector('.ap-msg');
        if (!m) return;
        m.textContent = txt || '';
        m.className = 'ap-msg' + (cls ? ' ' + cls : '');
    }

    function itemInstalado(p) {
        var row = el('div', 'ap-item');
        var info = el('div', 'ap-info');
        var nome = el('div', 'ap-nome');
        nome.appendChild(document.createTextNode(p.manifesto.nome || p.id));
        var tag = el('span', 'ap-sel ' + (p.manifesto.oficial ? 'ap-oficial' : 'ap-naooficial'),
            p.manifesto.oficial ? 'oficial' : 'não oficial');
        nome.appendChild(tag);
        if (p.manifesto.versao) nome.appendChild(el('span', 'ap-desc', 'v' + p.manifesto.versao));
        info.appendChild(nome);
        info.appendChild(el('div', 'ap-desc',
            (p.manifesto.descricao || '') +
            (p.manifesto.autor ? ' — ' + p.manifesto.autor : '')));
        var rm = el('button', 'ap-btn2 perigo', 'Remover');
        rm.onclick = function() {
            ipc('plugins_remover', { id: p.id })
                .then(function() { return carregar(); })
                .then(function() { desenhar(); })
                .catch(function(e) { msg(String(e), 'erro'); });
        };
        row.appendChild(info);
        row.appendChild(rm);
        return row;
    }

    function itemCatalogo(c) {
        var row = el('div', 'ap-item');
        var info = el('div', 'ap-info');
        var nome = el('div', 'ap-nome');
        nome.appendChild(document.createTextNode(c.nome));
        nome.appendChild(el('span', 'ap-sel ap-oficial', 'oficial'));
        info.appendChild(nome);
        info.appendChild(el('div', 'ap-desc', (c.descricao || '') + (c.autor ? ' — ' + c.autor : '')));
        var jaTem = instalado.some(function(p) { return p.id === c.id; });
        var b = el('button', 'ap-btn2' + (jaTem ? ' sec' : ''), jaTem ? 'Instalado' : 'Instalar');
        b.disabled = jaTem;
        if (!jaTem) {
            b.onclick = function() {
                b.disabled = true; b.textContent = 'Baixando...';
                ipc('plugins_instalar_url', { url: c.url })
                    .then(function() { return carregar(); })
                    .then(function() { msg(t('instalado_ok') + c.nome, 'ok'); desenhar(); })
                    .catch(function(e) { msg(String(e), 'erro'); b.disabled = false; b.textContent = 'Instalar'; });
            };
        }
        row.appendChild(info); row.appendChild(b);
        return row;
    }

    function desenharInstalados() {
        var box = el('div', 'ap-secao');
        box.appendChild(el('h4', null, t(t('stats_inst')) + ' (' + instalado.length + ')'));
        if (!instalado.length) {
            box.appendChild(el('div', 'ap-vazio',
                t('vazio_inst')));
            return box;
        }
        var norm = termo.toLowerCase().trim();
        var visiveis = 0;
        for (var i = 0; i < instalado.length; i++) {
            var p = instalado[i];
            if (norm && (p.nome + ' ' + (p.descricao || '')).toLowerCase().indexOf(norm) < 0) continue;
            visiveis++;

            var linha = el('div', 'ap-linha');
            var on = LIGADOS[p.id] !== false;
            if (!on) linha.className = 'ap-off';

            var info = el('div', 'ap-info');
            var nome = el('div', 'ap-nome');
            nome.appendChild(document.createTextNode(p.nome));
            if (p.oficial) nome.appendChild(el('span', 'ap-ofi', t('oficial')));
            else nome.appendChild(el('span', 'ap-naoofi', t('nao_oficial')));
            if (UPDATES.indexOf(p.id) >= 0) nome.appendChild(el('span', 'ap-badge upd', t('atualização')));
            info.appendChild(nome);
            info.appendChild(el('div', 'ap-desc',
                (p.descricao || '') + (p.autor ? '  ·  ' + p.autor : '') + '  ·  v' + p.versao));

            var sw = el('div', 'ap-sw' + (on ? ' on' : ''));
            sw.title = on ? t('desligar') : t('ligar');
            sw.onclick = function () {
                var novo = !(LIGADOS[p.id] !== false);
                LIGADOS[p.id] = novo;
                ipc('plugins_ligar', { id: p.id, ligado: novo })
                    .then(function () { desenhar(); })
                    .catch(function (e) { msg(String(e), 'erro'); });
            };
            linha.appendChild(info);

            if (UPDATES.indexOf(p.id) >= 0) {
                var bt = el('button', 'ap-btn-mini', t('atualizar'));
                bt.onclick = function () {
                    bt.disabled = true; bt.textContent = '...';
                    ipc('plugins_atualizar', { id: p.id })
                        .then(function () {
                            return Promise.all([carregar(), ipc('plugins_updates')]);
                        })
                        .then(function (r) {
                            UPDATES = r[1] || [];
                            msg(t('ms_atualizado'), 'ok');
                            return carregar();
                        })
                        .then(desenhar)
                        .catch(function (e) { msg(String(e), 'erro'); bt.disabled = false; bt.textContent = t('atualizar'); });
                };
                linha.appendChild(bt);
            }
            linha.appendChild(sw);

            var er = erroDe(p.id);
            if (er) info.appendChild(er);

            if (p.tem_backup) {
                var rev = el('button', 'ap-btn-mini', t('voltar') + (p.versao_anterior || '?'));
                rev.title = t('att_p');
                rev.onclick = function () {
                    rev.disabled = true;
                    ipc('plugins_reverter', { id: p.id })
                        .then(function () { msg(t('revertido'), 'ok'); return carregar(); })
                        .then(desenhar)
                        .catch(function (e) { msg(String(e), 'erro'); rev.disabled = false; });
                };
                linha.appendChild(rev);
            }
            var rm = el('button', 'ap-btn-mini', t('remover'));
            rm.onclick = function () {
                ipc('plugins_remover', { id: p.id }).then(function () {
                    delete LIGADOS[p.id];
                    msg(t('ms_removido'), 'ok');
                    return carregar();
                }).then(desenhar).catch(function (e) { msg(String(e), 'erro'); });
            };
            linha.appendChild(rm);

            box.appendChild(linha);
        }
        if (!visiveis) box.appendChild(el('div', 'ap-vazio', t('nada_encontrado') + ' "' + termo + '".'));
        return box;
    }

    function desenharCatalogo() {
        var box = el('div', 'ap-secao');
        box.appendChild(el('h4', null, t('catalogo') + ' (' + catalogo.length + ')'));
        if (!catalogo.length) {
            box.appendChild(el('div', 'ap-vazio', t('vazio_cat')));
            return box;
        }
        var norm = termo.toLowerCase().trim();
        var grid = el('div', 'ap-grid');
        var achou = 0;
        for (var i = 0; i < catalogo.length; i++) {
            var c = catalogo[i];
            if (norm && (c.nome + ' ' + (c.descricao || '')).toLowerCase().indexOf(norm) < 0) continue;
            achou++;
            var jaTem = instalado.some(function (p) { return p.id === c.id; });

            var card = el('div', 'ap-card');
            var topo = el('div', 'ap-card-topo');
            topo.appendChild(el('div', 'ap-icone', (c.nome || '?').charAt(0).toUpperCase()));
            var info = el('div', 'ap-card-info');
            info.appendChild(el('div', 'ap-card-nome', c.nome || c.id));
            info.appendChild(el('div', 'ap-card-ver', 'v' + (c.versao || '?') + (c.autor ? ' · ' + c.autor : '')));
            topo.appendChild(info);
            card.appendChild(topo);
            card.appendChild(el('div', 'ap-card-desc', c.descricao || ''));

            var pe = el('div', 'ap-card-pe');
            var bt = el('button', 'ap-btn-mini', jaTem ? t('instalado') : t('instalar'));
            if (jaTem) { bt.disabled = true; bt.style.opacity = '.55'; }
            bt.onclick = function () {
                bt.disabled = true; bt.textContent = '...';
                ipc('plugins_analisar', { url: c.url })
                    .then(function (an) { return confirmarInstalar(c.nome, an, c.url); })
                    .then(function (ok) { return ok ? carregar().then(desenhar) : null; })
                    .catch(function (e) { msg(String(e), 'erro'); bt.disabled = false; bt.textContent = t('instalar'); });
            };
            pe.appendChild(bt);
            pe.appendChild(el('span', 'ap-ofi', t('oficial')));
            card.appendChild(pe);
            grid.appendChild(card);
        }
        if (!achou) {
            box.appendChild(el('div', 'ap-vazio', t('nada') + ' "' + termo + '".'));
            return box;
        }
        box.appendChild(grid);
        return box;
    }

    function desenhar() {
        painel.innerHTML = '';
        var topo = el('div', 'ap-topo');
        topo.appendChild(el('h2', null, t('plugins')));
        var x = el('button', 'ap-x', '\u00d7');
        x.onclick = fechar;
        topo.appendChild(x);
        painel.appendChild(topo);

        // estatisticas
        var stats = el('div', 'ap-stats');
        var ligar = 0;
        for (var k in LIGADOS) if (LIGADOS[k] !== false) ligar++;
        stats.appendChild(stat(t('stats_inst'), String(instalado.length)));
        stats.appendChild(stat(t('stats_ativos'), String(ligar)));
        stats.appendChild(stat(t('stats_cat'), String(catalogo.length)));
        painel.appendChild(stats);

        // busca
        var busca = el('div', 'ap-busca');
        busca.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18.7 19.3a7 7 0 1 0-1.4-1.4l4.3 4.3-1.4 1.4-4.3-4.3zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/></svg>';
        var inp = el('input');
        inp.type = 'search';
        inp.placeholder = t('busca');
        inp.value = termo;
        inp.oninput = function () { termo = inp.value; desenhar(); setTimeout(function () { var n = painel.querySelector('.ap-busca input'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 0); };
        busca.appendChild(inp);
        var corpo = el('div', 'ap-corpo');
        corpo.appendChild(busca);
        painel.appendChild(corpo);

        var add = el('div', 'ap-secao');
        add.appendChild(el('h4', null, t('add')));
        var linhaUrl = el('div', 'ap-linha');
        var inp2 = el('input');
        inp2.placeholder = t('url');
        inp2.className = 'ap-input';
        var b = el('button', 'ap-btn-mini', t('instalar'));
        b.onclick = function () {
            var u = inp2.value.trim();
            if (!u) return;
            b.disabled = true;
            ipc('plugins_analisar', { url: u })
                .then(function (an) {
                    var partes = u.split('/');
                    var nome = partes[partes.length - 1] || 'plugin';
                    return confirmarInstalar(nome, an, u);
                })
                .then(function (ok) { return ok ? carregar().then(desenhar) : null; })
                .catch(function (e) { msg(String(e), 'erro'); b.disabled = false; });
        };
        linhaUrl.appendChild(inp2);
        linhaUrl.appendChild(b);
        add.appendChild(linhaUrl);
        painel.appendChild(add);

        painel.appendChild(desenharInstalados());
        painel.appendChild(desenharCatalogo());

        var m = el('div', 'ap-msg');
        painel.appendChild(m);

        var rodape = el('div', 'ap-rodape');
        var rs = el('div', 'ap-rodape-txt', t('versao') + ' ' + (versaoSistema || '?'));
        rodape.appendChild(rs);
        var sair = el('button', 'ap-btn-mini', t('desinstalar'));
        sair.onclick = function () {
            if (!confirm(t('desinstalar_titulo') + '\n\n' + t('desinstalar_txt'))) return;
            ipc('plugins_sistema_remover').then(function () { fechar(); }).catch(function (e) { msg(String(e), 'erro'); });
        };
        rodape.appendChild(sair);
        painel.appendChild(rodape);
    }

    var NOME_PERM = (IDIOMA === 'en') ? {
        dom: 'Read and change the page',
        rede: 'Make requests to the internet',
        armazenamento: 'Store data on your computer',
        notificacoes: 'Show notifications',
        captura: 'Capture screen or audio'
    } : {
        dom: 'Ler e alterar a página',
        rede: 'Fazer requisições para a internet',
        armazenamento: 'Guardar dados no seu computador',
        notificacoes: 'Mostrar notificações',
        captura: 'Capturar tela ou áudio'
    };

    /// Mostra o que o plugin pede, marcando o que ele NÃO declarou.
    function blocoPermissoes(an) {
        var box = el('div', 'ap-perm');
        var pedidas = an.concedidas || [];
        var rotina = ['dom'];

        if (pedidas.length) {
            box.appendChild(el('p', 'ap-perm-r', t('pede_acesso')));
        } else {
            box.appendChild(el('p', 'ap-perm-r', t('so_pagina')));
        }
        Object.keys(NOME_PERM).forEach(function (k) {
            var tem = pedidas.indexOf(k) >= 0;
            var linha = el('div', 'ap-perm-e');
            var i = el('span', 'ap-perm-i ' + (tem ? 'sim' : 'esp'), tem ? '\u2713' : '');
            linha.appendChild(i);
            var t = el('span');
            t.appendChild(el('b', null, NOME_PERM[k]));
            linha.appendChild(t);
            box.appendChild(linha);
        });

        (an.avisos || []).forEach(function (a) {
            box.appendChild(el('div', 'ap-aviso', '<b>' + t('aviso') + ':</b> ' + a));
        });
        (an.desconhecidas || []).forEach(function (d) {
            box.appendChild(el('div', 'ap-aviso',
                '<b>Permissão desconhecida:</b> o plugin pediu "' + d + '", que não existe. Ignorada.'));
        });
        return box;
    }

    /// Confirma a instalação depois de mostrar o que o plugin pede.
    /// Devolve Promise<boolean>.
    function confirmarInstalar(nome, an, url) {
        return new Promise(function (resolve) {
            painel.innerHTML = '';
            var topo = el('div', 'ap-topo');
            topo.appendChild(el('h2', null, t('instalar_titulo')));
            var x = el('button', 'ap-x', '\u00d7');
            x.onclick = function () { resolve(false); fechar(); };
            topo.appendChild(x);
            painel.appendChild(topo);

            var corpo = el('div', 'ap-corpo');
            corpo.appendChild(el('p', null,
                '<b style="color:#f2f3f5">' + nome + '</b> ' + t('quer_instalar')));
            corpo.appendChild(blocoPermissoes(an || {}));
            painel.appendChild(corpo);

            var m = el('div', 'ap-msg');
            painel.appendChild(m);

            var acoes = el('div', 'ap-acoes');
            var nao = el('button', 'ap-btn2 sec', t('cancel'));
            nao.onclick = function () { resolve(false); fechar(); };
            var sim = el('button', 'ap-btn2', 'Instalar');
            sim.onclick = function () {
                sim.disabled = true; sim.textContent = 'Instalando...';
                ipc('plugins_instalar_url', { url: url })
                    .then(function (r) {
                        msg(t('instalado_ok') + r.nome, 'ok');
                        setTimeout(function () { fechar(); }, 500);
                        return r;
                    })
                    .then(function () { resolve(true); })
                    .catch(function (e) {
                        msg(String(e), 'erro');
                        sim.disabled = false; sim.textContent = 'Instalar';
                        resolve(false);
                    });
            };
            acoes.appendChild(nao); acoes.appendChild(sim);
            painel.appendChild(acoes);
        });
    }

    /// Erro de carregamento de um plugin, mostrado na linha dele.
    function erroDe(id) {
        if (!ERROS[id]) return null;
        return el('div', 'ap-erro', ERROS[id]);
    }

    function stat(rot, val) {
        var d = el('div', 's');
        d.appendChild(el('b', null, val));
        d.appendChild(document.createTextNode(rot));
        return d;
    }

    function abrir() {
        // o runtime só existe se o sistema foi instalado — neste caso não
        // há intro para mostrar.
        garantirUI();
        overlay.hidden = false;
        msg('Carregando...');
        Promise.all([
            carregar(),
            ipc('plugins_updates').catch(function () { return []; }),
            ipc('plugins_sistema_status').catch(function () { return {}; })
        ]).then(function (r) {
            UPDATES = r[1] || [];
            if (r[2] && r[2].versao) versaoSistema = r[2].versao;
            // estado ligado/desligado de cada plugin
            return Promise.all(instalado.map(function (p) {
                return ipc('plugins_esta_ligado', { id: p.id })
                    .catch(function () { return true; })
                    .then(function (v) { LIGADOS[p.id] = v; });
            }));
        }).then(desenhar)
          .catch(function (e) { msg(String(e), 'erro'); });
    }
    function fechar() { if (overlay) overlay.hidden = true; }

    // API para plugins
    window.Amend = {
        versao: '0.1.0',
        on: function(nome, fn) {
            (window.__amendEvents = window.__amendEvents || {})[nome] = fn;
        },
        emitir: function(nome, dados) {
            var f = (window.__amendEvents || {})[nome];
            if (f) try { f(dados); } catch (e) {}
        },
        icone: function(css) { try { (window.__amendCss = window.__amendCss || []).push(css); } catch (e) {} },
        logar: function() { if (window.console) console.log('[plugin]', arguments); },
        abrirPainel: abrir,
        fecharPainel: fechar,
        catalogo: function() { return catalogo; }
    };

    // O botão precisa existir desde o boot — antes ele só aparecia depois
    // de abrir o painel, o que fazia dele inútil.
    if (document.body) garantirUI();
    else document.addEventListener('DOMContentLoaded', function() { garantirUI(); });

    // e reaparece se o Discord trocar de tela (recarrega o #app inteiro)
    var obs = new MutationObserver(function() {
        if (raiz && !raiz.isConnected) garantirUI();
    });
    function ligar() {
        if (document.body) obs.observe(document.body, { childList: true, subtree: true });
        else document.addEventListener('DOMContentLoaded', ligar);
    }
    ligar();
})();

// =====================================================================
//  Executor de plugins
//
//  O app injeta o codigo de cada plugin instalado em
//  window.__AMEND_PLUGINS (array de strings). Executamos aqui, dentro da
//  pagina do Discord — mesmo modelo do Vencord/BetterDiscord.
//
//  ATENCAO: por rodar na origem do Discord, um plugin tem acesso a
//  document.cookie, localStorage e fetch. E por isso que plugins que nao
//  vieram do catalogo oficial sao marcados como "nao oficial" no painel.
// =====================================================================
(function() {
    if (window.__amendRunnerOn) return;
    window.__amendRunnerOn = true;

    var carregados = [];

    function executarTodos() {
        // Sistema de plugins desligado = nada executa, mesmo que o app tenha
        // injetado codigo (ex.: ligou e depois desligou).
        if (!window.__amendPluginsLigado) return;
        var lista = window.__AMEND_PLUGINS || [];
        if (!Array.isArray(lista)) return;
        for (var i = 0; i < lista.length; i++) {
            var codigo = lista[i];
            if (typeof codigo !== 'string' || !codigo.trim()) continue;
            try {
                (0, eval)(codigo);
                carregados.push(i);
                console.log('[Amend] plugin ' + i + ' carregado');
            } catch (e) {
                // loga sempre: engolir o erro aqui deixava o plugin
                // simplesmente nao aparecer, sem nenhuma pista
                var texto = String(e && e.message ? e.message : e).slice(0, 200);
                ERROS[i] = texto;
                console.error('[Amend] plugin ' + i + ' FALHOU:', e);
            }
        }
        window.__amendPluginsCarregados = carregados.length;
        if (window.Amend && typeof window.Amend.emitir === 'function') {
            window.Amend.emitir('pluginsCarregados', carregados.length);
        }
    }

    // entra em cena assim que o app injeta este arquivo
    function entrar() {
        var p = window.__amendPainel;
        if (p && p.botao) p.botao();
    }
    if (document.body) entrar();
    else document.addEventListener('DOMContentLoaded', entrar);

    // Executa assim que o app do Discord existir: plugin que procura no DOM
    // no topo do script rodaria antes da interface existir.
    function quandoPronto() {
        var app = document.getElementById('app');
        if (app && app.children.length) { executarTodos(); return; }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', quandoPronto);
            return;
        }
        setTimeout(quandoPronto, 300);
    }

    whenPronto();
})();
