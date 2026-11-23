<template>
  <div>
<section v-if="painel" :key="painel.modo" class="formalidade" aria-label="Análise de formalidade">
    <div class="grafico-cabecalho">
      <h3>{{ titulosFormalidade[painel.modo] }}</h3>
      <InfoIcon :largura="360" :tooltip="calculosFormalidade[painel.modo]" />
      <div class="filter-wrapper" @keydown.esc="painel.mostrarFiltro=false">
        <button type="button" class="filter-btn" :aria-expanded="painel.mostrarFiltro" @click="painel.alternarMenuFiltro">
          <FilterIcon />
          Filtro
        </button>
        <div v-if="painel.mostrarFiltro" class="filter-menu">
          <fieldset class="filter-secao"><legend>DIA</legend><div class="filter-lista">
            <label v-for="opcao in painel.opcoesDia" :key="opcao.valor" class="filter-option"><input v-model="painel.rascunho.dia" type="radio" :name="`dia-${painel.modo}`" :value="opcao.valor" />{{ opcao.rotulo }}</label>
          </div></fieldset>
          <fieldset class="filter-secao"><legend>ÁREA</legend><div class="filter-lista">
            <label v-for="area in painel.areasRascunho" :key="area" class="filter-option">
              <input v-model="painel.rascunho.areas" type="checkbox" :value="area" />{{ painel.nomes[area] }}
            </label>
          </div></fieldset>
          <fieldset class="filter-secao"><legend>FORMALIDADE</legend><div class="filter-lista">
            <label v-for="opcao in painel.opcoesClasse" :key="opcao.valor" class="filter-option"><input v-model="painel.rascunho.classe" type="radio" :name="`classe-${painel.modo}`" :value="opcao.valor" />{{ opcao.rotulo }}</label>
          </div></fieldset>
          <fieldset class="filter-secao"><legend>COMPARAR À MÉDIA</legend><div class="filter-lista">
            <label v-for="opcao in painel.opcoesMedia" :key="opcao.valor" class="filter-option"><input v-model="painel.rascunho.media" type="radio" :name="`painel.media-${painel.modo}`" :value="opcao.valor" />{{ opcao.rotulo }}</label>
          </div></fieldset>
          <fieldset v-if="painel.modo === 'histograma'" class="filter-secao"><legend>INTERVALOS DO HISTOGRAMA</legend><div class="filter-lista">
            <label v-for="n in ['10','20','50']" :key="n" class="filter-option"><input v-model="painel.rascunho.bins" type="radio" name="histograma-intervalos" :value="n" />{{ n }} intervalos</label>
          </div></fieldset>
          <fieldset v-if="painel.alvo === 'taxa_acerto'" class="filter-secao"><legend>AMOSTRA</legend><div class="filter-lista">
            <label class="filter-option"><input v-model="painel.rascunho.amostra" type="radio" name="desempenho-amostra" value="todos_itens_validos" />Todos os itens válidos</label>
            <label class="filter-option"><input v-model="painel.rascunho.amostra" type="radio" name="desempenho-amostra" value="itens_com_b_valido" />Somente itens com b válido</label>
          </div></fieldset>
          <div class="filter-rodape"><button type="button" class="filter-limpar" @click="Object.assign(painel.rascunho,painel.padrao())">Limpar</button><button type="button" class="filter-aplicar" @click="painel.aplicarFiltro">Aplicar</button></div>
        </div>
      </div>
    </div>
    <p v-if="!painel.alvo">Estimativa do modelo sobre o texto extraído da questão. O score não representa a dificuldade.</p>
    <p v-if="painel.carregando" role="status">Carregando questões…</p>
    <div v-else-if="painel.erro" role="alert">{{ painel.erro }} <button @click="painel.carregar">Tentar novamente</button></div>
    <template v-else>

      <p v-if="painel.descartadas" role="status">{{ painel.descartadas }} registro(s) sem posição ou score válido foram excluídos.</p>
      <template v-if="!painel.alvo">
        <div class="indicadores" aria-live="polite">
          <article><span>Média do grupo</span><strong>{{ painel.numero(painel.referencia) }}</strong><small>{{ painel.grupo.length }} questões antes dos filtros de classificação e média</small></article>
          <article><span>Formais nas exibidas</span><strong>{{ painel.proporcao }}</strong><small>{{ painel.formais }} de {{ painel.visiveis.length }} questões</small></article>
          <article><span>Maior score nas exibidas</span><strong>{{ painel.numero(painel.maximas[0]?.formal_score) }}</strong><small :title="painel.rotulos(painel.maximas)">{{ painel.resumo(painel.maximas) }}</small></article>
          <article><span>Menor score nas exibidas</span><strong>{{ painel.numero(painel.minimas[0]?.formal_score) }}</strong><small :title="painel.rotulos(painel.minimas)">{{ painel.resumo(painel.minimas) }}</small></article>
        </div>
        <p>Média das questões exibidas: <b>{{ painel.numero(painel.media(painel.visiveis)) }}</b>. Referência dos filtros acima/abaixo: <b>{{ painel.numero(painel.referencia) }}</b>, calculada por dia e área.</p>
      </template>
      <p v-if="!painel.visiveis.length" role="status">Nenhuma questão corresponde aos filtros.</p>
      <template v-else>
        <template v-if="painel.modo === 'questoes'">
          <div class="grade-questoes">
            <article v-for="area in painel.paineisArea" :key="area.sigla" class="area-questoes">
              <h4>{{ painel.nomes[area.sigla] }}</h4>
              <svg class="pontos-questoes" viewBox="0 0 400 196" role="group" :aria-label="`Formalidade em ${painel.nomes[area.sigla]}`">
                <g aria-hidden="true">
                  <text x="8" y="14">Score de formalidade</text>
                  <g v-for="tick in [0, 0.25, 0.5, 0.75, 1]" :key="tick">
                    <line x1="42" x2="374" :y1="scoreY(tick)" :y2="scoreY(tick)" :class="{ corte: tick === 0.5 }" />
                    <text x="34" :y="scoreY(tick) + 4" text-anchor="end">{{ tick.toLocaleString('pt-BR') }}</text>
                  </g>
                  <text v-for="posicao in area.marcas" :key="posicao" :x="questaoX(posicao, area.inicio)" y="168" text-anchor="middle">Q{{ posicao }}</text>
                  <text x="208" y="190" text-anchor="middle">Número original da questão</text>
                  <text v-if="!area.questoes.length" x="208" y="72" text-anchor="middle">Nenhuma questão exibida</text>
                </g>
                <circle v-for="q in area.questoes" :key="q.chave"
                  :cx="questaoX(q.posicao, area.inicio) + (q.posicao <= 5 ? deslocamentoIdioma(q.idioma) : 0)" :cy="scoreY(q.formal_score)" r="4.4"
                  :class="q.classificacao" tabindex="0" role="img" :aria-label="painel.tooltip(q)"
                  @mouseenter="mostrarDica($event, painel.tooltip(q))" @mousemove="moverDica"
                  @mouseleave="ocultarDica" @focus="mostrarDica($event, painel.tooltip(q))"
                  @click="mostrarDica($event, painel.tooltip(q))" @blur="ocultarDica" @keydown.esc="ocultarDica" />
              </svg>
            </article>
          </div>
        </template>
        <template v-if="painel.modo === 'dispersao'">
        <p>Cada ponto representa uma questão. Eixo X: quantidade de palavras; eixo Y: score original de formalidade (0 a 1). Pontos coincidentes podem se sobrepor.</p>
        <p v-if="painel.semPalavras" role="status">{{ painel.semPalavras }} questão(ões) sem quantidade de palavras válida não aparecem na dispersão.</p>
        <p v-if="!painel.pontos.length" role="status">Sem dados de quantidade de palavras para os filtros selecionados.</p>
        <template v-else>
          <div class="rolagem" tabindex="0" aria-label="Gráfico de dispersão com rolagem horizontal">
            <svg class="dispersao" viewBox="0 0 800 410" role="img" aria-label="Dispersão: quantidade de palavras versus score de formalidade">
              <text x="12" y="20">Score de formalidade</text>
              <g v-for="tick in [0,0.25,0.5,0.75,1]" :key="`score-${tick}`">
                <line x1="65" x2="775" :y1="painel.sy(tick)" :y2="painel.sy(tick)" :stroke="tick === 0.5 ? '#64748b' : '#dce4ed'" :stroke-dasharray="tick === 0.5 ? '6 4' : undefined" />
                <text x="14" :y="painel.sy(tick)+4">{{ tick.toLocaleString('pt-BR') }}</text>
              </g>
              <g v-for="tick in painel.ticksPalavras" :key="`palavras-${tick}`">
                <line :x1="painel.sx(tick)" :x2="painel.sx(tick)" y1="40" y2="335" stroke="#e8edf3" />
                <text :x="painel.sx(tick)" y="357" text-anchor="middle">{{ tick.toLocaleString('pt-BR') }}</text>
              </g>
              <line x1="65" x2="65" y1="40" y2="335" stroke="#334155" />
              <line x1="65" x2="775" y1="335" y2="335" stroke="#334155" />
              <circle v-for="q in painel.pontos" :key="q.chave" :cx="painel.sx(q.quantidade_palavras)" :cy="painel.sy(q.formal_score)" r="5" fill-opacity="0.65" stroke="white" stroke-width="0.8" :fill="q.classificacao === 'formal' ? '#0070c0' : '#be3654'" tabindex="0" role="img" :aria-label="painel.tooltipDispersao(q)" @mouseenter="mostrarDica($event,painel.tooltipDispersao(q))" @mousemove="moverDica($event)" @mouseleave="ocultarDica" @focus="mostrarDica($event,painel.tooltipDispersao(q))" @blur="ocultarDica" @keydown.esc="ocultarDica" :aria-describedby="flutuante.visivel ? tooltipId : undefined">
              </circle>
              <text x="420" y="395" text-anchor="middle">Quantidade de palavras</text>
            </svg>
          </div>
        </template>
        </template>
        <template v-if="painel.modo === 'histograma'">
          <p>Cada barra conta questões em um intervalo de score. Os intervalos incluem o limite inicial e excluem o final; o último inclui 1. O traço marca o corte de classificação em 0,5.</p>
          <div class="rolagem">
            <svg class="histograma" viewBox="0 0 800 410" role="img" aria-label="Histograma dos scores de formalidade">
              <text x="8" y="20">Quantidade de questões</text>
              <g v-for="tick in painel.histTicks" :key="tick"><line x1="65" x2="775" :y1="330-tick/painel.histLimite*270" :y2="330-tick/painel.histLimite*270" stroke="#dce4ed" /><text x="18" :y="334-tick/painel.histLimite*270">{{ tick }}</text></g>
              <g v-for="bin in painel.histBins" :key="bin.indice" tabindex="0" role="img" :aria-label="bin.dica" @mouseenter="mostrarDica($event,bin.dica)" @mousemove="moverDica" @mouseleave="ocultarDica" @focus="mostrarDica($event,bin.dica)" @blur="ocultarDica" @keydown.esc="ocultarDica">
                <rect :x="65+bin.indice*710/painel.histBins.length+1" :y="330-bin.quantidade/painel.histLimite*270" :width="710/painel.histBins.length-2" :height="bin.quantidade/painel.histLimite*270" fill="#0070c0" :fill-opacity="bin.quantidade ? 0.85 : 0.2" />
              </g>
              <line x1="420" x2="420" y1="40" y2="330" stroke="#334155" stroke-dasharray="5 4" />
              <g v-for="tick in [0,0.2,0.4,0.6,0.8,1]" :key="tick"><text :x="65+tick*710" y="355" text-anchor="middle">{{ tick.toLocaleString('pt-BR') }}</text></g>
              <text x="420" y="395" text-anchor="middle">Score de formalidade (0 a 1)</text>
            </svg>
          </div>
          <p>{{ painel.visiveis.length }} questões distribuídas em {{ painel.histBins.length }} intervalos.</p>
        </template>
        <template v-if="painel.alvo">
          <p v-if="painel.semDesempenho" role="status">{{ painel.semDesempenho }} questão(ões) fora da amostra ou sem valor válido de desempenho não aparecem nesta dispersão.</p>
          <p v-if="!painel.pontosDesempenho.length" role="status">Sem dados válidos de desempenho para esta seleção.</p>
          <template v-else>
            <label class="ampliar-formalidade">
              <input v-model="painel.ampliarFormalidade" type="checkbox" />
              Ampliar escala de formalidade (Para ver pontos com scores semelhantes com mais clareza).
            </label>
            <p v-if="painel.ampliarFormalidade" class="nota-correlacao" role="status">
              As linhas tracejadas marcam a mudança de escala. O trecho central é ampliado e os extremos são comprimidos.
            </p>
            <div class="rolagem">
              <svg class="desempenho-svg" viewBox="0 0 800 410" role="img" aria-label="Dispersão de formalidade versus desempenho">
                <text x="10" y="20">Score de formalidade</text>
                <g v-for="tick in painel.ticksFormalidade" :key="tick">
                  <line x1="65" x2="775" :y1="painel.perfY(tick)" :y2="painel.perfY(tick)"
                    :stroke="painel.mudancasEscala.includes(tick) ? '#64748b' : '#dce4ed'"
                    :stroke-dasharray="painel.mudancasEscala.includes(tick) ? '5 4' : undefined" />
                  <text x="56" :y="painel.perfY(tick) + 4" text-anchor="end">{{ tick.toLocaleString('pt-BR', { maximumFractionDigits: 5 }) }}</text>
                </g>
                <g v-for="tick in painel.perfTicks" :key="tick">
                  <line :x1="painel.perfX(tick)" :x2="painel.perfX(tick)" y1="40" y2="335" stroke="#edf1f5" />
                  <text :x="painel.perfX(tick)" y="357" text-anchor="middle">{{ painel.perfRotulo(tick) }}</text>
                </g>
                <circle v-for="q in painel.pontosDesempenho" :key="q.chave" :cx="painel.perfX(q[painel.alvo])" :cy="painel.perfY(q.formal_score)" r="5" fill-opacity="0.65" :fill="q.classificacao==='formal'?'#0070c0':'#be3654'" stroke="white" stroke-width="0.6" tabindex="0" role="img" :aria-label="painel.perfDica(q)" @mouseenter="mostrarDica($event,painel.perfDica(q))" @mousemove="moverDica" @mouseleave="ocultarDica" @focus="mostrarDica($event,painel.perfDica(q))" @blur="ocultarDica" @keydown.esc="ocultarDica" />
                <text x="420" y="395" text-anchor="middle">{{ painel.alvo === 'taxa_acerto' ? 'Taxa de acerto (%)' : 'Parâmetro b TRI' }}</text>
              </svg>
            </div>
            <p>{{ painel.pontosDesempenho.length }} questões com dados válidos. Pontos coincidentes podem se sobrepor.</p>
          </template>
        </template>
        <div v-if="(painel.modo === 'questoes' || (painel.modo === 'dispersao' && painel.pontos.length) || (painel.alvo && painel.pontosDesempenho.length))" class="legenda-questoes">
          <span><span class="formal" aria-hidden="true">●</span> Formal (&gt; 0,5)</span>
          <span><span class="informal" aria-hidden="true">●</span> Informal (≤ 0,5)</span>
          <span v-if="painel.modo === 'questoes'">┄ Corte em 0,5</span>
        </div>
        <details :key="painel.modo">
          <summary class="filter-btn">Mais informações sobre este gráfico</summary>
          <ul class="correlacao-notas">
            <template v-if="painel.modo === 'questoes'">
              <li>Cada ponto é uma questão. O número abaixo indica sua posição na prova e a altura mostra sua nota de formalidade, de 0 a 1.</li>
              <li>As áreas usam a mesma escala. Assim, você pode comparar a altura dos pontos entre elas. Os números originais das questões são mantidos ao filtrar.</li>
              <li>Inglês e espanhol aparecem separadamente nas questões 1 a 5. Os pontos ficam um pouco afastados para facilitar a consulta.</li>
            </template>
            <template v-else-if="painel.modo === 'dispersao'">
              <li>Cada ponto é uma questão. Na horizontal está a quantidade de palavras. Na vertical está a nota de formalidade.</li>
              <li>Pontos mais à direita representam textos mais longos. Pontos mais acima representam textos que o modelo avaliou como mais formais.</li>
              <li>Questões sem contagem de palavras disponível ficam fora do gráfico. Pontos no mesmo lugar podem cobrir uns aos outros.</li>
            </template>
            <template v-else-if="painel.modo === 'histograma'">
              <li>Cada barra conta quantas questões têm uma nota de formalidade dentro de uma faixa. Uma barra mais alta indica mais questões naquela faixa.</li>
              <li>No filtro, escolha quantas faixas quer ver. Mais faixas permitem observar diferenças menores entre as notas.</li>
              <li>Uma nota que fica na divisa entre duas faixas entra na faixa à direita. A última faixa inclui a nota 1. O traço em 0,5 marca a divisão entre formal e informal.</li>
              <li>Passe o cursor ou use a tecla Tab nas barras para ver a faixa, a quantidade de questões e sua porcentagem no grupo mostrado.</li>
            </template>
            <template v-else>
              <li v-if="painel.alvo === 'taxa_acerto'">Cada ponto é uma questão. Quanto mais à direita, maior a porcentagem de acertos. Quanto mais acima, maior a nota de formalidade.</li>
              <li v-else>Cada ponto é uma questão. Quanto mais à direita, maior a dificuldade indicada pelo parâmetro b, uma medida usada na correção do ENEM. Quanto mais acima, maior a nota de formalidade.</li>
              <li>Questões sem dados de acerto ou de dificuldade, conforme o gráfico, ficam fora da visualização.</li>
              <li>Ampliar escala de formalidade abre mais espaço onde as notas estão próximas, mantendo todos os pontos. Os trechos entre as linhas tracejadas usam escalas diferentes. Por isso, uma mesma distância na tela pode representar diferenças diferentes nas notas.</li>
            </template>
            <li>A nota de formalidade é uma avaliação feita pelo modelo a partir do texto extraído da questão. Quanto maior a nota, mais formal o modelo considera o texto.</li>
            <li>As versões em inglês e espanhol das questões 1 a 5 aparecem juntas. O gráfico mostra tendências e não prova que a formalidade causou uma mudança no desempenho.</li>
          </ul>
        </details>
      </template>
    </template>
  </section>
    <section v-else-if="grafico === 'correlacoes'" class="formalidade correlacao-painel" aria-label="Correlações de formalidade">
      <div class="grafico-cabecalho">
      <h3>Correlação da formalidade com o desempenho e a dificuldade</h3>
      <InfoIcon :largura="360" tooltip="Spearman compara a ordenação dos escores de formalidade com a ordenação das taxas de acerto ou do parâmetro b, por área e ano. São usados pares com valores válidos; a linha de dificuldade usa apenas itens com b válido. O ajuste de Holm considera em conjunto os testes calculáveis da análise entre anos, áreas, escores, desfechos e amostras. n informa os pares usados." />
      </div>
      <p v-if="corrCarregando" role="status">Carregando correlações…</p>
      <div v-else-if="corrErro" role="alert">{{ corrErro }} <button type="button" @click="carregarCorrelacoes">Tentar novamente</button></div>
      <template v-else>
        <p v-if="!corrDados.length" role="status">Sem correlações para este ano.</p>
        <template v-else>
        <p class="correlacao-legenda"><strong>Legenda:</strong> azul = associação negativa · branco = próxima de zero · violeta = positiva · círculo escuro com ★ = p (Holm) &lt; 0,05 e |r<sub>pb</sub>| &gt; 0,7.</p>
        <p class="correlacao-legenda">O traço (—) indica que não foi possível calcular a correlação naquele grupo. Passe o cursor sobre a célula para ver o motivo e a quantidade de questões válidas.</p>
        <p v-if="corrLimitacaoHumanas2024" class="nota-correlacao">
          <strong>Limitação dos dados em Ciências Humanas (2024).</strong>
          As 45 questões têm o mesmo escore de formalidade na base utilizada (0,9986).
          Sem variação nesses escores, a correlação de Spearman com a taxa de acerto e com a dificuldade TRI fica indefinida.
        </p>
          <div class="rolagem">
            <svg class="correlacoes-svg" viewBox="0 0 1000 400" role="group" aria-label="Mapa de correlações entre formalidade, taxa de acerto e dificuldade TRI por área">
              <text v-for="(area, i) in corrAreas" :key="area" :x="275 + i * 185" y="38" text-anchor="middle" class="correlacao-eixo">{{ corrNomeArea(area) }}</text>
              <g v-for="(desfecho, indice) in corrLinhas" :key="desfecho.rotulo" :transform="`translate(0, ${indice * 108})`">
                <text x="171" y="111" text-anchor="end" class="correlacao-eixo">{{ desfecho.rotulo }}</text>
                <g v-for="(linha, i) in desfecho.celulas" :key="linha.area" tabindex="0" role="img" :aria-label="corrDica(linha)"
                  @mouseenter="mostrarDica($event, corrDica(linha))" @mousemove="moverDica" @mouseleave="ocultarDica"
                  @focus="mostrarDica($event, corrDica(linha))" @blur="ocultarDica" @keydown.esc="ocultarDica">
                  <rect :x="186 + i * 185" y="55" width="178" height="104" :fill="corrCor(linha)" stroke="white">
                    <title>{{ corrDica(linha) }}</title>
                  </rect>
                  <text :x="275 + i * 185" y="88" text-anchor="middle" class="correlacao-valor" :style="{ fill: corrCorTexto(linha) }">{{ corrNumero(corrValor(linha), 2) }}</text>
                  <text :x="275 + i * 185" y="113" text-anchor="middle" class="correlacao-detalhe" :style="{ fill: corrCorTexto(linha) }">p bruto = {{ corrFormatarP(linha.spearman_p) }}</text>
                  <text :x="275 + i * 185" y="134" text-anchor="middle" class="correlacao-detalhe" :style="{ fill: corrCorTexto(linha) }">p (Holm) = {{ corrFormatarP(linha.spearman_p_holm) }}</text>
                </g>
              </g>
              <defs>
                <linearGradient :id="tooltipId + '-gradiente'">
                  <stop offset="0%" stop-color="#0070C0" />
                  <stop offset="50%" stop-color="#FFFFFF" />
                  <stop offset="100%" stop-color="#A78BFA" />
                </linearGradient>
              </defs>
              <rect x="280" y="305" width="550" height="22" :fill="`url(#${tooltipId}-gradiente)`" />
              <text v-for="tick in [-1, -0.5, 0, 0.5, 1]" :key="tick" :x="280 + (tick + 1) * 275" y="350" text-anchor="middle" class="correlacao-eixo">{{ corrNumero(tick, 1) }}</text>
              <text x="555" y="380" text-anchor="middle" class="correlacao-eixo">Coeficiente de Spearman (r)</text>
            </svg>
          </div>
          <p class="correlacao-leitura"><strong>Resultado</strong> · {{ corrResumo }}</p>
          <button type="button" class="filter-btn" :aria-expanded="corrMostrarMais" @click="corrMostrarMais = !corrMostrarMais">{{ corrMostrarMais ? 'Ocultar informações sobre este gráfico' : 'Mais informações sobre este gráfico' }}</button>
          <ul v-if="corrMostrarMais" class="correlacao-notas">
            <li>Cada quadrado mostra a relação entre a formalidade e o acerto ou a dificuldade em uma área da prova.</li>
            <li>Spearman é uma medida que vai de −1 a 1. Quanto mais perto de 1 ou −1, mais forte a tendência. Perto de zero, a tendência é mais fraca.</li>
            <li>Na linha de acertos, um valor positivo indica que questões mais formais tendem a ter mais acertos. Na linha de dificuldade, indica que tendem a ser mais difíceis. Um valor negativo indica a tendência inversa.</li>
            <li>n informa quantas questões entraram no cálculo. Passe o cursor ou use a tecla Tab nos quadrados para consultar mais detalhes.</li>
            <li>O p bruto ajuda a avaliar se a relação observada poderia ocorrer por acaso. O p (Holm) leva em conta as várias comparações feitas na análise, entre anos, áreas e medidas.</li>
            <li>Uma relação entre os valores não prova que a formalidade seja a causa dos acertos ou da dificuldade.</li>
          </ul>
        </template>
      </template>
    </section>

    <Teleport to="body">
      <div v-if="flutuante.visivel" :id="tooltipId" ref="tooltipElemento" class="tooltip-mouse" role="tooltip" :style="{left:flutuante.x+'px',top:flutuante.y+'px'}">{{ flutuante.texto }}</div>
    </Teleport>
  </div>
</template>
<script setup>
import { computed, reactive, ref, watch, onBeforeUnmount } from 'vue'
import { useDicaGrafico } from './useDicaGrafico.js'
import http from '@/services/http.js'
import FilterIcon from '@/components/icons/FilterIcon.vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'
function normalizar(questoes) {
  return questoes.flatMap(q => {
    const posicao = Number(q.questao ?? q.posicao)
    const score = q.formal_score
    if (!Number.isInteger(posicao) || posicao < 1 || posicao > 180 || typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) return []
    const dia = posicao <= 90 ? 1 : 2
    const area = posicao <= 45 ? 'LC' : posicao <= 90 ? 'CH' : posicao <= 135 ? 'CN' : 'MT'
    const lingua = String(q.idioma || 'geral').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const chave = posicao <= 5 ? `${posicao}-${lingua}` : String(posicao)
    return [{ ...q, chave, posicao, dia, area, idioma: lingua, classificacao: score > 0.5 ? 'formal' : 'informal' }]
  })
}
function grupoSelecionado(questoes, filtros) {
  const unicas = new Map()
  for (const q of questoes) {
    if (filtros.dia && q.dia !== Number(filtros.dia)) continue
    if (filtros.areas.length && !filtros.areas.includes(q.area)) continue
    if (!unicas.has(q.chave)) unicas.set(q.chave, q)
  }
  return [...unicas.values()].sort((a,b) => a.posicao-b.posicao)
}
function media(questoes) { return questoes.length ? questoes.reduce((s,q) => s+q.formal_score,0)/questoes.length : null }
function filtrar(grupo, filtros) {
  const referencia = media(grupo)
  return grupo.filter(q => (!filtros.classe || q.classificacao === filtros.classe) &&
    (!filtros.media || (filtros.media === 'acima' ? q.formal_score > referencia : q.formal_score < referencia)))
}
function extremos(questoes, tipo) {
  if (!questoes.length) return []
  const valor = Math[tipo](...questoes.map(q => q.formal_score))
  return questoes.filter(q => q.formal_score === valor)
}

const props = defineProps({ ano: { type: [Number, String], required: true }, grafico: { type: String, required: true }, endpoint: { type: String, default: '/metricas/formalidade' }, endpointCorrelacoes: {type:String,default:'/metricas/formalidade/correlacoes'}, endpointDesempenho:{type:String,default:'/metricas/formalidade/desempenho'} })
const { tooltipId, tooltipElemento, flutuante, mostrarDica, moverDica, ocultarDica } = useDicaGrafico()
const questaoX = (posicao, inicio) => 42 + (posicao - inicio) * 332 / 44
const deslocamentoIdioma = idioma => ({ ingles: -4.5, espanhol: 4.5 }[idioma] ?? 0)
const scoreY = score => 148 - score * 120
function criarPainel(modo, alvo) {
const ano = computed(() => props.ano)
const dados = ref([]), carregando = ref(false), erro = ref(''), ativa = ref(null), ativaDispersao = ref(null)
const padrao = () => ({ dia: '', areas: areasDoDia(''), classe: '', media: '', bins:'10',amostra:'todos_itens_validos' })
const filtros = reactive(padrao())
const rascunho = reactive(padrao())
const mostrarFiltro = ref(false)
const opcoesDia = [{valor:'',rotulo:'Todos os dias'},{valor:'1',rotulo:'Dia 1'},{valor:'2',rotulo:'Dia 2'}]
const opcoesClasse = [{valor:'',rotulo:'Todas'},{valor:'formal',rotulo:'Formal (> 0,5)'},{valor:'informal',rotulo:'Informal (≤ 0,5)'}]
const opcoesMedia = [{valor:'',rotulo:'Todas'},{valor:'acima',rotulo:'Acima da média'},{valor:'abaixo',rotulo:'Abaixo da média'}]
function areasDoDia(dia) {
  return dia === '1' ? ['LC', 'CH'] : dia === '2' ? ['CN', 'MT'] : ['LC', 'CH', 'CN', 'MT']
}
const areasRascunho = computed(() => areasDoDia(rascunho.dia))
watch(() => rascunho.dia, () => {
  rascunho.areas = rascunho.areas.filter(area => areasRascunho.value.includes(area))
  if (!rascunho.areas.length) rascunho.areas = [...areasRascunho.value]
})
function alternarMenuFiltro() {
  ocultarDica()
  if (!mostrarFiltro.value) Object.assign(rascunho,filtros)
  mostrarFiltro.value=!mostrarFiltro.value
}
function aplicarFiltro() { ocultarDica(); Object.assign(filtros,rascunho); mostrarFiltro.value=false }
const nomes = { LC: 'Linguagens', CH: 'Ciências Humanas', CN: 'Ciências da Natureza', MT: 'Matemática' }
const normalizadas = computed(() => normalizar(dados.value))
const descartadas = computed(() => dados.value.length-normalizadas.value.length)
const dias = computed(() => [...new Set(normalizadas.value.map(q=>q.dia))].sort())
const areas = computed(() => [...new Set(normalizadas.value.filter(q=>!filtros.dia || q.dia === Number(filtros.dia)).map(q=>q.area))])
const grupo = computed(() => grupoSelecionado(normalizadas.value, filtros))
const referencia = computed(() => media(grupo.value))
const visiveis = computed(() => filtrar(grupo.value, filtros))
const pontos = computed(() => visiveis.value.filter(q => typeof q.quantidade_palavras === 'number' && Number.isFinite(q.quantidade_palavras) && q.quantidade_palavras >= 0))
const semPalavras = computed(() => visiveis.value.length-pontos.value.length)
// Domínio horizontal fixado pelo grupo anterior aos filtros de score.
const limitePalavras = computed(() => Math.max(100, Math.ceil(Math.max(0,...grupo.value.map(q => typeof q.quantidade_palavras === 'number' && Number.isFinite(q.quantidade_palavras) && q.quantidade_palavras >= 0 ? q.quantidade_palavras : 0))/100)*100))
const ticksPalavras = computed(() => Array.from({length:6},(_,i)=>i*limitePalavras.value/5))
const sx = palavras => 65+palavras/limitePalavras.value*710
const sy = score => 335-score*295
const tooltipDispersao = q => `${tooltip(q)} · ${q.quantidade_palavras.toLocaleString('pt-BR')} palavras`
const histBins = computed(() => {
  const n = Number(filtros.bins) || 10
  const contagens = Array(n).fill(0)
  for (const q of visiveis.value) contagens[Math.min(n-1,Math.floor(q.formal_score*n))]++
  return contagens.map((quantidade,indice) => {
    const inicio=indice/n,fim=(indice+1)/n
    const percentual=visiveis.value.length ? quantidade/visiveis.value.length : 0
    return {indice,inicio,fim,quantidade,dica:`Intervalo ${numero(inicio)} ≤ score ${indice===n-1?'≤':'<'} ${numero(fim)} · ${quantidade} questões · ${percentual.toLocaleString('pt-BR',{style:'percent',maximumFractionDigits:1})}`}
  })
})
const histLimite = computed(() => Math.max(4,Math.ceil(Math.max(0,...histBins.value.map(b=>b.quantidade))/4)*4))
const histTicks = computed(() => Array.from({length:5},(_,i)=>i*histLimite.value/4))
const pontosDesempenho = computed(() => visiveis.value.filter(q => typeof q[alvo]==='number'&&Number.isFinite(q[alvo])&&(filtros.amostra!=='itens_com_b_valido'||(typeof q.parametro_b_tri==='number'&&Number.isFinite(q.parametro_b_tri)))))
const semDesempenho = computed(() => visiveis.value.length-pontosDesempenho.value.length)
const perfLimites = computed(() => {
  if(alvo==='taxa_acerto')return [0,1]
  const valores=grupo.value.map(q=>q.parametro_b_tri).filter(v=>typeof v==='number'&&Number.isFinite(v))
  if(!valores.length)return [-1,1]
  const min=Math.min(...valores),max=Math.max(...valores),margem=Math.max(0.2,(max-min)*0.1)
  return [Math.floor(min-margem),Math.ceil(max+margem)]
})
const perfTicks = computed(()=>Array.from({length:5},(_,i)=>perfLimites.value[0]+i*(perfLimites.value[1]-perfLimites.value[0])/4))
const ampliarFormalidade = ref(false)
watch(ampliarFormalidade, ocultarDica)
const limitesFormalidade = computed(() => {
  if (!ampliarFormalidade.value || !pontosDesempenho.value.length) return [0, 1]
  const scores = pontosDesempenho.value.map(q => q.formal_score).sort((a, b) => a - b)
  const corte = Math.floor(scores.length * 0.05)
  const minimo = scores[corte]
  const maximo = scores[scores.length - 1 - corte]
  const margem = Math.max(0.0001, (maximo - minimo) * 0.08)
  return [Math.max(0, minimo - margem), Math.min(1, maximo + margem)]
})
const mudancasEscala = computed(() => limitesFormalidade.value.filter(score => score > 0 && score < 1))
const ticksFormalidade = computed(() => {
  const [minimo, maximo] = limitesFormalidade.value
  const centro = Array.from({ length: 3 }, (_, i) => minimo + (maximo - minimo) * (i + 1) / 4)
  return [0, ...(minimo > 0 ? [minimo] : []), ...centro, ...(maximo < 1 ? [maximo] : []), 1]
})
const perfX = valor => {
  const [minimo, maximo] = perfLimites.value
  return 65 + (valor - minimo) / (maximo - minimo) * 710
}
const perfY = score => {
  const [minimo, maximo] = limitesFormalidade.value
  const base = minimo > 0 ? 280 : 335
  const topo = maximo < 1 ? 95 : 40
  if (score < minimo) return 335 - (score / minimo) * (335 - base)
  if (score > maximo) return topo - (score - maximo) / (1 - maximo) * (topo - 40)
  return base - (score - minimo) / (maximo - minimo) * (base - topo)
}
const perfRotulo = valor=>alvo==='taxa_acerto'?valor.toLocaleString('pt-BR',{style:'percent',maximumFractionDigits:1}):valor.toLocaleString('pt-BR',{maximumFractionDigits:2})
const perfDica = q=>`${tooltip(q)} · Item ${q.co_item ?? '—'} · ${alvo==='taxa_acerto'?'Taxa de acerto':'Parâmetro b TRI'}: ${perfRotulo(q[alvo])} · Respostas: ${q.n_respostas ?? '—'} · ${alvo === 'taxa_acerto' ? 'Taxa = acertos ÷ total de respostas usado para o item, em porcentagem.' : 'b é a estimativa de dificuldade TRI fornecida na base do ENEM.'}`
const maximas = computed(() => extremos(visiveis.value, 'max'))
const minimas = computed(() => extremos(visiveis.value, 'min'))
const formais = computed(() => visiveis.value.filter(q=>q.classificacao === 'formal').length)
const proporcao = computed(() => visiveis.value.length ? (formais.value/visiveis.value.length).toLocaleString('pt-BR',{style:'percent',maximumFractionDigits:1}) : '—')
const paineisArea = computed(() => Object.keys(nomes).flatMap((sigla, indice) => {
  const dia = indice < 2 ? 1 : 2
  if ((filtros.dia && Number(filtros.dia) !== dia) || (filtros.areas.length && !filtros.areas.includes(sigla))) return []
  const inicio = indice * 45 + 1
  return [{
    sigla,
    inicio,
    marcas: [0, 11, 22, 33, 44].map(intervalo => inicio + intervalo),
    questoes: visiveis.value.filter(q => q.area === sigla),
  }]
}))
const numero = valor => typeof valor === 'number' && Number.isFinite(valor) ? valor.toLocaleString('pt-BR',{minimumFractionDigits:4,maximumFractionDigits:4}) : '—'
const rotulos = qs => qs.map(q=>`Q${q.posicao}`).join(', ')
const resumo = qs => !qs.length ? 'Sem questões' : `${rotulos(qs.slice(0,3))}${qs.length>3 ? ` e mais ${qs.length-3}` : ''}${qs.length>1 ? ` (${qs.length} empatadas)` : ''}`
const tooltip = q => `Q${q.posicao} · ${q.area} · ${q.idioma} · Formal: ${numero(q.formal_score)} · Informal: ${numero(q.informal_score)} · ${q.classificacao}`
function limpar() { Object.assign(filtros,padrao()); Object.assign(rascunho,padrao()); mostrarFiltro.value=false; ativa.value=null; ativaDispersao.value=null }
let controlador
async function carregar() {
  ocultarDica()
  controlador?.abort()
  const atual = new AbortController(); controlador=atual
  dados.value=[]; erro.value=''; carregando.value=true; limpar()
  try {
    const resposta = await http.get(alvo ? props.endpointDesempenho : props.endpoint, {
      params: { ano: props.ano },
      signal: atual.signal
    })
    const payload = resposta.data
    if (!payload || typeof payload !== 'object') {
      throw new Error('A API retornou uma página em vez de JSON. Confira a configuração de services/http.js e o backend.')
    }
    if (!Array.isArray(payload.questoes)) throw new Error('Resposta sem lista de questões.')
    if (controlador === atual) dados.value=payload.questoes
  } catch (e) { if (e.name !== 'AbortError' && e.code !== 'ERR_CANCELED' && controlador === atual) erro.value=e.response?.data?.error || e.message }
  finally { if (controlador === atual) carregando.value=false }
}
watch(() => [props.ano,props.endpoint,props.endpointDesempenho], carregar, {immediate:true})
watch(visiveis,()=>{ ocultarDica(); ativa.value=null; ativaDispersao.value=null })
onBeforeUnmount(()=>controlador?.abort())
return reactive({alvo,pontosDesempenho,semDesempenho,perfLimites,perfTicks,perfX,perfY,perfRotulo,perfDica,ampliarFormalidade,ticksFormalidade,mudancasEscala,histBins, histLimite, histTicks, modo, ano, carregando, erro, carregar, mostrarFiltro, alternarMenuFiltro, rascunho, opcoesDia, areasRascunho, nomes, opcoesClasse, opcoesMedia, padrao, aplicarFiltro, filtros, descartadas, referencia, numero, grupo, proporcao, formais, visiveis, maximas, minimas, rotulos, resumo, media, paineisArea, tooltip, ativa, semPalavras, pontos, ticksPalavras, sy, sx, tooltipDispersao, ativaDispersao})
}
const calculosFormalidade = {
  questoes: 'O escore de formalidade, de 0 a 1, vem da avaliação do modelo sobre o texto extraído. A classificação usa formal_score > 0,5 para formal e ≤ 0,5 para informal. Inglês e espanhol são itens separados nas questões 1 a 5. As médias são a soma dos escores dividida pela quantidade de itens válidos.',
  dispersao: 'Cada ponto combina a contagem de palavras registrada para a questão com seu escore de formalidade calculado pelo modelo. Itens sem contagem válida ficam fora. As médias dos filtros são calculadas pela soma dos escores dividida pela quantidade de itens do dia e área, antes dos filtros de classificação e média.',
  histograma: 'O intervalo de 0 a 1 é dividido no número de faixas escolhido. Cada barra conta os escores na faixa, incluindo o início e excluindo o fim; a última inclui 1. O percentual é a contagem da faixa dividida pelo total exibido, multiplicada por 100.',
  desempenho: 'A taxa de acerto é a quantidade de respostas corretas dividida pelo total de respostas usado para o item, multiplicada por 100. A nota de formalidade é uma avaliação feita pelo modelo Xlm-RoBERTa a partir do texto extraído das questões. Quanto maior a nota, mais formal o modelo considera o texto. O gráfico combina essa taxa com o escore de formalidade do modelo, mantendo apenas pares válidos. Inglês e espanhol são itens separados. A ampliação muda a escala vertical, preservando os valores dos pontos.',
  'dificuldade-tri': 'O parâmetro b é a estimativa de dificuldade da TRI fornecida na base do ENEM. O gráfico cruza esse valor com o escore de formalidade do modelo e usa apenas itens com b numérico válido. Valores maiores de b indicam maior dificuldade. O parâmetro pode ser negativo. A ampliação muda a escala vertical, preservando os valores dos pontos.',
}
const titulosFormalidade = {
  questoes: 'Formalidade por questão',
  dispersao: 'Formalidade × quantidade de palavras',
  histograma: 'Distribuição dos escores de formalidade',
  desempenho: 'Formalidade × taxa de acerto',
  'dificuldade-tri': 'Formalidade × dificuldade TRI (parâmetro b)',
}
const paineis = [criarPainel('questoes'), criarPainel('dispersao'), criarPainel('histograma'), criarPainel('desempenho', 'taxa_acerto'), criarPainel('dificuldade-tri', 'parametro_b_tri')]
const painel = computed(() => paineis.find(item => item.modo === props.grafico))
// Correlações agregadas: filtros independentes dos gráficos por questão.
const corrDados = ref([]), corrCarregando = ref(false), corrErro = ref('')
const corrAreas = ['CH', 'LC', 'CN', 'MT']
const corrDesfechos = [
  { alvo: 'taxa_acerto', amostra: 'todos_itens_validos', rotulo: 'Taxa de acerto' },
  { alvo: 'parametro_b_tri', amostra: 'itens_com_b_valido', rotulo: 'Dificuldade TRI (b)' },
]
const corrLinhas = computed(() => corrDesfechos.map(({ alvo, amostra, rotulo }) => ({
  rotulo,
  celulas: corrAreas.map(area => ({
    ...corrDados.value.find(r => r.area === area && r.score === 'formal_score'
      && r.variavel_alvo === alvo && r.amostra === amostra),
    area,
    rotulo,
  })),
})))
const corrLimitacaoHumanas2024 = computed(() => String(props.ano) === '2024'
  && corrLinhas.value.every(({ celulas }) => celulas.some(linha =>
    linha.area === 'CH' && linha.n_questoes === 45 && linha.n_scores_distintos === 1,
  )))
const corrMostrarMais = ref(false)
const corrNomeArea = area => ({ LC: 'Linguagens', CH: 'Humanas', CN: 'Natureza', MT: 'Matemática', todos: 'Geral' }[area] ?? area)
function corrCor(linha) {
  const valor = corrValor(linha)
  if (valor === null) return '#f3f4f6'
  const extremo = valor < 0 ? [0, 112, 192] : [167, 139, 250]
  const rgb = extremo.map(canal => Math.round(255 + (canal - 255) * Math.abs(valor)))
  return `rgb(${rgb.join(',')})`
}
const corrCorTexto = linha => corrValor(linha) < -0.6 ? '#ffffff' : '#263238'
const corrResumo = computed(() => {
  const validas = corrLinhas.value.flatMap(linha => linha.celulas).filter(linha => corrValor(linha) !== null)
  if (!validas.length) return 'Não há grupos com coeficiente disponível nesta seleção.'
  const ajustadas = validas.filter(linha => Number.isFinite(linha.spearman_p_holm))
  if (!ajustadas.length) return 'O p ajustado por Holm está indisponível nesta seleção.'
  const significativas = ajustadas.filter(linha => linha.spearman_p_holm < 0.05).length
  return `${significativas} de ${ajustadas.length} correlações com p (Holm) disponível têm p (Holm) abaixo de 0,05.`
})
const corrNumero=(v,casas=3)=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('pt-BR',{minimumFractionDigits:casas,maximumFractionDigits:casas}):'—'
const corrFormatarP = p => Number.isFinite(p) && p > 0 && p < 0.0001
  ? p.toExponential(3)
  : corrNumero(p, 4)
const corrValor = linha => Number.isFinite(linha.spearman_rho) ? linha.spearman_rho : null
function corrDica(linha) {
  return `${corrNomeArea(linha.area)} · ${linha.rotulo} · Spearman r: ${corrNumero(corrValor(linha))} · p bruto: ${corrFormatarP(linha.spearman_p)} · p (Holm): ${corrFormatarP(linha.spearman_p_holm)} · Questões: ${linha.n_questoes ?? '—'} · Base: ${linha.n_base ?? '—'} · Excluídas: ${linha.n_excluidos ?? '—'} · Scores distintos: ${linha.n_scores_distintos ?? '—'}`
}
let corrControlador
async function carregarCorrelacoes(){
 corrControlador?.abort();const atual=new AbortController();corrControlador=atual
 corrCarregando.value=true;corrErro.value='';corrDados.value=[];ocultarDica()
 try{
  const resposta=await http.get(props.endpointCorrelacoes,{params:{ano:props.ano},signal:atual.signal})
  if(!resposta.data||!Array.isArray(resposta.data.correlacoes))throw new Error('Resposta inválida da API de correlações. Atualize formalidade.cjs e reinicie o backend.')
  if(corrControlador===atual)corrDados.value=resposta.data.correlacoes
 }catch(e){if(e.name!=='AbortError'&&e.code!=='ERR_CANCELED'&&corrControlador===atual)corrErro.value=e.response?.data?.error||e.message}
 finally{if(corrControlador===atual)corrCarregando.value=false}
}
watch(()=>[props.ano,props.endpointCorrelacoes],carregarCorrelacoes,{immediate:true})
watch(() => props.grafico, () => {
  ocultarDica()
  for (const painel of paineis) painel.mostrarFiltro = false
})
onBeforeUnmount(()=>corrControlador?.abort())

</script>
<style scoped>
.formalidade{color:#24364b;background:white;border:1px solid #dce4ed;border-radius:12px;padding:24px;margin:24px 0;font-family:system-ui,sans-serif}.formalidade h3{color:#000;margin:0 0 .5rem;font-size:1.2rem}.formalidade p{line-height:1.5}.filtros{display:flex;flex-wrap:wrap;gap:12px;align-items:end}.filtros label{display:grid;gap:6px;font-size:14px;font-weight:600}select,button{font:inherit;padding:9px;border:1px solid #aab9c9;border-radius:6px;background:white;color:#24364b}button{cursor:pointer}.indicadores{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.indicadores article{padding:16px;background:#f0f7ff;border-radius:8px;display:grid;gap:8px}.indicadores strong{font-size:26px;color:#0070c0}.indicadores small{line-height:1.5}.rolagem{overflow-x:auto}svg{width:100%;height:390px}svg text{fill:#34455a;font-family:system-ui,sans-serif;font-size:12px}svg g:focus rect{stroke:#171717;stroke-width:3}.legenda{margin-right:12px}.formal{color:#0070c0}.informal{color:#be3654}.tooltip{min-height:48px;padding:10px;background:#f1f5f9;border-radius:6px}.dispersao{min-width:640px;height:auto;aspect-ratio:800/410}circle:focus{stroke:#171717;stroke-width:3}:focus-visible{outline:3px solid #c57900;outline-offset:3px}@media(max-width:600px){.formalidade{padding:14px}.filtros label{width:100%}}
.filter-wrapper{position:relative;display:inline-block;margin-bottom:1rem}.filter-btn{display:flex;align-items:center;gap:6px;background:white;border:1px solid #0070c0;color:#0070c0;padding:7px 12px;font-size:13px}.filter-btn svg{width:15px;height:15px;min-width:0}.filter-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:20;width:260px;max-width:calc(100vw - 80px);max-height:65vh;overflow-y:auto;padding:12px;background:white;border:1px solid #ddd;border-radius:6px;box-shadow:0 4px 14px #0002}.filter-secao{border:0;margin:0;padding:8px 0 12px;min-width:0}.filter-secao+.filter-secao{border-top:1px solid #ddd;padding-top:12px}.filter-secao legend{font-size:11px;font-weight:600;color:#555;padding:4px 0}.filter-option{display:flex;align-items:center;gap:9px;padding:7px 4px;font-size:13px;cursor:pointer}.filter-option input{accent-color:#0070c0;margin:0}.filter-rodape{display:flex;justify-content:space-between;border-top:1px solid #ddd;padding-top:12px;gap:12px}.filter-aplicar{background:#0070c0;color:white;border:0;padding:7px 16px;font-size:13px}.filter-limpar{border:0;font-size:13px;color:#555}
.tooltip-mouse{position:fixed;z-index:10000;pointer-events:none;white-space:pre-line;box-sizing:border-box;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow:hidden;background:#111827;color:#fff;padding:10px 12px;border:1px solid #334155;border-radius:5px;box-shadow:0 4px 12px #0003;font:12px/1.6 system-ui,sans-serif}

.histograma,.correlacoes-svg,.desempenho-svg{width:100%;height:auto;min-width:640px}.nota-correlacao{font-size:.9rem;color:#536273}.resumo-correlacao{line-height:1.6}
.filter-wrapper{display:block;width:fit-content;margin-inline-start:auto}
.filter-menu{inset-inline: auto 0}
.ampliar-formalidade{display:flex;width:fit-content;align-items:center;gap:8px;margin-top:1.5rem;cursor:pointer}
.ampliar-formalidade input{accent-color:#0070c0}

.legenda-questoes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin: 16px 0;
  font-size: 0.875rem;
}
.grade-questoes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  container-type: inline-size;
}
.area-questoes {
  min-width: 0;
  border: 1px solid #dce4ed;
  border-radius: 10px;
  padding: 12px;
}
.area-questoes h4 {
  margin: 0 0 8px;
  font-size: 1rem;
}
.pontos-questoes {
  display: block;
  height: auto;
}
.pontos-questoes line { stroke: #dce4ed; }
.pontos-questoes .corte {
  stroke: #64748b;
  stroke-dasharray: 5 4;
}
.pontos-questoes circle {
  fill: currentColor;
  stroke: white;
  stroke-width: 0.8;
}
.pontos-questoes circle:is(:hover, :focus) {
  stroke: #171717;
  stroke-width: 2;
}
@container (max-width: 690px) {
  .area-questoes { grid-column: 1 / -1; }
}

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
  font-family: revert;
  font-size: revert;
  line-height: normal;
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

.correlacoes-svg{display:block;width:100%;min-width:1000px;max-width:1000px;height:auto;margin:0 auto;font-family:Arial,Helvetica,sans-serif}
.correlacoes-svg text{font-family:Arial,Helvetica,sans-serif}
.correlacoes-svg .correlacao-eixo{font-size:15px;fill:#000}
.correlacoes-svg .correlacao-valor{font-size:26px;font-weight:700}
.correlacoes-svg .correlacao-detalhe{font-size:13px}
.correlacao-painel .correlacao-legenda{margin:0 0 .75rem;color:#475467;font-size:.85rem;line-height:1.45}
.correlacao-painel .correlacao-leitura,.correlacao-notas{color:#475467;font-size:.9rem;line-height:1.5}
details .filter-btn{width:fit-content;cursor:pointer}
.correlacao-notas{padding-left:1.25rem}
.correlacao-notas li{margin:.5rem 0}

.filter-wrapper .filter-btn svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
</style>
