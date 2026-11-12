import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AnalysisForm from '../components/AnalysisForm.vue'
import { useAnalysisStore } from '../stores/analysisStore'

const arquivoPdf = new File(['x'], 'prova.pdf', { type: 'application/pdf' })

const abrirMenu = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper.find('#analysisType').trigger('click')
}

const checkboxesDeTipo = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('.analysis-type-option input[type="checkbox"]:not(#analysis-type-selecionar-tudo)')

describe('AnalysisForm - seleção múltipla de tipos de análise', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('inicia com todos os tipos marcados e o resumo "Análise Completa"', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await abrirMenu(wrapper)

    expect(checkboxesDeTipo(wrapper)).toHaveLength(5)
    checkboxesDeTipo(wrapper).forEach((checkbox) => expect((checkbox.element as HTMLInputElement).checked).toBe(true))
    expect((wrapper.find('#analysis-type-selecionar-tudo').element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.find('#analysisType').text()).toBe('Análise Completa')
  })

  it('permite marcar mais de um tipo e mostra a quantidade no botão', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await abrirMenu(wrapper)

    await wrapper.find('#analysis-type-selecionar-tudo').trigger('change')
    await wrapper.find('#analysis-type-image').setValue(true)
    await wrapper.find('#analysis-type-formality').setValue(true)

    expect(wrapper.find('#analysisType').text()).toBe('2 tipos de análise selecionados')
    expect((wrapper.find('#analysis-type-image').element as HTMLInputElement).checked).toBe(true)
    expect((wrapper.find('#analysis-type-formality').element as HTMLInputElement).checked).toBe(true)
    expect((wrapper.find('#analysis-type-distractors').element as HTMLInputElement).checked).toBe(false)
  })

  it('"Selecionar tudo" desmarca todos quando já estão todos marcados', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await abrirMenu(wrapper)

    await wrapper.find('#analysis-type-selecionar-tudo').trigger('change')
    checkboxesDeTipo(wrapper).forEach((checkbox) => expect((checkbox.element as HTMLInputElement).checked).toBe(false))
    expect(wrapper.find('#analysisType').text()).toBe('Selecione ao menos um tipo de análise')
  })

  it('mostra o nome do tipo quando apenas um está marcado', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await abrirMenu(wrapper)

    await wrapper.find('#analysis-type-selecionar-tudo').trigger('change')
    await wrapper.find('#analysis-type-distractors').setValue(true)

    expect(wrapper.find('#analysisType').text()).toBe('Análise de Distratores')
  })

  it('habilita a análise com acertos por questão sem digitar nada (0 implícito)', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#hours').setValue(1)
    await wrapper.find('#metrics-yes').setValue(true)
    await wrapper.find('#student-count').setValue(10)
    await wrapper.find('#metrics-question-count').setValue(3)

    expect(wrapper.find('#accuracy-input-1').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('habilita a análise quando o usuário digita 0 em todas as questões', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#hours').setValue(1)
    await wrapper.find('#metrics-yes').setValue(true)
    await wrapper.find('#student-count').setValue(10)
    await wrapper.find('#metrics-question-count').setValue(3)

    for (const numero of [1, 2, 3]) {
      await wrapper.find(`#accuracy-input-${numero}`).setValue('0')
    }

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('mantém a análise desabilitada sem número de estudantes', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#hours').setValue(1)
    await wrapper.find('#metrics-yes').setValue(true)
    await wrapper.find('#metrics-question-count').setValue(3)

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
describe('AnalysisForm - acertos por questão não podem exceder o número de pessoas', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('bloqueia a análise quando o número de pessoas é reduzido abaixo de acertos já informados', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#hours').setValue(1)
    await wrapper.find('#metrics-yes').setValue(true)
    await wrapper.find('#student-count').setValue(10)
    await wrapper.find('#metrics-question-count').setValue(3)

    await wrapper.find('#accuracy-input-2').setValue('10')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()

    await wrapper.find('#student-count').setValue(5)

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('habilita a análise quando todos os acertos são iguais ao número de pessoas', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#hours').setValue(1)
    await wrapper.find('#metrics-yes').setValue(true)
    await wrapper.find('#student-count').setValue(10)
    await wrapper.find('#metrics-question-count').setValue(3)

    for (const numero of [1, 2, 3]) {
      await wrapper.find(`#accuracy-input-${numero}`).setValue('10')
    }

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('limita o valor digitado ao número de pessoas e mostra o aviso ao reduzir o total', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#hours').setValue(1)
    await wrapper.find('#metrics-yes').setValue(true)
    await wrapper.find('#student-count').setValue(10)
    await wrapper.find('#metrics-question-count').setValue(3)

    await wrapper.find('#accuracy-input-1').setValue('25')
    expect((wrapper.find('#accuracy-input-1').element as HTMLInputElement).value).toBe('10')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()

    await wrapper.find('#student-count').setValue(5)

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    await wrapper.find('#accuracy-input-1').setValue('8')

    expect((wrapper.find('#accuracy-input-1').element as HTMLInputElement).value).toBe('5')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })
})


})

describe('AnalysisForm - quantidade de questões vem do PDF enviado', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('preenche o campo de questões das métricas dos estudantes com a quantidade extraída do PDF', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf, totalQuestions: 10 } })
    await wrapper.find('#metrics-yes').setValue(true)

    expect((wrapper.find('#metrics-question-count').element as HTMLInputElement).value).toBe('10')
  })

  it('mantém o campo de métricas vazio (0) quando não há quantidade extraída', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#metrics-yes').setValue(true)

    expect((wrapper.find('#metrics-question-count').element as HTMLInputElement).value).toBe('0')
  })
})

describe('AnalysisForm - aviso quando a quantidade de questões difere do PDF', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mostra aviso no campo de dificuldade quando o valor difere do PDF', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf, totalQuestions: 10 } })
    await wrapper.find('#difficulty-yes').setValue(true)
    expect(wrapper.findAll('.question-count-warning')).toHaveLength(0)

    await wrapper.find('#difficulty-question-count').setValue(12)

    const avisos = wrapper.findAll('.question-count-warning')
    expect(avisos).toHaveLength(1)
    expect(avisos[0].text()).toContain('10 questões')
    expect(avisos[0].text()).toContain('informou 12')
  })

  it('mostra aviso no campo das métricas quando o valor difere do PDF', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf, totalQuestions: 10 } })
    await wrapper.find('#metrics-yes').setValue(true)
    expect(wrapper.findAll('.question-count-warning')).toHaveLength(0)

    await wrapper.find('#metrics-question-count').setValue(7)

    expect(wrapper.findAll('.question-count-warning')).toHaveLength(1)
    expect(wrapper.find('.question-count-warning').text()).toContain('informou 7')
  })

  it('não mostra aviso quando o valor é igual ao do PDF', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf, totalQuestions: 10 } })
    await wrapper.find('#metrics-yes').setValue(true)
    await wrapper.find('#metrics-question-count').setValue(10)

    expect(wrapper.findAll('.question-count-warning')).toHaveLength(0)
  })

  it('não mostra aviso quando o PDF não tem quantidade detectada', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#metrics-yes').setValue(true)
    await wrapper.find('#metrics-question-count').setValue(7)

    expect(wrapper.findAll('.question-count-warning')).toHaveLength(0)
  })
})



describe('AnalysisForm - tempo de leitura personalizado', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mantém a análise desabilitada ao escolher Personalizado sem preencher a velocidade', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#hours').setValue(1)
    await wrapper.find('#speed-custom').setValue(true)

    expect(wrapper.find('#custom-reading-speed').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('habilita a análise somente depois de digitar a velocidade personalizada', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#hours').setValue(1)
    await wrapper.find('#speed-custom').setValue(true)
    await wrapper.find('#custom-reading-speed').setValue('1200')

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('não aceita letras no campo de velocidade personalizada', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#hours').setValue(1)
    await wrapper.find('#speed-custom').setValue(true)
    await wrapper.find('#custom-reading-speed').setValue('12a3')

    expect((wrapper.find('#custom-reading-speed').element as HTMLInputElement).value).toBe('123')
  })

describe('AnalysisForm - campo de velocidade só aceita dígitos', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('apaga letras digitadas quando não há nenhum número', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#speed-custom').setValue(true)
    await wrapper.find('#custom-reading-speed').setValue('aaaaa')

    expect((wrapper.find('#custom-reading-speed').element as HTMLInputElement).value).toBe('')
  })
})

})
describe('AnalysisForm - duração máxima da prova de 6h', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('limita o campo de horas ao máximo de 6', () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })

    expect(wrapper.find('#hours').attributes('max')).toBe('6')
  })

  it('ajusta a duração para 6h 0min quando o usuário informa 7 horas', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#hours').setValue(7)

    expect((wrapper.find('#hours').element as HTMLInputElement).value).toBe('6')
    expect((wrapper.find('#minutes').element as HTMLInputElement).value).toBe('0')
    expect(wrapper.find('.time-total').text()).toBe('6h')
  })

  it('ajusta para 6h 0min quando o total ultrapassa 6h com minutos', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#hours').setValue(6)
    await wrapper.find('#minutes').setValue(30)

    expect((wrapper.find('#hours').element as HTMLInputElement).value).toBe('6')
    expect((wrapper.find('#minutes').element as HTMLInputElement).value).toBe('0')
  })

  it('mantém valores válidos sem alteração', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#hours').setValue(5)
    await wrapper.find('#minutes').setValue(45)

    expect((wrapper.find('#hours').element as HTMLInputElement).value).toBe('5')
    expect((wrapper.find('#minutes').element as HTMLInputElement).value).toBe('45')
  })

  it('não mostra mais o aviso de duração excedida', async () => {
    const wrapper = mount(AnalysisForm, { props: { file: arquivoPdf } })
    await wrapper.find('#hours').setValue(6)
    await wrapper.find('#minutes').setValue(0)

    expect(wrapper.find('.warning-section').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('excede')
  })
})


