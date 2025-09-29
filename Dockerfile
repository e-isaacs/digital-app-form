# Use Node LTS base
FROM node:18-bullseye

# Install LibreOffice
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    libreoffice-java-common \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy server package files and install deps
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install

# Copy the rest of the server code
COPY server/ .

COPY client/src/utils/countries.js ./client/src/utils/countries.js
COPY client/src/utils/nationalities.js ./client/src/utils/nationalities.js

# Expose the server port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
