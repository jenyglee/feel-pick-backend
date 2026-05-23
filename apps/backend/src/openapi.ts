import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';

/**
 * OpenAPI(Swagger) 스펙을 파일로 출력하는 스크립트.
 *
 * preview 모드로 앱을 만들면 프로바이더가 실제로 인스턴스화되지 않아
 * (DB 연결 등 부작용 없이) 라우트/스키마 메타데이터만 수집할 수 있다.
 * → packages/api-types가 이 파일을 읽어 프론트 타입을 생성한다.
 */
async function generateOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
  });

  const config = new DocumentBuilder()
    .setTitle('Feel Pick API')
    .setDescription('Pick & vote API')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  const outPath = resolve(process.argv[2] ?? 'openapi.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2));
  await app.close();
  console.log(`OpenAPI spec written to ${outPath}`);
}

void generateOpenApi();
