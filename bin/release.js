#!/usr/bin/env node

const exec = require('child-process-promise').exec;
const _ = require('lodash');
const Promise = require('bluebird');
const clipboardy = require('clipboardy');

console.log('releasing project...');
handleExec( exec('git status') )
.then( ( status ) => {
	if( _.find( status.split('\n'), item => {
		return /Changes (to be|not staged for) commit/.test(item) ? true : false
	} ) ){
		throw new Error('You must commit all your changes before releasing');
	}

	const releaseType = process.argv[2] || 'patch';
	console.log( `creating '${releaseType}' release...`);
	
	handleExec( exec(`npm version ${releaseType}`) )
	.then( data => {
		const version = /v([0-9]+\.[0-9]+\.[0-9]+)/.exec( data )[1];
		console.log(`tagging release '${version}'...`);
		return handleExec( exec(`git tag ${version}`) )
		.then( data => {
			console.log('pushing release to Github...');
			Promise.mapSeries( [
				() => handleExec( exec(`git push origin`) ),
				() => handleExec( exec(`git push origin --tags`) )
			], ( func ) => func() )
			.then( data => {
				handleExec( exec(`git remote -v`) )
				.then( info => {
					const origin = info.split('\n')[0];
					const [match,team,repo] = /([a-zA-Z0-9\-_]+)\/([a-zA-Z0-9\-_]+).git/.exec( origin );
					const teamId = _.replace(_.lowerCase(team),' ','');
					const pckg = require('../package.json');
					const cmdInstallAndUpdate = `yarn add ${team}/${repo}#${version}`;
					
					console.log('\nupdate your dependencies...\n');
					console.log( `${cmdInstallAndUpdate}\n\n-or-...\n` );
					console.log( `copy paste from the clipboard...\n\n` );
					//add the last option to clipboard
					clipboardy.writeSync(cmdInstallAndUpdate);
				} );
	
			} )
		} )
	} );
})
.catch( err => console.error( err.message ) );


function handleExec( promise ){
	return promise.then( data => data.stdout.toString() )
}
