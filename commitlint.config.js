module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // subject를 한국어로 작성하므로 대소문자 규칙은 비활성화
    'subject-case': [0],
    // header 길이는 한국어 기준 너무 빡빡할 수 있어 100자까지 허용
    'header-max-length': [2, 'always', 100],
  },
};
