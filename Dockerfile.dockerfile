# Use an official Node LTS image
FROM node:18-bullseye

# Install LibreOffice (headless mode)
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    libreoffice-java-common \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Expose your server port (usually 5000)
EXPOSE 5000

# Start server
CMD ["npm", "start"]
