"use client";

import { v4 as uuidv4 } from "uuid";

const TOKEN_KEY = "qb_participant_token";
const NAME_KEY = "qb_participant_name";

export function getOrCreateToken(): string {
  if (typeof window === "undefined") return "";
  let token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = uuidv4();
    window.localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function getName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(NAME_KEY);
}

export function setName(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAME_KEY, name);
}

