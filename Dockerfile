FROM node:12

# Change working directory
WORKDIR "/app"

# Update packages and install dependency packages for services
RUN apt-get update \
  && apt-get dist-upgrade -y \
  && apt-get install -y ffmpeg \ 
  && apt-get install vim -y \ 
  && apt-get install -y wget \
  && apt-get install -y inkscape fontconfig \
  && apt-get install -y fonts-liberation \
  && apt-get install -y unzip \  
  && apt-get clean \
   && echo 'Finished installing dependencies'

# https://github.com/cypress-io/cypress-docker-images/issues/109
RUN apt-get -qqy update \ 
  && apt-get -qqy --no-install-recommends install fonts-wqy-zenhei \ 
  && rm -rf /var/lib/apt/lists/* \ 
  && apt-get -qyy clean

# Copy package.json and package-lock.json
COPY package*.json ./

# Install npm production packages 
RUN npm install --productiona

COPY . /app


RUN fc-cache -fv

ENV NODE_ENV production
ENV PORT 3000

# enable chinese font
ENV LANG C.UTF-8


EXPOSE 3000

# USER node

CMD ["npm", "start"]
