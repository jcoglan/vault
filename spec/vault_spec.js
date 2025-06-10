var Vault  = require("../lib/vault"),
    jstest = require("jstest").Test

jstest.describe("Vault", function() { with(this) {
  var PHRASE = "She cells C shells bye the sea shoars"

  before(function() { this.vault = new Vault(this.options()) })

  this.define("options", function() { return {} })

  describe("with a passphrase", function() { with(this) {
    this.define("options", function() { return {phrase: PHRASE} })

    it("generates a password", function(resume) { with(this) {
      vault.generate("google").then(function(pw) {
        resume(function() { assertEqual(": 4TVH#5:aZl8LueOT\\{", pw) })
      })
    }})

    it("generates a different password for each service", function(resume) { with(this) {
      vault.generate("twitter").then(function(pw) {
        resume(function () { assertEqual("[ (HN_N:lI&<ro=)3'g9", pw) })
      })
    }})

    it("generates a different password for each passphrase", function(resume) { with(this) {
      vault = new Vault({phrase: PHRASE + "X"})
      vault.generate("google").then(function(pw) {
        resume(function () { assertEqual("n+oIz6sL>K*lTEWYRO%7", pw) })
      })
    }})

    it("generates the same password with the same input", function(resume) { with(this) {
      vault = new Vault({phrase: PHRASE + "X"})
      vault.generate("google").then(function(pw1) {
        vault.generate("google").then(function(pw2) {
          resume(function() { assertEqual(pw1, pw2) })
        })
      })
    }})
  }})

  describe("with a length", function() { with(this) {
    this.define("options", function() { return {phrase: PHRASE, length: 4} })

    it("generates a password of the given length", function(resume) { with(this) {
      vault.generate("google").then(function(pw) {
        resume(function () { assertEqual("xDFu", pw) })
      })
    }})
  }})

  describe("with a repetition limit", function() { with(this) {
    this.define("options", function() { return {phrase: "", length: 24, symbol: 0, number: 0, repeat: 1} })

    it("generates a password with no repeated characters", function(resume) { with(this) {
      vault.generate("asd").then(function(pw) {
        resume(function () { assertEqual("IVTDzACftqopUXqDHPkuCIhV", pw) })
      })
    }})
  }})

  describe("with no symbols", function() { with(this) {
    this.define("options", function() { return {phrase: PHRASE, symbol: 0} })

    it("generates a password containing no symbols", function(resume) { with(this) {
      vault.generate("google").then(function(pw) {
        resume(function () { assertEqual("XZ4wRe0bZCazbljCaMqR", pw) })
      })
    }})
  }})

  describe("with more symbols than will fit", function() { with(this) {
    this.define("options", function() { return {phrase: PHRASE, symbol: 100} })

    it("throws an error", function(resume) { with(this) {
      vault.generate("google").catch(function(error) {
        resume(function() { assertKindOf(Error, error) })
      })
    }})
  }})

  describe("with no numbers", function() { with(this) {
    this.define("options", function() { return {phrase: PHRASE, number: 0} })

    it("generates a password containing no digits", function(resume) { with(this) {
      vault.generate("google").then(function(pw) {
        resume(function () { assertEqual("_*$TVH.%^aZl(LUeOT?>", pw) })
      })
    }})
  }})

  describe("with no lowercase letters", function() { with(this) {
    this.define("options", function() { return {phrase: PHRASE, lower: 0} })

    it("generates a password containing no lowercase letters", function(resume) { with(this) {
      vault.generate("google").then(function(pw) {
        resume(function () { assertEqual(":{?)+7~@OA:L]!0E$)(+", pw) })
      })
    }})
  }})

  describe("with at least 5 numbers", function() { with(this) {
    this.define("options", function() { return {phrase: PHRASE, length: 8, number: 5} })

    it("generates a password with at least 5 digits", function(resume) { with(this) {
      vault.generate("songkick").then(function(pw) {
        resume(function () { assertEqual("i0908.7[", pw) })
      })
    }})
  }})

  describe("with lots of spaces", function() { with(this) {
    this.define("options", function() { return {phrase: PHRASE, space: 12} })

    it("generates a password that's almost all spaces", function(resume) { with(this) {
      vault.generate("songkick").then(function(pw) {
        resume(function () { assertEqual(" c   6 Bq  % 5fR    ", pw) })
      })
    }})
  }})

  describe("with no viable characters", function() { with(this) {
    this.define("options", function() {
      return {phrase: PHRASE, lower: 0, upper: 0, number: 0, space: 0, dash: 0, symbol: 0}
    })

    it("throws an error", function(resume) { with(this) {
      vault.generate("google").catch(function(error) {
        resume(function() { assertKindOf(Error, error) })
      })
    }})
  }})

  describe("with all character classes", function() { with(this) {
    this.define("options", function() {
      return {phrase: PHRASE, lower: 2, upper: 2, number: 1, space: 3, dash: 2, symbol: 1}
    })

    it("generates a password with all character types", function(resume) { with(this) {
      vault.generate("google").then(function(pw) {
        resume(function () { assertEqual(": : fv_wqt>a-4w1S  R", pw) })
      })
    }})
  }})
}})
