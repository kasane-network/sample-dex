#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.resolve(__dirname, '..')
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'artifacts', 'contracts')
const BUILD_DIR = path.join(ROOT_DIR, 'build')

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function walk(dirPath, files) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, files)
      continue
    }
    if (entry.name.endsWith('.dbg.json')) {
      continue
    }
    if (entry.name.endsWith('.json')) {
      files.push(fullPath)
    }
  }
}

function normalizeBytecode(bytecode) {
  if (!bytecode) {
    return '0x'
  }
  return bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`
}

function exportArtifacts() {
  ensureDir(BUILD_DIR)

  const files = []
  walk(ARTIFACTS_DIR, files)

  for (const artifactPath of files) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
    if (!artifact.contractName || !artifact.abi) {
      continue
    }

    const bytecode = normalizeBytecode(artifact.bytecode)
    const deployedBytecode = normalizeBytecode(artifact.deployedBytecode)

    const output = {
      contractName: artifact.contractName,
      abi: artifact.abi,
      bytecode,
      deployedBytecode,
      evm: {
        bytecode: { object: bytecode.replace(/^0x/, '') },
        deployedBytecode: { object: deployedBytecode.replace(/^0x/, '') }
      },
      metadata: artifact.metadata || ''
    }

    const outputPath = path.join(BUILD_DIR, `${artifact.contractName}.json`)
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
  }
}

exportArtifacts()
