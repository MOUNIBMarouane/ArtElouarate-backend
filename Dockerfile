FROM node:18-alpine

WORKDIR /app

# Install root dependencies first
COPY package*.json ./
RUN npm install

# Copy all source code
COPY . .

# Install backend dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install

# Go back to root
WORKDIR /app

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the backend server
CMD ["npm", "start"]