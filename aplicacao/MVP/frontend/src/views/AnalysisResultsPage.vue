<template>
  <main class="results-page">
    <header class="page-header">
      <div class="cabecalho-linha" ref="menuExportarRef">
        <button
          type="button"
          class="btn-voltar-topo"
          aria-label="Voltar ao formulário"
          title="Voltar ao formulário"
          @click="goToForm"
        >
          &larr;
        </button>
        <h1>Resultados da análise</h1>
        <div class="topo-acoes">
          <button
            type="button"
            class="btn-exportar"
            :disabled="!payload"
            :aria-expanded="menuExportarAberto ? 'true' : 'false'"
            aria-haspopup="menu"
            @click="menuExportarAberto = !menuExportarAberto"
          >
            <svg class="icone-exportar" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Exportar
          </button>
          <ul v-if="menuExportarAberto" class="menu-exportar" role="menu">
            <li v-for="opcao in opcoesExportacao" :key="opcao.formato" role="none">
              <button type="button" class="item-exportar" role="menuitem" @click="escolherExportacao(opcao.formato)">
                <ArquivoIcon :formato="opcao.formato" class="icone-arquivo" />
                Exportar em {{ opcao.nome }}
              </button>
            </li>
          </ul>
        </div>
      </div>
      <p v-if="payload">Dados extraídos de {{ payload.fileName }}</p>
    </header>

    <section v-if="!payload" class="panel empty-state">
      <p>Não há dados de análise nesta sessão. Envie uma prova e preencha os parâmetros primeiro.</p>
    </section>

    <template v-else>
      <section class="panel prova-info-panel">
        <div class="duracao-linha">
          <div class="info-item">
            <div class="info-label">Duração total da prova:</div>
            <div class="info-value">{{ formatMinutes(examDurationMinutes) }}</div>
          </div>
          <div class="filter-wrapper">
            <button class="filter-btn" @click="alternarMenuFiltro">
              <FilterIcon />
              Filtro
            </button>
            <div v-if="showFilterMenu" class="filter-menu">
              <div class="filter-option filter-todos">
                <input
                  type="checkbox"
                  id="filter-selecionar-tudo"
                  :checked="todasMarcadas"
                  :indeterminate.prop="algumaMarcada"
                  @change="alternarTodosFiltros"
                />
                <label for="filter-selecionar-tudo">Selecionar tudo</label>
              </div>
              <div class="filter-lista">
                <div class="filter-option" v-for="option in opcoesFiltro" :key="option.id">
                  <input
                    type="checkbox"
                    :id="option.id"
                    :checked="isFilterSelected(option.id)"
                    @change="toggleFilter(option.id)"
                  />
                  <label :for="option.id">{{ option.label }}</label>
                </div>
              </div>
              <div class="filter-rodape">
                <button type="button" class="filter-aplicar" @click="aplicarFiltros">Aplicar</button>
              </div>
            </div>
          </div>
        </div>
        <div class="info-item">
          <div class="info-label">Quantidade total de questões:</div>
          <div class="info-value">{{ questions.length }} questões</div>
        </div>
        <div class="info-item">
          <div class="info-label">Velocidade de leitura considerada:</div>
          <div class="info-value">
            {{ readingSpeed }} caracteres/minuto
            <a v-if="readingSpeed === DEFAULT_READING_SPEED" :href="REFERENCIA_VELOCIDADE_URL" target="_blank" rel="noopener noreferrer" class="info-reference">(Referência: Messias et al., 2008)</a>
          </div>
        </div>
      </section>

      <section v-if="temAnaliseTempo" class="panel prova-tempo-panel">
        <div class="analise-tempo-bloco">
          <h2>Análise do Tempo de Prova</h2>
          <div class="tempo-bloco">
          <div class="tempo-cabecalho">
            <h2>Distribuição do Tempo de Prova</h2>
            <InfoIcon warning :tooltip="tooltipTempo" />
          </div>
          <p class="tempo-subtitulo">Distribuição do tempo entre leitura e resolução das questões objetivas</p>
          <div v-if="timeDistribution.total > 0" class="tempo-conteudo">
            <svg viewBox="0 0 200 200" class="pizza" role="img" aria-label="Distribuição do tempo da prova">
              <path v-for="fatia in fatiasTempo" :key="fatia.chave" :d="fatia.caminho" :fill="fatia.cor" />
            </svg>
            <ul class="legenda">
              <li v-for="fatia in fatiasTempo" :key="fatia.chave">
                <span class="legenda-cor" :style="{ background: fatia.cor }"></span>
                <span class="legenda-rotulo">{{ fatia.rotulo }}</span>
                <InfoIcon v-if="fatia.dica" :tooltip="fatia.dica" :largura="320" />
                <span class="legenda-valor">{{ fatia.valor.toFixed(2) }} min ({{ formatarPercentual(fatia.percentual) }}%)</span>
              </li>
            </ul>
          </div>
          <p v-else>Informe a duração da prova para ver a distribuição do tempo.</p>
          <div v-if="questions.length > 0" class="tempo-grafico-leitura">
            <GraficoLeituraQuestoes
              :itens="leituraPorQuestao"
              :tempo-medio="tempoMedioPorQuestao"
              :total-questoes="questions.length"
              :tooltip="tooltipLeitura"
            />
          </div>
          </div>
        </div>
      </section>

      <section v-if="temAnaliseTamanho" class="panel prova-palavras-panel">
        <h2>Análise do Tamanho das Questões</h2>
        <GraficoPalavrasProva :questoes="questoesPalavras" />
        <MapaCalorSpearmanProva :questoes="questoesCorrelacao" />
        <CorrelacaoMetadesProva :questoes="questoesCorrelacao" />
        <CorrelacaoProvaGrafico :questoes="questoesCorrelacao" />
      </section>

      <section v-for="analise in analisesAplicadas" :key="analise.id" class="panel">
        <template v-if="analise.id === 'image'">
          <AnaliseImagensProva
            :titulo="analise.label"
            :questoes="questions"
          />
        </template>
        <h2 v-else>{{ analise.label }}</h2>
      </section>

      <section v-if="config.useDifficultyAnalysis" class="panel">
        <h2>Distribuição de dificuldade</h2>
        <div class="metrics-grid">
          <article v-for="level in difficultyLevels" :key="level.key" class="metric-card">
            <span>{{ level.label }}</span>
            <strong>{{ difficultyCounts[level.key] }}</strong>
          </article>
        </div>
      </section>

      <section v-if="config.includeStudentMetrics" class="panel">
        <h2>Desempenho informado dos estudantes</h2>
        <p>{{ studentCorrectCount }} acertos registrados de {{ studentPossibleCount }} possíveis ({{ studentAccuracyPercent }}%).</p>
      </section>

      <section class="panel json-panel">
        <div class="json-heading">
          <div>
            <h2>JSON da prova</h2>
            <p>Inclui as dificuldades e, quando habilitado, os acertos informados por questão.</p>
          </div>
        </div>
        <pre>{{ JSON.stringify(examJson, null, 2) }}</pre>
      </section>
    </template>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import FilterIcon from '@/components/icons/FilterIcon.vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'
import ArquivoIcon from '@/components/icons/ArquivoIcon.vue'
import GraficoLeituraQuestoes from '@/components/GraficoLeituraQuestoes.vue'
import GraficoPalavrasProva from '@/components/GraficoPalavrasProva.vue'
import AnaliseImagensProva from '@/components/AnaliseImagensProva.vue'
import CorrelacaoProvaGrafico from '@/components/CorrelacaoProvaGrafico.vue'
import CorrelacaoMetadesProva from '@/components/CorrelacaoMetadesProva.vue'
import MapaCalorSpearmanProva from '@/components/MapaCalorSpearmanProva.vue'
import { useRouter } from 'vue-router'
import { useAnalysisStore } from '@/stores/analysisStore'
import { DEFAULT_READING_SPEED, TODOS_TIPOS_ANALISE, ANALYSIS_TYPE_OPTIONS, formatarPercentual } from '@/constants/analysisConfig'
import { REFERENCIA_VELOCIDADE_URL, DICA_TEXTOS_INTRO_PROVA_ENVIADA } from '@/config/textosAnalises.js'

const store = useAnalysisStore()
const router = useRouter()
/*
 * `store.analysisPayload` é o objeto que mantém os dados entre as duas telas.
 * Estrutura: { fileName, textos_introdutorios, questions, config }.
 * - fileName: nome do PDF enviado.
 * - textos_introdutorios: textos que aparecem antes da primeira questão,
 *   cada um com id, texto e quantidade_palavras.
 * - questions: lista que é exposta como `questoes` no JSON, cada questão contém:
 *    questao, texto, alternativas, tem_imagem e quantidade_palavras.
 *    Se as opções forem usadas, também contém dificuldade e/ou acertos, total_estudantes e taxa_acerto_percentual.
 * - config: inputs originais do formulário: analysisType, hours, minutes,
 *   readingSpeedMode, customReadingSpeed, useDifficultyAnalysis,
 *   questionDifficulties, includeStudentMetrics, studentCount,
 *   studentMetricsQuestionCount e studentMetricsAccuracy.
 * 'payload' abaixo é um computed que lê esse objeto do Pinia; no template Vue
 * o valor é acessado diretamente, e no script usamos payload.value.
 */
const payload = computed(() => store.analysisPayload)
const questions = computed(() => payload.value?.questions ?? [])
const introductoryTexts = computed(() => payload.value?.textos_introdutorios ?? [])
// Formato compatível com as rotinas de análise: textos_introdutorios e questoes.
const examJson = computed(() => ({ textos_introdutorios: introductoryTexts.value, questoes: questions.value }))
const config = computed(() => payload.value?.config ?? {})

// O JSON usa `quantidade_palavras`, `tem_imagem`, `texto` e `alternativas`
// do extrator; os demais cálculos usam os inputs salvos no campo `config`.
const totalWords = computed(() => questions.value.reduce((sum, question) => sum + (Number(question.quantidade_palavras) || 0), 0))
const questionsWithFiveAlternatives = computed(() => questions.value.filter((question) => question.alternativas?.length === 5).length)
const averageWords = computed(() => questions.value.length ? Math.round(totalWords.value / questions.value.length) : 0)
// O tempo de leitura usa a velocidade escolhida; 
const readingSpeed = computed(() => config.value.readingSpeedMode === 'custom'
  ? Number(config.value.customReadingSpeed) || DEFAULT_READING_SPEED
  : DEFAULT_READING_SPEED)
// Caracteres lidos, sem espaços, tabs, quebras de linha e \u00a0 (mesma regra de contar_caracteres do ENEM)
const contarCaracteres = (texto) => (texto ?? '').replace(/[ \t\n\r\u00a0]/g, '').length
const questionCharacters = computed(() => questions.value.reduce(
  (sum, question) => sum + contarCaracteres(question.texto), 0))
const introductoryCharacters = computed(() => introductoryTexts.value.reduce(
  (sum, texto) => sum + contarCaracteres(texto.texto), 0))
const examDurationMinutes = computed(() => (Number(config.value.hours) || 0) * 60 + (Number(config.value.minutes) || 0))

// Distribuição do tempo: leitura das questões e dos textos, o restante é o que sobra da prova
const timeDistribution = computed(() => {
  const total = examDurationMinutes.value
  const questoes = questionCharacters.value / readingSpeed.value
  const textos = introductoryCharacters.value / readingSpeed.value
  const restante = Math.max(0, total - questoes - textos)
  return { total, questoes, textos, restante }
})

// Gráfico por questão: leitura de cada questão e tempo médio (restante ÷ nº de questões)
const leituraPorQuestao = computed(() => questions.value.map((question) => ({
  rotulo: `Q${question.questao}`,
  caracteres: contarCaracteres(question.texto),
  minutos: contarCaracteres(question.texto) / readingSpeed.value,
  dificuldade: question.dificuldade ?? null
})))
const tempoMedioPorQuestao = computed(() => questions.value.length
  ? timeDistribution.value.restante / questions.value.length
  : 0)
const tooltipLeitura = computed(() => [
  'Compara o tempo de leitura de cada questão com o tempo médio de resolução. A linha preta marca esse tempo médio e a barra cinza mostra a margem restante para resolver o item.',
  '',
  'Cálculos:',
  `• Leitura da questão = caracteres da questão ÷ ${readingSpeed.value} (enunciado e alternativas, sem espaços).`,
  `• Tempo médio (linha preta) = tempo restante da prova ÷ ${questions.value.length} questões.`,
  `• Margem (barra cinza até a linha preta) = máx(0, tempo médio − leitura da questão) (fatia do tempo restante dividida igualmente entre as ${questions.value.length} questões; zera se a leitura ultrapassar a linha preta).`
].join('\n'))

const difficultyLevels = [
  { key: 'facil', label: 'Fácil' },
  { key: 'medio', label: 'Médio' },
  { key: 'dificil', label: 'Difícil' }
]
const difficultyCounts = computed(() => Object.fromEntries(difficultyLevels.map(({ key }) => [
  key,
  questions.value.filter((question) => question.dificuldade === key).length
])))
// Acertos são valores por questão; o total possível usa o número de estudantes
// e de questões informado pelo usuário, e a porcentagem é ponderada por questão.
const studentCorrectCount = computed(() => Object.values(config.value.studentMetricsAccuracy ?? {})
  .reduce((sum, value) => sum + (Number(value) || 0), 0))
// Sem a configuração de estudantes/questões, o total possível soma o total_estudantes de cada questão
const studentPossibleCount = computed(() => {
  const configurado = (Number(config.value.studentMetricsQuestionCount) || 0)
    * (Number(config.value.studentCount) || 0)
  if (configurado > 0) return configurado
  return questions.value.reduce((soma, question) => soma + (Number(question.total_estudantes) || 0), 0)
})
const studentAccuracyPercent = computed(() => studentPossibleCount.value
  ? ((studentCorrectCount.value / studentPossibleCount.value) * 100).toFixed(2)
  : '0.00')

const analysisTypeLabels = {
  all: 'Análise Completa',
  image: 'Presença de imagens',
  formality: 'Formalismo',
  'reading-time': 'Tempo de prova',
  'word-count': 'Tamanho das questões',
  distractors: 'Distratores',
  position: 'Posição das Questões'
}
const analysisTypeLabel = computed(() => {
  const tipos = config.value.analysisTypes ?? []
  const todos = tipos.includes('all') || tipos.length === TODOS_TIPOS_ANALISE.length
  if (todos) return analysisTypeLabels.all
  const nomes = tipos.map((tipo) => analysisTypeLabels[tipo]).filter(Boolean)
  return nomes.length ? nomes.join(', ') : 'Análise'
})

// Opções do filtro = mesmas opções do formulário; só aparecem as que o usuário escolheu
const filterOptions = ANALYSIS_TYPE_OPTIONS.map(({ value, label }) => ({ id: value, label }))
const todasAnalises = filterOptions.map((option) => option.id)

// Análise completa marca todas as opções; caso contrário, só as escolhidas no formulário
const analisesEscolhidas = computed(() => {
  const tipos = config.value.analysisTypes ?? []
  const todos = tipos.includes('all') || TODOS_TIPOS_ANALISE.every((tipo) => tipos.includes(tipo))
  return todos ? todasAnalises : tipos.filter((tipo) => todasAnalises.includes(tipo))
})

// Lista exibida no filtro: só as análises escolhidas no formulário
const opcoesFiltro = computed(() => filterOptions.filter((option) => analisesEscolhidas.value.includes(option.id)))

// Filtros aplicados (valem só depois de clicar em Aplicar)
const selectedFilters = ref(new Set(analisesEscolhidas.value))
// Rascunho: muda enquanto o usuário marca as opções
const rascunhoFiltros = ref(new Set(analisesEscolhidas.value))
const showFilterMenu = ref(false)

const analisesAplicadas = computed(() => filterOptions.filter((option) => selectedFilters.value.has(option.id)))
// Pizza e gráfico de leitura só aparecem quando 'Análise do Tempo de Prova' está aplicada no filtro
const temAnaliseTempo = computed(() => selectedFilters.value.has('reading-time'))
const temAnaliseTamanho = computed(() => selectedFilters.value.has('word-count'))
// Palavras por questão: quantidade_palavras é o total da questão; o enunciado é o total menos as alternativas.
// Cada alternativa conta a palavra da letra mais as palavras do texto, com a mesma regra da extração (WORD_RE), igual ao backend do ENEM.
const WORD_RE = /\d+(?:[.,]\d+)*(?:%|[ºª])?|[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[-'][A-Za-zÀ-ÖØ-öø-ÿ]+)?/g
const contarPalavrasAlternativas = (alternativas = []) => alternativas.reduce((total, alternativa) => {
  const texto = `${alternativa?.letra ?? ''} ${alternativa?.texto ?? ''}`
  return total + (texto.match(WORD_RE) ?? []).length
}, 0)
const questoesPalavras = computed(() => questions.value.map((question) => ({
  rotulo: `Q${question.questao}`,
  palavras: Math.max(0, (Number(question.quantidade_palavras) || 0) - contarPalavrasAlternativas(question.alternativas)),
  palavrasAlternativas: contarPalavrasAlternativas(question.alternativas)
})))
// Correlação da prova: tamanho em caracteres (mesma contagem do tempo de leitura) e acerto informado por questão
const questoesCorrelacao = computed(() => questions.value.map((question) => ({
  rotulo: `Q${question.questao}`,
  caracteres: contarCaracteres(question.texto),
  taxa_acerto_percentual: question.taxa_acerto_percentual ?? null,
  acertos: question.acertos ?? null,
  total_estudantes: question.total_estudantes ?? null,
  dificuldade: question.dificuldade ?? null
})))
const todasMarcadas = computed(() => rascunhoFiltros.value.size === todasAnalises.length)
const algumaMarcada = computed(() => rascunhoFiltros.value.size > 0 && !todasMarcadas.value)

// Abrir o menu copia o aplicado para o rascunho; fechar sem aplicar descarta as mudanças
const alternarMenuFiltro = () => {
  if (!showFilterMenu.value) {
    rascunhoFiltros.value = new Set(selectedFilters.value)
  }
  showFilterMenu.value = !showFilterMenu.value
}

const alternarTodosFiltros = () => {
  rascunhoFiltros.value = todasMarcadas.value ? new Set() : new Set(todasAnalises)
}

const toggleFilter = (filterId) => {
  const proximo = new Set(rascunhoFiltros.value)
  if (proximo.has(filterId)) {
    proximo.delete(filterId)
  } else {
    proximo.add(filterId)
  }
  rascunhoFiltros.value = proximo
}

const isFilterSelected = (filterId) => rascunhoFiltros.value.has(filterId)

const aplicarFiltros = () => {
  selectedFilters.value = new Set(rascunhoFiltros.value)
  showFilterMenu.value = false
}

// Texto do tooltip da prova enviada: duração e velocidade vêm do formulário
const tooltipTempo = computed(() => [
  `Apresenta a distribuição dos ${examDurationMinutes.value} min totais da avaliações entre tempo de leitura e margem para resolução.`,
  '',
  'Cálculos:',
  `• Leitura das questões = caracteres das questões ÷ ${readingSpeed.value} (enunciados e alternativas, sem espaços).`,
  `• Leitura introdutória = caracteres do texto que antecede a primeira questão (sem espaços) ÷ ${readingSpeed.value}.`,
  '• Tempo restante = máx(0, tempo disponível − leitura das questões − leitura introdutória) (reservado para análise, cálculos e gabarito).'
].join('\n'))

// Fatias da pizza: mesma montagem do componente ResumoTempoProva (setores em SVG)
const CORES_TEMPO = {
  questoes: '#0070C0',
  textos: '#10B981',
  restante: '#CBD5E1'
}

function caminhoSetor(inicioGraus, fimGraus) {
  const cx = 100
  const cy = 100
  const raio = 90

  if (fimGraus - inicioGraus <= 0) {
    return ''
  }

  if (fimGraus - inicioGraus >= 360) {
    return `M ${cx} ${cy - raio} A ${raio} ${raio} 0 1 1 ${cx} ${cy + raio} A ${raio} ${raio} 0 1 1 ${cx} ${cy - raio} Z`
  }

  const ponto = (graus) => {
    const radianos = ((graus - 90) * Math.PI) / 180
    return [cx + raio * Math.cos(radianos), cy + raio * Math.sin(radianos)]
  }

  const [x1, y1] = ponto(inicioGraus)
  const [x2, y2] = ponto(fimGraus)
  const arcoGrande = fimGraus - inicioGraus > 180 ? 1 : 0

  return `M ${cx} ${cy} L ${x1} ${y1} A ${raio} ${raio} 0 ${arcoGrande} 1 ${x2} ${y2} Z`
}

const fatiasTempo = computed(() => {
  const { total, questoes, textos, restante } = timeDistribution.value
  const itens = [
    { chave: 'questoes', rotulo: 'Leitura das questões', valor: questoes, cor: CORES_TEMPO.questoes },
    { chave: 'textos', rotulo: 'Leitura dos textos introdutórios', valor: textos, cor: CORES_TEMPO.textos, dica: DICA_TEXTOS_INTRO_PROVA_ENVIADA },
    { chave: 'restante', rotulo: 'Restante', valor: restante, cor: CORES_TEMPO.restante }
  ]

  let anguloAtual = 0
  return itens.map((item) => {
    const fracao = total ? item.valor / total : 0
    const inicio = anguloAtual
    anguloAtual += fracao * 360

    return {
      ...item,
      percentual: fracao * 100,
      caminho: caminhoSetor(inicio, anguloAtual)
    }
  })
})

const formatMinutes = (minutes) => {
  const totalMinutes = Math.max(0, Math.round(Number(minutes) || 0))
  const horas = Math.floor(totalMinutes / 60)
  const minutos = totalMinutes % 60
  if (minutos === 0) return `${horas}h`
  if (horas === 0) return `${minutos}min`
  return `${horas}h ${minutos}min`
}

// Exportar: menu igual ao da tela do ENEM. A ação de gerar o arquivo ainda não está ligada.
const menuExportarAberto = ref(false)
const menuExportarRef = ref(null)
const opcoesExportacao = [
  { formato: 'pdf', nome: 'PDF' },
  { formato: 'xlsx', nome: 'Excel' },
  { formato: 'csv', nome: 'CSV' }
]

const fecharMenuAoClicarFora = (evento) => {
  if (menuExportarRef.value && !menuExportarRef.value.contains(evento.target)) {
    menuExportarAberto.value = false
  }
}

onMounted(() => document.addEventListener('click', fecharMenuAoClicarFora))
onBeforeUnmount(() => document.removeEventListener('click', fecharMenuAoClicarFora))

const escolherExportacao = () => {
  menuExportarAberto.value = false
}

const goToForm = () => {
  // Sai da análise de propósito: limpa o resultado para a tela de análise abrir o formulário.
  store.clearResults()
  router.push('/')
}
</script>

<style scoped>
.results-page {
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #E0F2FE 0%, #F0F9FF 100%);
}
.page-header, .panel { max-width: 1000px; margin-left: auto; margin-right: auto; }
.page-header { text-align: center; color: #0070C0; margin-bottom: 2rem; }
.page-header h1 { margin-bottom: .5rem; }
.cabecalho-linha { position: relative; }
.topo-acoes { position: absolute; right: 0; top: 50%; transform: translateY(-50%); z-index: 10; }
.btn-voltar-topo { position: absolute; left: 0; top: 50%; transform: translateY(-50%); z-index: 10; background: linear-gradient(135deg, #0070C0, #10B981); color: white; border: none; padding: .6rem 1rem; border-radius: 6px; font-size: 1.25rem; font-weight: 600; line-height: 1; cursor: pointer; transition: opacity .3s ease; }
.btn-voltar-topo:hover { opacity: .9; }
.menu-exportar { position: absolute; top: calc(100% + .5rem); right: 0; z-index: 10; list-style: none; margin: 0; padding: .5rem; min-width: 240px; background: white; border: 2px solid #0070C0; border-radius: 8px; box-shadow: 0 8px 25px rgba(0, 0, 0, .15); text-align: left; }
.item-exportar { display: flex; align-items: center; gap: .75rem; width: 100%; padding: .6rem .75rem; background: none; border: none; border-radius: 6px; color: #0070C0; font-size: 1rem; font-weight: 600; text-align: left; cursor: pointer; }
.item-exportar:hover, .item-exportar:focus-visible { background: #E0F2FE; outline: none; }
.icone-arquivo { flex-shrink: 0; }
.icone-exportar { width: 18px; height: 18px; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.panel { padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 12px; background: white; box-shadow: 0 8px 28px #00000012; }
.panel h2 { margin: 0 0 1rem; color: #263238; font-size: 1.25rem; }
.tempo-cabecalho h2 { margin: 0; }
.tempo-cabecalho { display: flex; align-items: center; gap: .5rem; margin-bottom: .25rem; }
.tempo-subtitulo { margin: 0 0 1rem; color: #666; font-size: .9rem; }
.tempo-conteudo { display: flex; align-items: center; justify-content: center; gap: 2rem; flex-wrap: wrap; }
.pizza { width: 200px; height: 200px; }
.legenda { list-style: none; margin: 0; padding: 0; font-size: .85rem; }
.legenda li { display: flex; align-items: center; gap: .5rem; margin-bottom: .5rem; }
.legenda-cor { width: 12px; height: 12px; border-radius: 2px; flex-shrink: 0; }
.legenda-rotulo { color: #333; }
.legenda-valor { color: #666; margin-left: .5rem; }
.duracao-linha { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.filter-wrapper { position: relative; display: inline-block; margin-left: auto; }
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
  max-height: 400px;
  overflow-y: auto;
}
.filter-option {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin: 0.25rem 0;
  border-radius: 4px;
  transition: background 0.2s ease;
}
.filter-option:hover { background: #f5f5f5; }
.filter-lista { display: flex; flex-direction: column; max-height: 7.5rem; overflow-y: auto; }
.filter-lista > .filter-option { min-height: 2.5rem; margin: 0; flex-shrink: 0; }
.filter-option input[type="checkbox"] {
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
.filter-todos {
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid #e0e0e0;
}
.filter-rodape {
  position: sticky;
  bottom: 0;
  background: white;
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
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
.filter-aplicar:hover { background: #005a9e; }
.prova-info-panel { padding: 1.5rem 1.5rem 1.5rem; }
.analise-tempo-bloco { margin: 0; }
.analise-tempo-bloco > h2 { margin: 0 0 1rem; color: #263238; font-size: 1.25rem; }
.tempo-bloco { padding: 1.5rem; background: white; border-radius: 8px; margin: 1.5rem 0 0; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08); }
.tempo-grafico-leitura { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e0e0e0; }
.info-item { display: flex; flex-wrap: wrap; align-items: baseline; gap: .6rem; margin-bottom: 1rem; }
.info-item:last-child { margin-bottom: 0; }
.info-label { color: #333; font-size: .95rem; font-weight: 600; }
.info-value { display: flex; flex-wrap: wrap; align-items: baseline; gap: .3rem; color: #0070C0; font-size: .95rem; font-weight: 600; }
.info-reference { color: #666; font-size: .85rem; font-weight: 400; }
a.info-reference { text-decoration: underline; }
a.info-reference:hover { color: #0070C0; }
.metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem; }
.metric-card { display: flex; flex-direction: column; gap: .5rem; padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; }
.metric-card span, dt { color: #667085; font-size: .9rem; }
.metric-card strong { color: #0070C0; font-size: 1.5rem; }
.config-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; }
.config-grid div { padding: .75rem; border-radius: 8px; background: #f7f9fc; }
dt { margin-bottom: .35rem; }
dd { margin: 0; color: #263238; font-weight: 600; }
.note p, .json-heading p, .empty-state p { color: #566; line-height: 1.5; }
.json-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.json-heading h2, .json-heading p { margin-bottom: .4rem; }
.json-panel pre { max-height: 65vh; overflow: auto; padding: 1rem; border-radius: 8px; background: #f5f7fa; white-space: pre-wrap; overflow-wrap: anywhere; }
.button { padding: .75rem 1.25rem; border: 0; border-radius: 6px; cursor: pointer; font-weight: 600; }
.primary { color: white; background: linear-gradient(135deg, #0070C0, #10B981); }
.secondary { color: #333; background: #f0f0f0; border: 1px solid #ddd; }

.empty-state { text-align: center; }
@media (max-width: 600px) {
  .results-page { padding: 1rem; }
  .json-heading { align-items: flex-start; flex-direction: column; }
}
</style>
