var PHRASE = "She cells C shells bye the sea shoars"

JS.ENV.VaultSpec = JS.Test.describe("Vault", function() { with(this) {
  before(function() { this.vault = new Vault(this.options()) })
  
  define("options", function() { return {} })
  
  describe("with a passphrase", function() { with(this) {
    define("options", function() { return {phrase: PHRASE} })
    
    it("generates a password", function() { with(this) {
      assertEqual( "ZoNE1gr1Z]J2_274Y(;X", vault.generate("google") )
    }})
    
    it("generates a different password for each service", function() { with(this) {
      assertEqual( "9E. Z(*&!£w3Zd6h8WX)", vault.generate("twitter") )
    }})
  }})
  
  describe("with a length", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, length: 4} })
    
    it("generates a password of the given length", function() { with(this) {
      assertEqual( 'w06P', vault.generate("google") )
    }})
  }})
  
  describe("with no symbols", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, symbol: 0} })
    
    it("generates a password containing no symbols", function() { with(this) {
      assertEqual( "zduX7SCXZ iXA52Udpvi", vault.generate("google") )
    }})
  }})
  
  describe("with no numbers", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, number: 0} })
    
    it("generates a password containing no digits", function() { with(this) {
      assertEqual( "ZoNE gr Z>J!UTUh&_uy", vault.generate("google") )
    }})
  }})
  
  describe("with no letters", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, alpha: 0} })
    
    it("generates a password containing no letters", function() { with(this) {
      assertEqual( "{3([:}}6=$;.==?]:7$ ", vault.generate("google") )
    }})
  }})
  
  describe("with at least 3 numbers", function() { with(this) {
    define("options", function() { return {phrase: PHRASE, length: 8, number: 5} })
    
    it("generates a password with at least 5 digits", function() { with(this) {
      assertEqual( "82Wy8q53", vault.generate("songkick") )
    }})
  }})
}})

