FROM node:18-alpine

WORKDIR /app/auth-service

COPY package*.json ./

RUN npm install --production

# Copy application source code
COPY . ./



# Expose the port your service runs on
EXPOSE 5001


# Start the application
CMD ["node", "src/index.js"]