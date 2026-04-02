import { PageSkeleton } from '@/components/page-skeleton'

export default function Loading() {
  return <PageSkeleton rows={4} cards={2} hasHeader />
}
