export function buildConversationContext(message, state) {
    const raw = state?.values?.recentMessages;
    const recentMessages = typeof raw === 'string' ? raw : '';
    const currentText = message.content?.text ?? '';
    if (!recentMessages) {
        return currentText;
    }
    return `${recentMessages}\n\nCurrent request: ${currentText}`;
}
export async function getUserTagName(runtime, userId) {
    const entity = await runtime.getEntityById(userId);
    const shortId = userId.replace(/-/g, '').slice(0, 8);
    const name = entity?.names?.[0];
    // ElizaOS default name is "User" + UUID — not useful for a tag
    const isRealName = name && !name.includes(userId.slice(0, 8));
    return isRealName ? `${name}_${shortId}` : `user_${shortId}`;
}
//# sourceMappingURL=context.js.map