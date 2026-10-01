/*
 * 가상의 도서 목록
 * ------------------------------------------------------------
 * 교사용 안내
 *  - 이 목록을 고치면 도서검색 결과와 분야별 서가의 책이 함께 바뀝니다.
 *  - callNumber: "분류번호 도서기호" 형태로, 가운데를 한 칸 띄어 씁니다. 예) "813.8 김25ㅎ"
 *    분류번호의 첫 숫자로 어느 서가(000~900)에 꽂힐지 정해집니다.
 *  - availability: 'available'(대출 가능) 또는 'loaned'(대출 중)
 *    대출 중인 책은 서가에 보이지 않습니다.
 *  - keywords: 주제 검색에 쓰이는 낱말입니다.
 *  - cover: 직접 만든 가상 표지의 색(color)과 그림(icon)입니다. 실제 도서 표지는 쓰지 않습니다.
 */
window.LIBRARY_BOOKS = [
  // 000 총류
  { id: 'b001', title: '궁금한 것이 가득한 어린이 백과', author: '한빛나', publisher: '새싹나무', callNumber: '031 한29ㄱ', category: '총류', keywords: ['백과사전', '궁금증', '지식'], availability: 'available', cover: { color: '#56657a', icon: '❓' } },
  { id: 'b002', title: '도서관은 어떻게 일할까?', author: '문지혜', publisher: '책마루', callNumber: '026 문19ㄷ', category: '총류', keywords: ['도서관', '사서'], availability: 'available', cover: { color: '#3d5a80', icon: '🏫' } },
  { id: 'b003', title: '신문 기자의 하루', author: '오세진', publisher: '푸른숲길', callNumber: '070 오54ㅅ', category: '총류', keywords: ['신문', '기자', '뉴스'], availability: 'available', cover: { color: '#5b4b6e', icon: '📰' } },
  { id: 'b004', title: '처음 배우는 코딩 놀이', author: '진유나', publisher: '초록길', callNumber: '004 진67ㅊ', category: '총류', keywords: ['코딩', '컴퓨터', '프로그래밍'], availability: 'available', cover: { color: '#56657a', icon: '💻' } },
  { id: 'b005', title: '로봇과 함께하는 코딩', author: '류다온', publisher: '반디북스', callNumber: '004 류47ㄹ', category: '총류', keywords: ['코딩', '컴퓨터', '로봇'], availability: 'available', cover: { color: '#3d5a80', icon: '🤖' } },
  { id: 'b006', title: '블록 코딩으로 게임 만들기', author: '차은솔', publisher: '햇살책방', callNumber: '004 차53ㅂ', category: '총류', keywords: ['코딩', '컴퓨터', '게임', '프로그래밍'], availability: 'loaned', cover: { color: '#5b4b6e', icon: '🎮' } },

  // 100 철학
  { id: 'b101', title: '생각하는 힘을 기르는 질문', author: '권도윤', publisher: '햇살책방', callNumber: '170 권11ㅅ', category: '철학', keywords: ['생각', '질문', '철학'], availability: 'available', cover: { color: '#6a5a9e', icon: '💭' } },
  { id: 'b102', title: '나는 왜 화가 날까?', author: '서다온', publisher: '마음책방', callNumber: '189 서42ㄴ', category: '철학', keywords: ['감정', '마음', '화'], availability: 'available', cover: { color: '#8a3f5c', icon: '😤' } },
  { id: 'b103', title: '내 마음을 알아보는 어린이 심리학', author: '강시우', publisher: '마음책방', callNumber: '180 강58ㄴ', category: '철학', keywords: ['심리', '심리학', '마음', '성격', 'MBTI'], availability: 'available', cover: { color: '#6a5a9e', icon: '🧠' } },

  // 200 종교
  { id: 'b201', title: '세계의 명절과 믿음 이야기', author: '남하린', publisher: '초록길', callNumber: '209 남37ㅅ', category: '종교', keywords: ['종교', '명절', '세계'], availability: 'available', cover: { color: '#3a7695', icon: '🏮' } },
  { id: 'b202', title: '마을 신화와 옛이야기', author: '유채원', publisher: '반디북스', callNumber: '219 유83ㅁ', category: '종교', keywords: ['신화', '옛이야기'], availability: 'available', cover: { color: '#4d6b3c', icon: '🌳' } },
  { id: 'b203', title: '재미있는 그리스 로마 신화', author: '송하람', publisher: '반디북스', callNumber: '219.2 송14ㅈ', category: '종교', keywords: ['신화', '그리스 로마 신화', '신', '영웅'], availability: 'available', cover: { color: '#3a7695', icon: '⚡' } },
  { id: 'b204', title: '올림포스의 열두 신', author: '표세아', publisher: '초록길', callNumber: '219.2 표38ㅇ', category: '종교', keywords: ['신화', '그리스 로마 신화', '신'], availability: 'loaned', cover: { color: '#6a5a9e', icon: '🏛️' } },

  // 300 사회과학
  { id: 'b301', title: '용돈으로 배우는 경제', author: '최준우', publisher: '구름다리', callNumber: '327 최75ㅇ', category: '사회과학', keywords: ['경제', '돈', '용돈'], availability: 'available', cover: { color: '#9c5b1c', icon: '🪙' } },
  { id: 'b302', title: '우리 동네 직업 탐험', author: '장서윤', publisher: '새싹나무', callNumber: '331 장52ㅇ', category: '사회과학', keywords: ['직업', '일', '꿈'], availability: 'available', cover: { color: '#2f6f7a', icon: '👩‍🚒' } },
  { id: 'b303', title: '학교에도 규칙이 필요해', author: '배은호', publisher: '책마루', callNumber: '360 배63ㅎ', category: '사회과학', keywords: ['규칙', '법', '약속'], availability: 'available', cover: { color: '#6b4f8a', icon: '📏' } },
  // 전래동화(옛이야기)는 388(민속·설화)이라 300 사회과학 서가에 꽂혀요
  { id: 'b304', title: '금도끼 은도끼', author: '김서하', publisher: '푸른별출판', callNumber: '388.2 김25ㄱ', category: '사회과학', keywords: ['전래동화', '옛이야기', '나무꾼'], availability: 'available', cover: { color: '#8a6a1f', icon: '🪓' } },
  { id: 'b807', title: '흥부와 놀부', author: '김서하', publisher: '푸른별출판', callNumber: '388.2 김25ㅎ', category: '사회과학', keywords: ['전래동화', '옛이야기', '제비'], availability: 'available', cover: { color: '#2f6b45', icon: '🐦' } },
  { id: 'b305', title: '해님 달님', author: '박소윤', publisher: '초록길', callNumber: '388.2 박17ㅎ', category: '사회과학', keywords: ['전래동화', '옛이야기', '호랑이'], availability: 'available', cover: { color: '#b0621f', icon: '🌞' } },
  { id: 'b306', title: '콩쥐 팥쥐', author: '이다은', publisher: '반디북스', callNumber: '388.2 이53ㅋ', category: '사회과학', keywords: ['전래동화', '옛이야기'], availability: 'available', cover: { color: '#8a2f3b', icon: '🫘' } },

  // 400 자연과학
  { id: 'b401', title: '수학이 숨어 있는 하루', author: '임지후', publisher: '햇살책방', callNumber: '410 임66ㅅ', category: '자연과학', keywords: ['수학', '숫자'], availability: 'available', cover: { color: '#2d6b8f', icon: '➗' } },
  { id: 'b402', title: '우주로 떠나는 여행', author: '박소율', publisher: '푸른별출판', callNumber: '440 박56ㅇ', category: '자연과학', keywords: ['우주', '행성', '별', '태양계'], availability: 'available', cover: { color: '#27325e', icon: '🪐' } },
  { id: 'b403', title: '별과 행성 도감', author: '정시우', publisher: '반디북스', callNumber: '443 정71ㅂ', category: '자연과학', keywords: ['우주', '별', '행성'], availability: 'loaned', cover: { color: '#3b2f6b', icon: '✨' } },
  { id: 'b404', title: '달은 왜 모양이 바뀔까?', author: '하은결', publisher: '초록길', callNumber: '444 하22ㄷ', category: '자연과학', keywords: ['우주', '달'], availability: 'available', cover: { color: '#34495e', icon: '🌙' } },
  { id: 'b405', title: '지진과 화산의 비밀', author: '조민재', publisher: '구름다리', callNumber: '453 조47ㅈ', category: '자연과학', keywords: ['지구', '화산', '지진'], availability: 'available', cover: { color: '#8f3b1f', icon: '🌋' } },
  { id: 'b406', title: '공룡은 왜 사라졌을까?', author: '강다인', publisher: '새싹나무', callNumber: '457 강14ㄱ', category: '자연과학', keywords: ['공룡', '화석'], availability: 'loaned', cover: { color: '#5a6b2e', icon: '☄️' } },
  { id: 'b407', title: '공룡 탐험 노트', author: '윤태오', publisher: '푸른숲길', callNumber: '457 윤38ㄱ', category: '자연과학', keywords: ['공룡', '화석'], availability: 'available', cover: { color: '#2e7556', icon: '🦕' } },
  { id: 'b408', title: '우리 동네 나무 이야기', author: '이하늘', publisher: '초록길', callNumber: '480 이92ㅇ', category: '자연과학', keywords: ['나무', '식물', '숲'], availability: 'available', cover: { color: '#3d6b35', icon: '🌳' } },
  { id: 'b409', title: '신기한 바다 생물', author: '송지안', publisher: '반디북스', callNumber: '491 송30ㅅ', category: '자연과학', keywords: ['바다', '동물', '물고기'], availability: 'available', cover: { color: '#1f6a85', icon: '🐙' } },
  { id: 'b410', title: '곤충 친구들의 여름', author: '김하람', publisher: '햇살책방', callNumber: '495 김07ㄱ', category: '자연과학', keywords: ['곤충', '동물', '여름'], availability: 'available', cover: { color: '#6b7a1f', icon: '🐞' } },

  // 500 기술과학
  { id: 'b501', title: '몸속 여행을 떠나요', author: '류서아', publisher: '책마루', callNumber: '511 류45ㅁ', category: '기술과학', keywords: ['몸', '건강'], availability: 'available', cover: { color: '#9e3d4a', icon: '🫀' } },
  { id: 'b502', title: '텃밭에서 자라는 채소', author: '한도현', publisher: '초록길', callNumber: '525 한61ㅌ', category: '기술과학', keywords: ['채소', '농사', '텃밭'], availability: 'available', cover: { color: '#4f7a2a', icon: '🥕' } },
  { id: 'b503', title: '지구를 지키는 분리배출', author: '신유나', publisher: '구름다리', callNumber: '539 신28ㅈ', category: '기술과학', keywords: ['환경', '쓰레기', '재활용'], availability: 'available', cover: { color: '#2f7a64', icon: '♻️' } },
  { id: 'b504', title: '우주 정거장의 하루', author: '곽나윤', publisher: '푸른별출판', callNumber: '559 곽33ㅇ', category: '기술과학', keywords: ['우주', '우주선', '과학기술'], availability: 'available', cover: { color: '#2b3f66', icon: '🛰️' } },
  { id: 'b505', title: '로봇과 함께하는 내일', author: '백시온', publisher: '반디북스', callNumber: '559 백18ㄹ', category: '기술과학', keywords: ['로봇', '기계'], availability: 'available', cover: { color: '#4a6780', icon: '🤖' } },
  { id: 'b506', title: '뚝딱 어린이 요리책', author: '차예린', publisher: '햇살책방', callNumber: '594 차26ㄸ', category: '기술과학', keywords: ['요리', '음식'], availability: 'available', cover: { color: '#b0501f', icon: '🍳' } },

  // 600 예술
  { id: 'b601', title: '그림 그리기가 즐거워', author: '노하준', publisher: '새싹나무', callNumber: '650 노58ㄱ', category: '예술', keywords: ['그림', '미술'], availability: 'available', cover: { color: '#a8445f', icon: '🖍️' } },
  { id: 'b602', title: '모두 함께 부르는 노래', author: '엄지우', publisher: '책마루', callNumber: '670 엄71ㅁ', category: '예술', keywords: ['음악', '노래'], availability: 'available', cover: { color: '#7a3f8a', icon: '🎵' } },
  { id: 'b603', title: '줄넘기 챔피언', author: '표나래', publisher: '구름다리', callNumber: '692 표15ㅈ', category: '예술', keywords: ['운동', '줄넘기', '체육'], availability: 'available', cover: { color: '#b0461f', icon: '🪢' } },
  { id: 'b604', title: '축구왕이 되는 법', author: '석민호', publisher: '푸른숲길', callNumber: '695 석24ㅊ', category: '예술', keywords: ['축구', '운동', '체육', '스포츠'], availability: 'available', cover: { color: '#2f7a3a', icon: '⚽' } },
  { id: 'b605', title: '신나는 축구 교실', author: '도하린', publisher: '새싹나무', callNumber: '695 도81ㅅ', category: '예술', keywords: ['축구', '운동', '체육', '스포츠'], availability: 'available', cover: { color: '#2e6b8a', icon: '🥅' } },
  { id: 'b606', title: '월드컵 축구 이야기', author: '모지환', publisher: '책마루', callNumber: '695 모22ㅇ', category: '예술', keywords: ['축구', '월드컵', '스포츠'], availability: 'loaned', cover: { color: '#8a2f3b', icon: '🏆' } },

  // 700 언어
  { id: 'b701', title: '한글은 어떻게 만들어졌을까?', author: '인서준', publisher: '초록길', callNumber: '711 인43ㅎ', category: '언어', keywords: ['한글', '우리말'], availability: 'available', cover: { color: '#7c6024', icon: 'ㄱ' } },
  { id: 'b702', title: '재미있는 속담 사전', author: '반유찬', publisher: '반디북스', callNumber: '718 반52ㅈ', category: '언어', keywords: ['속담', '우리말'], availability: 'available', cover: { color: '#8a4b2a', icon: '💬' } },
  { id: 'b703', title: '처음 만나는 영어 낱말', author: '제시아', publisher: '햇살책방', callNumber: '742 제29ㅊ', category: '언어', keywords: ['영어', '낱말'], availability: 'available', cover: { color: '#2f5f8a', icon: '🔤' } },

  // 800 문학
  { id: 'b801', title: '세계 명작 동화 모음', author: '오나은', publisher: '책마루', callNumber: '808.9 오21ㅅ', category: '문학', keywords: ['동화', '명작', '세계'], availability: 'available', cover: { color: '#6b3f2a', icon: '🏰' } },
  { id: 'b802', title: '반짝반짝 동시 놀이', author: '목하윤', publisher: '새싹나무', callNumber: '811 목36ㅂ', category: '문학', keywords: ['동시', '시'], availability: 'available', cover: { color: '#b0621f', icon: '🌟' } },
  { id: 'b803', title: '구름 위의 동시', author: '전해솔', publisher: '초록길', callNumber: '811 전77ㄱ', category: '문학', keywords: ['동시', '시', '구름'], availability: 'available', cover: { color: '#3f6e9c', icon: '☁️' } },
  { id: 'b804', title: '바람을 모으는 소년', author: '정우진', publisher: '반디북스', callNumber: '813.6 정80ㅂ', category: '문학', keywords: ['소설', '바람'], availability: 'available', cover: { color: '#4a6b5a', icon: '🌬️' } },
  { id: 'b805', title: '여름 방학 탐정단', author: '고은찬', publisher: '구름다리', callNumber: '813.7 고62ㅇ', category: '문학', keywords: ['동화', '탐정', '여름'], availability: 'available', cover: { color: '#2f5f6b', icon: '🔍' } },
  { id: 'b806', title: '비밀 정원의 고양이', author: '황보람', publisher: '햇살책방', callNumber: '813.7 황49ㅂ', category: '문학', keywords: ['동화', '고양이'], availability: 'available', cover: { color: '#6b4a8a', icon: '🐈' } },
  { id: 'b813', title: '별빛 우체국', author: '김서하', publisher: '푸른별출판', callNumber: '813.8 김25ㅂ', category: '문학', keywords: ['동화', '편지', '별'], availability: 'available', cover: { color: '#27427a', icon: '✉️' } },
  { id: 'b808', title: '새벽 기차', author: '김서하', publisher: '푸른별출판', callNumber: '813.8 김25ㅅ', category: '문학', keywords: ['동화', '기차'], availability: 'available', cover: { color: '#7a3b2e', icon: '🚂' } },
  { id: 'b809', title: '초록 우산 대소동', author: '김도율', publisher: '새싹나무', callNumber: '813.8 김31ㅊ', category: '문학', keywords: ['동화', '비', '우산'], availability: 'available', cover: { color: '#2e7040', icon: '☂️' } },
  { id: 'b810', title: '도서관에 사는 용', author: '박하은', publisher: '책마루', callNumber: '813.8 박12ㄷ', category: '문학', keywords: ['동화', '도서관', '용'], availability: 'available', cover: { color: '#8a2f3b', icon: '🐉' } },
  { id: 'b811', title: '안녕, 나의 로봇 친구', author: '이나래', publisher: '반디북스', callNumber: '813.8 이47ㅇ', category: '문학', keywords: ['동화', '로봇', '친구'], availability: 'loaned', cover: { color: '#4a5a6b', icon: '🤖' } },
  { id: 'b812', title: '달나라 토끼의 우주선', author: '한지유', publisher: '구름다리', callNumber: '813.8 한44ㄷ', category: '문학', keywords: ['동화', '우주', '달', '토끼'], availability: 'available', cover: { color: '#3a3f7a', icon: '🐇' } },
  { id: 'b819', title: '별을 삼킨 고래', author: '한지유', publisher: '구름다리', callNumber: '813.8 한44ㅂ', category: '문학', keywords: ['동화', '고래', '별', '바다'], availability: 'available', cover: { color: '#27427a', icon: '🐋' } },
  { id: 'b820', title: '토끼네 김밥집', author: '한지유', publisher: '구름다리', callNumber: '813.8 한44ㅌ', category: '문학', keywords: ['동화', '토끼', '음식'], availability: 'loaned', cover: { color: '#8a5a2f', icon: '🍙' } },
  { id: 'b818', title: '마당을 나온 암탉', author: '황선미', publisher: '사계절', callNumber: '813.8 황53ㅁ', category: '문학', keywords: ['동화', '암탉', '청둥오리', '꿈'], availability: 'available', cover: { color: '#9a5b2a', icon: '🐔' } },

  // 840 영미 문학 — 오래전에 나와 저작권이 끝난 세계 명작
  { id: 'b814', title: '오즈의 마법사', author: '프랭크 바움', publisher: '푸른별출판', callNumber: '843 바66ㅇ', category: '문학', keywords: ['명작', '세계문학', '마법', '모험'], availability: 'available', cover: { color: '#1f6b52', icon: '🌪️' } },
  { id: 'b815', title: '피터 팬', author: '제임스 배리', publisher: '책마루', callNumber: '843 배89ㅍ', category: '문학', keywords: ['명작', '세계문학', '모험'], availability: 'available', cover: { color: '#2f5f8a', icon: '🧚' } },
  { id: 'b816', title: '비밀의 화원', author: '프랜시스 버넷', publisher: '초록길', callNumber: '843 버17ㅂ', category: '문학', keywords: ['명작', '세계문학', '정원'], availability: 'available', cover: { color: '#6b4a8a', icon: '🌷' } },
  { id: 'b817', title: '톰 소여의 모험', author: '마크 트웨인', publisher: '반디북스', callNumber: '843 트54ㅌ', category: '문학', keywords: ['명작', '세계문학', '모험'], availability: 'available', cover: { color: '#8a4b2a', icon: '🛶' } },

  // 900 역사
  { id: 'b901', title: '바다를 지킨 장군 이순신', author: '허준서', publisher: '초록길', callNumber: '991.1 허65ㅂ', category: '역사', keywords: ['역사', '인물', '전기', '이순신', '조선'], availability: 'available', cover: { color: '#65513f', icon: '⚓' } },
  { id: 'b905', title: '이순신과 거북선', author: '강도현', publisher: '햇살책방', callNumber: '991.1 강22ㅇ', category: '역사', keywords: ['역사', '인물', '전기', '이순신', '거북선'], availability: 'loaned', cover: { color: '#2f5f8a', icon: '🐢' } },
  { id: 'b906', title: '난중일기로 만나는 이순신', author: '오서윤', publisher: '반디북스', callNumber: '991.1 오37ㄴ', category: '역사', keywords: ['역사', '인물', '전기', '이순신', '일기'], availability: 'available', cover: { color: '#7a3b2e', icon: '📜' } },
  { id: 'b902', title: '세종대왕과 한글 이야기', author: '민가온', publisher: '책마루', callNumber: '911.05 민18ㅅ', category: '역사', keywords: ['역사', '세종대왕', '조선'], availability: 'available', cover: { color: '#7a2f2f', icon: '👑' } },
  { id: 'b903', title: '지도로 떠나는 세계 여행', author: '탁서진', publisher: '반디북스', callNumber: '980 탁39ㅈ', category: '역사', keywords: ['지리', '세계', '지도', '여행'], availability: 'available', cover: { color: '#2f6b7a', icon: '🗺️' } },
  { id: 'b904', title: '위인들의 어린 시절', author: '봉하율', publisher: '햇살책방', callNumber: '990 봉27ㅇ', category: '역사', keywords: ['위인', '전기'], availability: 'available', cover: { color: '#5a4a6b', icon: '🎖️' } }
];
