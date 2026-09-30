import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
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
                <AuthProvider>
                    <Nav />
                    <main className="page">{children}</main>
                </AuthProvider>
            </body>
        </html>
    );
}
