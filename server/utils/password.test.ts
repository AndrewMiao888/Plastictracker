import assert from 'node:assert/strict'
import test from 'node:test'
import { hashPassword, hashSessionToken, newSessionToken, validPassword, verifyPassword } from './password.ts'

test('class passwords require a useful length', () => {
  assert.equal(validPassword('short'), false)
  assert.equal(validPassword('          '), false)
  assert.equal(validPassword('A longer passphrase'), true)
  assert.equal(validPassword('x'.repeat(129)), false)
})

test('password hashes are salted and verified safely', async () => {
  const first = await hashPassword('A longer passphrase')
  const second = await hashPassword('A longer passphrase')
  assert.notEqual(first, second)
  assert.ok(!first.includes('A longer passphrase'))
  assert.equal(await verifyPassword('A longer passphrase', first), true)
  assert.equal(await verifyPassword('wrong password', first), false)
  assert.equal(await verifyPassword('anything', 'invalid'), false)
})

test('session tokens are random and stored by digest', () => {
  const token = newSessionToken()
  assert.equal(token.length, 43)
  assert.notEqual(hashSessionToken(token), token)
  assert.equal(hashSessionToken(token), hashSessionToken(token))
})
