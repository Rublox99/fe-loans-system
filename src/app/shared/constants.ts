import { AppRoutesCollection } from "../core/interfaces/app-route.interface"
import { ProfessionOption } from "../core/interfaces/profession-option.interface"

const bPointMobile: string = '(max-width: 764px)'
const bPointTablet: string = '(max-width: 1024px)'
const bPointDesktop: string = '(min-width: 1025px)'

const APP_ROUTES: AppRoutesCollection = {
    login: {
        path: '/v1/auth',
        label: 'Auth'
    },
    entities: {
        path: '/v1/main/entities',
        label: 'Clientes'
    },
    loans: {
        path: '/v1/main/loans',
        label: 'Préstamos'
    },
    reports: {
        path: '/v1/main/reports',
        label: 'Reportes'
    }
}

const ICONS_DICTIONARY = {
    UNDEFINED: "", // This as an initializer only
    GEAR: "hugeicons:system-update-01",
    SIGN_OUT: "fluent:sign-out-20-regular",
    PAUSE: "material-symbols:pause",
    EDIT: "ic:baseline-edit",
    RESET: "ix:reset",
    USER: "tdesign:user-add-filled",
    SEE: "lets-icons:view-alt",
    EXCEL: "vscode-icons:file-type-excel",
    PDF: "qlementine-icons:file-pdf-24",
    VERIFIED: "material-symbols:verified",
    DOTS_HAMBURGUER: "mingcute:dots-fill",
    FILTER: "gridicons:filter",
    CALENDAR: "solar:calendar-linear",
    BILL: "ri:bill-line",
    SEARCH: "ic:baseline-search",
    UNDO: "material-symbols:undo",
    DOT: "icon-park-outline:dot",
    HOME: "lucide:house",
    BLOCK: "material-symbols:block",
    EXPORT: "ph:export-fill",
    IMPORT: "ri:import-fill",
    TABLE: "mynaui:table-solid",
    RIGHT_ARROW: "mdi-light:arrow-right",
    LEFT_ROUNDED_ARROW: "si:down-left-fill",
    RIGHT_ROUNDED_ARROW: "si:down-right-fill",
    MONEY: "tdesign:money",
    BANK: "mdi:bank",
    CLOSE: "ic:baseline-close",
    LOCK: "ri:lock-fill",
    COLLAPSE: "mingcute:down-line",
    HONDURAS: "emojione:flag-for-honduras"
} as const

export const PROFESSION_LIST: ProfessionOption[] = [
    { label: 'Abogado/a', value: 'abogado' },
    { label: 'Administrador/a', value: 'administrador' },
    { label: 'Agricultor/a', value: 'agricultor' },
    { label: 'Arquitecto/a', value: 'arquitecto' },
    { label: 'Comerciante', value: 'comerciante' },
    { label: 'Contador/a', value: 'contador' },
    { label: 'Docente / Maestro/a', value: 'docente' },
    { label: 'Economista', value: 'economista' },
    { label: 'Enfermero/a', value: 'enfermero' },
    { label: 'Ingeniero/a', value: 'ingeniero' },
    { label: 'Licenciado/a', value: 'licenciado' },
    { label: 'Médico/a', value: 'medico' },
    { label: 'Mecánico/a', value: 'mecanico' },
    { label: 'Periodista', value: 'periodista' },
    { label: 'Programador/a', value: 'programador' },
    { label: 'Psicólogo/a', value: 'psicologo' },
    { label: 'Servidor/a Público/a', value: 'servidor_publico' },
    { label: 'Técnico/a', value: 'tecnico' },
    { label: 'Vendedor/a', value: 'vendedor' },
    { label: 'Otro', value: 'otro' },
];

export type IconKeys = keyof typeof ICONS_DICTIONARY;
export type ScreenSize = 'mobile' | 'tablet' | 'desktop'
export type Themes = 'light' | 'dark'
export type Languages = 'en' | 'es'

export enum SUPABASE_BUCKETS {
    ENTITIES_GALLERIES = 'entities-galleries'
}

export {
    APP_ROUTES,
    ICONS_DICTIONARY,
    bPointMobile,
    bPointTablet,
    bPointDesktop
}

