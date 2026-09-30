// Paleta e tokens de design do app — extraídos da logo da
// Internacional Travessias (azul-marinho, verde, branco). Mesma
// paleta usada no painel web (ver web/src/app/globals.css), pra
// manter os dois com a mesma identidade visual.

export const colors = {
    primary: '#0B3B60',
    primaryDark: '#082A46',
    primaryLight: '#14507F',
    accent: '#7CC142',
    accentDark: '#5FA82E',
    accentLight: '#E8F5DB',

    bg: '#F3F5F7',
    surface: '#FFFFFF',
    text: '#16222B',
    textMuted: '#5B6B79',
    border: '#E1E6EA',

    danger: '#D64545',
    dangerBg: '#FDECEC',
    warning: '#C98A1F',
    warningBg: '#FDF3E0',

    white: '#FFFFFF',
};

export const situacaoInfo = {
    bom: { bg: colors.accentLight, cor: colors.accentDark, rotulo: 'Bom' },
    ruim: { bg: colors.dangerBg, cor: colors.danger, rotulo: 'Ruim' },
};

export function infoSituacao(situacao) {
    return situacaoInfo[situacao] ?? { bg: '#EEF0F2', cor: colors.textMuted, rotulo: situacao ?? '—' };
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 };

export const shadow = {
    shadowColor: '#0B3B60',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
};

export const typography = {
    title: { fontSize: 22, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textMuted },
    label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
    body: { fontSize: 15, color: colors.text },
};
