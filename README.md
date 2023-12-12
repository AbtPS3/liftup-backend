# UCS Lift Up Uploader Backend

This tool is used as a backend to upload CSV files to the Unified Community Syste for Lift-Up initiative use. The files are for tracking clients at a community level.

## Installation

First Install docker in your PC by following [this guide](https://docs.docker.com/engine/install/). Secondly, clone this repo to your computer by using git clone and the repo's address:

`git clone https://github.com/AbtPS3/ucs-liftup-uploader-backend.git`

Once you have completed cloning the repo, go inside the repo in your computer: `cd ucs-liftup-uploader-tool` and once in there use the following Docker commands for various uses:

### Run

`docker compose up -d`

### Log Backend

`docker logs -f liftup-uploader-backend`

### Interact With Shell

`docker exec -it liftup-uploader-backend sh`

### Stop Services

`docker compose stop`

### Start Services

`docker compose start`

### Rebuild and Run

`docker compose up --build --force-recreate`

## License

ISC

## Author

MOH, USAID PS3+, Abt Associates

## Version

1.0.0
