# UCS Lift-Up Backend

This tool is used as a backend for PEPFAR's Lift-Up Initiative applications. It is used to upload CSV files to the Unified Community Syste for Lift-Up initiative use. The CSV files are for tracking clients at a community level.It is also used as a way to extract Lift-Up (TEPI) related data from the uCS to Lift-Up dashboard.

## Installation

First Install docker in your PC by following [this guide](https://docs.docker.com/engine/install/). Secondly, clone this repo to your computer by using git clone and the repo's address:

`git clone https://github.com/AbtPS3/ucs-liftup-backend.git`

Once you have completed cloning the repo, go inside the repo in your computer: `cd ucs-liftup-tool` and once in there, copy the provided .env-example and create a new file called .env then edit the variables as configured for your settings. The variables are as described in the table below:

| Parameter          | Data Type  | Description                                           |
| ------------------ | ---------- | ----------------------------------------------------- |
| NODE_ENV           | ENUM       | App Environment: development, production, test        |
| PORT               | INTEGER    | The port at which Node will run(default 3012).        |
| JWT_SECRET         | STRING     | A random string to be used to verify JWT.             |
| OPENSRP_IP         | IP ADDRESS | The IP of OpenSRP server.                             |
| OPENSRP_PORT       | NUMBER(4)  | The port that the above OpenSRP server exposes.       |
| DASHBOARD_USERNAME | STRING     | Username for accessing dashboard data endpoint.       |
| DASHBOARD_PASSWORD | STRING     | Password for accessing dashboard data endpoint.       |
| OPENSRP_USERNAME   | STRING     | Database username from MOH.                           |
| OPENSRP_PASSWORD   | STRING     | Database password from MOH.                           |
| OPENSRP_HOST       | STRING     | A host address for DB server.                         |
| OPENSRP_SCHEMA     | STRING     | A specific schema to be used inside the database.     |
| OPENSRP_DATABASE   | STRING     | The parent database that contains schema.             |
| OPENSRP_PORT       | NUMBER     | The port at which the database is running at.         |
| DATABASE_URL       | STRING     | postgresql://user:pass@host:PORT/DB?schema=schemaName |

After configuring the environment variables, use the following Docker commands for various uses:

### Run

`docker compose up -d`

### Log Backend

`docker logs -f liftup-backend`

### Interact With Shell

`docker exec -it liftup-backend sh`

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

1.0.1
