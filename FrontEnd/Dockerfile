# Dockerfile frontend
# Etapa de construcción
FROM node:20 as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build --prod

# Etapa de producción (servidor ligero)
FROM nginx:alpine
COPY --from=build /app/dist/<FrontEnd> /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
