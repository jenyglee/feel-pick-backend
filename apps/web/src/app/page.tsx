export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-title1 text-foreground">Feel Pick</h1>
      <p className="text-body1 text-foreground-muted">픽을 만들고 투표하는 앱</p>
      <a
        href="/style-guide"
        className="text-body1 text-primary underline underline-offset-4"
      >
        스타일 가이드 보기 →
      </a>
    </main>
  );
}
