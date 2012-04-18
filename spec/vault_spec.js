var PHRASE = "She cells C shells bye the sea shoars"

JS.ENV.VaultSpec = JS.Test.describe("Vault", function() { with(this) {
  before(function() { this.vault = new Vault(this.options()) })
  
  define("options", function() { return {} })
  
  describe("with a passphrase", function() { with(this) {
    define("options", function() { return {phrase: PHRASE} })
    
    it("generates a password", function() { with(this) {
      assertEqual( ">5ZIU8054Z<|-308", vault.generate("google") )
    }})
    
    it("generates a different password for each service", function() { with(this) {
      assertEqual( ":F+|H46,,e!G6.^!", vault.generate("twitter") )
    }})

    it("generates a different password for each passphrase", function() { with(this) {
      vault = new Vault({phrase: PHRASE + "X"})
      assertEqual( "1!m0^^H!5h9.{Y:U", vault.generate("google") )
    }})
  }})
  
  describe("with a length", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, length: 4} })
    
    it("generates a password of the given length", function() { with(this) {
      assertEqual( "1[rZ", vault.generate("google") )
    }})
  }})
  
  describe("with an unreachable length", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, length: 40} })
    
    it("throws an error", function() { with(this) {
      assertThrows(Error, function() { vault.generate("google") })
    }})
  }})
  
  describe("with no symbols", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, symbol: 0} })
    
    it("generates a password containing no symbols", function() { with(this) {
      assertEqual( "RCSeAvcMlImRtTT2", vault.generate("google") )
    }})
  }})
  
  describe("with more symbols than will fit", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, symbol: 100} })
    
    it("throws an error", function() { with(this) {
      assertThrows(Error, function() { vault.generate("google") })
    }})
  }})
  
  describe("with no numbers", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, number: 0} })
    
    it("generates a password containing no digits", function() { with(this) {
      assertEqual( "R%ZIU* %$ZQ @TTE", vault.generate("google") )
    }})
  }})
  
  describe("with no letters", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, alpha: 0} })
    
    it("generates a password containing no letters", function() { with(this) {
      assertEqual( '=[!16}:}:[-5";}+', vault.generate("google") )
    }})
  }})
  
  describe("with at least 5 numbers", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, length: 8, number: 5} })
    
    it("generates a password with at least 5 digits", function() { with(this) {
      assertEqual( "O56?6559", vault.generate("songkick") )
    }})
  }})
  
  describe("with lots of spaces", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, space: 12} })
    
    it("generates a password that's almost all spaces", function() { with(this) {
      assertEqual( "   7l   O      b", vault.generate("songkick") )
    }})
  }})
}})

