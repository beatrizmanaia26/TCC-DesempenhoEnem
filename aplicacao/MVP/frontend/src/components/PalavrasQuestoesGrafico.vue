<template>
  <div class="grafico-palavras">
    <div class="grafico-cabecalho">
      <h3 class="grafico-titulo">{{ TEXTO_PALAVRAS.titulo }}</h3>
      <InfoIcon warning :tooltip="tooltipGrafico" />
      <div class="filter-wrapper">
        <button type="button" class="filter-btn" @click="alternarMenuFiltro">
          <FilterIcon />
          Filtro
        </button>
        <div v-if="mostrarFiltro" class="filter-menu">
          <div class="filter-secao">
            <p class="filter-titulo">DIA</p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesDia" :key="`dia-${opcao.valor}`">
                <input
                  type="radio"
                  name="filtro-dia-palavras"
                  :id="`palavras-dia-${opcao.valor}`"
                  :checked="rascunhoDia === opcao.valor"
                  @change="rascunhoDia = opcao.valor"
                />
                <label :for="`palavras-dia-${opcao.valor}`">{{ opcao.rotulo }}</label>
              </div>
            </div>
          </div>

          <div class="filter-secao">
            <p class="filter-titulo">ÁREA</p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesArea" :key="`area-${opcao.valor}`">
                <input
                  type="checkbox"
                  :id="`palavras-area-${opcao.valor}`"
                  :checked="rascunhoAreas.includes(opcao.valor)"
                  @change="alternarArea(opcao.valor)"
                />
                <label :for="`palavras-area-${opcao.valor}`">{{ opcao.rotulo }}</label>
              </div>
            </div>
          </div>

          <div class="filter-secao">
            <p class="filter-titulo">COR</p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesCor" :key="`cor-${opcao.valor}`">
                <input
                  type="radio"
                  name="filtro-cor-palavras"
                  :id="`palavras-cor-${opcao.valor}`"
                  :checked="rascunhoCor === opcao.valor"
                  @change="rascunhoCor = opcao.valor"
                />
                <label :for="`palavras-cor-${opcao.valor}`">{{ opcao.rotulo }}</label>
              </div>
            </div>
          </div>

          <div class="filter-secao">
            <p class="filter-titulo">MÉTRICAS</p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesMetricas" :key="`metrica-${opcao.valor}`">
                <input
                  type="radio"
                  name="filtro-metrica-palavras"
                  :id="`palavras-metrica-${opcao.valor}`"
                  :checked="rascunhoMetrica === opcao.valor"
                  @change="rascunhoMetrica = opcao.valor"
                />
                <label :for="`palavras-metrica-${opcao.valor}`">{{ opcao.rotulo }}</label>
                <InfoIcon v-if="opcao.dica" warning :tooltip="opcao.dica" />
              </div>
            </div>
          </div>

          <div class="filter-rodape">
            <button type="button" class="filter-aplicar" @click="aplicarFiltro">Aplicar</button>
          </div>
        </div>
      </div>
    </div>
    <p class="grafico-subtitulo">
      {{ TEXTO_PALAVRAS.subtitulo }}
    </p>


    <div v-if="dica" class="dica-flutuante" :style="{ left: `${dica.x}px`, top: `${dica.y}px` }">{{ dica.texto }}</div>

    <p v-if="carregando" class="grafico-status">Carregando quantidade de palavras por questão...</p>
    <p v-else-if="erro" class="grafico-status grafico-erro">{{ erro }}</p>

    <p v-else-if="grupos.length === 0 && questoes.length > 0" class="grafico-status">
      Nenhuma questão corresponde aos filtros escolhidos.
    </p>

    <div v-else class="grafico-dias">
      <div v-for="grupo in grupos" :key="grupo.dia" class="grafico-dia">
        <h4 class="grafico-dia-titulo">Dia {{ grupo.dia }} ({{ grupo.questoes.length }} {{ grupo.questoes.length === 1 ? 'questão' : 'questões' }})</h4>

        <div class="barras">
          <div
            v-for="questao in grupo.questoes"
            :key="`${questao.posicao}-${questao.idioma}`"
            class="barra-linha"
            :title="`${rotulo(questao)}: ${questao.palavras} palavras`"
          >
            <span class="barra-rotulo">{{ rotulo(questao) }}</span>
            <div class="barra-trilho">
              <div class="barra" :style="{ width: larguraBarra(questao.palavras) }" @mouseenter="mostrarDica($event, 'Quantidade de palavras do enunciado')" @mousemove="moverDica" @mouseleave="ocultarDica"></div>
              <div
                class="barra barra-alternativas"
                :style="{ left: larguraBarra(questao.palavras), width: larguraBarra(questao.palavrasAlternativas) }"
                @mouseenter="mostrarDica($event, 'Quantidade de palavras das alternativas')"
                @mousemove="moverDica"
                @mouseleave="ocultarDica"
              ></div>
            </div>
            <span class="barra-valor">{{ questao.palavras }} - {{ questao.palavrasAlternativas }}</span>
          </div>
        </div>

        <p class="eixo-x">Palavras do enunciado - palavras das alternativas</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import http from '@/services/http.js'
import FilterIcon from '@/components/icons/FilterIcon.vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'
import { filtrarPalavras } from '@/services/filtrosAnalise.js'
import { TEXTO_PALAVRAS, DICA_OUTLIERS_PALAVRAS, DICA_DESVIO_PALAVRAS } from '@/config/textosAnalises.js'
import { opcoesCorDoAno } from '@/config/coresProva.js'

const props = defineProps({
  ano: {
    type: Number,
    required: true
  }
})

const tooltipGrafico = TEXTO_PALAVRAS.explicacao.join('\n')

const questoes = ref([])
const carregando = ref(false)
const erro = ref('')

// Filtro de cor (estado): "todos os dias" lista as cores do ano sem repetir
const filtroCor = ref('Azul')
const rascunhoCor = ref('Azul')

// Opções de cor conforme o dia do rascunho (cada cor aparece uma vez)
const opcoesCor = computed(() => opcoesCorDoAno(props.ano, rascunhoDia.value))

const rotulo = (questao) => (questao.idioma === 'geral' ? questao.rotulo : `${questao.rotulo} (${questao.idioma})`)

const carregarQuestoes = async (ano, cor = filtroCor.value) => {
  carregando.value = true
  erro.value = ''
  try {
    const resposta = await http.get('/metricas/palavras-questoes', { params: { ano, cor } })
    questoes.value = resposta.data.questoes.map((questao) => ({
      ...questao,
      palavrasAlternativas: questao.palavrasAlternativas ?? 0
    }))
  } catch (error) {
    questoes.value = []
    erro.value = error.response?.data?.error || 'Não foi possível carregar a quantidade de palavras das questões'
  } finally {
    carregando.value = false
  }
}

watch(() => props.ano, (ano) => {
  // Cores mudam de um ano para outro; se a cor não existe no novo ano, volta para o Azul
  if (!opcoesCorDoAno(ano).some((opcao) => opcao.valor === filtroCor.value)) {
    filtroCor.value = 'Azul'
    rascunhoCor.value = 'Azul'
  }
  carregarQuestoes(ano)
}, { immediate: true })

// Questões após o filtro de área e a métrica escolhida (o filtro de dia é aplicado nos grupos)
const questoesFiltradas = computed(() =>
  filtrarPalavras(questoes.value, {
    areas: filtroAreas.value,
    metrica: filtroMetrica.value
  })
)

// Um grupo por dia da prova, com as questões já filtradas
const grupos = computed(() =>
  [1, 2]
    .filter((dia) => filtroDia.value === 'todos' || filtroDia.value === dia)
    .map((dia) => ({
      dia,
      questoes: questoesFiltradas.value.filter((questao) => questao.dia === dia)
    }))
    .filter((grupo) => grupo.questoes.length > 0)
)

// Filtros aplicados (usados no gráfico)
const filtroDia = ref('todos')
const filtroAreas = ref([])
const filtroMetrica = ref('padrao')

// Rascunho: muda enquanto o usuário marca as opções e só vira aplicado no botão Aplicar
const rascunhoDia = ref('todos')
const rascunhoAreas = ref([])
const mostrarFiltro = ref(false)
const rascunhoMetrica = ref('padrao')

const opcoesMetricas = [
  { valor: 'padrao', rotulo: 'Ordem da prova' },
  { valor: 'menor', rotulo: 'Menor quantidade' },
  { valor: 'maior', rotulo: 'Maior quantidade' },
  { valor: 'media', rotulo: 'Acima da média' },
  { valor: 'abaixo', rotulo: 'Abaixo da média' },
  {
    valor: 'outlier',
    rotulo: 'Outliers',
    dica: DICA_OUTLIERS_PALAVRAS
  },
  {
    valor: 'desvio',
    rotulo: 'Fora do desvio padrão',
    dica: DICA_DESVIO_PALAVRAS
  }
]

const opcoesDia = [
  { valor: 'todos', rotulo: 'Todos os dias' },
  { valor: 1, rotulo: 'Dia 1' },
  { valor: 2, rotulo: 'Dia 2' }
]

const opcoesAreaTodas = [
  { valor: 'LC', rotulo: 'Linguagens e Códigos', dia: 1 },
  { valor: 'CH', rotulo: 'Ciências Humanas', dia: 1 },
  { valor: 'CN', rotulo: 'Ciências da Natureza', dia: 2 },
  { valor: 'MT', rotulo: 'Matemática', dia: 2 }
]

// As áreas exibidas dependem do dia escolhido no rascunho
const opcoesArea = computed(() =>
  opcoesAreaTodas.filter((opcao) => rascunhoDia.value === 'todos' || opcao.dia === rascunhoDia.value)
)

// Ao trocar de dia no rascunho, descarta as áreas marcadas que não existem mais no filtro
watch(rascunhoDia, () => {
  const validas = new Set(opcoesArea.value.map((opcao) => opcao.valor))
  rascunhoAreas.value = rascunhoAreas.value.filter((area) => validas.has(area))
})

// Abrir o menu copia o aplicado para o rascunho; fechar sem aplicar descarta as mudanças
// Filtro aplicado, usado pela exportação para gerar o mesmo recorte da tela
defineExpose({
  obterFiltros: () => ({
    dia: filtroDia.value,
    areas: [...filtroAreas.value],
    metrica: filtroMetrica.value,
    cor: filtroCor.value
  })
})

const alternarMenuFiltro = () => {
  if (!mostrarFiltro.value) {
    rascunhoDia.value = filtroDia.value
    rascunhoAreas.value = [...filtroAreas.value]
    rascunhoMetrica.value = filtroMetrica.value
    rascunhoCor.value = filtroCor.value
  }
  mostrarFiltro.value = !mostrarFiltro.value
}

const alternarArea = (area) => {
  rascunhoAreas.value = rascunhoAreas.value.includes(area)
    ? rascunhoAreas.value.filter((a) => a !== area)
    : [...rascunhoAreas.value, area]
}

const aplicarFiltro = () => {
  const corMudou = rascunhoCor.value !== filtroCor.value
  filtroDia.value = rascunhoDia.value
  filtroAreas.value = [...rascunhoAreas.value]
  filtroMetrica.value = rascunhoMetrica.value
  // Se a cor não existe no dia aplicado, volta para Azul (ex.: Branco só existe no Dia 1)
  const existe = opcoesCorDoAno(props.ano, filtroDia.value).some((opcao) => opcao.valor === rascunhoCor.value)
  filtroCor.value = existe ? rascunhoCor.value : 'Azul'
  mostrarFiltro.value = false
  // A cor muda o texto das questões, então os dados são buscados de novo
  if (corMudou) {
    carregarQuestoes(props.ano, filtroCor.value)
  }
}

// Escala comum para os dois dias: a questão mais longa da prova (enunciado + alternativas) ocupa 100%
const maiorPalavras = computed(() =>
  Math.max(0, ...questoes.value.map((questao) => questao.palavras + questao.palavrasAlternativas))
)

// Balão escuro que segue o mouse sobre as partes da barra (mesmo padrão do gráfico de tempo)
const dica = ref(null)

const mostrarDica = (evento, texto) => {
  dica.value = { x: evento.clientX + 12, y: evento.clientY + 12, texto }
}

const moverDica = (evento) => {
  if (dica.value) {
    dica.value = { ...dica.value, x: evento.clientX + 12, y: evento.clientY + 12 }
  }
}

const ocultarDica = () => {
  dica.value = null
}

const larguraBarra = (palavras) => {
  if (maiorPalavras.value === 0) return '0%'
  return `${(palavras / maiorPalavras.value) * 100}%`
}
</script>

<style scoped>
.grafico-palavras {
  margin: 2rem 0;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.grafico-cabecalho {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.grafico-titulo {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.grafico-subtitulo {
  margin: 0 0 1.5rem;
  color: #666;
  font-size: 0.9rem;
}

.grafico-status {
  color: #666;
  padding: 1rem 0;
}

.grafico-erro {
  color: #b91c1c;
}

.grafico-dias {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
}

.grafico-dia-titulo {
  margin: 0 0 0.75rem;
  color: #0070C0;
  font-size: 1rem;
}

.barras {
  max-height: 520px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.barra-linha {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 4px;
  font-size: 0.75rem;
}

.barra-rotulo {
  min-width: 105px;
  white-space: nowrap;
  text-align: right;
  color: #333;
  font-weight: 600;
}

.barra-trilho {
  position: relative;
  flex: 1;
  background: #f0f0f0;
  border-radius: 3px;
  height: 12px;
}

.barra {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  height: 100%;
  background: linear-gradient(90deg, #0070C0 0%, #10B981 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.barra-alternativas {
  background: #93c5fd;
}

.barra-valor {
  width: 5.5rem;
  flex-shrink: 0;
  white-space: nowrap;
  color: #666;
}

.dica-flutuante {
  position: fixed;
  z-index: 1000;
  pointer-events: none;
  background: #333;
  color: #fff;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
  width: 260px;
  white-space: normal;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.eixo-x {
  margin: 0.75rem 0 0;
  color: #666;
  font-size: 0.8rem;
  text-align: center;
}

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

@media (max-width: 768px) {
  .grafico-dias {
    grid-template-columns: 1fr;
  }
}
</style>
