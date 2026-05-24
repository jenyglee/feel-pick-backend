import { ApiProperty } from '@nestjs/swagger';

// 초이스 카드에 표시되는 유저 프로필 (응답 전용 형태).
export default class Profile {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: '하리니' })
  displayName: string;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'https://i.pravatar.cc/600?img=5',
  })
  photoUrl: string | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 17,
    description: '나와의 거리(km, 목업)',
  })
  distanceKm: number | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: '@hx_rxx_ 맞팔도 받아용!',
  })
  bio: string | null;

  @ApiProperty({ type: [String], example: ['홍대', '스티커 사진', '닌텐도'] })
  interests: string[];
}
