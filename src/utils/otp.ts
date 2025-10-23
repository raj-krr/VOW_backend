export function generateOtp(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
}

export const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};
