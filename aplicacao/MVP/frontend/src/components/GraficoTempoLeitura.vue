<template>
  <div class="grafico-tempo">
    <div class="grafico-cabecalho">
      <h3 class="grafico-titulo">{{ TEXTO_TEMPO_LEITURA.titulo }}</h3>
      <InfoIcon
        warning
        :tooltip="tooltipGrafico"
      />
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
                  name="filtro-dia"
                  :id="`dia-${opcao.valor}`"
                  :checked="rascunhoDia === opcao.valor"
                  @change="rascunhoDia = opcao.valor"
                />
                <label :for="`dia-${opcao.valor}`">{{ opcao.rotulo }}</label>
              </div>
            </div>
          </div>

          <div class="filter-secao">
            <p class="filter-titulo">ÁREA</p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesArea" :key="`area-${opcao.valor}`">
                <input
                  type="checkbox"
                  :id="`area-${opcao.valor}`"
                  :checked="rascunhoAreas.includes(opcao.valor)"
                  @change="alternarArea(opcao.valor)"
                />
                <label :for="`area-${opcao.valor}`">{{ opcao.rotulo }}</label>
              </div>
            </div>
          </div>

          <div class="filter-secao">
            <p class="filter-titulo">COR</p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesCor" :key="`cor-${opcao.valor}`">
                <input
                  type="radio"
                  name="filtro-cor"
                  :id="`cor-${opcao.valor}`"
                  :checked="rascunhoCor === opcao.valor"
                  @change="rascunhoCor = opcao.valor"
                />
                <label :for="`cor-${opcao.valor}`">{{ opcao.rotulo }}</label>
              </div>
            </div>
          </div>

          <div class="filter-secao">
            <p class="filter-titulo">MÉTRICAS</p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesTempo" :key="`tempo-${opcao.valor}`">
                <input
                  type="radio"
                  name="filtro-tempo"
                  :id="`tempo-${opcao.valor}`"
                  :checked="rascunhoTempo === opcao.valor"
                  @change="rascunhoTempo = opcao.valor"
                />
                <label :for="`tempo-${opcao.valor}`">{{ opcao.rotulo }}</label>
                <InfoIcon v-if="opcao.dica" warning :tooltip="opcao.dica" />
              </div>
            </div>
          </div>

          <div class="filter-secao">
            <p class="filter-titulo filter-titulo-com-aviso">
              DIFICULDADE
              <InfoIcon v-if="itensSemDificuldade > 0" warning :tooltip="textoAvisoDificuldade" />
            </p>
            <div class="filter-lista">
              <div class="filter-option" v-for="opcao in opcoesDificuldade" :key="`dificuldade-${opcao.valor}`">
                <input
                  type="radio"
                  name="filtro-dificuldade"
                  :id="`dificuldade-${opcao.valor}`"
                  :checked="rascunhoDificuldade === opcao.valor"
                  @change="rascunhoDificuldade = opcao.valor"
                />
                <label :for="`dificuldade-${opcao.valor}`">{{ opcao.rotulo }}</label>
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
      {{ TEXTO_TEMPO_LEITURA.subtitulo }}
    </p>


    <div v-if="dica" class="dica-flutuante" :style="{ left: `${dica.x}px`, top: `${dica.y}px` }">{{ dica.texto }}</div>

    <div v-if="carregando" class="grafico-status">Carregando dados de tempo de leitura...</div>
    <div v-else-if="erro" class="grafico-status grafico-erro">{{ erro }}</div>

    <div v-else>
      <p v-if="grupos.length === 0 && questoes.length > 0" class="grafico-status">
        Nenhuma questão corresponde aos filtros escolhidos.
      </p>

      <div class="grafico-dias">
        <div v-for="grupo in grupos" :key="grupo.dia" class="grafico-dia">
          <h4 class="grafico-dia-titulo">Dia {{ grupo.dia }} ({{ grupo.questoes.length }} {{ grupo.questoes.length === 1 ? 'questão' : 'questões' }})</h4>

          <div class="barras">
            <div
              v-for="questao in grupo.questoes"
              :key="`${questao.posicao}-${questao.idioma}`"
              class="barra-linha"
              :title="`${questao.rotulo}: ${questao.caracteres} caracteres, ${questao.tempo_leitura_minutos.toFixed(2)} min`"
            >
              <span class="barra-rotulo">{{ rotuloQuestao(questao) }}</span>
              <div
                class="barra-trilho"
                @mouseenter="mostrarDica($event, questao)"
                @mousemove="moverDica"
                @mouseleave="ocultarDica"
              >
                <div class="barra" :style="{ width: larguraBarra(questao.tempo_leitura_minutos) }"></div>
                <div
                  class="barra-restante"
                  :style="{ left: larguraBarra(questao.tempo_leitura_minutos), width: larguraBarra(restantePorQuestao(questao)) }"
                ></div>
                <div class="barra-marca" :style="{ left: larguraBarra(tempoIgualDia(grupo.dia)) }"></div>
              </div>
              <span class="barra-valor">{{ questao.tempo_leitura_minutos.toFixed(2) }}</span>
            </div>
          </div>

          <p class="eixo-x">Tempo de leitura das questões em minutos</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import http from '@/services/http.js'
import { ENEM_CONSTANTS } from '@/config/enemConstants.js'
import { TEXTO_TEMPO_LEITURA, DICA_OUTLIERS_TEMPO, DICA_DESVIO_TEMPO } from '@/config/textosAnalises.js'
import { filtrarTempoLeitura } from '@/services/filtrosAnalise.js'
import { opcoesCorDoAno } from '@/config/coresProva.js'
import FilterIcon from '@/components/icons/FilterIcon.vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'

const props = defineProps({
  ano: {
    type: Number,
    required: true
  }
})

const velocidade = ENEM_CONSTANTS.VELOCIDADE_LEITURA_CPM

const tooltipGrafico = TEXTO_TEMPO_LEITURA.explicacao.join('\n')
const questoes = ref([])
const restantePorDia = ref({})
const carregando = ref(false)
const erro = ref('')
const mostrarFiltro = ref(false)
const dica = ref(null)

// Filtros aplicados (usados no gráfico)
const filtroDia = ref('todos')
const filtroAreas = ref([])
const filtroTempo = ref('padrao')
const filtroDificuldade = ref('todas')
const filtroCor = ref('Azul')

// Rascunho: muda enquanto o usuário marca as opções e só vira aplicado no botão Aplicar
const rascunhoDia = ref('todos')
const rascunhoAreas = ref([])
const rascunhoTempo = ref('padrao')
const rascunhoDificuldade = ref('todas')
const rascunhoCor = ref('Azul')

// Cores de prova de cada ano, na ordem dos códigos (Azul, Amarelo, Branco/Cinza, Rosa/Verde).
// Em 2024 e 2025 a quarta cor é Verde, no lugar de Rosa.
// Cores de prova: estado e opções. As opções vêm de src/config/coresProva.js e mudam com o dia do rascunho.
const opcoesCor = computed(() => opcoesCorDoAno(props.ano, rascunhoDia.value))

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

const opcoesDificuldade = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'facil', rotulo: 'Fácil' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'dificil', rotulo: 'Difícil' }
]

// As áreas exibidas dependem do dia escolhido: todos os dias mostra as 4 áreas,
// o Dia 1 mostra LC e CH, e o Dia 2 mostra CN e MT
const opcoesArea = computed(() =>
  opcoesAreaTodas.filter((opcao) => rascunhoDia.value === 'todos' || opcao.dia === rascunhoDia.value)
)

// Ao trocar de dia no rascunho, descarta as áreas marcadas que não existem mais no filtro
watch(rascunhoDia, () => {
  const validas = new Set(opcoesArea.value.map((opcao) => opcao.valor))
  rascunhoAreas.value = rascunhoAreas.value.filter((area) => validas.has(area))
})

// Quantidade de itens (por posição) sem parâmetro b do TRI neste ano
const itensSemDificuldade = computed(
  () => new Set(questoes.value.filter((questao) => !questao.dificuldade).map((questao) => questao.posicao)).size
)

const textoAvisoDificuldade = computed(() => {
  const n = itensSemDificuldade.value
  return `${n} ${n === 1 ? 'item foi excluído' : 'itens foram excluídos'} dos filtros Fácil, Média e Difícil por não terem parâmetro b de dificuldade do TRI neste ano.`
})

// Abrir o menu copia o aplicado para o rascunho; fechar sem aplicar descarta as mudanças
// Filtro aplicado, usado pela exportação para gerar o mesmo recorte da tela
defineExpose({
  obterFiltros: () => ({
    dia: filtroDia.value,
    areas: [...filtroAreas.value],
    tempo: filtroTempo.value,
    dificuldade: filtroDificuldade.value,
    cor: filtroCor.value
  })
})

const alternarMenuFiltro = () => {
  if (!mostrarFiltro.value) {
    rascunhoDia.value = filtroDia.value
    rascunhoAreas.value = [...filtroAreas.value]
    rascunhoTempo.value = filtroTempo.value
    rascunhoDificuldade.value = filtroDificuldade.value
    rascunhoCor.value = filtroCor.value
  }
  mostrarFiltro.value = !mostrarFiltro.value
}

const aplicarFiltro = () => {
  const corMudou = rascunhoCor.value !== filtroCor.value
  filtroDia.value = rascunhoDia.value
  filtroAreas.value = [...rascunhoAreas.value]
  filtroTempo.value = rascunhoTempo.value
  filtroDificuldade.value = rascunhoDificuldade.value
  // Se a cor não existe no dia aplicado, volta para Azul (ex.: Branco só existe no Dia 1)
  const existe = opcoesCorDoAno(props.ano, filtroDia.value).some((opcao) => opcao.valor === rascunhoCor.value)
  filtroCor.value = existe ? rascunhoCor.value : 'Azul'
  mostrarFiltro.value = false
  // A cor muda o caderno das questões, então os dados são buscados de novo
  if (corMudou) carregarQuestoes(props.ano)
}

const opcoesTempo = [
  { valor: 'padrao', rotulo: 'Ordem da prova' },
  { valor: 'menor', rotulo: 'Menor tempo' },
  { valor: 'maior', rotulo: 'Maior tempo' },
  { valor: 'media', rotulo: 'Acima da média' },
  { valor: 'abaixo', rotulo: 'Abaixo da média' },
  {
    valor: 'outlier',
    rotulo: 'Outliers',
    dica: DICA_OUTLIERS_TEMPO
  },
  {
    valor: 'desvio',
    rotulo: 'Fora do desvio padrão',
    dica: DICA_DESVIO_TEMPO
  }
]

const alternarArea = (area) => {
  rascunhoAreas.value = rascunhoAreas.value.includes(area)
    ? rascunhoAreas.value.filter((a) => a !== area)
    : [...rascunhoAreas.value, area]
}

// Tempo igual por questão do dia: restante do dia ÷ número de questões distintas (Q1 em PT e EN conta uma vez)
// Q1 a Q5 têm versão em inglês e espanhol: o idioma aparece no rótulo para diferenciar as barras
const rotuloQuestao = (questao) => (questao.idioma === 'geral' ? questao.rotulo : `${questao.rotulo} (${questao.idioma})`)

const questoesDistintasDoDia = (dia) => new Set(questoes.value.filter((q) => q.dia === dia).map((q) => q.posicao)).size

// Quantas posições do dia aparecem duas vezes (espanhol e inglês)
const duplicadasDoDia = (dia) => {
  const contagem = new Map()
  questoes.value
    .filter((q) => q.dia === dia)
    .forEach((q) => contagem.set(q.posicao, (contagem.get(q.posicao) ?? 0) + 1))
  return [...contagem.values()].filter((n) => n > 1).length
}

const tempoIgualDia = (dia) => {
  const distintas = questoesDistintasDoDia(dia)
  return distintas === 0 ? 0 : (restantePorDia.value[dia] ?? 0) / distintas
}

const restantePorQuestao = (questao) => Math.max(0, tempoIgualDia(questao.dia) - questao.tempo_leitura_minutos)

const textoDicaTempoIgual = (dia) => {
  const duplicadas = duplicadasDoDia(dia)
  const palavraQuestao = duplicadas === 1 ? 'questão' : 'questões'
  const extra = duplicadas > 0 ? ` Esse tempo considera ${duplicadas} ${palavraQuestao} de inglês ou espanhol, não ambas.` : ''
  return `Tempo para resolver cada questão: ${tempoIgualDia(dia).toFixed(2)} min (restante do dia ÷ ${questoesDistintasDoDia(dia)} questões).${extra}`
}

const mostrarDica = (evento, questao) => {
  dica.value = {
    x: evento.clientX + 12,
    y: evento.clientY + 12,
    texto: textoDicaTempoIgual(questao.dia)
  }
}

const moverDica = (evento) => {
  if (dica.value) {
    dica.value = { ...dica.value, x: evento.clientX + 12, y: evento.clientY + 12 }
  }
}

const ocultarDica = () => {
  dica.value = null
}

const carregarQuestoes = async (ano, cor = filtroCor.value) => {
  carregando.value = true
  erro.value = ''
  try {
    const [questoesResposta, resumoResposta] = await Promise.all([
      http.get('/metricas/tempo-leitura-questoes', { params: { ano, cor } }),
      http.get('/metricas/tempo-resumo', { params: { ano } })
    ])
    questoes.value = questoesResposta.data.questoes
    restantePorDia.value = Object.fromEntries(
      (resumoResposta.data.dias ?? []).map((d) => [d.dia, d.tempo_restante_min])
    )
  } catch (error) {
    questoes.value = []
    restantePorDia.value = {}
    erro.value = error.response?.data?.error || 'Não foi possível carregar os dados de tempo de leitura'
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

// Questões após os filtros de dificuldade, área e tempo (o filtro de dia é aplicado nos grupos)
const questoesFiltradas = computed(() =>
  filtrarTempoLeitura(questoes.value, {
    dificuldade: filtroDificuldade.value,
    areas: filtroAreas.value,
    tempo: filtroTempo.value
  })
)

// Um grupo por dia da prova, com as questões já filtradas e o total de posições distintas
const grupos = computed(() =>
  [1, 2]
    .filter((dia) => filtroDia.value === 'todos' || filtroDia.value === dia)
    .map((dia) => {
      const lista = questoesFiltradas.value.filter((questao) => questao.dia === dia)
      return {
        dia,
        questoes: lista,
        total: new Set(lista.map((questao) => questao.posicao)).size
      }
    })
    .filter((grupo) => grupo.questoes.length > 0)
)

// Maior tempo entre as questões e os tempos iguais, usado como escala comum para as barras dos dois dias
const maiorTempo = computed(() =>
  Math.max(0, ...questoes.value.map((questao) => questao.tempo_leitura_minutos), tempoIgualDia(1), tempoIgualDia(2))
)

const larguraBarra = (tempo) => {
  if (maiorTempo.value === 0) return '0%'
  return `${(tempo / maiorTempo.value) * 100}%`
}
</script>

<style scoped>
.grafico-tempo {
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

.filter-titulo-com-aviso {
  display: flex;
  align-items: center;
  gap: 0.25rem;
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

/* Parte cinza: o tempo que sobra do tempo igual por questão, começando onde a barra termina */
.barra-restante {
  position: absolute;
  top: 0;
  height: 100%;
  background: #CBD5E1;
  border-radius: 0 3px 3px 0;
}

/* Linha vertical escura no tempo igual por questão do dia */
.barra-marca {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  z-index: 2;
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

@media (max-width: 768px) {
  .grafico-dias {
    grid-template-columns: 1fr;
  }
}
</style>
