<template>
  <div class="tempo-igual">
    <div class="cabecalho">
      <h3 class="titulo">Tempo disponível por questão</h3>
      <InfoIcon warning tooltip="Informação a ser adicionada" />
    </div>
    <p class="subtitulo">
      Caderno Azul. Tempo igual por questão = restante do dia ÷ número de questões do dia.
      A parte colorida é o tempo de leitura estimado da questão; a cinza é o que sobra para resolver.
    </p>

    <div class="filter-wrapper">
      <button type="button" class="filter-btn" @click="alternarMenuFiltro">
        <FilterIcon />
        Filtro
      </button>
      <div v-if="mostrarFiltro" class="filter-menu">
        <div class="filter-secao">
          <p class="filter-titulo">DIA</p>
          <div class="filter-option" v-for="opcao in opcoesDia" :key="`igual-dia-${opcao.valor}`">
            <input
              type="radio"
              name="tempo-igual-filtro-dia"
              :id="`igual-dia-${opcao.valor}`"
              :checked="rascunhoDia === opcao.valor"
              @change="rascunhoDia = opcao.valor"
            />
            <label :for="`igual-dia-${opcao.valor}`">{{ opcao.rotulo }}</label>
          </div>
        </div>

        <div class="filter-rodape">
          <button type="button" class="filter-aplicar" @click="aplicarFiltro">Aplicar</button>
        </div>
      </div>
    </div>

    <div v-if="carregando" class="status">Carregando dados de tempo...</div>
    <div v-else-if="erro" class="status erro">{{ erro }}</div>

    <div v-else class="dias">
      <div v-for="grupo in gruposVisiveis" :key="grupo.dia" class="dia">
        <h4 class="dia-titulo">
          Dia {{ grupo.dia }} ({{ grupo.questoes.length }} questões) · {{ grupo.tempoIgual.toFixed(2) }} min por questão
        </h4>

        <div class="barras">
          <div
            v-for="questao in grupo.questoes"
            :key="questao.posicao"
            class="barra-linha"
            :title="`${questao.rotulo}: leitura ${questao.tempo_leitura_minutos.toFixed(2)} min, tempo igual ${grupo.tempoIgual.toFixed(2)} min`"
          >
            <span class="barra-rotulo">{{ questao.rotulo }}</span>
            <div class="barra-trilho">
              <div class="barra-leitura" :style="{ width: percentual(questao.tempo_leitura_minutos) }"></div>
              <div
                class="barra-restante"
                :style="{
                  left: percentual(questao.tempo_leitura_minutos),
                  width: percentual(restanteQuestao(questao, grupo.tempoIgual))
                }"
              ></div>
              <div class="barra-marca" :style="{ left: percentual(grupo.tempoIgual) }"></div>
            </div>
            <span class="barra-valor">{{ questao.tempo_leitura_minutos.toFixed(2) }}</span>
          </div>
        </div>

        <p class="eixo-x">Minutos. A linha vertical marca o tempo igual por questão.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import http from '@/services/http.js'
import FilterIcon from '@/components/icons/FilterIcon.vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'

const props = defineProps({
  ano: {
    type: Number,
    required: true
  }
})

const opcoesDia = [
  { valor: 'todos', rotulo: 'Todos os dias' },
  { valor: 1, rotulo: 'Dia 1' },
  { valor: 2, rotulo: 'Dia 2' }
]

const questoes = ref([])
const restantePorDia = ref({})
const carregando = ref(false)
const erro = ref('')
const mostrarFiltro = ref(false)
const diaSelecionado = ref('todos')
const rascunhoDia = ref('todos')

// Uma barra por questão. Q1 a Q5 vêm em espanhol e inglês: fica só a primeira versão de cada número.
const questoesPorDia = computed(() => {
  const unicas = new Map()
  questoes.value.forEach((questao) => {
    const chave = `${questao.dia}-${questao.posicao}`
    if (!unicas.has(chave)) unicas.set(chave, questao)
  })

  return [1, 2].map((dia) => ({
    dia,
    questoes: [...unicas.values()]
      .filter((questao) => questao.dia === dia)
      .sort((a, b) => a.posicao - b.posicao)
  }))
})

// Tempo igual por questão = restante do dia ÷ número de questões do dia
const grupos = computed(() =>
  questoesPorDia.value
    .filter((grupo) => grupo.questoes.length > 0)
    .map((grupo) => ({
      ...grupo,
      tempoIgual: (restantePorDia.value[grupo.dia] ?? 0) / grupo.questoes.length
    }))
)

const gruposVisiveis = computed(() =>
  diaSelecionado.value === 'todos'
    ? grupos.value
    : grupos.value.filter((grupo) => grupo.dia === diaSelecionado.value)
)

// Escala comum aos dois dias: o maior valor entre leitura e tempo igual do ano
const escala = computed(() =>
  Math.max(
    0,
    ...grupos.value.flatMap((grupo) => [
      grupo.tempoIgual,
      ...grupo.questoes.map((questao) => questao.tempo_leitura_minutos)
    ])
  )
)

const percentual = (valor) => (escala.value === 0 ? '0%' : `${(valor / escala.value) * 100}%`)

// Parte cinza: o que sobra do tempo igual depois da leitura. Zera se a leitura passar do tempo igual.
const restanteQuestao = (questao, tempoIgual) => Math.max(0, tempoIgual - questao.tempo_leitura_minutos)

async function carregar(ano) {
  carregando.value = true
  erro.value = ''

  try {
    const [respostaQuestoes, respostaResumo] = await Promise.all([
      http.get('/metricas/tempo-leitura-questoes', { params: { ano } }),
      http.get('/metricas/tempo-resumo', { params: { ano } })
    ])
    questoes.value = respostaQuestoes.data.questoes
    restantePorDia.value = Object.fromEntries(
      respostaResumo.data.dias.map((dia) => [dia.dia, dia.tempo_restante_min])
    )
  } catch (err) {
    questoes.value = []
    restantePorDia.value = {}
    erro.value = err.response?.data?.error || 'Não foi possível carregar o tempo por questão'
  } finally {
    carregando.value = false
  }
}

watch(() => props.ano, carregar, { immediate: true })

function alternarMenuFiltro() {
  mostrarFiltro.value = !mostrarFiltro.value
  rascunhoDia.value = diaSelecionado.value
}

function aplicarFiltro() {
  diaSelecionado.value = rascunhoDia.value
  mostrarFiltro.value = false
}
</script>

<style scoped>
.tempo-igual {
  margin: 2rem 0;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.cabecalho {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.titulo {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.subtitulo {
  margin: 0 0 1rem;
  color: #666;
  font-size: 0.9rem;
}

.status {
  padding: 1rem 0;
  color: #666;
}

.erro {
  color: #c0392b;
}

.filter-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 1rem;
}



.filter-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  padding: 1rem;
  margin-top: 0.5rem;
  min-width: 240px;
  z-index: 100;
}

.filter-titulo {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #555;
}

.filter-option {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  margin: 0.15rem 0;
  border-radius: 4px;
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
}

.filter-aplicar:hover {
  background: #005a9e;
}

.dia-titulo {
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
  min-width: 36px;
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
  overflow: hidden;
}

.barra-leitura {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: #0070C0;
}

.barra-restante {
  position: absolute;
  top: 0;
  height: 100%;
  background: #CBD5E1;
}

.barra-marca {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: #333;
}

.barra-valor {
  min-width: 40px;
  color: #666;
}

.eixo-x {
  margin: 0.75rem 0 0;
  color: #666;
  font-size: 0.8rem;
  text-align: center;
}
</style>
