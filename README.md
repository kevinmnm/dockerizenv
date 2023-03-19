## Introduction
This package is to create basic **docker-compose.env**. It'll also create **docker-compose.yml** in the root directory and also **Dockerfile** in each sub projects if they're missing.

---

#### *Project folder strucutre example:*
```
📦 root
 ┣ 📂 project1
 ┃ ┣ 📜 docker.env
 ┃ ┗ 📜 Dockerfile
 ┣ 📂 project2
 ┃ ┣ 📜 docker.env
 ┃ ┗ 📜 Dockerfile
 ┣ 📂 project3
 ┃ ┣ 📜 docker.env
 ┃ ┗ 📜 Dockerfile
 ┣ 📜 docker-compose.env
 ┗ 📜 docker-compose.yml
 ```

The **docker.env** file must be presented in each project directory as those variables will be used to create ***docker-compose.env***.

---


## Add dockerizenv script in your root project ***package.json***.
```json
"scripts": {
   "dockerizenv": "node ./node_modules/dockerizenv/index.js"
},
```

## Add ***docker.env*** for each project folder.
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

## Command line options syntax
```
// Pass compose project name (default: project)
--project-name my-project
--project-name=my-project
--project-name="my-project"

// Change project .env filename (default: docker.env)
--env-file project.env
--env-file=project.env
--env-file="project.env"

// Change docker-compose .env filename (default: docker-compose.env)
--dockerizenv-file dc.env
--dockerizenv-file=dc.env
--dockerizenv-file="dc.env"
```

## Create **docker-compose.env**:
```bash
// npm run dockerizenv <options>

npm run dockerizenv --project-name="my-compose-project"
```