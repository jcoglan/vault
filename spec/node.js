JS = require('jstest')

JS.ENV.Vault = require('../lib/vault')

require('./vault_spec')
require('./stream_spec')
require('./node/cli_spec')

JS.Test.autorun()

