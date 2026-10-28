import { ChecklistPage } from '../checklist/ChecklistPage'

type Props = {
  onGoOverview?: () => void
}

/** Checklist tab — lean chrome mark surface (Portal IA). */
export function ChecklistScreen({ onGoOverview }: Props) {
  return <ChecklistPage onGoOverview={onGoOverview} />
}
