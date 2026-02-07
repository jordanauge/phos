# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
# Using ci to ensure clean install from lockfile
# Ignoring scripts to speed up and avoid potential dev-script issues
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy default nginx config (optional, standard one usually works for simple static sites)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Start Nginx via entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
