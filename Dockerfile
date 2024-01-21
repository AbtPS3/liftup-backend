FROM node:21-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY . /app

RUN npm install --silent

CMD [ "npx", "prisma", "generate" ]