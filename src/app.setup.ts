import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * API 동작에 영향을 주는 공통 앱 설정(보안 헤더 / 입력 검증 / 에러 표준화).
 * main.ts와 e2e 테스트가 같은 설정을 쓰도록 한 곳으로 모은다.
 */
export function configureApp(app: INestApplication): void {
  // 보안 HTTP 헤더 자동 추가. Swagger UI는 인라인 스크립트/스타일을 쓰므로
  // CSP에 'unsafe-inline'을 허용해 /docs가 깨지지 않게 한다.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https://validator.swagger.io'],
        },
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
}
