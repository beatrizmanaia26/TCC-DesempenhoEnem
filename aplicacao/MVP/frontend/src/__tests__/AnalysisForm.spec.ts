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
