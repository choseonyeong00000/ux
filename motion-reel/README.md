# Motion Reel (15s)

`motion-reel.mp4` — 1920×1080, 60fps, 15초, H.264 + AAC.

모든 프레임은 `index.html`의 Canvas 2D 코드가 시간 `t`의 순수 함수로 그립니다(프레임당 4개 서브샘플로 모션 블러). 사운드트랙은 `audio.mjs`가 합성합니다(120 BPM, 컷과 동기화).

```
npm install        # Pretendard 폰트
npm run build      # build/audio.wav + build/motion-reel.mp4
```

렌더링에는 Playwright(Chromium), ffmpeg, Inter Display 폰트가 필요합니다. `index.html`을 브라우저에서 직접 열면 실시간 미리보기가 재생됩니다.
