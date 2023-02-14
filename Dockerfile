FROM base-migrate-nexus-to-artifacts:alpine
LABEL maintainer "Gladson Bruno <gladsonbruno16@gmail.com>"

COPY ./ /home/codigo
WORKDIR /home/codigo

RUN touch .env

RUN npm install

RUN npm run build

ENV NUGET_PATH=/usr/local/bin/nuget.exe

CMD [ "npm", "run", "start:production" ]