FROM node:18-alpine as builder

WORKDIR /app

COPY apps/dashboard/package*.json ./
RUN npm install

COPY apps/dashboard/ .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
