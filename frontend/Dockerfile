# Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Servido por nginx, que ademas hace de proxy hacia el backend: un solo origen para el
# navegador, sin CORS y sin URLs absolutas compiladas en el bundle.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
