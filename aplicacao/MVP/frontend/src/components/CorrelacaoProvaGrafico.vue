<!-- ====grafico correlacao da prova enviada - dispersão caracteres × acerto por questão, com curva logística, IC 95% e cor por dificuldade -->
<template>
  <div class="correlacao-prova">
    <div class="correlacao-cabecalho">
      <h3 class="correlacao-titulo">Dispersão: Caracteres da Questão × Acerto</h3>
      <InfoIcon warning :tooltip="tooltip" :largura="380" />
      <div class="filter-wrapper">
        <button type="button" class="filter-btn" @click="alternarMenuFiltro">
          <FilterIcon />
          Filtro
        </button>
        <div v-if="mostrarFiltro" class="filter-menu">
          <div class="filter-secao">
            <p class="filter-titulo">DIFICULDADE</p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesDificuldade" :key="`dificuldade-prova-${opcao.valor}`">
                <input
                  type="radio"
                  name="filtro-dificuldade-prova"
                  :id="`prova-dificuldade-${opcao.valor}`"
                  :checked="rascunhoDificuldade === opcao.valor"
                  @change="rascunhoDificuldade = opcao.valor"
                />
                <label :for="`prova-dificuldade-${opcao.valor}`">{{ opcao.rotulo }}</label>
              </div>
            </div>
          </div>

          <div class="filter-rodape">
            <button type="button" class="filter-aplicar" @click="aplicarFiltro">Aplicar</button>
          </div>
        </div>
      </div>
    </div>
    <p class="correlacao-subtitulo">
      Cada ponto é uma questão, colorido pelo nível de dificuldade (questões sem nível informado aparecem em cinza). A curva mostra a probabilidade de acerto prevista pelo <a :href="URL_MODELO_LOGISTICO" target="_blank" rel="noopener noreferrer" class="link-modelo">modelo logístico</a> para cada tamanho de questão, da mais curta à mais longa desta prova. A faixa em volta da curva é o <a :href="URL_INTERVALO_CONFIANCA" target="_blank" rel="noopener noreferrer" class="link-conceito">intervalo de confiança</a> de 95%, calculado na escala logística e sempre entre 0% e 100%.
    </p>

    <p v-if="!resultado" class="correlacao-status">{{ mensagemSemResultado }}</p>

    <template v-else>
      <div class="correlacao-aviso" role="note">
        <strong>Atenção:</strong> este resultado usa {{ resultado.n }} questões e os acertos de uma única aplicação.
        Com amostras pequenas, o p pode não ser significativo mesmo quando há relação real, e o resultado não
        é comparável ao ENEM, que usa milhares de participantes e várias provas.
      </div>

      <svg
        class="grafico-correlacao"
        :viewBox="`0 0 ${LARGURA} ${ALTURA}`"
        role="img"
        aria-label="Gráfico de dispersão do percentual de acerto pelo tamanho em caracteres de cada questão desta prova, colorido pelo nível de dificuldade, com a curva logística e o intervalo de confiança de 95%"
      >
        <line :x1="MARGEM_ESQ" :y1="yDe(0)" :x2="LARGURA - MARGEM_DIR" :y2="yDe(0)" class="eixo" />
        <line :x1="MARGEM_ESQ" :y1="yDe(0)" :x2="MARGEM_ESQ" :y2="yDe(100)" class="eixo" />
        <text :x="MARGEM_ESQ" :y="MARGEM_TOPO - 8" class="rotulo-eixo">Acerto</text>

        <text
          v-for="marca in MARCAS_Y"
          :key="`y-${marca}`"
          :x="MARGEM_ESQ - 8"
          :y="yDe(marca) + 4"
          class="rotulo-eixo"
          text-anchor="end"
        >{{ marca }}%</text>

        <text
          v-for="marca in marcasX"
          :key="`x-${marca}`"
          :x="xDe(marca)"
          :y="yDe(0) + 18"
          class="rotulo-eixo"
          text-anchor="middle"
        >{{ marca }}</text>
        <text :x="LARGURA / 2" :y="ALTURA - 6" class="rotulo-eixo" text-anchor="middle">Caracteres da questão</text>

        <defs>
          <clipPath id="area-grafico-prova">
            <rect :x="MARGEM_ESQ" :y="MARGEM_TOPO" :width="LARGURA_UTIL" :height="ALTURA_UTIL" />
          </clipPath>
        </defs>

        <g clip-path="url(#area-grafico-prova)">
          <polygon v-if="faixaIc" :points="faixaIc" class="faixa-ic" />
          <polyline v-if="pontosReta" :points="pontosReta" class="reta" />
        </g>

        <circle
          v-for="ponto in pontosSvg"
          :key="ponto.rotulo"
          :cx="ponto.cx"
          :cy="ponto.cy"
          r="5"
          :fill="ponto.cor"
          class="ponto"
        >
          <title>{{ ponto.tooltip }}</title>
        </circle>
      </svg>

      <p v-if="temPontoSemDificuldade" class="correlacao-aviso-dificuldade" role="note">
        A dificuldade não foi informada para todas as questões. Os pontos sem nível aparecem em cinza. Para colori-los por fácil, média e difícil, marque "Deseja usar a dificuldade das questões para a análise?" no formulário.
      </p>

      <ul class="correlacao-legenda">
        <li v-for="nivel in NIVEIS" :key="nivel.chave">
          <span class="cor-nivel" :style="{ background: nivel.cor }"></span>{{ nivel.rotulo }}
        </li>
        <li v-if="temPontoSemDificuldade">
          <span class="cor-nivel" :style="{ background: COR_SEM_NIVEL }"></span>Dificuldade não informada
        </li>
        <li><span class="linha-reta"></span>Curva logística e faixa de <a :href="URL_INTERVALO_CONFIANCA" target="_blank" rel="noopener noreferrer" class="link-conceito">Intervalo de Confiança</a> (IC) 95%</li>
      </ul>

      <p class="correlacao-resumo"><template v-for="(parte, indice) in resumoPartes" :key="`resumo-${indice}`"><a v-if="typeof parte === 'object'" :href="parte.url" target="_blank" rel="noopener noreferrer" class="link-conceito">{{ parte.texto }}</a><template v-else>{{ parte }}</template></template></p>
      <ul class="correlacao-notas">
        <li v-for="(partes, indice) in NOTAS_CORRELACAO" :key="indice"><template v-for="(parte, sub) in partes" :key="`nota-${indice}-${sub}`"><a v-if="typeof parte === 'object'" :href="parte.url" target="_blank" rel="noopener noreferrer" class="link-conceito">{{ parte.texto }}</a><template v-else>{{ parte }}</template></template></li>
      </ul>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'
import FilterIcon from '@/components/icons/FilterIcon.vue'
import { calcularLogisticaProva, MINIMO_QUESTOES } from '@/services/logisticaProva.js'
import { URL_INTERVALO_CONFIANCA } from '@/config/textosAnalises.js'

// Fonte aberta sobre o modelo logístico usado na curva
const URL_MODELO_LOGISTICO = 'https://pt.wikipedia.org/wiki/Regressão_logística'
// Explicações externas dos termos do resumo e das notas (abrem em nova aba)
const URL_TESTE_WALD = 'https://en.wikipedia.org/wiki/Wald_test'
const URL_CORRECAO_DISPERSAO = 'https://en.wikipedia.org/wiki/Overdispersion'

const LARGURA = 800
const ALTURA = 460
const MARGEM_ESQ = 52
const MARGEM_DIR = 20
const MARGEM_TOPO = 20
const MARGEM_BASE = 46
const LARGURA_UTIL = LARGURA - MARGEM_ESQ - MARGEM_DIR
const ALTURA_UTIL = ALTURA - MARGEM_TOPO - MARGEM_BASE
const MARCAS_Y = [0, 25, 50, 75, 100]

// Níveis de dificuldade: mesmas chaves do formulário (facil, medio, dificil) e cores do gráfico do ENEM
const NIVEIS = [
  { chave: 'facil', rotulo: 'Fácil', cor: '#0070C0' },
  { chave: 'medio', rotulo: 'Média', cor: '#F59E0B' },
  { chave: 'dificil', rotulo: 'Difícil', cor: '#C0392B' }
]
const COR_SEM_NIVEL = '#666666'

// questoes: [{ rotulo, caracteres, taxa_acerto_percentual, dificuldade }], na ordem da prova
const props = defineProps({
  questoes: {
    type: Array,
    default: () => []
  }
})

const temAcertoInformado = (questao) => {
  const taxa = questao.taxa_acerto_percentual
  return taxa !== null && taxa !== undefined && Number.isFinite(Number(taxa))
}

// Filtro de dificuldade (mesmo menu do gráfico de tempo de leitura)
const opcoesDificuldade = [
  { valor: 'todas', rotulo: 'Todas' },
  ...NIVEIS.map((nivel) => ({ valor: nivel.chave, rotulo: nivel.rotulo }))
]
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

// Questões com acerto informado (todas, sem filtro): base do eixo X e da contagem
const pontosInformados = computed(() => props.questoes
  .filter(temAcertoInformado)
  .map((questao) => ({
    rotulo: questao.rotulo,
    x: Number(questao.caracteres) || 0,
    y: Number(questao.taxa_acerto_percentual),
    acertos: Number(questao.acertos),
    total: Number(questao.total_estudantes),
    dificuldade: questao.dificuldade ?? null
  })))

// Pontos do filtro: a reta, o IC e o resumo são calculados só com estes
const pontos = computed(() => filtroDificuldade.value === 'todas'
  ? pontosInformados.value
  : pontosInformados.value.filter((ponto) => ponto.dificuldade === filtroDificuldade.value))

const resultado = computed(() => (pontos.value.length >= MINIMO_QUESTOES ? linhaReta.value : null))

// Só aparece na legenda quando algum ponto plotado não tem dificuldade informada
const temPontoSemDificuldade = computed(() =>
  pontos.value.some((ponto) => !NIVEIS.some((nivel) => nivel.chave === ponto.dificuldade))
)

const mensagemSemResultado = computed(() => {
  if (pontosInformados.value.length === 0) {
    return 'Informe os acertos por questão (em "Deseja incluir métricas dos estudantes?") para ver a correlação desta prova.'
  }
  if (pontos.value.length < MINIMO_QUESTOES) {
    const escopo = filtroDificuldade.value === 'todas' ? '' : ' neste filtro'
    return `São necessárias pelo menos ${MINIMO_QUESTOES} questões com acerto informado${escopo} (há ${pontos.value.length}).`
  }
  return 'Não foi possível ajustar o modelo logístico com estes acertos (os dados não convergem ou o tamanho das questões não varia).'
})

const formatarNumero = (valor, casas) => valor.toFixed(casas).replace('.', ',')

// Eixo X vai da menor à maior questão da prova, fixo nos dados completos para não mudar de escala ao trocar o filtro
const xMinimo = computed(() => {
  if (pontosInformados.value.length === 0) return 0
  return Math.min(...pontosInformados.value.map((ponto) => ponto.x))
})
const xMaximo = computed(() => {
  if (pontosInformados.value.length === 0) return 100
  return Math.max(...pontosInformados.value.map((ponto) => ponto.x))
})
const amplitudeX = computed(() => Math.max(1, xMaximo.value - xMinimo.value))
const marcasX = computed(() => Array.from({ length: 6 }, (_, indice) => Math.round(xMinimo.value + (amplitudeX.value / 5) * indice)))

const xDe = (valor) => MARGEM_ESQ + ((valor - xMinimo.value) / amplitudeX.value) * LARGURA_UTIL
const yDe = (valor) => MARGEM_TOPO + (1 - valor / 100) * ALTURA_UTIL

const corDoNivel = (chave) => NIVEIS.find((nivel) => nivel.chave === chave)?.cor ?? COR_SEM_NIVEL
const rotuloDoNivel = (chave) => NIVEIS.find((nivel) => nivel.chave === chave)?.rotulo ?? 'sem nível'

const pontosSvg = computed(() => pontos.value.map((ponto) => ({
  rotulo: ponto.rotulo,
  cx: xDe(ponto.x),
  cy: yDe(ponto.y),
  cor: corDoNivel(ponto.dificuldade),
  tooltip: `${ponto.rotulo} · ${rotuloDoNivel(ponto.dificuldade)}\nCaracteres: ${Math.round(ponto.x)}\nAcerto: ${formatarNumero(ponto.y, 1)}%`
})))

// Curva logística e IC 95% do menor ao maior tamanho de questão, como o eixo X
const linhaReta = computed(() => {
  const grade = Array.from({ length: 21 }, (_, indice) => xMinimo.value + (amplitudeX.value / 20) * indice)
  return calcularLogisticaProva(pontos.value, grade)
})

const pontosReta = computed(() => linhaReta.value
  ? linhaReta.value.linha.map((linha) => `${xDe(linha.x)},${yDe(linha.previsto)}`).join(' ')
  : '')

const faixaIc = computed(() => {
  if (!linhaReta.value) return ''
  const superior = linhaReta.value.linha.map((linha) => `${xDe(linha.x)},${yDe(linha.icSuperior)}`)
  const inferior = [...linhaReta.value.linha].reverse().map((linha) => `${xDe(linha.x)},${yDe(linha.icInferior)}`)
  return [...superior, ...inferior].join(' ')
})

const resumoPartes = computed(() => {
  const r = resultado.value
  if (!r) return []
  const p = r.p < 0.001 ? '< 0,001' : formatarNumero(r.p, 3)
  return [
    `Modelo logístico: a cada 100 caracteres a mais, a chance de acerto (acertos ÷ erros) é multiplicada por ${formatarNumero(r.razaoChancesPor100, 2)} (razão de chances, p = ${p} pelo `,
    { texto: 'teste de Wald', url: URL_TESTE_WALD },
    ' com ',
    { texto: 'correção de dispersão', url: URL_CORRECAO_DISPERSAO },
    ` φ = ${formatarNumero(r.phi, 1)}, n = ${r.n} questões).`
  ]
})

const tooltip = [
  'Mostra se questões mais longas tendem a ter menor ou maior percentual de acerto nesta prova.',
  '',
  'Como é calculado:',
  '• Tamanho da questão: quantidade de caracteres do texto inteiro (enunciado, fonte, alternativas), sem espaços nem quebras de linha.',
  '• Curva: mostra a chance de acerto prevista para cada tamanho, com base nos acertos de cada questão.',
  '• Faixa: a margem de incerteza da curva (95% de confiança). Fica sempre entre 0% e 100%.',
  '• Razão de chances: a cada 100 caracteres a mais, quanto a chance de acerto muda.',
  '• p: indica se o tamanho parece ter relação com o acerto ou se a diferença pode ser coincidência. Quanto menor, mais forte o indício.',
  '• Cor: nível de dificuldade informado no formulário.'
].join('\n')


// Notas explicativas do gráfico, adaptadas do gráfico de dispersão do ENEM para uma prova única
const NOTAS_CORRELACAO = [
  ['Curva azul: probabilidade de acerto prevista pelo modelo logístico para cada tamanho de questão. Ela cresce ou decresce conforme o tamanho varia e nunca passa de 0% nem de 100%. Quando a curva é quase plana, o tamanho do texto pouco altera o acerto nesta prova.'],
  ['Razão de chances: a cada 100 caracteres a mais, a chance de acerto (acertos ÷ erros) é multiplicada por esse valor. Valor abaixo de 1 indica que questões mais longas tendem a ter menos acerto; acima de 1, mais acerto.'],
  ['Valor de p: indica se o tamanho da questão parece ter relação com o acerto nesta prova, ou se a diferença poderia ser coincidência. Quanto menor o número, mais forte é o indício de relação. Com poucas questões, esse número é pouco confiável.'],
  ['p baixo: um efeito desse tamanho seria raro sem relação, há indício de relação.'],
  ['p alto: não há evidência suficiente de relação; um efeito desse tamanho seria comum sem relação.'],
  ['O n é o número de questões desta prova: com poucas questões, relações fracas podem não ser detectadas.'],
  [
    { texto: 'Correção de dispersão', url: URL_CORRECAO_DISPERSAO },
    ' (φ): mede quanto as respostas variam entre as questões além do que o modelo simples prevê. φ = 1 significa que não há variação extra. Com φ = 4, por exemplo, a variação é 4 vezes maior, então os erros são multiplicados por √4 = 2, e a faixa e o p ficam mais conservadores. Com poucas questões, φ é uma estimativa instável.'
  ]
]
</script>

<style scoped>
.correlacao-prova {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e0e0e0;
}
.link-modelo,
.link-conceito { color: #0070C0; text-decoration: underline; }
.link-modelo:hover,
.link-conceito:hover { opacity: .8; }

.correlacao-cabecalho {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.correlacao-titulo {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}
.correlacao-subtitulo {
  margin: 0 0 1rem;
  color: #666;
  font-size: 0.9rem;
}
.correlacao-notas {
  margin: 1rem 0 0;
  padding-left: 1.2rem;
  color: #555;
  font-size: 0.85rem;
}
.correlacao-status {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-left: 4px solid #ffc107;
  padding: 1rem;
  border-radius: 6px;
  color: #856404;
  font-size: 0.95rem;
  margin: 0;
}
.correlacao-aviso-dificuldade {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-left: 4px solid #ffc107;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  color: #856404;
  font-size: 0.9rem;
  margin: 0.75rem 0 0;
}
.correlacao-aviso {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  color: #333;
  font-size: 0.9rem;
  line-height: 1.4;
}
.grafico-correlacao {
  width: 100%;
  height: auto;
}
.eixo {
  stroke: #999999;
  stroke-width: 1;
}
.rotulo-eixo {
  fill: #333;
  font-size: 17px;
}
.faixa-ic {
  fill: rgba(0, 112, 192, 0.15);
  stroke: none;
}
.reta {
  fill: none;
  stroke: #0070C0;
  stroke-width: 2;
}
.ponto {
  opacity: 0.85;
}
.correlacao-legenda {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  color: #333;
  font-size: 0.85rem;
}
.correlacao-legenda li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.cor-nivel {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.linha-reta {
  display: inline-block;
  width: 18px;
  height: 3px;
  background: #0070C0;
}
.correlacao-resumo {
  margin: 0.75rem 0 0;
  color: #333;
  font-size: 0.9rem;
  font-weight: 600;
}

.cor-nivel {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.linha-reta {
  display: inline-block;
  width: 18px;
  height: 3px;
  background: #0070C0;
}

.dispersao-resumo {
  margin: 0.75rem 0 0;
  color: #333;
  font-size: 0.9rem;
  font-weight: 600;
}

.dispersao-notas {
  margin: 1rem 0 0;
  padding-left: 1.2rem;
  color: #555;
  font-size: 0.85rem;
}

/* Filtro: mesmo estilo do filtro do gráfico de metades */
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
