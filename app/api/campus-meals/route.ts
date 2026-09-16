import { NextResponse } from 'next/server';
import type {
  CampusMealsResponse,
  MealDate,
  MealEntry,
  SchoolId,
} from '@/lib/campus-meals';

export const runtime = 'edge';

const DJU_SOURCES = [
  {
    cafeteria: '혜화문화관',
    url: 'https://www.dju.ac.kr/dju/fm/foodmenu/foodmenuView.do?foodmenuSn=1&mi=7064',
  },
  {
    cafeteria: '제2생활관',
    url: 'https://www.dju.ac.kr/dju/fm/foodmenu/foodmenuView.do?foodmenuSn=2&mi=7065',
  },
  {
    cafeteria: '제5생활관 HRC',
    url: 'https://www.dju.ac.kr/dju/fm/foodmenu/foodmenuView.do?foodmenuSn=3&mi=7066',
  },
];

const CBNU_SOURCE = 'https://www.cbnucoop.com/service/restaurant/';
const HUFS_SOURCE = 'https://aidata.hufs.ac.kr/hufs/11316/subview.do';
const FETCH_HEADERS = {
  Accept: 'text/html,application/xhtml+xml',
  'User-Agent': 'CHI Toolbox campus meal reader/1.0',
};

function decodeHtml(value: string) {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    if (entity[0] === '#') {
      const hexadecimal = entity[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    }
    return named[entity.toLowerCase()] ?? '';
  });
}

function cleanText(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function cellItems(value: string) {
  return decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>|<\/div>|<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .split(/\n+/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function normalizeDate(value: string, fallbackYear?: number) {
  const parts = value.match(/(?:(\d{4})[.\-/])?(\d{1,2})[.\-/](\d{1,2})/);
  if (!parts) return '';
  const year = Number(parts[1] ?? fallbackYear);
  if (!year) return '';
  return `${year}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}`;
}

function dateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00+09:00`);
  return `${parsed.getMonth() + 1}.${String(parsed.getDate()).padStart(2, '0')} ${['일', '월', '화', '수', '목', '금', '토'][parsed.getDay()]}`;
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: FETCH_HEADERS,
    next: { revalidate: 1800 },
  });
  if (!response.ok) throw new Error(`공식 페이지 응답 오류 (${response.status})`);
  return response.text();
}

function mealTable(html: string) {
  const captionIndex = html.search(/<caption[^>]*>[^<]*식단[^<]*<\/caption>/i);
  if (captionIndex < 0) return '';
  const start = html.lastIndexOf('<table', captionIndex);
  const end = html.indexOf('</table>', captionIndex);
  return start >= 0 && end >= 0 ? html.slice(start, end + 8) : '';
}

async function getDjuMeals(): Promise<CampusMealsResponse> {
  const pages = await Promise.all(
    DJU_SOURCES.map(async (source) => ({ ...source, html: await fetchHtml(source.url) })),
  );
  let dates: MealDate[] = [];
  const meals: MealEntry[] = [];

  for (const page of pages) {
    const table = mealTable(page.html);
    const head = table.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i)?.[1] ?? '';
    const rawDates = [...head.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)]
      .map((match) => normalizeDate(cleanText(match[1])))
      .filter(Boolean);
    if (!dates.length) dates = rawDates.map((date) => ({ date, label: dateLabel(date) }));

    const body = table.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] ?? '';
    for (const row of body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const mealType = cleanText(row[1].match(/<th[^>]*>([\s\S]*?)<\/th>/i)?.[1] ?? '');
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      cells.forEach((cell, index) => {
        const menu = cellItems(cell[1]);
        if (rawDates[index] && menu.length) {
          meals.push({
            date: rawDates[index],
            cafeteria: page.cafeteria,
            mealType,
            menu,
          });
        }
      });
    }
  }

  return {
    university: { id: 'dju', name: '대전대학교' },
    weekLabel: dates.length ? `${dates[0].date} — ${dates.at(-1)?.date}` : '이번 주',
    dates,
    meals,
    sourceUrl: DJU_SOURCES[0].url,
    fetchedAt: new Date().toISOString(),
  };
}

function extractCbnuMenuMap(html: string) {
  const map = new Map<string, { menu: string[]; prices?: string[] }>();
  const starts = [...html.matchAll(/<div\s+class="menu"\s+data-table="([^"]+)"[^>]*>/gi)];
  starts.forEach((match, index) => {
    const block = html.slice(match.index, starts[index + 1]?.index ?? html.length);
    const title = cleanText(block.match(/<h6[^>]*class="card-header"[^>]*>([\s\S]*?)<\/h6>/i)?.[1] ?? '');
    const sides = [...block.matchAll(/<li[^>]*class="side"[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((side) => cleanText(side[1]))
      .filter(Boolean);
    const values = [...block.matchAll(/<span[^>]*class="[^"]*commas[^"]*"[^>]*>([\d,]+)<\/span>/gi)].map(
      (price, priceIndex) => `${Number(price[1].replaceAll(',', '')).toLocaleString('ko-KR')}원${priceIndex === 1 ? ' (조합원)' : ''}`,
    );
    const menu = [title, ...sides].filter(Boolean);
    if (menu.length) map.set(match[1], { menu, prices: values.length ? values : undefined });
  });
  return map;
}

async function getCbnuMeals(): Promise<CampusMealsResponse> {
  const html = await fetchHtml(CBNU_SOURCE);
  const year = Number(html.match(/(\d{4})년\s*\d{1,2}월/)?.[1] ?? new Date().getFullYear());
  const rawDates = [...html.matchAll(/class="weekday-title"[^>]*>([\s\S]*?)<\/th>/gi)]
    .map((match) => normalizeDate(cleanText(match[1]), year))
    .filter(Boolean);
  const uniqueDates = [...new Set(rawDates)].slice(0, 5);
  const dates = uniqueDates.map((date) => ({ date, label: dateLabel(date) }));
  const menuMap = extractCbnuMenuMap(html);
  const cafeterias = ['한빛식당', '별빛식당', '은하수식당'];
  const meals: MealEntry[] = [];

  for (const row of html.matchAll(/<th[^>]*class="row-label"[^>]*>([\s\S]*?)<\/th>([\s\S]*?)<\/tr>/gi)) {
    const label = cleanText(row[1]);
    const cafeteria = cafeterias.find((name) => label.includes(name));
    if (!cafeteria) continue;
    const mealType = label.match(/아침|점심|저녁/)?.[0] ?? '식사';
    const ids = [...row[2].matchAll(/<td[^>]*id="table-([^"]+)"[^>]*>/gi)].map((cell) => cell[1]);
    ids.slice(0, 5).forEach((id, index) => {
      const detail = menuMap.get(id);
      if (detail && uniqueDates[index]) {
        meals.push({ date: uniqueDates[index], cafeteria, mealType, ...detail });
      }
    });
  }

  return {
    university: { id: 'cbnu', name: '충북대학교' },
    weekLabel: dates.length ? `${dates[0].date} — ${dates.at(-1)?.date}` : '이번 주',
    dates,
    meals,
    sourceUrl: CBNU_SOURCE,
    fetchedAt: new Date().toISOString(),
  };
}

function getHufsMeals(): CampusMealsResponse {
  return {
    university: { id: 'hufs', name: '한국외국어대학교' },
    weekLabel: '공식 식당 운영 안내',
    dates: [],
    meals: [],
    facilities: [
      { campus: '서울캠퍼스', cafeteria: '교직원식당', location: '교수회관 2층' },
      { campus: '서울캠퍼스', cafeteria: '학생식당', location: '인문과학관 1층' },
      { campus: '글로벌캠퍼스', cafeteria: '학생식당', location: '어문학관' },
      { campus: '글로벌캠퍼스', cafeteria: '학생·교직원식당', location: '후생관' },
      { campus: '글로벌캠퍼스', cafeteria: '식당', location: '국제사회교육원' },
      { campus: '글로벌캠퍼스', cafeteria: '기숙사식당', location: 'HUFS Dorm' },
    ],
    notice: '한국외대 공식 웹사이트에서 날짜별 식단을 공개하는 페이지를 확인하지 못해 현재는 공식 식당 위치를 제공합니다.',
    sourceUrl: HUFS_SOURCE,
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const school = new URL(request.url).searchParams.get('university') as SchoolId | null;
  try {
    const data = school === 'dju' ? await getDjuMeals() : school === 'cbnu' ? await getCbnuMeals() : school === 'hufs' ? getHufsMeals() : null;
    if (!data) return NextResponse.json({ error: '지원하지 않는 학교입니다.' }, { status: 400 });
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' },
    });
  } catch (error) {
    console.error('Campus meal source error', error);
    return NextResponse.json({ error: '학교 공식 식단을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' }, { status: 502 });
  }
}
