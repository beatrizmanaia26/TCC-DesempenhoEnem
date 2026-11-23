const fs = require('node:fs/promises')
const path = require('node:path')
function registrarFormalidade(app, diretorio = process.env.FORMALIDADE_JSON_DIR || path.join(__dirname, 'dados')) {
  registrarCorrelacoes(app)
  registrarDesempenho(app)
  app.get('/api/metricas/formalidade', async (req, res) => {
    const ano = String(req.query.ano || '')
    if (!/^20\d{2}$/.test(ano)) return res.status(400).json({ error: 'Informe um ano válido (ex.: 2020).' })
    try {
      // Aceita JSON na raiz ou dentro de uma pasta com o mesmo nome da prova.
      const entradas = await fs.readdir(diretorio, { withFileTypes: true })
      const arquivos = []
      for (const dia of [1, 2]) {
        const nomeBase = `enem${ano}Dia${dia}RegularAzul`
        const pasta = entradas.find(e => e.isDirectory() && e.name.toLowerCase() === nomeBase.toLowerCase())
        if (pasta) {
          const subpasta = path.join(diretorio, pasta.name)
          const nomes = await fs.readdir(subpasta, { withFileTypes: true })
          const json = nomes.find(e => e.isFile() && e.name.toLowerCase() === `${nomeBase}.json`.toLowerCase())
          if (json) {
            arquivos.push({ caminho: path.join(subpasta, json.name), dia })
            continue
          }
        }
        const json = entradas.find(e => e.isFile() && e.name.toLowerCase() === `${nomeBase}.json`.toLowerCase())
        if (json) arquivos.push({ caminho: path.join(diretorio, json.name), dia })
      }
      if (!arquivos.length) return res.status(404).json({ error: `Sem dados de formalidade para ${ano}.` })
      const questoes = []
      for (const { caminho, dia } of arquivos) {
        const dados = JSON.parse((await fs.readFile(caminho, 'utf8')).replace(/^\uFEFF/, ''))
        if (!Array.isArray(dados.questoes)) throw new Error('Formato de questões inválido')
        questoes.push(...dados.questoes.map(q => ({ questao: q.questao, dia, idioma: q.idioma,
          formal_score: q.formal_score, informal_score: q.informal_score,
          classificacao_formalidade: q.classificacao_formalidade,
          quantidade_palavras: q.quantidade_palavras, tem_imagem: q.tem_imagem })))
      }
      res.json({ ano: Number(ano), total_questoes: questoes.length, questoes })
    } catch (error) {
      console.error('Erro ao carregar formalidade:', error)
      res.status(500).json({ error: 'Não foi possível carregar os arquivos de formalidade.' })
    }
  })
}

function lerTabelaCsv(texto) {
  const linhas=[]
  let linha=[],campo='',aspas=false
  texto=texto.replace(/^\uFEFF/,'')
  for(let i=0;i<texto.length;i++) {
    const c=texto[i]
    if(c==='"') { if(aspas && texto[i+1]==='"'){campo+='"';i++}else aspas=!aspas }
    else if(c===','&&!aspas){linha.push(campo);campo=''}
    else if((c==='\n'||c==='\r')&&!aspas){if(c==='\r'&&texto[i+1]==='\n')i++;linha.push(campo);if(linha.some(v=>v.trim()))linhas.push(linha);linha=[];campo=''}
    else campo+=c
  }
  if(aspas)throw new Error('Aspas não fechadas no CSV de correlações')
  linha.push(campo);if(linha.some(v=>v.trim()))linhas.push(linha)
  const cabecalho=(linhas.shift()||[]).map(v=>v.trim())
  return linhas.map((valores,i)=>{
    if(valores.length!==cabecalho.length)throw new Error(`Linha CSV ${i+2} inválida`)
    return Object.fromEntries(cabecalho.map((c,j)=>[c,valores[j].trim()]))
  })
}
function lerCorrelacoes(texto) {
  const registros=lerTabelaCsv(texto)
  const cabecalho=Object.keys(registros[0]||{})
  const obrigatorias=['ano','area','score','variavel_alvo','amostra','n_questoes','n_base','n_excluidos','spearman_p','spearman_p_holm', 'spearman_rho','n_scores_distintos']
  if(obrigatorias.some(c=>!cabecalho.includes(c)))throw new Error('Colunas de correlação ausentes')
  function numero(valor,min,max,inteiro=false){
    if(valor===''||valor==null)return null
    const n=Number(valor)
    if(!Number.isFinite(n)||n<min||n>max||(inteiro&&!Number.isInteger(n)))throw new Error('Número inválido no CSV de correlações')
    return n
  }
  return registros.map(r=>{
    return {ano:r.ano,area:r.area,score:r.score,variavel_alvo:r.variavel_alvo,amostra:r.amostra,
      n_questoes:numero(r.n_questoes,0,Infinity,true),n_base:numero(r.n_base,0,Infinity,true),n_excluidos:numero(r.n_excluidos,0,Infinity,true),n_scores_distintos:numero(r.n_scores_distintos,0,Infinity,true),
     spearman_rho:numero(r.spearman_rho,-1,1),spearman_p:numero(r.spearman_p,0,1),spearman_p_holm:numero(r.spearman_p_holm,0,1)}
  })
}
function registrarCorrelacoes(app, arquivo) {
  app.get('/api/metricas/formalidade/correlacoes',async(req,res)=>{
    const ano=String(req.query.ano||'')
    if(!/^20\d{2}$/.test(ano))return res.status(400).json({error:'Informe um ano válido (ex.: 2020).'})
    const caminho=path.resolve(__dirname,arquivo||process.env.FORMALIDADE_CORRELACOES_CSV||'../../../outputs/correlacao_formalidade/correlacoes.csv')
    try{
      const correlacoes=lerCorrelacoes(await fs.readFile(caminho,'utf8')).filter(r=>r.ano===ano&&r.score==='formal_score')
      if(!correlacoes.length)return res.status(404).json({error:`Sem correlações de formalidade para ${ano}.`})
      res.json({ano:Number(ano),correlacoes})
    }catch(error){
      console.error('Erro ao carregar correlações de formalidade:',caminho,error)
      res.status(500).json({error:error.code==='ENOENT'?'CSV de correlações não encontrado. Confira FORMALIDADE_CORRELACOES_CSV no .env.':'Não foi possível ler as correlações. Consulte o terminal do backend.'})
    }
  })
}


function lerBaseDesempenho(texto) {
  function numero(v,obrigatorio=false){
    if(v===''||v==null){if(obrigatorio)throw new Error('Valor obrigatório ausente na base de desempenho');return null}
    const n=Number(v);if(!Number.isFinite(n))throw new Error('Número inválido na base de desempenho');return n
  }
  return lerTabelaCsv(texto).map(r=>{
    const questao=numero(r.posicao_prova_azul,true),score=numero(r.formal_score,true),taxa=numero(r.taxa_acerto,true)
    if(!Number.isInteger(questao)||questao<1||questao>180||score<0||score>1||taxa<0||taxa>1)throw new Error('Posição ou score inválido na base de desempenho')
    return {ano:r.ano,questao,area:r.area,idioma:r.lingua_estrangeira||'geral',co_item:r.co_item,formal_score:score,informal_score:numero(r.informal_score),taxa_acerto:taxa,parametro_b_tri:numero(r.parametro_b_tri),n_respostas:numero(r.n_respostas),status_tri:r.status_tri}
  })
}
function registrarDesempenho(app,arquivo) {
  app.get('/api/metricas/formalidade/desempenho',async(req,res)=>{
    const ano=String(req.query.ano||'')
    if(!/^20\d{2}$/.test(ano))return res.status(400).json({error:'Informe um ano válido (ex.: 2020).'})
    const caminho=path.resolve(__dirname,arquivo||process.env.FORMALIDADE_BASE_CSV||'../../../outputs/correlacao_formalidade/base_completa.csv')
    try{
      const questoes=lerBaseDesempenho(await fs.readFile(caminho,'utf8')).filter(r=>r.ano===ano)
      if(!questoes.length)return res.status(404).json({error:`Sem dados de desempenho e formalidade para ${ano}.`})
      res.json({ano:Number(ano),questoes})
    }catch(error){
      console.error('Erro ao carregar desempenho e formalidade:',caminho,error)
      res.status(500).json({error:error.code==='ENOENT'?'Base de desempenho não encontrada. Confira FORMALIDADE_BASE_CSV no .env.':'Não foi possível ler a base de desempenho. Consulte o terminal do backend.'})
    }
  })
}

module.exports = { registrarFormalidade, registrarCorrelacoes, registrarDesempenho, lerCorrelacoes, lerBaseDesempenho }
