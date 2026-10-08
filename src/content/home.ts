/**
 * Everything the homepage says that is not a product lives here: growth stages, the goal
 * categories, "Why Tomevari", the buying steps, the FAQ and reader stories.
 * Products themselves come from the database (add them in /admin/products).
 *
 * Keep this honest: no invented numbers, no made-up reviews, no income promises.
 */

export interface GrowthStage {
  label: string;
  caption: string;
}

export const GROWTH_STAGES: GrowthStage[] = [
  { label: 'Seed', caption: 'Plant the idea' },
  { label: 'Growth', caption: 'Grow the skill' },
  { label: 'Harvest', caption: 'Harvest the income' },
];

export const HERO_FACTS = [
  { title: 'Instant download', text: 'Your files are ready right after you pay.' },
  { title: 'Mobile Money & card', text: 'Secure checkout in GH₵.' },
  { title: 'No account needed', text: 'Buy as a guest in a few taps.' },
] as const;

export const WHY_CARDS = [
  {
    number: '01',
    tag: 'The guides',
    title: 'Practical, step-by-step guides',
    text: 'Each guide is written to be followed, one clear step at a time. What you get out of it depends on the work you put in.',
  },
  {
    number: '02',
    tag: 'Delivery',
    title: 'Instant PDF delivery',
    text: 'Download buttons appear as soon as your payment goes through, and a link is sent to your email as well.',
  },
  {
    number: '03',
    tag: 'Payment',
    title: 'Pay your way in GH₵',
    text: 'Use Mobile Money or a card. Prices are in Ghana cedis and you never have to create an account.',
  },
] as const;

export type GoalMotif = 'blocks' | 'rings' | 'coins' | 'darts' | 'chips';

export interface Goal {
  /** Also the tag saved on a product when the owner ticks this goal in the admin. */
  slug: string;
  name: string;
  blurb: string;
  /** Shape used by the 3D background behind the selector. */
  motif: GoalMotif;
  /** Tint of that background (and of the static fallback gradient). */
  color: string;
}

export const GOALS: Goal[] = [
  {
    slug: 'start-a-business',
    name: 'Start a Business',
    blurb: 'From first idea to first customer.',
    motif: 'blocks',
    color: '#60A5FA',
  },
  {
    slug: 'online-income',
    name: 'Online Income',
    blurb: 'Ways to earn using the internet.',
    motif: 'rings',
    color: '#38BDF8',
  },
  {
    slug: 'saving-investing',
    name: 'Saving & Investing',
    blurb: 'Keep more of what you make and put it to work.',
    motif: 'coins',
    color: '#BFDBFE',
  },
  {
    slug: 'freelancing',
    name: 'Freelancing',
    blurb: 'Find clients and get paid for your skills.',
    motif: 'darts',
    color: '#A5B4FC',
  },
  {
    slug: 'digital-skills',
    name: 'Digital Skills',
    blurb: 'Learn the tools that open doors.',
    motif: 'chips',
    color: '#93C5FD',
  },
];

export const BUYING_STEPS = [
  { title: 'Choose', text: 'Pick the guide that fits your goal and tap Buy now.' },
  { title: 'Pay with MoMo or card', text: 'Check out as a guest in GH₵. It takes a few taps on your phone.' },
  { title: 'Download instantly', text: 'Your files open straight away, and we email you a link to keep.' },
] as const;

export interface Testimonial {
  quote: string;
  name: string;
  /** e.g. "Bought: Freelancing Starter Guide". Optional. */
  context?: string;
}

/**
 * Real reader stories only. Leave this empty until you have words from an actual buyer who
 * agreed to be quoted; the page shows an invitation to share a story instead.
 */
export const TESTIMONIALS: Testimonial[] = [];

export interface SocialLink {
  /** e.g. "Instagram" */
  label: string;
  /** Full address of your page, e.g. "https://instagram.com/yourname" */
  url: string;
}

/** Your real social pages. The footer shows a "Social" column once this has at least one link. */
export const SOCIAL_LINKS: SocialLink[] = [];

export interface Faq {
  question: string;
  answer: string;
}

/** `{email}` is replaced with the support address (NEXT_PUBLIC_SUPPORT_EMAIL). */
export const FAQS: Faq[] = [
  {
    question: 'How can I pay?',
    answer:
      'With Mobile Money or a debit or credit card. Payments are in Ghana cedis (GH₵) and are taken on the payment provider’s secure page, so we never see your card number or Mobile Money PIN. You do not need an account.',
  },
  {
    question: 'How do I get my ebook after paying?',
    answer:
      'Download buttons appear on the confirmation page as soon as your payment goes through. We also send a download link to the email address you enter at checkout.',
  },
  {
    question: 'Can I get a refund?',
    answer:
      'If your payment went through but you could not get your file, or you were charged twice, email {email} with your order details and we will put it right. Any refund terms that apply to a particular product are shown on its page.',
  },
  {
    question: 'What format are the files?',
    answer:
      'Most guides are PDFs, which open on any phone, tablet or computer without extra software. Each product page lists exactly what is included.',
  },
  {
    question: 'I need help with an order. Who do I contact?',
    answer:
      'Email {email} from the address you used at checkout and tell us what happened. We read every message.',
  },
  {
    question: 'Will these guides make me money?',
    answer:
      'They teach skills and steps you can act on. Nobody can promise an income, and results depend on your effort, your situation and your market.',
  },
];
