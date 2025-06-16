export VAULT_PATH=~+/.keychain
export VAULT_KEY='open sesame'
export PATH=~+/bin:$PATH

alias inspect="node sandbox/inspector.js"
alias inspectdb="tree -a .keychain && cat .keychain/config"
alias cleandb="rm -rf .keychain"

source lib/cli/scripts/init
