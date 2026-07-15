FROM node:24-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
ENV NODE_ENV=development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# FROM base AS production
# RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
# RUN npm ci --omit=dev
# ENV NODE_ENV=production
# COPY --chown=nodejs:nodejs . .
# RUN npm run build
# USER nodejs
# EXPOSE 3000
# CMD ["npm", "start"]


# --- NEW BUILDER STAGE ---
FROM base AS builder
# Install ALL dependencies (including devDependencies like typescript)
RUN npm ci
COPY . .
# Build the project (runs tsc)
RUN npm run build

FROM base AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
# Now install ONLY production dependencies for the final image
RUN npm ci --omit=dev
ENV NODE_ENV=production

# Copy the compiled output from the builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

USER nodejs
EXPOSE 3000
CMD ["npm", "start"]