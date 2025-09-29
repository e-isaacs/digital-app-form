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

# Copy required client utils (for backend routes)
RUN mkdir -p /app/client/src
COPY client/src/utils /app/client/src/utils

# Expose the server port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
