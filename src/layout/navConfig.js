import {
  LayoutDashboard, FileText, Users, UserCog,
  ParkingCircle, Sun, ShieldCheck, ShieldAlert, TrendingUp, Activity,
} from 'lucide-react'

// ── Estructura de navegación agrupada ────────────────────────────────────────
export const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard',      label: 'Dashboard',           icon: LayoutDashboard, emoji: '🏠' },
      { id: 'novedades',      label: 'Novedades',           icon: FileText,        emoji: '📋' },
      { id: 'disciplinarios', label: 'Proc. disciplinarios', icon: ShieldAlert,    emoji: '⚖️' },
      { id: 'vacaciones',     label: 'Vacaciones',          icon: Sun,             emoji: '🌴' },
    ],
  },
  {
    label: 'Recursos',
    items: [
      { id: 'empleados',     label: 'Empleados',     icon: UserCog, emoji: '👥' },
      { id: 'colaboradores', label: 'Colaboradores', icon: Users,   emoji: '🤝' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { id: 'parqueadero', label: 'Parqueadero', icon: ParkingCircle, emoji: '🅿️' },
    ],
  },
  {
    label: 'Productividad',
    items: [
      { id: 'productividad', label: 'Productividad General', icon: TrendingUp, emoji: '📈' },
    ],
  },
]

export const ADMIN_SECTION = {
  label: 'Admin',
  items: [
    { id: 'usuarios', label: 'Usuarios', icon: ShieldCheck, emoji: '🔐' },
    { id: 'sistema',  label: 'Sistema',  icon: Activity,    emoji: '🖥️' },
  ],
}
