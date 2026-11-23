<template>
  <div class="analise-distratores">
      <section v-if="!grafico || grafico === 'correlacoes'" class="cartao" aria-label="Correlações dos distratores">
        <div class="grafico-cabecalho">
          <h3>Correlação entre similaridade e escolha dos distratores</h3>
          <InfoIcon :largura="360" tooltip="Cada célula compara a ordenação dos valores de similaridade com a ordenação das taxas de escolha, pelo método de Spearman. O cálculo reúne os cadernos do ano por área. O p bruto é ajustado por Holm entre as comparações das três medidas e quatro áreas do ano. Cada questão contribui com quatro distratores, por isso os valores-p são exploratórios." />
        </div>
        <p v-if="carregandoCorrelacoes" role="status">Carregando correlações…</p>
        <p v-else-if="erroCorrelacoes" role="alert">{{ erroCorrelacoes }} <button type="button" @click="carregarCorrelacoes">Tentar novamente</button></p>
        <p v-else-if="!correlacoes.length" role="status">Sem correlações de distratores para este ano.</p>
        <template v-else>
          <p class="descricao">Resultados do ano selecionado, por área, com os cadernos agrupados. Questões com aspectos gráficos ou puramente matemáticos foram removidos.</p>
          <p class="correlacao-legenda"><strong>Legenda:</strong> azul = associação negativa · branco = próxima de zero · violeta = positiva · círculo escuro com ★ = p (Holm) &lt; 0,05 e |r<sub>pb</sub>| &gt; 0,7.</p>
          <p class="correlacao-legenda">O traço (—) indica que não foi possível calcular a correlação naquele grupo. Passe o cursor sobre a célula para ver o motivo e a quantidade de questões válidas.</p>
          <div class="rolagem">
            <table class="heatmap-distratores" aria-label="Correlação de Spearman por medida de similaridade e área">
              <thead>
                <tr>
                  <th scope="col">Medida de similaridade</th>
                  <th v-for="area in areasMapa" :key="area" scope="col">{{ nomes[area] }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="linha in mapaCorrelacoes" :key="linha.rotulo">
                  <th scope="row">{{ linha.rotulo }}</th>
                  <td v-for="celula in linha.celulas" :key="celula.area" :style="estiloCorrelacao(celula.r)"
                    tabindex="0" :aria-label="dicaCorrelacao(linha, celula)" :title="dicaCorrelacao(linha, celula)"
                    @mouseenter="mostrarDica($event, dicaCorrelacao(linha, celula))" @mousemove="moverDica"
                    @mouseleave="ocultarDica" @focus="mostrarDica($event, dicaCorrelacao(linha, celula))"
                    @blur="ocultarDica" @keydown.esc="ocultarDica">
                    <strong>{{ numero(celula.r, 2) }}</strong>
                    <span>p bruto = {{ formatarPMapa(celula.p) }}</span>
                    <span>p (Holm) = {{ formatarPMapa(celula.pHolm) }}</span>
                    <span>n = {{ celula.n ?? '—' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="escala-distratores" aria-label="Escala do coeficiente de Spearman de menos um a um">
              <div class="gradiente-distratores"></div>
              <div class="marcas-distratores"><span>−1</span><span>−0,5</span><span>0</span><span>0,5</span><span>1</span></div>
              <p>Coeficiente de Spearman (r)</p>
            </div>
          </div>
          <p class="correlacao-resultado" role="status"><strong>Resultado</strong> · {{ resumoCorrelacoes }}</p>
          <details class="nota">
            <summary class="filter-btn">Mais informações sobre este gráfico</summary>
            <ul>
              <li>Cada coluna representa uma área da prova. Cada linha mostra uma forma de comparar a semelhança entre as alternativas e a frequência com que as respostas erradas foram escolhidas.</li>
              <li>Spearman é uma medida que vai de −1 a 1. Valores próximos de 1 ou −1 indicam uma tendência mais forte. Perto de zero, essa tendência é mais fraca.</li>
              <li>Um valor positivo indica que respostas erradas com maior valor na medida da linha tendem a ser mais escolhidas. Um valor negativo indica que tendem a ser menos escolhidas.</li>
              <li>A proximidade relativa compara duas semelhanças: a da resposta errada com as outras respostas erradas e a dela com a correta. O valor é calculado subtraindo a segunda da primeira.</li>
              <li>n mostra quantas respostas erradas entraram no cálculo. O p bruto ajuda a avaliar se a relação observada poderia ocorrer por acaso. O p (Holm) leva em conta que várias comparações foram feitas.</li>
              <li>As quatro respostas erradas de uma mesma questão estão ligadas entre si. Por isso, os resultados devem ser lidos como pistas para a análise. Eles não provam o que levou os participantes a escolher uma alternativa.</li>
            </ul>
          </details>
        </template>
      </section>
    <template v-if="grafico !== 'correlacoes'">
      <p v-if="carregando" role="status">Carregando dados de distratores…</p>
      <div v-else-if="erro" class="erro" role="alert">{{ erro }} <button type="button" @click="carregar">Tentar novamente</button></div>
      <template v-else>
      <section v-for="painel in paineisVisiveis" :key="painel.tipo" class="cartao" :aria-label="titulos[painel.tipo]">
        <div class="grafico-cabecalho">
      <h3>{{ titulos[painel.tipo] }}</h3>
      <InfoIcon :largura="360" :tooltip="calculosTooltips[painel.tipo]" />
      <div class="filter-wrapper" @keydown.esc="painel.menu=false">
          <button type="button" class="filter-btn" :aria-expanded="painel.menu" @click="abrirFiltro(painel)">
            <FilterIcon />Filtro
          </button>
          <div v-if="painel.menu" class="filter-menu">
            <fieldset v-for="secao in secoes(painel)" :key="secao.chave">
              <legend>{{ secao.titulo }}</legend><div class="filter-lista">
              <label v-for="opcao in secao.opcoes" :key="opcao.valor" class="filter-option">
                <input v-if="secao.multipla" v-model="painel.rascunho[secao.chave]" type="checkbox" :value="opcao.valor" />
                <input v-else v-model="painel.rascunho[secao.chave]" type="radio" :name="`${painel.tipo}-${secao.chave}`" :value="opcao.valor" @change="ajustarRascunho(painel,secao.chave)" />
                {{ opcao.rotulo }}
              </label>
            </div></fieldset>
            <div class="filter-rodape"><button type="button" @click="painel.rascunho=padrao()">Limpar</button><button type="button" class="aplicar" @click="aplicar(painel)">Aplicar</button></div>
          </div>
        </div>
    </div>
        <p class="descricao">{{ descricoes[painel.tipo] }}</p>

        <p v-if="!selecionadas(painel).length" role="status">Nenhuma questão corresponde aos filtros escolhidos.</p>
        <template v-else-if="painel.tipo === 'dispersao'">
          <p>{{ pontos(painel).length }} distratores de {{ selecionadas(painel).length }} questões. Clique em um ponto para selecionar a questão nos dois gráficos de detalhe.</p>
          <div class="rolagem">
            <svg class="grafico-dispersao" viewBox="0 0 820 410" role="img" aria-label="Similaridade com a correta versus taxa de escolha do distrator">
              <text x="12" y="18">Taxa de escolha (%)</text>
              <g v-for="tick in [0,0.25,0.5,0.75,1]" :key="tick"><line x1="65" x2="790" :y1="dy(tick)" :y2="dy(tick)" stroke="#dce4ed" /><text x="12" :y="dy(tick)+4">{{ percentual(tick) }}</text></g>
              <g v-for="tick in ticksSimilaridade(painel)" :key="tick"><line :x1="dx(tick,painel)" :x2="dx(tick,painel)" y1="40" y2="335" stroke="#edf1f5" /><text :x="dx(tick,painel)" y="359" text-anchor="middle">{{ numero(tick,2) }}</text></g>
              <line x1="65" x2="65" y1="40" y2="335" stroke="#334155" /><line x1="65" x2="790" y1="335" y2="335" stroke="#334155" />
              <circle v-for="ponto in pontosIntercalados(painel)" :key="`${ponto.q.id}-${ponto.d.letra}`" :cx="dx(ponto.d.similaridade,painel)" :cy="dy(ponto.d.taxa)" class="ponto-distrator" r="3.5" :fill="corCaderno(ponto.q.cor)" fill-opacity="0.55" :stroke="contornoCaderno(ponto.q.cor)" :stroke-width="contornoCaderno(ponto.q.cor) === '#334155' ? 1.2 : 0.6" tabindex="0" role="button" :aria-label="dicaPonto(ponto)" @mouseenter="mostrarDica($event,dicaPonto(ponto))" @mousemove="moverDica($event)" @mouseleave="ocultarDica" @focus="mostrarDica($event,dicaPonto(ponto))" @blur="ocultarDica" @keydown.esc="ocultarDica" :aria-describedby="flutuante.visivel ? tooltipId : undefined" @click="abrirQuestao(ponto.q,painel)" @keydown.enter.prevent="abrirQuestao(ponto.q,painel)" @keydown.space.prevent="abrirQuestao(ponto.q,painel)"></circle>
              <text x="425" y="397" text-anchor="middle">Similaridade do distrator com a alternativa correta</text>
            </svg>
          </div>
          <div class="legenda legenda-cadernos" aria-label="Cores dos cadernos">
            <span v-for="cor in cadernosDosPontos(painel)" :key="cor">
              <i :style="{ backgroundColor: corCaderno(cor), borderColor: contornoCaderno(cor) }" aria-hidden="true"></i>{{ cor }}
            </span>
          </div>
          <p class="nota">Similaridade não é probabilidade. O eixo inclui valores negativos quando presentes. A associação visual não demonstra causa.</p>
        </template>
        <template v-else>
          <template v-if="questaoAtual(painel)">
            <p class="questao-info" aria-live="polite">
              <strong>Questão {{ questaoAtual(painel).posicao }}</strong><br />
              <small>
                Caderno {{ questaoAtual(painel).cor }}
                · Gabarito {{ questaoAtual(painel).gabarito }}
                <template v-if="['inglês', 'espanhol'].includes(questaoAtual(painel).idioma?.toLowerCase())">
                  · {{ questaoAtual(painel).idioma }}
                </template>
              </small>
            </p>
            <template v-if="painel.tipo === 'barras'">
              <div class="rolagem">
                <svg class="grafico-barras" viewBox="0 0 760 390" role="img" aria-label="Taxa de escolha das cinco alternativas">
                  <g v-for="tick in [0,0.25,0.5,0.75,1]" :key="tick"><line x1="65" x2="735" :y1="by(tick)" :y2="by(tick)" stroke="#dce4ed" /><text x="10" :y="by(tick)+4">{{ percentual(tick) }}</text></g>
                  <g v-for="(a,i) in alternativas(questaoAtual(painel))" :key="a.letra" tabindex="0" role="img" :aria-label="dicaAlternativa(a,questaoAtual(painel))" @mouseenter="mostrarDica($event,dicaAlternativa(a,questaoAtual(painel)))" @mousemove="moverDica($event)" @mouseleave="ocultarDica" @focus="mostrarDica($event,dicaAlternativa(a,questaoAtual(painel)))" @blur="ocultarDica" @keydown.esc="ocultarDica" :aria-describedby="flutuante.visivel ? tooltipId : undefined">
                    
                    <rect :x="100+i*130" :y="by(a.taxa)" width="65" :height="a.taxa*270" :fill="corAlternativa(a,questaoAtual(painel))" />
                    <text :x="132.5+i*130" :y="by(a.taxa)-9" text-anchor="middle">{{ percentual(a.taxa) }}</text><text :x="132.5+i*130" y="340" text-anchor="middle">{{ a.letra }}{{ a.correta ? ' ✓' : '' }}</text>
                  </g>
                  <text x="400" y="378" text-anchor="middle">Alternativas</text>
                </svg>
              </div>
              <div class="paginacao-questoes" role="group" aria-label="Navegação pelas questões filtradas">
                <button type="button" aria-label="Questão anterior" :disabled="indiceQuestao(painel) === 0"
                  @click="irParaIndice(painel, indiceQuestao(painel) - 1)">‹</button>
                <input :value="indiceQuestao(painel) + 1" aria-label="Posição na lista de questões filtradas"
                  title="Digite a posição na lista ou o número original, como Q46"
                  @change="irParaQuestao(painel, $event)" @keydown.enter.prevent="$event.target.blur()" />
                <span>/ {{ selecionadas(painel).length }}</span>
                <button type="button" aria-label="Próxima questão" :disabled="indiceQuestao(painel) === selecionadas(painel).length - 1"
                  @click="irParaIndice(painel, indiceQuestao(painel) + 1)">›</button>
              </div>
              <p class="legenda"><span style="color:#16804a">■ Correta</span><span style="color:#5B3A9E">■ Distrator mais semelhante à correta</span><span style="color:#0070c0">■ Demais distratores</span></p>
              <p>Distrator(es) mais semelhante(s): <b>{{ maisSimilares(questaoAtual(painel)).join(', ') }}</b>. Mais escolhido(s): <b>{{ maisEscolhidos(questaoAtual(painel)).join(', ') }}</b>.</p>
            </template>
            <template v-else>
              <MatrizSimilaridadeAlternativas
                :letras="letras"
                :valor-comparacao="(a, b) => valorComparacao(questaoAtual(painel), a, b)"
                :dica-comparacao="(a, b, valor, diagonal) => dicaComparacao(questaoAtual(painel), a, b, valor, diagonal)"
                :gabarito="questaoAtual(painel).gabarito"
                :indice="indiceQuestao(painel)"
                :total="selecionadas(painel).length"
                @ir-para-indice="irParaIndice(painel, $event)"
                @ir-para-questao="irParaQuestao(painel, $event)"
              />
            </template>
          </template>
        </template>
        <details :key="painel.tipo" class="nota">
          <summary class="filter-btn">Mais informações sobre este gráfico</summary>
          <ul v-if="painel.tipo === 'dispersao'" class="correlacao-notas">
            <li>Cada ponto é uma resposta errada, também chamada de distrator. Uma questão pode aparecer com até quatro pontos.</li>
            <li>Quanto mais à direita, mais o texto da resposta errada se parece com o da correta. Quanto mais acima, mais participantes escolheram essa resposta.</li>
            <li>Pontos no alto à direita mostram respostas erradas parecidas com a correta e bastante escolhidas. O gráfico ajuda a encontrar esses casos para examinar a questão.</li>
            <li> Similaridade de Cosseno: Mede o quão próximos dois textos estão em significado. Quanto mais perto de 1,0, maior a semelhança semântica. </li>
            <li>Passe o cursor ou use a tecla Tab nos pontos para ver os detalhes. Clique em um ponto para abrir a questão no gráfico de barras e selecioná-la também na tabela de semelhanças.</li>
          </ul>
          <ul v-else-if="painel.tipo === 'barras'" class="correlacao-notas">
            <li>Cada barra representa uma alternativa da questão. Quanto mais alta, maior a porcentagem de participantes que escolheu aquela resposta.</li>
            <li>Verde e ✓ indicam a resposta correta. Violeta escuro indica a resposta errada mais parecida com a correta, incluindo empates. Azul indica as outras respostas erradas.</li>
            <li>A resposta errada mais escolhida pode ser diferente da mais parecida com a correta. Compare as duas para entender melhor a questão.</li>
            <li>Use as setas para mudar de questão. Você também pode digitar uma posição na lista ou o número da questão com Q, como Q46. O total muda conforme os filtros e inclui as versões disponíveis em inglês e espanhol.</li>
            <li>Os filtros escolhem as questões que entram na lista. Cada questão aberta mostra as cinco alternativas. Passe o cursor ou use a tecla Tab nas barras para consultar os valores.</li>
          </ul>
          <ul v-else class="correlacao-notas">
            <li>Similaridade de Cosseno: Mede o quão próximos dois textos estão em significado. Quanto mais perto de 1,0, maior a semelhança semântica.</li>
            <li>A tabela compara os textos das alternativas A a E. Cada quadrado mostra o quanto a alternativa da linha se parece com a da coluna.</li>
            <li>A comparação de A com B é igual à de B com A. O traço na diagonal aparece porque ali uma alternativa seria comparada com ela mesma.</li>
            <li>Observe a linha ou coluna da resposta correta para ver quais respostas erradas mais se parecem com ela.</li>
            <li>Use as setas abaixo da tabela para mudar de questão. Você também pode digitar uma posição na lista ou o número da questão com Q, como Q46. O total acompanha os filtros. A tabela mostra todas as comparações da questão aberta.</li>
          </ul>
        </details>
      </section>
      </template>
    </template>
    <Teleport to="body">
      <div v-if="flutuante.visivel" :id="tooltipId" ref="tooltipElemento" class="tooltip-mouse" role="tooltip" :style="{left:flutuante.x+'px',top:flutuante.y+'px'}">{{ flutuante.texto }}</div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onBeforeUnmount } from 'vue'
import MatrizSimilaridadeAlternativas from './MatrizSimilaridadeAlternativas.vue'
import { useDicaGrafico } from './useDicaGrafico.js'
import http from '@/services/http.js'
import FilterIcon from '@/components/icons/FilterIcon.vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'
const props = defineProps({ano:{type:[Number,String],required:true},grafico:String,endpoint:{type:String,default:'/metricas/distratores'}})
const emit = defineEmits(['abrir-detalhe-distrator'])
const dados=ref([]), carregando=ref(false), erro=ref('')
const corrMostrarMais = ref(false)
const { tooltipId, tooltipElemento, flutuante, mostrarDica, moverDica, ocultarDica } = useDicaGrafico()
const letras=['A','B','C','D','E']
const nomes={LC:'Linguagens e Códigos',CH:'Ciências Humanas',CN:'Ciências da Natureza',MT:'Matemática'}
const paletaCadernos = {
  azul: '#0070C0',
  amarelo: '#FACC15',
  amarela: '#FACC15',
  branco: '#FFFFFF',
  branca: '#FFFFFF',
  rosa: '#EC4899',
  cinza: '#6B7280',
  verde: '#16804A',
  laranja: '#EA580C',
  roxo: '#7C3AED',
  roxa: '#7C3AED',
}
function nomeCorCaderno(cor) {
  return cor.trim().toLocaleLowerCase('pt-BR')
}
function corCaderno(cor) {
  return paletaCadernos[nomeCorCaderno(cor)] ?? '#475569'
}
function contornoCaderno(cor) {
  return ['amarelo', 'amarela', 'branco', 'branca'].includes(nomeCorCaderno(cor)) ? '#334155' : '#FFFFFF'
}
function cadernosDosPontos(painel) {
  return [...new Set(pontos(painel).map(ponto => ponto.q.cor))].sort((a, b) => a.localeCompare(b))
}
const titulos={dispersao:'Similaridade × taxa de escolha dos distratores',barras:'Escolha das alternativas por questão',matriz:'Similaridade entre as alternativas'}
const calculosTooltips = {
  dispersao: 'Cada ponto usa a similaridade entre o texto de uma alternativa errada e o da correta, calculada através da diferença de cossenos, ou seja, o quão semanticamente próxima estão as duas alternativas. A taxa de escolha é a quantidade de respostas que marcou essa alternativa dividida pelo total de respostas usado para a questão e o caderno, apresentada em porcentagem.',
  barras: 'Cada barra usa a taxa de escolha da alternativa: quantidade de respostas que marcou a letra dividida pelo total de respostas usado para a questão e o caderno, em porcentagem. A correta vem do gabarito. Os distratores destacados são os que têm a maior similaridade com a correta, incluindo empates. O filtro de similaridade média usa a soma das quatro similaridades com a correta dividida por quatro.',
  matriz: 'Cada célula usa a similaridade registrada entre os textos de duas alternativas. A comparação de A com B é igual à de B com A, totalizando dez pares diferentes. A diagonal não é calculada no gráfico. Os filtros de similaridade usam a média das quatro comparações dos distratores com a correta; os de acerto usam a taxa da alternativa correta.',
}
const descricoes={dispersao:'Cada ponto representa uma alternativa incorreta. Os filtros numéricos atuam sobre os distratores.',barras:'Percentual de candidatos que escolheu cada alternativa. Os filtros numéricos selecionam questões; as cinco alternativas continuam visíveis.',matriz:'Mapa de calor das dez comparações entre alternativas. Os filtros numéricos selecionam questões.'}
const cores=computed(()=>[...new Set(dados.value.map(q=>q.cor))].sort((a,b)=>a.localeCompare(b)))
function padrao(tipo) {
  const corInicial = cores.value.includes('Azul') ? 'Azul' : cores.value[0]
  return {
    dia: '', areas: areasDoDia(''), cores: (tipo === 'barras' || tipo === 'matriz') && corInicial ? [corInicial] : [],
    similaridade: '', taxa: '',
  }
}
const paineis=reactive(['dispersao','barras','matriz'].map(tipo=>({tipo,filtros:padrao(tipo),rascunho:padrao(tipo),menu:false,selecionada:'',dica:''})))
const paineisVisiveis = computed(() => paineis.filter(painel => !props.grafico || painel.tipo === props.grafico))
const media=valores=>valores.length?valores.reduce((s,v)=>s+v,0)/valores.length:null
const numero=(v,casas=3)=>typeof v==='number' && Number.isFinite(v)?v.toLocaleString('pt-BR',{minimumFractionDigits:casas,maximumFractionDigits:casas}):'—'
const areasMapa = ['CH', 'LC', 'CN', 'MT']
const correlacoes = ref([])
const carregandoCorrelacoes = ref(false)
const erroCorrelacoes = ref('')
const medidasMapa = [
  { chave: 'similaridade_com_correta', rotulo: 'Com a correta' },
  { chave: 'sim_media_outros_distratores', rotulo: 'Com outros distratores' },
  { chave: 'diferenca_similaridade', rotulo: 'Proximidade relativa' },
]
const mapaCorrelacoes = computed(() => medidasMapa.map(({ chave, rotulo }) => ({
  rotulo,
  celulas: areasMapa.map(area => {
    const registro = correlacoes.value.find(r => r.area === area && r.variavel === chave)
    return { area, n: registro?.n, r: registro?.spearman_rho ?? null,
      p: registro?.spearman_p ?? null, pHolm: registro?.spearman_p_holm ?? null }
  }),
})))
const resumoCorrelacoes = computed(() => {
  const validas = mapaCorrelacoes.value.flatMap(linha => linha.celulas).filter(celula => Number.isFinite(celula.r))
  if (!validas.length) return 'Não há combinações com dados suficientes para calcular as relações neste ano.'
  const avaliadas = validas.filter(celula => Number.isFinite(celula.pHolm))
  if (!avaliadas.length) return 'Há relações calculadas, mas faltam os valores de p (Holm) para avaliar a evidência estatística.'
  const significativas = avaliadas.filter(celula => celula.pHolm < 0.05).length
  const resultado = `${significativas} de ${avaliadas.length} combinações avaliadas têm p (Holm) abaixo de 0,05.`
  const interpretacao = significativas
    ? 'Isso sugere uma relação neste conjunto de dados, mas não prova o que levou à escolha das respostas erradas.'
    : 'Não encontramos evidência estatística clara de uma relação após o ajuste. Isso não prova que não exista uma relação.'
  const ausentes = validas.length - avaliadas.length
  return `${resultado} ${interpretacao}${ausentes ? ` Faltam valores de p (Holm) em ${ausentes} combinação(ões).` : ''}`
})
function formatarPMapa(p) {
  return Number.isFinite(p) && p > 0 && p < 0.001 ? p.toExponential(2) : numero(p)
}
function estiloCorrelacao(r) {
  if (r === null) return { backgroundColor: '#f3f4f6' }
  const extremo = r < 0 ? [0, 112, 192] : [167, 139, 250]
  const canais = extremo.map(canal => Math.round(255 + (canal - 255) * Math.abs(r)))
  return { backgroundColor: `rgb(${canais.join(',')})`, color: r < -0.65 ? '#fff' : '#172b42' }
}
const percentual=v=>typeof v==='number' && Number.isFinite(v)?v.toLocaleString('pt-BR',{style:'percent',maximumFractionDigits:1}):'—'
const rotuloQuestao=q=>`Q${q.posicao} · ${q.area} · ${q.cor} · ${q.idioma}`
function areasDoDia(dia) {
  return dia === '1' ? ['LC', 'CH'] : dia === '2' ? ['CN', 'MT'] : ['LC', 'CH', 'CN', 'MT']
}
function secoes(p){
 const areas = areasDoDia(p.rascunho.dia)
 const comparacoes=[{valor:'',rotulo:'Todas'},{valor:'acima',rotulo:'Acima da média'},{valor:'abaixo',rotulo:'Abaixo da média'}]
 return [
 {chave:'dia',titulo:'DIA',opcoes:[{valor:'',rotulo:'Todos os dias'},{valor:'1',rotulo:'Dia 1'},{valor:'2',rotulo:'Dia 2'}]},
 {chave:'areas',titulo:'ÁREA',multipla:true,opcoes:areas.map(a=>({valor:a,rotulo:nomes[a]}))},
 {chave:'cores',titulo:'COR DO CADERNO',multipla:true,opcoes:cores.value.map(c=>({valor:c,rotulo:c}))},
 {chave:'similaridade',titulo:p.tipo==='dispersao'?'SIMILARIDADE COM A CORRETA':'SIMILARIDADE MÉDIA DA QUESTÃO',opcoes:comparacoes},
 {chave:'taxa',titulo:p.tipo==='dispersao'?'TAXA DE ESCOLHA DO DISTRATOR':'TAXA DE ACERTO DA QUESTÃO',opcoes:comparacoes}
 ]
}
function abrirFiltro(p){ocultarDica();if(!p.menu)p.rascunho={...p.filtros};p.menu=!p.menu}
function ajustarRascunho(p, chave) {
  if (chave === 'dia') {
    const validas = areasDoDia(p.rascunho.dia)
    p.rascunho.areas = p.rascunho.areas.filter(area => validas.includes(area))
    if (!p.rascunho.areas.length) p.rascunho.areas = validas
  }
}
function aplicar(p){ocultarDica();p.filtros={...p.rascunho};p.menu=false;p.dica='';p.selecionada=''}
function calcular_grupo(p) {
  const f = p.filtros
  return dados.value.filter(q => (!f.dia || q.dia === Number(f.dia))
    && (!f.areas.length || f.areas.includes(q.area))
    && (!f.cores.length || f.cores.includes(q.cor)))
}
function calcular_todosPontos(p){return grupo(p).flatMap(q=>q.distratores.map(d=>({q,d})))}
function calcular_referencias(p){const g=grupo(p);return p.tipo==='dispersao'?{sim:media(g.flatMap(q=>q.distratores.map(d=>d.similaridade))),taxa:media(g.flatMap(q=>q.distratores.map(d=>d.taxa)))}:{sim:media(g.map(q=>q.similaridade_media)),taxa:media(g.map(q=>q.taxa_correta))}}
function compara(v,regra,ref){return !regra||(regra==='acima'?v>ref:v<ref)}
function calcular_pontos(p){const r=referencias(p);return todosPontos(p).filter(({d})=>compara(d.similaridade,p.filtros.similaridade,r.sim)&&compara(d.taxa,p.filtros.taxa,r.taxa))}
function calcular_selecionadas(p){if(p.tipo==='dispersao'){const ids=new Set(pontos(p).map(v=>v.q.id));return grupo(p).filter(q=>ids.has(q.id))}const r=referencias(p);return grupo(p).filter(q=>compara(q.similaridade_media,p.filtros.similaridade,r.sim)&&compara(q.taxa_correta,p.filtros.taxa,r.taxa))}
function calcular_questaoAtual(p){const qs=selecionadas(p);return qs.find(q=>q.id===p.selecionada)||qs[0]||null}
function mudarQuestao(p,id){ocultarDica();p.selecionada=id;p.dica='';for(const outro of paineis)if(outro!==p&&outro.tipo!=='dispersao'&&selecionadas(outro).some(q=>q.id===id)){outro.selecionada=id;outro.dica=''}}
function indiceQuestao(painel) {
  return selecionadas(painel).indexOf(questaoAtual(painel))
}
function irParaIndice(painel, indice) {
  const questao = selecionadas(painel)[indice]
  if (questao) mudarQuestao(painel, questao.id)
}
function irParaQuestao(painel, evento) {
  const campo = evento.target
  const entrada = campo.value.trim()
  const numeroOriginal = /^q(\d+)$/i.exec(entrada)
  if (numeroOriginal) {
    const posicao = Number(numeroOriginal[1])
    if (questaoAtual(painel)?.posicao !== posicao) {
      const questao = selecionadas(painel).find(q => q.posicao === posicao)
      if (questao) mudarQuestao(painel, questao.id)
    }
  } else if (/^\d+$/.test(entrada)) {
    irParaIndice(painel, Number(entrada) - 1)
  }
  campo.value = String(indiceQuestao(painel) + 1)
}
function abrirQuestao(q, origem) {
  ocultarDica()
  for (const painel of paineis) {
    if (painel.tipo === 'dispersao') continue
    painel.filtros = { ...origem.filtros, similaridade: '', taxa: '' }
    painel.selecionada = q.id
    painel.dica = ''
    painel.menu = false
  }
  if (props.grafico) emit('abrir-detalhe-distrator')
}
function resumoFiltros(p) {
  const { dia, areas, cores } = p.filtros
  return [
    dia ? `Dia ${dia}` : 'Todos os dias',
    !areas.length || areas.length === areasDoDia(dia).length
      ? 'Todas as áreas'
      : areas.map(area => nomes[area]).join(', '),
    cores.join(', ') || 'Todos os cadernos',
  ].join(' · ')
}
// O domínio vem do grupo antes dos filtros numéricos para manter a escala ao comparar.
function calcular_minimoSimilaridade(p){return todosPontos(p).some(v=>v.d.similaridade<0)?-1:0}
function ticksSimilaridade(p){return minimoSimilaridade(p)<0?[-1,-0.5,0,0.5,1]:[0,0.25,0.5,0.75,1]}
function dx(v,p){const min=minimoSimilaridade(p);return 65+(v-min)/(1-min)*725}
const dy=v=>335-v*295
const by=v=>310-v*270
function dicaPonto({ q, d }) {
  return `${rotuloQuestao(q)} · Distrator ${d.letra} · Correta ${q.gabarito} · Similaridade: ${numero(d.similaridade)} · Taxa de escolha: ${percentual(d.taxa)} · Cálculo da taxa: respostas que marcaram ${d.letra} ÷ total usado para esta questão e caderno × 100. · Similaridade: comparação entre os textos de ${d.letra} e ${q.gabarito}, fornecida na base. Quanto maior o valor, mais parecidos os textos.`
}
function alternativas(q){return letras.map(letra=>letra===q.gabarito?{letra,taxa:q.taxa_correta,correta:true}:({...q.distratores.find(d=>d.letra===letra),correta:false}))}
function maisSimilares(q){return q.distratores.filter(d=>Math.abs(d.similaridade-q.similaridade_maxima)<1e-9).map(d=>d.letra)}
function maisEscolhidos(q){const max=Math.max(...q.distratores.map(d=>d.taxa));return q.distratores.filter(d=>Math.abs(d.taxa-max)<1e-9).map(d=>d.letra)}
function corAlternativa(a,q){return a.correta?'#16804a':maisSimilares(q).includes(a.letra)?'#5B3A9E':'#0070c0'}
function dicaAlternativa(a, q) {
  const classificacao = a.correta ? 'correta' : 'distrator'
  const similaridade = a.correta
    ? 'Resposta correta identificada pelo gabarito.'
    : `Similaridade com ${q.gabarito}: ${numero(a.similaridade)}. Valor da comparação dos textos fornecido na base.`
  return `${rotuloQuestao(q)} · Alternativa ${a.letra} (${classificacao}) · Taxa de escolha: ${percentual(a.taxa)} · Cálculo: respostas que marcaram ${a.letra} ÷ total usado para esta questão e caderno × 100. · ${similaridade} · O destaque violeta usa a maior similaridade com a correta entre os quatro distratores, incluindo empates.`
}
function valorComparacao(q, a, b) {
  return q.similaridades[[a, b].sort().join('')]
}
function dicaComparacao(q, a, b, valor, diagonal) {
  return diagonal
    ? `${a} × ${b}: mesma alternativa · Não há cálculo nesta célula, pois o texto seria comparado com ele mesmo.`
    : `${rotuloQuestao(q)} · ${a} × ${b}: ${numero(valor)} · Cálculo: comparação entre os textos das alternativas ${a} e ${b}, registrada na base de similaridades. · A mesma medida vale para ${b} × ${a}. Há dez pares diferentes entre as cinco alternativas. · Valores maiores indicam textos mais parecidos.${a === q.gabarito || b === q.gabarito ? ' Uma das alternativas é a correta.' : ''}`
}
function dicaCorrelacao(linha, celula) {
  return `${linha.rotulo} · ${nomes[celula.area]} · Spearman: ${numero(celula.r, 2)} · n = ${celula.n ?? '—'} · p bruto: ${formatarPMapa(celula.p)} · p (Holm): ${formatarPMapa(celula.pHolm)} · Cálculo: Spearman compara a ordenação da medida desta linha com a ordenação das taxas de escolha, reunindo os cadernos por área e ano. · n conta os distratores válidos. Cada questão contribui com quatro distratores. · Holm ajusta os valores-p das comparações calculáveis das três medidas e quatro áreas do ano. Os valores-p são exploratórios.`
}
function validarQuestao(q){return typeof q.id==='string'&&typeof q.cor==='string'&&typeof q.idioma==='string'&&letras.includes(q.gabarito)&&Number.isInteger(q.posicao)&&[1,2].includes(q.dia)&&Number.isFinite(q.taxa_correta)&&q.taxa_correta>=0&&q.taxa_correta<=1&&Number.isFinite(q.similaridade_media)&&Number.isFinite(q.similaridade_maxima)&&Array.isArray(q.distratores)&&q.distratores.length===4&&new Set(q.distratores.map(d=>d.letra)).size===4&&q.distratores.every(d=>letras.includes(d.letra)&&d.letra!==q.gabarito&&Number.isFinite(d.taxa)&&d.taxa>=0&&d.taxa<=1&&Number.isFinite(d.similaridade)&&Math.abs(d.similaridade)<=1)&&q.similaridades&&['AB','AC','AD','AE','BC','BD','BE','CD','CE','DE'].every(par=>Number.isFinite(q.similaridades[par])&&Math.abs(q.similaridades[par])<=1)}
// As seleções são calculadas uma vez por alteração de filtro, não a cada ponto SVG.
const vistas = new WeakMap()
function vista(p) {
 if (!vistas.has(p)) {
  const v = {}
  vistas.set(p,v)
  v.grupo=computed(()=>calcular_grupo(p))
  v.todosPontos=computed(()=>calcular_todosPontos(p))
  v.referencias=computed(()=>calcular_referencias(p))
  v.pontos=computed(()=>calcular_pontos(p))
  v.pontosIntercalados = computed(() => intercalarCadernos(v.pontos.value))
  v.selecionadas=computed(()=>calcular_selecionadas(p))
  v.questaoAtual=computed(()=>calcular_questaoAtual(p))
  v.minimoSimilaridade=computed(()=>calcular_minimoSimilaridade(p))
 }
 return vistas.get(p)
}
function grupo(p){return vista(p).grupo.value}
function todosPontos(p){return vista(p).todosPontos.value}
function referencias(p){return vista(p).referencias.value}
function pontos(p){return vista(p).pontos.value}
function pontosIntercalados(painel) {
  return vista(painel).pontosIntercalados.value
}
function intercalarCadernos(lista) {
  const grupos = new Map()
  for (const ponto of lista) {
    if (!grupos.has(ponto.q.cor)) grupos.set(ponto.q.cor, [])
    grupos.get(ponto.q.cor).push(ponto)
  }
  const cadernos = [...grupos.keys()].sort((a, b) => a.localeCompare(b))
  const quantidade = Math.max(0, ...[...grupos.values()].map(grupo => grupo.length))
  const resultado = []
  for (let indice = 0; indice < quantidade; indice++) {
    for (let deslocamento = 0; deslocamento < cadernos.length; deslocamento++) {
      const cor = cadernos[(indice + deslocamento) % cadernos.length]
      const ponto = grupos.get(cor)[indice]
      if (ponto) resultado.push(ponto)
    }
  }
  return resultado
}

function selecionadas(p){return vista(p).selecionadas.value}
function questaoAtual(p){return vista(p).questaoAtual.value}
function minimoSimilaridade(p){return vista(p).minimoSimilaridade.value}
let controlador
async function carregar(){
 ocultarDica()
 controlador?.abort();const atual=new AbortController();controlador=atual
 carregando.value=true;erro.value='';dados.value=[]
 for(const p of paineis){p.menu=false;p.dica='';p.selecionada=''}
 try{
  const resposta=await http.get(props.endpoint,{params:{ano:props.ano},signal:atual.signal})
  const payload=resposta.data
  if(!payload||!Array.isArray(payload.questoes))throw new Error('Resposta inválida da API de distratores. Confira a rota e o serviço http.js.')
  if(!payload.questoes.every(validarQuestao))throw new Error('A API retornou questões incompletas ou valores inválidos.')
  if(controlador===atual){dados.value=payload.questoes;for(const p of paineis){p.filtros=padrao(p.tipo);p.rascunho=padrao(p.tipo)}}
 }catch(e){if(e.name!=='AbortError'&&e.code!=='ERR_CANCELED'&&controlador===atual)erro.value=e.response?.data?.error||e.message}
 finally{if(controlador===atual)carregando.value=false}
}
let controladorCorrelacoes
async function carregarCorrelacoes() {
  controladorCorrelacoes?.abort()
  if (props.grafico && props.grafico !== 'correlacoes') return
  const atual = new AbortController()
  controladorCorrelacoes = atual
  correlacoes.value = []
  erroCorrelacoes.value = ''
  carregandoCorrelacoes.value = true
  try {
    const { data } = await http.get(`${props.endpoint}/correlacoes`, {
      params: { ano: props.ano }, signal: atual.signal,
    })
    if (!Array.isArray(data?.correlacoes)) throw new Error('Resposta inválida da API de correlações.')
    if (!atual.signal.aborted) correlacoes.value = data.correlacoes
  } catch (e) {
    if (!atual.signal.aborted) erroCorrelacoes.value = e.response?.data?.error || e.message
  } finally {
    if (controladorCorrelacoes === atual) carregandoCorrelacoes.value = false
  }
}
watch(()=>[props.ano,props.endpoint,props.grafico],carregarCorrelacoes,{immediate:true})
watch(()=>[props.ano,props.endpoint],carregar,{immediate:true})
watch(() => props.grafico, () => {
  ocultarDica()
  for (const painel of paineis) painel.menu = false
})
onBeforeUnmount(()=>{controlador?.abort();controladorCorrelacoes?.abort()})
</script>

<style scoped>
.heatmap-distratores { margin: 1rem auto; min-width: 650px; border-spacing: 3px; }
.heatmap-distratores th { padding: .5rem; font-size: .85rem; }
.heatmap-distratores tbody th { text-align: right; }
.heatmap-distratores td { min-width: 110px; padding: .6rem; text-align: center; }
.heatmap-distratores td strong { display: block; font-size: 1.2rem; }
.heatmap-distratores td span { display: block; font-size: .75rem; }
.escala-distratores { width: min(65%, 480px); min-width: 240px; margin: 1rem auto; text-align: center; font-size: .8rem; }
.gradiente-distratores { height: .85rem; background: linear-gradient(to right, #0070c0, #fff, #a78bfa); }
.marcas-distratores { display: flex; justify-content: space-between; }
details .filter-btn { width: fit-content; cursor: pointer; }
.analise-distratores{font-family:inherit;color:#24364b}.cartao{margin:2rem 0;padding:1.5rem;background:white;border-radius:12px;box-shadow:0 2px 8px #00000014}.cartao h3{margin:0 0 .4rem;font-size:1.2rem;color:#222}.descricao,.nota,.referencia,.resumo-filtros{font-size:.88rem;line-height:1.5;color:#536273}.resumo-filtros{font-weight:600}.filter-wrapper{position:relative;display:inline-block;margin:.3rem 0}.filter-btn{display:flex;align-items:center;gap:6px;background:white;border:1px solid #0070c0;color:#0070c0;padding:7px 12px;font-size:13px;border-radius:5px}.filter-btn svg{width:15px;height:15px}.filter-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:20;width:270px;max-width:calc(100vw - 90px);max-height:65vh;overflow-y:auto;padding:12px;background:white;border:1px solid #ddd;border-radius:6px;box-shadow:0 4px 14px #0002}fieldset{border:0;margin:0;padding:8px 0 12px;min-width:0}fieldset+fieldset{border-top:1px solid #ddd;padding-top:12px}legend{font-size:11px;font-weight:600;color:#555;padding:4px 0}.filter-option{display:flex;align-items:center;gap:9px;padding:7px 4px;font-size:13px;cursor:pointer}.filter-option input{accent-color:#0070c0;margin:0}.filter-rodape{display:flex;justify-content:space-between;border-top:1px solid #ddd;padding-top:12px;gap:12px}button,select{font:inherit;cursor:pointer}button{border:1px solid #aab9c9;border-radius:5px;background:white;padding:7px 12px;color:#24364b}.aplicar{background:#0070c0;color:white;border:0}.rolagem{overflow-x:auto}.grafico-dispersao{width:100%;min-width:640px;aspect-ratio:820/410}.grafico-barras{width:100%;min-width:560px;aspect-ratio:760/390}svg text{font:12px system-ui,sans-serif;fill:#34455a}circle{cursor:pointer}.dica{min-height:44px;padding:10px;background:#f1f5f9;border-radius:6px;font-size:.88rem;line-height:1.5}.legenda{display:flex;flex-wrap:wrap;gap:15px;font-size:.85rem}.selecao-questao{display:grid;gap:7px;font-size:.9rem}.selecao-questao select{width:100%;max-width:650px;padding:9px;border:1px solid #aab9c9;border-radius:5px;background:white}.questao-info{font-size:1.25rem;font-weight:600}.erro{color:#b91c1c;padding:16px}:focus-visible{outline:3px solid #c57900;outline-offset:3px}svg g:focus rect,svg circle:focus{stroke:#171717;stroke-width:3}@media(max-width:600px){.cartao{padding:14px}}
.tooltip-mouse{position:fixed;z-index:10000;pointer-events:none;white-space:pre-line;box-sizing:border-box;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow:hidden;background:#111827;color:#fff;padding:10px 12px;border:1px solid #334155;border-radius:5px;box-shadow:0 4px 12px #0003;font:12px/1.6 system-ui,sans-serif}
.filter-wrapper{display:block;width:fit-content;margin-inline-start:auto}
.filter-menu{inset-inline:auto 0}
.paginacao-questoes{display:flex;align-items:center;justify-content:center;gap:8px;margin:16px 0}
.paginacao-questoes input{width:4em;text-align:center;font:inherit;padding:7px 4px;border:1px solid #aab9c9;border-radius:5px}
.paginacao-questoes button:disabled{opacity:.45;cursor:default}

.formalidade,
.cartao {
  padding: 1.5rem;
  margin: 1.5rem 0;
  border: 0;
  border-radius: 8px;
  background: white;
  box-shadow: 0 1px 4px rgb(0 0 0 / 8%);
  color: #263238;
  font-family: inherit;
}

.grafico-cabecalho {
  display: flex;
  align-items: center;
  gap: .5rem;
}

.grafico-cabecalho h3 {
  margin: 0;
  color: #263238;
  font-size: 1.25rem;
}

.grafico-cabecalho .filter-wrapper {
  position: relative;
  display: inline-block;
  width: auto;
  margin: 0 0 0 auto;
  flex-shrink: 0;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .45rem .8rem;
  border: 2px solid #0070c0;
  border-radius: 6px;
  background: white;
  color: #0070c0;
  font-size: .9rem;
  font-weight: 600;
  white-space: nowrap;
}

.filter-menu {
  top: calc(100% + .5rem);
  right: 0;
  left: auto;
  z-index: 100;
  box-sizing: border-box;
  width: 300px;
  max-width: calc(100vw - 56px);
  padding: .75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgb(0 0 0 / 15%);
}

.filter-menu fieldset {
  padding: 0;
  margin: 0;
  border: 0;
  min-width: 0;
}

.filter-menu fieldset + fieldset {
  margin-top: .75rem;
  padding-top: .75rem;
  border-top: 1px solid #e0e0e0;
}

.filter-menu legend {
  padding: .25rem .5rem;
  color: #667085;
  font-size: .75rem;
  font-weight: 700;
}

.filter-lista {
  max-height: 4.5rem;
  overflow-y: auto;
}

.filter-lista .filter-option {
  box-sizing: border-box;
  height: 2.25rem;
  padding: 0 .5rem;
  margin: 0;
  border-radius: 4px;
  color: #333;
  font-size: .9rem;
}

.filter-option:hover { background: #f5f5f5; }
.filter-option input { flex-shrink: 0; width: 16px; height: 16px; }

.filter-rodape {
  justify-content: flex-end;
  margin-top: .5rem;
  padding-top: .75rem;
  border-color: #e0e0e0;
}

.filter-aplicar,
.filter-rodape .aplicar {
  padding: .5rem 1rem;
  border: 0;
  border-radius: 6px;
  background: #0070c0;
  color: white;
  font-size: .9rem;
  font-weight: 600;
}

.filter-aplicar:hover,
.filter-rodape .aplicar:hover { background: #005a9e; }
.formalidade p { font-size: .9rem; color: #536273; }
.legenda-questoes { color: #333; font-size: .9rem; gap: 1.25rem; }

@media (max-width: 600px) {
  .formalidade, .cartao { padding: 14px; }
  .grafico-cabecalho { flex-wrap: wrap; }
}

.filter-wrapper .filter-btn svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.legenda-cadernos{margin:1rem 0}
.legenda-cadernos span{display:inline-flex;align-items:center;gap:.5rem}
.legenda-cadernos i{display:inline-block;width:12px;height:12px;border:1px solid;box-sizing:border-box;border-radius:50%;flex-shrink:0}

.grafico-dispersao .ponto-distrator:hover,
.grafico-dispersao .ponto-distrator:focus {
  r: 6;
  fill-opacity: 1;
  stroke: #172b42;
  stroke-width: 2;
}
.correlacao-resultado{margin:.65rem 0;color:#475467;font-size:.9rem;line-height:1.5}
</style>
