/**
 * The one-line outcome and audience shown on each guide's card. Keyed by product slug.
 * Every line must match what the guide really contains: no income, health or results promises.
 * A guide without an entry falls back to the opening of its short description.
 */
export interface GuideCopy {
  outcome: string;
  audience: string;
}

export const GUIDE_COPY: Record<string, GuideCopy> = {
  'know-your-numbers': {
    outcome: 'Track income and costs, and see what is left after expenses.',
    audience: 'For small-business owners',
  },
  'ai-automation-for-small-businesses': {
    outcome: 'Set up automatic WhatsApp replies in about an hour, with no coding.',
    audience: 'For small-business owners',
  },
  'the-overthinking-guide': {
    outcome: 'Understand why you overthink and build calmer thinking habits.',
    audience: 'For anyone stuck on “what if?”',
  },
  'paid-advertising-campaign-guide': {
    outcome: 'Plan a campaign, set a budget and read your results.',
    audience: 'For online sellers and beginners',
  },
  'freelancer-business-admin-kit': {
    outcome: 'Organise client billing, expenses and pricing in one system.',
    audience: 'For freelancers',
  },
  '30-day-student-money-trackerusd-edition': {
    outcome: 'Track a month of spending and build a saving habit.',
    audience: 'For students and young earners',
  },
  hjbhv: {
    outcome: 'Ask AI better questions and get more useful answers.',
    audience: 'For everyday AI users',
  },
  'the-job-search-career-starter-kit': {
    outcome: 'Prepare for job opportunities with more confidence.',
    audience: 'For job seekers',
  },
  'the-beginner-money-management-kit': {
    outcome: 'Learn leadership, planning and teamwork in simple English.',
    audience: 'For people new to managing',
  },
  'think-beyond-beliefs': {
    outcome: 'Question assumptions, weigh evidence and make better decisions.',
    audience: 'For anyone who wants to think clearly',
  },
  'worldwide-7-day-budget-meal-planner': {
    outcome: 'Plan a week of meals, waste less food and manage your grocery budget.',
    audience: 'For individuals and households',
  },
  'social-media-content-planner': {
    outcome: 'Plan 30 days of posts with AI prompts and caption formulas.',
    audience: 'For creators and small businesses',
  },
};
