import { flushPromises } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import { calcularSimilaridadesProva, precalcularSimilaridadesProva } from '../services/analysisApi'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('axios', () => ({ default: { create: () => ({ post }) } }))

it('prioriza a questão aberta e aproveita o mesmo cálculo no processamento em segundo plano', async () => {
  const questoes = ['Primeira', 'Segunda', 'Terceira'].map((texto) => ({
    alternativas: [{ texto }, { texto: 'Outra alternativa' }],
  }))
  const resolvers: Array<() => void> = []
  const matriz = [[null, 0.4], [0.4, null]]
  post.mockImplementation(() => new Promise((resolve) => {
    resolvers.push(() => resolve({ data: { matriz } }))
  }))
  const controller = new AbortController()
  const fundo = precalcularSimilaridadesProva(questoes, controller.signal)
  const terceira = calcularSimilaridadesProva(questoes[2], controller.signal)

  expect(post).toHaveBeenCalledTimes(1)
  resolvers.shift()!()
  await flushPromises()
  expect(post.mock.calls[1]?.[1].alternativas[0].texto).toBe('Terceira')
  resolvers.shift()!()
  await expect(terceira).resolves.toEqual({ matriz })
  expect(post.mock.calls[2]?.[1].alternativas[0].texto).toBe('Segunda')
  resolvers.shift()!()
  await fundo
  await expect(calcularSimilaridadesProva(questoes[1], controller.signal)).resolves.toEqual({ matriz })
  expect(post).toHaveBeenCalledTimes(3)
})
