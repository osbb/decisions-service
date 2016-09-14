# Build
```
docker build -t osbb/voting-service . --no-cache
```

# Run
```
# production
docker run -d --hostname rabbitmq --name rabbitmq rabbitmq:3
docker run -d --link rabbitmq --name voting osbb/voting-service

# development
docker run -d --hostname rabbitmq --name rabbitmq -p 15672:15672 -p 5672:5672 rabbitmq:3-management
docker run -d --link rabbitmq --name voting osbb/voting-service
```
