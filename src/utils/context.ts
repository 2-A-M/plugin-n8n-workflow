import { type IAgentRuntime, type Memory, type State, type UUID } from '@elizaos/core';

export function buildConversationContext(
  runtime: IAgentRuntime,
  message: Memory,
  state: State | undefined
): string {
  const recentMessages = (state?.data?.recentMessages as Memory[]) || [];

  if (recentMessages.length === 0) {
    return message.content.text || '';
  }

  const context = recentMessages
    .slice(-5)
    .map((m) => `${m.entityId === runtime.agentId ? 'Assistant' : 'User'}: ${m.content.text}`)
    .join('\n');

  return `Recent conversation:\n${context}\n\nCurrent request: ${message.content.text || ''}`;
}

export async function getUserTagName(runtime: IAgentRuntime, userId: string): Promise<string> {
  const entity = await runtime.getEntityById(userId as UUID);
  const shortId = userId.replace(/-/g, '').slice(0, 8);
  const name = entity?.names?.[0];
  // ElizaOS default name is "User" + UUID — not useful for a tag
  const isRealName = name && !name.includes(userId.slice(0, 8));
  return isRealName ? `${name}_${shortId}` : `user_${shortId}`;
}
