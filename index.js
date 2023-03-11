const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const {
   exec
} = require('node:child_process');
const dotenv = require('dotenv');

const cwd = process.cwd(); // For NPM package!

////////////////////////////////////////
////////////////////////////////////////

const PROJECTS_DIR = '.';

const DOCKER_ENV_FILE = 'docker.env';

const DOCKER_COMPOSE_ENV_FILE = 'docker-compose.env';

const DEFAULT_ENVS = {
   COMPOSE_PROJECT_NAME: 'kevsong', // For `--project-name` option.
   COMPOSE_FILE: './docker-compose.yml', // For `--file` option.
}

const IGNORE_FOLDERS = [
   'node_modules',
   'nginx',
];

////////////////////////////////////////
////////////////////////////////////////

async function dockerize() {
   try {
      //>> Detect all files in current (project) directory <<//
      // const files = await fsp.readdir(path.join(__dirname, PROJECTS_DIR), {
      const files = await fsp.readdir(path.join(cwd, PROJECTS_DIR), {
         encoding: 'utf8',
         withFileTypes: true
      });

      //>> Filter out directory <<//
      const projectDirs = files.filter(file => {
         return !file.name.startsWith('.') && file.isDirectory() && !IGNORE_FOLDERS.includes(file.name) && !file.name.startsWith('_');
      });

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
         // const projectPath = path.join(__dirname, projectDir);
         const projectPath = path.join(cwd, projectDir);
         const envFilePath = path.join(projectPath, DOCKER_ENV_FILE);
         const envContent = fs.readFileSync(envFilePath, {
            encoding: 'utf8'
         });
         const envParsed = dotenv.parse(envContent);

         const NAME = envParsed.NAME?.toUpperCase();
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

         // console.log({ envParsed, replicas, NAME });

         for (const prop in envParsed) {
            const propName = prop.toUpperCase();
            const value = envParsed[prop];
            dockerEnv += `${propName}_${NAME}="${value}"\n`;
         }

         dockerEnv += '\n';
      });

      //>> Create new docker-compose.env file <<//
      // const dockerEnvPath = path.join(__dirname, DOCKER_COMPOSE_ENV_FILE);
      const dockerEnvPath = path.join(cwd, DOCKER_COMPOSE_ENV_FILE);
      await fsp.writeFile(dockerEnvPath, dockerEnv, {
         encoding: 'utf8'
      });



   } catch (error) {
      throw new Error(error);
   }
}

dockerize();