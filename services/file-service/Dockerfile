FROM node:22-alpine

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install
RUN pnpm build


EXPOSE 8085

CMD [ "pnpm", "start" ]