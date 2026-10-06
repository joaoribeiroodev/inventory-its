import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import Nav from '../components/Nav';
import './globals.css';

export const metadata = {
    title: 'Inventário ITS',
    description: 'Controle de inventário — Internacional Travessias',
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
};

export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR">
            <body>
                <ToastProvider>
                    <AuthProvider>
                        <Nav />
                        <main className="page">{children}</main>
                    </AuthProvider>
                </ToastProvider>
            </body>
        </html>
    );
}
