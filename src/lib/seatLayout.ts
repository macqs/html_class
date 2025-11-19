import type { SeatLayout, SeatLayoutPreset } from '@/types';
import { generateSeatLabels } from '@/lib/utils';

export const MAX_PARTICIPANTS = 100;

const SEAT_LAYOUT_PRESETS: SeatLayoutPreset[] = [
  {
    name: 'standard-40',
    rows: 5,
    cols: 8,
    labels: generateSeatLabels(5, 8),
    capacity: 40,
  },
  {
    name: 'extended-60',
    rows: 6,
    cols: 10,
    labels: generateSeatLabels(6, 10),
    capacity: 60,
  },
  {
    name: 'mega-100',
    rows: 10,
    cols: 10,
    labels: generateSeatLabels(10, 10),
    capacity: 100,
  },
];

export function countSeats(layout?: SeatLayout | null): number {
  if (!layout?.labels?.length) return 0;
  return layout.labels.reduce((total, row) => total + row.length, 0);
}

function getPresetForCapacity(capacity: number): SeatLayoutPreset {
  return SEAT_LAYOUT_PRESETS.find((preset) => preset.capacity >= capacity) ?? SEAT_LAYOUT_PRESETS.at(-1)!;
}

export function normalizeSeatLayout(layout?: SeatLayout | null, minCapacity = MAX_PARTICIPANTS): SeatLayout {
  if (!layout || !layout.labels?.length) {
    return getPresetForCapacity(minCapacity);
  }

  const seatCount = countSeats(layout);
  if (seatCount >= minCapacity) {
    return layout;
  }

  return getPresetForCapacity(minCapacity);
}
