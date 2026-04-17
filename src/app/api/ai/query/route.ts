import { AITaskStatus } from '@/extensions/ai';
import { respData, respErr } from '@/shared/lib/resp';
import {
  findAITaskById,
  UpdateAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';
import { getUserInfo, markUserActivatedIfEligible } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';

function getArrayCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function shouldLogSeedanceTask(task: {
  provider?: string | null;
  mediaType?: string | null;
  model?: string | null;
}) {
  return (
    task.provider === 'apimart' ||
    task.mediaType === 'video' ||
    task.model?.includes('seedance') === true
  );
}

export async function POST(req: Request) {
  try {
    const { taskId, providerTaskId } = await req.json();
    if (!taskId) {
      return respErr('invalid params');
    }

    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const task = await findAITaskById(taskId);
    if (!task) {
      return respErr('task not found');
    }

    if (task.userId !== user.id) {
      return respErr('no permission');
    }

    const fallbackProviderTaskId =
      typeof providerTaskId === 'string' && providerTaskId
        ? providerTaskId
        : '';
    const queryTaskId = task.taskId || fallbackProviderTaskId;

    if (!queryTaskId) {
      return respData(task);
    }

    const aiService = await getAIService();
    const aiProvider = aiService.getProvider(task.provider);
    if (!aiProvider) {
      return respErr('invalid ai provider');
    }

    if (shouldLogSeedanceTask(task)) {
      console.info('[seedance.ai-query] start', {
        localTaskId: task.id,
        providerTaskId: queryTaskId,
        provider: task.provider,
        model: task.model,
        previousStatus: task.status,
      });
    }

    const result = await aiProvider?.query?.({
      taskId: queryTaskId,
      mediaType: task.mediaType,
      model: task.model,
    });

    if (!result?.taskStatus) {
      return respErr('query ai task failed');
    }

    // update ai task
    const updateAITask: UpdateAITask = {
      status: result.taskStatus,
      taskId: task.taskId || result.taskId || queryTaskId,
      taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
      taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
      creditId: task.creditId, // credit consumption record id
    };
    const shouldUpdateTask =
      updateAITask.status !== task.status ||
      updateAITask.taskId !== task.taskId ||
      updateAITask.taskInfo !== task.taskInfo ||
      updateAITask.taskResult !== task.taskResult;

    if (shouldLogSeedanceTask(task)) {
      console.info('[seedance.ai-query] result', {
        localTaskId: task.id,
        providerTaskId: queryTaskId,
        provider: task.provider,
        model: task.model,
        previousStatus: task.status,
        nextStatus: result.taskStatus,
        shouldUpdateTask,
        taskInfoVideoCount: getArrayCount(result.taskInfo?.videos),
        taskInfoImageCount: getArrayCount(result.taskInfo?.images),
        providerStatus: result.taskInfo?.status || '',
        errorCode: result.taskInfo?.errorCode || '',
        errorMessage: result.taskInfo?.errorMessage || '',
      });
    }

    if (shouldUpdateTask) {
      await updateAITaskById(task.id, updateAITask);
    }

    if (result.taskStatus === AITaskStatus.SUCCESS) {
      await markUserActivatedIfEligible(task.userId);
    }

    task.status = updateAITask.status || '';
    task.taskId = updateAITask.taskId || task.taskId || null;
    task.taskInfo = updateAITask.taskInfo || null;
    task.taskResult = updateAITask.taskResult || null;

    return respData(task);
  } catch (e: any) {
    console.log('ai query failed', e);
    return respErr(e.message);
  }
}
