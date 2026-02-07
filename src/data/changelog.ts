export interface Version {
    version: string;
    date: string;
    changes: string[];
    type: 'major' | 'minor' | 'patch';
}

export const appVersions: Version[] = [
    {
        version: '1.5.0',
        date: '07/02/2026',
        type: 'major',
        changes: [
            '🚀 Refatoração completa do sistema para Vue.js + Vite.',
            '✨ Nova interface mais rápida e reativa, com inclusão da aba "Mural da Equipe" para avisos, lembretes e comunicados internos.',
            '🛡️ Segurança reforçada com TypeScript.',
            '📋 Prontuário visual integrado ao card do paciente e ícone de "observação" nos blocos de agendamento, visando menos poluição visual.'
        ]
    },
    {
        version: '1.4.2',
        date: '05/02/2026',
        type: 'minor',
        changes: [
            '🌙 Adicionado Modo Escuro (Dark Mode).',
            '📱 Melhorias na responsividade para celulares.',
            '🔒 Bloqueio manual de dias na agenda de acordo com o profissional selecionado no filtro.',
            '📊 Gráficos de relatórios básicos.'
        ]
    },
    {
        version: '1.3.0',
        date: '24/01/2026',
        type: 'major',
        changes: [
            '🎉 Lançamento inicial da plataforma Gestão eSF para uso da equipe 10.',
            '📅 Agenda básica e cadastro de pacientes.',
            '☁️ Integração com Firebase para segurança e banco de dados.'
        ]
    }
];