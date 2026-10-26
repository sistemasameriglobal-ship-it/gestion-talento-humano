import { Award, Medal } from 'lucide-react'
import { iniciales } from '../../utils/productividadHelpers'

export default function ProductividadPodio({ cfg, etiquetaPeriodo, top3, statsPeriodo }) {
  const renderItem = (persona, clase, medalla) => {
    if (!persona) return null
    const st = statsPeriodo(persona)
    return (
      <div className={`pr-podio-item ${clase}`}>
        {medalla && <Medal size={16} color="#F59E0B" />}
        <div className="pr-podio-avatar">{iniciales(persona.nombre)}</div>
        <span className="pr-podio-name">{persona.nombre}</span>
        <span className="pr-podio-total">{cfg.usaClientes ? st.totalGen : st.resu}</span>
        {cfg.usaClientes && (
          <span className="ci-podio-sub">
            {st.frios > 0 ? `${st.resu} asig. + ${st.frios} fríos` : `de ${st.asig} asignados`} ({st.pct}%)
          </span>
        )}
        <div className="pr-podio-bar" />
      </div>
    )
  }

  return (
    <div className="pr-card">
      <div className="pr-card-head">
        <span className="pr-card-title"><Award size={16} /> Top 3 {etiquetaPeriodo}</span>
        {cfg.usaClientes && <span className="pr-count">Clasificación por clientes resueltos</span>}
      </div>
      <div className="pr-podio">
        {renderItem(top3[1], 'pr-podio-2', false)}
        {renderItem(top3[0], 'pr-podio-1', true)}
        {renderItem(top3[2], 'pr-podio-3', false)}
      </div>
    </div>
  )
}
