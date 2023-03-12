## Add dockerizenv script in your project **package.json**.
```json
"scripts": {
   "dockerizenv": "node ./node_modules/dockerizenv/index.js"
},
```

## Add **docker.env** for each project folder.
```md
# Name of the project

NAME="myproject"

# Exposing port (make sure it's unique with range of `REPLICAS`)

PORT="8080"

# Docker directory where project will reside

WORKDIR="/app/myproject"

# Project directory (build context in docker-compose.yml)

BUILD_CONTEXT="myproject"

# Docker compose replicas count (default: "1")

REPLICAS="1"
```

## Create **docker-compose.env**:
```bash
// npm run dockerizenv <docker-compose project name>

npm run dockerizenv my-compose-project
```