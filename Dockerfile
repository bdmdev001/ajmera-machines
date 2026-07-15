# Stage 1: Build the Next.js application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
# Set NODE_ENV to production for optimized build
ENV NODE_ENV=production

# You can provide dummy ENV variables for the build process if your Next.js config or pages require them at build time
ENV MONGODB_URI=""

RUN npm run build

# Stage 2: Run the production application
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# The DB credentials and other environment variables can be overridden at runtime
# Examples: 
# docker run --env MONGODB_URI="mongodb+srv://user:pass@cluster..." my-next-app
ENV MONGODB_URI=""
ENV CLOUDINARY_CLOUD_NAME=""
ENV CLOUDINARY_API_KEY=""
ENV CLOUDINARY_API_SECRET=""

# Copy files necessary for running the Next.js application
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# Note: if you have next.config.ts / next.config.js, it might be required depending on Next.js setup.
COPY --from=builder /app/next.config.ts ./next.config.ts

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
