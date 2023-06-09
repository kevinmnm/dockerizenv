const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const chalk = require('chalk');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
// const {
//    exec
// } = require('node:child_process');
const dotenv = require('dotenv');

const cwd = process.cwd(); // For NPM package!
// const argv = process.argv; // For NPM package!
const argv = yargs(hideBin(process.argv)).argv // For NPM package!
const projectName = argv["project-name"];
const envFile = argv["env-file"];

const LOGGER = {
   info: (msg) => console.log(chalk.blue(msg)),
   done: (msg) => console.log(chalk.green(msg)),
   // success: (msg) => console.log(chalk.greenBright.bgBlack(msg)),
   success: (msg) => console.log(chalk.yellow.bgBlack(msg)),
}

////////////////////////////////////////
////////////////////////////////////////

const PROJECTS_DIR = '.';

const DOCKER_ENV_FILE = envFile || 'docker.env';

const DOCKER_COMPOSE_VERSION = '3.8';

const DOCKER_COMPOSE_ENV_FILE = 'docker-compose.env';

const DEFAULT_ENVS = {
   // COMPOSE_PROJECT_NAME: 'kevsong', // For `--project-name` option.
   COMPOSE_PROJECT_NAME: projectName || 'project', // For `--project-name` option.
   COMPOSE_FILE: './docker-compose.yml', // For `--file` option.
   DOCKER_FILE_NAME: 'Dockerfile'
}

const IGNORE_FOLDERS = [
   'node_modules',
   'nginx',
];

////////////////////////////////////////
////////////////////////////////////////

console.clear();

const dockerComposeFilePath = path.join(cwd, PROJECTS_DIR, DEFAULT_ENVS.COMPOSE_FILE);

let dcYML = `version: '${DOCKER_COMPOSE_VERSION}'\n\nservices:`;

async function dockerize() {
   try {
      //>> Check if docker-compose.yml already exists <<//
      const dockerComposeYmlExists = fs.existsSync(dockerComposeFilePath);

      //>> Detect all files in current (project) directory <<//
      const files = await fsp.readdir(path.join(cwd, PROJECTS_DIR), {
         encoding: 'utf8',
         withFileTypes: true
      });

      //>> Filter out directory <<//
      const projectDirs = files.filter(file => {
         return !file.name.startsWith('.') && file.isDirectory() && !IGNORE_FOLDERS.includes(file.name) && !file.name.startsWith('_');
      });

      LOGGER.info(`Detected valid project directories: \n${projectDirs.map( x => '- ' + x.name).join('\n')}`);

      console.log();

      LOGGER.info(`Creating docker-compose env: \n${Object.entries(DEFAULT_ENVS).map(x => `- ${x[0]}="${x[1]}"`).join('\n')}`);

      console.log();

      let dockerEnv = `###>> DOCKER-COMPOSE CONFIGURE <<###\n`;

      //>> Set default env variables <<//
      for (const config in DEFAULT_ENVS) {
         const value = DEFAULT_ENVS[config];
         dockerEnv += `${config.toUpperCase()}="${value}"\n`;
      }

      dockerEnv += '\n\n';

      //>> Read all project .env files <<//
      projectDirs.forEach(async dir => {
         const projectDir = dir.name;
         dockerEnv += `### FOR PROJECT: ${projectDir} ###\n`;
         const projectPath = path.join(cwd, projectDir);
         const envFilePath = path.join(projectPath, DOCKER_ENV_FILE);
         const envContent = fs.readFileSync(envFilePath, {
            encoding: 'utf8'
         });
         const envParsed = dotenv.parse(envContent);
         const NAME = envParsed.NAME?.toUpperCase()?.replaceAll('-', '_');

         if (!NAME) throw new Error(`No project name!`);

         const PORT = envParsed.PORT;
         const port = +PORT;
         if (Number.isNaN(port)) {
            throw new Error('Invalid "PORT" value!');
         }
         const REPLICAS = envParsed.REPLICAS || 1;
         const replicas = +REPLICAS;
         if (Number.isNaN(replicas)) {
            throw new Error('The "REPLICAS" value is not a number!');
         }

         for (let i = 1; i < replicas; i++) {
            envParsed[`PORT_${i}`] = port + i;
         }

         for (const prop in envParsed) {
            const propName = prop.toUpperCase();
            const value = envParsed[prop];
            const combName = `${propName}_${NAME}`;
            dockerEnv += `${combName}="${value}"\n`;
         }

         dockerEnv += '\n';

         //>> Add content to docker-compse.yml and Dockerfile <<//
         (!dockerComposeYmlExists) && (addToDockerComposeYML(envParsed));
         addDockerfile(projectPath, NAME)
      });

      //>> Create new docker-compose.env file <<//
      const dockerComposeEnvPath = path.join(cwd, DOCKER_COMPOSE_ENV_FILE);

      await fsp.writeFile(dockerComposeEnvPath, dockerEnv, {
         encoding: 'utf8'
      });

      console.log();

      LOGGER.success(`Created ${DOCKER_COMPOSE_ENV_FILE}!`);

      //>> Create new docker-compose.yml file <<//
      if (dockerComposeYmlExists) {
         // console.log(`Looks like ${DEFAULT_ENVS.COMPOSE_FILE} already exists. Skipping creation.`);
         console.log();
         LOGGER.done(`Looks like ${DEFAULT_ENVS.COMPOSE_FILE} already exists. Skipping creation.`);
         return;
      }

      // console.log(`\n\n${DEFAULT_ENVS.COMPOSE_FILE} was created!`);
      LOGGER.done(`\n\n${DEFAULT_ENVS.COMPOSE_FILE} was created!`);

   } catch (error) {
      throw new Error(error);
   } finally {
      // console.log(`\nDONE!`);
      LOGGER.success(`\nDONE!`);
   }
}

function addToDockerComposeYML(envs) {
   const serviceName = envs.NAME.replaceAll('-', '_');
   const NAME = serviceName.toUpperCase();

   // const service = `
   //    \r\t${serviceName}:
   //       \r\t\timage: \${NAME_${NAME}}:latest
   //       \r\t\tbuild:
   //          \r\t\t\tcontext: ./\${BUILD_CONTEXT_${NAME}}
   //          \r\t\t\tdockerfile: Dockerfile
   //          \r\t\t\targs:
   //          \r\t\t\t\t- NAME=\${NAME_${NAME}}
   //          \r\t\t\t\t- TYPE=\${TYPE_${NAME}}
   //          \r\t\t\t\t- PORT=\${PORT_${NAME}}
   //          \r\t\t\t\t- WORKDIR=\${WORKDIR_${NAME}}
   //       \r\t\tdeploy:
   //          \r\t\t\treplicas: 1
   //          \r\t\t\trestart_policy: 1
   //          \r\t\t\t\tcondition: on-failure
   //          \r\t\t\t\tdelay: 60s
   //          \r\t\t\t\tmax_attempts: 10
   //          \r\t\t\t\twindow: 60s
   //       \r\t\tports:
   //          \r\t\t\t- \${PORT_${NAME}}:\${PORT_${NAME}}
   // `.replaceAll('\t', ' ');

   // const service = `
   //    \r${s(1)}${serviceName}:
   //       \r${s(2)}image: \${NAME_${NAME}}:latest
   //       \r${s(2)}build:
   //          \r${s(3)}context: ./\${BUILD_CONTEXT_${NAME}}
   //          \r${s(3)}dockerfile: Dockerfile
   //          \r${s(3)}args:
   //             \r${s(4)}- NAME=\${NAME_${NAME}}
   //             \r${s(4)}- TYPE=\${TYPE_${NAME}}
   //             \r${s(4)}- PORT=\${PORT_${NAME}}
   //             \r${s(4)}- WORKDIR=\${WORKDIR_${NAME}}
   //       \r${s(2)}deploy:
   //          \r${s(3)}replicas: 1
   //          \r${s(3)}restart_policy: 1
   //             \r${s(4)}condition: on-failure
   //             \r${s(4)}delay: 60s
   //             \r${s(4)}max_attempts: 10
   //             \r${s(4)}window: 60s
   //       \r${s(2)}ports:
   //          \r${s(3)}- \${PORT_${NAME}}:\${PORT_${NAME}}
   // `
   const service = `
      *${serviceName}:
         **image: \${NAME_${NAME}}:latest
         **build:
            ***context: ./\${BUILD_CONTEXT_${NAME}}
            ***dockerfile: Dockerfile
            ***args:
            ****- NAME=\${NAME_${NAME}}
            ****- TYPE=\${TYPE_${NAME}}
            ****- PORT=\${PORT_${NAME}}
            ****- WORKDIR=\${WORKDIR_${NAME}}
         **deploy:
            ***replicas: 1
            ***restart_policy:
               ****condition: on-failure
               ****delay: 60s
               ****max_attempts: 10
               ****window: 60s
         **ports:
            ***- \${PORT_${NAME}}:\${PORT_${NAME}}
   `
      .split('\n')
      // .map(line => line.replace(/\s+$/, ''))
      .map(line => line.trim().replaceAll('*', '  '))
      .join('\n')
   // .replaceAll('\r','');

   fs.appendFileSync(dockerComposeFilePath, service, {
      encoding: 'utf8'
   });
   //    return `
   // version: '${DOCKER_COMPOSE_VERSION}'

   // services:
   //   frontend:
   //     image: ${NAME_MMF}:latest
   //     build:
   //       context: ./${BUILD_CONTEXT_MMF}
   //       dockerfile: Dockerfile
   //       args:
   //         - NAME=${NAME_MMF}
   //         - TYPE=${TYPE_MMF}
   //         - PORT=${PORT_MMF}
   //         - WORKDIR=${WORKDIR_MMF}
   //     deploy:
   //       replicas: 1
   //       restart_policy:
   //         condition: on-failure
   //         delay: 60s
   //         max_attempts: 5
   //         window: 60s
   //     ports:
   //       - ${PORT_MMF}:${PORT_MMF}
   // `
}

function addDockerfile(ppath, name) {
   if (!ppath) {
      console.log();
      console.error('Invalid project path');
      return;
   };
   const dockerfilePath = path.join(ppath, DEFAULT_ENVS.DOCKER_FILE_NAME);
   const dockerfileExists = fs.existsSync(dockerfilePath);
   if (dockerfileExists) {
      const msg = `Looks like ${DEFAULT_ENVS.DOCKER_FILE_NAME} already exists for project ${name}. Skipping Dockerfile creation.`;
      console.log();
      // console.info(msg);
      LOGGER.done(msg);
      return;
   }

   const dockerfile = `
      FROM node:16-alpine

      ARG NAME
      ARG TYPE
      ARG PORT
      ARG WORKDIR

      ENV \\
         *NAME=\${NAME:?error} \\
         *TYPE=\${TYPE:-main} \\
         *PORT=\${PORT:?\${NAME}_error} \\
         *WORKDIR=\${WORKDIR:?\${NAME}_error}
      
      WORKDIR \${WORKDIR}

      COPY . .

      RUN npm install

      CMD ["npm", "run", "start"]

      EXPOSE \${PORT}
   `
      .split('\n')
      .map(line => line.trim().replaceAll('*', '   '))
      .join('\n');

   fs.writeFileSync(dockerfilePath, dockerfile, {
      encoding: 'utf8',
      flag: 'w',
   });
}

function s(n = 1) {
   const arr = Array.from({
      length: n
   }, (_, i) => '  ');
   return arr.join('');
}

dockerize();