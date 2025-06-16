'use strict'

const { assert } = require('chai')
const sinon = require('sinon')

const Vault = require('../../lib/vault')
const CliHelper = require('./helper')

describe('CLI generator', () => {
  let sandbox, helper

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    helper = await CliHelper.create(sandbox, { password: 'something' })
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('reports an error if no phrase is given', async () => {
    let error = await helper.call('google').catch(e => e)
    assert.match(error.message, /no passphrase given/i)
  })

  it('reports an error if no service is given', async () => {
    let error = await helper.call('-p').catch(e => e)
    assert.match(error.message, /no service name given/i)
  })

  it('generates a password using a phrase', async () => {
    await helper.call('google', '-p')
    helper.assertStdout('2hk!W[L,2rWWI=~=l>,E')
  })

  it('generates a password for each service', async () => {
    await helper.call('twitter', '-p')
    helper.assertStdout('JIk>bXA]~z!e0-Xr$\\aw')
  })

  it('generates a password using a private key', async () => {
    Object.assign(helper.settings, { selectKey: 'AAAAPUBLICKEY', signature: Vault.UUID })

    await helper.call('google', '-k')
    helper.assertStdout('c8<BHXZMc*Gxks&%%=F4')
  })

  it('prints a password with a fixed length', async () => {
    await helper.call('google', '-p', '-l', '10')
    helper.assertStdout('~#8[L9p7uW')
  })

  it('prints a password with no symbols', async () => {
    await helper.call('google', '-p', '--symbol', '0')
    helper.assertStdout('Bb4uFmAEUnTPJh23ecdQ')
  })

  it('prints a password with required dashes and uppercase', async () => {
    await helper.call('google', '-p', '--dash', '1', '--upper', '1')
    helper.assertStdout('2-[w]thuTK8unIUVH"Lp')
  })

  it('prints a password with all character types', async () => {
    await helper.call('google', '-p', '--dash', '2', '--lower', '2', '--space', '3', '--upper', '2', '--symbol', '1', '--number', '1')
    helper.assertStdout('2b=(GpS__^I p %_i f0')
  })

  it('prints a password with a repetition limit', async () => {
    helper.settings.password = ''

    await helper.call('asd', '-p', '--symbol', '0', '--number', '0', '--repeat', '1')
    helper.assertStdout('IVTDmgpdKuUnGTlxabDT')
  })

  it('does not require the --phrase flag if there is a global setting', async () => {
    await helper.store.update('/global', () => ({ phrase: 'something' }))

    await helper.call('google')
    helper.assertStdout('2hk!W[L,2rWWI=~=l>,E')
  })

  it('does not require the --phrase flag if there is a service setting', async () => {
    await helper.store.update('/services/google', () => ({ phrase: 'something' }))

    await helper.call('google')
    helper.assertStdout('2hk!W[L,2rWWI=~=l>,E')
  })

  it('uses a global setting if present', async () => {
    await helper.store.update('/global', () => ({ length: 6 }))

    await helper.call('google', '-p')
    helper.assertStdout('Tc8k~8')
  })

  it('uses a service setting if present', async () => {
    await helper.store.update('/services/google', () => ({ length: 8 }))

    await helper.call('google', '-p')
    helper.assertStdout('T=pf~mM=')
  })

  it('merges global and service settings', async () => {
    await helper.store.update('/global', () => ({ symbol: 0 })),
    await helper.store.update('/services/google', () => ({ length: 8 }))

    await helper.call('google', '-p')
    helper.assertStdout('w0H6fT9g')
  })

  it('uses a service setting in preference to a global one', async () => {
    await helper.store.update('/global', () => ({ length: 6 })),
    await helper.store.update('/services/google', () => ({ length: 8 }))

    await helper.call('google', '-p')
    helper.assertStdout('T=pf~mM=')
  })

  it('uses a command-line argument in preference to stored settings', async () => {
    await helper.store.update('/global', () => ({ length: 6 })),
    await helper.store.update('/services/google', () => ({ length: 8 }))

    await helper.call('google', '-p', '--length', '12')
    helper.assertStdout('~#9?(:p<@VkI')
  })

  it('prints notes associated with a service', async () => {
    await helper.store.update('/services/google', () => ({ notes: 'google notes' }))

    await helper.call('google', '-p')

    helper.assertStderr('\ngoogle notes\n\n')
    helper.assertStdout('2hk!W[L,2rWWI=~=l>,E')
  })
})
