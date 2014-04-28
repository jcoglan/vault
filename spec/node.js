JS = require('jstest')

JS.ENV.Vault = require('../lib/vault')

require('./vault_spec')
require('./stream_spec')
require('./node/generator_spec')
require('./node/config_file_spec')
require('./node/remote_sources_spec')

JS.Test.autorun()

