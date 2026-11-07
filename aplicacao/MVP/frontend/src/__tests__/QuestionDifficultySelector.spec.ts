import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import QuestionDifficultySelector from '../components/QuestionDifficultySelector.vue'

describe('QuestionDifficultySelector - contador de dificuldades preenchidas', () => {
  it('mostra 0/x preenchidas quando nenhuma dificuldade foi marcada', () => {
    const wrapper = mount(QuestionDifficultySelector, {
      props: { totalQuestions: 10 }
    })

    expect(wrapper.find('.header h3').text()).toContain('Dificuldade das Questões')
    expect(wrapper.find('.counter').text()).toBe('0/10 preenchidas')
  })

  it('atualiza o contador conforme as questões recebem dificuldade', async () => {
    const wrapper = mount(QuestionDifficultySelector, {
      props: { totalQuestions: 10 }
    })

    const botoes = wrapper.findAll('.btn-difficulty')
    await botoes[0].trigger('click')
    await botoes[3].trigger('click')

    expect(wrapper.find('.counter').text()).toBe('2/10 preenchidas')
  })
})
