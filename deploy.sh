#!/bin/bash

file_path="git-actions.txt"

# Check if the file exists
if [ ! -e "$file_path" ]; then
    touch "$file_path"
fi

# Check if the first variable is present
if [ -n "$1" ]; then
    # If the variable is present, echo it
    echo "$(date): $1" >> "$file_path"

    # STDOUT the process
    echo $1
else
    # If the variable is not present, echo the default message
    echo "$(date): This is a GitHub initiated update!" >> "$file_path"
fi

# Stop docker process
docker compose stop

# Make sure you are on main branch
git branch -M main

# Pull the latest version
git pull

# Rebuild and restart docker
docker compose up -d --build
