var async       = require("async"),
    fs          = require("fs"),
    path        = require("path"),
    Store       = require("../../lib/store"),
    FileAdapter = require("../../node/file_adapter"),
    helper      = require("./cli_helper")

JS.Test.describe("Config file", function() { with(this) {
  include(helper)

  before(function(resume) { with(this) {
    storage.saveGlobals({lower: 0, phrase: "saved passphrase"}, function() {
      async.forEach([
        ["twitter",   {lower: 1, symbol: 0}],
        ["nothing",   {notes: "\nSome notes!\n===========\n\n\n\n"}],
        ["facebook",  {key: "AAAAPUBLICKEY"}]
      ], function(service, done) {
        storage.saveService(service[0], service[1], true, done)
      }, resume)
    })
  }})

  it("reports an error if the key is wrong", function(resume) { with(this) {
    cli._store = new Store(new FileAdapter(configPath), "the wrong key", {cache: false})

    cli.run(["node", "bin/vault", "google"], function(e) {
      resume(function() {
        assertEqual( "Your .vault database is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
    })})
  }})

  it("reports an error if the file has been tampered", function(resume) { with(this) {
    var _path = path.join(configPath, "sources")
    fs.writeFileSync(_path, "X")
    cli.run(["node", "bin/vault", "google"], function(e) {
      resume(function() {
        assertEqual( "Your .vault database is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
    })})
  }})

  it("reports an error if the file has a zero-length payload", function(resume) { with(this) {
    var _path = path.join(configPath, "sources")
    fs.writeFileSync(_path, "DqOnhLAQ98oZtClj0lYjT2Y4YjU2NzRhZGVmMjRlN2E1ZWViYjJhYzRjODZlZjlkYThjNGRhYTVmOTEyZmIyNjdiNmJhNGExMWRiMTEwNWU=")
    cli.run(["node", "bin/vault", "google"], function(e) {
      resume(function() {
        assertEqual( "Your .vault database is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
    })})
  }})

  it("reports an error if the file is too short", function(resume) { with(this) {
    var _path = path.join(configPath, "sources")
    fs.writeFileSync(_path, "42")
    cli.run(["node", "bin/vault", "google"], function(e) {
      resume(function() {
        assertEqual( "Your .vault database is unreadable; check your VAULT_KEY and VAULT_PATH settings", e.message )
    })})
  }})

  it("completes option fragments", function(resume) { with(this) {
    expect(stdout, "write").given("--lower")
    cli.run(["node", "bin/vault", "--cmplt", "--lo"], resume)
  }})

  it("completes option fragments with no letters", function(resume) { with(this) {
    expect(stdout, "write").given( ["--add-source", "--browser", "--cert",
      "--clear", "--cmplt", "--config", "--dash", "--delete",
      "--delete-globals", "--delete-source", "--export", "--help",
      "--import", "--initpath", "--key", "--length", "--list-sources",
      "--lower", "--master-key", "--notes", "--number", "--phrase",
      "--repeat", "--set-source", "--show-source", "--source", "--space",
      "--symbol", "--text-browser", "--upper"].join("\n") )

    cli.run(["node", "bin/vault", "--cmplt", "--"], resume)
  }})

  it("completes service names", function(resume) { with(this) {
    expect(stdout, "write").given("twitter")
    cli.run(["node", "bin/vault", "--cmplt", "tw"], resume)
  }})

  it("completes empty service names", function(resume) { with(this) {
    expect(stdout, "write").given(["facebook", "local", "nothing", "twitter"].join("\n"))
    cli.run(["node", "bin/vault", "--cmplt", ""], resume)
  }})

  it("outputs a password using the stored passphrase", function(resume) { with(this) {
    expect(stdout, "write").given("(JA!4O'+&5I'/-V{N100")
    cli.run(["node", "bin/vault", "google"], resume)
  }})

  it("outputs a password using a service-specific passphrase", function(resume) { with(this) {
    expect(stdout, "write").given("199pS3LWcTpgGBMEDkx9")
    cli.run(["node", "bin/vault", "twitter"], resume)
  }})

  it("outputs a password using a service-specific private key", function(resume) { with(this) {
    expect(stdout, "write").given('++IAP:^*$6,"9~R-}%R-')
    cli.run(["node", "bin/vault", "facebook"], resume)
  }})

  it("allows the --phrase flag to override stored keys", function(resume) { with(this) {
    expect(stdout, "write").given("Q}T.}#S+SE#@+'|}5Q\\A")
    cli.run(["node", "bin/vault", "facebook", "-p"], resume)
  }})

  it("outputs a password using service-specific settings with overrides", function(resume) { with(this) {
    expect(stdout, "write").given("^g;Y4[k+Sg!1Z1fxY<mO")
    cli.run(["node", "bin/vault", "twitter", "--symbol", "4"], resume)
  }})

  it("outputs a password on stdout and the notes on stderr", function(resume) { with(this) {
    expect(stdout, "write").given("1$5QC<'<?[FWE~&'P(]U")
    expect(stderr, "write").given("\nSome notes!\n===========\n\n")
    cli.run(["node", "bin/vault", "nothing"], resume)
  }})

  it("reports an error if no service given", function(resume) { with(this) {
    cli.run(["node", "bin/vault"], function(e) {
      resume(function() {
        assertEqual( "No service name given", e.message )
    })})
  }})

  it("removes all saved services", function(resume) { with(this) {
    cli.run(["node", "bin/vault", "-X"], function() {
      storage.serviceSettings("twitter", true, function(e, twitter) {
        resume(function() { assertEqual( {}, twitter ) })
    })})
  }})

  it("removes global settings", function(resume) { with(this) {
    cli.run(["node", "bin/vault", "--delete-globals"], function() {
      storage.serviceSettings("twitter", true, function(e, twitter) {
        resume(function() { assertEqual( {lower: 1, symbol: 0}, twitter ) })
    })})
  }})

  it("removes a saved service", function(resume) { with(this) {
    cli.run(["node", "bin/vault", "-x", "twitter"], function() {
      storage.serviceSettings("twitter", true, function(e, twitter) {
        resume(function() { assertEqual( {lower: 0, phrase: "saved passphrase"}, twitter ) })
    })})
  }})

  it("changes a saved service setting", function(resume) { with(this) {
    cli.run(["node", "bin/vault", "-c", "twitter", "--lower", "8"], function() {
      storage.serviceSettings("twitter", true, function(e, twitter) {
        resume(function() { assertEqual( {lower: 8, symbol: 0, phrase: "saved passphrase"}, twitter ) })
    })})
  }})

  it("changes a saved global setting", function(resume) { with(this) {
    cli.run(["node", "bin/vault", "-c", "--lower", "8"], function() {
      storage.serviceSettings("google", true, function(e, google) {
        storage.serviceSettings("twitter", true, function(e, twitter) {
          resume(function() {
            assertEqual( {lower: 8, phrase: "saved passphrase"}, google )
            assertEqual( {lower: 1, symbol: 0, phrase: "saved passphrase"}, twitter )
    })})})})
  }})

  it("exports the saved settings in plaintext", function(resume) { with(this) {
    cli.run(["node", "bin/vault", "-e", exportPath], function() {
      resume(function() {
        var json = JSON.parse(fs.readFileSync(exportPath))
        assertEqual( {
          global: {lower: 0, phrase: "saved passphrase" },
          services: {
            facebook: {key: "AAAAPUBLICKEY"},
            nothing: {notes: "\nSome notes!\n===========\n\n\n\n"},
            twitter: {lower: 1, symbol: 0}
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

