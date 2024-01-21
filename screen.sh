#!/bin/bash

sleep 1

# Check if the screen session "liftup-backend" is already running
if screen -ls | grep -q "liftup-backend"; then
    # If it is running, reattach to the existing session, stop nodemon, and then run deploy.sh
    sleep 2
    screen -S liftup-backend -X stuff $'./deploy.sh\n' # Sending Ctrl+C (SIGINT and bash command)
else
    # If it is not running, start a new session and execute the deploy script
    screen -S liftup-backend -d -m bash -c 'bash ./deploy.sh'
fi
