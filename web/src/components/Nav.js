'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

const LINKS = [
    { href: '/scanner', label: 'Bipar' },
    { href: '/itens', label: 'Itens' },
    { href: '/setores', label: 'Setores' },
    { href: '/lotes', label: 'Etiquetas' },
];

export default function Nav() {
    const { usuario, logout } = useAuth();
    const pathname = usePathname();
    const [menuAberto, setMenuAberto] = useState(false);

    if (!usuario) return null;

    const links =
        usuario.papel === 'admin'
            ? [...LINKS, { href: '/usuarios', label: 'Usuários' }, { href: '/logs', label: 'Monitoramento' }]
            : LINKS;

    function isAtivo(href) {
        return pathname === href || pathname.startsWith(`${href}/`);
    }

    function fecharMenu() {
        setMenuAberto(false);
    }

    return (
        <header className="nav">
            <div className="nav-inner">
                <Link href="/itens" className="nav-brand" onClick={fecharMenu}>
                    <img src="/logo.png" alt="Internacional Travessias" />
                    <span className="nav-brand-text">
                        <span className="nav-brand-title">Inventário ITS</span>
                        <span className="nav-brand-subtitle">Internacional Travessias</span>
                    </span>
                </Link>

                <nav className="nav-links nav-links-desktop">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`nav-link${isAtivo(link.href) ? ' active' : ''}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="nav-links nav-links-desktop">
                    <div className="nav-user">
                        <span className="nav-user-badge">{usuario.papel}</span>
                        <span>{usuario.nome}</span>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={logout}>
                        Sair
                    </button>
                </div>

                <button
                    className="nav-toggle"
                    aria-label="Abrir menu"
                    onClick={() => setMenuAberto((v) => !v)}
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>

            <div className={`nav-mobile-panel${menuAberto ? ' open' : ''}`}>
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`nav-link${isAtivo(link.href) ? ' active' : ''}`}
                        onClick={fecharMenu}
                    >
                        {link.label}
                    </Link>
                ))}
                <div className="nav-user" style={{ margin: '8px 0', color: 'rgba(255,255,255,0.85)' }}>
                    <span className="nav-user-badge">{usuario.papel}</span>
                    <span>{usuario.nome}</span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => { fecharMenu(); logout(); }}>
                    Sair
                </button>
            </div>
        </header>
    );
}
