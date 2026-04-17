import { redirect } from '@/core/i18n/navigation';
import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import { Empty } from '@/shared/blocks/common';
import { findAITaskById, updateAITaskById } from '@/shared/models/ai_task';
import { getAIService } from '@/shared/services/ai';

export default async function RefreshAITaskPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const task = await findAITaskById(id);
  if (!task || !task.taskId || !task.provider || !task.status) {
    return <Empty message="Task not found" />;
  }

  // query task
  if (
    [AITaskStatus.PENDING, AITaskStatus.PROCESSING].includes(
      task.status as AITaskStatus
    )
  ) {
    const aiService = await getAIService();
    const aiProvider = aiService.getProvider(task.provider);
    if (!aiProvider) {
      return <Empty message="Invalid AI provider" />;
    }

    const result = await aiProvider?.query?.({
      taskId: task.taskId,
      mediaType: task.mediaType as AIMediaType,
      model: task.model,
    });

    if (result && result.taskStatus) {
      const updateData: any = {
        status: result.taskStatus,
        creditId: task.creditId,
      };

      if (result.taskInfo !== undefined) {
        updateData.taskInfo = result.taskInfo
          ? JSON.stringify(result.taskInfo)
          : null;
      }

      if (result.taskResult !== undefined) {
        updateData.taskResult = result.taskResult
          ? JSON.stringify(result.taskResult)
          : null;
      }

      await updateAITaskById(task.id, updateData);
    }
  }

  redirect({ href: `/activity/ai-tasks`, locale });
}
