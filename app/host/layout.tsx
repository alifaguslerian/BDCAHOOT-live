import { QuizLibraryGate } from '@/components/host/QuizLibraryGate';

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return <QuizLibraryGate>{children}</QuizLibraryGate>;
}
