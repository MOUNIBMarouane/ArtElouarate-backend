import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎨 ELOUARATE ART - Starting Application');
console.log('═'.repeat(60));

// Kill any existing processes on ports 3000 and 8080
const killPort = (port) => {
  return new Promise((resolve) => {
    const kill = spawn('npx', ['kill-port', port], { 
      stdio: 'inherit',
      shell: true 
    });
    
    kill.on('close', () => {
      console.log(`✅ Port ${port} cleared`);
      resolve();
    });
  });
};

const startBackend = () => {
  return new Promise((resolve) => {
    console.log('🚀 Starting Backend Server...');
    
    const backend = spawn('node', ['backend/server-clean.js'], {
      stdio: 'inherit',
      shell: true
    });
    
    backend.on('spawn', () => {
      console.log('✅ Backend server started on http://localhost:3000');
      setTimeout(resolve, 3000); // Give backend time to start
    });
    
    backend.on('error', (error) => {
      console.error('❌ Backend error:', error);
    });
  });
};

const startFrontend = () => {
  return new Promise((resolve) => {
    console.log('🚀 Starting Frontend Server...');
    
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'Frontend'),
      stdio: 'inherit',
      shell: true
    });
    
    frontend.on('spawn', () => {
      console.log('✅ Frontend server started');
      resolve();
    });
    
    frontend.on('error', (error) => {
      console.error('❌ Frontend error:', error);
    });
  });
};

const main = async () => {
  try {
    console.log('🧹 Cleaning ports...');
    await killPort(3000);
    await killPort(8080);
    await killPort(5173);
    
    console.log('🚀 Starting servers...');
    await startBackend();
    await startFrontend();
    
    console.log('');
    console.log('🎉 ELOUARATE ART - Ready!');
    console.log('═'.repeat(60));
    console.log('🌐 Frontend: http://localhost:8080');
    console.log('🔧 Backend API: http://localhost:3000');
    console.log('🔐 Admin Login: http://localhost:8080/admin/login');
    console.log('');
    console.log('📧 Default Admin: admin@elouarate.com');
    console.log('🔒 Password: Admin123!');
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
};

main(); 