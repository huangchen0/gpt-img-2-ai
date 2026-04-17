import { KieProvider } from '@/extensions/ai';
import { respData, respErr } from '@/shared/lib/resp';
import { SeedanceAssetKind } from '@/shared/lib/seedance-video';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';

function isSeedanceAssetKind(value: unknown): value is SeedanceAssetKind {
  return value === 'image' || value === 'video' || value === 'audio';
}

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const { kind, url } = await request.json();

    if (!isSeedanceAssetKind(kind)) {
      return respErr('invalid asset kind');
    }

    if (typeof url !== 'string' || !url.trim()) {
      return respErr('invalid asset url');
    }

    console.info('[seedance-asset-debug] route.create.request', {
      userId: user.id,
      kind,
      url: url.trim(),
    });

    const aiService = await getAIService();
    const provider = aiService.getProvider('kie');

    if (!(provider instanceof KieProvider)) {
      return respErr('kie provider not available');
    }

    const result = await provider.createSeedanceAsset({
      kind,
      url: url.trim(),
    });

    console.info('[seedance-asset-debug] route.create.result', {
      userId: user.id,
      kind,
      url: url.trim(),
      result,
    });

    return respData(result);
  } catch (error: any) {
    console.error('create ChatGPT Image 2 asset failed:', error);
    return respErr(error?.message || 'create ChatGPT Image 2 asset failed');
  }
}
