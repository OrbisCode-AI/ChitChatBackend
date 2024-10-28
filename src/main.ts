import "../src/utils/instrument";

import { writeFileSync } from "node:fs";
import path from "node:path";

import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as yaml from "yaml";

import { AppModule } from "@/app/app.module";

import { initializeClients } from "./utils/models";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  initializeClients(app.get(ConfigService));

  app.setGlobalPrefix("api");
  const configService = app.get(ConfigService);
  const port = configService.get<string>("PORT", "4432");

  const config = new DocumentBuilder()
    .setTitle("ChitChat Microservice")
    .setDescription(
      "This is the ChitChat microservice which is responsible for the AI chat functionality.",
    )
    .setVersion("1.0")
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, documentFactory);

  const fastifyInstance = app.getHttpAdapter().getInstance();

  fastifyInstance.get("/docs/swagger.json", (request, reply) => {
    const document = documentFactory();
    void reply.send(document);
  });

  // Register redoc as a static asset
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-var-requires
  await fastifyInstance.register(require("@fastify/static"), {
    root: path.join(__dirname, "node_modules/redoc/bundles"),
    prefix: "/docs/assets/",
  });

  // Serve redoc HTML
  fastifyInstance.get("/docs", (request, reply) => {
    // const document = documentFactory();
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>LLM Microservice API Documentation</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
        <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"> </script>
      </head>
      <body>
        <redoc spec-url="/docs/swagger.json"></redoc>
        <script>
          // Initialize Redoc after the element is available
          document.addEventListener('DOMContentLoaded', () => {
            Redoc.init(
              "/docs/swagger.json",
              {
                hideDownloadButton: false,
                expandResponses: "200,201",
                requiredPropsFirst: true,
                sortPropsAlphabetically: true,
                nativeScrollbars: true,
                pathInMiddlePanel: true,
                hideHostname: false,
                expandSingleSchemaField: true,
                jsonSampleExpandLevel: 3,
                showExtensions: true,
                noAutoAuth: false,
                theme: ${JSON.stringify({
                  colors: {
                    primary: {
                      main: "#2d5bb9",
                      light: "#4d7bd3",
                      dark: "#1a3c80",
                      contrastText: "#ffffff",
                    },
                    success: {
                      main: "#2e7d32",
                      light: "#4caf50",
                      dark: "#1b5e20",
                    },
                    error: {
                      main: "#d32f2f",
                      light: "#ef5350",
                      dark: "#c62828",
                    },
                    warning: {
                      main: "#ed6c02",
                      light: "#ff9800",
                      dark: "#e65100",
                    },
                    text: {
                      primary: "#333333",
                      secondary: "#666666",
                    },
                    border: {
                      dark: "#e0e0e0",
                      light: "#f5f5f5",
                    },
                    responses: {
                      success: "#e8f5e9",
                      error: "#ffebee",
                      redirect: "#fff3e0",
                      info: "#e3f2fd",
                    },
                  },
                  typography: {
                    fontSize: "16px",
                    lineHeight: "1.6",
                    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                    headings: {
                      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                      fontWeight: "600",
                      lineHeight: "1.3",
                    },
                    code: {
                      fontSize: "14px",
                      fontFamily: "Source Code Pro, Monaco, monospace",
                      lineHeight: "1.4",
                      fontWeight: "400",
                    },
                    links: {
                      color: "#2d5bb9",
                      visited: "#1a3c80",
                      hover: "#4d7bd3",
                    },
                  },
                  sidebar: {
                    backgroundColor: "#ffffff",
                    textColor: "#333333",
                    activeTextColor: "#2d5bb9",
                    width: "300px",
                    groupItems: {
                      textTransform: "uppercase",
                      fontWeight: "600",
                    },
                  },
                  rightPanel: {
                    backgroundColor: "#1f2937",
                    width: "45%",
                    textColor: "#ffffff",
                    boxShadow: "-10px 0 20px rgba(0,0,0,0.1)",
                  },
                  schema: {
                    nestedBackground: "#f8f9fa",
                    typeNameColor: "#5c6bc0",
                    typeTitleColor: "#333333",
                    requireLabelColor: "#d32f2f",
                    labelsTextSize: "0.9em",
                    arrowSize: "1.2em",
                  },
                  spacing: {
                    unit: 5,
                    sectionVertical: 20,
                    sectionHorizontal: 30,
                  },
                })}
              }
            );
          });
        </script>
      </body>
    </html>`;
    void reply.type("text/html").send(html);
  });

  // Generate OpenAPI spec file
  try {
    const document = documentFactory();
    writeFileSync(
      "./openapi.yaml",
      yaml.stringify(document, undefined, 2), // Using standard stringify options to avoid YAMLException
    );
    Logger.log("OpenAPI specification generated: openapi.yaml");
  } catch (error) {
    Logger.error("Error while writing OpenAPI spec:", error);
  }

  await app.listen(port, "0.0.0.0");

  const logger = app.get(Logger);
  logger.log(`App is ready and listening on port ${port} 🚀`);
}

bootstrap().catch(handleError);

function handleError(error: unknown) {
  // eslint-disable-next-line no-console
  console.error(error);
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
}

process.on("uncaughtException", handleError);
