FROM node:18-alpine

WORKDIR /usr/src/app

COPY user-service/package*.json ./

RUN npm install

COPY user-service .

RUN npm run build

EXPOSE 8081

CMD [ "npm", "start" ]