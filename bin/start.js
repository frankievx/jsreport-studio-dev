#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var execSync = require('child_process').execSync
var yargs = require('yargs')

var argv = yargs.options({
  'run-only': {
    type: 'boolean',
    default: false
  },
  'entry-point': {
    type: 'string'
  }
}).argv

console.log('Checking if jsreport installed')

try {
  fs.statSync(path.join(process.cwd(), 'node_modules', 'jsreport'))
} catch (e) {
  console.log('Installing the latest jsreport, this takes few minutes')
  execSync('npm install jsreport --no-save', { stdio: [0, 1, 2] })
}

function tryRequire (module) {
  try {
    return fs.statSync(module)
  } catch (e) {
    return false
  }
}

function installStudio (p) {
  console.log('Installing jsreport-studio dev dependencies at ' + p)
  return execSync('npm install', { stdio: [0, 1, 2], cwd: p })
}

function installStudioIfRequired (p) {
  var packageJson
  try {
    packageJson = JSON.parse(fs.readFileSync(path.join(p, 'package.json'), 'utf8'))
  } catch (e) {
    return
  }

  for (var k in packageJson.devDependencies) {
    if (!tryRequire(path.join(p, 'node_modules', k))) {
      // somehow npm install failes on EBUSY error if this field is not deleted
      delete packageJson._requiredBy
      fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf8')
      return installStudio(p)
    }
  }
}

if (!argv.runOnly) {
  console.log('Making sure jsreport-studio has dev dependencies installed')
  installStudioIfRequired(path.join(process.cwd(), 'node_modules', 'jsreport', 'node_modules', 'jsreport-studio'))
  installStudioIfRequired(path.join(process.cwd(), 'node_modules', 'jsreport-studio'))
}

console.log('Starting ...')

if (!argv.runOnly) {
  process.env.NODE_ENV = 'jsreport-development'
}

if (!argv.entryPoint) {
  var currentExtension = null
  if (fs.existsSync(path.join(process.cwd(), 'jsreport.config.js'))) {
    currentExtension = require(path.join(process.cwd(), 'jsreport.config.js')).name
  }

  // define at startup what is the current extension,
  // so studio can concat this value with another configuration passed
  // to get all extensions configured in dev mode
  process.env.JSREPORT_CURRENT_EXTENSION = currentExtension

  var jsreport = require(path.join(process.cwd(), 'node_modules', 'jsreport'))
  jsreport({
    rootDirectory: process.cwd()
  }).init().catch(function (e) {
    console.error(e)
  })
} else {
  var entryPath = path.resolve(process.cwd(), argv.entryPoint)

  console.log('Using custom entry point at ' + entryPath)
  require(entryPath)
}
