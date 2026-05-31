#!/usr/bin/env node

import { UxReviewServer } from './server.js';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: ux-review-mcp [--debug] [--help]');
  console.log('');
  console.log('Options:');
  console.log('  --debug    Enable debug logging to stderr');
  console.log('  --help     Show this help message');
  process.exit(0);
}

if (args.includes('--version')) {
  console.log('0.1.0');
  process.exit(0);
}

const hasDebugFlag = args.includes('--debug');

const server = new UxReviewServer(hasDebugFlag);
server.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
