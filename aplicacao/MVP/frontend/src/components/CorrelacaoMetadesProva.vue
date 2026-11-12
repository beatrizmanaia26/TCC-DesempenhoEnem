<!-- ====grafico metades de caracteres da prova enviada - acerto médio por metade (≤ e > mediana) em cada nível de dificuldade, mesma regra do gráfico do ENEM -->
<template>
  <div class="metades-prova">
    <div class="metades-cabecalho">
      <h3 class="metades-titulo">Acerto por Quantidade de Caracteres e Nível de Dificuldade</h3>
      <InfoIcon warning :tooltip="tooltip" :largura="380" />

    </div>
    <p class="metades-subtitulo">
      Em cada nível, as questões são divididas pela mediana de caracteres. Cada barra mostra o percentual médio de acerto de uma dessas metades nesta prova.
    </p>

    <p v-if="grupos.length === 0" class="metades-status">{{ mensagemSemResultado }}</p>

    <svg
      v-else
      class="grafico-metades"
      :viewBox="`0 0 ${LARGURA} ${ALTURA}`"
      role="img"
      aria-label="Gráfico de barras agrupadas da porcentagem de acerto por quantidade de caracteres, em cada nível de dificuldade, nesta prova"
    >
      <line :x1="MARGEM_ESQ" :y1="yDe(0)" :x2="LARGURA - MARGEM_DIR" :y2="yDe(0)" class="eixo" />

      <text
        v-for="marca in MARCAS_EIXO"
        :key="`marca-${marca}`"
        :x="MARGEM_ESQ - 10"
        :y="yDe(marca) + 4"
        class="rotulo-eixo"
        text-anchor="end"
      >{{ marca }}%</text>

      <g v-for="grupo in grupos" :key="grupo.nivel">
        <g v-for="(metade, j) in grupo.metades" :key="metade.chave" class="barra-metade">
          <title>{{ metade.tooltip }}</title>
          <rect
            :x="xDaBarra(grupo.indice, j)"
            :y="yDe(metade.acerto)"
            :width="LARGURA_BARRA"
            :height="Math.max(0, yDe(0) - yDe(metade.acerto))"
            :fill="metade.cor"
          />
          <text
            :x="xDaBarra(grupo.indice, j) + LARGURA_BARRA / 2"
            :y="yDe(metade.acerto) - 6"
            class="valor-barra"
            text-anchor="middle"
          >{{ metade.acerto.toFixed(1) }}%</text>
          <text
            :x="xDaBarra(grupo.indice, j) + LARGURA_BARRA / 2"
            :y="yDe(0) + 16"
            class="caracteres-barra"
            text-anchor="middle"
          >{{ metade.caracteresRotulo }}</text>
        </g>
        <text
          :x="xDoNivel(grupo.indice) + LARGURA_GRUPO / 2"
          :y="ALTURA - 12"
          class="rotulo-nivel"
          text-anchor="middle"
        >{{ grupo.rotulo }}</text>
      </g>

      <g class="legenda">
        <rect :x="LARGURA / 2 - 190" :y="8" width="12" height="12" :fill="COR_MENOS" />
        <text :x="LARGURA / 2 - 174" :y="18" class="rotulo-legenda">Menos caracteres (≤ mediana)</text>
        <rect :x="LARGURA / 2 + 10" :y="8" width="12" height="12" :fill="COR_MAIS" />
        <text :x="LARGURA / 2 + 26" :y="18" class="rotulo-legenda">Mais caracteres (&gt; mediana)</text>
      </g>
    </svg>

    <ul v-if="grupos.length > 0" class="metades-legenda">
      <li>O nível de dificuldade é o informado no formulário. As questões são divididas pela mediana de caracteres dentro de cada nível.</li>
      <li>Com poucas questões por nível, a média de acerto de cada metade varia bastante. Compare as barras dentro do mesmo gráfico.</li>
    </ul>
  </div>
</template>


<script setup>
import { computed, ref } from 'vue'
import InfoIcon from './icons/InfoIcon.vue'
import FilterIcon from './icons/FilterIcon.vue'

// questoes: [{ rotulo, caracteres, taxa_acerto_percentual, dificuldade }], na ordem da prova
const props = defineProps({
  questoes: {
    type: Array,
    default: () => []
  }
})

// Níveis do formulário (facil, medio, dificil); o rótulo exibido é Média
const NIVEIS = [
  { chave: 'facil', rotulo: 'Fácil' },
  { chave: 'medio', rotulo: 'Média' },
  { chave: 'dificil', rotulo: 'Difícil' }
]

const opcoesDificuldade = [
  { valor: 'todas', rotulo: 'Todas' },
  ...NIVEIS.map((nivel) => ({ valor: nivel.chave, rotulo: nivel.rotulo }))
]

// Filtro aplicado (usado no gráfico) e rascunho (muda só enquanto o menu está aberto)
const mostrarFiltro = ref(false)
const filtroDificuldade = ref('todas')
const rascunhoDificuldade = ref('todas')

const alternarMenuFiltro = () => {
  if (!mostrarFiltro.value) {
    rascunhoDificuldade.value = filtroDificuldade.value
  }
  mostrarFiltro.value = !mostrarFiltro.value
}

const aplicarFiltro = () => {
  filtroDificuldade.value = rascunhoDificuldade.value
  mostrarFiltro.value = false
}

// Layout do SVG (unidades do viewBox)
const LARGURA = 760
const ALTURA = 380
const MARGEM_ESQ = 60
const MARGEM_DIR = 20
const MARGEM_TOPO = 60
const MARGEM_BASE = 40
const LARGURA_BARRA = 70
const ESPACO_ENTRE_BARRAS = 8
const LARGURA_GRUPO = LARGURA_BARRA * 2 + ESPACO_ENTRE_BARRAS
const MARCAS_EIXO = [0, 20, 40, 60, 80, 100]

// Azul para menos caracteres, verde para mais caracteres (mesmas cores do gráfico do ENEM)
const COR_MENOS = '#0070C0'
const COR_MAIS = '#10B981'

const tooltip = [
  'Para cada nível, as questões são divididas pela mediana de caracteres do próprio nível.',
  '',
  'Cada barra é a média de acerto (taxa informada por questão) das questões daquela metade.',
  '',
  'Filtro: escolha um nível para ver só as questões dele. Sem filtro, mostra os três níveis.'
].join('\n')

const mensagemSemResultado = computed(() =>
  'Informe os acertos por questão (em "Deseja incluir métricas dos estudantes?") e a dificuldade de cada questão para ver este gráfico.'
)

// Questões com acerto informado e nível definido
const questoesValidas = computed(() => props.questoes.filter((questao) => {
  const taxa = questao.taxa_acerto_percentual
  const temTaxa = taxa !== null && taxa !== undefined && Number.isFinite(Number(taxa))
  return temTaxa && NIVEIS.some((nivel) => nivel.chave === questao.dificuldade)
}))

// Mediana de um vetor (média dos dois centrais quando o tamanho é par)
function mediana(valores) {
  const ordenados = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(ordenados.length / 2)
  return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2
}

const media = (valores) => valores.reduce((soma, valor) => soma + valor, 0) / valores.length

function resumoDaMetade(questoes) {
  return {
    acerto: media(questoes.map((questao) => Number(questao.taxa_acerto_percentual))),
    caracteresMedio: media(questoes.map((questao) => Number(questao.caracteres) || 0)),
    n: questoes.length
  }
}

// Metades de um nível, como no ENEM: menos (<= mediana) e mais (> mediana); precisa ter as duas
function resumoDoNivel(questoesDoNivel) {
  if (questoesDoNivel.length < 2) return null
  const medianaCaracteres = mediana(questoesDoNivel.map((questao) => Number(questao.caracteres) || 0))
  const menos = questoesDoNivel.filter((questao) => (Number(questao.caracteres) || 0) <= medianaCaracteres)
  const mais = questoesDoNivel.filter((questao) => (Number(questao.caracteres) || 0) > medianaCaracteres)
  if (menos.length === 0 || mais.length === 0) return null
  return { mediana: medianaCaracteres, menos: resumoDaMetade(menos), mais: resumoDaMetade(mais) }
}

// Tooltip com a faixa da mediana, o acerto médio, os caracteres médios e o n
function montarMetade(resumo, chave, rotulo, cor) {
  const dados = resumo[chave]
  const faixa = chave === 'menos'
    ? `≤ ${resumo.mediana.toFixed(0)} caracteres`
    : `> ${resumo.mediana.toFixed(0)} caracteres`
  return {
    chave,
    cor,
    acerto: dados.acerto,
    caracteresRotulo: `${Math.round(dados.caracteresMedio)} car.`,
    tooltip:
      `${rotulo} · ${faixa}\n` +
      `Caracteres médios: ${Math.round(dados.caracteresMedio)}\n` +
      `Acerto médio: ${dados.acerto.toFixed(1)}%\n` +
      `Questões: ${dados.n}`
  }
}

// Um grupo por nível, com as duas metades; o filtro escolhe quais níveis aparecem
const grupos = computed(() => NIVEIS
  .map((nivel, indice) => ({ nivel, indice }))
  .filter(({ nivel }) => filtroDificuldade.value === 'todas' || filtroDificuldade.value === nivel.chave)
  .map(({ nivel, indice }) => {
    const resumo = resumoDoNivel(questoesValidas.value.filter((questao) => questao.dificuldade === nivel.chave))
    if (!resumo) return null
    return {
      indice,
      nivel: nivel.chave,
      rotulo: nivel.rotulo,
      metades: [
        montarMetade(resumo, 'menos', 'Menos caracteres', COR_MENOS),
        montarMetade(resumo, 'mais', 'Mais caracteres', COR_MAIS)
      ]
    }
  })
  .filter(Boolean))

// Converte porcentagem de acerto (0 a 100) em coordenada y
function yDe(valor) {
  const alturaUtil = ALTURA - MARGEM_TOPO - MARGEM_BASE
  return MARGEM_TOPO + ((100 - valor) / 100) * alturaUtil
}

// Posição fixa dos três níveis, mesmo quando o filtro mostra só um
function xDoNivel(indice) {
  const larguraUtil = LARGURA - MARGEM_ESQ - MARGEM_DIR
  const espaco = larguraUtil / NIVEIS.length
  return MARGEM_ESQ + espaco * indice + (espaco - LARGURA_GRUPO) / 2
}

function xDaBarra(indiceNivel, indiceMetade) {
  return xDoNivel(indiceNivel) + indiceMetade * (LARGURA_BARRA + ESPACO_ENTRE_BARRAS)
}
</script>

<style scoped>
.metades-prova {
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  margin: 1.5rem 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.metades-cabecalho {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.metades-titulo {
  margin: 0;
  color: #333;
}

.metades-subtitulo {
  margin: 0 0 1rem;
  color: #666;
  font-size: 0.9rem;
}

.metades-status {
  padding: 1rem 0;
  color: #666;
}

.grafico-metades {
  display: block;
  width: 100%;
  max-width: 800px;
  height: auto;
  margin: 0 auto;
}

.eixo {
  stroke: #999999;
  stroke-width: 1;
}

.rotulo-eixo,
.rotulo-nivel {
  fill: #333;
  font-size: 13px;
}

.valor-barra {
  fill: #333;
  font-size: 13px;
  font-weight: 600;
}

.caracteres-barra {
  fill: #666;
  font-size: 11px;
}

.rotulo-legenda {
  fill: #333;
  font-size: 12px;
}

.metades-legenda {
  margin: 1rem 0 0;
  padding-left: 1.2rem;
  color: #555;
  font-size: 0.85rem;
}

/* Filtro: mesmo estilo do filtro do gráfico de metades do ENEM */
.filter-wrapper {
  position: relative;
  display: inline-block;
  margin-left: auto;
}

.filter-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  padding: 1rem;
  margin-top: 0.5rem;
  min-width: 280px;
  z-index: 100;
}

.filter-secao + .filter-secao {
  margin-top: 1rem;
  border-top: 1px solid #e0e0e0;
  padding-top: 1rem;
}

.filter-titulo {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #555;
}

.filter-lista {
  /* 2 opções visíveis por seção (cada .filter-option tem 2.25rem); o restante rola */
  max-height: 4.5rem;
  overflow-y: auto;
}

.filter-option {
  display: flex;
  align-items: center;
  height: 2.25rem;
  padding: 0 0.75rem;
  margin: 0;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.filter-option:hover {
  background: #f5f5f5;
}

.filter-option input {
  margin-right: 0.75rem;
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #0070C0;
}

.filter-option label {
  cursor: pointer;
  margin: 0;
  font-size: 0.95rem;
  color: #333;
  flex: 1;
}

.filter-rodape {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.filter-aplicar {
  background: #0070C0;
  color: white;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s ease;
}

.filter-aplicar:hover {
  background: #005a9e;
}
</style>
