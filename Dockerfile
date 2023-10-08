# BUILD STAGE
FROM node:18-alpine as build

WORKDIR /app

# Fetch dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy application source
COPY . ./

# Build application
RUN yarn build

# RUN STAGE
FROM node:18-alpine as run

WORKDIR /app

# Copy build source
COPY --from=build /app/built ./built

# Fetch runtime dependencies
COPY package.json yarn.lock ./
RUN yarn install --production

# Start application
CMD yarn start