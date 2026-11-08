import { customAlphabet, nanoid } from 'nanoid';

const alnum = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

export const newId = (): string => alnum();
export const newShortId = (): string => nanoid(8);
export const newRequestId = (): string => `req_${alnum()}`;
