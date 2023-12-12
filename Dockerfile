FROM node:21-alpine

ENV NODE_ENV=development

WORKDIR /app

COPY . /app

RUN npm install --silent

