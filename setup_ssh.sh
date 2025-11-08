#!/bin/bash
mkdir -p ~/.ssh
printf "%s" "$SSH_PRIVATE_KEY" > ~/.ssh/id_ed25519
printf "%s" "$SSH_PUBLIC_KEY" > ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub