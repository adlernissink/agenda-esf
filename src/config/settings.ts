// --- IDENTIDADE DO APP ---
export const APP_INFO = {
    name: 'Gestão eSF',
    version: '1.6.0',
    year: 2026,
    footerText: 'Sistema desenvolvido para ajudar equipes de Saúde da Família na gestão do cuidado.'
};

// --- LISTAS ADMINISTRATIVAS ---
export const PROFESSIONALS = [
    'Médico',
    'Enfermeira',
    'Técnica de Enfermagem'
];

export const MICROAREAS = [
    'Microárea 1 - ANGÉLICA',
    'Microárea 2 - JOCILENE',
    'Microárea 3 - FABIANA',
    'Microárea 4 - MONALISA',
    'Microárea 5 - JAILTON',
    'Microárea 6 - MARIA ROSA'
];

// --- LISTAS CLÍNICAS ---
export const CONDITIONS = [
    'HAS', 'DM', 'GESTANTE', 'SM', 'ACAMADO', 'TABAGISTA',
    'OBESIDADE', 'FIBROMIALGIA', 'TEA', 'DPOC', 'AVC', 'ASMA'
];

// Mapeamento de Cores (Tailwind)
export const TAG_STYLES: Record<string, string> = { 
    'HAS': 'bg-red-100 text-red-700 border-red-200', 
    'DM': 'bg-blue-100 text-blue-700 border-blue-200', 
    'GESTANTE': 'bg-pink-100 text-pink-700 border-pink-200', 
    'SM': 'bg-purple-100 text-purple-700 border-purple-200', 
    'ACAMADO': 'bg-slate-200 text-slate-700 border-slate-300', 
    'TABAGISTA': 'bg-orange-100 text-orange-700 border-orange-200',
    'OBESIDADE': 'bg-amber-100 text-amber-700 border-amber-200',
    'FIBROMIALGIA': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'TEA': 'bg-teal-100 text-teal-700 border-teal-200',
    'DPOC': 'bg-stone-100 text-stone-700 border-stone-200',
    'AVC': 'bg-rose-100 text-rose-700 border-rose-200',
    'ASMA': 'bg-sky-100 text-sky-700 border-sky-200'
};

// --- AGENDAMENTO ---
export const APPOINTMENT_TYPES = [
    { label: 'Rotina (20m)', value: 'Rotina', duration: 20 },
    { label: 'Pré-Natal (40m)', value: 'Pré-Natal', duration: 40 },
    { label: 'Primeira Consulta (30m)', value: 'Primeira Consulta', duration: 30 },
    { label: 'Saúde Mental (40m)', value: 'Saúde Mental', duration: 40 },
    { label: 'Exames (15m)', value: 'Exames', duration: 15 },
    { label: 'Procedimento (40m)', value: 'Infiltração', duration: 40 },
    { label: 'Esporão (20m)', value: 'Esporão', duration: 20 },
    { label: 'Lâmina (30m)', value: 'Lâmina', duration: 30 },
    { label: 'Puericultura (30m)', value: 'Puericultura', duration: 30 },
    { label: 'Renovação (5m)', value: 'Renovação', duration: 5 }
];

// --- MEDICAMENTOS ---
export const PRESCRIPTION_TYPES = [
    { label: 'Comum (Branca 1 via)', value: 'Comum' },
    { label: 'Controle Especial (Branca C - 2 vias)', value: 'C' },
    { label: 'Notificação B (Azul)', value: 'B' },
    { label: 'Notificação A (Amarela)', value: 'A' }
];