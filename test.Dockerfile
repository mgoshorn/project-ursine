FROM node:16
COPY ./src ./src
COPY ./package.json ./
COPY ./package-lock.json ./
COPY ./jest.config.js ./
COPY ./tsconfig.json ./
COPY ./.env.example ./.env
RUN ["npm", "install"]
ENTRYPOINT ["npm", "test", "--", "--verbose", "--coverage"]