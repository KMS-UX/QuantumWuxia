#!/usr/bin/env node

/**
 * Realm of Echoes - Quick Start Script
 * 
 * This script helps you get started with the game quickly.
 * It checks for dependencies, builds the project, and starts the server.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const __dirname = import.meta.url.replace('file://', '').replace(/\/[^/]*$/, '');

console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ⚔️  Realm of Echoes - AI Text RPG                       ║
║   Quick Start Script                                       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

// Check if node_modules exists
if (!existsSync(join(__dirname, 'node_modules'))) {
  console.log('📦 Installing dependencies...\n');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    console.log('\n✅ Dependencies installed successfully!\n');
  } catch (error) {
    console.error('\n❌ Failed to install dependencies. Please run "npm install" manually.\n');
    process.exit(1);
  }
}

// Check if dist exists
if (!existsSync(join(__dirname, 'dist'))) {
  console.log('🔨 Building the project...\n');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
    console.log('\n✅ Build completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Failed to build the project. Please run "npm run build" manually.\n');
    process.exit(1);
  }
}

// Start the server
console.log('🚀 Starting the server...\n');
try {
  execSync('node server.js', { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.error('\n❌ Failed to start the server.\n');
  process.exit(1);
}
