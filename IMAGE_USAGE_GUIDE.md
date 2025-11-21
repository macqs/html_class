# 이미지 사용 가이드 (연수 참가자용)

## ✅ 권장: 외부 링크 사용

### 무료 이미지 호스팅 서비스
```html
<!-- 1. Unsplash (무료 고품질 이미지) -->
<img src="https://images.unsplash.com/photo-1..." alt="설명">

<!-- 2. Imgur (이미지 업로드 후 링크 복사) -->
<img src="https://i.imgur.com/abc123.jpg" alt="설명">

<!-- 3. GitHub (자신의 레포지토리) -->
<img src="https://raw.githubusercontent.com/사용자명/저장소/main/이미지.jpg" alt="설명">
```

**장점**:
- ✅ 코드 파일 크기가 작아짐
- ✅ 페이지 로딩 속도 빠름
- ✅ 언제든지 이미지만 교체 가능

---

## ⚠️ 주의: Base64 인코딩

### Base64 사용 시기
- 아주 작은 아이콘 (1-2KB)
- 네트워크 접속이 불안정한 환경
- 단일 파일로 완결되어야 하는 경우

### Base64 변환 방법
1. 온라인 도구: https://base64.guru/converter/encode/image
2. 이미지 업로드
3. 결과 복사

```html
<!-- 예시: 작은 아이콘 -->
<img src="data:image/png;base64,iVBORw0KGgoAAAANS..." alt="아이콘">
```

**단점**:
- ❌ 파일 크기 약 33% 증가
- ❌ 100x100 PNG (5KB) → Base64 (7KB)
- ❌ 1MB 이미지 → 1.3MB Base64 → **저장 경고 발생**

---

## 📏 코드 크기 제한

### 현재 설정
- **1MB 소프트 제한**: 경고 후 저장 가능
- **2MB 하드 제한**: 저장 불가

### 크기 예시
| 코드 내용 | 예상 크기 |
|----------|----------|
| 순수 HTML (500줄) | ~25KB ✅ |
| 순수 HTML (10,000줄) | ~500KB ✅ |
| Base64 이미지 1개 (100x100) | ~10KB ✅ |
| Base64 이미지 10개 (각 200x200) | ~500KB ✅ |
| Base64 이미지 1개 (1920x1080) | ~2-5MB ❌ |

---

## 🎯 실전 팁

### 1. 이미지 최적화
- **TinyPNG**: https://tinypng.com
- **Compressor.io**: https://compressor.io
- 품질 80%로 줄이면 파일 크기 50% 감소

### 2. 적절한 크기 사용
```html
<!-- ❌ 나쁨: 원본 4000x3000 사용 -->
<img src="huge-photo.jpg" width="300" alt="프로필">

<!-- ✅ 좋음: 300x300으로 리사이즈 후 사용 -->
<img src="profile-300x300.jpg" alt="프로필">
```

### 3. CSS 배경 대신 HTML img 사용
```html
<!-- ❌ Base64가 2배로 적용됨 -->
<style>
  .hero { background-image: url(data:image/png;base64,...); }
</style>
<div class="hero"></div>
<div class="hero"></div>

<!-- ✅ 한 번만 로드됨 -->
<img src="https://external-link.com/hero.jpg" alt="히어로">
```

---

## 🆘 저장 실패 시 대처법

### "코드가 너무 큽니다" 경고가 뜨면?

1. **이미지 확인**
   ```html
   <!-- Base64 이미지 찾기 -->
   <img src="data:image/..." 
   ```
   → 외부 링크로 교체

2. **불필요한 공백 제거**
   - 줄 바꿈 과다
   - 주석 제거

3. **여러 파일로 분리**
   - `page1.html`, `page2.html` 각각 저장
   - 링크로 연결

---

## 📞 도움 요청

저장이 안 되거나 이미지가 표시되지 않으면:
1. **도움 요청 버튼** 클릭
2. 강사님이 좌석 방문하여 도와드립니다

---

## 예제: 올바른 이미지 사용법

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>나의 포트폴리오</title>
  <style>
    .profile {
      width: 200px;
      border-radius: 50%;
    }
  </style>
</head>
<body>
  <h1>안녕하세요!</h1>
  
  <!-- ✅ 권장: 외부 링크 -->
  <img src="https://images.unsplash.com/photo-1..." 
       alt="프로필 사진" 
       class="profile">
  
  <p>저는 HTML을 배우고 있습니다.</p>
  
  <!-- ✅ 작은 아이콘만 Base64 -->
  <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYi..." 
       alt="아이콘" 
       width="16">
</body>
</html>
```

---

**요약**: 가능하면 **외부 링크**를 사용하세요! 🌐
