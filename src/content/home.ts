/**
 * Everything the homepage says that is not a product lives here: the goal categories, the
 * buying steps and the FAQ.
 * Products themselves come from the database (add them in /admin/products).
 *
 * Keep this honest: no invented numbers, no made-up reviews, no income promises.
 */

export interface Goal {
  /** Also the tag saved on a product when the owner ticks this goal in the admin. */
  slug: string;
  name: string;
  blurb: string;
}

export const GOALS: Goal[] = [
  {
    slug: 'start-a-business',
    name: 'Start a business',
    blurb: 'From first idea to first customer.',
  },
  {
    slug: 'online-income',
    name: 'Online income',
    blurb: 'Ways to earn using the internet.',
  },
  {
    slug: 'saving-investing',
    name: 'Saving and investing',
    blurb: 'Keep more of what you make and put it to work.',
  },
  {
    slug: 'freelancing',
    name: 'Freelancing',
    blurb: 'Find clients and get paid for your skills.',
  },
  {
    slug: 'digital-skills',
    name: 'Digital skills',
    blurb: 'Learn the tools that open doors.',
  },
];

export const BUYING_STEPS = [
  { title: 'Choose a guide', text: 'Pick the guide that fits your goal and see what is inside before you buy.' },
  { title: 'Pay on a secure page', text: 'Check out as a guest in GH₵ with Mobile Money or card. No account needed.' },
  { title: 'Download your file', text: 'Your download appears once payment is confirmed, and we email you a link to keep.' },
] as const;

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
