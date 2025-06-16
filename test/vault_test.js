'use strict'

const Vault  = require('../lib/vault')
const { assert } = require('chai')

describe('Vault', () => {
  const PHRASE = 'She cells C shells bye the sea shoars'
  let vault

  describe('with a passphrase', () => {
    beforeEach(() => {
      vault = new Vault({ phrase: PHRASE })
    })

    it('generates a password', async () => {
      let pw = await vault.generate('google')
      assert.equal(pw, ': 4TVH#5:aZl8LueOT\\{')
    })

    it('generates a different password for each service', async () => {
      let pw = await vault.generate('twitter')
      assert.equal(pw, "[ (HN_N:lI&<ro=)3'g9")
    })

    it('generates a different password for each passphrase', async () => {
      vault = new Vault({phrase: PHRASE + 'X'})
      let pw = await vault.generate('google')
      assert.equal(pw, 'n+oIz6sL>K*lTEWYRO%7')
    })

    it('generates the same password with the same input', async () => {
      vault = new Vault({ phrase: PHRASE + 'X' })
      let pw1 = await vault.generate('google')
      let pw2 = await vault.generate('google')
      assert.equal(pw1, pw2)
    })
  })

  describe('with a length', () => {
    beforeEach(() => {
      vault = new Vault({ phrase: PHRASE, length: 4 })
    })

    it('generates a password of the given length', async () => {
      let pw = await vault.generate('google')
      assert.equal(pw, 'xDFu')
    })
  })

  describe('with a repetition limit', () => {
    beforeEach(() => {
      vault = new Vault({ phrase: '', length: 24, symbol: 0, number: 0, repeat: 1 })
    })

    it('generates a password with no repeated characters', async () => {
      let pw = await vault.generate('asd')
      assert.equal(pw, 'IVTDzACftqopUXqDHPkuCIhV')
    })
  })

  describe('with no symbols', () => {
    beforeEach(() => {
      vault = new Vault({ phrase: PHRASE, symbol: 0 })
    })

    it('generates a password containing no symbols', async () => {
      let pw = await vault.generate('google')
      assert.equal(pw, 'XZ4wRe0bZCazbljCaMqR')
    })
  })

  describe('with more symbols than will fit', () => {
    beforeEach(() => {
      vault = new Vault({ phrase: PHRASE, symbol: 100 })
    })

    it('throws an error', async () => {
      let error = await vault.generate('google').catch(e => e)
      assert.instanceOf(error, Error)
    })
  })

  describe('with no numbers', () => {
    beforeEach(() => {
      vault = new Vault({ phrase: PHRASE, number: 0 })
    })

    it('generates a password containing no digits', async () => {
      let pw = await vault.generate('google')
      assert.equal(pw, '_*$TVH.%^aZl(LUeOT?>')
    })
  })

  describe('with no lowercase letters', () => {
    beforeEach(() => {
      vault = new Vault({ phrase: PHRASE, lower: 0 })
    })

    it('generates a password containing no lowercase letters', async () => {
      let pw = await vault.generate('google')
      assert.equal(pw, ':{?)+7~@OA:L]!0E$)(+')
    })
  })

  describe('with at least 5 numbers', () => {
    beforeEach(() => {
      vault = new Vault({ phrase: PHRASE, length: 8, number: 5 })
    })

    it('generates a password with at least 5 digits', async () => {
      let pw = await vault.generate('songkick')
      assert.equal(pw, 'i0908.7[')
    })
  })

  describe('with lots of spaces', () => {
    beforeEach(() => {
      vault = new Vault({ phrase: PHRASE, space: 12 })
    })

    it('generates a password that is almost all spaces', async () => {
      let pw = await vault.generate('songkick')
      assert.equal(pw, ' c   6 Bq  % 5fR    ')
    })
  })

  describe('with no viable characters', () => {
    beforeEach(() => {
      vault = new Vault({ phrase: PHRASE, lower: 0, upper: 0, number: 0, space: 0, dash: 0, symbol: 0 })
    })

    it('throws an error', async () => {
      let error = await vault.generate('google').catch(e => e)
      assert.instanceOf(error, Error)
    })
  })

  describe('with all character classes', () => {
    beforeEach(() => {
      vault = new Vault({ phrase: PHRASE, lower: 2, upper: 2, number: 1, space: 3, dash: 2, symbol: 1 })
    })

    it('generates a password with all character types', async () => {
      let pw = await vault.generate('google')
      assert.equal(pw, ': : fv_wqt>a-4w1S  R')
    })
  })
})
