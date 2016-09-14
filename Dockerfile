FROM node:6

EXPOSE 80

WORKDIR /app

COPY . /app/

RUN npm install --production

CMD npm start
