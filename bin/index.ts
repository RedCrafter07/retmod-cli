#!/usr/bin/env node

/* 
88""Yb  dP"Yb  888888P     8888b.  888888 Yb    dP 
88__dP dP   Yb     dP       8I  Yb 88__    Yb  dP  
88"Yb  Yb   dP    dP   .o.  8I  dY 88""     YbdP   
88  Yb  YbodP    dP    `"' 8888Y"  888888    YP    
*/

import figlet from 'figlet';
import gradient from 'gradient-string';
import inquirer from 'inquirer';
import { createSpinner } from 'nanospinner';
// import { spawn } from 'child_process';
import spawn from 'cross-spawn';
import chalk from 'chalk';
import {
	existsSync,
	readFileSync,
	renameSync,
	unlinkSync,
	writeFileSync,
} from 'fs';
import open from 'open';
import { SpawnOptions } from 'child_process';
import axios from 'axios';

const timer = (time: number) =>
	new Promise((resolve) => setTimeout(resolve, time));

const defaultConfig = {
	directories: {
		client: 'client',
		server: 'server',
	},
	commandBridge: true,
};

const defaultScripts = {
	dev: 'concurrently "pnpm dev:client" "pnpm dev:server"',
	'dev:client': 'cd {{CLIENTDIR}} && pnpm dev',
	'dev:server': 'cd {{SERVERDIR}} && pnpm dev',
	'i-all': 'pnpm -r i',
	build: 'pnpm build:server && pnpm build:client',
	'build:server': 'cd {{SERVERDIR}} && pnpm build',
	'build:client': 'cd {{CLIENTDIR}} && pnpm build',
	start: 'cd {{SERVERDIR}} && pnpm start',
};

const spawnSync = (command: string, args: string[], opts: SpawnOptions) =>
	new Promise<void>((resolve) => {
		const cmd = spawn(command, args, opts);

		cmd.on('close', () => resolve());
	});

(async () => {
	console.log(
		gradient('#ff3434', '#ffcc00')(await figlet.textSync('RETMOD', '3-D')),
	);
	console.log(`\nWelcome to ${gradient('#ff3434', '#ffcc00')('Retmod')}!`);

	const args = process.argv.slice(2);

	let action = args[0];

	if (!action) {
		const answer = await inquirer.prompt([
			{
				type: 'list',
				name: 'action',
				message: 'What do you want to do?',
				choices: [
					{ name: 'General', type: 'separator' },
					{ name: 'Show help ❓', value: 'help' },
					{ name: 'Exit 🚪', value: 'exit' },
					{ name: 'Project', type: 'separator' },
					{ name: 'Create a new project ➕', value: 'create' },
					{ name: 'Initialize config ✒️', value: 'init' },
					{
						name: 'Initialize scripts 📒',
						value: 'init-scripts',
					},
					/* {
						name: 'Update retmod',
						value: 'update',
					}, */
				],
			},
		]);

		action = answer.action;
	}

	switch (action) {
		default:
			console.log(`Action ${action} not found.`);
			break;
		case 'update':
			{
				console.log('Soon™️');
				break;
				console.log(
					chalk.yellowBright(
						'Updating will add an upstream remote. Please confirm below.',
					),
				);

				console.log(
					`${chalk.red('[!]')} ${chalk.yellow(
						'This will overwrite the current upstream remote, if added.',
					)}`,
				);

				const { proceed } = await inquirer.prompt([
					{
						name: 'proceed',
						type: 'confirm',
						message: 'Proceed?',
					},
				]);

				if (!proceed) {
					console.log('Bye!');
					return;
				}

				const spinner = createSpinner('Adding git remote...');

				spinner.start();

				await spawnSync(
					'git',
					[
						'remote',
						'add',
						'upstream',
						'https://github.com/RedCrafter07/retmod.git',
					],
					{},
				);

				spinner.success();

				spinner.start({
					text: 'Getting directory names from config...',
				});

				const config: typeof defaultConfig = JSON.parse(
					await readFileSync('./retmod.config.json').toString(),
				);

				const client = config.directories.client;
				const server = config.directories.server;

				spinner.success();

				spinner.start({
					text: 'Renaming directories...',
				});

				await renameSync(`./${client}`, `./client`);
				await renameSync(`./${server}`, `./server`);

				spinner.success();

				spinner.start({
					text: 'Pulling...',
				});

				await spawnSync('git', ['pull', 'upstream', 'main'], {});

				spinner.success();

				spinner.start({
					text: 'Renaming directories back...',
				});

				await renameSync(`./client`, `./${client}`);
				await renameSync(`./server`, `./${server}`);

				spinner.success({
					text: 'Updated successfully!',
				});
			}
			break;
		case 'init-scripts':
			{
				await initScripts(true);
			}
			break;
		case 'exit':
			process.exit(0);
		case 'create':
			{
				const templateSpinner = createSpinner('Fetching templates...');

				const templateData = await axios.get(
					'https://raw.githubusercontent.com/Retmod/templates/main/templates.json',
				);

				const templates: {
					name: string;
					url: string;
				}[] = templateData.data.templates;

				templateSpinner.success({ text: 'Templates fetched successfully!' });

				const { name, serverDir, clientDir, repo, template } =
					await inquirer.prompt([
						{
							name: 'name',
							type: 'input',
							message: "What's the name of your project?",
							default: 'retmod-project',
						},
						{
							name: 'serverDir',
							type: 'input',
							message: "What's the name of your server directory?",
							default: 'server',
						},
						{
							name: 'clientDir',
							type: 'input',
							message: "What's the name of your client directory?",
							default: 'client',
						},
						{
							name: 'repo',
							type: 'input',
							message:
								"What's the URL of your repository? (Not a template but the repo which you will use retmod on)",
							default: 'https://github.com/RedCrafter07/my-new-retmod-repo.git',
						},
						{
							name: 'template',
							type: 'list',
							message: 'Which template do you want to use?',
							choices: templates.map(({ name, url }) => ({
								name,
								value: url,
							})),
							default: 'default',
						},
					]);

				const givenDirectoryExists = await existsSync(`./${name}`);

				if (givenDirectoryExists) {
					console.log(
						chalk.red(
							`Directory ${name} already exists. Please choose another name.`,
						),
					);
					return;
				}

				const spinner = await createSpinner('Cloning from Github...');
				spinner.start();

				const gitClone = spawn('git', ['clone', template, name]);

				gitClone.on('close', async () => {
					spinner.success({ text: 'Cloning completed!' });

					await swapRepo(repo, `./${name}`);

					const configSpinner = createSpinner('Initializing config...');
					configSpinner.start();

					const newConfig = defaultConfig;

					newConfig.directories.server = serverDir;
					newConfig.directories.client = clientDir;

					await writeFileSync(
						`./${name}/retmod.config.json`,
						JSON.stringify(newConfig, null, 2),
					);

					configSpinner.success({ text: 'Config initialized!' });

					const scriptsSpinner = createSpinner('Initializing scripts...');
					scriptsSpinner.start();

					await initScripts(false, `./${name}`);

					scriptsSpinner.success({ text: 'Scripts initialized!' });

					const renameSpinner = createSpinner('Renaming directories...');
					renameSpinner.start();

					await renameSync(`./${name}/client`, `./${name}/${clientDir}`);
					await renameSync(`./${name}/server`, `./${name}/${serverDir}`);

					renameSpinner.success({ text: 'Renaming completed!' });

					const installSpinner = createSpinner('Installing dependencies...');

					installSpinner.start();

					const installing = spawn('pnpm', ['i', '-r'], {
						cwd: `./${name}`,
					});

					installing.on('close', async () => {
						installSpinner.success({ text: 'Dependencies installed!' });
						console.log(
							chalk.green(`\nProject "${name}" created successfully!\n`),
						);
						console.log();
						console.log('To get started, cd into your directory:');
						console.log(chalk.cyan(`cd ${name}`));
						console.log('Then, run the dev process:');
						console.log(chalk.cyan('pnpm dev'));
						console.log('\nHave fun programming!');
					});
				});
			}
			break;
		case 'init':
			{
				const spinner = await createSpinner('Initializing config...');

				await spinner.start();

				const exists = await existsSync('./retmod.config.json');
				if (exists) {
					spinner.error({ text: 'Config already exists!' });
					return;
				}

				await writeFileSync(
					'./retmod.config.json',
					JSON.stringify(defaultConfig, null, 2),
				);

				await spinner.success({ text: 'Config initialized!' });
			}
			break;
		case 'help':
			{
				const { page } = await inquirer.prompt([
					{
						type: 'list',
						name: 'page',
						message: 'What do you want to learn?',
						choices: [
							{ name: 'Getting started', value: 'start' },
							{ name: 'Command Line Arguments', value: 'args' },
							{
								name: 'Github Repository with information and more',
								value: 'github',
							},
							{ name: 'Exit', value: 'exit' },
						],
					},
				]);
				switch (page) {
					case 'args':
						{
							const spinner = createSpinner('Opening Wiki on Github...');

							spinner.start();

							await open('https://github.com/RedCrafter07/retmod-cli/wiki', {
								wait: true,
							});

							spinner.success({ text: 'Wiki opened!' });
						}
						break;
					case 'github':
						{
							const spinner = createSpinner('Opening Github Repository...');

							spinner.start();

							await open('https://github.com/RedCrafter07/retmod');

							spinner.success({ text: 'Github Repository opened!' });
						}
						break;
					case 'start':
						console.log(
							`Getting started with ${gradient(
								'#ff3434',
								'#ffcc00',
							)('Retmod')}`,
						);
						console.log('-'.repeat(50));
						console.log(
							'Retmod is very simple to set up. Just run the cli and choose "Create a new project". \nFrom there, everything else is self explanatory.',
						);
						break;
				}
			}
			break;
	}
})();

async function swapRepo(url: string, cwd = '.', remote = 'origin') {
	return new Promise<void>((resolve) => {
		const spinner = createSpinner('Changing remote...');

		spinner.start();

		const git = spawn('git', ['remote', 'set-url', remote, url], {
			cwd,
		});

		git.on('close', async () => {
			spinner.success({ text: 'Remote changed!' });
			resolve();
		});
	});
}

async function initScripts(enableRevert: boolean, cwd = '.') {
	let spinner = createSpinner('Checking for config...');
	const configExists = await existsSync(`${cwd}/retmod.config.json`);

	if (!configExists) {
		spinner.error({ text: 'Config not found :/' });
		return;
	}

	spinner.success({ text: 'Config found!' });

	spinner = createSpinner('Checking directories...');

	spinner.start();

	const config: typeof defaultConfig = JSON.parse(
		await readFileSync(`${cwd}/retmod.config.json`).toString(),
	);

	if (!config.directories.client || !config.directories.server) {
		spinner.error({ text: 'Directories are not defined in the config!' });
		return;
	}

	spinner.success({ text: 'Directories found!' });

	spinner = createSpinner('Fetching package.json content...');

	spinner.start();

	const packageJsonExists = await existsSync(`${cwd}/package.json`);

	if (!packageJsonExists) {
		spinner.error({ text: 'package.json not found!' });
		return;
	}

	const packageJson: { scripts: Record<string, string> } = JSON.parse(
		await readFileSync(`${cwd}/package.json`).toString(),
	);

	spinner.success({ text: 'package.json fetched!' });

	spinner = createSpinner('Backing up existing scripts...');

	spinner.start();

	const backupExists = await existsSync(`${cwd}/package.json.bak`);

	if (backupExists) {
		spinner.error({ text: 'Backup already exists!' });
		return;
	}

	writeFileSync(
		`${cwd}/package.json.bak`,
		JSON.stringify(packageJson, null, 2),
	);

	spinner.success({ text: 'Backup created!' });

	spinner = createSpinner('Merging scripts...');

	spinner.start();

	const newScripts = defaultScripts;

	Object.keys(newScripts).forEach((key) => {
		const k = key as keyof typeof newScripts;
		newScripts[k] = newScripts[k]
			.replace(/{{CLIENTDIR}}/g, config.directories.client)
			.replace(/{{SERVERDIR}}/g, config.directories.server);
	});

	const mergedScripts = {
		...(packageJson.scripts || {}),
		...newScripts,
	};

	packageJson.scripts = mergedScripts;

	spinner.success({ text: 'Scripts merged!' });

	spinner = createSpinner('Writing new package.json...');

	spinner.start();

	writeFileSync(`${cwd}/package.json`, JSON.stringify(packageJson, null, 2));

	spinner.success({ text: 'package.json written!' });

	spinner = createSpinner('Done!');
	spinner.success({ text: 'Done!' });

	if (enableRevert) {
		const { revert } = await inquirer.prompt([
			{
				name: 'revert',
				message: 'Do you want to revert the changes?',
				type: 'confirm',
				default: false,
			},
		]);

		if (revert) {
			spinner = createSpinner('Reverting changes...');

			spinner.start();

			const oldPackageJson = JSON.parse(
				await readFileSync(`${cwd}/package.json.bak`).toString(),
			);

			writeFileSync(
				`${cwd}/package.json`,
				JSON.stringify(oldPackageJson, null, 2),
			);
			spinner.success({ text: 'package.json written!' });
		}
	}

	spinner = createSpinner('Deleting backup...');

	await unlinkSync(`${cwd}/package.json.bak`);

	spinner.success({ text: 'Backup deleted!' });

	console.log(chalk.green('Scripts added successfully!'));
}
