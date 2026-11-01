// Cores de caderno de cada ano e dia, na ordem da prova (Amarelo, Azul, Branco/Cinza, Rosa/Verde).
// Em 2024 e 2025 a quarta cor é Verde no lugar de Rosa. No Dia 1 a terceira cor é Branco; no Dia 2, Cinza.
// Os nomes batem com os de CORES_POR_ANO no backend (server.js), que aceita Cinza como alias de Branco.
export const CORES_POR_ANO_DIA = {
  2020: { 1: ['Amarelo', 'Azul', 'Branco', 'Rosa'], 2: ['Amarelo', 'Azul', 'Cinza', 'Rosa'] },
  2022: { 1: ['Amarelo', 'Azul', 'Branco', 'Rosa'], 2: ['Amarelo', 'Azul', 'Cinza', 'Rosa'] },
  2023: { 1: ['Amarelo', 'Azul', 'Branco', 'Rosa'], 2: ['Amarelo', 'Azul', 'Cinza', 'Rosa'] },
  2024: { 1: ['Amarelo', 'Azul', 'Branco', 'Verde'], 2: ['Amarelo', 'Azul', 'Cinza', 'Verde'] },
  2025: { 1: ['Amarelo', 'Azul', 'Branco', 'Verde'], 2: ['Amarelo', 'Azul', 'Cinza', 'Verde'] }
}

// Opções do filtro COR para um ano e um filtro de dia ('todos', 1 ou 2).
// Com "Todos os dias", cada cor aparece uma vez, mesmo que exista nos dois dias (ex.: Azul).
// Branco (Dia 1) e Cinza (Dia 2) são cores diferentes e aparecem separadas.
export function opcoesCorDoAno(ano, dia = 'todos') {
  const porDia = CORES_POR_ANO_DIA[ano]
  if (!porDia) return []

  const dias = dia === 'todos' ? [1, 2] : [Number(dia)]
  const opcoes = []
  for (const d of dias) {
    for (const cor of porDia[d] ?? []) {
      if (!opcoes.some((opcao) => opcao.valor === cor)) {
        opcoes.push({ valor: cor, rotulo: cor })
      }
    }
  }
  return opcoes
}
