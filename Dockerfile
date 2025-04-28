FROM node:20-alpine

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY /src .

RUN yarn build

EXPOSE 5000

ENV HOSTNAME=0.0.0.0

CMD ["yarn", "start"]