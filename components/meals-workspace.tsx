'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, MapPin, RefreshCw, UtensilsCrossed } from 'lucide-react';
import type { CampusMealsResponse, SchoolId } from '@/lib/campus-meals';

const schools: { id: SchoolId; name: string }[] = [
  { id: 'dju', name: '대전대학교' },
  { id: 'cbnu', name: '충북대학교' },
  { id: 'hufs', name: '한국외국어대학교' },
];
const storageKey = 'chi-hub-university';

function initialDate(data: CampusMealsResponse) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  return data.dates.some((item) => item.date === today) ? today : data.dates[0]?.date ?? '';
}

export function MealsWorkspace() {
  const [school, setSchool] = useState<SchoolId>('dju');
  const [data, setData] = useState<CampusMealsResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [cafeteria, setCafeteria] = useState('전체');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey) as SchoolId | null;
    if (schools.some((item) => item.id === saved)) {
      queueMicrotask(() => setSchool(saved!));
    }
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/campus-meals?university=${school}`, { signal });
      const result = (await response.json()) as CampusMealsResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || '식단을 불러오지 못했습니다.');
      setData(result);
      setSelectedDate(initialDate(result));
      setCafeteria('전체');
    } catch (loadError) {
      if ((loadError as Error).name !== 'AbortError') setError((loadError as Error).message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [school]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, school);
    const controller = new AbortController();
    queueMicrotask(() => void load(controller.signal));
    return () => controller.abort();
  }, [load, school]);

  const cafeterias = useMemo(
    () => ['전체', ...new Set(data?.meals.map((meal) => meal.cafeteria) ?? [])],
    [data],
  );
  const visibleMeals = (data?.meals ?? []).filter(
    (meal) => meal.date === selectedDate && (cafeteria === '전체' || meal.cafeteria === cafeteria),
  );

  return (
    <div className="meals-workspace">
      <section className="school-switcher" aria-label="대학교 선택">
        {schools.map((item) => (
          <button
            className={school === item.id ? 'active' : ''}
            key={item.id}
            onClick={() => setSchool(item.id)}
            type="button"
          >
            {item.name}
          </button>
        ))}
      </section>

      {loading ? (
        <div className="meal-state"><RefreshCw className="spin" size={20} /> 공식 식단을 불러오는 중…</div>
      ) : error ? (
        <div className="meal-state error" role="alert">
          <span>{error}</span><button onClick={() => load()} type="button">다시 시도</button>
        </div>
      ) : data ? (
        <>
          <section className="meal-overview">
            <div>
              <p className="card-label"><UtensilsCrossed size={15} /> {data.university.name}</p>
              <h2>{data.weekLabel}</h2>
              <p>학교 공식 페이지 기준 · 30분마다 새로 확인</p>
            </div>
            <a href={data.sourceUrl} target="_blank" rel="noreferrer">공식 페이지 <ExternalLink size={14} /></a>
          </section>

          {data.dates.length > 0 && (
            <>
              <section className="meal-date-strip" aria-label="날짜 선택">
                {data.dates.map((item) => (
                  <button className={selectedDate === item.date ? 'active' : ''} key={item.date} onClick={() => setSelectedDate(item.date)} type="button">
                    <span>{item.label.split(' ')[0]}</span><strong>{item.label.split(' ')[1]}요일</strong>
                  </button>
                ))}
              </section>
              <section className="cafeteria-filter" aria-label="식당 선택">
                {cafeterias.map((name) => <button className={cafeteria === name ? 'active' : ''} key={name} onClick={() => setCafeteria(name)} type="button">{name}</button>)}
              </section>
              {visibleMeals.length ? (
                <section className="meal-card-grid">
                  {visibleMeals.map((meal, index) => (
                    <article className="meal-card" key={`${meal.cafeteria}-${meal.mealType}-${index}`}>
                      <header><span>{meal.cafeteria}</span><strong>{meal.mealType}</strong></header>
                      <ul>{meal.menu.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ul>
                      {meal.prices?.length ? <footer>{meal.prices.map((price) => <span key={price}>{price}</span>)}</footer> : null}
                    </article>
                  ))}
                </section>
              ) : <div className="meal-state">선택한 날짜에 공개된 식단이 없습니다.</div>}
            </>
          )}

          {data.facilities?.length ? (
            <>
              <div className="meal-source-note">{data.notice}</div>
              <section className="facility-grid">
                {data.facilities.map((facility) => (
                  <article key={`${facility.campus}-${facility.location}`}>
                    <span>{facility.campus}</span><h3>{facility.cafeteria}</h3><p><MapPin size={14} /> {facility.location}</p>
                  </article>
                ))}
              </section>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
