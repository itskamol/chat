FROM node:22-alpine

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install
RUN pnpm build

COPY . .

EXPOSE 8082

CMD [ "pnpm", "start" ]