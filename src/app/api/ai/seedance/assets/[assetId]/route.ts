import { KieProvider } from '@/extensions/ai';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const { assetId } = await params;
    if (!assetId?.trim()) {
      return respErr('invalid assetId');
    }

    const aiService = await getAIService();
    const provider = aiService.getProvider('kie');

    if (!(provider instanceof KieProvider)) {
      return respErr('kie provider not available');
    }

    const result = await provider.getSeedanceAsset({
      assetId: assetId.trim(),
    });

    return respData(result);
  } catch (error: any) {
    console.error('query ChatGPT Image 2 asset failed:', error);
    return respErr(error?.message || 'query ChatGPT Image 2 asset failed');
  }
}
