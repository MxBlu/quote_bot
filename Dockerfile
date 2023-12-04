# DEP STAGE
FROM node:18-alpine as deps

WORKDIR /app

# We need build tools if we need to build packages
RUN apk add --no-cache python3 make g++

# Fetch and install runtime dependencies
COPY package.json yarn.lock ./
RUN yarn install --production

###########################################

# BUILD STAGE
FROM node:18-alpine as build

WORKDIR /app

# We need build tools if we need to build packages
RUN apk add --no-cache python3 make g++

# Fetch runtime dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Then install dev dependencies on top of that
COPY package.json yarn.lock ./
RUN yarn install

# Copy application source
COPY . ./

# Build application
RUN yarn build

###########################################

# RUN STAGE
FROM node:18-alpine as run

WORKDIR /app

# Default ENV arguments for bot-framework level things
ENV LOG_LEVEL=INFO

ENV DISCORD_ERROR_LOGGING_ENABLED=false
ENV DISCORD_GENERAL_LOGGING_ENABLED=false

ENV DISCORD_REGISTER_COMMANDS=true
ENV DISCORD_REGISTER_COMMANDS_AS_GLOBAL=true

# Fetch runtime dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy build source
COPY --from=build /app/built ./built

# Default ENV arguments for application
ENV REACTION_HANDLING_DISABLED=false
ENV GRAPHQL_DEBUG=false
ENV GRAPHQL_PORT=4000
ENV REST_PORT=4001

EXPOSE 4000/tcp
EXPOSE 4001/tcp

# Start application
CMD yarn start