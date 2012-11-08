#!/usr/bin/env zsh

if [[ ! -o interactive ]]; then                                                                                                        
  return
fi

_vault_complete() {
  local word completions
  word="$1"
  completions="$(vault --cmplt "${word}")"
  reply=( "${(ps:\n:)completions}" )
}

compctl -K _vault_complete vault

