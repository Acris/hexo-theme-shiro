/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './layout/**/*.njk',
        './source/js/**/*.js'
    ],
    theme: {
        extend: {
            colors: {
                paper: '#ffffff',
                ink: '#2b3036',
                seal: '#b0171a',
            },
            fontFamily: {
                sans: ['"Shippori Mincho"', '"Noto Serif JP"', 'ui-serif', 'Georgia', '"Times New Roman"', 'serif'],
                serif: ['"Shippori Mincho"', '"Noto Serif JP"', 'ui-serif', 'Georgia', '"Times New Roman"', 'serif'],
                title: ['"Yuji Syuku"', '"Shippori Mincho"', 'ui-serif', 'serif'],
                eng: ['"EB Garamond"', '"Cormorant Garamond"', 'ui-serif', 'serif'],
            }
        },
        typography: (theme) => ({
            DEFAULT: {
                css: {
                    'h1, h2, h3, h4': {
                        color: theme('colors.ink'),
                        fontFamily: theme('fontFamily.title'),
                        fontWeight: '700',
                    },
                    'h1': {
                        fontSize: '2.25em',
                        marginTop: '0',
                        marginBottom: '0.8888889em',
                        lineHeight: '1.1111111',
                    },
                    'h2': {
                        fontSize: '1.5em',
                        marginTop: '2em',
                        marginBottom: '1em',
                        lineHeight: '1.3333333',
                        borderBottom: `1px solid ${theme('colors.slate.200')}`,
                        paddingBottom: '0.3em',
                    },
                    'h3': {
                        fontSize: '1.25em',
                        marginTop: '1.6em',
                        marginBottom: '0.6em',
                        lineHeight: '1.6',
                    },
                    'h4': {
                        marginTop: '1.5em',
                        marginBottom: '0.5em',
                        lineHeight: '1.5',
                    },
                    'a': {
                        color: theme('colors.slate.800'),
                        textDecoration: 'none',
                        borderBottom: `1px solid ${theme('colors.slate.300')}`,
                        transition: 'all 0.2s',
                        '&:hover': {
                            color: theme('colors.seal'),
                            borderBottomColor: theme('colors.seal'),
                        },
                    },
                    'blockquote': {
                        fontWeight: '500',
                        fontStyle: 'italic',
                        color: theme('colors.slate.600'),
                        borderLeftWidth: '0.25rem',
                        borderLeftColor: theme('colors.slate.300'),
                        quotes: '"\\201C""\\201D""\\2018""\\2019"',
                        marginTop: '1.6em',
                        marginBottom: '1.6em',
                        paddingLeft: '1em',
                    },
                    'strong': {
                        color: theme('colors.ink'),
                        fontWeight: '600',
                    },
                    'code': {
                        color: theme('colors.seal'),
                        fontWeight: '700',
                        fontSize: '0.875em',
                        fontFamily: theme('fontFamily.eng'),
                        paddingLeft: '0.25em',
                        paddingRight: '0.25em',
                    },
                    'code::before': {
                        content: 'none',
                    },
                    'code::after': {
                        content: 'none',
                    },
                    'img': {
                        marginTop: '2em',
                        marginBottom: '2em',
                        borderRadius: theme('borderRadius.lg'),
                        boxShadow: theme('boxShadow.md'),
                    },
                    'hr': {
                        borderColor: theme('colors.slate.200'),
                        marginTop: '3em',
                        marginBottom: '3em',
                    },
                    'p': {
                        marginTop: '1.25em',
                        marginBottom: '1.25em',
                        lineHeight: '1.9',
                        textAlign: 'justify',
                    },
                    'ul': {
                        marginTop: '1.25em',
                        marginBottom: '1.25em',
                        listStyleType: 'disc',
                        paddingLeft: '1.625em',
                    },
                    'ol': {
                        marginTop: '1.25em',
                        marginBottom: '1.25em',
                        listStyleType: 'decimal',
                        paddingLeft: '1.625em',
                    },
                    'li': {
                        marginTop: '0.5em',
                        marginBottom: '0.5em',
                        paddingLeft: '0.375em',
                    },
                    // Fix for Hexo's highlight.js line numbers and code block alignment
                    '.highlight': {
                        backgroundColor: theme('colors.slate.50'),
                        color: theme('colors.slate.700'),
                        overflowX: 'auto',
                        borderRadius: theme('borderRadius.lg'),
                        marginTop: '1.5em',
                        marginBottom: '1.5em',
                        boxShadow: theme('boxShadow.sm'),
                        border: `1px solid ${theme('colors.slate.100')}`,
                    },
                    '.highlight table': {
                        width: '100%',
                        borderCollapse: 'collapse',
                        marginTop: '0',
                        marginBottom: '0',
                    },
                    '.highlight td': {
                        padding: '0',
                        border: 'none',
                    },
                    '.highlight td.gutter': {
                        width: '2.5rem',
                        minWidth: '2.5rem',
                        padding: '0.75rem 0.5rem 0.75rem 0',
                        textAlign: 'right',
                        color: theme('colors.slate.400'),
                        backgroundColor: theme('colors.slate.100'),
                        borderRight: `1px solid ${theme('colors.slate.200')}`,
                        userSelect: 'none',
                    },
                    '.highlight td.code': {
                        padding: '0.75rem 0 0.75rem 1rem',
                        width: '100%',
                    },
                    // Ensure pre inside highlight matches perfectly
                    '.highlight pre': {
                        margin: '0',
                        padding: '0',
                        backgroundColor: 'transparent',
                        overflow: 'visible',
                        fontSize: '0.875rem',
                        lineHeight: '1.7142857', // relaxed
                    },
                },
            },
        }),
    },

    plugins: [
        require('@tailwindcss/typography'),
    ],
}
