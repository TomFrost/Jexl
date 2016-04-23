const path = require('path')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const mod = require('module')
global.should = chai.should()
chai.use(chaiAsPromised)

// Allow require relative to root
process.env.NODE_PATH = path.join(__dirname, '..') + path.delimiter + (process.env.NODE_PATH || '')
mod._initPaths()

