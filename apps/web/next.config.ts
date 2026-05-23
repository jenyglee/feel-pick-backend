import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Docker용 최소 실행 번들 출력(.next/standalone). 운영 이미지를 가볍게.
  output: 'standalone',
  // 모노레포: 의존성 추적 기준을 레포 루트로 (루트 node_modules까지 포함).
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
