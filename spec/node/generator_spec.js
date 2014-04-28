var fs     = require("fs"),
    editor = require("../../node/editor"),
    helper = require("./cli_helper")

JS.ENV.CliSpec = JS.Test.describe("CLI", function() { with(this) {
  include(helper)

  it("outputs a generated password", function(resume) { with(this) {
    expect(stdout, "write").given("2hk!W[L,2rWWI=~=l>,E")
    cli.run(["node", "bin/vault", "google", "-p"], resume)
  }})

  it("generates a password using a private key", function(resume) { with(this) {
    expect(stdout, "write").given("c8<BHXZMc*Gxks&%%=F4")
    cli.run(["node", "bin/vault", "google", "-k"], resume)
  }})

  it("outputs a password with no symbols", function(resume) { with(this) {
    expect(stdout, "write").given("Bb4uFmAEUnTPJh23ecdQ")
    cli.run(["node", "bin/vault", "google", "-p", "--symbol", "0"], resume)
  }})

  it("outputs a password with required dashes and uppercase", function(resume) { with(this) {
    expect(stdout, "write").given('2-[w]thuTK8unIUVH"Lp')
    cli.run(["node", "bin/vault", "google", "-p", "--dash", "1", "--upper", "1"], resume)
  }})

  it("outputs a password with all character types", function(resume) { with(this) {
    expect(stdout, "write").given(": : fv_wqt>a-4w1S  R")
    passphrase = "She cells C shells bye the sea shoars"
    cli.run(["node", "bin/vault", "google", "-p", "--dash", "2", "--lower", "2", "--space", "3", "--upper", "2", "--symbol", "1", "--number", "1"], resume)
  }})

  it("outputs a password with a length", function(resume) { with(this) {
    expect(stdout, "write").given("Tc8k~8")
    cli.run(["node", "bin/vault", "google", "-p", "-l", "6"], resume)
  }})

  it("outputs a password with a repetition limit", function(resume) { with(this) {
    passphrase = ""
    expect(stdout, "write").given("IVTDzACftqopUXqDHPkuCIhV")
    cli.run(["node", "bin/vault", "asd", "-p", "--number", "0", "--symbol", "0", "-l", "24", "-r", "1"], resume)
  }})

  it("reports an error if no passphrase given", function(resume) { with(this) {
    cli.run(["node", "bin/vault", "google"], function(e) {
      resume(function() {
        assertEqual( "No passphrase given; pass `-p` or run `vault -cp`", e.message )
    })})
  }})

  it("reports an error if no service given", function(resume) { with(this) {
    cli.run(["node", "bin/vault"], function(e) {
      resume(function() {
        assertEqual( "No service name given", e.message )
    })})
  }})

  it("saves a global passphrase", function(resume) { with(this) {
    cli.run(["node", "bin/vault", "-cp"], function() {
      storage.serviceSettings("internet", true, function(e, internet) {
        storage.serviceSettings("google", true, function(e, google) {
          resume(function() {
            assertEqual( {phrase: "something"}, internet )
            assertEqual( {phrase: "something"}, google )
    })})})})
  }})

  it("saves a service-specific passphrase", function(resume) { with(this) {
    cli.run(["node", "bin/vault", "-cp", "google"], function() {
      storage.serviceSettings("internet", true, function(e, internet) {
        storage.serviceSettings("google", true, function(e, google) {
          resume(function() {
            assertEqual( {}, internet )
            assertEqual( {phrase: "something"}, google )
    })})})})
  }})

  it("saves a global public key", function(resume) { with(this) {
    cli.run(["node", "bin/vault", "-ck"], function() {
      storage.serviceSettings("internet", true, function(e, internet) {
        storage.serviceSettings("google", true, function(e, google) {
          resume(function() {
            assertEqual( {key: "AAAAPUBLICKEY"}, internet )
            assertEqual( {key: "AAAAPUBLICKEY"}, google )
    })})})})
  }})

  it("saves a service-specific public key", function(resume) { with(this) {
    cli.run(["node", "bin/vault", "-ck", "google"], function() {
      storage.serviceSettings("internet", true, function(e, internet) {
        storage.serviceSettings("google", true, function(e, google) {
          resume(function() {
            assertEqual( {}, internet )
            assertEqual( {key: "AAAAPUBLICKEY"}, google )
    })})})})
  }})

  it("saves a global character constraint", function(resume) { with(this) {
    cli.run(["node", "bin/vault", "-c", "--length", "6", "--symbol", "0"], function() {
      storage.serviceSettings("internet", true, function(e, internet) {
        storage.serviceSettings("google", true, function(e, google) {
          resume(function() {
            assertEqual( {length: 6, symbol: 0}, internet )
            assertEqual( {length: 6, symbol: 0}, google )
    })})})})
  }})

  it("saves a service-specific character constraint", function(resume) { with(this) {
    cli.run(["node", "bin/vault", "-c", "google", "--length", "6", "--symbol", "0"], function() {
      storage.serviceSettings("internet", true, function(e, internet) {
        storage.serviceSettings("google", true, function(e, google) {
          resume(function() {
            assertEqual( {}, internet )
            assertEqual( {length: 6, symbol: 0}, google )
    })})})})
  }})

  it("saves some notes for a service", function(resume) { with(this) {
    stub(editor, "edit").yields([null, "Saved notes!"])
    cli.run(["node", "bin/vault", "-c", "--notes", "google"], function() {
      storage.serviceSettings("google", true, function(e, google) {
        resume(function() {
          assertEqual( {notes: "Saved notes!"}, google )
    })})})
  }})

  it("deletes the notes for a service", function(resume) { with(this) {
    stub(editor, "edit").yields([null, " \n\r\t\t \n\r\n "])
    cli.run(["node", "bin/vault", "-c", "--notes", "google"], function() {
      storage.serviceSettings("google", true, function(e, google) {
        resume(function() {
          assertEqual( {}, google )
    })})})
  }})

  it("exports the default settings", function(resume) { with(this) {
    cli.run(["node", "bin/vault", "-e", exportPath], function() {
      resume(function() {
        var json = JSON.parse(fs.readFileSync(exportPath))
        assertEqual( {global: {}, services: {}}, json )
    })})
  }})

  it("imports a saved settings file", function(resume) { with(this) {
    fs.writeFileSync(exportPath, '{"services":{"google":{"length":8}}}')
    cli.run(["node", "bin/vault", "-i", exportPath], function() {
      storage.serviceSettings("google", true, function(e, google) {
        resume(function() { assertEqual( {length: 8}, google ) })
    })})
  }})
}})

