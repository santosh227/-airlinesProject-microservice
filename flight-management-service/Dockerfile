FROM node:18-alpine

# Fix: Use clean path without spaces
WORKDIR /app/flight-management-service

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy all source code (including src folder)
COPY . ./

# Expose port
EXPOSE 3000

# Fix: Point to correct file location
CMD ["node", "src/index.js"]
