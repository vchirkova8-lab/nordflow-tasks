# NordFlow Tasks — статический сайт, обслуживается nginx
FROM nginx:alpine

COPY . /usr/share/nginx/html

EXPOSE 80
