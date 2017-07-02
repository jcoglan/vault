var jstest    = require("jstest").Test,
    Promise   = require("storeroom").Promise,
    Vault     = require("../../lib/vault"),
    CliHelper = require("./helper")

jstest.describe("CLI generator", function() { with(this) {
  include(CliHelper)

  before(function() { with(this) {
    stub(fileStore, "get").returns(Promise.resolve(null))
    stub(fileStore, "entries").given("/sources/sessions/").returns(Promise.resolve([]))

    settings.password = "something"
  }})

  it("reports an error if no phrase is given", function(resume) { with(this) {
    call(["google"]).catch(function(error) {
      resume(function() { assertMatch(/no passphrase given/i, error.message) })
    })
  }})

  it("reports an error if no service is given", function(resume) { with(this) {
    call(["-p"]).catch(function(error) {
      resume(function() { assertMatch(/no service name given/i, error.message) })
    })
  }})

  it("generates a password using a phrase", function(resume) { with(this) {
    expect(stdout, "write").given("2hk!W[L,2rWWI=~=l>,E")
    call(["google", "-p"]).then(resume, resume)
  }})

  it("generates a password for each service", function(resume) { with(this) {
    expect(stdout, "write").given("JIk>bXA]~z!e0-Xr$\\aw")
    call(["twitter", "-p"]).then(resume, resume)
  }})

  it("generates a password using a private key", function(resume) { with(this) {
    settings.selectKey = "AAAAPUBLICKEY"
    settings.signature = Vault.UUID

    expect(stdout, "write").given("c8<BHXZMc*Gxks&%%=F4")
    call(["google", "-k"]).then(resume, resume)
  }})

  it("prints a password with a fixed length", function(resume) { with(this) {
    expect(stdout, "write").given("~#8[L9p7uW")
    call(["google", "-p", "-l", "10"]).then(resume, resume)
  }})

  it("prints a password with no symbols", function(resume) { with(this) {
    expect(stdout, "write").given("Bb4uFmAEUnTPJh23ecdQ")
    call(["google", "-p", "--symbol", "0"]).then(resume, resume)
  }})

  it("prints a password with required dashes and uppercase", function(resume) { with(this) {
    expect(stdout, "write").given("2-[w]thuTK8unIUVH\"Lp")
    call(["google", "-p", "--dash", "1", "--upper", "1"]).then(resume, resume)
  }})

  it("prints a password with all character types", function(resume) { with(this) {
    expect(stdout, "write").given("2b=(GpS__^I p %_i f0")
    call(["google", "-p", "--dash", "2", "--lower", "2", "--space", "3", "--upper", "2", "--symbol", "1", "--number", "1"]).then(resume, resume)
  }})

  it("prints a password with a repeatition limit", function(resume) { with(this) {
    settings.password = ""
    expect(stdout, "write").given("IVTDmgpdKuUnGTlxabDT")
    call(["asd", "-p", "--symbol", "0", "--number", "0", "--repeat", "1"]).then(resume, resume)
  }})

  it("does not require the --phrase flag if there's a global setting", function(resume) { with(this) {
    stub(fileStore, "get").given("/global").returns(Promise.resolve({phrase: "something"}))
    expect(stdout, "write").given("2hk!W[L,2rWWI=~=l>,E")
    call(["google"]).then(resume, resume)
  }})

  it("does not require the --phrase flag if there's a service setting", function(resume) { with(this) {
    stub(fileStore, "get").given("/services/google").returns(Promise.resolve({phrase: "something"}))
    expect(stdout, "write").given("2hk!W[L,2rWWI=~=l>,E")
    call(["google"]).then(resume, resume)
  }})

  it("uses a global setting if present", function(resume) { with(this) {
    stub(fileStore, "get").given("/global").returns(Promise.resolve({length: 6}))
    expect(stdout, "write").given("Tc8k~8")
    call(["google", "-p"]).then(resume, resume)
  }})

  it("uses a service setting if present", function(resume) { with(this) {
    stub(fileStore, "get").given("/services/google").returns(Promise.resolve({length: 8}))
    expect(stdout, "write").given("T=pf~mM=")
    call(["google", "-p"]).then(resume, resume)
  }})

  it("merges global and service settings", function(resume) { with(this) {
    stub(fileStore, "get").given("/global").returns(Promise.resolve({symbol: 0}))
    stub(fileStore, "get").given("/services/google").returns(Promise.resolve({length: 8}))
    expect(stdout, "write").given("w0H6fT9g")
    call(["google", "-p"]).then(resume, resume)
  }})

  it("uses a service setting in preference to a global one", function(resume) { with(this) {
    stub(fileStore, "get").given("/global").returns(Promise.resolve({length: 6}))
    stub(fileStore, "get").given("/services/google").returns(Promise.resolve({length: 8}))
    expect(stdout, "write").given("T=pf~mM=")
    call(["google", "-p"]).then(resume, resume)
  }})

  it("uses a command-line argument in preference to stored settings", function(resume) { with(this) {
    stub(fileStore, "get").given("/global").returns(Promise.resolve({length: 6}))
    stub(fileStore, "get").given("/services/google").returns(Promise.resolve({length: 8}))
    expect(stdout, "write").given("~#9?(:p<@VkI")
    call(["google", "-p", "--length", "12"]).then(resume, resume)
  }})

  it("prints notes associated with a service", function(resume) { with(this) {
    stub(fileStore, "get").given("/services/google").returns(Promise.resolve({notes: "google notes"}))
    expect(stderr, "write").given("\ngoogle notes\n\n")
    expect(stdout, "write").given("2hk!W[L,2rWWI=~=l>,E")
    call(["google", "-p"]).then(resume, resume)
  }})
}})
