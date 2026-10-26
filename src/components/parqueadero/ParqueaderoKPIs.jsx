import { ParkingSquare, Car, Bike, BadgeCheck, Send } from 'lucide-react'
import KpiCard, { KpiGrid } from '../ui/KpiCard'

export default function ParqueaderoKPIs({
  rowsBase, carros, motos, bicicletas = 0, exentos, total, sinReporte,
  mesBase, anioBase, mesActual, anioActual, filterTab,
  setFilterTab, setFilterTipo, setFilterMes, setFilterAnio, setPage,
}) {
  const kpis = [
    {
      label: 'Total registros', val: rowsBase.length, sub: `${mesBase} ${anioBase}`, icon: ParkingSquare, tone: 'default',
      activo: filterTab === '',
      onClick: () => { setFilterTab(''); setFilterTipo(''); setPage(1) },
    },
    {
      label: 'Carros', val: carros, sub: `${((carros / total) * 100).toFixed(0)}% · ${mesBase} ${anioBase}`, icon: Car, tone: 'info',
      activo: filterTab === 'CARRO',
      onClick: () => { setFilterTab('CARRO'); setFilterTipo(''); setPage(1) },
    },
    {
      label: 'Motos', val: motos, sub: `${total > 0 ? ((motos / total) * 100).toFixed(0) : 0}% · ${mesBase} ${anioBase}`, icon: Bike, tone: 'warning',
      activo: filterTab === 'MOTO',
      onClick: () => { setFilterTab('MOTO'); setFilterTipo(''); setPage(1) },
    },
    {
      label: 'Bicicletas', val: bicicletas, sub: `${total > 0 ? ((bicicletas / total) * 100).toFixed(0) : 0}% · ${mesBase} ${anioBase}`, icon: Bike, tone: 'success',
      activo: filterTab === 'BICICLETA',
      onClick: () => { setFilterTab('BICICLETA'); setFilterTipo(''); setPage(1) },
    },
    {
      label: 'Exentos de pago', val: exentos, sub: `${((exentos / total) * 100).toFixed(0)}% · ${mesBase} ${anioBase}`, icon: BadgeCheck, tone: 'success',
      activo: filterTab === 'exentos',
      onClick: () => { setFilterTab('exentos'); setFilterTipo(''); setPage(1) },
    },
    {
      label: 'Sin reporte', val: sinReporte, sub: `en ${mesActual}`, icon: Send, tone: sinReporte > 0 ? 'purple' : 'success',
      activo: filterTab === 'sin_rep',
      onClick: () => { setFilterTab('sin_rep'); setFilterMes(mesActual); setFilterAnio(anioActual); setPage(1) },
    },
  ]

  return (
    <KpiGrid>
      {kpis.map(k => (
        <KpiCard key={k.label} label={k.label} value={k.val} sub={k.sub} icon={k.icon} tone={k.tone} active={k.activo} onClick={k.onClick} />
      ))}
    </KpiGrid>
  )
}
