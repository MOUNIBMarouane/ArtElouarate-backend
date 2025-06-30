import { spawn } from 'child_process';
import path from 'path';

console.log('🎨 ELOUARATE ART - Full Stack Application');
console.log('═'.repeat(50));
console.log('🚀 Starting Backend API server...');
console.log('🎨 Starting Frontend React app...');
console.log('─'.repeat(50));

// Start Backend
const backend = spawn('npm', ['run', 'dev'], { 
  cwd: path.join(process.cwd(), 'backend'),
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true 
});

backend.stdout.on('data', (data) => {
  console.log(`[BACKEND] ${data.toString().trim()}`);
});

backend.stderr.on('data', (data) => {
  console.log(`[BACKEND ERROR] ${data.toString().trim()}`);
});

// Wait 3 seconds before starting frontend
setTimeout(() => {
  console.log('\n🎨 Starting Frontend...\n');
  
  const frontend = spawn('npm', ['run', 'dev'], { 
    cwd: path.join(process.cwd(), 'Frontend'),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true 
  });

  frontend.stdout.on('data', (data) => {
    console.log(`[FRONTEND] ${data.toString().trim()}`);
  });

  frontend.stderr.on('data', (data) => {
    console.log(`[FRONTEND ERROR] ${data.toString().trim()}`);
  });

  frontend.on('close', (code) => {
    console.log(`Frontend exited with code ${code}`);
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down all servers...');
    frontend.kill();
    backend.kill();
    process.exit();
  });

}, 3000);

backend.on('close', (code) => {
  console.log(`Backend exited with code ${code}`);
});

console.log('\n📍 Application URLs:');
console.log('   Frontend: http://localhost:8080');
console.log('   Backend:  http://localhost:3000');
console.log('   API:      http://localhost:3000/api');
console.log('\n⚡ Press Ctrl+C to stop all servers');
console.log('─'.repeat(50)); 