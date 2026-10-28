import { OverviewPage } from '../overview/OverviewPage'

type Props = {
  onOpenChecklist: () => void
}

/** Overview tab — Lucid Quiet cards (Phase C). */
export function OverviewScreen({ onOpenChecklist }: Props) {
  return <OverviewPage onOpenChecklist={onOpenChecklist} />
}
