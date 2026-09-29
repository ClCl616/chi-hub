export type StudyItem = {
  id: string;
  title: string;
  content: string;
  subject: string;
  due_date: string;
  stage: number;
  review_count: number;
  archived: boolean;
  updated_at: string;
};
export type StudyReview = {
  id: string;
  item_id: string;
  rating: string;
  reviewed_on: string;
  next_due_date: string;
};
export const reviewRatings = [
  { id: 'again', label: '다시 학습' },
  { id: 'good', label: '기억했어요' },
  { id: 'easy', label: '쉬웠어요' },
] as const;
export function reviewInterval(stage: number, rating: string) {
  const next =
    rating === 'again' ? 0 : Math.min(stage + (rating === 'easy' ? 2 : 1), 6);
  return [1, 1, 3, 7, 14, 30, 60][next];
}
