import { describe, expect, it } from 'vitest'
import { TLAiMessage } from './types'
import { asMessage, exhaustiveSwitchError } from './utils'

describe('utils', () => {
	describe('asMessage', () => {
		it('should convert a string to a message array', () => {
			const result = asMessage('hello')
			expect(result).toEqual([{ type: 'text', text: 'hello' }])
		})

		it('should return the same array if given an array', () => {
			const messages: TLAiMessage[] = [{ type: 'text', text: 'hello' }]
			const result = asMessage(messages)
			expect(result).toBe(messages)
		})

		it('should convert a single message object to an array', () => {
			const message: TLAiMessage = { type: 'text', text: 'hello' }
			const result = asMessage(message)
			expect(result).toEqual([message])
		})
	})

	describe('exhaustiveSwitchError', () => {
		it('should throw an error with the value', () => {
			const testFn = () => exhaustiveSwitchError('test' as never)
			expect(testFn).toThrow('Unknown switch case test')
		})
	})
})
