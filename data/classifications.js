/*
 * 분류 서가 정보 (한국십진분류법 KDC의 10개 주류)
 * ------------------------------------------------------------
 * 교사용 안내
 *  - name: 서가 이름 / description: 서가 설명 / examples: 이 서가에 있는 책의 예
 *  - color: 서가 표지판 색 (학교 도서관에서 흔히 쓰는 KDC 분류 색)
 *  - text: 표지판 글자 색 (밝은 색 표지판에만 적어요. 없으면 흰 글자)
 */
window.LIBRARY_CLASSIFICATIONS = [
  { number: '000', name: '총류',     icon: '🗂️', color: '#1fa045', description: '여러 분야를 두루 담은 책과 컴퓨터·정보에 관한 책이 모여 있어요.', examples: ['백과사전', '코딩', '신문'] },
  { number: '100', name: '철학',     icon: '🤔', color: '#e53935', description: '생각과 마음, 성격(심리학)에 관한 책이 모여 있어요.', examples: ['생각', '마음', '심리'] },
  { number: '200', name: '종교',     icon: '🕊️', color: '#8a8f96', description: '종교와 믿음, 신화에 관한 책이 모여 있어요.', examples: ['신화', '믿음'] },
  { number: '300', name: '사회과학', icon: '🏘️', color: '#f57c00', description: '사회, 경제, 직업, 규칙에 관한 책과 옛날부터 전해 오는 이야기(전래동화)가 모여 있어요.', examples: ['경제', '직업', '규칙', '전래동화'] },
  { number: '400', name: '자연과학', icon: '🔬', color: '#8d4a17', description: '자연과 과학에 관한 책이 모여 있어요.', examples: ['공룡', '우주', '동물', '식물'] },
  { number: '500', name: '기술과학', icon: '⚙️', color: '#29b6f6', text: '#12324a', description: '생활에 쓰이는 기술에 관한 책이 모여 있어요.', examples: ['요리', '로봇', '건강', '농사'] },
  { number: '600', name: '예술',     icon: '🎨', color: '#fdd835', text: '#4a3a00', description: '미술, 음악, 운동에 관한 책이 모여 있어요.', examples: ['그림', '음악', '축구', '운동'] },
  { number: '700', name: '언어',     icon: '🔤', color: '#8bc34a', text: '#1f3a0c', description: '말과 글에 관한 책이 모여 있어요.', examples: ['한글', '영어', '속담'] },
  { number: '800', name: '문학',     icon: '📖', color: '#1565c0', description: '작가가 새로 지은 동화, 동시, 소설 같은 이야기책이 모여 있어요.', examples: ['창작동화', '동시', '소설'] },
  { number: '900', name: '역사',     icon: '🏛️', color: '#7e57c2', description: '역사, 지리, 위인에 관한 책이 모여 있어요.', examples: ['옛날', '지도', '위인'] }
];
