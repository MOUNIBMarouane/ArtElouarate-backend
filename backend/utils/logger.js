/**
 * Logger Utility
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function getTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, message, data = null) {
  const timestamp = getTimestamp();
  const baseMessage = `[${timestamp}] ${level}: ${message}`;
  
  if (data) {
    return `${baseMessage}\n${JSON.stringify(data, null, 2)}`;
  }
  
  return baseMessage;
}

class Logger {
  info(message, data = null) {
    const formattedMessage = formatMessage('INFO', message, data);
    console.log(`${colors.cyan}${formattedMessage}${colors.reset}`);
  }

  error(message, data = null) {
    const formattedMessage = formatMessage('ERROR', message, data);
    console.error(`${colors.red}${formattedMessage}${colors.reset}`);
  }

  warn(message, data = null) {
    const formattedMessage = formatMessage('WARN', message, data);
    console.warn(`${colors.yellow}${formattedMessage}${colors.reset}`);
  }

  success(message, data = null) {
    const formattedMessage = formatMessage('SUCCESS', message, data);
    console.log(`${colors.green}${formattedMessage}${colors.reset}`);
  }

  debug(message, data = null) {
    if (process.env.NODE_ENV !== 'production') {
      const formattedMessage = formatMessage('DEBUG', message, data);
      console.log(`${colors.gray}${formattedMessage}${colors.reset}`);
    }
  }
}

export const logger = new Logger();
