import * as dotenv from 'dotenv';

// 각 테스트 파일이 앱을 부팅하기 전에 .env.test를 로드한다.
// 이미 설정된 env는 덮지 않으므로 CI에서는 CI가 주입한 값이 우선한다.
dotenv.config({ path: '.env.test' });
