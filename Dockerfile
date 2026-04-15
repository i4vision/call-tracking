# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend and serve the application
FROM node:20-alpine
WORKDIR /app

# Copy backend dependencies and install
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend to backend's public directory so Express can serve it
COPY --from=frontend-builder /app/frontend/dist ./backend/public

WORKDIR /app/backend

EXPOSE 8080
CMD ["npm", "start"]
