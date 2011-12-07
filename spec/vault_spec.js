var PHRASE = "She cells C shells bye the sea shoars"

JS.ENV.VaultSpec = JS.Test.describe("Vault", function() { with(this) {
  before(function() { this.vault = new Vault(this.options()) })
  
  define("options", function() { return {} })
  
  describe("with a passphrase", function() { with(this) {
    define("options", function() { return {phrase: PHRASE} })
    
    it("generates a password", function() { with(this) {
      assertEqual( 'L}%";X7-2nYy1}!C^X2_', vault.generate("google") )
    }})
    
    it("generates a different password for each service", function() { with(this) {
      assertEqual( "96j4-6F']svoy1Gkif@3", vault.generate("twitter") )
    }})
  }})
  
  describe("with a length", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, length: 4} })
    
    it("generates a password of the given length", function() { with(this) {
      assertEqual( 'L}%"', vault.generate("google") )
    }})
  }})
  
  describe("with no symbols", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, symbol: false} })
    
    it("generates a password containing no symbols", function() { with(this) {
      assertEqual( "sZODkFJ3A2g5gnzZ85ey", vault.generate("google") )
    }})
  }})
  
  describe("with no numbers", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, number: false} })
    
    it("generates a password containing no digits", function() { with(this) {
      assertEqual( "L?]PN$(@T]%m!?=C}X@T", vault.generate("google") )
    }})
  }})
  
  describe("with no letters", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, alpha: false} })
    
    it("generates a password containing no letters", function() { with(this) {
      assertEqual( "*]}7*_:\"'=+6:>6+:|_8", vault.generate("google") )
    }})
  }})
}})

