import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import { respErr, respOk } from '@/shared/lib/resp';
import {
  findAITaskById,
  findAITaskByProviderTaskId,
  updateAITaskById,
} from '@/shared/models/ai_task';
import { markUserActivatedIfEligible } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';

function extractProviderTaskId(payload: any) {
  if (typeof payload?.taskId === 'string' && payload.taskId) {
    return payload.taskId;
  }

  if (typeof payload?.data?.taskId === 'string' && payload.data.taskId) {
    return payload.data.taskId;
  }

  return '';
}

function extractLocalTaskId(request: Request) {
  const localTaskId = new URL(request.url).searchParams.get('localTaskId');
  return typeof localTaskId === 'string' && localTaskId ? localTaskId : '';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const payload = await request.json().catch(() => ({}));
    const providerTaskId = extractProviderTaskId(payload);
    const localTaskId = extractLocalTaskId(request);

    if (!provider || (!providerTaskId && !localTaskId)) {
      return respErr('invalid params');
    }

    let task = providerTaskId
      ? await findAITaskByProviderTaskId({
          provider,
          taskId: providerTaskId,
        })
      : null;

    if (!task && localTaskId) {
      const localTask = await findAITaskById(localTaskId);
      if (localTask?.provider === provider) {
        task = localTask;
      }
    }

    if (!task) {
      return respOk();
    }

    const aiService = await getAIService();
    const aiProvider = aiService.getProvider(provider);
    if (!aiProvider?.query) {
      return respOk();
    }

    const queryTaskId = task.taskId || providerTaskId;
    if (!queryTaskId) {
      return respOk();
    }

    const result = await aiProvider.query({
      taskId: queryTaskId,
      mediaType: task.mediaType as AIMediaType,
      model: task.model,
    });

    if (!result?.taskStatus) {
      return respOk();
    }

    await updateAITaskById(task.id, {
      status: result.taskStatus,
      taskId: queryTaskId,
      taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
      taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
      creditId: task.creditId,
    });

    if (result.taskStatus === AITaskStatus.SUCCESS) {
      await markUserActivatedIfEligible(task.userId);
    }

    return respOk();
  } catch (error) {
    console.error('ai notify failed:', error);
    return respErr('notify failed');
  }
}
