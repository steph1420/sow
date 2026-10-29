import type { DateSlot, StudentRow } from './types'

/** Demo roster spanning letters for A–Z dogfood (Phase B — no Sync yet). */
export const DEMO_CLASS_LABEL = 'KGA · Eng CW'
export const DEMO_CLASS_KEY = 'KGA_Eng_CW' as const

export const DEMO_DATES: [DateSlot, DateSlot] = [
  {
    date: '2026-10-28',
    topic: 'Nouns — common & proper',
    dayLabel: 'Wed 28',
    dayNum: '28/10',
  },
  {
    date: '2026-11-02',
    topic: 'Picture composition',
    dayLabel: 'Mon 2',
    dayNum: '2/11',
  },
]

export const DEMO_ROSTER: StudentRow[] = [
  { roll: 1, name: 'Aaditya Chauhan', left: false },
  { roll: 2, name: 'Aayat Asif', left: false },
  { roll: 3, name: 'Abhinav Verma', left: false },
  { roll: 4, name: 'Aditi Sharma', left: false },
  { roll: 5, name: 'Ananya Iyer', left: false },
  { roll: 6, name: 'Arjun Nair', left: false },
  { roll: 7, name: 'Bhavya Reddy', left: false },
  { roll: 8, name: 'Dhruv Patel', left: false },
  { roll: 9, name: 'Diya Menon', left: false },
  { roll: 10, name: 'Esha Joshi', left: false },
  { roll: 11, name: 'Farhan Khan', left: false },
  { roll: 12, name: 'Gaurav Singh', left: false },
  { roll: 13, name: 'Harshita Rao', left: false },
  { roll: 14, name: 'Ishaan Mehta', left: false },
  { roll: 15, name: 'Kabir Malhotra', left: false },
  { roll: 16, name: 'Kiara Desai', left: false },
  { roll: 17, name: 'Lakshya Gupta', left: false },
  { roll: 18, name: 'Meera Krishnan', left: false },
  { roll: 19, name: 'Neha Kapoor', left: false },
  { roll: 20, name: 'Omkar Joshi', left: false },
  { roll: 21, name: 'Prisha Nair', left: false },
  { roll: 22, name: 'Reyansh Pillai', left: false },
  { roll: 23, name: 'Saanvi Reddy', left: false },
  { roll: 24, name: 'Shaurya Iyer', left: false },
  { roll: 25, name: 'Tanvi Shah', left: false },
  { roll: 26, name: 'Vihaan Bose', left: false },
  { roll: 27, name: 'Yash Verma', left: false },
  { roll: 28, name: 'Zoya Khan', left: false },
]

