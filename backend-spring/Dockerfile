FROM maven:3.9.16-eclipse-temurin-21-alpine AS builder

WORKDIR /workspace

COPY pom.xml ./
RUN mvn --batch-mode --no-transfer-progress dependency:go-offline

COPY src ./src
RUN mvn --batch-mode --no-transfer-progress clean package

FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S churchone && adduser -S churchone -G churchone

WORKDIR /app

COPY --from=builder /workspace/target/churchone-spring-backend-0.0.1-SNAPSHOT.jar app.jar

ENV JAVA_TOOL_OPTIONS="-Xms32m -Xmx96m -XX:MaxMetaspaceSize=64m -XX:ReservedCodeCacheSize=24m -XX:MaxDirectMemorySize=12m -Xss256k -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError"
ENV PORT=8080

EXPOSE 8080

USER churchone

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/actuator/health" >/dev/null || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
