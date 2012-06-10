var fs         = require('fs'),
    path       = require('path'),
    LocalStore = require('../../node/local_store'),
    Config     = require('../../lib/config'),
    CLI        = require('../../node/cli')

JS.ENV.CliSpec = JS.Test.describe("CLI", function() { with(this) {
  before(function() { with(this) {
    this.configPath = path.resolve(__dirname + "/.vault")
    this.exportPath = path.resolve(__dirname + "/export.json")
    this.stdout     = {}
    this.passphrase = "something"
    
    this.cli = new CLI({
      config: {path: configPath, key: "the key"},
      output: this.stdout,
      tty:    false,
      
      password: function(callback) {
        callback(passphrase)
      }
    })
    
    this.storage = new LocalStore({path: configPath, key: "the key"})
    this.config  = new Config(storage)
  }})
  
  after(function() { with(this) {
    [configPath, exportPath].forEach(function(path) {
      try { fs.unlinkSync(path) } catch (e) {}
    })
  }})
  
  describe("with no config file", function() { with(this) {
    it("outputs a generated password", function(resume) { with(this) {
      expect(stdout, "write").given("U!E<Z.|)~fYf8YgwB>#1")
      cli.run(["node", "bin/vault", "google", "-p"], function() { resume() })
    }})
    
    it("outputs a password with no symbols", function(resume) { with(this) {
      expect(stdout, "write").given("xFNzRgTF3Tlkk8zbzGVr")
      cli.run(["node", "bin/vault", "google", "-p", "--symbol", "0"], function() { resume() })
    }})
    
    it("outputs a password with required dashes and uppercase", function(resume) { with(this) {
      expect(stdout, "write").given("U!E<Z_2F3}TQU4Yg.n04")
      cli.run(["node", "bin/vault", "google", "-p", "--dash", "1", "--upper", "1"], function() { resume() })
    }})
    
    it("outputs a password with a length", function(resume) { with(this) {
      expect(stdout, "write").given(".%99Z1")
      cli.run(["node", "bin/vault", "google", "-p", "-l", "6"], function() { resume() })
    }})
    
    it("outputs a password with a repetition limit", function(resume) { with(this) {
      passphrase = ""
      expect(stdout, "write").given("uXcNnQGHMHMBQFRsjSlNKCfP")
      cli.run(["node", "bin/vault", "asd", "-p", "--number", "0", "--symbol", "0", "-l", "24", "-r", "1"], function() { resume() })
    }})
    
    it("reports an error if no passphrase given", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "No passphrase given; pass `-p` or run `vault -cp`", e.message )
        })
      })
    }})
    
    it("reports an error if no service given", function(resume) { with(this) {
      cli.run(["node", "bin/vault"], function(e) {
        resume(function() {
          assertEqual( "No service name given", e.message )
        })
      })
    }})
    
    it("saves a global passphrase", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-cp"], function() {
        config.read("internet", function(e, internet) {
          config.read("google", function(e, google) {
            resume(function() {
              assertEqual( {phrase: "something"}, internet )
              assertEqual( {phrase: "something"}, google )
      })})})})
    }})
    
    it("saves a service-specific passphrase", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-cp", "google"], function() {
        config.read("internet", function(e, internet) {
          config.read("google", function(e, google) {
            resume(function() {
              assertEqual( {}, internet )
              assertEqual( {phrase: "something"}, google )
      })})})})
    }})
    
    it("saves a global character constraint", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "--length", "6", "--symbol", "0"], function() {
        config.read("internet", function(e, internet) {
          config.read("google", function(e, google) {
            resume(function() {
              assertEqual( {length: 6, symbol: 0}, internet )
              assertEqual( {length: 6, symbol: 0}, google )
      })})})})
    }})
    
    it("saves a service-specific character constraint", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "google", "--length", "6", "--symbol", "0"], function() {
        config.read("internet", function(e, internet) {
          config.read("google", function(e, google) {
            resume(function() {
              assertEqual( {}, internet )
              assertEqual( {length: 6, symbol: 0}, google )
      })})})})
    }})
    
    it("exports the default settings", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-e", exportPath], function() {
        resume(function() {
          var json = JSON.parse(fs.readFileSync(exportPath))
          assertEqual( {global: {}, services: {}}, json )
        })
      })
    }})
    
    it("imports a saved settings file", function(resume) { with(this) {
      fs.writeFileSync(exportPath, '{"services":{"google":{"length":8}}}')
      cli.run(["node", "bin/vault", "-i", exportPath], function() {
        config.read("google", function(e, google) {
          resume(function() { assertEqual( {length: 8}, google ) })
        })
      })
    }})
  }})
  
  describe("with a config file", function() { with(this) {
    before(function(resume) { with(this) {
      config.edit(function(c) {
        c.services.twitter = {alpha: 1, symbol: 0}
        c.global.alpha = 0
        c.global.phrase = "saved passphrase"
      }, function() { resume() })
    }})
    
    it("reports an error if the key is wrong", function(resume) { with(this) {
      cli._config = new Config(new LocalStore({path: configPath, key: "the wrong key"}))
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
        })
      })
    }})
    
    it("reports an error if the file has been tampered", function(resume) { with(this) {
      fs.writeFileSync(configPath, fs.readFileSync(configPath).toString().replace(/.$/, "X"))
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
        })
      })
    }})
    
    it("reports an error if the file has a zero-length payload", function(resume) { with(this) {
      fs.writeFileSync(configPath, "DqOnhLAQ98oZtClj0lYjT2Y4YjU2NzRhZGVmMjRlN2E1ZWViYjJhYzRjODZlZjlkYThjNGRhYTVmOTEyZmIyNjdiNmJhNGExMWRiMTEwNWU=")
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
        })
      })
    }})
    
    it("reports an error if the file is too short", function(resume) { with(this) {
      fs.writeFileSync(configPath, "42")
      cli.run(["node", "bin/vault", "google"], function(e) {
        resume(function() {
          assertEqual( "Your .vault file is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
        })
      })
    }})
    
    it("outputs a password using the stored passphrase", function(resume) { with(this) {
      expect(stdout, "write").given("0{;!:-/:4+{61<?)<$9>")
      cli.run(["node", "bin/vault", "google"], function() { resume() })
    }})
    
    it("outputs a password using service-specific settings", function(resume) { with(this) {
      expect(stdout, "write").given("nqCkqIc619wCJ6iOLjfS")
      cli.run(["node", "bin/vault", "twitter"], function() { resume() })
    }})
    
    it("outputs a password using service-specific settings with overrides", function(resume) { with(this) {
      expect(stdout, "write").given("B$Z?h['V31Z49%u,M\\(;")
      cli.run(["node", "bin/vault", "twitter", "--symbol", "4"], function() { resume() })
    }})
    
    it("reports an error if no service given", function(resume) { with(this) {
      cli.run(["node", "bin/vault"], function(e) {
        resume(function() {
          assertEqual( "No service name given", e.message )
        })
      })
    }})
    
    it("changes a saved service setting", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "twitter", "--alpha", "8"], function() {
        config.read("twitter", function(e, twitter) {
          resume(function() { assertEqual( {alpha: 8, symbol: 0, phrase: "saved passphrase"}, twitter ) })
        })
      })
    }})
    
    it("changes a saved global setting", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-c", "--alpha", "8"], function() {
        config.read("google", function(e, google) {
          config.read("twitter", function(e, twitter) {
            resume(function() {
              assertEqual( {alpha: 8, phrase: "saved passphrase"}, google )
              assertEqual( {alpha: 1, symbol: 0, phrase: "saved passphrase"}, twitter )
      })})})})
    }})
    
    it("exports the saved settings in plaintext", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-e", exportPath], function() {
        resume(function() {
          var json = JSON.parse(fs.readFileSync(exportPath))
          assertEqual( {
            global: {alpha: 0, phrase: "saved passphrase" },
            services: {
              twitter: {alpha: 1, symbol: 0}
            }
          }, json)
        })
      })
    }})
    
    it("throws an error when importing a missing file", function(resume) { with(this) {
      cli.run(["node", "bin/vault", "-i", __dirname + "/nosuch"], function(error) {
        resume(function() { assert(error) })
      })
    }})
  }})
}})

