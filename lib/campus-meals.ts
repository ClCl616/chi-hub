export type SchoolId = 'dju' | 'cbnu' | 'hufs';

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
