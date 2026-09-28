import type { Metadata } from 'next';
import { MultiTabSimulatorView } from '@/components/host/simulator/MultiTabSimulatorView';

export const metadata: Metadata = {
  title: 'Simulator Multi-Tab Arena | BDCAHOOT Live',
  description: 'Simulasi konkurensi multi-tab dan multi-device untuk Host dan 10+ pemain simultan.',
};

export default function HostSimulatorPage() {
  return <MultiTabSimulatorView />;
}
