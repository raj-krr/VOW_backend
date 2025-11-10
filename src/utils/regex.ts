
export const noEmojisRegex = /^[\p{L}\p{N}\p{P}\p{Zs}_-]+$/u;

export const noEmojis = (fieldName: string) => ({
  message: `${fieldName} cannot contain emojis or special symbols`,
});
