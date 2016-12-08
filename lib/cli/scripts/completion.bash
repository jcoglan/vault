#!/usr/bin/env bash

_vault_complete() {
  COMPREPLY=()
  local word="${COMP_WORDS[COMP_CWORD]}"
  local completions="$(vault --cmplt "$word")"
  COMPREPLY=( $(compgen -W "$completions" -- "$word") )
}

complete -f -F _vault_complete vault
