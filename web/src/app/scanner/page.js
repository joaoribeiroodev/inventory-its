'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../components/ProtectedRoute';
import { api } from '../../services/api';

// html5-qrcode só pode rodar no navegador (usa a câmera), então
// desativamos a renderização no servidor para esse componente.
const QrScanner = dynamic(() => import('../../components/QrScanner'), { ssr: false });

const CHAVE_MODO = 'inventory-its:scanner:modo';

export default function ScannerPage() {
    return (
        <ProtectedRoute>
            <PaginaScanner />
        </ProtectedRoute>
    );
}

function PaginaScanner() {
    // Lembrar o modo escolhido (por navegador/estação) evita que quem
    // monta uma bancada fixa com o leitor USB precise clicar em "Leitor
    // USB" de novo toda vez que abrir a página.
    const [modo, setModo] = useState('camera');

    useEffect(() => {
        try {
            const salvo = window.localStorage.getItem(CHAVE_MODO);
            if (salvo === 'estacao' || salvo === 'camera') setModo(salvo);
        } catch {
            // localStorage pode falhar (modo privado etc.) — sem problema,
            // só fica no padrão "camera" nesta sessão.
        }
    }, []);

    function escolherModo(novoModo) {
        setModo(novoModo);
        try {
            window.localStorage.setItem(CHAVE_MODO, novoModo);
        } catch {
            // idem acima — não é crítico persistir.
        }
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Bipar item</h1>
                    <p className="subtitle">
                        {modo === 'camera'
                            ? 'Leia o QR Code ou o código de barras (patrimônio) da etiqueta pela webcam'
                            : 'Bipagem contínua com leitor de código de barras USB — ideal para uma bancada/estação fixa'}
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                    type="button"
                    className={`btn ${modo === 'camera' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => escolherModo('camera')}
                >
                    📷 Câmera (celular/tablet)
                </button>
                <button
                    type="button"
                    className={`btn ${modo === 'estacao' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => escolherModo('estacao')}
                >
                    ⌨️ Leitor USB (estação fixa)
                </button>
            </div>

            {modo === 'camera' ? <LeitorDeQrCode /> : <EstacaoLeitorUsb />}
        </div>
    );
}

// ---------------------------------------------------------------------
// Modo câmera — bipa um item por vez e já abre a tela dele (fluxo
// original do app, pensado pra celular/tablet em campo).
// ---------------------------------------------------------------------
function LeitorDeQrCode() {
    const router = useRouter();
    const [ativo, setAtivo] = useState(true);
    const [buscando, setBuscando] = useState(false);
    const [erro, setErro] = useState(null);
    const [codigoManual, setCodigoManual] = useState('');
    // Preenchido quando a etiqueta lida está duplicada entre mais de
    // um item (ver levantamento patrimonial) — nesse caso não dá pra
    // ir direto pro item, tem que deixar a pessoa escolher qual bem
    // físico ela tem na mão.
    const [candidatosAmbiguos, setCandidatosAmbiguos] = useState(null);

    const handleLeitura = useCallback(
        async (codigo) => {
            setAtivo(false); // pausa a câmera enquanto processa, evita leituras duplicadas
            setBuscando(true);
            setErro(null);
            setCandidatosAmbiguos(null);
            try {
                const resultado = await api.buscarItemPorCodigo(codigo.trim());
                if (resultado.ambiguo) {
                    setCandidatosAmbiguos(resultado.itens);
                    setBuscando(false);
                    return;
                }
                router.push(`/itens/${resultado.id}`);
            } catch (err) {
                if (err.status === 404) {
                    // Nada cadastrado com essa etiqueta/código — em vez de só
                    // avisar que não achou, já manda pra tela de cadastro com
                    // o código pré-preenchido, pra agilizar quem está
                    // etiquetando um item novo.
                    router.push(`/itens/novo?codigo=${encodeURIComponent(codigo.trim())}`);
                    return;
                }
                setErro('Erro ao buscar o item. Tente novamente.');
                setBuscando(false);
            }
        },
        [router]
    );

    function handleTentarNovamente() {
        setErro(null);
        setCandidatosAmbiguos(null);
        setCodigoManual('');
        setAtivo(true);
    }

    function handleBuscarManual(e) {
        e.preventDefault();
        if (!codigoManual.trim()) return;
        handleLeitura(codigoManual);
    }

    return (
        <div className="card" style={{ maxWidth: 460 }}>
            <div className="scanner-frame">
                {ativo && <QrScanner onLeitura={handleLeitura} ativo={ativo} />}
            </div>
            {!ativo && buscando && <p className="subtitle" style={{ marginTop: 12 }}>Buscando item...</p>}

            {erro && (
                <div style={{ marginTop: 16 }}>
                    <p className="form-error">{erro}</p>
                    <button className="btn btn-primary" onClick={handleTentarNovamente}>
                        Tentar novamente
                    </button>
                </div>
            )}

            {!candidatosAmbiguos && (
                <form onSubmit={handleBuscarManual} style={{ marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                    <label className="form-label" htmlFor="codigo-manual">
                        Câmera não lê a etiqueta? Digite ou cole o código
                    </label>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <input
                            id="codigo-manual"
                            className="form-control"
                            placeholder="Ex: 9637"
                            value={codigoManual}
                            onChange={(e) => setCodigoManual(e.target.value)}
                            disabled={buscando}
                        />
                        <button type="submit" className="btn btn-secondary" disabled={buscando || !codigoManual.trim()}>
                            Buscar
                        </button>
                    </div>
                    <p className="form-hint" style={{ marginTop: 6 }}>
                        Também funciona com um leitor de código de barras USB conectado — ele digita o
                        número aqui e aperta Enter sozinho. Pra bipar vários itens seguidos sem clicar em
                        nada, use o modo <strong>"Leitor USB (estação fixa)"</strong> ali em cima.
                    </p>
                </form>
            )}

            {candidatosAmbiguos && (
                <div style={{ marginTop: 16 }}>
                    <p className="form-error">
                        Essa etiqueta está colada em mais de um item (patrimônio duplicado). Qual deles é?
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {candidatosAmbiguos.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className="btn btn-secondary"
                                style={{ textAlign: 'left' }}
                                onClick={() => router.push(`/itens/${item.id}`)}
                            >
                                {item.descricao} — {item.setorAtual?.nome ?? 'sem setor'}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={handleTentarNovamente}>
                        Nenhum desses / tentar de novo
                    </button>
                </div>
            )}

            <p className="form-hint" style={{ marginTop: 16, maxWidth: 480 }}>
                Se o navegador não pedir permissão de câmera, confira se o painel está sendo
                acessado por <code>http://localhost</code> ou por um endereço <code>https://</code> —
                por segurança, os navegadores bloqueiam o acesso à câmera em páginas
                <code> http://</code> que não sejam localhost (ex: acessar pelo IP da rede local
                em outro PC).
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------
// Modo estação — pensado pra um leitor de código de barras USB (modo
// "teclado"/HID, como o Bematech D-7500) plugado num PC fixo: TI,
// almoxarifado, bancada de conferência. Em vez de abrir o item e sair
// da tela a cada bipada (o que obrigaria voltar pro scanner toda hora),
// fica tudo numa lista de "últimos bipados" nesta mesma página, o
// campo nunca perde o foco, e cada item abre em nova aba se quiser
// conferir o detalhe — a estação continua rodando.
// ---------------------------------------------------------------------
function EstacaoLeitorUsb() {
    const [codigo, setCodigo] = useState('');
    const [processando, setProcessando] = useState(false);
    const [historico, setHistorico] = useState([]);
    const [totalBipado, setTotalBipado] = useState(0);
    const inputRef = useRef(null);
    const audioCtxRef = useRef(null);

    // Mantém o campo sempre focado: um leitor USB em modo teclado só
    // "digita" se o campo de texto estiver com o foco. Se o operador
    // clicar em outro lugar da página sem querer, ou a aba perder e
    // recuperar o foco, a leitura seguinte cairia no vazio sem isso.
    useEffect(() => {
        inputRef.current?.focus();
        function refocar() {
            inputRef.current?.focus();
        }
        window.addEventListener('focus', refocar);
        return () => window.removeEventListener('focus', refocar);
    }, []);

    function refocarComAtraso() {
        // setTimeout(0) espera o React terminar o re-render antes de
        // focar de novo — focar no mesmo tick às vezes é ignorado.
        setTimeout(() => inputRef.current?.focus(), 0);
    }

    // Bipinho de confirmação sem precisar de nenhum arquivo de áudio —
    // só um beep curto gerado na hora. Deixa o operador bipar olhando
    // pro item físico/etiqueta, não pra tela, e ainda saber se deu
    // certo, deu ambíguo ou não achou só pelo som.
    function tocarBeep({ frequencia, duracaoMs, repetir = 1 }) {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
            const ctx = audioCtxRef.current;
            for (let i = 0; i < repetir; i += 1) {
                const inicio = ctx.currentTime + i * (duracaoMs / 1000 + 0.08);
                const osc = ctx.createOscillator();
                const ganho = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = frequencia;
                ganho.gain.value = 0.08;
                osc.connect(ganho);
                ganho.connect(ctx.destination);
                osc.start(inicio);
                osc.stop(inicio + duracaoMs / 1000);
            }
        } catch {
            // Autoplay de áudio pode ser bloqueado até o usuário interagir
            // com a página — não é motivo pra travar a bipagem.
        }
    }

    function adicionarAoHistorico(entrada) {
        setHistorico((atual) => [entrada, ...atual].slice(0, 30));
        setTotalBipado((n) => n + 1);
    }

    const handleSubmit = useCallback(
        async (e) => {
            e.preventDefault();
            const valor = codigo.trim();
            if (!valor || processando) return;

            setProcessando(true);
            setCodigo('');

            const horario = new Date();
            try {
                const resultado = await api.buscarItemPorCodigo(valor);

                if (resultado.ambiguo) {
                    tocarBeep({ frequencia: 660, duracaoMs: 110, repetir: 2 });
                    adicionarAoHistorico({
                        id: `${horario.getTime()}-${valor}`,
                        horario,
                        codigo: valor,
                        status: 'ambiguo',
                        itens: resultado.itens,
                    });
                } else {
                    tocarBeep({ frequencia: 880, duracaoMs: 120 });
                    adicionarAoHistorico({
                        id: `${horario.getTime()}-${valor}`,
                        horario,
                        codigo: valor,
                        status: 'ok',
                        item: resultado,
                    });
                }
            } catch (err) {
                if (err.status === 404) {
                    tocarBeep({ frequencia: 220, duracaoMs: 220 });
                    adicionarAoHistorico({
                        id: `${horario.getTime()}-${valor}`,
                        horario,
                        codigo: valor,
                        status: 'nao-encontrado',
                    });
                } else {
                    tocarBeep({ frequencia: 220, duracaoMs: 220 });
                    adicionarAoHistorico({
                        id: `${horario.getTime()}-${valor}`,
                        horario,
                        codigo: valor,
                        status: 'erro',
                    });
                }
            } finally {
                setProcessando(false);
                refocarComAtraso();
            }
        },
        [codigo, processando]
    );

    function limparHistorico() {
        setHistorico([]);
        setTotalBipado(0);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
            <div className="card">
                <form onSubmit={handleSubmit}>
                    <label className="form-label" htmlFor="codigo-estacao">
                        Bipe a etiqueta — o campo fica sempre pronto pra receber a próxima leitura
                    </label>
                    <input
                        id="codigo-estacao"
                        ref={inputRef}
                        className="form-control"
                        style={{ fontSize: 18, padding: '12px 14px', marginTop: 6 }}
                        placeholder="Aguardando leitura..."
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        onBlur={refocarComAtraso}
                        disabled={processando}
                        autoComplete="off"
                    />
                    <p className="form-hint" style={{ marginTop: 6 }}>
                        Não precisa clicar em nada: bipe, o resultado aparece abaixo e o campo já fica
                        pronto pro próximo item. {totalBipado > 0 && `${totalBipado} bipado(s) nesta sessão.`}
                    </p>
                </form>
            </div>

            {historico.length > 0 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <p className="subtitle" style={{ margin: 0 }}>Últimos bipados</p>
                        <button type="button" className="btn btn-secondary" onClick={limparHistorico}>
                            Limpar lista
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {historico.map((entrada) => (
                            <EntradaHistorico key={entrada.id} entrada={entrada} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function EntradaHistorico({ entrada }) {
    const hora = entrada.horario.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (entrada.status === 'ok') {
        const { item } = entrada;
        return (
            <a
                href={`/itens/${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="logs-card card-sucesso"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}
            >
                <div>
                    <div style={{ fontWeight: 600 }}>{item.descricao}</div>
                    <div className="form-hint" style={{ margin: 0 }}>
                        Código {entrada.codigo} · {item.setorAtual?.nome ?? 'sem setor'} · {hora}
                    </div>
                </div>
                <span className={`badge badge-${item.situacaoAtual === 'ruim' ? 'ruim' : 'bom'}`}>
                    {item.situacaoAtual === 'ruim' ? 'Ruim' : 'Bom'}
                </span>
            </a>
        );
    }

    if (entrada.status === 'ambiguo') {
        return (
            <div className="logs-card card-aviso">
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    Código {entrada.codigo} está em mais de um item ({hora})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {entrada.itens.map((item) => (
                        <a
                            key={item.id}
                            href={`/itens/${item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ fontSize: 13 }}
                        >
                            {item.descricao}
                        </a>
                    ))}
                </div>
            </div>
        );
    }

    if (entrada.status === 'nao-encontrado') {
        return (
            <div className="logs-card card-erro" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                    <div style={{ fontWeight: 600 }}>Código {entrada.codigo} não encontrado</div>
                    <div className="form-hint" style={{ margin: 0 }}>{hora}</div>
                </div>
                <a
                    href={`/itens/novo?codigo=${encodeURIComponent(entrada.codigo)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: 13 }}
                >
                    Cadastrar
                </a>
            </div>
        );
    }

    return (
        <div className="logs-card card-erro">
            <div style={{ fontWeight: 600 }}>Erro ao buscar o código {entrada.codigo}</div>
            <div className="form-hint" style={{ margin: 0 }}>{hora} · tente bipar de novo</div>
        </div>
    );
}
