export type SchoolId = 'dju' | 'cbnu' | 'hufs';

export const mealPeriods = [
  { id: 'breakfast', label: '조식', description: '아침', pattern: /조식|아침/ },
  { id: 'lunch', label: '중식', description: '점심', pattern: /중식|점심/ },
  { id: 'dinner', label: '석식', description: '저녁', pattern: /석식|저녁/ },
  {
    id: 'other',
    label: '기타 식사',
    description: '별도 운영 메뉴',
    pattern: /$^/,
  },
] as const;
export function mealPeriod(label: string) {
  const matches = mealPeriods.filter((period) => period.pattern.test(label));
  return matches.length === 1 ? matches[0].id : 'other';
}

export type MealDate = {
  date: string;
  label: string;
};

export type MealEntry = {
  date: string;
  cafeteria: string;
  mealType: string;
  menu: string[];
  prices?: string[];
};

export type CampusFacility = {
  campus: string;
  cafeteria: string;
  location: string;
  hours?: string;
};

export type CampusMealsResponse = {
  university: { id: SchoolId; name: string };
  weekLabel: string;
  dates: MealDate[];
  meals: MealEntry[];
  facilities?: CampusFacility[];
  notice?: string;
  sourceUrl: string;
  fetchedAt: string;
};
