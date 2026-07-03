import { buildDataQualityInput } from './buildInput';
import { getDataQualityAdvisory } from './detectors';
import type { DataQualityAdvisory } from './types';
import type { ReportRange } from '@/lib/qbo/reports';

export async function loadDataQualityAdvisory(
  clientId: string,
  range: ReportRange
): Promise<DataQualityAdvisory | null> {
  const input = await buildDataQualityInput(clientId, range);
  if (!input) return null;
  return getDataQualityAdvisory(input);
}
